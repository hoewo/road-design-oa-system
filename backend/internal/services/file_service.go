package services

import (
	"context"
	"errors"
	"fmt"
	"io"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"project-oa-backend/internal/config"
	"project-oa-backend/internal/models"
	"project-oa-backend/pkg/database"
	"project-oa-backend/pkg/storage"
)

// FileService handles file-related operations (foundation layer)
type FileService struct {
	db     *gorm.DB
	config *config.Config
}

// NewFileService creates a new file service
func NewFileService(cfg *config.Config) *FileService {
	return &FileService{
		db:     database.DB,
		config: cfg,
	}
}

// UploadFileRequest represents the request to upload a file
type UploadFileRequest struct {
	ProjectID   string              `json:"project_id" binding:"required"` // UUID string
	Category    models.FileCategory `json:"category" binding:"required"`
	Description string              `json:"description"`
	FileName    string              `json:"file_name" binding:"required"`
	FileSize    int64               `json:"file_size" binding:"required"`
	FileType    string              `json:"file_type" binding:"required"`
	MimeType    string              `json:"mime_type" binding:"required"`
	Reader      io.Reader           `json:"-"` // Not in JSON, passed separately
}

// SearchFilesParams represents parameters for searching files
type SearchFilesParams struct {
	ProjectID *string // UUID string
	Category  *models.FileCategory
	FileType  *string
	StartDate *time.Time
	EndDate   *time.Time
	Keyword   string
	Page      int
	Size      int
}

// UploadFile uploads a file to storage and creates a file record (UUID string)
// Checks permission using permission service before upload
func (s *FileService) UploadFile(ctx context.Context, req *UploadFileRequest, uploaderID string, permissionService *PermissionService) (*models.File, error) {
	// Check permission to access project
	canAccess, err := permissionService.CanAccessProject(uploaderID, req.ProjectID)
	if err != nil {
		return nil, fmt.Errorf("failed to check project access permission: %w", err)
	}
	if !canAccess {
		return nil, errors.New("您没有权限访问此项目")
	}

	// Validate file size (max 100MB) - EC-012
	const maxFileSize = 100 * 1024 * 1024 // 100MB
	if req.FileSize > maxFileSize {
		return nil, errors.New("文件大小超过限制（最大100MB），请压缩文件或选择较小的文件")
	}

	// Validate file type - EC-013
	if err := s.validateFileType(req.FileType, req.Category); err != nil {
		return nil, err
	}

	// 先生成 file_id，路径含 file_id 便于追溯与列举
	fileID := uuid.New().String()
	filePath := s.generateFilePath(req.ProjectID, req.Category, fileID, req.FileName)

	// Upload to storage
	err = storage.UploadFile(ctx, s.config.StorageBucketName(), filePath, req.Reader, req.FileSize, req.MimeType)
	if err != nil {
		return nil, fmt.Errorf("failed to upload file to storage: %w", err)
	}

	// Create file record in database（使用预生成的 ID，与路径中的 file_id 一致）
	file := &models.File{
		ID:           fileID,
		FileName:     req.FileName,
		OriginalName: req.FileName,
		FilePath:     filePath,
		FileSize:     req.FileSize,
		FileType:     req.FileType,
		MimeType:     req.MimeType,
		Category:     req.Category,
		Description:  req.Description,
		ProjectID:    req.ProjectID,
		UploaderID:   uploaderID,
	}

	if err := s.db.Create(file).Error; err != nil {
		// If database insert fails, try to delete the uploaded file
		_ = storage.DeleteFile(ctx, s.config.StorageBucketName(), filePath)
		return nil, fmt.Errorf("failed to create file record: %w", err)
	}

	return file, nil
}

// GetFile retrieves a file by ID (UUID string)
// Includes soft-deleted files for display purposes (EC-015, EC-017)
func (s *FileService) GetFile(id string) (*models.File, error) {
	var file models.File
	if err := s.db.Unscoped().Preload("Project").Preload("Uploader").First(&file, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("file not found")
		}
		return nil, err
	}

	return &file, nil
}

// GetFileContent retrieves file content from storage (UUID string)
// Checks permission before returning content (EC-015)
func (s *FileService) GetFileContent(ctx context.Context, fileID string, userID string, permissionService *PermissionService) (io.ReadCloser, *models.File, error) {
	file, err := s.GetFile(fileID)
	if err != nil {
		return nil, nil, err
	}

	// Check permission - EC-015: if permission fails, return file info but not content
	canAccess, err := permissionService.CanAccessProject(userID, file.ProjectID)
	if err != nil {
		return nil, file, fmt.Errorf("failed to check project access permission: %w", err)
	}
	if !canAccess {
		// Return file info but not content (EC-015)
		return nil, file, errors.New("您没有权限下载此文件")
	}

	// Check if file is deleted
	if file.DeletedAt != nil {
		return nil, file, errors.New("文件已删除")
	}

	object, err := storage.GetFile(ctx, s.config.StorageBucketName(), file.FilePath)
	if err != nil {
		return nil, file, fmt.Errorf("failed to get file from storage: %w", err)
	}

	return object, file, nil
}

