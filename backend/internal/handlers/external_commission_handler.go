package handlers

import (
	"context"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"project-oa-backend/internal/config"
	"project-oa-backend/internal/middleware"
	"project-oa-backend/internal/models"
	"project-oa-backend/internal/services"
	"project-oa-backend/pkg/utils"
)

type ExternalCommissionHandler struct {
	service    *services.ExternalCommissionService
	fileService *services.FileService
	logger     *zap.Logger
}

func NewExternalCommissionHandler(cfg *config.Config, logger *zap.Logger) *ExternalCommissionHandler {
	return &ExternalCommissionHandler{
		service:     services.NewExternalCommissionService(),
		fileService: services.NewFileService(cfg),
		logger:      logger,
	}
}

func (h *ExternalCommissionHandler) ListCommissions(c *gin.Context) {
	projectID := c.Param("id")
	if projectID == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	params := &services.ListExternalCommissionParams{
		Page: parseQueryInt(c, "page", 1),
		Size: parseQueryInt(c, "size", 20),
	}
	if vendorType := c.Query("vendorType"); vendorType != "" {
		params.VendorType = models.ExternalVendorType(vendorType)
	}

	items, total, err := h.service.ListByProject(projectID, params)
	if err != nil {
		utils.HandleError(c, http.StatusInternalServerError, "获取外委记录失败", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    items,
		"total":   total,
		"page":    params.Page,
		"size":    params.Size,
	})
}

func (h *ExternalCommissionHandler) CreateCommission(c *gin.Context) {
	projectID := c.Param("id")
	if projectID == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	var payload struct {
		VendorName     string   `json:"vendor_name" binding:"required"`
		VendorType     string   `json:"vendor_type" binding:"required"`
		Score          *float64 `json:"score"`            // 类型从 *int 改为 *float64
		ContractFileID *string  `json:"contract_file_id"` // UUID string
		// 注意：InvoiceFileID, PaymentAmount, PaymentDate 字段已移除，这些信息通过FinancialRecord管理
		Notes string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	// Convert Score from *float64 to *int for service (service expects *int but model uses *float64)
	// Actually, service now expects *float64, so we can pass directly
	var score *float64
	if payload.Score != nil {
		score = payload.Score
	}

	result, err := h.service.CreateCommission(&services.CreateExternalCommissionRequest{
		ProjectID:      projectID,
		VendorName:     payload.VendorName,
		VendorType:     models.ExternalVendorType(payload.VendorType),
		Score:          score,
		ContractFileID: payload.ContractFileID,
		// 注意：InvoiceFileID, PaymentAmount, PaymentDate 字段已移除，这些信息通过FinancialRecord管理
		Notes:       payload.Notes,
		CreatedByID: userID,
	})
	if err != nil {
		utils.HandleError(c, http.StatusBadRequest, "创建外委记录失败", err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    result,
	})
}

// GetCommission 获取单个对外委托记录
func (h *ExternalCommissionHandler) GetCommission(c *gin.Context) {
	id := c.Param("commissionId")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Commission ID is required", nil)
		return
	}

	commission, err := h.service.GetByID(id)
	if err != nil {
		utils.HandleError(c, http.StatusNotFound, "获取外委记录失败", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    commission,
	})
}

