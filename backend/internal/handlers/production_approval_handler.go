package handlers

import (
	"context"
	"fmt"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"project-oa-backend/internal/config"
	"project-oa-backend/internal/middleware"
	"project-oa-backend/internal/models"
	"project-oa-backend/internal/services"
	"project-oa-backend/pkg/utils"
)

type ProductionApprovalHandler struct {
	service          *services.ProductionApprovalService
	fileService      *services.FileService
	permissionService *services.PermissionService
	logger           *zap.Logger
}

func NewProductionApprovalHandler(cfg *config.Config, logger *zap.Logger) *ProductionApprovalHandler {
	return &ProductionApprovalHandler{
		service:          services.NewProductionApprovalService(),
		fileService:      services.NewFileService(cfg),
		permissionService: services.NewPermissionService(),
		logger:           logger,
	}
}

// GetApprovalAndAudit 获取项目的批复和审计信息（分别返回）
// @Summary Get approval and audit information for a project
// @Description Get approval and audit information separately for a project
// @Tags 批复审计管理
// @Security BearerAuth
// @Produce json
// @Param id path string true "Project ID (UUID)"
// @Success 200 {object} map[string]interface{} "包含approval和audit两个字段"
// @Failure 404 {object} utils.ErrorResponse
// @Router /projects/{id}/approval-audit [get]
func (h *ProductionApprovalHandler) GetApprovalAndAudit(c *gin.Context) {
	projectID := c.Param("id")
	if projectID == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	approval, audit, err := h.service.GetApprovalAndAuditByProject(projectID)
	if err != nil {
		h.logger.Error("Failed to get approval and audit",
			zap.Error(err),
			zap.String("project_id", projectID),
		)
		// 检查是否是表不存在的错误
		errMsg := err.Error()
		if strings.Contains(errMsg, "does not exist") || strings.Contains(errMsg, "relation") || strings.Contains(errMsg, "table") {
			utils.HandleError(c, http.StatusInternalServerError, "数据库表不存在，请运行数据库迁移", err)
		} else {
			utils.HandleError(c, http.StatusInternalServerError, "获取批复审计信息失败", err)
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"approval": approval,
			"audit":    audit,
		},
	})
}

// CreateProductionApproval 创建批复审计信息
// @Summary Create production approval/audit information
// @Description Create a new production approval or audit record
// @Tags 批复审计管理
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param id path string true "Project ID (UUID)"
// @Param request body services.CreateProductionApprovalRequest true "Create approval request"
// @Success 201 {object} models.ProductionApproval
// @Failure 400 {object} utils.ErrorResponse
// @Router /projects/{id}/approval-audit [post]
func (h *ProductionApprovalHandler) CreateProductionApproval(c *gin.Context) {
	projectID := c.Param("id")
	if projectID == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	var req services.CreateProductionApprovalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Failed to bind request body",
			zap.Error(err),
			zap.String("project_id", projectID),
		)
		utils.HandleError(c, http.StatusBadRequest, fmt.Sprintf("Invalid request body: %v", err), err)
		return
	}

	// 从路径参数设置项目ID
	req.ProjectID = projectID
	
	// 验证必填字段
	if req.ApprovalType == "" {
		utils.HandleError(c, http.StatusBadRequest, "approval_type is required", nil)
		return
	}

	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	// 处理签字时间
	if req.SignedAt != nil && *req.SignedAt != "" {
		if parsed, err := time.Parse(time.RFC3339, *req.SignedAt); err == nil {
			parsedStr := parsed.Format(time.RFC3339)
			req.SignedAt = &parsedStr
		}
	}

	approval, err := h.service.CreateProductionApproval(userID, &req)
	if err != nil {
		h.logger.Error("Failed to create production approval",
			zap.Error(err),
			zap.String("project_id", projectID),
			zap.String("user_id", userID),
		)
		utils.HandleError(c, http.StatusBadRequest, "创建批复审计信息失败", err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    approval,
	})
}

// GetProductionApproval 获取批复审计信息
// @Summary Get production approval/audit by ID
// @Description Get a specific production approval or audit record
// @Tags 批复审计管理
// @Security BearerAuth
// @Produce json
// @Param id path string true "Approval ID (UUID)"
// @Success 200 {object} models.ProductionApproval
// @Failure 404 {object} utils.ErrorResponse
// @Router /approval-audit/{id} [get]
func (h *ProductionApprovalHandler) GetProductionApproval(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Approval ID is required", nil)
		return
	}

	approval, err := h.service.GetProductionApproval(id)
	if err != nil {
		utils.HandleError(c, http.StatusNotFound, "批复审计信息不存在", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    approval,
	})
}

