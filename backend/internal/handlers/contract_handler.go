package handlers

import (
	"context"
	"mime"
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

// ContractHandler handles contract-related HTTP requests
type ContractHandler struct {
	contractService  *services.ContractService
	fileService      *services.FileService
	permissionService *services.PermissionService
	logger           *zap.Logger
}

// NewContractHandler creates a new contract handler
func NewContractHandler(cfg *config.Config, logger *zap.Logger) *ContractHandler {
	return &ContractHandler{
		contractService:  services.NewContractService(),
		fileService:      services.NewFileService(cfg),
		permissionService: services.NewPermissionService(),
		logger:           logger,
	}
}

// GetContractsByProject handles retrieving all contracts for a project
// @Summary Get contracts by project
// @Description Get all contracts for a specific project
// @Tags 合同管理
// @Security BearerAuth
// @Produce json
// @Param id path string true "Project ID (UUID)"
// @Success 200 {array} models.Contract
// @Failure 404 {object} utils.ErrorResponse
// @Router /projects/{id}/contracts [get]
func (h *ContractHandler) GetContractsByProject(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	contracts, err := h.contractService.ListContractsByProject(id)
	if err != nil {
		h.logger.Error("Failed to get contracts",
			zap.Error(err),
			zap.String("project_id", id),
		)
		utils.HandleError(c, http.StatusInternalServerError, "Failed to get contracts", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    contracts,
	})
}

// CreateContract handles contract creation
// @Summary Create a new contract
// @Description Create a new contract for a project
// @Tags 合同管理
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param id path string true "Project ID (UUID)"
// @Param request body services.CreateContractRequest true "Contract information"
// @Success 201 {object} models.Contract
// @Failure 400 {object} utils.ErrorResponse
// @Failure 404 {object} utils.ErrorResponse
// @Router /projects/{id}/contracts [post]
func (h *ContractHandler) CreateContract(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	var req services.CreateContractRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// Get user ID from context
	userID, exists := middleware.GetUserID(c)
	if !exists {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	contract, err := h.contractService.CreateContract(id, userID, &req)
	if err != nil {
		h.logger.Error("Failed to create contract",
			zap.Error(err),
			zap.String("project_id", id),
		)
		if err.Error() == "project not found" {
			utils.HandleError(c, http.StatusNotFound, "Failed to create contract", err)
		} else if err.Error() == "permission denied: you do not have permission to manage business information" {
			utils.HandleError(c, http.StatusForbidden, "Failed to create contract", err)
		} else {
			utils.HandleError(c, http.StatusBadRequest, "Failed to create contract", err)
		}
		return
	}

	h.logger.Info("Contract created successfully",
		zap.String("contract_id", contract.ID),
		zap.String("project_id", id),
	)

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    contract,
	})
}

// GetContract handles retrieving a single contract
// @Summary Get contract by ID
// @Description Get detailed information about a specific contract
// @Tags 合同管理
// @Security BearerAuth
// @Produce json
// @Param id path string true "Contract ID (UUID)"
// @Success 200 {object} models.Contract
// @Failure 404 {object} utils.ErrorResponse
// @Router /contracts/{id} [get]
func (h *ContractHandler) GetContract(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Contract ID is required", nil)
		return
	}

	contract, err := h.contractService.GetContract(id)
	if err != nil {
		h.logger.Error("Failed to get contract",
			zap.Error(err),
			zap.String("contract_id", id),
		)
		utils.HandleError(c, http.StatusNotFound, "Failed to get contract", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    contract,
	})
}

// UpdateContract handles contract updates
// @Summary Update a contract
// @Description Update an existing contract
// @Tags 合同管理
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param id path string true "Contract ID (UUID)"
// @Param request body services.UpdateContractRequest true "Contract information"
// @Success 200 {object} models.Contract
// @Failure 400 {object} utils.ErrorResponse
// @Failure 404 {object} utils.ErrorResponse
// @Router /contracts/{id} [put]
func (h *ContractHandler) UpdateContract(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Contract ID is required", nil)
		return
	}

	var req services.UpdateContractRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// Get user ID from context
	userID, exists := middleware.GetUserID(c)
	if !exists {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	contract, err := h.contractService.UpdateContract(id, userID, &req)
	if err != nil {
		h.logger.Error("Failed to update contract",
			zap.Error(err),
			zap.String("contract_id", id),
		)
		if err.Error() == "contract not found" {
			utils.HandleError(c, http.StatusNotFound, "Failed to update contract", err)
		} else if err.Error() == "permission denied: you do not have permission to manage business information" {
			utils.HandleError(c, http.StatusForbidden, "Failed to update contract", err)
		} else {
			utils.HandleError(c, http.StatusBadRequest, "Failed to update contract", err)
		}
		return
	}

	h.logger.Info("Contract updated successfully",
		zap.String("contract_id", contract.ID),
	)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    contract,
	})
}

