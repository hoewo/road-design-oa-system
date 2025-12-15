package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"project-oa-backend/internal/middleware"
	"project-oa-backend/internal/services"
	"project-oa-backend/pkg/utils"
)

// BiddingHandler handles bidding information-related HTTP requests
type BiddingHandler struct {
	biddingService *services.BiddingService
	logger         *zap.Logger
}

// NewBiddingHandler creates a new bidding handler
func NewBiddingHandler(logger *zap.Logger) *BiddingHandler {
	return &BiddingHandler{
		biddingService: services.NewBiddingService(),
		logger:         logger,
	}
}

// GetBiddingInfo handles retrieving bidding info for a project
// @Summary Get bidding info by project ID
// @Description Get bidding information for a specific project
// @Tags 招投标管理
// @Security BearerAuth
// @Produce json
// @Param id path string true "Project ID (UUID)"
// @Success 200 {object} models.BiddingInfo
// @Failure 404 {object} utils.ErrorResponse
// @Router /projects/{id}/bidding [get]
func (h *BiddingHandler) GetBiddingInfo(c *gin.Context) {
	projectID := c.Param("id")
	if projectID == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	biddingInfo, err := h.biddingService.GetBiddingInfo(projectID)
	if err != nil {
		if err.Error() == "bidding info not found" {
			// Return empty result instead of 404
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"data":    nil,
			})
			return
		}
		h.logger.Error("Failed to get bidding info",
			zap.Error(err),
			zap.String("project_id", projectID),
		)
		utils.HandleError(c, http.StatusInternalServerError, "Failed to get bidding info", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    biddingInfo,
	})
}

// CreateOrUpdateBiddingInfo handles creating or updating bidding info
// @Summary Create or update bidding info
// @Description Create or update bidding information for a project
// @Tags 招投标管理
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param id path string true "Project ID (UUID)"
// @Param request body services.CreateOrUpdateBiddingInfoRequest true "Bidding information"
// @Success 200 {object} models.BiddingInfo
// @Failure 400 {object} utils.ErrorResponse
// @Router /projects/{id}/bidding [put]
func (h *BiddingHandler) CreateOrUpdateBiddingInfo(c *gin.Context) {
	projectID := c.Param("id")
	if projectID == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	// 获取用户ID
	userID, exists := middleware.GetUserID(c)
	if !exists {
		utils.HandleError(c, http.StatusUnauthorized, "Unauthorized", nil)
		return
	}

	var req services.CreateOrUpdateBiddingInfoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// 权限检查在Service层进行
	biddingInfo, err := h.biddingService.CreateOrUpdateBiddingInfo(projectID, userID, &req)
	if err != nil {
		h.logger.Error("Failed to create or update bidding info",
			zap.Error(err),
			zap.String("project_id", projectID),
		)
		utils.HandleError(c, http.StatusBadRequest, "Failed to create or update bidding info", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    biddingInfo,
	})
}

// CreateExpertFeePaymentRequest represents the request to create expert fee payment
type CreateExpertFeePaymentRequest struct {
	ExpertName    string `json:"expert_name" binding:"required"`
	Amount        float64 `json:"amount" binding:"required"`
	OccurredAt    string `json:"occurred_at" binding:"required"`
	PaymentMethod string `json:"payment_method" binding:"required"`
	Description   string `json:"description"`
}

// CreateExpertFeePayment handles creating expert fee payment
// @Summary Create expert fee payment
// @Description Create an expert fee payment record for a project
// @Tags 招投标管理
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param id path string true "Project ID (UUID)"
// @Param request body CreateExpertFeePaymentRequest true "Expert fee payment information"
// @Success 201 {object} models.FinancialRecord
// @Failure 400 {object} utils.ErrorResponse
// @Router /projects/{id}/bidding/expert-fee [post]
func (h *BiddingHandler) CreateExpertFeePayment(c *gin.Context) {
	projectID := c.Param("id")
	if projectID == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	userID, exists := middleware.GetUserID(c)
	if !exists {
		utils.HandleError(c, http.StatusUnauthorized, "User ID not found", nil)
		return
	}

	var req CreateExpertFeePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// Parse occurred_at
	occurredAt, err := utils.ParseFlexibleDate(req.OccurredAt)
	if err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid occurred_at date", err)
		return
	}

	expertFeePayment, err := h.biddingService.CreateExpertFeePayment(
		projectID,
		userID,
		req.ExpertName,
		req.Amount,
		occurredAt,
		req.PaymentMethod,
		req.Description,
	)
	if err != nil {
		h.logger.Error("Failed to create expert fee payment",
			zap.Error(err),
			zap.String("project_id", projectID),
		)
		utils.HandleError(c, http.StatusBadRequest, "Failed to create expert fee payment", err)
		return
	}

		c.JSON(http.StatusCreated, gin.H{
			"success": true,
			"data":    expertFeePayment,
		})
}

// DeleteBiddingInfo handles deleting bidding info for a project
// @Summary Delete bidding info
// @Description Delete bidding information for a project
// @Tags 招投标管理
// @Security BearerAuth
// @Produce json
// @Param id path string true "Project ID (UUID)"
// @Success 200 {object} utils.SuccessResponse
// @Failure 400 {object} utils.ErrorResponse
// @Failure 403 {object} utils.ErrorResponse
// @Router /projects/{id}/bidding [delete]
func (h *BiddingHandler) DeleteBiddingInfo(c *gin.Context) {
	projectID := c.Param("id")
	if projectID == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	// 获取用户ID
	userID, exists := middleware.GetUserID(c)
	if !exists {
		utils.HandleError(c, http.StatusUnauthorized, "Unauthorized", nil)
		return
	}

	// 权限检查在Service层进行
	if err := h.biddingService.DeleteBiddingInfo(projectID, userID); err != nil {
		h.logger.Error("Failed to delete bidding info",
			zap.Error(err),
			zap.String("project_id", projectID),
		)
		if err.Error() == "project not found" {
			utils.HandleError(c, http.StatusNotFound, err.Error(), err)
		} else {
			utils.HandleError(c, http.StatusInternalServerError, "Failed to delete bidding info", err)
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Bidding info deleted successfully",
	})
}