// UpdateCommission 更新对外委托记录
func (h *ExternalCommissionHandler) UpdateCommission(c *gin.Context) {
	id := c.Param("commissionId")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Commission ID is required", nil)
		return
	}

	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	var payload struct {
		VendorName     string   `json:"vendor_name"`
		VendorType     string   `json:"vendor_type"`
		Score          *float64 `json:"score"`
		ContractFileID *string  `json:"contract_file_id"`
		Notes          string   `json:"notes"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	req := &services.UpdateExternalCommissionRequest{
		UpdatedByID: userID,
	}
	if payload.VendorName != "" {
		req.VendorName = payload.VendorName
	}
	if payload.VendorType != "" {
		req.VendorType = models.ExternalVendorType(payload.VendorType)
	}
	req.Score = payload.Score
	req.ContractFileID = payload.ContractFileID
	req.Notes = payload.Notes

	result, err := h.service.UpdateCommission(id, req)
	if err != nil {
		utils.HandleError(c, http.StatusBadRequest, "更新外委记录失败", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// DeleteCommission 删除对外委托记录
func (h *ExternalCommissionHandler) DeleteCommission(c *gin.Context) {
	id := c.Param("commissionId")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Commission ID is required", nil)
		return
	}

	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	if err := h.service.DeleteCommission(id, userID); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "删除外委记录失败", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "删除成功",
	})
}

// GetSummary 获取对外委托汇总统计
func (h *ExternalCommissionHandler) GetSummary(c *gin.Context) {
	projectID := c.Param("id")
	if projectID == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	summary, err := h.service.GetSummary(projectID)
	if err != nil {
		utils.HandleError(c, http.StatusInternalServerError, "获取汇总统计失败", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    summary,
	})
}

// DownloadContractFile 下载委托合同文件
func (h *ExternalCommissionHandler) DownloadContractFile(c *gin.Context) {
	commissionID := c.Param("commissionId")
	if commissionID == "" {
		utils.HandleError(c, http.StatusBadRequest, "Commission ID is required", nil)
		return
	}

	commission, err := h.service.GetByID(commissionID)
	if err != nil {
		utils.HandleError(c, http.StatusNotFound, "获取外委记录失败", err)
		return
	}

	if commission.ContractFileID == nil {
		utils.HandleError(c, http.StatusNotFound, "委托合同文件不存在", nil)
		return
	}

	userID, exists := middleware.GetUserID(c)
	if !exists {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	// 检查文件权限
	hasPermission, err := h.fileService.CheckFilePermission(*commission.ContractFileID, userID)
	if err != nil {
		utils.HandleError(c, http.StatusNotFound, "文件不存在", err)
		return
	}
	if !hasPermission {
		utils.HandleError(c, http.StatusForbidden, "权限不足", nil)
		return
	}

	// 获取文件内容
	ctx := context.Background()
	fileContent, file, err := h.fileService.GetFileContent(ctx, *commission.ContractFileID)
	if err != nil {
		utils.HandleError(c, http.StatusNotFound, "文件不存在", err)
		return
	}
	defer fileContent.Close()

	// 设置响应头
	c.Header("Content-Disposition", "attachment; filename="+file.OriginalName)
	c.Header("Content-Type", file.MimeType)
	c.Header("Content-Length", strconv.FormatInt(file.FileSize, 10))

	// 流式传输文件
	c.DataFromReader(http.StatusOK, file.FileSize, file.MimeType, fileContent, nil)
}

// DeleteContractFile 删除委托合同文件
func (h *ExternalCommissionHandler) DeleteContractFile(c *gin.Context) {
	commissionID := c.Param("commissionId")
	if commissionID == "" {
		utils.HandleError(c, http.StatusBadRequest, "Commission ID is required", nil)
		return
	}

	userID, exists := middleware.GetUserID(c)
	if !exists {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	commission, err := h.service.GetByID(commissionID)
	if err != nil {
		utils.HandleError(c, http.StatusNotFound, "获取外委记录失败", err)
		return
	}

	if commission.ContractFileID == nil {
		utils.HandleError(c, http.StatusBadRequest, "委托合同文件不存在", nil)
		return
	}

	// 权限检查
	canManage, err := h.service.GetPermissionService().CanManageProductionInfo(userID, commission.ProjectID)
	if err != nil {
		utils.HandleError(c, http.StatusInternalServerError, "权限检查失败", err)
		return
	}
	if !canManage {
		utils.HandleError(c, http.StatusForbidden, "权限不足", nil)
		return
	}

	// 删除文件
	ctx := context.Background()
	if err := h.fileService.DeleteFile(ctx, *commission.ContractFileID); err != nil {
		utils.HandleError(c, http.StatusInternalServerError, "删除文件失败", err)
		return
	}

	// 更新委托记录，清空文件ID
	req := &services.UpdateExternalCommissionRequest{
		UpdatedByID:    userID,
		ContractFileID: nil, // 清空文件ID
	}
	_, err = h.service.UpdateCommission(commissionID, req)
	if err != nil {
		utils.HandleError(c, http.StatusInternalServerError, "更新委托记录失败", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "删除成功",
	})
}