// DeleteContract handles contract deletion
// @Summary Delete a contract
// @Description Delete an existing contract
// @Tags 合同管理
// @Security BearerAuth
// @Param id path string true "Contract ID (UUID)"
// @Success 204 "No Content"
// @Failure 404 {object} utils.ErrorResponse
// @Failure 400 {object} utils.ErrorResponse
// @Router /contracts/{id} [delete]
func (h *ContractHandler) DeleteContract(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Contract ID is required", nil)
		return
	}

	// Get user ID from context
	userID, exists := middleware.GetUserID(c)
	if !exists {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	if err := h.contractService.DeleteContract(id, userID); err != nil {
		h.logger.Error("Failed to delete contract",
			zap.Error(err),
			zap.String("contract_id", id),
		)
		if err.Error() == "contract not found" {
			utils.HandleError(c, http.StatusNotFound, "Failed to delete contract", err)
		} else if err.Error() == "permission denied: you do not have permission to manage business information" {
			utils.HandleError(c, http.StatusForbidden, "Failed to delete contract", err)
		} else {
			utils.HandleError(c, http.StatusBadRequest, "Failed to delete contract", err)
		}
		return
	}

	h.logger.Info("Contract deleted successfully",
		zap.String("contract_id", id),
	)

	c.Status(http.StatusNoContent)
}

// UploadContractFile handles contract file upload
// @Summary Upload a contract file
// @Description Upload a file for a contract
// @Tags 合同管理
// @Security BearerAuth
// @Accept multipart/form-data
// @Produce json
// @Param id path string true "Contract ID (UUID)"
// @Param file formData file true "File to upload"
// @Param description formData string false "File description"
// @Success 201 {object} models.File
// @Failure 400 {object} utils.ErrorResponse
// @Failure 404 {object} utils.ErrorResponse
// @Router /contracts/{id}/files [post]
func (h *ContractHandler) UploadContractFile(c *gin.Context) {
	contractID := c.Param("id")
	if contractID == "" {
		utils.HandleError(c, http.StatusBadRequest, "Contract ID is required", nil)
		return
	}

	// Get user ID from context
	userID, exists := middleware.GetUserID(c)
	if !exists {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	// Get contract to get project ID and check permission
	contract, err := h.contractService.GetContract(contractID)
	if err != nil {
		h.logger.Error("Failed to get contract", zap.Error(err), zap.String("contract_id", contractID))
		utils.HandleError(c, http.StatusNotFound, "Contract not found", err)
		return
	}

	// Check permission
	permissionService := services.NewPermissionService()
	canManage, err := permissionService.CanManageBusinessInfo(userID, contract.ProjectID)
	if err != nil {
		utils.HandleError(c, http.StatusInternalServerError, "Failed to check permission", err)
		return
	}
	if !canManage {
		utils.HandleError(c, http.StatusForbidden, "Permission denied: you do not have permission to manage business information", nil)
		return
	}

	// Get uploaded file
	fileHeader, err := c.FormFile("file")
	if err != nil {
		utils.HandleError(c, http.StatusBadRequest, "No file provided", err)
		return
	}

	// Open file
	file, err := fileHeader.Open()
	if err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Failed to open file", err)
		return
	}
	defer file.Close()

	// Get description
	description := c.PostForm("description")

	// Get file extension for FileType
	fileExt := filepath.Ext(fileHeader.Filename)
	if fileExt == "" {
		// Try to get extension from MIME type
		mimeType := fileHeader.Header.Get("Content-Type")
		if exts, err := mime.ExtensionsByType(mimeType); err == nil && len(exts) > 0 {
			fileExt = exts[0]
		}
	}

	// Prepare upload request
	uploadReq := &services.UploadFileRequest{
		ProjectID:   contract.ProjectID,
		Category:    models.FileCategoryContractMain,
		Description: description,
		FileName:    fileHeader.Filename,
		FileSize:    fileHeader.Size,
		FileType:    fileExt, // Use file extension instead of full filename
		MimeType:    fileHeader.Header.Get("Content-Type"),
		Reader:      file,
	}

	// Upload file
	ctx := context.Background()
	uploadedFile, err := h.fileService.UploadFile(ctx, uploadReq, userID, h.permissionService)
	if err != nil {
		h.logger.Error("Failed to upload contract file",
			zap.Error(err),
			zap.String("contract_id", contractID),
		)
		utils.HandleError(c, http.StatusInternalServerError, "Failed to upload file", err)
		return
	}

	// Update contract with file ID
	updateReq := &services.UpdateContractRequest{
		ContractFileID: &uploadedFile.ID,
	}
	_, err = h.contractService.UpdateContract(contractID, userID, updateReq)
	if err != nil {
		h.logger.Error("Failed to associate file with contract",
			zap.Error(err),
			zap.String("contract_id", contractID),
			zap.String("file_id", uploadedFile.ID),
		)
		// Don't fail the request, file is already uploaded
		// Just log the error
	}

	h.logger.Info("Contract file uploaded successfully",
		zap.String("file_id", uploadedFile.ID),
		zap.String("contract_id", contractID),
	)

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    uploadedFile,
	})
}

