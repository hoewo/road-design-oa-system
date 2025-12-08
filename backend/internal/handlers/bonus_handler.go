package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"project-oa-backend/internal/middleware"
	"project-oa-backend/internal/services"
	"project-oa-backend/pkg/utils"
)

// BonusHandler handles bonus-related HTTP requests
type BonusHandler struct {
	bonusService *services.BonusService
	logger       *zap.Logger
}

// NewBonusHandler creates a new bonus handler
func NewBonusHandler(logger *zap.Logger) *BonusHandler {
	return &BonusHandler{
		bonusService: services.NewBonusService(),
		logger:       logger,
	}
}

// GetBonuses handles retrieving all bonuses for a project
// @Summary Get bonuses by project
// @Description Get all bonuses for a specific project
// @Tags 奖金管理
// @Security BearerAuth
// @Produce json
// @Param id path int true "Project ID"
// @Success 200 {array} models.Bonus
// @Failure 404 {object} utils.ErrorResponse
// @Router /projects/{id}/bonuses [get]
func (h *BonusHandler) GetBonuses(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	bonuses, err := h.bonusService.ListBonusesByProject(id)
	if err != nil {
		h.logger.Error("Failed to get bonuses",
			zap.Error(err),
			zap.String("project_id", id),
		)
		if err.Error() == "project not found" {
			utils.HandleError(c, http.StatusNotFound, "Project not found", err)
		} else {
			utils.HandleError(c, http.StatusInternalServerError, "Failed to get bonuses", err)
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    bonuses,
	})
}

// CreateBonus handles bonus creation
// @Summary Create a new bonus
// @Description Create a new bonus for a project
// @Tags 奖金管理
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param id path int true "Project ID"
// @Param request body services.CreateBonusRequest true "Bonus information"
// @Success 201 {object} models.Bonus
// @Failure 400 {object} utils.ErrorResponse
// @Failure 404 {object} utils.ErrorResponse
// @Router /projects/{id}/bonuses [post]
func (h *BonusHandler) CreateBonus(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	var req services.CreateBonusRequest
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

	bonus, err := h.bonusService.CreateBonus(id, userID, &req)
	if err != nil {
		h.logger.Error("Failed to create bonus",
			zap.Error(err),
			zap.String("project_id", id),
		)
		if err.Error() == "project not found" || err.Error() == "user not found" {
			utils.HandleError(c, http.StatusNotFound, "Failed to create bonus", err)
		} else if err.Error() == "bonus already exists for this user, project, and type" {
			utils.HandleError(c, http.StatusConflict, "Failed to create bonus", err)
		} else {
			utils.HandleError(c, http.StatusBadRequest, "Failed to create bonus", err)
		}
		return
	}

	h.logger.Info("Bonus created successfully",
		zap.String("bonus_id", bonus.ID),
		zap.String("project_id", id),
	)

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    bonus,
	})
}

// UpdateBonus handles bonus update
// @Summary Update a bonus record
// @Description Update a bonus record (allows modification of business fields except system fields like created_at, id)
// @Tags 奖金管理
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param id path int true "Bonus ID"
// @Param request body services.UpdateBonusRequest true "Bonus information to update"
// @Success 200 {object} models.Bonus
// @Failure 400 {object} utils.ErrorResponse
// @Failure 404 {object} utils.ErrorResponse
// @Router /bonuses/{id} [put]
func (h *BonusHandler) UpdateBonus(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Bonus ID is required", nil)
		return
	}

	var req services.UpdateBonusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	bonus, err := h.bonusService.UpdateBonus(id, &req)
	if err != nil {
		h.logger.Error("Failed to update bonus",
			zap.Error(err),
			zap.String("bonus_id", id),
		)
		if err.Error() == "bonus not found" || err.Error() == "user not found" {
			utils.HandleError(c, http.StatusNotFound, "Failed to update bonus", err)
		} else {
			utils.HandleError(c, http.StatusBadRequest, "Failed to update bonus", err)
		}
		return
	}

	h.logger.Info("Bonus updated successfully",
		zap.String("bonus_id", bonus.ID),
	)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    bonus,
	})
}

// DeleteBonus handles bonus deletion
// @Summary Delete a bonus record
// @Description Delete a bonus record with automatic statistics update
// @Tags 奖金管理
// @Security BearerAuth
// @Produce json
// @Param id path int true "Bonus ID"
// @Success 200 {object} map[string]interface{}
// @Failure 404 {object} utils.ErrorResponse
// @Router /bonuses/{id} [delete]
func (h *BonusHandler) DeleteBonus(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Bonus ID is required", nil)
		return
	}

	if err := h.bonusService.DeleteBonus(id); err != nil {
		h.logger.Error("Failed to delete bonus",
			zap.Error(err),
			zap.String("bonus_id", id),
		)
		if err.Error() == "bonus not found" {
			utils.HandleError(c, http.StatusNotFound, "Bonus not found", err)
		} else {
			utils.HandleError(c, http.StatusInternalServerError, "Failed to delete bonus", err)
		}
		return
	}

	h.logger.Info("Bonus deleted successfully",
		zap.String("bonus_id", id),
	)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Bonus deleted successfully",
	})
}
