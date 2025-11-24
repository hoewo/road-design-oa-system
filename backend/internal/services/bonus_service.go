package services

import (
	"errors"

	"gorm.io/gorm"

	"project-oa-backend/internal/models"
	"project-oa-backend/pkg/database"
)

// BonusService handles bonus-related operations
type BonusService struct {
	db *gorm.DB
}

// NewBonusService creates a new bonus service
func NewBonusService() *BonusService {
	return &BonusService{
		db: database.DB,
	}
}

// CreateBonusRequest represents the request to create a bonus
type CreateBonusRequest struct {
	UserID      uint             `json:"user_id" binding:"required"`
	BonusType   models.BonusType `json:"bonus_type" binding:"required"`
	Amount      float64          `json:"amount" binding:"required"`
	Description string           `json:"description"`
}

// CreateBonus creates a new bonus
func (s *BonusService) CreateBonus(projectID uint, createdByID uint, req *CreateBonusRequest) (*models.Bonus, error) {
	// Verify project exists
	var project models.Project
	if err := s.db.First(&project, projectID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("project not found")
		}
		return nil, err
	}

	// Verify user exists
	var user models.User
	if err := s.db.First(&user, req.UserID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}

	// Validate amount
	if req.Amount < 0 {
		return nil, errors.New("amount must be greater than or equal to 0")
	}

	// Validate bonus type
	if req.BonusType != models.BonusTypeBusiness && req.BonusType != models.BonusTypeProduction {
		return nil, errors.New("bonus type must be business or production")
	}

	// Check if bonus already exists for this user, project, and type
	var existingBonus models.Bonus
	if err := s.db.Where("project_id = ? AND user_id = ? AND bonus_type = ?", projectID, req.UserID, req.BonusType).
		First(&existingBonus).Error; err == nil {
		return nil, errors.New("bonus already exists for this user, project, and type")
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	// Create bonus
	bonus := &models.Bonus{
		ProjectID:   projectID,
		UserID:      req.UserID,
		BonusType:   req.BonusType,
		Amount:      req.Amount,
		Description: req.Description,
		CreatedByID: createdByID,
	}

	if err := s.db.Create(bonus).Error; err != nil {
		return nil, err
	}

	// Load associations
	if err := s.db.Preload("Project").Preload("User").Preload("CreatedBy").First(bonus, bonus.ID).Error; err != nil {
		return nil, err
	}

	return bonus, nil
}

// ListBonusesByProject retrieves all bonuses for a project
func (s *BonusService) ListBonusesByProject(projectID uint) ([]models.Bonus, error) {
	// Verify project exists
	var project models.Project
	if err := s.db.First(&project, projectID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("project not found")
		}
		return nil, err
	}

	var bonuses []models.Bonus
	if err := s.db.Where("project_id = ?", projectID).
		Preload("User").
		Preload("CreatedBy").
		Order("created_at DESC").
		Find(&bonuses).Error; err != nil {
		return nil, err
	}

	return bonuses, nil
}

// UpdateBonusRequest represents the request to update a bonus
type UpdateBonusRequest struct {
	UserID      *uint             `json:"user_id"`
	BonusType   *models.BonusType `json:"bonus_type"`
	Amount      *float64          `json:"amount"`
	Description *string           `json:"description"`
}

// UpdateBonus updates an existing bonus record (allows modification of business fields except system fields)
func (s *BonusService) UpdateBonus(bonusID uint, req *UpdateBonusRequest) (*models.Bonus, error) {
	var bonus models.Bonus
	if err := s.db.First(&bonus, bonusID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("bonus not found")
		}
		return nil, err
	}

	// Update fields if provided
	if req.UserID != nil {
		// Verify user exists
		var user models.User
		if err := s.db.First(&user, *req.UserID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, errors.New("user not found")
			}
			return nil, err
		}
		bonus.UserID = *req.UserID
	}

	if req.BonusType != nil {
		// Validate bonus type
		if *req.BonusType != models.BonusTypeBusiness && *req.BonusType != models.BonusTypeProduction {
			return nil, errors.New("bonus type must be business or production")
		}
		bonus.BonusType = *req.BonusType
	}

	if req.Amount != nil {
		if *req.Amount < 0 {
			return nil, errors.New("amount must be greater than or equal to 0")
		}
		bonus.Amount = *req.Amount
	}

	if req.Description != nil {
		bonus.Description = *req.Description
	}

	if err := s.db.Save(&bonus).Error; err != nil {
		return nil, err
	}

	// Load associations
	if err := s.db.Preload("Project").Preload("User").Preload("CreatedBy").First(&bonus, bonus.ID).Error; err != nil {
		return nil, err
	}

	return &bonus, nil
}

// DeleteBonus deletes a bonus record (statistics will be automatically updated when GetBonuses is called)
func (s *BonusService) DeleteBonus(bonusID uint) error {
	var bonus models.Bonus
	if err := s.db.First(&bonus, bonusID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("bonus not found")
		}
		return err
	}

	// Delete the bonus
	if err := s.db.Delete(&bonus).Error; err != nil {
		return err
	}

	// Statistics will be automatically updated when ListBonusesByProject is called
	// No need to manually update here as the calculation is done on-the-fly

	return nil
}
