package utils

import (
	"project-oa-backend/internal/models"
)

// RoleLevel 权限等级
type RoleLevel int

const (
	RoleLevelSystemAdmin   RoleLevel = 4 // 系统管理员
	RoleLevelProjectManager RoleLevel = 3 // 项目管理员/财务人员
	RoleLevelManager        RoleLevel = 2 // 经营负责人/生产负责人
	RoleLevelMember         RoleLevel = 1 // 普通成员
)

// GetUserRoleLevel 获取用户角色的权限等级
// 如果用户有多个角色，返回最高等级
func GetUserRoleLevel(roles []models.UserRole) RoleLevel {
	maxLevel := RoleLevelMember
	for _, role := range roles {
		level := getRoleLevel(role)
		if level > maxLevel {
			maxLevel = level
		}
	}
	return maxLevel
}

// getRoleLevel 获取单个角色的权限等级
func getRoleLevel(role models.UserRole) RoleLevel {
	switch role {
	case models.RoleAdmin:
		return RoleLevelSystemAdmin
	case models.RoleProjectManager, models.RoleFinance:
		return RoleLevelProjectManager
	case models.RoleBusinessManager, models.RoleProductionManager:
		return RoleLevelManager
	default:
		return RoleLevelMember
	}
}

// HasRoleOrHigher 检查用户是否有指定角色或更高权限等级的角色
func HasRoleOrHigher(userRoles []models.UserRole, targetRole models.UserRole) bool {
	targetLevel := getRoleLevel(targetRole)
	userLevel := GetUserRoleLevel(userRoles)
	return userLevel >= targetLevel
}

// IsSystemAdmin 检查用户是否是系统管理员
func IsSystemAdmin(roles []models.UserRole) bool {
	for _, role := range roles {
		if role == models.RoleAdmin {
			return true
		}
	}
	return false
}

// IsProjectManager 检查用户是否是项目管理员
func IsProjectManager(roles []models.UserRole) bool {
	for _, role := range roles {
		if role == models.RoleProjectManager {
			return true
		}
	}
	return false
}

// HasRole 检查用户是否拥有指定角色
func HasRole(roles []models.UserRole, targetRole models.UserRole) bool {
	for _, role := range roles {
		if role == targetRole {
			return true
		}
	}
	return false
}

// HasAnyRole 检查用户是否拥有任意一个指定角色
func HasAnyRole(roles []models.UserRole, targetRoles ...models.UserRole) bool {
	for _, role := range roles {
		for _, targetRole := range targetRoles {
			if role == targetRole {
				return true
			}
		}
	}
	return false
}

