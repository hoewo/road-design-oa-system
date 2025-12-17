package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"project-oa-backend/internal/middleware"
	"project-oa-backend/internal/services"
	"project-oa-backend/pkg/utils"
)

// ProjectBusinessHandler handles project business information HTTP requests
type ProjectBusinessHandler struct {
	businessService *services.ProjectBusinessService
	clientService   *services.ClientService
	logger          *zap.Logger
}

// NewProjectBusinessHandler creates a new project business handler
func NewProjectBusinessHandler(logger *zap.Logger) *ProjectBusinessHandler {
	return &ProjectBusinessHandler{
		businessService: services.NewProjectBusinessService(),
		clientService:   services.NewClientService(),
		logger:          logger,
	}
}

// GetProjectBusiness handles retrieving project business information
// @Summary Get project business information
// @Description Get business information for a specific project
// @Tags 项目经营信息
// @Security BearerAuth
// @Produce json
// @Param id path string true "Project ID (UUID)"
// @Success 200 {object} services.ProjectBusiness
// @Failure 404 {object} utils.ErrorResponse
// @Router /projects/{id}/business [get]
func (h *ProjectBusinessHandler) GetProjectBusiness(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	business, err := h.businessService.GetProjectBusiness(id)
	if err != nil {
		h.logger.Error("Failed to get project business",
			zap.Error(err),
			zap.String("project_id", id),
		)
		utils.HandleError(c, http.StatusNotFound, "Failed to get project business", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    business,
	})
}

// UpdateProjectBusiness handles updating project business information
// @Summary Update project business information
// @Description Update business information for a specific project
// @Tags 项目经营信息
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param id path string true "Project ID (UUID)"
// @Param request body services.UpdateProjectBusinessRequest true "Business information"
// @Success 200 {object} services.ProjectBusiness
// @Failure 400 {object} utils.ErrorResponse
// @Failure 404 {object} utils.ErrorResponse
// @Router /projects/{id}/business [put]
func (h *ProjectBusinessHandler) UpdateProjectBusiness(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	// 获取当前用户ID（用于权限检查）
	userID, exists := middleware.GetUserID(c)
	if !exists {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	var req services.UpdateProjectBusinessRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	business, err := h.businessService.UpdateProjectBusiness(id, &req, userID)
	if err != nil {
		h.logger.Error("Failed to update project business",
			zap.Error(err),
			zap.String("project_id", id),
			zap.String("user_id", userID),
		)
		if err.Error() == "project not found" || err.Error() == "client not found" {
			utils.HandleError(c, http.StatusNotFound, "Failed to update project business", err)
		} else if err.Error() == "permission denied: you do not have permission to manage business information for this project" {
			utils.HandleError(c, http.StatusForbidden, err.Error(), err)
		} else {
			utils.HandleError(c, http.StatusBadRequest, "Failed to update project business", err)
		}
		return
	}

	h.logger.Info("Project business updated successfully",
		zap.String("project_id", id),
	)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    business,
	})
}

// GetBusinessStatistics handles retrieving business statistics for a project
// @Summary Get business statistics
// @Description Get business statistics (total receivable, total paid, total unpaid) for a project
// @Tags 项目经营信息
// @Security BearerAuth
// @Produce json
// @Param id path string true "Project ID (UUID)"
// @Param start_date query string false "Start date (YYYY-MM-DD)" format(date)
// @Param end_date query string false "End date (YYYY-MM-DD)" format(date)
// @Success 200 {object} services.BusinessStatistics
// @Failure 404 {object} utils.ErrorResponse
// @Router /projects/{id}/business/statistics [get]
func (h *ProjectBusinessHandler) GetBusinessStatistics(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	// Parse optional date range parameters
	var startDate, endDate *time.Time
	if startDateStr := c.Query("start_date"); startDateStr != "" {
		parsed, err := time.Parse("2006-01-02", startDateStr)
		if err != nil {
			utils.HandleError(c, http.StatusBadRequest, "Invalid start_date format, expected YYYY-MM-DD", err)
			return
		}
		startDate = &parsed
	}
	if endDateStr := c.Query("end_date"); endDateStr != "" {
		parsed, err := time.Parse("2006-01-02", endDateStr)
		if err != nil {
			utils.HandleError(c, http.StatusBadRequest, "Invalid end_date format, expected YYYY-MM-DD", err)
			return
		}
		endDate = &parsed
	}

	var stats *services.BusinessStatistics
	var err error
	if startDate != nil || endDate != nil {
		stats, err = h.businessService.GetBusinessStatisticsByTimeRange(id, startDate, endDate)
	} else {
		stats, err = h.businessService.GetBusinessStatistics(id)
	}

	if err != nil {
		h.logger.Error("Failed to get business statistics",
			zap.Error(err),
			zap.String("project_id", id),
		)
		if err.Error() == "project not found" {
			utils.HandleError(c, http.StatusNotFound, "Project not found", err)
		} else {
			utils.HandleError(c, http.StatusInternalServerError, "Failed to get business statistics", err)
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}
