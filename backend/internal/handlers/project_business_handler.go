package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

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
// @Param id path int true "Project ID"
// @Success 200 {object} services.ProjectBusiness
// @Failure 404 {object} utils.ErrorResponse
// @Router /projects/{id}/business [get]
func (h *ProjectBusinessHandler) GetProjectBusiness(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid project ID", err)
		return
	}

	business, err := h.businessService.GetProjectBusiness(uint(id))
	if err != nil {
		h.logger.Error("Failed to get project business",
			zap.Error(err),
			zap.Uint("project_id", uint(id)),
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
// @Param id path int true "Project ID"
// @Param request body services.UpdateProjectBusinessRequest true "Business information"
// @Success 200 {object} services.ProjectBusiness
// @Failure 400 {object} utils.ErrorResponse
// @Failure 404 {object} utils.ErrorResponse
// @Router /projects/{id}/business [put]
func (h *ProjectBusinessHandler) UpdateProjectBusiness(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid project ID", err)
		return
	}

	var req services.UpdateProjectBusinessRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	business, err := h.businessService.UpdateProjectBusiness(uint(id), &req)
	if err != nil {
		h.logger.Error("Failed to update project business",
			zap.Error(err),
			zap.Uint("project_id", uint(id)),
		)
		if err.Error() == "project not found" || err.Error() == "client not found" {
			utils.HandleError(c, http.StatusNotFound, "Failed to update project business", err)
		} else {
			utils.HandleError(c, http.StatusBadRequest, "Failed to update project business", err)
		}
		return
	}

	h.logger.Info("Project business updated successfully",
		zap.Uint("project_id", uint(id)),
	)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    business,
	})
}
