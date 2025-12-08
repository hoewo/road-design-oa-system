package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"project-oa-backend/internal/middleware"
	"project-oa-backend/internal/models"
	"project-oa-backend/internal/services"
	"project-oa-backend/pkg/utils"
)

type ExternalCommissionHandler struct {
	service *services.ExternalCommissionService
	logger  *zap.Logger
}

func NewExternalCommissionHandler(logger *zap.Logger) *ExternalCommissionHandler {
	return &ExternalCommissionHandler{
		service: services.NewExternalCommissionService(),
		logger:  logger,
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