// UpdateProductionApproval 更新批复审计信息
// @Summary Update production approval/audit information
// @Description Update an existing production approval or audit record
// @Tags 批复审计管理
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param id path string true "Approval ID (UUID)"
// @Param request body services.UpdateProductionApprovalRequest true "Update approval request"
// @Success 200 {object} models.ProductionApproval
// @Failure 400 {object} utils.ErrorResponse
// @Router /approval-audit/{id} [put]
func (h *ProductionApprovalHandler) UpdateProductionApproval(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Approval ID is required", nil)
		return
	}

	var req services.UpdateProductionApprovalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	// 处理签字时间
	if req.SignedAt != nil && *req.SignedAt != "" {
		if parsed, err := time.Parse(time.RFC3339, *req.SignedAt); err == nil {
			parsedStr := parsed.Format(time.RFC3339)
			req.SignedAt = &parsedStr
		}
	}

	approval, err := h.service.UpdateProductionApproval(userID, id, &req)
	if err != nil {
		h.logger.Error("Failed to update production approval",
			zap.Error(err),
			zap.String("approval_id", id),
			zap.String("user_id", userID),
		)
		utils.HandleError(c, http.StatusBadRequest, "更新批复审计信息失败", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    approval,
	})
}

// DeleteProductionApproval 删除批复审计信息
// @Summary Delete production approval/audit information
// @Description Delete a production approval or audit record
// @Tags 批复审计管理
// @Security BearerAuth
// @Produce json
// @Param id path string true "Approval ID (UUID)"
// @Success 200 {object} map[string]interface{}
// @Failure 404 {object} utils.ErrorResponse
// @Router /approval-audit/{id} [delete]
func (h *ProductionApprovalHandler) DeleteProductionApproval(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Approval ID is required", nil)
		return
	}

	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	if err := h.service.DeleteProductionApproval(userID, id); err != nil {
		h.logger.Error("Failed to delete production approval",
			zap.Error(err),
			zap.String("approval_id", id),
			zap.String("user_id", userID),
		)
		utils.HandleError(c, http.StatusBadRequest, "删除批复审计信息失败", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "删除成功",
	})
}

// UploadReportFile 上传批复审计报告文件（在保存时触发上传）
// @Summary Upload approval/audit report file
// @Description Upload a report file for approval or audit
// @Tags 批复审计管理
// @Security BearerAuth
// @Accept multipart/form-data
// @Produce json
// @Param id path string true "Project ID (UUID)"
// @Param file formData file true "Report file"
// @Param approval_type formData string true "Approval type (approval/audit)"
// @Success 201 {object} models.File
// @Failure 400 {object} utils.ErrorResponse
// @Router /projects/{id}/approval-audit/upload-report [post]
func (h *ProductionApprovalHandler) UploadReportFile(c *gin.Context) {
	projectID := c.Param("id")
	if projectID == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	// 获取文件
	file, err := c.FormFile("file")
	if err != nil {
		utils.HandleError(c, http.StatusBadRequest, "文件上传失败", err)
		return
	}

	approvalType := c.PostForm("approval_type")
	if approvalType == "" {
		utils.HandleError(c, http.StatusBadRequest, "approval_type is required", nil)
		return
	}

	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	// 打开文件
	src, err := file.Open()
	if err != nil {
		utils.HandleError(c, http.StatusBadRequest, "无法打开文件", err)
		return
	}
	defer src.Close()

	// 确定文件类别（批复审计报告使用审计报告类别）
	category := models.FileCategoryAuditReport

	// 上传文件
	ctx := context.Background()
	uploadReq := &services.UploadFileRequest{
		ProjectID:   projectID,
		Category:    category,
		FileName:    file.Filename,
		FileSize:    file.Size,
		FileType:    filepath.Ext(file.Filename),
		MimeType:    file.Header.Get("Content-Type"),
		Description: "批复审计报告",
		Reader:      src,
	}

	uploadedFile, err := h.fileService.UploadFile(ctx, uploadReq, userID, h.permissionService)
	if err != nil {
		h.logger.Error("Failed to upload report file",
			zap.Error(err),
			zap.String("project_id", projectID),
		)
		utils.HandleError(c, http.StatusInternalServerError, "文件上传失败", err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    uploadedFile,
	})
}