// DeleteFile performs soft delete on a file (EC-017)
// Marks file as deleted but retains file record for business data references
func (s *FileService) DeleteFile(ctx context.Context, fileID string) error {
	file, err := s.GetFile(fileID)
	if err != nil {
		return err
	}

	// Check if file is already deleted
	if file.DeletedAt != nil {
		return errors.New("file already deleted")
	}

	// Soft delete: mark as deleted but keep record
	now := time.Now()
	file.DeletedAt = &now
	if err := s.db.Save(file).Error; err != nil {
		return fmt.Errorf("failed to soft delete file: %w", err)
	}

	// Note: We don't delete from storage to allow recovery if needed
	// Storage cleanup can be done via a separate cleanup job if required

	return nil
}

// SearchFiles searches files based on criteria
// Excludes soft-deleted files by default (can be modified to include them if needed)
func (s *FileService) SearchFiles(params *SearchFilesParams) ([]models.File, int64, error) {
	query := s.db.Model(&models.File{}).Where("deleted_at IS NULL")

	// Apply filters
	if params.ProjectID != nil {
		query = query.Where("project_id = ?", *params.ProjectID)
	}

	if params.Category != nil {
		query = query.Where("category = ?", *params.Category)
	}

	if params.FileType != nil {
		query = query.Where("file_type = ?", *params.FileType)
	}

	if params.StartDate != nil {
		query = query.Where("created_at >= ?", *params.StartDate)
	}

	if params.EndDate != nil {
		query = query.Where("created_at <= ?", *params.EndDate)
	}

	if params.Keyword != "" {
		keyword := "%" + params.Keyword + "%"
		query = query.Where("file_name LIKE ? OR original_name LIKE ? OR description LIKE ?", keyword, keyword, keyword)
	}

	// Count total
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Apply pagination
	page := params.Page
	if page < 1 {
		page = 1
	}
	size := params.Size
	if size < 1 {
		size = 20
	}
	if size > 100 {
		size = 100
	}

	offset := (page - 1) * size

	// Get files
	var files []models.File
	if err := query.Preload("Project").Preload("Uploader").
		Order("created_at DESC").
		Offset(offset).
		Limit(size).
		Find(&files).Error; err != nil {
		return nil, 0, err
	}

	return files, total, nil
}

// GetPresignedURL generates a presigned URL for temporary file access (UUID string)
func (s *FileService) GetPresignedURL(ctx context.Context, fileID string, expiry time.Duration) (string, error) {
	file, err := s.GetFile(fileID)
	if err != nil {
		return "", err
	}

	url, err := storage.GetPresignedURL(ctx, s.config.StorageBucketName(), file.FilePath, expiry)
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned URL: %w", err)
	}

	return url, nil
}

// CheckFilePermission checks if a user has permission to access a file (UUID string)
// Uses permission service to check CanAccessProject
func (s *FileService) CheckFilePermission(fileID string, userID string, permissionService *PermissionService) (bool, error) {
	file, err := s.GetFile(fileID)
	if err != nil {
		return false, err
	}

	// Use permission service to check if user can access the project
	canAccess, err := permissionService.CanAccessProject(userID, file.ProjectID)
	if err != nil {
		return false, fmt.Errorf("failed to check project access permission: %w", err)
	}

	return canAccess, nil
}

// Helper methods

// generateFilePath 生成带 file_id 的存储路径，便于追溯与列举（格式: projects/{project_id}/{category}/{file_id}_{safeBaseName}_{timestamp}{ext}）
func (s *FileService) generateFilePath(projectID string, category models.FileCategory, fileID string, fileName string) string {
	timestamp := time.Now().Format("20060102150405")
	ext := filepath.Ext(fileName)
	baseName := strings.TrimSuffix(fileName, ext)
	safeBaseName := strings.ReplaceAll(baseName, " ", "_")
	safeBaseName = strings.ReplaceAll(safeBaseName, "/", "_")

	return fmt.Sprintf("projects/%s/%s/%s_%s_%s%s", projectID, category, fileID, safeBaseName, timestamp, ext)
}