// DownloadContractFile handles contract file download
// @Summary Download a contract file
// @Description Download a file for a contract
// @Tags 合同管理
// @Security BearerAuth
// @Produce application/octet-stream
// @Param fileId path string true "File ID (UUID)"
// @Success 200 "File content"
// @Failure 404 {object} utils.ErrorResponse
// @Router /contracts/files/{fileId}/download [get]
func (h *ContractHandler) DownloadContractFile(c *gin.Context) {
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
	hasPermission, err := h.fileService.CheckFilePermission(fileID, userID, h.permissionService)
	if err != nil {
		utils.HandleError(c, http.StatusNotFound, "File not found", err)
		return
	}
	if !hasPermission {
		utils.HandleError(c, http.StatusForbidden, "Permission denied", nil)
		return
	}

	// Get file content (with permission check) - EC-015
	ctx := context.Background()
	fileContent, file, err := h.fileService.GetFileContent(ctx, fileID, userID, h.permissionService)
	if err != nil {
		// If permission denied, return file info but not content (EC-015)
		if err.Error() == "您没有权限下载此文件" {
			h.logger.Warn("Permission denied for contract file download",
				zap.String("file_id", fileID),
				zap.String("user_id", userID),
			)
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

// SearchContractFiles handles searching contract files
// @Summary Search contract files
// @Description Search files for contracts in a project
// @Tags 合同管理
// @Security BearerAuth
// @Produce json
// @Param id path string true "Project ID (UUID)"
// @Param category query string false "File category" Enums(contract, bidding)
// @Param fileType query string false "File type"
// @Param keyword query string false "Search keyword"
// @Param startDate query string false "Start date (YYYY-MM-DD)"
// @Param endDate query string false "End date (YYYY-MM-DD)"
// @Param page query int false "Page number" default(1)
// @Param size query int false "Page size" default(20)
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} utils.ErrorResponse
// @Router /projects/{id}/contracts/files [get]
func (h *ContractHandler) SearchContractFiles(c *gin.Context) {
	projectID := c.Param("id")
	if projectID == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	// Parse query parameters
	params := &services.SearchFilesParams{
		ProjectID: &projectID,
		Page:      1,
		Size:      20,
	}

	// Parse category
	if categoryStr := c.Query("category"); categoryStr != "" {
		category := models.FileCategory(categoryStr)
		params.Category = &category
	}

	// Parse file type
	if fileType := c.Query("fileType"); fileType != "" {
		params.FileType = &fileType
	}

	// Parse keyword
	params.Keyword = c.Query("keyword")

	// Parse dates
	if startDateStr := c.Query("startDate"); startDateStr != "" {
		if startDate, err := time.Parse("2006-01-02", startDateStr); err == nil {
			params.StartDate = &startDate
		}
	}

	if endDateStr := c.Query("endDate"); endDateStr != "" {
		if endDate, err := time.Parse("2006-01-02", endDateStr); err == nil {
			params.EndDate = &endDate
		}
	}

	// Parse pagination
	if pageStr := c.Query("page"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil && page > 0 {
			params.Page = page
		}
	}

	if sizeStr := c.Query("size"); sizeStr != "" {
		if size, err := strconv.Atoi(sizeStr); err == nil && size > 0 && size <= 100 {
			params.Size = size
		}
	}

	// Search files
	files, total, err := h.fileService.SearchFiles(params)
	if err != nil {
		h.logger.Error("Failed to search contract files",
			zap.Error(err),
			zap.String("project_id", projectID),
		)
		utils.HandleError(c, http.StatusInternalServerError, "Failed to search files", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    files,
		"total":   total,
		"page":    params.Page,
		"size":    params.Size,
	})
}
