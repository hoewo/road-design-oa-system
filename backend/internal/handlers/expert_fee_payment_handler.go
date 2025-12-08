package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"project-oa-backend/internal/middleware"
	"project-oa-backend/internal/services"
	"project-oa-backend/pkg/utils"
)

// ExpertFeePaymentHandler handles expert fee payment-related HTTP requests
type ExpertFeePaymentHandler struct {
	paymentService *services.ExpertFeePaymentService
	logger         *zap.Logger
}

// NewExpertFeePaymentHandler creates a new expert fee payment handler
func NewExpertFeePaymentHandler(logger *zap.Logger) *ExpertFeePaymentHandler {
	return &ExpertFeePaymentHandler{
		paymentService: services.NewExpertFeePaymentService(),
		logger:         logger,
	}
}

// GetExpertFeePayments handles retrieving all expert fee payments for a project
// @Summary Get expert fee payments by project
// @Description Get all expert fee payments for a specific project
// @Tags 项目经营信息
// @Security BearerAuth
// @Produce json
// @Param id path int true "Project ID"
// @Success 200 {array} models.ExpertFeePayment
// @Failure 404 {object} utils.ErrorResponse
// @Router /projects/{id}/expert-fee-payments [get]
func (h *ExpertFeePaymentHandler) GetExpertFeePayments(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	payments, err := h.paymentService.ListExpertFeePaymentsByProject(id)
	if err != nil {
		h.logger.Error("Failed to get expert fee payments",
			zap.Error(err),
			zap.String("project_id", id),
		)
		utils.HandleError(c, http.StatusInternalServerError, "Failed to get expert fee payments", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    payments,
	})
}

// CreateExpertFeePayment handles expert fee payment creation
// @Summary Create a new expert fee payment
// @Description Create a new expert fee payment for a project
// @Tags 项目经营信息
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param id path int true "Project ID"
// @Param request body services.CreateExpertFeePaymentRequest true "Expert fee payment information"
// @Success 201 {object} models.ExpertFeePayment
// @Failure 400 {object} utils.ErrorResponse
// @Failure 404 {object} utils.ErrorResponse
// @Router /projects/{id}/expert-fee-payments [post]
func (h *ExpertFeePaymentHandler) CreateExpertFeePayment(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	var req services.CreateExpertFeePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// Get current user from context (set by auth middleware)
	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	payment, err := h.paymentService.CreateExpertFeePayment(id, userID, &req)
	if err != nil {
		h.logger.Error("Failed to create expert fee payment",
			zap.Error(err),
			zap.String("project_id", id),
		)
		if err.Error() == "project not found" || err.Error() == "expert user not found" {
			utils.HandleError(c, http.StatusNotFound, "Failed to create expert fee payment", err)
		} else {
			utils.HandleError(c, http.StatusBadRequest, "Failed to create expert fee payment", err)
		}
		return
	}

	h.logger.Info("Expert fee payment created successfully",
		zap.String("payment_id", payment.ID),
		zap.String("project_id", id),
	)

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    payment,
	})
}

// GetExpertFeePayment handles retrieving a single expert fee payment
// @Summary Get expert fee payment by ID
// @Description Get detailed information about a specific expert fee payment
// @Tags 项目经营信息
// @Security BearerAuth
// @Produce json
// @Param id path int true "Payment ID"
// @Success 200 {object} models.ExpertFeePayment
// @Failure 404 {object} utils.ErrorResponse
// @Router /expert-fee-payments/{id} [get]
func (h *ExpertFeePaymentHandler) GetExpertFeePayment(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Payment ID is required", nil)
		return
	}

	payment, err := h.paymentService.GetExpertFeePayment(id)
	if err != nil {
		h.logger.Error("Failed to get expert fee payment",
			zap.Error(err),
			zap.String("payment_id", id),
		)
		utils.HandleError(c, http.StatusNotFound, "Failed to get expert fee payment", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    payment,
	})
}

// UpdateExpertFeePayment handles expert fee payment updates
// @Summary Update an expert fee payment
// @Description Update an existing expert fee payment
// @Tags 项目经营信息
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param id path int true "Payment ID"
// @Param request body services.UpdateExpertFeePaymentRequest true "Expert fee payment information"
// @Success 200 {object} models.ExpertFeePayment
// @Failure 400 {object} utils.ErrorResponse
// @Failure 404 {object} utils.ErrorResponse
// @Router /expert-fee-payments/{id} [put]
func (h *ExpertFeePaymentHandler) UpdateExpertFeePayment(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Payment ID is required", nil)
		return
	}

	var req services.UpdateExpertFeePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	payment, err := h.paymentService.UpdateExpertFeePayment(id, &req)
	if err != nil {
		h.logger.Error("Failed to update expert fee payment",
			zap.Error(err),
			zap.String("payment_id", id),
		)
		if err.Error() == "expert fee payment not found" || err.Error() == "expert user not found" {
			utils.HandleError(c, http.StatusNotFound, "Failed to update expert fee payment", err)
		} else {
			utils.HandleError(c, http.StatusBadRequest, "Failed to update expert fee payment", err)
		}
		return
	}

	h.logger.Info("Expert fee payment updated successfully",
		zap.String("payment_id", id),
	)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    payment,
	})
}

// DeleteExpertFeePayment handles expert fee payment deletion
// @Summary Delete an expert fee payment
// @Description Delete an existing expert fee payment
// @Tags 项目经营信息
// @Security BearerAuth
// @Param id path int true "Payment ID"
// @Success 204 "No Content"
// @Failure 404 {object} utils.ErrorResponse
// @Router /expert-fee-payments/{id} [delete]
func (h *ExpertFeePaymentHandler) DeleteExpertFeePayment(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Payment ID is required", nil)
		return
	}

	if err := h.paymentService.DeleteExpertFeePayment(id); err != nil {
		h.logger.Error("Failed to delete expert fee payment",
			zap.Error(err),
			zap.String("payment_id", id),
		)
		if err.Error() == "expert fee payment not found" {
			utils.HandleError(c, http.StatusNotFound, "Failed to delete expert fee payment", err)
		} else {
			utils.HandleError(c, http.StatusBadRequest, "Failed to delete expert fee payment", err)
		}
		return
	}

	h.logger.Info("Expert fee payment deleted successfully",
		zap.String("payment_id", id),
	)

	c.Status(http.StatusNoContent)
}