// DownloadReportFile 下载批复审计报告文件
// @Summary Download approval/audit report file
// @Description Download a report file by file ID
// @Tags 批复审计管理
// @Security BearerAuth
// @Produce application/octet-stream
// @Param fileId path string true "File ID (UUID)"
// @Success 200 "File content"
// @Failure 404 {object} utils.ErrorResponse
// @Router /approval-audit/files/{fileId}/download [get]
func (h *ProductionApprovalHandler) DownloadReportFile(c *gin.Context) {
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

	ctx := context.Background()
	reader, file, err := h.fileService.GetFileContent(ctx, fileID, userID, h.permissionService)
	if err != nil {
		// If permission denied, return file info but not content (EC-015)
		if err.Error() == "您没有权限下载此文件" {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"error":   "您没有权限下载此文件",
				"file":    file, // Return file info
			})
			return
		}
		utils.HandleError(c, http.StatusNotFound, "文件不存在", err)
		return
	}
	defer reader.Close()

	c.Header("Content-Disposition", "attachment; filename="+file.OriginalName)
	c.Header("Content-Type", file.MimeType)
	c.Header("Content-Length", strconv.FormatInt(file.FileSize, 10))
	c.DataFromReader(http.StatusOK, file.FileSize, file.MimeType, reader, nil)
}

// DeleteReportFile 删除批复审计报告文件
// @Summary Delete approval/audit report file
// @Description Delete a report file by file ID
// @Tags 批复审计管理
// @Security BearerAuth
// @Produce json
// @Param fileId path string true "File ID (UUID)"
// @Success 200 {object} map[string]interface{}
// @Failure 404 {object} utils.ErrorResponse
// @Router /approval-audit/files/{fileId} [delete]
func (h *ProductionApprovalHandler) DeleteReportFile(c *gin.Context) {
	fileID := c.Param("fileId")
	if fileID == "" {
		utils.HandleError(c, http.StatusBadRequest, "File ID is required", nil)
		return
	}

	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	// 先更新 ProductionApproval 记录，将 ReportFileID 设置为 null（避免外键约束冲突）
	var approval models.ProductionApproval
	if err := h.service.GetDB().Where("report_file_id = ?", fileID).First(&approval).Error; err == nil {
		// 检查权限：用户是否有权限管理该项目的生产信息
		canManage, err := h.service.GetPermissionService().CanManageProductionInfo(userID, approval.ProjectID)
		if err != nil {
			h.logger.Error("Failed to check permission",
				zap.Error(err),
				zap.String("user_id", userID),
				zap.String("project_id", approval.ProjectID),
			)
			utils.HandleError(c, http.StatusInternalServerError, "权限检查失败", err)
			return
		}
		if !canManage {
			utils.HandleError(c, http.StatusForbidden, "您没有权限删除该文件", nil)
			return
		}

		// 更新 ProductionApproval 记录，将 ReportFileID 设置为 null
		if err := h.service.GetDB().Model(&approval).Update("report_file_id", nil).Error; err != nil {
			h.logger.Error("Failed to update production approval",
				zap.Error(err),
				zap.String("approval_id", approval.ID),
			)
			utils.HandleError(c, http.StatusInternalServerError, "更新批复审计记录失败", err)
			return
		}
	}

	// 删除文件
	ctx := context.Background()
	if err := h.fileService.DeleteFile(ctx, fileID); err != nil {
		h.logger.Error("Failed to delete report file",
			zap.Error(err),
			zap.String("file_id", fileID),
		)
		utils.HandleError(c, http.StatusBadRequest, "删除文件失败", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "删除成功",
	})
}

// GetContractAmounts 获取项目的合同金额（用于引用）
// @Summary Get contract amounts for reference
// @Description Get contract amounts (design fee, survey fee, consultation fee) for a project
// @Tags 批复审计管理
// @Security BearerAuth
// @Produce json
// @Param id path string true "Project ID (UUID)"
// @Success 200 {object} map[string]interface{} "包含design_fee, survey_fee, consultation_fee"
// @Failure 404 {object} utils.ErrorResponse
// @Router /projects/{id}/contract-amounts [get]
func (h *ProductionApprovalHandler) GetContractAmounts(c *gin.Context) {
	projectID := c.Param("id")
	if projectID == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	designFee, surveyFee, consultationFee, err := h.service.GetContractAmounts(projectID)
	if err != nil {
		h.logger.Error("Failed to get contract amounts",
			zap.Error(err),
			zap.String("project_id", projectID),
		)
		utils.HandleError(c, http.StatusInternalServerError, "获取合同金额失败", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"design_fee":      designFee,
			"survey_fee":      surveyFee,
			"consultation_fee": consultationFee,
			"total":           designFee + surveyFee + consultationFee,
		},
	})
}

