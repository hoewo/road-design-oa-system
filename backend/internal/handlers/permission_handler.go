package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"project-oa-backend/internal/middleware"
	"project-oa-backend/internal/services"
	"project-oa-backend/pkg/utils"
)

// PermissionHandler 权限相关 Handler
type PermissionHandler struct {
	permissionService *services.PermissionService
	logger            *zap.Logger
}

// NewPermissionHandler 创建权限 Handler
func NewPermissionHandler(logger *zap.Logger) *PermissionHandler {
	return &PermissionHandler{
		permissionService: services.NewPermissionService(),
		logger:            logger,
	}
}

// CheckCreateProjectPermission 检查用户是否可以创建项目
// @Summary 检查创建项目权限
// @Description 检查当前用户是否可以创建项目
// @Tags 权限管理
// @Security BearerAuth
// @Produce json
// @Success 200 {object} map[string]bool
// @Failure 401 {object} utils.ErrorResponse
// @Router /permissions/can-create-project [get]
func (h *PermissionHandler) CheckCreateProjectPermission(c *gin.Context) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	canCreate, err := h.permissionService.CanCreateProject(userID)
	if err != nil {
		h.logger.Error("Failed to check create project permission",
			zap.Error(err),
			zap.String("user_id", userID),
		)
		utils.HandleError(c, http.StatusInternalServerError, "Failed to check permission", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"can_create": canCreate,
		},
	})
}

// CheckManageProjectManagersPermission 检查用户是否可以管理项目负责人
// @Summary 检查管理项目负责人权限
// @Description 检查当前用户是否可以管理项目负责人
// @Tags 权限管理
// @Security BearerAuth
// @Produce json
// @Success 200 {object} map[string]bool
// @Failure 401 {object} utils.ErrorResponse
// @Router /permissions/can-manage-project-managers [get]
func (h *PermissionHandler) CheckManageProjectManagersPermission(c *gin.Context) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	canManage, err := h.permissionService.CanManageProjectManagers(userID)
	if err != nil {
		h.logger.Error("Failed to check manage project managers permission",
			zap.Error(err),
			zap.String("user_id", userID),
		)
		utils.HandleError(c, http.StatusInternalServerError, "Failed to check permission", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"can_manage": canManage,
		},
	})
}

// GetAvailableUsersForManagerRole 获取可用于配置项目负责人的用户列表
// @Summary 获取可用于配置项目负责人的用户列表
// @Description 根据负责人类型（business/production）获取可选择的用户列表（支持向上兼容）
// @Tags 权限管理
// @Security BearerAuth
// @Produce json
// @Param manager_type query string true "负责人类型: business 或 production"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} utils.ErrorResponse
// @Failure 401 {object} utils.ErrorResponse
// @Router /permissions/available-users-for-manager [get]
func (h *PermissionHandler) GetAvailableUsersForManagerRole(c *gin.Context) {
	managerType := c.Query("manager_type")
	if managerType == "" {
		utils.HandleError(c, http.StatusBadRequest, "manager_type parameter is required", nil)
		return
	}

	if managerType != "business" && managerType != "production" {
		utils.HandleError(c, http.StatusBadRequest, "manager_type must be 'business' or 'production'", nil)
		return
	}

	users, err := h.permissionService.GetAvailableUsersForManagerRole(managerType)
	if err != nil {
		h.logger.Error("Failed to get available users for manager role",
			zap.Error(err),
			zap.String("manager_type", managerType),
		)
		utils.HandleError(c, http.StatusInternalServerError, "Failed to get available users", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    users,
	})
}

// GetAvailableUsersForMemberRole 获取可用于配置项目成员的用户列表
// @Summary 获取可用于配置项目成员的用户列表
// @Description 返回所有用户，不需要角色过滤
// @Tags 权限管理
// @Security BearerAuth
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} utils.ErrorResponse
// @Router /permissions/available-users-for-member [get]
func (h *PermissionHandler) GetAvailableUsersForMemberRole(c *gin.Context) {
	users, err := h.permissionService.GetAvailableUsersForMemberRole()
	if err != nil {
		h.logger.Error("Failed to get available users for member role",
			zap.Error(err),
		)
		utils.HandleError(c, http.StatusInternalServerError, "Failed to get available users", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    users,
	})
}

