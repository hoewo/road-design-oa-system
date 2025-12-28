package handlers

import (
	"context"
	"mime"
	"net/http"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"project-oa-backend/internal/config"
	"project-oa-backend/internal/middleware"
	"project-oa-backend/internal/models"
	"project-oa-backend/internal/services"
	"project-oa-backend/pkg/utils"
)

// ContractAmendmentHandler handles contract amendment-related HTTP requests
type ContractAmendmentHandler struct {
	amendmentService  *services.ContractAmendmentService
	fileService       *services.FileService
	permissionService *services.PermissionService
	logger            *zap.Logger
}

// NewContractAmendmentHandler creates a new contract amendment handler
func NewContractAmendmentHandler(cfg *config.Config, logger *zap.Logger) *ContractAmendmentHandler {
	return &ContractAmendmentHandler{
		amendmentService:  services.NewContractAmendmentService(),
		fileService:       services.NewFileService(cfg),
		permissionService: services.NewPermissionService(),
		logger:            logger,
	}
}

// GetContractAmendments handles retrieving all amendments for a contract
// @Summary Get contract amendments
// @Description Get all amendments for a specific contract
// @Tags 合同管理
// @Security BearerAuth
// @Produce json
// @Param id path int true "Contract ID"
// @Success 200 {array} models.ContractAmendment
// @Failure 404 {object} utils.ErrorResponse
// @Router /contracts/{id}/amendments [get]
func (h *ContractAmendmentHandler) GetContractAmendments(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Contract ID is required", nil)
		return
	}

	amendments, err := h.amendmentService.ListContractAmendments(id)
	if err != nil {
		h.logger.Error("Failed to get contract amendments",
			zap.Error(err),
			zap.String("contract_id", id),
		)
		utils.HandleError(c, http.StatusInternalServerError, "Failed to get contract amendments", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    amendments,
	})
}

// CreateContractAmendment handles contract amendment creation
// @Summary Create a new contract amendment
// @Description Create a new amendment for a contract
// @Tags 合同管理
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param id path int true "Contract ID"
// @Param request body services.CreateContractAmendmentRequest true "Amendment information"
// @Success 201 {object} models.ContractAmendment
// @Failure 400 {object} utils.ErrorResponse
// @Failure 404 {object} utils.ErrorResponse
// @Router /contracts/{id}/amendments [post]
func (h *ContractAmendmentHandler) CreateContractAmendment(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Contract ID is required", nil)
		return
	}

	var req services.CreateContractAmendmentRequest
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

	amendment, err := h.amendmentService.CreateContractAmendment(id, userID, &req)
	if err != nil {
		h.logger.Error("Failed to create contract amendment",
			zap.Error(err),
			zap.String("contract_id", id),
		)
		if err.Error() == "contract not found" {
			utils.HandleError(c, http.StatusNotFound, "Failed to create contract amendment", err)
		} else if err.Error() == "permission denied: you do not have permission to manage business information" {
			utils.HandleError(c, http.StatusForbidden, "Failed to create contract amendment", err)
		} else {
			utils.HandleError(c, http.StatusBadRequest, "Failed to create contract amendment", err)
		}
		return
	}

	h.logger.Info("Contract amendment created successfully",
		zap.String("amendment_id", amendment.ID),
		zap.String("contract_id", id),
	)

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    amendment,
	})
}

// GetContractAmendment handles retrieving a single contract amendment
// @Summary Get contract amendment by ID
// @Description Get detailed information about a specific contract amendment
// @Tags 合同管理
// @Security BearerAuth
// @Produce json
// @Param id path int true "Amendment ID"
// @Success 200 {object} models.ContractAmendment
// @Failure 404 {object} utils.ErrorResponse
// @Router /contract-amendments/{id} [get]
func (h *ContractAmendmentHandler) GetContractAmendment(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Amendment ID is required", nil)
		return
	}

	amendment, err := h.amendmentService.GetContractAmendment(id)
	if err != nil {
		h.logger.Error("Failed to get contract amendment",
			zap.Error(err),
			zap.String("amendment_id", id),
		)
		utils.HandleError(c, http.StatusNotFound, "Failed to get contract amendment", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    amendment,
	})
}

// UpdateContractAmendment handles contract amendment updates
// @Summary Update a contract amendment
// @Description Update an existing contract amendment
// @Tags 合同管理
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param id path int true "Amendment ID"
// @Param request body services.UpdateContractAmendmentRequest true "Amendment information"
// @Success 200 {object} models.ContractAmendment
// @Failure 400 {object} utils.ErrorResponse
// @Failure 404 {object} utils.ErrorResponse
// @Router /contract-amendments/{id} [put]
func (h *ContractAmendmentHandler) UpdateContractAmendment(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Amendment ID is required", nil)
		return
	}

	var req services.UpdateContractAmendmentRequest
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

	amendment, err := h.amendmentService.UpdateContractAmendment(id, userID, &req)
	if err != nil {
		h.logger.Error("Failed to update contract amendment",
			zap.Error(err),
			zap.String("amendment_id", id),
		)
		if err.Error() == "contract amendment not found" {
			utils.HandleError(c, http.StatusNotFound, "Failed to update contract amendment", err)
		} else if err.Error() == "permission denied: you do not have permission to manage business information" {
			utils.HandleError(c, http.StatusForbidden, "Failed to update contract amendment", err)
		} else {
			utils.HandleError(c, http.StatusBadRequest, "Failed to update contract amendment", err)
		}
		return
	}

	h.logger.Info("Contract amendment updated successfully",
		zap.String("amendment_id", id),
	)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    amendment,
	})
}

