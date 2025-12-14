package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"project-oa-backend/internal/middleware"
	"project-oa-backend/internal/services"
	"project-oa-backend/pkg/utils"
)

// ProjectHandler handles project-related HTTP requests
type ProjectHandler struct {
	projectService *services.ProjectService
	logger         *zap.Logger
}

// NewProjectHandler creates a new project handler
func NewProjectHandler(logger *zap.Logger) *ProjectHandler {
	return &ProjectHandler{
		projectService: services.NewProjectService(),
		logger:         logger,
	}
}

// CreateProject handles project creation
// @Summary Create a new project
// @Description Create a new project with the provided information
// @Tags 项目管理
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param request body services.CreateProjectRequest true "Project information"
// @Success 201 {object} models.Project
// @Failure 400 {object} utils.ErrorResponse
// @Router /projects [post]
func (h *ProjectHandler) CreateProject(c *gin.Context) {
	var req services.CreateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	project, err := h.projectService.CreateProject(&req)
	if err != nil {
		h.logger.Error("Failed to create project",
			zap.Error(err),
			zap.String("project_number", req.ProjectNumber),
		)
		utils.HandleError(c, http.StatusBadRequest, "Failed to create project", err)
		return
	}

	h.logger.Info("Project created successfully",
		zap.String("project_id", project.ID),
		zap.String("project_number", project.ProjectNumber),
	)

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    project,
	})
}

// GetProject handles retrieving a single project
// @Summary Get project by ID
// @Description Get detailed information about a specific project
// @Tags 项目管理
// @Security BearerAuth
// @Produce json
// @Param id path string true "Project ID (UUID)"
// @Success 200 {object} models.Project
// @Failure 404 {object} utils.ErrorResponse
// @Router /projects/{id} [get]
func (h *ProjectHandler) GetProject(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	project, err := h.projectService.GetProject(id)
	if err != nil {
		utils.HandleError(c, http.StatusNotFound, "Project not found", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    project,
	})
}

// ListProjects handles listing projects with pagination
// @Summary List projects
// @Description Get a paginated list of projects with optional filters
// @Tags 项目管理
// @Security BearerAuth
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param size query int false "Page size" default(20)
// @Param status query string false "Project status"
// @Param keyword query string false "Search keyword"
// @Success 200 {object} map[string]interface{}
// @Router /projects [get]
func (h *ProjectHandler) ListProjects(c *gin.Context) {
	params := &services.ListProjectsParams{
		Page:    1,
		Size:    20,
		Status:  c.Query("status"),
		Keyword: c.Query("keyword"),
	}

	// Parse pagination parameters
	if pageStr := c.Query("page"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil && page > 0 {
			params.Page = page
		}
	}

	if sizeStr := c.Query("size"); sizeStr != "" {
		if size, err := strconv.Atoi(sizeStr); err == nil && size > 0 && size <= 100 {
			params.Size = size
		}
	}

	projects, total, err := h.projectService.ListProjects(params)
	if err != nil {
		h.logger.Error("Failed to list projects", zap.Error(err))
		utils.HandleError(c, http.StatusInternalServerError, "Failed to list projects", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    projects,
		"total":   total,
		"page":    params.Page,
		"size":    params.Size,
	})
}

// UpdateProject handles project updates
// @Summary Update project
// @Description Update an existing project
// @Tags 项目管理
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param id path string true "Project ID (UUID)"
// @Param request body services.UpdateProjectRequest true "Project update information"
// @Success 200 {object} models.Project
// @Failure 400 {object} utils.ErrorResponse
// @Failure 403 {object} utils.ErrorResponse
// @Failure 404 {object} utils.ErrorResponse
// @Router /projects/{id} [put]
func (h *ProjectHandler) UpdateProject(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	var req services.UpdateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// Check permission if updating managers (business manager or production manager)
	if req.BusinessManagerID != nil || req.ProductionManagerID != nil {
		userID, exists := middleware.GetUserID(c)
		if !exists {
			utils.HandleError(c, http.StatusUnauthorized, "User ID not found", nil)
			return
		}

		canManage, err := h.projectService.CanManageProjectManagers(userID)
		if err != nil {
			h.logger.Error("Failed to check permission",
				zap.Error(err),
				zap.String("user_id", userID),
			)
			utils.HandleError(c, http.StatusInternalServerError, "Failed to check permission", err)
			return
		}

		if !canManage {
			utils.HandleError(c, http.StatusForbidden, "Only project managers can configure project managers", nil)
			return
		}
	}

	project, err := h.projectService.UpdateProject(id, &req)
	if err != nil {
		h.logger.Error("Failed to update project",
			zap.Error(err),
			zap.String("project_id", id),
		)
		utils.HandleError(c, http.StatusBadRequest, "Failed to update project", err)
		return
	}

	h.logger.Info("Project updated successfully",
		zap.String("project_id", project.ID),
	)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    project,
	})
}

// DeleteProject handles project deletion
// @Summary Delete project
// @Description Delete a project
// @Tags 项目管理
// @Security BearerAuth
// @Produce json
// @Param id path string true "Project ID (UUID)"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} utils.ErrorResponse
// @Failure 404 {object} utils.ErrorResponse
// @Router /projects/{id} [delete]
func (h *ProjectHandler) DeleteProject(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	if err := h.projectService.DeleteProject(id); err != nil {
		h.logger.Error("Failed to delete project",
			zap.Error(err),
			zap.String("project_id", id),
		)
		utils.HandleError(c, http.StatusBadRequest, "Failed to delete project", err)
		return
	}

	h.logger.Info("Project deleted successfully",
		zap.String("project_id", id),
	)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Project deleted successfully",
	})
}
