package services

import (
	"errors"
	"fmt"
	"gorm.io/gorm"

	"project-oa-backend/internal/models"
	"project-oa-backend/pkg/database"
)

// ProjectContactService 项目联系人服务
type ProjectContactService struct {
	db                *gorm.DB
	permissionService *PermissionService
}

// NewProjectContactService 创建项目联系人服务
func NewProjectContactService() *ProjectContactService {
	return &ProjectContactService{
		db:                database.DB,
		permissionService: NewPermissionService(),
	}
}

// GetProjectContact 获取项目的联系人信息
func (s *ProjectContactService) GetProjectContact(projectID string, userID string) (*models.ProjectContact, error) {
	// 检查权限
	canManage, err := s.permissionService.CanManageBusinessInfo(userID, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to check permission: %w", err)
	}
	if !canManage {
		return nil, errors.New("permission denied: you do not have permission to manage business information for this project")
	}

	var contact models.ProjectContact
	if err := s.db.Where("project_id = ?", projectID).First(&contact).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("project contact not found")
		}
		return nil, err
	}
	return &contact, nil
}

// CreateOrUpdateProjectContact 创建或更新项目联系人
func (s *ProjectContactService) CreateOrUpdateProjectContact(projectID string, clientID string, contactName string, contactPhone string, userID string) (*models.ProjectContact, error) {
	// 检查权限
	canManage, err := s.permissionService.CanManageBusinessInfo(userID, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to check permission: %w", err)
	}
	if !canManage {
		return nil, errors.New("permission denied: you do not have permission to manage business information for this project")
	}

	// 检查项目是否存在
	var project models.Project
	if err := s.db.First(&project, "id = ? AND is_deleted = ?", projectID, false).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("project not found")
		}
		return nil, err
	}

	// 检查甲方是否存在
	var client models.Client
	if err := s.db.First(&client, "id = ?", clientID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("client not found")
		}
		return nil, err
	}

	// 查找是否已存在
	var contact models.ProjectContact
	err = s.db.Where("project_id = ?", projectID).First(&contact).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		// 创建新的联系人
		contact = models.ProjectContact{
			ProjectID:    projectID,
			ClientID:     clientID,
			ContactName:  contactName,
			ContactPhone: contactPhone,
		}
		if err := s.db.Create(&contact).Error; err != nil {
			return nil, err
		}
	} else if err != nil {
		return nil, err
	} else {
		// 更新现有联系人
		contact.ClientID = clientID
		contact.ContactName = contactName
		contact.ContactPhone = contactPhone
		if err := s.db.Save(&contact).Error; err != nil {
			return nil, err
		}
	}

	return &contact, nil
}

// DeleteProjectContact 删除项目联系人
func (s *ProjectContactService) DeleteProjectContact(projectID string, userID string) error {
	// 检查权限
	canManage, err := s.permissionService.CanManageBusinessInfo(userID, projectID)
	if err != nil {
		return fmt.Errorf("failed to check permission: %w", err)
	}
	if !canManage {
		return errors.New("permission denied: you do not have permission to manage business information for this project")
	}

	result := s.db.Where("project_id = ?", projectID).Delete(&models.ProjectContact{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("project contact not found")
	}
	return nil
}
