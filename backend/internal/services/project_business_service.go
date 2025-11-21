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
	ProjectID            uint           `json:"project_id"`
	ClientID             *uint          `json:"client_id"`
	Client               *models.Client `json:"client,omitempty"`
	ContactName          string         `json:"contact_name"`
	ContactPhone         string         `json:"contact_phone"`
	BusinessManagerIDs   []uint         `json:"business_manager_ids"`   // 经营负责人ID列表
	BusinessPersonnelIDs []uint         `json:"business_personnel_ids"` // 经营人员ID列表
}

// UpdateProjectBusinessRequest represents the request to update project business information
type UpdateProjectBusinessRequest struct {
	ClientID             *uint   `json:"client_id"` // nil表示删除关联
	ContactName          *string `json:"contact_name"`
	ContactPhone         *string `json:"contact_phone"`
	BusinessManagerIDs   []uint  `json:"business_manager_ids"`   // 经营负责人ID列表
	BusinessPersonnelIDs []uint  `json:"business_personnel_ids"` // 经营人员ID列表
}

// GetProjectBusiness retrieves business information for a project
func (s *ProjectBusinessService) GetProjectBusiness(projectID uint) (*ProjectBusiness, error) {
	var project models.Project
	if err := s.db.Preload("Client").Preload("Members").First(&project, projectID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("project not found")
		}
		return nil, err
	}

	business := &ProjectBusiness{
		ProjectID:            project.ID,
		ClientID:             project.ClientID,
		Client:               project.Client,
		ContactName:          "", // 从项目或单独字段获取
		ContactPhone:         "", // 从项目或单独字段获取
		BusinessManagerIDs:   []uint{},
		BusinessPersonnelIDs: []uint{},
	}

	// 提取经营负责人和经营人员
	for _, member := range project.Members {
		if member.Role == models.MemberRoleBusinessManager && member.IsActive {
			business.BusinessManagerIDs = append(business.BusinessManagerIDs, member.UserID)
		}
		if member.Role == models.MemberRoleBusinessPersonnel && member.IsActive {
			business.BusinessPersonnelIDs = append(business.BusinessPersonnelIDs, member.UserID)
		}
	}

	return business, nil
}

// UpdateProjectBusiness updates business information for a project
func (s *ProjectBusinessService) UpdateProjectBusiness(projectID uint, req *UpdateProjectBusinessRequest) (*ProjectBusiness, error) {
	// Verify project exists
	var project models.Project
	if err := s.db.First(&project, projectID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("project not found")
		}
		return nil, err
	}

	// Update client association
	if req.ClientID != nil {
		// If ClientID is provided, verify it exists
		if *req.ClientID != 0 {
			var client models.Client
			if err := s.db.First(&client, *req.ClientID).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return nil, errors.New("client not found")
				}
				return nil, err
			}
			project.ClientID = req.ClientID
		} else {
			// 0 or nil means remove association
			project.ClientID = nil
		}
	}

	// Update project
	if err := s.db.Model(&project).Update("client_id", project.ClientID).Error; err != nil {
		return nil, err
	}

	// Update business manager and personnel through ProjectMember system
	// Remove existing business manager and personnel roles
	s.db.Where("project_id = ? AND role IN (?)", projectID, []models.MemberRole{
		models.MemberRoleBusinessManager,
		models.MemberRoleBusinessPersonnel,
	}).Delete(&models.ProjectMember{})

	// Add new business managers
	for _, userID := range req.BusinessManagerIDs {
		// Verify user exists
		var user models.User
		if err := s.db.First(&user, userID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				continue // Skip invalid user IDs
			}
			return nil, err
		}

		// Check if user already has this role (should not happen after delete, but check anyway)
		var existingMember models.ProjectMember
		err := s.db.Where("project_id = ? AND user_id = ? AND role = ?", projectID, userID, models.MemberRoleBusinessManager).First(&existingMember).Error
		if err == nil {
			// Already exists, skip
			continue
		}

		// Create new member record
		member := &models.ProjectMember{
			ProjectID: projectID,
			UserID:    userID,
			Role:      models.MemberRoleBusinessManager,
			IsActive:  true,
		}
		if err := s.db.Create(member).Error; err != nil {
			return nil, err
		}
	}

	// Add new business personnel
	for _, userID := range req.BusinessPersonnelIDs {
		// Verify user exists
		var user models.User
		if err := s.db.First(&user, userID).Error; err != nil {
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

	// Reload and return
	return s.GetProjectBusiness(projectID)
}

// CreateClientInBusinessInfo creates a new client in the context of business information
func (s *ProjectBusinessService) CreateClientInBusinessInfo(req *CreateClientRequest) (*models.Client, error) {
	clientService := NewClientService()
	return clientService.CreateClient(req)
}
