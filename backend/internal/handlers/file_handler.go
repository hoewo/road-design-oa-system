package handlers

import (
	"context"
	"net/http"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"project-oa-backend/internal/config"
	"project-oa-backend/internal/middleware"
	"project-oa-backend/internal/models"
	"project-oa-backend/internal/services"
	"project-oa-backend/pkg/utils"
)

// FileHandler handles file-related HTTP requests
type FileHandler struct {
	fileService      *services.FileService
	permissionService *services.PermissionService
	logger           *zap.Logger
}

// NewFileHandler creates a new file handler
func NewFileHandler(cfg *config.Config, logger *zap.Logger) *FileHandler {
	return &FileHandler{
		fileService:       services.NewFileService(cfg),
		permissionService: services.NewPermissionService(),
		logger:           logger,
	}
}

// UploadFile handles file upload for a project
// @Summary Upload a file to a project
// @Description Upload a file to a project with category and optional description
// @Tags 文件管理
// @Security BearerAuth
// @Accept multipart/form-data
// @Produce json
// @Param id path string true "Project ID (UUID)"
// @Param file formData file true "File to upload"
// @Param category formData string true "File category (contract, bidding, design, audit, production, other)"
// @Param description formData string false "File description"
// @Success 201 {object} models.File
// @Failure 400 {object} utils.ErrorResponse
// @Failure 401 {object} utils.ErrorResponse
// @Failure 500 {object} utils.ErrorResponse
// @Router /projects/{id}/files [post]
func (h *FileHandler) UploadFile(c *gin.Context) {
	projectID := c.Param("id")
	if projectID == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	// Get uploaded file
	fileHeader, err := c.FormFile("file")
	if err != nil {
		utils.HandleError(c, http.StatusBadRequest, "No file provided", err)
		return
	}

	// Get category
	categoryStr := c.PostForm("category")
	if categoryStr == "" {
		utils.HandleError(c, http.StatusBadRequest, "Category is required", nil)
		return
	}
	category := models.FileCategory(categoryStr)

	// Validate category
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
		utils.HandleError(c, http.StatusBadRequest, "Invalid category", nil)
		return
	}

	// Get description (optional)
	description := c.PostForm("description")

	// Open file
	file, err := fileHeader.Open()
	if err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Failed to open file", err)
		return
	}
	defer file.Close()

	// Get user ID from context
	userID, exists := middleware.GetUserID(c)
	if !exists {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	// Get file extension for FileType
	fileExt := filepath.Ext(fileHeader.Filename)
	if fileExt == "" {
		// If no extension, use empty string (will be handled by service)
		fileExt = ""
	}

	// Prepare upload request
	uploadReq := &services.UploadFileRequest{
		ProjectID:   projectID,
		Category:    category,
		Description: description,
		FileName:    fileHeader.Filename,
		FileSize:    fileHeader.Size,
		FileType:    fileExt,
		MimeType:    fileHeader.Header.Get("Content-Type"),
		Reader:      file,
	}

	// Upload file (with permission check)
	ctx := context.Background()
	uploadedFile, err := h.fileService.UploadFile(ctx, uploadReq, userID, h.permissionService)
	if err != nil {
		h.logger.Error("Failed to upload file",
			zap.Error(err),
			zap.String("project_id", projectID),
			zap.String("category", string(category)),
		)
		// Check if it's a permission error
		if err.Error() == "您没有权限访问此项目" {
			utils.HandleError(c, http.StatusForbidden, err.Error(), err)
		} else {
			utils.HandleError(c, http.StatusInternalServerError, "Failed to upload file", err)
		}
		return
	}

	h.logger.Info("File uploaded successfully",
		zap.String("file_id", uploadedFile.ID),
		zap.String("project_id", projectID),
		zap.String("category", string(category)),
	)

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    uploadedFile,
	})
}

// DownloadFile handles file download
// @Summary Download a file
// @Description Download a file by file ID
// @Tags 文件管理
// @Security BearerAuth
// @Produce application/octet-stream
// @Param fileId path string true "File ID (UUID)"
// @Success 200 "File content"
// @Failure 404 {object} utils.ErrorResponse
// @Failure 403 {object} utils.ErrorResponse
// @Router /user/files/{fileId}/download [get]
func (h *FileHandler) DownloadFile(c *gin.Context) {
	fileID := c.Param("fileId")
	if fileID == "" {
		utils.HandleError(c, http.StatusBadRequest, "File ID is required", nil)
		return
	}

	// Get user ID from context
	userID, exists := middleware.GetUserID(c)
	if !exists {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	// Get file content (with permission check) - EC-015
	ctx := context.Background()
	fileContent, file, err := h.fileService.GetFileContent(ctx, fileID, userID, h.permissionService)
	if err != nil {
		// If permission denied, return file info but not content (EC-015)
		if err.Error() == "您没有权限下载此文件" {
			h.logger.Warn("Permission denied for file download",
				zap.String("file_id", fileID),
				zap.String("user_id", userID),
			)
			// Return file info but not content
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"error":   "您没有权限下载此文件",
				"file":    file, // Return file info
			})
			return
		}
		utils.HandleError(c, http.StatusNotFound, "File not found", err)
		return
	}
	defer fileContent.Close()

	// Set headers
	c.Header("Content-Disposition", "attachment; filename="+file.OriginalName)
	c.Header("Content-Type", file.MimeType)
	c.Header("Content-Length", strconv.FormatInt(file.FileSize, 10))

	// Stream file
	c.DataFromReader(http.StatusOK, file.FileSize, file.MimeType, fileContent, nil)
}

