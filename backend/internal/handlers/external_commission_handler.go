package handlers

import (
	"net/http"
	"time"

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
	projectID, err := utils.ParseUintParam(c.Param("id"))
	if err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid project ID", err)
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
	projectID, err := utils.ParseUintParam(c.Param("id"))
	if err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid project ID", err)
		return
	}

	var payload struct {
		VendorName     string  `json:"vendor_name" binding:"required"`
		VendorType     string  `json:"vendor_type" binding:"required"`
		Score          *int    `json:"score"`
		ContractFileID *uint   `json:"contract_file_id"`
		InvoiceFileID  *uint   `json:"invoice_file_id"`
		PaymentAmount  float64 `json:"payment_amount"`
		PaymentDate    *string `json:"payment_date"`
		Notes          string  `json:"notes"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	userID, ok := c.Get(string(middleware.UserIDKey))
	if !ok {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	var paymentDate *time.Time
	if payload.PaymentDate != nil && *payload.PaymentDate != "" {
		if parsed, err := time.Parse("2006-01-02", *payload.PaymentDate); err == nil {
			paymentDate = &parsed
		}
	}

	result, err := h.service.CreateCommission(&services.CreateExternalCommissionRequest{
		ProjectID:      projectID,
		VendorName:     payload.VendorName,
		VendorType:     models.ExternalVendorType(payload.VendorType),
		Score:          payload.Score,
		ContractFileID: payload.ContractFileID,
		InvoiceFileID:  payload.InvoiceFileID,
		PaymentAmount:  payload.PaymentAmount,
		PaymentDate:    paymentDate,
		Notes:          payload.Notes,
		CreatedByID:    userID.(uint),
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
