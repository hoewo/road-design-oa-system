package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"project-oa-backend/internal/middleware"
	"project-oa-backend/internal/models"
	"project-oa-backend/internal/services"
	"project-oa-backend/pkg/utils"
)

// FinancialHandler handles financial record-related HTTP requests
type FinancialHandler struct {
	financialService *services.FinancialService
	logger           *zap.Logger
}

// NewFinancialHandler creates a new financial handler
func NewFinancialHandler(logger *zap.Logger) *FinancialHandler {
	return &FinancialHandler{
		financialService: services.NewFinancialService(),
		logger:           logger,
	}
}

// GetProjectFinancial handles retrieving financial information for a project
// @Summary Get project financial information
// @Description Get aggregated financial information for a specific project
// @Tags 财务管理
// @Security BearerAuth
// @Produce json
// @Param id path int true "Project ID"
// @Success 200 {object} services.ProjectFinancial
// @Failure 404 {object} utils.ErrorResponse
// @Router /projects/{id}/financial [get]
func (h *FinancialHandler) GetProjectFinancial(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid project ID", err)
		return
	}

	financial, err := h.financialService.GetProjectFinancial(uint(id))
	if err != nil {
		h.logger.Error("Failed to get project financial information",
			zap.Error(err),
			zap.Uint("project_id", uint(id)),
		)
		if err.Error() == "project not found" {
			utils.HandleError(c, http.StatusNotFound, "Project not found", err)
		} else {
			utils.HandleError(c, http.StatusInternalServerError, "Failed to get project financial information", err)
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    financial,
	})
}

// CreateFinancialRecordRequest represents the raw request with string dates
type CreateFinancialRecordRequestRaw struct {
	RecordType       string  `json:"record_type" binding:"required"`
	FeeType          string  `json:"fee_type" binding:"required"`
	ReceivableAmount float64 `json:"receivable_amount" binding:"required"`
	InvoiceNumber    string  `json:"invoice_number"`
	InvoiceDate      *string `json:"invoice_date"`
	InvoiceAmount    float64 `json:"invoice_amount"`
	PaymentDate      *string `json:"payment_date"`
	PaymentAmount    float64 `json:"payment_amount"`
	Description      string  `json:"description"`
}

// CreateFinancialRecord handles financial record creation
// @Summary Create a new financial record
// @Description Create a new financial record for a project
// @Tags 财务管理
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param id path int true "Project ID"
// @Param request body CreateFinancialRecordRequestRaw true "Financial record information"
// @Success 201 {object} models.FinancialRecord
// @Failure 400 {object} utils.ErrorResponse
// @Failure 404 {object} utils.ErrorResponse
// @Router /projects/{id}/financial [post]
func (h *FinancialHandler) CreateFinancialRecord(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid project ID", err)
		return
	}

	var rawReq CreateFinancialRecordRequestRaw
	if err := c.ShouldBindJSON(&rawReq); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// Parse date strings to time.Time
	var invoiceDate *time.Time
	if rawReq.InvoiceDate != nil && *rawReq.InvoiceDate != "" {
		parsed, err := time.Parse("2006-01-02", *rawReq.InvoiceDate)
		if err != nil {
			utils.HandleError(c, http.StatusBadRequest, "Invalid invoice_date format, expected YYYY-MM-DD", err)
			return
		}
		invoiceDate = &parsed
	}

	var paymentDate *time.Time
	if rawReq.PaymentDate != nil && *rawReq.PaymentDate != "" {
		parsed, err := time.Parse("2006-01-02", *rawReq.PaymentDate)
		if err != nil {
			utils.HandleError(c, http.StatusBadRequest, "Invalid payment_date format, expected YYYY-MM-DD", err)
			return
		}
		paymentDate = &parsed
	}

	// Convert to service request
	req := services.CreateFinancialRecordRequest{
		RecordType:       models.FinancialType(rawReq.RecordType),
		FeeType:          models.FeeType(rawReq.FeeType),
		ReceivableAmount: rawReq.ReceivableAmount,
		InvoiceNumber:    rawReq.InvoiceNumber,
		InvoiceDate:      invoiceDate,
		InvoiceAmount:    rawReq.InvoiceAmount,
		PaymentDate:      paymentDate,
		PaymentAmount:    rawReq.PaymentAmount,
		Description:      rawReq.Description,
	}

	// Get current user from context (set by auth middleware)
	userID, exists := c.Get(string(middleware.UserIDKey))
	if !exists {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	createdByID := userID.(uint)

	record, err := h.financialService.CreateFinancialRecord(uint(id), createdByID, &req)
	if err != nil {
		h.logger.Error("Failed to create financial record",
			zap.Error(err),
			zap.Uint("project_id", uint(id)),
		)
		if err.Error() == "project not found" {
			utils.HandleError(c, http.StatusNotFound, "Failed to create financial record", err)
		} else {
			utils.HandleError(c, http.StatusBadRequest, "Failed to create financial record", err)
		}
		return
	}

	h.logger.Info("Financial record created successfully",
		zap.Uint("record_id", record.ID),
		zap.Uint("project_id", uint(id)),
	)

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    record,
	})
}

// UpdateFinancialRecordRequestRaw represents the raw request with string dates
type UpdateFinancialRecordRequestRaw struct {
	RecordType       *string  `json:"record_type"`
	FeeType          *string  `json:"fee_type"`
	ReceivableAmount *float64 `json:"receivable_amount"`
	InvoiceNumber    *string  `json:"invoice_number"`
	InvoiceDate      *string  `json:"invoice_date"`
	InvoiceAmount    *float64 `json:"invoice_amount"`
	PaymentDate      *string  `json:"payment_date"`
	PaymentAmount    *float64 `json:"payment_amount"`
	Description      *string  `json:"description"`
}

