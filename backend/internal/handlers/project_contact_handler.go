package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"project-oa-backend/internal/middleware"
	"project-oa-backend/internal/services"
	"project-oa-backend/pkg/utils"
)

// ProjectContactHandler 项目联系人处理器
type ProjectContactHandler struct {
	service *services.ProjectContactService
	logger  *zap.Logger
}

// NewProjectContactHandler 创建项目联系人处理器
func NewProjectContactHandler(logger *zap.Logger) *ProjectContactHandler {
	return &ProjectContactHandler{
		service: services.NewProjectContactService(),
		logger:  logger,
	}
}

// GetProjectContact 获取项目联系人
func (h *ProjectContactHandler) GetProjectContact(c *gin.Context) {
	projectID := c.Param("id")
	if projectID == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	// 获取当前用户ID
	userID, exists := middleware.GetUserID(c)
	if !exists {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	contact, err := h.service.GetProjectContact(projectID, userID)
	if err != nil {
		if err.Error() == "project contact not found" {
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"data":    nil,
			})
			return
		}
		if err.Error() == "permission denied: you do not have permission to manage business information for this project" {
			utils.HandleError(c, http.StatusForbidden, err.Error(), err)
			return
		}
		h.logger.Error("Failed to get project contact",
			zap.Error(err),
			zap.String("project_id", projectID),
			zap.String("user_id", userID),
		)
		utils.HandleError(c, http.StatusInternalServerError, "Failed to get project contact", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    contact,
	})
}

// CreateOrUpdateProjectContact 创建或更新项目联系人
type CreateOrUpdateProjectContactRequest struct {
	ClientID     string `json:"client_id" binding:"required"`
	ContactName  string `json:"contact_name" binding:"required"`
	ContactPhone string `json:"contact_phone"`
}

func (h *ProjectContactHandler) CreateOrUpdateProjectContact(c *gin.Context) {
	projectID := c.Param("id")
	if projectID == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	// 获取当前用户ID
	userID, exists := middleware.GetUserID(c)
	if !exists {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	var req CreateOrUpdateProjectContactRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	contact, err := h.service.CreateOrUpdateProjectContact(projectID, req.ClientID, req.ContactName, req.ContactPhone, userID)
	if err != nil {
		h.logger.Error("Failed to create or update project contact",
			zap.Error(err),
			zap.String("project_id", projectID),
			zap.String("user_id", userID),
		)
		if err.Error() == "project not found" || err.Error() == "client not found" {
			utils.HandleError(c, http.StatusNotFound, err.Error(), err)
		} else if err.Error() == "permission denied: you do not have permission to manage business information for this project" {
			utils.HandleError(c, http.StatusForbidden, err.Error(), err)
		} else {
			utils.HandleError(c, http.StatusInternalServerError, "Failed to create or update project contact", err)
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    contact,
	})
}

// DeleteProjectContact 删除项目联系人
func (h *ProjectContactHandler) DeleteProjectContact(c *gin.Context) {
	projectID := c.Param("id")
	if projectID == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	// 获取当前用户ID
	userID, exists := middleware.GetUserID(c)
	if !exists {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	if err := h.service.DeleteProjectContact(projectID, userID); err != nil {
		h.logger.Error("Failed to delete project contact",
			zap.Error(err),
			zap.String("project_id", projectID),
			zap.String("user_id", userID),
		)
		if err.Error() == "project contact not found" {
			utils.HandleError(c, http.StatusNotFound, "Project contact not found", err)
		} else if err.Error() == "permission denied: you do not have permission to manage business information for this project" {
			utils.HandleError(c, http.StatusForbidden, err.Error(), err)
		} else {
			utils.HandleError(c, http.StatusInternalServerError, "Failed to delete project contact", err)
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Project contact deleted successfully",
	})
}
