package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"project-oa-backend/internal/services"
	"project-oa-backend/pkg/utils"
)

// ProjectDisciplineHandler handles per-discipline assignment APIs.
type ProjectDisciplineHandler struct {
	service *services.ProjectDisciplineService
	logger  *zap.Logger
}

// NewProjectDisciplineHandler creates handler instance.
func NewProjectDisciplineHandler(logger *zap.Logger) *ProjectDisciplineHandler {
	return &ProjectDisciplineHandler{
		service: services.NewProjectDisciplineService(),
		logger:  logger,
	}
}

// ListAssignments lists the assignments of a project.
func (h *ProjectDisciplineHandler) ListAssignments(c *gin.Context) {
	projectID := c.Param("id")
	if projectID == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	assignments, err := h.service.ListAssignments(projectID)
	if err != nil {
		utils.HandleError(c, http.StatusInternalServerError, "Failed to retrieve assignments", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    assignments,
	})
}

// ReplaceAssignments replaces the assignments for a project.
func (h *ProjectDisciplineHandler) ReplaceAssignments(c *gin.Context) {
	projectID := c.Param("id")
	if projectID == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	var req services.UpdateProjectDisciplineAssignmentsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	assignments, err := h.service.ReplaceAssignments(projectID, &req)
	if err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Failed to update assignments", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    assignments,
	})
}