// validateFileType validates file type - only blocks dangerous file types
// All other file types are allowed for security reasons
func (s *FileService) validateFileType(fileType string, category models.FileCategory) error {
	// Validate category first
	validCategories := []models.FileCategory{
		// 合同相关
		models.FileCategoryContractMain,
		models.FileCategoryContractAmendment,
		models.FileCategoryContractExternal,
		// 招投标相关
		models.FileCategoryTender,
		models.FileCategoryBid,
		models.FileCategoryAward,
		// 生产相关
		models.FileCategorySchemePPT,
		models.FileCategoryPreliminary,
		models.FileCategoryConstruction,
		models.FileCategoryVariation,
		models.FileCategoryCompletion,
		models.FileCategoryAuditReport,
		// 其他
		models.FileCategoryInvoice,
	}
	valid := false
	for _, vc := range validCategories {
		if category == vc {
			valid = true
			break
		}
	}
	if !valid {
		return errors.New("invalid file category")
	}

	// List of dangerous file types that should be blocked
	// These are executable files, scripts, and installers that pose security risks
	dangerousTypes := []string{
		// Windows executables
		"exe", "bat", "cmd", "com", "pif", "scr",
		// Scripts
		"vbs", "js", "sh", "ps1", "psm1", "psd1",
		// Archives that can execute code
		"jar", "app",
		// Installers
		"dmg", "deb", "rpm", "msi", "apk", "ipa",
		// Other potentially dangerous
		"bin", "run", "out",
	}

	// Get file extension
	// fileType can be either a full filename or just an extension (with or without dot)
	var ext string
	if strings.HasPrefix(fileType, ".") {
		// fileType is already an extension like ".md"
		ext = strings.ToLower(strings.TrimPrefix(fileType, "."))
	} else {
		// fileType might be a filename or extension without dot
		ext = strings.ToLower(strings.TrimPrefix(filepath.Ext(fileType), "."))
		if ext == "" {
			// If no extension found, treat fileType itself as extension
			ext = strings.ToLower(fileType)
		}
	}

		// Check if extension is in the dangerous types list
	for _, dangerousExt := range dangerousTypes {
		if ext == dangerousExt {
			return fmt.Errorf("不支持的文件类型，请上传PDF、Word、Excel、图片等格式的文件")
		}
	}

	// All other file types are allowed (PDF, Word, Excel, images, etc.)
	return nil
}

// multipartPartPrefix 分片暂存路径前缀，完成合并后删除
const multipartPartPrefix = "multipart/"

func multipartPartKey(uploadID string, partNumber int) string {
	return multipartPartPrefix + uploadID + "/" + strconv.Itoa(partNumber)
}

// InitiateMultipartUpload 发起分片上传（断点续传），返回 upload_id 与 file_id
func (s *FileService) InitiateMultipartUpload(ctx context.Context, projectID string, category models.FileCategory, fileName string, fileSize int64, mimeType, fileType string, uploaderID string, permissionService *PermissionService) (uploadID, fileID string, err error) {
	canAccess, err := permissionService.CanAccessProject(uploaderID, projectID)
	if err != nil {
		return "", "", err
	}
	if !canAccess {
		return "", "", errors.New("您没有权限访问此项目")
	}
	const maxFileSize = 100 * 1024 * 1024
	if fileSize <= 0 || fileSize > maxFileSize {
		return "", "", errors.New("文件大小超过限制（最大100MB）或无效")
	}
	if err := s.validateFileType(fileType, category); err != nil {
		return "", "", err
	}
	fileID = uuid.New().String()
	objectKey := s.generateFilePath(projectID, category, fileID, fileName)
	uploadID = uuid.New().String()
	rec := &models.MultipartUpload{
		UploadID:   uploadID,
		ProjectID:  projectID,
		Category:   category,
		FileName:   fileName,
		FileSize:   fileSize,
		MimeType:   mimeType,
		FileID:     fileID,
		ObjectKey:  objectKey,
		UploaderID: uploaderID,
		Status:     models.MultipartUploadStatusInProgress,
	}
	if err := s.db.Create(rec).Error; err != nil {
		return "", "", fmt.Errorf("创建分片上传任务失败: %w", err)
	}
	return uploadID, fileID, nil
}

