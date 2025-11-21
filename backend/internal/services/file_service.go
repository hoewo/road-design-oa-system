package services

import (
	"context"
	"errors"
	"fmt"
	"io"
	"path/filepath"
	"strings"
	"time"

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
	ProjectID   uint                `json:"project_id" binding:"required"`
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
	ProjectID *uint
	Category  *models.FileCategory
	FileType  *string
	StartDate *time.Time
	EndDate   *time.Time
	Keyword   string
	Page      int
	Size      int
}

// UploadFile uploads a file to storage and creates a file record
func (s *FileService) UploadFile(ctx context.Context, req *UploadFileRequest, uploaderID uint) (*models.File, error) {
	// Validate file size (max 100MB)
	const maxFileSize = 100 * 1024 * 1024 // 100MB
	if req.FileSize > maxFileSize {
		return nil, errors.New("文件大小超过限制（最大100MB）")
	}

	// Validate file type
	if err := s.validateFileType(req.FileType, req.Category); err != nil {
		return nil, err
	}

	// Generate file path
	filePath := s.generateFilePath(req.ProjectID, req.Category, req.FileName)

	// Upload to MinIO
	err := storage.UploadFile(ctx, s.config.MinIOBucketName, filePath, req.Reader, req.FileSize, req.MimeType)
	if err != nil {
		return nil, fmt.Errorf("failed to upload file to storage: %w", err)
	}

	// Create file record in database
	file := &models.File{
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
		_ = storage.DeleteFile(ctx, s.config.MinIOBucketName, filePath)
		return nil, fmt.Errorf("failed to create file record: %w", err)
	}

	return file, nil
}

// GetFile retrieves a file by ID
func (s *FileService) GetFile(id uint) (*models.File, error) {
	var file models.File
	if err := s.db.Preload("Project").Preload("Uploader").First(&file, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("file not found")
		}
		return nil, err
	}

	return &file, nil
}

// GetFileContent retrieves file content from storage
func (s *FileService) GetFileContent(ctx context.Context, fileID uint) (io.ReadCloser, *models.File, error) {
	file, err := s.GetFile(fileID)
	if err != nil {
		return nil, nil, err
	}

	object, err := storage.GetFile(ctx, s.config.MinIOBucketName, file.FilePath)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get file from storage: %w", err)
	}

	return object, file, nil
}

// DeleteFile deletes a file from storage and database
func (s *FileService) DeleteFile(ctx context.Context, fileID uint) error {
	file, err := s.GetFile(fileID)
	if err != nil {
		return err
	}

	// Delete from storage
	if err := storage.DeleteFile(ctx, s.config.MinIOBucketName, file.FilePath); err != nil {
		return fmt.Errorf("failed to delete file from storage: %w", err)
	}

	// Delete from database
	if err := s.db.Delete(file).Error; err != nil {
		return fmt.Errorf("failed to delete file record: %w", err)
	}

	return nil
}

// SearchFiles searches files based on criteria
func (s *FileService) SearchFiles(params *SearchFilesParams) ([]models.File, int64, error) {
	query := s.db.Model(&models.File{})

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

// GetPresignedURL generates a presigned URL for temporary file access
func (s *FileService) GetPresignedURL(ctx context.Context, fileID uint, expiry time.Duration) (string, error) {
	file, err := s.GetFile(fileID)
	if err != nil {
		return "", err
	}

	url, err := storage.GetPresignedURL(ctx, s.config.MinIOBucketName, file.FilePath, expiry)
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned URL: %w", err)
	}

	return url, nil
}

// CheckFilePermission checks if a user has permission to access a file
func (s *FileService) CheckFilePermission(fileID uint, userID uint) (bool, error) {
	file, err := s.GetFile(fileID)
	if err != nil {
		return false, err
	}

	// Check if user is the uploader
	if file.UploaderID == userID {
		return true, nil
	}

	// TODO: Add more permission checks based on project membership, roles, etc.
	// For now, allow access if user is uploader
	return true, nil
}

// Helper methods

// generateFilePath generates a unique file path for storage
func (s *FileService) generateFilePath(projectID uint, category models.FileCategory, fileName string) string {
	timestamp := time.Now().Format("20060102150405")
	ext := filepath.Ext(fileName)
	baseName := strings.TrimSuffix(fileName, ext)
	safeBaseName := strings.ReplaceAll(baseName, " ", "_")
	safeBaseName = strings.ReplaceAll(safeBaseName, "/", "_")

	return fmt.Sprintf("projects/%d/%s/%s_%s%s", projectID, category, safeBaseName, timestamp, ext)
}

// validateFileType validates file type - only blocks dangerous file types
// All other file types are allowed for security reasons
func (s *FileService) validateFileType(fileType string, category models.FileCategory) error {
	// Validate category first
	if category != models.FileCategoryContract &&
		category != models.FileCategoryBidding &&
		category != models.FileCategoryDesign &&
		category != models.FileCategoryAudit &&
		category != models.FileCategoryProduction &&
		category != models.FileCategoryOther {
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
			return fmt.Errorf("不允许上传危险文件类型：%s（可执行文件、脚本文件等存在安全风险）", ext)
		}
	}

	// All other file types are allowed
	return nil
}
