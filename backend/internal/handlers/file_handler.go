package handlers

import (
	"context"
	"net/http"
	"path/filepath"
	"strconv"

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
	fileService *services.FileService
	logger      *zap.Logger
}

// NewFileHandler creates a new file handler
func NewFileHandler(cfg *config.Config, logger *zap.Logger) *FileHandler {
	return &FileHandler{
		fileService: services.NewFileService(cfg),
		logger:      logger,
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
		models.FileCategoryContract,
		models.FileCategoryBidding,
		models.FileCategoryDesign,
		models.FileCategoryAudit,
		models.FileCategoryProduction,
		models.FileCategoryOther,
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

	// Upload file
	ctx := context.Background()
	uploadedFile, err := h.fileService.UploadFile(ctx, uploadReq, userID)
	if err != nil {
		h.logger.Error("Failed to upload file",
			zap.Error(err),
			zap.String("project_id", projectID),
			zap.String("category", string(category)),
		)
		utils.HandleError(c, http.StatusInternalServerError, "Failed to upload file", err)
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

	// Check permission
	hasPermission, err := h.fileService.CheckFilePermission(fileID, userID)
	if err != nil {
		utils.HandleError(c, http.StatusNotFound, "File not found", err)
		return
	}
	if !hasPermission {
		utils.HandleError(c, http.StatusForbidden, "Permission denied", nil)
		return
	}

	// Get file content
	ctx := context.Background()
	fileContent, file, err := h.fileService.GetFileContent(ctx, fileID)
	if err != nil {
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

