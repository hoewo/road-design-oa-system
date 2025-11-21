package services

import (
	"errors"
	"time"

	"gorm.io/gorm"

	"project-oa-backend/internal/models"
	"project-oa-backend/pkg/database"
)

// ContractAmendmentService handles contract amendment-related operations
type ContractAmendmentService struct {
	db *gorm.DB
}

// NewContractAmendmentService creates a new contract amendment service
func NewContractAmendmentService() *ContractAmendmentService {
	return &ContractAmendmentService{
		db: database.DB,
	}
}

// CreateContractAmendmentRequest represents the request to create a contract amendment
type CreateContractAmendmentRequest struct {
	AmendmentNumber string    `json:"amendment_number" binding:"required"`
	SignDate        time.Time `json:"sign_date" binding:"required"`
	FilePath        string    `json:"file_path" binding:"required"`
	Description     string    `json:"description"`
}

// UpdateContractAmendmentRequest represents the request to update a contract amendment
type UpdateContractAmendmentRequest struct {
	AmendmentNumber *string    `json:"amendment_number"`
	SignDate        *time.Time `json:"sign_date"`
	FilePath        *string    `json:"file_path"`
	Description     *string    `json:"description"`
}

// CreateContractAmendment creates a new contract amendment
func (s *ContractAmendmentService) CreateContractAmendment(contractID uint, req *CreateContractAmendmentRequest) (*models.ContractAmendment, error) {
	// Verify contract exists and get sign date
	var contract models.Contract
	if err := s.db.First(&contract, contractID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("contract not found")
		}
		return nil, err
	}

	// Validate amendment number uniqueness
	var existingAmendment models.ContractAmendment
	if err := s.db.Where("amendment_number = ?", req.AmendmentNumber).First(&existingAmendment).Error; err == nil {
		return nil, errors.New("amendment number already exists")
	}

	// Validate sign date
	if req.SignDate.After(time.Now()) {
		return nil, errors.New("sign date cannot be in the future")
	}

	// Validate sign date is not earlier than contract sign date
	if req.SignDate.Before(contract.SignDate) {
		return nil, errors.New("amendment sign date cannot be earlier than contract sign date")
	}

	// Create amendment
	amendment := &models.ContractAmendment{
		AmendmentNumber: req.AmendmentNumber,
		SignDate:        req.SignDate,
		FilePath:        req.FilePath,
		Description:     req.Description,
		ContractID:      contractID,
	}

	if err := s.db.Create(amendment).Error; err != nil {
		return nil, err
	}

	// Load associations
	s.db.Preload("Contract").First(amendment, amendment.ID)

	return amendment, nil
}

// GetContractAmendment retrieves a contract amendment by ID
func (s *ContractAmendmentService) GetContractAmendment(id uint) (*models.ContractAmendment, error) {
	var amendment models.ContractAmendment
	if err := s.db.Preload("Contract").First(&amendment, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("contract amendment not found")
		}
		return nil, err
	}

	return &amendment, nil
}

// ListContractAmendments retrieves all amendments for a contract
func (s *ContractAmendmentService) ListContractAmendments(contractID uint) ([]models.ContractAmendment, error) {
	var amendments []models.ContractAmendment
	if err := s.db.Where("contract_id = ?", contractID).
		Order("sign_date DESC").
		Find(&amendments).Error; err != nil {
		return nil, err
	}

	return amendments, nil
}

// UpdateContractAmendment updates an existing contract amendment
func (s *ContractAmendmentService) UpdateContractAmendment(id uint, req *UpdateContractAmendmentRequest) (*models.ContractAmendment, error) {
	var amendment models.ContractAmendment
	if err := s.db.Preload("Contract").First(&amendment, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("contract amendment not found")
		}
		return nil, err
	}

	// Validate amendment number uniqueness if updating
	if req.AmendmentNumber != nil && *req.AmendmentNumber != amendment.AmendmentNumber {
		var existingAmendment models.ContractAmendment
		if err := s.db.Where("amendment_number = ? AND id != ?", *req.AmendmentNumber, id).First(&existingAmendment).Error; err == nil {
			return nil, errors.New("amendment number already exists")
		}
	}

	// Validate sign date if updating
	if req.SignDate != nil {
		if req.SignDate.After(time.Now()) {
			return nil, errors.New("sign date cannot be in the future")
		}
		if req.SignDate.Before(amendment.Contract.SignDate) {
			return nil, errors.New("amendment sign date cannot be earlier than contract sign date")
		}
	}

	// Update fields
	updates := make(map[string]interface{})
	if req.AmendmentNumber != nil {
		updates["amendment_number"] = *req.AmendmentNumber
	}
	if req.SignDate != nil {
		updates["sign_date"] = *req.SignDate
	}
	if req.FilePath != nil {
		updates["file_path"] = *req.FilePath
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}

	if err := s.db.Model(&amendment).Updates(updates).Error; err != nil {
		return nil, err
	}

	// Reload with associations
	s.db.Preload("Contract").First(&amendment, id)

	return &amendment, nil
}

// DeleteContractAmendment deletes a contract amendment
func (s *ContractAmendmentService) DeleteContractAmendment(id uint) error {
	var amendment models.ContractAmendment
	if err := s.db.First(&amendment, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("contract amendment not found")
		}
		return err
	}

	if err := s.db.Delete(&amendment).Error; err != nil {
		return err
	}

	return nil
}
