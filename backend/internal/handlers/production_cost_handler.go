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

type ProductionCostHandler struct {
	service *services.ProductionCostService
	logger  *zap.Logger
}

func NewProductionCostHandler(logger *zap.Logger) *ProductionCostHandler {
	return &ProductionCostHandler{
		service: services.NewProductionCostService(),
		logger:  logger,
	}
}

func (h *ProductionCostHandler) ListCosts(c *gin.Context) {
	projectID := c.Param("id")
	if projectID == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	costs, err := h.service.ListCosts(projectID)
	if err != nil {
		utils.HandleError(c, http.StatusInternalServerError, "获取成本数据失败", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    costs,
	})
}

func (h *ProductionCostHandler) CreateCost(c *gin.Context) {
	projectID := c.Param("id")
	if projectID == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	var payload struct {
		CostType     string  `json:"cost_type" binding:"required"`
		Amount       float64 `json:"amount" binding:"required"`
		Description  string  `json:"description"`
		IncurredAt   *string `json:"incurred_at"`
		CommissionID *string `json:"commission_id"` // UUID string
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

	var incurredAt *time.Time
	if payload.IncurredAt != nil && *payload.IncurredAt != "" {
		if parsed, err := time.Parse("2006-01-02", *payload.IncurredAt); err == nil {
			incurredAt = &parsed
		}
	}

	result, err := h.service.CreateCost(&services.CreateProductionCostRequest{
		ProjectID:    projectID,
		CostType:     models.ProductionCostType(payload.CostType),
		Amount:       payload.Amount,
		Description:  payload.Description,
		IncurredAt:   incurredAt,
		CommissionID: payload.CommissionID,
		CreatedByID:  userID,
	})
	if err != nil {
		utils.HandleError(c, http.StatusBadRequest, "创建成本记录失败", err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    result,
	})
}
