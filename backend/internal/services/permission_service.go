package services

import (
	"errors"
	"fmt"

	"gorm.io/gorm"

	"project-oa-backend/internal/models"
	"project-oa-backend/internal/utils"
	"project-oa-backend/pkg/database"
)

// PermissionService 权限服务，统一管理所有权限检查逻辑
type PermissionService struct {
	db *gorm.DB
}

// NewPermissionService 创建权限服务实例
func NewPermissionService() *PermissionService {
	return &PermissionService{
		db: database.DB,
	}
}

// RoleLevel 权限等级常量（与 utils/permission.go 保持一致）
const (
	RoleLevelSystemAdmin   = utils.RoleLevelSystemAdmin   // 系统管理员
	RoleLevelProjectManager = utils.RoleLevelProjectManager // 项目管理员/财务人员
	RoleLevelManager        = utils.RoleLevelManager        // 经营负责人/生产负责人
	RoleLevelMember         = utils.RoleLevelMember         // 普通成员
)

// getUserRoles 获取用户的角色列表
// 兼容当前单角色模型和未来的多角色模型
func (s *PermissionService) getUserRoles(userID string) ([]models.UserRole, error) {
	var user models.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("user not found: %s", userID)
		}
		return nil, err
	}

	// 直接从User.Roles字段获取角色数组
	roles := make([]models.UserRole, len(user.Roles))
	for i, roleStr := range user.Roles {
		roles[i] = models.UserRole(roleStr)
	}
	return roles, nil
}

// CanCreateProject 检查用户是否可以创建项目
// 只有项目管理员角色的用户才能创建项目
func (s *PermissionService) CanCreateProject(userID string) (bool, error) {
	roles, err := s.getUserRoles(userID)
	if err != nil {
		return false, err
	}

	// 系统管理员具备所有权限
	if utils.IsSystemAdmin(roles) {
		return true, nil
	}

	// 检查是否是项目管理员
	return utils.IsProjectManager(roles), nil
}

// CanManageProjectManagers 检查用户是否可以配置项目负责人
// 项目管理员或系统管理员可以配置项目负责人
func (s *PermissionService) CanManageProjectManagers(userID string) (bool, error) {
	roles, err := s.getUserRoles(userID)
	if err != nil {
		return false, err
	}

	// 系统管理员具备所有权限
	if utils.IsSystemAdmin(roles) {
		return true, nil
	}

	// 检查是否是项目管理员
	return utils.IsProjectManager(roles), nil
}

// CanManageProjectMembers 检查用户是否可以配置项目成员
// 系统管理员、项目管理员、项目经营负责人、项目生产负责人可以配置项目成员
func (s *PermissionService) CanManageProjectMembers(userID string, projectID string, memberRole models.MemberRole) (bool, error) {
	roles, err := s.getUserRoles(userID)
	if err != nil {
		return false, err
	}

	// 系统管理员和项目管理员可以配置所有类型的项目成员
	if utils.IsSystemAdmin(roles) || utils.IsProjectManager(roles) {
		return true, nil
	}

	// 获取项目信息
	var project models.Project
	if err := s.db.First(&project, "id = ?", projectID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, fmt.Errorf("project not found: %s", projectID)
		}
		return false, err
	}

	// 项目经营负责人可以配置经营参与人
	if memberRole == models.MemberRoleBusinessPersonnel {
		if project.BusinessManagerID != nil && *project.BusinessManagerID == userID {
			return true, nil
		}
		// 检查用户角色是否是经营负责人
		if utils.HasRole(roles, models.RoleBusinessManager) {
			return true, nil
		}
	}

	// 项目生产负责人可以配置生产人员（设计人、参与人、复核人、审核人、审定人）
	productionRoles := []models.MemberRole{
		models.MemberRoleDesigner,
		models.MemberRoleParticipant,
		models.MemberRoleReviewer,
		models.MemberRoleAuditor,
		models.MemberRoleApprover,
	}
	for _, prodRole := range productionRoles {
		if memberRole == prodRole {
			if project.ProductionManagerID != nil && *project.ProductionManagerID == userID {
				return true, nil
			}
			// 检查用户角色是否是生产负责人
			if utils.HasRole(roles, models.RoleProductionManager) {
				return true, nil
			}
			break
		}
	}

	return false, nil
}

// CanAccessProject 检查用户是否可以访问项目
// 考虑用户角色和项目成员角色，两者取并集（任一满足即可）
func (s *PermissionService) CanAccessProject(userID string, projectID string) (bool, error) {
	roles, err := s.getUserRoles(userID)
	if err != nil {
		return false, err
	}

	// 系统管理员可以访问所有项目
	if utils.IsSystemAdmin(roles) {
		return true, nil
	}

	// 项目管理员可以访问所有项目
	if utils.IsProjectManager(roles) {
		return true, nil
	}

	// 获取项目信息
	var project models.Project
	if err := s.db.First(&project, "id = ?", projectID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, fmt.Errorf("project not found: %s", projectID)
		}
		return false, err
	}

	// 检查是否是项目负责人（经营负责人或生产负责人）
	if project.BusinessManagerID != nil && *project.BusinessManagerID == userID {
		return true, nil
	}
	if project.ProductionManagerID != nil && *project.ProductionManagerID == userID {
		return true, nil
	}

	// 检查用户角色是否是经营负责人或生产负责人（全局权限）
	if utils.HasAnyRole(roles, models.RoleBusinessManager, models.RoleProductionManager) {
		return true, nil
	}

	// 检查是否是项目成员
	var member models.ProjectMember
	if err := s.db.Where("project_id = ? AND user_id = ? AND is_active = ?", projectID, userID, true).First(&member).Error; err == nil {
		return true, nil
	}

	return false, nil
}