// UploadPart 上传一个分片
func (s *FileService) UploadPart(ctx context.Context, uploadID string, partNumber int, reader io.Reader, partSize int64, uploaderID string) error {
	var rec models.MultipartUpload
	if err := s.db.First(&rec, "upload_id = ? AND status = ?", uploadID, models.MultipartUploadStatusInProgress).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("upload not found or already completed/aborted")
		}
		return err
	}
	if rec.UploaderID != uploaderID {
		return errors.New("您没有权限上传该任务的分片")
	}
	if partNumber < 1 {
		return errors.New("part_number must be >= 1")
	}
	partKey := multipartPartKey(uploadID, partNumber)
	if err := storage.UploadFile(ctx, s.config.StorageBucketName(), partKey, reader, partSize, ""); err != nil {
		return fmt.Errorf("上传分片失败: %w", err)
	}
	// 幂等：存在则更新 size
	s.db.Where("upload_id = ? AND part_number = ?", uploadID, partNumber).Delete(&models.MultipartUploadPart{})
	if err := s.db.Create(&models.MultipartUploadPart{UploadID: uploadID, PartNumber: partNumber, Size: partSize}).Error; err != nil {
		return fmt.Errorf("记录分片失败: %w", err)
	}
	return nil
}

// CompleteMultipartUpload 合并分片并创建文件记录
func (s *FileService) CompleteMultipartUpload(ctx context.Context, uploadID string, uploaderID string) (*models.File, error) {
	var rec models.MultipartUpload
	if err := s.db.First(&rec, "upload_id = ? AND status = ?", uploadID, models.MultipartUploadStatusInProgress).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("upload not found or already completed/aborted")
		}
		return nil, err
	}
	if rec.UploaderID != uploaderID {
		return nil, errors.New("您没有权限完成该上传任务")
	}
	var parts []models.MultipartUploadPart
	if err := s.db.Where("upload_id = ?", uploadID).Order("part_number").Find(&parts).Error; err != nil {
		return nil, err
	}
	if len(parts) == 0 {
		return nil, errors.New("没有已上传的分片")
	}
	bucket := s.config.StorageBucketName()
	var totalPartsSize int64
	for _, p := range parts {
		totalPartsSize += p.Size
	}
	if totalPartsSize != rec.FileSize {
		return nil, fmt.Errorf("分片总大小 %d 与声明文件大小 %d 不一致", totalPartsSize, rec.FileSize)
	}
	pr, pw := io.Pipe()
	go func() {
		defer pw.Close()
		for _, p := range parts {
			key := multipartPartKey(uploadID, p.PartNumber)
			obj, err := storage.GetFile(ctx, bucket, key)
			if err != nil {
				_ = pw.CloseWithError(fmt.Errorf("读取分片 %d: %w", p.PartNumber, err))
				return
			}
			_, err = io.Copy(pw, obj)
			if r, ok := interface{}(obj).(io.Closer); ok {
				_ = r.Close()
			}
			if err != nil {
				_ = pw.CloseWithError(err)
				return
			}
		}
	}()
	if err := storage.UploadFile(ctx, bucket, rec.ObjectKey, pr, rec.FileSize, rec.MimeType); err != nil {
		return nil, fmt.Errorf("合并上传失败: %w", err)
	}
	file := &models.File{
		ID:           rec.FileID,
		FileName:     rec.FileName,
		OriginalName: rec.FileName,
		FilePath:     rec.ObjectKey,
		FileSize:     rec.FileSize,
		FileType:     filepath.Ext(rec.FileName),
		MimeType:     rec.MimeType,
		Category:     rec.Category,
		ProjectID:    rec.ProjectID,
		UploaderID:   rec.UploaderID,
	}
	if err := s.db.Create(file).Error; err != nil {
		_ = storage.DeleteFile(ctx, bucket, rec.ObjectKey)
		return nil, fmt.Errorf("创建文件记录失败: %w", err)
	}
	rec.Status = models.MultipartUploadStatusCompleted
	s.db.Save(&rec)
	s.db.Where("upload_id = ?", uploadID).Delete(&models.MultipartUploadPart{})
	for _, p := range parts {
		_ = storage.DeleteFile(ctx, bucket, multipartPartKey(uploadID, p.PartNumber))
	}
	return file, nil
}

// AbortMultipartUpload 取消分片上传并删除已传分片
func (s *FileService) AbortMultipartUpload(ctx context.Context, uploadID string, uploaderID string) error {
	var rec models.MultipartUpload
	if err := s.db.First(&rec, "upload_id = ? AND status = ?", uploadID, models.MultipartUploadStatusInProgress).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("upload not found or already completed/aborted")
		}
		return err
	}
	if rec.UploaderID != uploaderID {
		return errors.New("您没有权限取消该上传任务")
	}
	var parts []models.MultipartUploadPart
	s.db.Where("upload_id = ?", uploadID).Find(&parts)
	bucket := s.config.StorageBucketName()
	for _, p := range parts {
		_ = storage.DeleteFile(ctx, bucket, multipartPartKey(uploadID, p.PartNumber))
	}
	s.db.Where("upload_id = ?", uploadID).Delete(&models.MultipartUploadPart{})
	rec.Status = models.MultipartUploadStatusAborted
	s.db.Save(&rec)
	return nil
}
