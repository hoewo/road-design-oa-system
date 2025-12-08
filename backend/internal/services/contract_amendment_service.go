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
// 注意：FilePath字段已移除，文件通过File实体关联
type CreateContractAmendmentRequest struct {
	AmendmentNumber string    `json:"amendment_number" binding:"required"`
	SignDate        time.Time `json:"sign_date" binding:"required"`
	Description     string    `json:"description"`
	// 金额明细（按设计费、勘察费、咨询费分别录入）
	DesignFee       *float64 `json:"design_fee"`       // 设计费
	SurveyFee       *float64 `json:"survey_fee"`       // 勘察费
	ConsultationFee *float64 `json:"consultation_fee"` // 咨询费
	ContractRate    *float64 `json:"contract_rate"`    // 合同费率%
}

// UpdateContractAmendmentRequest represents the request to update a contract amendment
// 注意：FilePath字段已移除，文件通过File实体关联
type UpdateContractAmendmentRequest struct {
	AmendmentNumber *string    `json:"amendment_number"`
	SignDate        *time.Time `json:"sign_date"`
	Description     *string    `json:"description"`
	// 金额明细（按设计费、勘察费、咨询费分别录入）
	DesignFee       *float64 `json:"design_fee"`       // 设计费
	SurveyFee       *float64 `json:"survey_fee"`       // 勘察费
	ConsultationFee *float64 `json:"consultation_fee"` // 咨询费
	ContractRate    *float64 `json:"contract_rate"`    // 合同费率%
}

// CreateContractAmendment creates a new contract amendment (UUID string)
func (s *ContractAmendmentService) CreateContractAmendment(contractID string, req *CreateContractAmendmentRequest) (*models.ContractAmendment, error) {
	// Verify contract exists and get sign date
	var contract models.Contract
	if err := s.db.First(&contract, "id = ?", contractID).Error; err != nil {
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

	// Set default values for fee breakdown
	designFee := 0.0
	surveyFee := 0.0
	consultationFee := 0.0
	if req.DesignFee != nil {
		designFee = *req.DesignFee
	}
	if req.SurveyFee != nil {
		surveyFee = *req.SurveyFee
	}
	if req.ConsultationFee != nil {
		consultationFee = *req.ConsultationFee
	}

	// Create amendment
	amendment := &models.ContractAmendment{
		AmendmentNumber: req.AmendmentNumber,
		SignDate:        req.SignDate,
		Description:     req.Description,
		DesignFee:       designFee,
		SurveyFee:       surveyFee,
		ConsultationFee: consultationFee,
		ContractID:      contractID,
	}

	// Set contract rate if provided
	if req.ContractRate != nil {
		amendment.ContractRate = *req.ContractRate
	}

	if err := s.db.Create(amendment).Error; err != nil {
		return nil, err
	}

	// Load associations
	s.db.Preload("Contract").First(amendment, "id = ?", amendment.ID)

	return amendment, nil
}

// GetContractAmendment retrieves a contract amendment by ID (UUID string)
func (s *ContractAmendmentService) GetContractAmendment(id string) (*models.ContractAmendment, error) {
	var amendment models.ContractAmendment
	if err := s.db.Preload("Contract").First(&amendment, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("contract amendment not found")
		}
		return nil, err
	}

	return &amendment, nil
}

// ListContractAmendments retrieves all amendments for a contract (UUID string)
func (s *ContractAmendmentService) ListContractAmendments(contractID string) ([]models.ContractAmendment, error) {
	var amendments []models.ContractAmendment
	if err := s.db.Where("contract_id = ?", contractID).
		Order("sign_date DESC").
		Find(&amendments).Error; err != nil {
		return nil, err
	}

	return amendments, nil
}

// UpdateContractAmendment updates an existing contract amendment (UUID string)
func (s *ContractAmendmentService) UpdateContractAmendment(id string, req *UpdateContractAmendmentRequest) (*models.ContractAmendment, error) {
	var amendment models.ContractAmendment
	if err := s.db.Preload("Contract").First(&amendment, "id = ?", id).Error; err != nil {
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
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.DesignFee != nil {
		updates["design_fee"] = *req.DesignFee
	}
	if req.SurveyFee != nil {
		updates["survey_fee"] = *req.SurveyFee
	}
	if req.ConsultationFee != nil {
		updates["consultation_fee"] = *req.ConsultationFee
	}
	if req.ContractRate != nil {
		updates["contract_rate"] = *req.ContractRate
	}

	if err := s.db.Model(&amendment).Updates(updates).Error; err != nil {
		return nil, err
	}

	// Reload with associations
	s.db.Preload("Contract").First(&amendment, "id = ?", id)

	return &amendment, nil
}

// DeleteContractAmendment deletes a contract amendment (UUID string)
func (s *ContractAmendmentService) DeleteContractAmendment(id string) error {
	var amendment models.ContractAmendment
	if err := s.db.First(&amendment, "id = ?", id).Error; err != nil {
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
