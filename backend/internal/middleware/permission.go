package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"project-oa-backend/internal/models"
	"project-oa-backend/internal/services"
	"project-oa-backend/pkg/utils"
)

// PermissionMiddleware 权限检查中间件
// 根据不同的权限类型进行权限检查
type PermissionType string

const (
	// PermissionCreateProject 创建项目权限
	PermissionCreateProject PermissionType = "create_project"
	// PermissionManageProjectManagers 管理项目负责人权限
	PermissionManageProjectManagers PermissionType = "manage_project_managers"
	// PermissionManageProjectMembers 管理项目成员权限
	PermissionManageProjectMembers PermissionType = "manage_project_members"
	// PermissionAccessProject 访问项目权限
	PermissionAccessProject PermissionType = "access_project"
	// PermissionManageBusinessInfo 管理项目经营信息权限
	PermissionManageBusinessInfo PermissionType = "manage_business_info"
	// PermissionManageProductionInfo 管理项目生产信息权限
	PermissionManageProductionInfo PermissionType = "manage_production_info"
	// PermissionManageCompanyRevenue 管理公司收入权限
	PermissionManageCompanyRevenue PermissionType = "manage_company_revenue"
)

// PermissionMiddleware 创建权限检查中间件
// permissionType: 权限类型
// projectIDParam: 项目ID参数名（从URL参数获取，如 "project_id"）
func PermissionMiddleware(permissionType PermissionType, projectIDParam string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取用户ID
		userID, exists := GetUserID(c)
		if !exists {
			utils.SendErrorResponse(c, http.StatusUnauthorized, ErrorCodeTokenMissing, "用户未认证")
			c.Abort()
			return
		}

		// 创建权限服务
		permissionService := services.NewPermissionService()

		var hasPermission bool
		var err error

		switch permissionType {
		case PermissionCreateProject:
			hasPermission, err = permissionService.CanCreateProject(userID)
		case PermissionManageProjectManagers:
			hasPermission, err = permissionService.CanManageProjectManagers(userID)
		case PermissionManageCompanyRevenue:
			hasPermission, err = permissionService.CanManageCompanyRevenue(userID)
		case PermissionAccessProject, PermissionManageBusinessInfo, PermissionManageProductionInfo:
			// 需要项目ID的权限检查
			projectID := c.Param(projectIDParam)
			if projectID == "" {
				// 尝试从查询参数获取
				projectID = c.Query(projectIDParam)
			}
			if projectID == "" {
				utils.SendErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", "缺少项目ID参数")
				c.Abort()
				return
			}

			switch permissionType {
			case PermissionAccessProject:
				hasPermission, err = permissionService.CanAccessProject(userID, projectID)
			case PermissionManageBusinessInfo:
				hasPermission, err = permissionService.CanManageBusinessInfo(userID, projectID)
			case PermissionManageProductionInfo:
				hasPermission, err = permissionService.CanManageProductionInfo(userID, projectID)
			}
		case PermissionManageProjectMembers:
			// 管理项目成员需要项目ID和成员角色
			projectID := c.Param(projectIDParam)
			if projectID == "" {
				projectID = c.Query(projectIDParam)
			}
			if projectID == "" {
				utils.SendErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", "缺少项目ID参数")
				c.Abort()
				return
			}
			// 成员角色从请求体获取，这里简化处理，使用默认值
			// 实际使用时，应该从请求体中解析 memberRole
			// 暂时使用 business_personnel 作为默认值，实际应该从请求中获取
			hasPermission, err = permissionService.CanManageProjectMembers(userID, projectID, models.MemberRoleBusinessPersonnel)
		default:
			utils.SendErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", "未知的权限类型")
			c.Abort()
			return
		}

		if err != nil {
			utils.SendErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", "权限检查失败: "+err.Error())
			c.Abort()
			return
		}

		if !hasPermission {
			utils.SendErrorResponse(c, http.StatusForbidden, ErrorCodeForbidden, "权限不足")
			c.Abort()
			return
		}

		c.Next()
	}
}

