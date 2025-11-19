package services

import (
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"

	"project-oa-backend/internal/models"
	"project-oa-backend/internal/types"
	"project-oa-backend/pkg/database"
)

// ProjectService handles project-related operations
type ProjectService struct {
	db *gorm.DB
}

// NewProjectService creates a new project service
func NewProjectService() *ProjectService {
	return &ProjectService{
		db: database.DB,
	}
}

// CreateProjectRequest represents the request to create a project
// Note: client_id is NOT included as client information is managed separately in project business information module
type CreateProjectRequest struct {
	ProjectName     string      `json:"project_name" binding:"required"`
	ProjectNumber   string      `json:"project_number" binding:"required"`
	StartDate       *types.Date `json:"start_date"`
	ProjectOverview string      `json:"project_overview"`
	DrawingUnit     string      `json:"drawing_unit"`
	ManagerID       *uint       `json:"manager_id"`
}

// UpdateProjectRequest represents the request to update a project
type UpdateProjectRequest struct {
	ProjectName     *string               `json:"project_name"`
	StartDate       *types.Date           `json:"start_date"`
	ProjectOverview *string               `json:"project_overview"`
	DrawingUnit     *string               `json:"drawing_unit"`
	Status          *models.ProjectStatus `json:"status"`
}

// ListProjectsParams represents parameters for listing projects
type ListProjectsParams struct {
	Page    int
	Size    int
	Status  string
	Keyword string
}

// CreateProject creates a new project
func (s *ProjectService) CreateProject(req *CreateProjectRequest) (*models.Project, error) {
	// Validate project number uniqueness
	var existingProject models.Project
	if err := s.db.Where("project_number = ?", req.ProjectNumber).First(&existingProject).Error; err == nil {
		return nil, errors.New("project number already exists")
	}

	// Note: Client validation removed - client information is managed separately in project business information module

	// Validate manager exists (if provided)
	if req.ManagerID != nil {
		var manager models.User
		if err := s.db.First(&manager, *req.ManagerID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, errors.New("manager not found")
			}
			return nil, err
		}
	}

	// Validate start date (if provided)
	var startDate *time.Time
	if req.StartDate != nil {
		if req.StartDate.After(time.Now()) {
			return nil, errors.New("start date cannot be in the future")
		}
		t := req.StartDate.Time
		startDate = &t
	}

	// Create project
	// Note: ClientID is not set during creation - it will be managed in project business information module
	project := &models.Project{
		ProjectName:     req.ProjectName,
		ProjectNumber:   req.ProjectNumber,
		ProjectOverview: req.ProjectOverview,
		DrawingUnit:     req.DrawingUnit,
		Status:          models.StatusPlanning,
		StartDate:       startDate,
		ClientID:        nil, // Client information managed in business information module
		ManagerID:       req.ManagerID,
	}

	if err := s.db.Create(project).Error; err != nil {
		return nil, err
	}

	// Load associations
	s.db.Preload("Client").Preload("Manager").First(project, project.ID)

	return project, nil
}

// GetProject retrieves a project by ID
func (s *ProjectService) GetProject(id uint) (*models.Project, error) {
	var project models.Project
	if err := s.db.Preload("Client").Preload("Manager").First(&project, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("project not found")
		}
		return nil, err
	}

	return &project, nil
}

// ListProjects retrieves a paginated list of projects
func (s *ProjectService) ListProjects(params *ListProjectsParams) ([]models.Project, int64, error) {
	var projects []models.Project
	var total int64

	query := s.db.Model(&models.Project{})

	// Apply filters
	if params.Status != "" {
		query = query.Where("status = ?", params.Status)
	}

	if params.Keyword != "" {
		keyword := fmt.Sprintf("%%%s%%", params.Keyword)
		query = query.Where("project_name ILIKE ? OR project_number ILIKE ?", keyword, keyword)
	}

	// Count total
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Apply pagination
	offset := (params.Page - 1) * params.Size
	if err := query.
		Preload("Client").
		Preload("Manager").
		Order("created_at DESC").
		Offset(offset).
		Limit(params.Size).
		Find(&projects).Error; err != nil {
		return nil, 0, err
	}

	return projects, total, nil
}

// UpdateProject updates an existing project
func (s *ProjectService) UpdateProject(id uint, req *UpdateProjectRequest) (*models.Project, error) {
	var project models.Project
	if err := s.db.First(&project, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("project not found")
		}
		return nil, err
	}

	// Update fields
	updates := make(map[string]interface{})
	if req.ProjectName != nil {
		updates["project_name"] = *req.ProjectName
	}
	if req.StartDate != nil {
		if req.StartDate.After(time.Now()) {
			return nil, errors.New("start date cannot be in the future")
		}
		updates["start_date"] = req.StartDate.Time
	}
	if req.ProjectOverview != nil {
		updates["project_overview"] = *req.ProjectOverview
	}
	if req.DrawingUnit != nil {
		updates["drawing_unit"] = *req.DrawingUnit
	}
	if req.Status != nil {
		updates["status"] = *req.Status
	}

	if err := s.db.Model(&project).Updates(updates).Error; err != nil {
		return nil, err
	}

	// Reload with associations
	s.db.Preload("Client").Preload("Manager").First(&project, id)

	return &project, nil
}

// DeleteProject deletes a project
func (s *ProjectService) DeleteProject(id uint) error {
	var project models.Project
	if err := s.db.First(&project, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("project not found")
		}
		return err
	}

	// Check if project has related data
	var contractCount int64
	s.db.Model(&models.Contract{}).Where("project_id = ?", id).Count(&contractCount)
	if contractCount > 0 {
		return errors.New("cannot delete project with existing contracts")
	}

	if err := s.db.Delete(&project).Error; err != nil {
		return err
	}

	return nil
}
