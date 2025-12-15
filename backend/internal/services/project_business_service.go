package services

import (
	"errors"

	"gorm.io/gorm"

	"project-oa-backend/internal/models"
	"project-oa-backend/pkg/database"
)

// ProjectBusinessService handles project business information operations
type ProjectBusinessService struct {
	db *gorm.DB
}

// NewProjectBusinessService creates a new project business service
func NewProjectBusinessService() *ProjectBusinessService {
	return &ProjectBusinessService{
		db: database.DB,
	}
}

// ProjectBusiness represents the business information of a project
type ProjectBusiness struct {
	ProjectID            string         `json:"project_id"` // UUID string
	ClientID             *string        `json:"client_id"`  // UUID string
	Client               *models.Client `json:"client,omitempty"`
	ContactName          string         `json:"contact_name"`
	ContactPhone         string         `json:"contact_phone"`
	BusinessManagerIDs   []string       `json:"business_manager_ids"`   // 经营负责人ID列表 (UUID strings)
	BusinessPersonnelIDs []string       `json:"business_personnel_ids"` // 经营人员ID列表 (UUID strings)
}

// UpdateProjectBusinessRequest represents the request to update project business information
type UpdateProjectBusinessRequest struct {
	ClientID             *string  `json:"client_id"` // nil表示删除关联 (UUID string)
	ContactName          *string  `json:"contact_name"`
	ContactPhone         *string  `json:"contact_phone"`
	BusinessManagerIDs   []string `json:"business_manager_ids"`   // 经营负责人ID列表 (UUID strings)
	BusinessPersonnelIDs []string `json:"business_personnel_ids"` // 经营人员ID列表 (UUID strings)
}

// GetProjectBusiness retrieves business information for a project (UUID string)
func (s *ProjectBusinessService) GetProjectBusiness(projectID string) (*ProjectBusiness, error) {
	var project models.Project
	if err := s.db.Preload("Client").Preload("Members").First(&project, "id = ?", projectID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("project not found")
		}
		return nil, err
	}

	business := &ProjectBusiness{
		ProjectID:            project.ID,
		ClientID:             project.ClientID,
		Client:               project.Client,
		ContactName:          "", // 从 ProjectContact 获取
		ContactPhone:         "", // 从 ProjectContact 获取
		BusinessManagerIDs:   []string{},
		BusinessPersonnelIDs: []string{},
	}

	// 从 ProjectContact 获取联系人信息
	var contact models.ProjectContact
	if err := s.db.Where("project_id = ?", projectID).First(&contact).Error; err == nil {
		business.ContactName = contact.ContactName
		business.ContactPhone = contact.ContactPhone
	}

	// 提取经营负责人（从 Project.BusinessManagerID 获取）
	if project.BusinessManagerID != nil && *project.BusinessManagerID != "" {
		business.BusinessManagerIDs = []string{*project.BusinessManagerID}
	}

	// 提取经营人员（从 ProjectMember 获取）
	for _, member := range project.Members {
		if member.Role == models.MemberRoleBusinessPersonnel && member.IsActive {
			business.BusinessPersonnelIDs = append(business.BusinessPersonnelIDs, member.UserID)
		}
	}

	return business, nil
}

// UpdateProjectBusiness updates business information for a project (UUID string)
// userID is required for permission checking when updating project contact
func (s *ProjectBusinessService) UpdateProjectBusiness(projectID string, req *UpdateProjectBusinessRequest, userID string) (*ProjectBusiness, error) {
	// Verify project exists
	var project models.Project
	if err := s.db.First(&project, "id = ?", projectID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("project not found")
		}
		return nil, err
	}

	// Update client association
	if req.ClientID != nil {
		// If ClientID is provided, verify it exists
		if *req.ClientID != "" {
			var client models.Client
			if err := s.db.First(&client, "id = ?", *req.ClientID).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return nil, errors.New("client not found")
				}
				return nil, err
			}
			project.ClientID = req.ClientID
		} else {
			// Empty string or nil means remove association
			project.ClientID = nil
		}
	}

	// Update business manager (通过 Project.BusinessManagerID 配置)
	if len(req.BusinessManagerIDs) > 0 {
		// 验证用户存在
		var user models.User
		if err := s.db.First(&user, "id = ?", req.BusinessManagerIDs[0]).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, errors.New("business manager user not found")
			}
			return nil, err
		}
		project.BusinessManagerID = &req.BusinessManagerIDs[0]
	} else {
		project.BusinessManagerID = nil
	}

	// Update project (client_id and business_manager_id)
	updates := map[string]interface{}{
		"client_id": project.ClientID,
	}
	if project.BusinessManagerID != nil {
		updates["business_manager_id"] = project.BusinessManagerID
	} else {
		updates["business_manager_id"] = nil
		}
	if err := s.db.Model(&project).Updates(updates).Error; err != nil {
			return nil, err
	}

	// Update business personnel through ProjectMember system
	// Remove existing business personnel roles
	s.db.Where("project_id = ? AND role = ?", projectID, models.MemberRoleBusinessPersonnel).Delete(&models.ProjectMember{})

	// Add new business personnel
	for _, userID := range req.BusinessPersonnelIDs {
		// Verify user exists
		var user models.User
		if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				continue // Skip invalid user IDs
			}
			return nil, err
		}

		// Check if user already has this role
		var existingMember models.ProjectMember
		err := s.db.Where("project_id = ? AND user_id = ? AND role = ?", projectID, userID, models.MemberRoleBusinessPersonnel).First(&existingMember).Error
		if err == nil {
			// Already exists, skip
			continue
		}

		// Create new member record
		member := &models.ProjectMember{
			ProjectID: projectID,
			UserID:    userID,
			Role:      models.MemberRoleBusinessPersonnel,
			IsActive:  true,
		}
		if err := s.db.Create(member).Error; err != nil {
			return nil, err
		}
	}

	// Update project contact if contact information is provided
	if req.ContactName != nil || req.ContactPhone != nil {
		// 需要 client_id 来创建/更新项目联系人
		if req.ClientID != nil && *req.ClientID != "" {
			contactService := NewProjectContactService()
			contactName := ""
			if req.ContactName != nil {
				contactName = *req.ContactName
			}
			contactPhone := ""
			if req.ContactPhone != nil {
				contactPhone = *req.ContactPhone
			}
			_, err := contactService.CreateOrUpdateProjectContact(projectID, *req.ClientID, contactName, contactPhone, userID)
			if err != nil {
				// 如果权限检查失败，返回错误
				if err.Error() == "permission denied: you do not have permission to manage business information for this project" {
					return nil, err
				}
				// 其他错误记录但不阻止更新
				// 注意：这里不返回错误，因为联系人更新失败不应该阻止整个业务信息更新
			}
		}
	}

	// Reload and return
	return s.GetProjectBusiness(projectID)
}

// CreateClientInBusinessInfo creates a new client in the context of business information
// Note: This method requires userID and projectID for permission checking
func (s *ProjectBusinessService) CreateClientInBusinessInfo(req *CreateClientRequest, userID string, projectID string) (*models.Client, error) {
	clientService := NewClientService()
	projectIDPtr := &projectID
	return clientService.CreateClient(req, userID, projectIDPtr)
}