// GetAvailableUsersForMemberRole 获取可用于配置项目成员的用户列表
// 返回所有用户，不需要角色过滤
func (s *PermissionService) GetAvailableUsersForMemberRole() ([]models.User, error) {
	var users []models.User
	if err := s.db.Where("is_active = ?", true).Find(&users).Error; err != nil {
		return nil, err
	}
	return users, nil
}

// GetAvailableUsersForManagerRole 获取可用于配置项目负责人的用户列表
// 根据角色过滤，支持向上兼容
// managerType: "business" 或 "production"
func (s *PermissionService) GetAvailableUsersForManagerRole(managerType string) ([]models.User, error) {
	var users []models.User

	// 根据负责人类型过滤
	// 注意：现在使用 roles 数组字段，需要使用 PostgreSQL 数组操作符
	// 使用括号确保 OR 条件正确组合，避免与 is_active 条件混淆
	if managerType == "business" {
		// 经营负责人：可选择有经营负责人、项目管理员、系统管理员角色的用户（向上兼容）
		// 使用 ? = ANY(roles) 检查 roles 数组是否包含指定角色
		// 使用括号确保 OR 条件作为一个整体与 is_active 条件组合
		err := s.db.Where("is_active = ? AND (? = ANY(roles) OR ? = ANY(roles) OR ? = ANY(roles))",
			true,
			string(models.RoleAdmin),
			string(models.RoleProjectManager),
			string(models.RoleBusinessManager),
		).Find(&users).Error
		if err != nil {
			return nil, err
		}
	} else if managerType == "production" {
		// 生产负责人：可选择有生产负责人、项目管理员、系统管理员角色的用户（向上兼容）
		// 使用 ? = ANY(roles) 检查 roles 数组是否包含指定角色
		// 使用括号确保 OR 条件作为一个整体与 is_active 条件组合
		err := s.db.Where("is_active = ? AND (? = ANY(roles) OR ? = ANY(roles) OR ? = ANY(roles))",
			true,
			string(models.RoleAdmin),
			string(models.RoleProjectManager),
			string(models.RoleProductionManager),
		).Find(&users).Error
		if err != nil {
			return nil, err
		}
	} else {
		return nil, fmt.Errorf("invalid manager type: %s", managerType)
	}

	return users, nil
}

// CanManageBusinessInfo 检查用户是否可以管理项目经营信息
// 经营负责人、项目管理员、系统管理员可以管理项目经营信息
func (s *PermissionService) CanManageBusinessInfo(userID string, projectID string) (bool, error) {
	roles, err := s.getUserRoles(userID)
	if err != nil {
		return false, err
	}

	// 系统管理员和项目管理员可以管理所有项目的经营信息
	if utils.IsSystemAdmin(roles) || utils.IsProjectManager(roles) {
		return true, nil
	}

	// 获取项目信息
	var project models.Project
	if err := s.db.First(&project, "id = ?", projectID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, fmt.Errorf("project not found: %s", projectID)
		}
		return false, err
	}

	// 检查是否是项目的经营负责人
	if project.BusinessManagerID != nil && *project.BusinessManagerID == userID {
		return true, nil
	}

	// 检查用户角色是否是经营负责人（全局权限）
	return utils.HasRole(roles, models.RoleBusinessManager), nil
}

// CanManageProductionInfo 检查用户是否可以管理项目生产信息
// 生产负责人、项目管理员、系统管理员可以管理项目生产信息
func (s *PermissionService) CanManageProductionInfo(userID string, projectID string) (bool, error) {
	roles, err := s.getUserRoles(userID)
	if err != nil {
		return false, err
	}

	// 系统管理员和项目管理员可以管理所有项目的生产信息
	if utils.IsSystemAdmin(roles) || utils.IsProjectManager(roles) {
		return true, nil
	}

	// 获取项目信息
	var project models.Project
	if err := s.db.First(&project, "id = ?", projectID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, fmt.Errorf("project not found: %s", projectID)
		}
		return false, err
	}

	// 检查是否是项目的生产负责人
	if project.ProductionManagerID != nil && *project.ProductionManagerID == userID {
		return true, nil
	}

	// 检查用户角色是否是生产负责人（全局权限）
	return utils.HasRole(roles, models.RoleProductionManager), nil
}

// CanManageCompanyRevenue 检查用户是否可以管理公司收入
// 财务人员、系统管理员可以管理公司收入
func (s *PermissionService) CanManageCompanyRevenue(userID string) (bool, error) {
	roles, err := s.getUserRoles(userID)
	if err != nil {
		return false, err
	}

	// 系统管理员具备所有权限
	if utils.IsSystemAdmin(roles) {
		return true, nil
	}

	// 检查是否是财务人员
	return utils.HasRole(roles, models.RoleFinance), nil
}

