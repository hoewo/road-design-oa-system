package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
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
// @Param id path string true "Project ID (UUID)"
// @Success 200 {object} services.ProjectFinancial
// @Failure 404 {object} utils.ErrorResponse
// @Router /projects/{id}/financial [get]
func (h *FinancialHandler) GetProjectFinancial(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	financial, err := h.financialService.GetProjectFinancial(id)
	if err != nil {
		h.logger.Error("Failed to get project financial information",
			zap.Error(err),
			zap.String("project_id", id),
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

// CreateFinancialRecordRequestRaw represents the raw request with string dates
// 支持统一财务记录模型
type CreateFinancialRecordRequestRaw struct {
	FinancialType string  `json:"financial_type" binding:"required"` // 财务类型
	Direction     string  `json:"direction" binding:"required"`      // 方向：income/expense
	Amount        float64 `json:"amount" binding:"required"`         // 金额
	OccurredAt    string  `json:"occurred_at" binding:"required"`    // 发生时间 (ISO 8601)

	// 类型特定字段
	BonusCategory       *string  `json:"bonus_category"`        // 奖金类别
	RecipientID         *string  `json:"recipient_id"`          // 发放人员ID
	CostCategory        *string  `json:"cost_category"`         // 成本类别
	Mileage             *float64 `json:"mileage"`               // 里程
	ClientID            *string  `json:"client_id"`             // 甲方ID
	RelatedPaymentID    *string  `json:"related_payment_id"`    // 关联支付ID
	PaymentMethod       *string  `json:"payment_method"`        // 支付方式
	ExpertName          string   `json:"expert_name"`           // 专家姓名
	CommissionType      *string  `json:"commission_type"`       // 委托类型
	VendorName          string   `json:"vendor_name"`           // 委托方名称
	VendorScore         *float64 `json:"vendor_score"`          // 委托方评分
	RelatedCommissionID *string  `json:"related_commission_id"` // 关联委托ID
	InvoiceFileID       *string  `json:"invoice_file_id"`       // 发票文件ID

	Description string `json:"description"` // 描述
}

// CreateFinancialRecord handles financial record creation
// @Summary Create a new financial record
// @Description Create a new financial record for a project
// @Tags 财务管理
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param id path string true "Project ID (UUID)"
// @Param request body CreateFinancialRecordRequestRaw true "Financial record information"
// @Success 201 {object} models.FinancialRecord
// @Failure 400 {object} utils.ErrorResponse
// @Failure 404 {object} utils.ErrorResponse
// @Router /projects/{id}/financial [post]
func (h *FinancialHandler) CreateFinancialRecord(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	var rawReq CreateFinancialRecordRequestRaw
	if err := c.ShouldBindJSON(&rawReq); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// Parse occurred_at string to time.Time
	occurredAt, err := time.Parse(time.RFC3339, rawReq.OccurredAt)
	if err != nil {
		// Try alternative format
		occurredAt, err = time.Parse("2006-01-02T15:04:05Z07:00", rawReq.OccurredAt)
		if err != nil {
			occurredAt, err = time.Parse("2006-01-02", rawReq.OccurredAt)
			if err != nil {
				utils.HandleError(c, http.StatusBadRequest, "Invalid occurred_at format, expected ISO 8601 (YYYY-MM-DDTHH:MM:SSZ)", err)
				return
			}
		}
	}

	// Convert string enums to typed enums
	financialType := models.FinancialType(rawReq.FinancialType)
	direction := models.FinancialDirection(rawReq.Direction)

	// Convert type-specific fields
	var bonusCategory *models.BonusCategory
	if rawReq.BonusCategory != nil {
		bc := models.BonusCategory(*rawReq.BonusCategory)
		bonusCategory = &bc
	}

	var costCategory *models.CostCategory
	if rawReq.CostCategory != nil {
		cc := models.CostCategory(*rawReq.CostCategory)
		costCategory = &cc
	}

	// Convert to service request
	req := services.CreateFinancialRecordRequest{
		FinancialType:       financialType,
		Direction:           direction,
		Amount:              rawReq.Amount,
		OccurredAt:          occurredAt,
		BonusCategory:       bonusCategory,
		RecipientID:         rawReq.RecipientID,
		CostCategory:        costCategory,
		Mileage:             rawReq.Mileage,
		ClientID:            rawReq.ClientID,
		RelatedPaymentID:    rawReq.RelatedPaymentID,
		PaymentMethod:       rawReq.PaymentMethod,
		ExpertName:          rawReq.ExpertName,
		CommissionType:      rawReq.CommissionType,
		VendorName:          rawReq.VendorName,
		VendorScore:         rawReq.VendorScore,
		RelatedCommissionID: rawReq.RelatedCommissionID,
		InvoiceFileID:       rawReq.InvoiceFileID,
		Description:         rawReq.Description,
	}

	// Get current user from context (set by auth middleware)
	userID, exists := middleware.GetUserID(c)
	if !exists {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	record, err := h.financialService.CreateFinancialRecord(id, userID, &req)
	if err != nil {
		h.logger.Error("Failed to create financial record",
			zap.Error(err),
			zap.String("project_id", id),
		)
		if err.Error() == "project not found" {
			utils.HandleError(c, http.StatusNotFound, "Failed to create financial record", err)
		} else {
			utils.HandleError(c, http.StatusBadRequest, "Failed to create financial record", err)
		}
		return
	}

	h.logger.Info("Financial record created successfully",
		zap.String("record_id", record.ID),
		zap.String("project_id", id),
	)

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    record,
	})
}

// UpdateFinancialRecordRequestRaw represents the raw request with string dates
// 根据新的统一财务记录模型设计
type UpdateFinancialRecordRequestRaw struct {
	FinancialType *string  `json:"financial_type"` // 财务类型
	Direction     *string  `json:"direction"`      // 方向：income/expense
	Amount        *float64 `json:"amount"`         // 金额
	OccurredAt    *string  `json:"occurred_at"`    // 发生时间（YYYY-MM-DD格式）

	// 类型特定字段（根据FinancialType使用不同字段）
	// 奖金类型
	BonusCategory *string `json:"bonus_category"` // 奖金类别
	RecipientID   *string `json:"recipient_id"`   // 发放人员ID

	// 成本类型
	CostCategory *string  `json:"cost_category"` // 成本类别
	Mileage      *float64 `json:"mileage"`       // 里程

	// 甲方支付/我方开票类型
	ClientID         *string `json:"client_id"`          // 甲方ID
	RelatedPaymentID *string `json:"related_payment_id"` // 关联的甲方支付记录ID

	// 专家费类型
	PaymentMethod *string `json:"payment_method"` // 支付方式
	ExpertName    *string `json:"expert_name"`    // 专家姓名

	// 委托支付/对方开票类型
	CommissionType      *string  `json:"commission_type"`       // 委托类型
	VendorName          *string  `json:"vendor_name"`           // 委托方名称
	VendorScore         *float64 `json:"vendor_score"`          // 委托方评分
	RelatedCommissionID *string  `json:"related_commission_id"` // 关联的委托支付记录ID

	// 文件关联
	InvoiceFileID *string `json:"invoice_file_id"` // 发票文件ID

	Description *string `json:"description"` // 描述
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
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Financial record ID is required", nil)
		return
	}

	var rawReq UpdateFinancialRecordRequestRaw
	if err := c.ShouldBindJSON(&rawReq); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// Parse date strings to time.Time
	var occurredAt *time.Time
	if rawReq.OccurredAt != nil && *rawReq.OccurredAt != "" {
		parsed, err := time.Parse("2006-01-02", *rawReq.OccurredAt)
		if err != nil {
			utils.HandleError(c, http.StatusBadRequest, "Invalid occurred_at format, expected YYYY-MM-DD", err)
			return
		}
		occurredAt = &parsed
	}

	// Convert to service request
	req := services.UpdateFinancialRecordRequest{}

	if rawReq.FinancialType != nil {
		financialType := models.FinancialType(*rawReq.FinancialType)
		req.FinancialType = &financialType
	}

	if rawReq.Direction != nil {
		direction := models.FinancialDirection(*rawReq.Direction)
		req.Direction = &direction
	}

	if rawReq.Amount != nil {
		req.Amount = rawReq.Amount
	}

	if occurredAt != nil {
		req.OccurredAt = occurredAt
	}

	// Type-specific fields
	if rawReq.BonusCategory != nil {
		bonusCategory := models.BonusCategory(*rawReq.BonusCategory)
		req.BonusCategory = &bonusCategory
	}

	if rawReq.RecipientID != nil {
		req.RecipientID = rawReq.RecipientID
	}

	if rawReq.CostCategory != nil {
		costCategory := models.CostCategory(*rawReq.CostCategory)
		req.CostCategory = &costCategory
	}

	if rawReq.Mileage != nil {
		req.Mileage = rawReq.Mileage
	}

	if rawReq.ClientID != nil {
		req.ClientID = rawReq.ClientID
	}

	if rawReq.RelatedPaymentID != nil {
		req.RelatedPaymentID = rawReq.RelatedPaymentID
	}

	if rawReq.PaymentMethod != nil {
		req.PaymentMethod = rawReq.PaymentMethod
	}

	if rawReq.ExpertName != nil {
		req.ExpertName = rawReq.ExpertName
	}

	if rawReq.CommissionType != nil {
		req.CommissionType = rawReq.CommissionType
	}

	if rawReq.VendorName != nil {
		req.VendorName = rawReq.VendorName
	}

	if rawReq.VendorScore != nil {
		req.VendorScore = rawReq.VendorScore
	}

	if rawReq.RelatedCommissionID != nil {
		req.RelatedCommissionID = rawReq.RelatedCommissionID
	}

	if rawReq.InvoiceFileID != nil {
		req.InvoiceFileID = rawReq.InvoiceFileID
	}

	if rawReq.Description != nil {
		req.Description = rawReq.Description
	}

	// Get user ID from context
	userID, exists := middleware.GetUserID(c)
	if !exists {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	record, err := h.financialService.UpdateFinancialRecord(id, userID, &req)
	if err != nil {
		h.logger.Error("Failed to update financial record",
			zap.Error(err),
			zap.String("record_id", id),
		)
		if err.Error() == "financial record not found" {
			utils.HandleError(c, http.StatusNotFound, "Financial record not found", err)
		} else if err.Error() == "permission denied: you do not have permission to manage business information" {
			utils.HandleError(c, http.StatusForbidden, "Failed to update financial record", err)
		} else {
			utils.HandleError(c, http.StatusBadRequest, "Failed to update financial record", err)
		}
		return
	}

	h.logger.Info("Financial record updated successfully",
		zap.String("record_id", record.ID),
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
// @Param id path string true "Financial Record ID (UUID)"
// @Success 200 {object} map[string]interface{}
// @Failure 404 {object} utils.ErrorResponse
// @Router /financial-records/{id} [delete]
func (h *FinancialHandler) DeleteFinancialRecord(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Financial record ID is required", nil)
		return
	}

	// Get user ID from context
	userID, exists := middleware.GetUserID(c)
	if !exists {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	if err := h.financialService.DeleteFinancialRecord(id, userID); err != nil {
		h.logger.Error("Failed to delete financial record",
			zap.Error(err),
			zap.String("record_id", id),
		)
		if err.Error() == "financial record not found" {
			utils.HandleError(c, http.StatusNotFound, "Financial record not found", err)
		} else if err.Error() == "permission denied: you do not have permission to manage business information" {
			utils.HandleError(c, http.StatusForbidden, "Failed to delete financial record", err)
		} else {
			utils.HandleError(c, http.StatusInternalServerError, "Failed to delete financial record", err)
		}
		return
	}

	h.logger.Info("Financial record deleted successfully",
		zap.String("record_id", id),
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
// @Failure 403 {object} utils.ErrorResponse
// @Router /company-revenue-statistics [get]
// T468: 添加权限检查
func (h *FinancialHandler) GetCompanyRevenueStatistics(c *gin.Context) {
	// Get user ID from context
	userID, exists := middleware.GetUserID(c)
	if !exists {
		utils.HandleError(c, http.StatusUnauthorized, "User ID not found in context", nil)
		return
	}

	stats, err := h.financialService.GetCompanyRevenueStatistics(userID)
	if err != nil {
		if err.Error() == "permission denied: you do not have permission to manage company revenue" {
			utils.HandleError(c, http.StatusForbidden, err.Error(), nil)
			return
		}
		h.logger.Error("Failed to get company revenue statistics", zap.Error(err))
		utils.HandleError(c, http.StatusInternalServerError, "Failed to get company revenue statistics", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

// GetProductionCosts handles retrieving production cost records for a project
// @Summary Get production cost records
// @Description Get all production cost records for a specific project
// @Tags 生产成本
// @Security BearerAuth
// @Produce json
// @Param id path string true "Project ID (UUID)"
// @Success 200 {object} map[string]interface{}
// @Failure 404 {object} utils.ErrorResponse
// @Router /projects/{id}/production-costs [get]
func (h *FinancialHandler) GetProductionCosts(c *gin.Context) {
	projectID := c.Param("id")
	if projectID == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	costs, err := h.financialService.GetProductionCosts(projectID)
	if err != nil {
		h.logger.Error("Failed to get production costs",
			zap.Error(err),
			zap.String("project_id", projectID),
		)
		if err.Error() == "project not found" {
			utils.HandleError(c, http.StatusNotFound, "Project not found", err)
		} else {
			utils.HandleError(c, http.StatusInternalServerError, "Failed to get production costs", err)
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    costs,
	})
}

// GetProductionCostStatistics handles retrieving production cost statistics for a project
// @Summary Get production cost statistics
// @Description Get production cost statistics (total cost and record count) for a specific project
// @Tags 生产成本
// @Security BearerAuth
// @Produce json
// @Param id path string true "Project ID (UUID)"
// @Success 200 {object} services.ProductionCostStatistics
// @Failure 404 {object} utils.ErrorResponse
// @Router /projects/{id}/production-costs/statistics [get]
func (h *FinancialHandler) GetProductionCostStatistics(c *gin.Context) {
	projectID := c.Param("id")
	if projectID == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	stats, err := h.financialService.GetProductionCostStatistics(projectID)
	if err != nil {
		h.logger.Error("Failed to get production cost statistics",
			zap.Error(err),
			zap.String("project_id", projectID),
		)
		utils.HandleError(c, http.StatusInternalServerError, "Failed to get production cost statistics", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

// GetProductionBonusStatistics handles retrieving production bonus statistics for a project
// @Summary Get production bonus statistics
// @Description Get production bonus statistics (total amount, record count, recipient count) for a specific project
// @Tags 生产奖金
// @Security BearerAuth
// @Produce json
// @Param id path string true "Project ID (UUID)"
// @Success 200 {object} services.ProductionBonusStatistics
// @Failure 404 {object} utils.ErrorResponse
// @Router /projects/{id}/production-bonus/statistics [get]
func (h *FinancialHandler) GetProductionBonusStatistics(c *gin.Context) {
	projectID := c.Param("id")
	if projectID == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	stats, err := h.financialService.GetProductionBonusStatistics(projectID)
	if err != nil {
		h.logger.Error("Failed to get production bonus statistics",
			zap.Error(err),
			zap.String("project_id", projectID),
		)
		utils.HandleError(c, http.StatusInternalServerError, "Failed to get production bonus statistics", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

// GetBusinessBonusStatistics handles retrieving business bonus statistics for a project
// @Summary Get business bonus statistics
// @Description Get business bonus statistics (total amount, record count, recipient count) for a specific project
// @Tags 经营奖金
// @Security BearerAuth
// @Produce json
// @Param id path string true "Project ID (UUID)"
// @Success 200 {object} services.BusinessBonusStatistics
// @Failure 404 {object} utils.ErrorResponse
// @Router /projects/{id}/business-bonus/statistics [get]
func (h *FinancialHandler) GetBusinessBonusStatistics(c *gin.Context) {
	projectID := c.Param("id")
	if projectID == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	stats, err := h.financialService.GetBusinessBonusStatistics(projectID)
	if err != nil {
		h.logger.Error("Failed to get business bonus statistics",
			zap.Error(err),
			zap.String("project_id", projectID),
		)
		utils.HandleError(c, http.StatusInternalServerError, "Failed to get business bonus statistics", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

// GetCompanyRevenueSummary handles retrieving company revenue summary (T260, T468)
// @Summary Get company revenue summary
// @Description Get company-level revenue summary including total receivable by fee type, total paid, and outstanding
// @Tags 公司收入管理
// @Security BearerAuth
// @Produce json
// @Param start_date query string false "Start date (ISO 8601)"
// @Param end_date query string false "End date (ISO 8601)"
// @Success 200 {object} services.CompanyRevenueSummary
// @Failure 403 {object} utils.ErrorResponse
// @Router /company-revenue/summary [get]
func (h *FinancialHandler) GetCompanyRevenueSummary(c *gin.Context) {
	// Get user ID from context
	userID, exists := middleware.GetUserID(c)
	if !exists {
		utils.HandleError(c, http.StatusUnauthorized, "User ID not found in context", nil)
		return
	}

	// Parse date filters (support both RFC3339 and YYYY-MM-DD formats)
	var startDate, endDate *time.Time
	if startDateStr := c.Query("start_date"); startDateStr != "" {
		// Try RFC3339 first, then YYYY-MM-DD
		if t, err := time.Parse(time.RFC3339, startDateStr); err == nil {
			startDate = &t
		} else if t, err := time.Parse("2006-01-02", startDateStr); err == nil {
			startDate = &t
		}
	}
	if endDateStr := c.Query("end_date"); endDateStr != "" {
		// Try RFC3339 first, then YYYY-MM-DD
		if t, err := time.Parse(time.RFC3339, endDateStr); err == nil {
			endDate = &t
		} else if t, err := time.Parse("2006-01-02", endDateStr); err == nil {
			endDate = &t
		}
	}

	summary, err := h.financialService.GetCompanyRevenueSummary(userID, startDate, endDate)
	if err != nil {
		if err.Error() == "permission denied: you do not have permission to manage company revenue" {
			utils.HandleError(c, http.StatusForbidden, err.Error(), nil)
			return
		}
		h.logger.Error("Failed to get company revenue summary", zap.Error(err))
		utils.HandleError(c, http.StatusInternalServerError, "Failed to get company revenue summary", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    summary,
	})
}

// GetInvoiceInfoList handles retrieving invoice information list with filtering and pagination (T509)
// @Summary Get invoice information list
// @Description Get all invoice information with filtering and pagination
// @Tags 公司收入管理
// @Security BearerAuth
// @Produce json
// @Param project_name query string false "Project name (fuzzy search)"
// @Param fee_type query string false "Fee type: design_fee, survey_fee, consultation_fee"
// @Param start_date query string false "Start date (ISO 8601)"
// @Param end_date query string false "End date (ISO 8601)"
// @Param page query int false "Page number" default(1)
// @Param page_size query int false "Page size" default(20)
// @Success 200 {object} map[string]interface{}
// @Failure 403 {object} utils.ErrorResponse
// @Router /company-revenue/invoices [get]
func (h *FinancialHandler) GetInvoiceInfoList(c *gin.Context) {
	// Get user ID from context
	userID, exists := middleware.GetUserID(c)
	if !exists {
		utils.HandleError(c, http.StatusUnauthorized, "User ID not found in context", nil)
		return
	}

	// Parse filters
	filters := &services.InvoiceFilterParams{
		ProjectName: c.Query("project_name"),
		FeeType:     c.Query("fee_type"),
	}

	if startDateStr := c.Query("start_date"); startDateStr != "" {
		if t, err := time.Parse("2006-01-02", startDateStr); err == nil {
			filters.StartDate = &t
		}
	}
	if endDateStr := c.Query("end_date"); endDateStr != "" {
		if t, err := time.Parse("2006-01-02", endDateStr); err == nil {
			filters.EndDate = &t
		}
	}

	// Parse pagination
	page := 1
	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}
	pageSize := 20
	if pageSizeStr := c.Query("page_size"); pageSizeStr != "" {
		if ps, err := strconv.Atoi(pageSizeStr); err == nil && ps > 0 && ps <= 100 {
			pageSize = ps
		}
	}

	invoices, total, err := h.financialService.GetInvoiceInfoList(userID, filters, page, pageSize)
	if err != nil {
		if err.Error() == "permission denied: you do not have permission to manage company revenue" {
			utils.HandleError(c, http.StatusForbidden, err.Error(), nil)
			return
		}
		h.logger.Error("Failed to get invoice information list", zap.Error(err))
		utils.HandleError(c, http.StatusInternalServerError, "Failed to get invoice information list", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"items":       invoices,
			"total":       total,
			"page":        page,
			"page_size":   pageSize,
			"total_pages": (total + int64(pageSize) - 1) / int64(pageSize),
		},
	})
}

// GetPaymentInfoList handles retrieving payment information list with filtering and pagination (T510)
// @Summary Get payment information list
// @Description Get all payment information with filtering and pagination
// @Tags 公司收入管理
// @Security BearerAuth
// @Produce json
// @Param project_name query string false "Project name (fuzzy search)"
// @Param fee_type query string false "Fee type: design_fee, survey_fee, consultation_fee"
// @Param start_date query string false "Start date (ISO 8601)"
// @Param end_date query string false "End date (ISO 8601)"
// @Param page query int false "Page number" default(1)
// @Param page_size query int false "Page size" default(20)
// @Success 200 {object} map[string]interface{}
// @Failure 403 {object} utils.ErrorResponse
// @Router /company-revenue/payments [get]
func (h *FinancialHandler) GetPaymentInfoList(c *gin.Context) {
	// Get user ID from context
	userID, exists := middleware.GetUserID(c)
	if !exists {
		utils.HandleError(c, http.StatusUnauthorized, "User ID not found in context", nil)
		return
	}

	// Parse filters
	filters := &services.PaymentFilterParams{
		ProjectName: c.Query("project_name"),
		FeeType:     c.Query("fee_type"),
	}

	if startDateStr := c.Query("start_date"); startDateStr != "" {
		if t, err := time.Parse("2006-01-02", startDateStr); err == nil {
			filters.StartDate = &t
		}
	}
	if endDateStr := c.Query("end_date"); endDateStr != "" {
		if t, err := time.Parse("2006-01-02", endDateStr); err == nil {
			filters.EndDate = &t
		}
	}

	// Parse pagination
	page := 1
	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}
	pageSize := 20
	if pageSizeStr := c.Query("page_size"); pageSizeStr != "" {
		if ps, err := strconv.Atoi(pageSizeStr); err == nil && ps > 0 && ps <= 100 {
			pageSize = ps
		}
	}

	payments, total, err := h.financialService.GetPaymentInfoList(userID, filters, page, pageSize)
	if err != nil {
		if err.Error() == "permission denied: you do not have permission to manage company revenue" {
			utils.HandleError(c, http.StatusForbidden, err.Error(), nil)
			return
		}
		h.logger.Error("Failed to get payment information list", zap.Error(err))
		utils.HandleError(c, http.StatusInternalServerError, "Failed to get payment information list", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"items":       payments,
			"total":       total,
			"page":        page,
			"page_size":   pageSize,
			"total_pages": (total + int64(pageSize) - 1) / int64(pageSize),
		},
	})
}

// ExportInvoiceInfo handles exporting invoice information (T511)
// @Summary Export invoice information
// @Description Export invoice information to Excel or CSV format
// @Tags 公司收入管理
// @Security BearerAuth
// @Produce application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv
// @Param project_name query string false "Project name (fuzzy search)"
// @Param fee_type query string false "Fee type: design_fee, survey_fee, consultation_fee"
// @Param start_date query string false "Start date (ISO 8601)"
// @Param end_date query string false "End date (ISO 8601)"
// @Param format query string false "Export format: excel, csv" default(csv)
// @Success 200 {file} file
// @Failure 403 {object} utils.ErrorResponse
// @Router /company-revenue/invoices/export [get]
func (h *FinancialHandler) ExportInvoiceInfo(c *gin.Context) {
	// Get user ID from context
	userID, exists := middleware.GetUserID(c)
	if !exists {
		utils.HandleError(c, http.StatusUnauthorized, "User ID not found in context", nil)
		return
	}

	// Parse filters
	filters := &services.InvoiceFilterParams{
		ProjectName: c.Query("project_name"),
		FeeType:     c.Query("fee_type"),
	}

	if startDateStr := c.Query("start_date"); startDateStr != "" {
		if t, err := time.Parse("2006-01-02", startDateStr); err == nil {
			filters.StartDate = &t
		}
	}
	if endDateStr := c.Query("end_date"); endDateStr != "" {
		if t, err := time.Parse("2006-01-02", endDateStr); err == nil {
			filters.EndDate = &t
		}
	}

	// Get format (excel or csv)
	format := c.DefaultQuery("format", "csv")
	if format != "excel" && format != "csv" {
		format = "csv"
	}

	// Get all invoices (no pagination for export)
	invoices, _, err := h.financialService.GetInvoiceInfoList(userID, filters, 1, 10000)
	if err != nil {
		if err.Error() == "permission denied: you do not have permission to manage company revenue" {
			utils.HandleError(c, http.StatusForbidden, err.Error(), nil)
			return
		}
		h.logger.Error("Failed to get invoice information for export", zap.Error(err))
		utils.HandleError(c, http.StatusInternalServerError, "Failed to export invoice information", err)
		return
	}

	// Generate CSV content
	csvContent := "项目名称,费用类型,开票时间,开票金额,发票文件\n"
	for _, invoice := range invoices {
		feeTypeLabel := ""
		switch invoice.FeeType {
		case "design_fee":
			feeTypeLabel = "设计费"
		case "survey_fee":
			feeTypeLabel = "勘察费"
		case "consultation_fee":
			feeTypeLabel = "咨询费"
		default:
			feeTypeLabel = invoice.FeeType
		}
		
		invoiceDate := invoice.InvoiceDate.Format("2006-01-02")
		fileName := ""
		if invoice.InvoiceFile != nil {
			fileName = invoice.InvoiceFile.OriginalName
		}
		
		// Escape CSV fields (handle commas and quotes)
		projectName := strings.ReplaceAll(invoice.ProjectName, "\"", "\"\"")
		amount := fmt.Sprintf("%.2f", invoice.Amount)
		
		csvContent += fmt.Sprintf("\"%s\",\"%s\",\"%s\",\"%s\",\"%s\"\n",
			projectName, feeTypeLabel, invoiceDate, amount, fileName)
	}

	// Set response headers
	filename := fmt.Sprintf("发票信息_%s.csv", time.Now().Format("20060102_150405"))
	if format == "excel" {
		// For Excel, we'll return CSV for now (can be enhanced with Excel library later)
		filename = fmt.Sprintf("发票信息_%s.xlsx", time.Now().Format("20060102_150405"))
		c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	} else {
		c.Header("Content-Type", "text/csv; charset=utf-8")
	}
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Header("Content-Transfer-Encoding", "binary")

	// Write CSV content with BOM for Excel compatibility
	csvBytes := []byte("\xEF\xBB\xBF" + csvContent) // UTF-8 BOM
	c.Data(http.StatusOK, c.GetHeader("Content-Type"), csvBytes)
}

// ExportPaymentInfo handles exporting payment information (T512)
// @Summary Export payment information
// @Description Export payment information to Excel or CSV format
// @Tags 公司收入管理
// @Security BearerAuth
// @Produce application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv
// @Param project_name query string false "Project name (fuzzy search)"
// @Param fee_type query string false "Fee type: design_fee, survey_fee, consultation_fee"
// @Param start_date query string false "Start date (ISO 8601)"
// @Param end_date query string false "End date (ISO 8601)"
// @Param format query string false "Export format: excel, csv" default(csv)
// @Success 200 {file} file
// @Failure 403 {object} utils.ErrorResponse
// @Router /company-revenue/payments/export [get]
func (h *FinancialHandler) ExportPaymentInfo(c *gin.Context) {
	// Get user ID from context
	userID, exists := middleware.GetUserID(c)
	if !exists {
		utils.HandleError(c, http.StatusUnauthorized, "User ID not found in context", nil)
		return
	}

	// Parse filters
	filters := &services.PaymentFilterParams{
		ProjectName: c.Query("project_name"),
		FeeType:     c.Query("fee_type"),
	}

	if startDateStr := c.Query("start_date"); startDateStr != "" {
		if t, err := time.Parse("2006-01-02", startDateStr); err == nil {
			filters.StartDate = &t
		}
	}
	if endDateStr := c.Query("end_date"); endDateStr != "" {
		if t, err := time.Parse("2006-01-02", endDateStr); err == nil {
			filters.EndDate = &t
		}
	}

	// Get format (excel or csv)
	format := c.DefaultQuery("format", "csv")
	if format != "excel" && format != "csv" {
		format = "csv"
	}

	// Get all payments (no pagination for export)
	payments, _, err := h.financialService.GetPaymentInfoList(userID, filters, 1, 10000)
	if err != nil {
		if err.Error() == "permission denied: you do not have permission to manage company revenue" {
			utils.HandleError(c, http.StatusForbidden, err.Error(), nil)
			return
		}
		h.logger.Error("Failed to get payment information for export", zap.Error(err))
		utils.HandleError(c, http.StatusInternalServerError, "Failed to export payment information", err)
		return
	}

	// Generate CSV content
	csvContent := "项目名称,费用类型,支付时间,支付金额\n"
	for _, payment := range payments {
		feeTypeLabel := ""
		switch payment.FeeType {
		case "design_fee":
			feeTypeLabel = "设计费"
		case "survey_fee":
			feeTypeLabel = "勘察费"
		case "consultation_fee":
			feeTypeLabel = "咨询费"
		default:
			feeTypeLabel = payment.FeeType
		}
		
		paymentDate := payment.PaymentDate.Format("2006-01-02")
		
		// Escape CSV fields (handle commas and quotes)
		projectName := strings.ReplaceAll(payment.ProjectName, "\"", "\"\"")
		amount := fmt.Sprintf("%.2f", payment.Amount)
		
		csvContent += fmt.Sprintf("\"%s\",\"%s\",\"%s\",\"%s\"\n",
			projectName, feeTypeLabel, paymentDate, amount)
	}

	// Set response headers
	filename := fmt.Sprintf("支付信息_%s.csv", time.Now().Format("20060102_150405"))
	if format == "excel" {
		// For Excel, we'll return CSV for now (can be enhanced with Excel library later)
		filename = fmt.Sprintf("支付信息_%s.xlsx", time.Now().Format("20060102_150405"))
		c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	} else {
		c.Header("Content-Type", "text/csv; charset=utf-8")
	}
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Header("Content-Transfer-Encoding", "binary")

	// Write CSV content with BOM for Excel compatibility
	csvBytes := []byte("\xEF\xBB\xBF" + csvContent) // UTF-8 BOM
	c.Data(http.StatusOK, c.GetHeader("Content-Type"), csvBytes)
}