// SearchFiles handles file search
// @Summary Search files
// @Description Search files by project, category, file type, upload time, and keyword
// @Tags 文件管理
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param project_id query string false "Project ID (UUID)"
// @Param category query string false "File category"
// @Param file_type query string false "File type (extension)"
// @Param start_date query string false "Start date (YYYY-MM-DD)"
// @Param end_date query string false "End date (YYYY-MM-DD)"
// @Param keyword query string false "Search keyword"
// @Param page query int false "Page number (default: 1)"
// @Param size query int false "Page size (default: 20, max: 100)"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} utils.ErrorResponse
// @Failure 401 {object} utils.ErrorResponse
// @Router /user/files/search [get]
func (h *FileHandler) SearchFiles(c *gin.Context) {
	// Parse query parameters
	params := &services.SearchFilesParams{
		Page: 1,
		Size: 20,
	}

	if projectID := c.Query("project_id"); projectID != "" {
		params.ProjectID = &projectID
	}

	if categoryStr := c.Query("category"); categoryStr != "" {
		category := models.FileCategory(categoryStr)
		params.Category = &category
	}

	if fileType := c.Query("file_type"); fileType != "" {
		params.FileType = &fileType
	}

	if startDateStr := c.Query("start_date"); startDateStr != "" {
		if startDate, err := time.Parse("2006-01-02", startDateStr); err == nil {
			params.StartDate = &startDate
		}
	}

	if endDateStr := c.Query("end_date"); endDateStr != "" {
		if endDate, err := time.Parse("2006-01-02", endDateStr); err == nil {
			// Set to end of day
			endDate = endDate.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
			params.EndDate = &endDate
		}
	}

	params.Keyword = c.Query("keyword")

	if pageStr := c.Query("page"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil && page > 0 {
			params.Page = page
		}
	}

	if sizeStr := c.Query("size"); sizeStr != "" {
		if size, err := strconv.Atoi(sizeStr); err == nil && size > 0 {
			params.Size = size
		}
	}

	// Get user ID for permission check (if project_id is specified)
	userID, exists := middleware.GetUserID(c)
	if !exists {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	// If project_id is specified, check permission
	if params.ProjectID != nil {
		canAccess, err := h.permissionService.CanAccessProject(userID, *params.ProjectID)
		if err != nil {
			utils.HandleError(c, http.StatusInternalServerError, "Failed to check permission", err)
			return
		}
		if !canAccess {
			utils.HandleError(c, http.StatusForbidden, "您没有权限访问此项目", nil)
			return
		}
	}

	// Search files
	files, total, err := h.fileService.SearchFiles(params)
	if err != nil {
		h.logger.Error("Failed to search files", zap.Error(err))
		utils.HandleError(c, http.StatusInternalServerError, "Failed to search files", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"files": files,
			"total": total,
			"page":  params.Page,
			"size":  params.Size,
		},
	})
}

// DeleteFile handles file deletion (soft delete)
// @Summary Delete a file
// @Description Soft delete a file (marks as deleted but retains record)
// @Tags 文件管理
// @Security BearerAuth
// @Param fileId path string true "File ID (UUID)"
// @Success 200 {object} map[string]interface{}
// @Failure 404 {object} utils.ErrorResponse
// @Failure 403 {object} utils.ErrorResponse
// @Router /user/files/{fileId} [delete]
func (h *FileHandler) DeleteFile(c *gin.Context) {
	fileID := c.Param("fileId")
	if fileID == "" {
		utils.HandleError(c, http.StatusBadRequest, "File ID is required", nil)
		return
	}

	// Get user ID from context
	userID, exists := middleware.GetUserID(c)
	if !exists {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	// Get file to check permission
	file, err := h.fileService.GetFile(fileID)
	if err != nil {
		utils.HandleError(c, http.StatusNotFound, "File not found", err)
		return
	}

	// Check permission to access project
	canAccess, err := h.permissionService.CanAccessProject(userID, file.ProjectID)
	if err != nil {
		utils.HandleError(c, http.StatusInternalServerError, "Failed to check permission", err)
		return
	}
	if !canAccess {
		utils.HandleError(c, http.StatusForbidden, "您没有权限删除此文件", nil)
		return
	}

	// Soft delete file (EC-017)
	ctx := context.Background()
	if err := h.fileService.DeleteFile(ctx, fileID); err != nil {
		h.logger.Error("Failed to delete file",
			zap.Error(err),
			zap.String("file_id", fileID),
		)
		utils.HandleError(c, http.StatusInternalServerError, "Failed to delete file", err)
		return
	}

	h.logger.Info("File deleted successfully",
		zap.String("file_id", fileID),
	)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "文件已删除",
	})
}

