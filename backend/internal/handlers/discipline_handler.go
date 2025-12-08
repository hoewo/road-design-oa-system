package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"project-oa-backend/internal/services"
	"project-oa-backend/pkg/utils"
)

// DisciplineHandler 专业字典处理器
type DisciplineHandler struct {
	service *services.DisciplineService
	logger  *zap.Logger
}

// NewDisciplineHandler 创建专业字典处理器
func NewDisciplineHandler(logger *zap.Logger) *DisciplineHandler {
	return &DisciplineHandler{
		service: services.NewDisciplineService(),
		logger:  logger,
	}
}

// ListDisciplines 获取专业列表
func (h *DisciplineHandler) ListDisciplines(c *gin.Context) {
	includeInactive := c.Query("include_inactive") == "true"

	disciplines, err := h.service.ListDisciplines(includeInactive)
	if err != nil {
		h.logger.Error("Failed to list disciplines", zap.Error(err))
		utils.HandleError(c, http.StatusInternalServerError, "Failed to list disciplines", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    disciplines,
	})
}

// GetDiscipline 获取专业详情
func (h *DisciplineHandler) GetDiscipline(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Discipline ID is required", nil)
		return
	}

	discipline, err := h.service.GetDiscipline(id)
	if err != nil {
		h.logger.Error("Failed to get discipline",
			zap.Error(err),
			zap.String("discipline_id", id),
		)
		if err.Error() == "discipline not found" {
			utils.HandleError(c, http.StatusNotFound, "Discipline not found", err)
		} else {
			utils.HandleError(c, http.StatusInternalServerError, "Failed to get discipline", err)
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    discipline,
	})
}

// CreateDiscipline 创建专业
type CreateDisciplineRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

func (h *DisciplineHandler) CreateDiscipline(c *gin.Context) {
	var req CreateDisciplineRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	discipline, err := h.service.CreateDiscipline(req.Name, req.Description)
	if err != nil {
		h.logger.Error("Failed to create discipline",
			zap.Error(err),
			zap.String("name", req.Name),
		)
		if err.Error() == "discipline name already exists" {
			utils.HandleError(c, http.StatusConflict, "Discipline name already exists", err)
		} else {
			utils.HandleError(c, http.StatusInternalServerError, "Failed to create discipline", err)
		}
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    discipline,
	})
}

// UpdateDiscipline 更新专业
type UpdateDisciplineRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	IsActive    *bool   `json:"is_active"`
}

func (h *DisciplineHandler) UpdateDiscipline(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Discipline ID is required", nil)
		return
	}

	var req UpdateDisciplineRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	discipline, err := h.service.UpdateDiscipline(id, req.Name, req.Description, req.IsActive)
	if err != nil {
		h.logger.Error("Failed to update discipline",
			zap.Error(err),
			zap.String("discipline_id", id),
		)
		if err.Error() == "discipline not found" {
			utils.HandleError(c, http.StatusNotFound, "Discipline not found", err)
		} else if err.Error() == "discipline name already exists" {
			utils.HandleError(c, http.StatusConflict, "Discipline name already exists", err)
		} else {
			utils.HandleError(c, http.StatusInternalServerError, "Failed to update discipline", err)
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    discipline,
	})
}

// DeleteDiscipline 删除专业
func (h *DisciplineHandler) DeleteDiscipline(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Discipline ID is required", nil)
		return
	}

	if err := h.service.DeleteDiscipline(id); err != nil {
		h.logger.Error("Failed to delete discipline",
			zap.Error(err),
			zap.String("discipline_id", id),
		)
		if err.Error() == "discipline not found" {
			utils.HandleError(c, http.StatusNotFound, "Discipline not found", err)
		} else {
			utils.HandleError(c, http.StatusInternalServerError, "Failed to delete discipline", err)
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Discipline deleted successfully",
	})
}