// UpdateFinancialRecord handles financial record update
// @Summary Update a financial record
// @Description Update a financial record (allows modification of business fields except system fields like created_at, id)
// @Tags 财务管理
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param id path int true "Financial Record ID"
// @Param request body UpdateFinancialRecordRequestRaw true "Financial record information to update"
// @Success 200 {object} models.FinancialRecord
// @Failure 400 {object} utils.ErrorResponse
// @Failure 404 {object} utils.ErrorResponse
// @Router /financial-records/{id} [put]
func (h *FinancialHandler) UpdateFinancialRecord(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid financial record ID", err)
		return
	}

	var rawReq UpdateFinancialRecordRequestRaw
	if err := c.ShouldBindJSON(&rawReq); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// Parse date strings to time.Time
	var invoiceDate *time.Time
	if rawReq.InvoiceDate != nil && *rawReq.InvoiceDate != "" {
		parsed, err := time.Parse("2006-01-02", *rawReq.InvoiceDate)
		if err != nil {
			utils.HandleError(c, http.StatusBadRequest, "Invalid invoice_date format, expected YYYY-MM-DD", err)
			return
		}
		invoiceDate = &parsed
	}

	var paymentDate *time.Time
	if rawReq.PaymentDate != nil && *rawReq.PaymentDate != "" {
		parsed, err := time.Parse("2006-01-02", *rawReq.PaymentDate)
		if err != nil {
			utils.HandleError(c, http.StatusBadRequest, "Invalid payment_date format, expected YYYY-MM-DD", err)
			return
		}
		paymentDate = &parsed
	}

	// Convert to service request
	req := services.UpdateFinancialRecordRequest{}

	if rawReq.RecordType != nil {
		recordType := models.FinancialType(*rawReq.RecordType)
		req.RecordType = &recordType
	}

	if rawReq.FeeType != nil {
		feeType := models.FeeType(*rawReq.FeeType)
		req.FeeType = &feeType
	}

	if rawReq.ReceivableAmount != nil {
		req.ReceivableAmount = rawReq.ReceivableAmount
	}

	if rawReq.InvoiceNumber != nil {
		req.InvoiceNumber = rawReq.InvoiceNumber
	}

	if invoiceDate != nil {
		req.InvoiceDate = invoiceDate
	}

	if rawReq.InvoiceAmount != nil {
		req.InvoiceAmount = rawReq.InvoiceAmount
	}

	if paymentDate != nil {
		req.PaymentDate = paymentDate
	}

	if rawReq.PaymentAmount != nil {
		req.PaymentAmount = rawReq.PaymentAmount
	}

	if rawReq.Description != nil {
		req.Description = rawReq.Description
	}

	record, err := h.financialService.UpdateFinancialRecord(uint(id), &req)
	if err != nil {
		h.logger.Error("Failed to update financial record",
			zap.Error(err),
			zap.Uint("record_id", uint(id)),
		)
		if err.Error() == "financial record not found" {
			utils.HandleError(c, http.StatusNotFound, "Financial record not found", err)
		} else {
			utils.HandleError(c, http.StatusBadRequest, "Failed to update financial record", err)
		}
		return
	}

	h.logger.Info("Financial record updated successfully",
		zap.Uint("record_id", record.ID),
	)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    record,
	})
}

// DeleteFinancialRecord handles financial record deletion
// @Summary Delete a financial record
// @Description Delete a financial record with automatic statistics recalculation
// @Tags 财务管理
// @Security BearerAuth
// @Produce json
// @Param id path int true "Financial Record ID"
// @Success 200 {object} map[string]interface{}
// @Failure 404 {object} utils.ErrorResponse
// @Router /financial-records/{id} [delete]
func (h *FinancialHandler) DeleteFinancialRecord(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid financial record ID", err)
		return
	}

	if err := h.financialService.DeleteFinancialRecord(uint(id)); err != nil {
		h.logger.Error("Failed to delete financial record",
			zap.Error(err),
			zap.Uint("record_id", uint(id)),
		)
		if err.Error() == "financial record not found" {
			utils.HandleError(c, http.StatusNotFound, "Financial record not found", err)
		} else {
			utils.HandleError(c, http.StatusInternalServerError, "Failed to delete financial record", err)
		}
		return
	}

	h.logger.Info("Financial record deleted successfully",
		zap.Uint("record_id", uint(id)),
	)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Financial record deleted successfully",
	})
}

// GetCompanyRevenueStatistics handles retrieving company-level revenue statistics
// @Summary Get company revenue statistics
// @Description Get aggregated company-level revenue statistics with management fee calculation
// @Tags 财务管理
// @Security BearerAuth
// @Produce json
// @Success 200 {object} services.CompanyRevenueStatistics
// @Router /company-revenue-statistics [get]
func (h *FinancialHandler) GetCompanyRevenueStatistics(c *gin.Context) {
	stats, err := h.financialService.GetCompanyRevenueStatistics()
	if err != nil {
		h.logger.Error("Failed to get company revenue statistics", zap.Error(err))
		utils.HandleError(c, http.StatusInternalServerError, "Failed to get company revenue statistics", err)
		return
	}

	c.JSON(http.StatusOK, stats)
}