// DeleteContractAmendment handles contract amendment deletion
// @Summary Delete a contract amendment
// @Description Delete an existing contract amendment
// @Tags 合同管理
// @Security BearerAuth
// @Param id path int true "Amendment ID"
// @Success 204 "No Content"
// @Failure 404 {object} utils.ErrorResponse
// @Router /contract-amendments/{id} [delete]
func (h *ContractAmendmentHandler) DeleteContractAmendment(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Amendment ID is required", nil)
		return
	}

	// Get user ID from context
	userID, exists := middleware.GetUserID(c)
	if !exists {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	if err := h.amendmentService.DeleteContractAmendment(id, userID); err != nil {
		h.logger.Error("Failed to delete contract amendment",
			zap.Error(err),
			zap.String("amendment_id", id),
		)
		if err.Error() == "contract amendment not found" {
			utils.HandleError(c, http.StatusNotFound, "Failed to delete contract amendment", err)
		} else if err.Error() == "permission denied: you do not have permission to manage business information" {
			utils.HandleError(c, http.StatusForbidden, "Failed to delete contract amendment", err)
		} else {
			utils.HandleError(c, http.StatusBadRequest, "Failed to delete contract amendment", err)
		}
		return
	}

	h.logger.Info("Contract amendment deleted successfully",
		zap.String("amendment_id", id),
	)

	c.Status(http.StatusNoContent)
}

// UploadContractAmendmentFile handles contract amendment file upload
// @Summary Upload a contract amendment file
// @Description Upload a file for a contract amendment
// @Tags 合同管理
// @Security BearerAuth
// @Accept multipart/form-data
// @Produce json
// @Param id path string true "Amendment ID (UUID)"
// @Param file formData file true "File to upload"
// @Param description formData string false "File description"
// @Success 201 {object} models.File
// @Failure 400 {object} utils.ErrorResponse
// @Failure 404 {object} utils.ErrorResponse
// @Router /contract-amendments/{id}/files [post]
func (h *ContractAmendmentHandler) UploadContractAmendmentFile(c *gin.Context) {
	amendmentID := c.Param("id")
	if amendmentID == "" {
		utils.HandleError(c, http.StatusBadRequest, "Amendment ID is required", nil)
		return
	}

	// Get user ID from context
	userID, exists := middleware.GetUserID(c)
	if !exists {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	// Get amendment to get contract and project ID and check permission
	amendment, err := h.amendmentService.GetContractAmendment(amendmentID)
	if err != nil {
		h.logger.Error("Failed to get amendment", zap.Error(err), zap.String("amendment_id", amendmentID))
		utils.HandleError(c, http.StatusNotFound, "Contract amendment not found", err)
		return
	}

	// Get contract to get project ID
	contractService := services.NewContractService()
	contract, err := contractService.GetContract(amendment.ContractID)
	if err != nil {
		h.logger.Error("Failed to get contract", zap.Error(err), zap.String("contract_id", amendment.ContractID))
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
		Category:    models.FileCategoryContractAmendment,
		Description: description,
		FileName:    fileHeader.Filename,
		FileSize:    fileHeader.Size,
		FileType:    fileExt,
		MimeType:    fileHeader.Header.Get("Content-Type"),
		Reader:      file,
	}

	// Upload file
	ctx := context.Background()
	uploadedFile, err := h.fileService.UploadFile(ctx, uploadReq, userID, h.permissionService)
	if err != nil {
		h.logger.Error("Failed to upload contract amendment file",
			zap.Error(err),
			zap.String("amendment_id", amendmentID),
		)
		utils.HandleError(c, http.StatusInternalServerError, "Failed to upload file", err)
		return
	}

	// Update amendment with file ID
	updateReq := &services.UpdateContractAmendmentRequest{
		AmendmentFileID: &uploadedFile.ID,
	}
	_, err = h.amendmentService.UpdateContractAmendment(amendmentID, userID, updateReq)
	if err != nil {
		h.logger.Error("Failed to associate file with amendment",
			zap.Error(err),
			zap.String("amendment_id", amendmentID),
			zap.String("file_id", uploadedFile.ID),
		)
		// Don't fail the request, file is already uploaded
		// Just log the error
	}

	h.logger.Info("Contract amendment file uploaded successfully",
		zap.String("file_id", uploadedFile.ID),
		zap.String("amendment_id", amendmentID),
	)

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    uploadedFile,
	})
}
