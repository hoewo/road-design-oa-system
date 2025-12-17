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
	db               *gorm.DB
	permissionService *PermissionService
}

// NewContractAmendmentService creates a new contract amendment service
func NewContractAmendmentService() *ContractAmendmentService {
	return &ContractAmendmentService{
		db:               database.DB,
		permissionService: NewPermissionService(),
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
	AmendmentFileID *string  `json:"amendment_file_id"` // 补充协议文件ID
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
	AmendmentFileID *string  `json:"amendment_file_id"` // 补充协议文件ID
}

// CreateContractAmendment creates a new contract amendment (UUID string)
func (s *ContractAmendmentService) CreateContractAmendment(contractID string, userID string, req *CreateContractAmendmentRequest) (*models.ContractAmendment, error) {
	// Verify contract exists and get sign date
	var contract models.Contract
	if err := s.db.First(&contract, "id = ?", contractID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("contract not found")
		}
		return nil, err
	}

	// Check permission
	canManage, err := s.permissionService.CanManageBusinessInfo(userID, contract.ProjectID)
	if err != nil {
		return nil, err
	}
	if !canManage {
		return nil, errors.New("permission denied: you do not have permission to manage business information")
	}

	// Validate amendment number uniqueness
	var existingAmendment models.ContractAmendment
	if err := s.db.Where("amendment_number = ?", req.AmendmentNumber).First(&existingAmendment).Error; err == nil {
		return nil, errors.New("amendment number already exists")
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

	// Calculate amendment amount
	amendmentAmount := designFee + surveyFee + consultationFee

	// Create amendment
	amendment := &models.ContractAmendment{
		AmendmentNumber: req.AmendmentNumber,
		SignDate:        req.SignDate,
		Description:     req.Description,
		DesignFee:       designFee,
		SurveyFee:       surveyFee,
		ConsultationFee: consultationFee,
		AmendmentAmount: amendmentAmount,
		ContractID:      contractID,
		AmendmentFileID: req.AmendmentFileID,
	}

	// Set contract rate if provided
	if req.ContractRate != nil {
		amendment.ContractRate = *req.ContractRate
	}

	if err := s.db.Create(amendment).Error; err != nil {
		return nil, err
	}

	// Load associations
	s.db.Preload("Contract").Preload("AmendmentFile").First(amendment, "id = ?", amendment.ID)

	return amendment, nil
}

// GetContractAmendment retrieves a contract amendment by ID (UUID string)
func (s *ContractAmendmentService) GetContractAmendment(id string) (*models.ContractAmendment, error) {
	var amendment models.ContractAmendment
	if err := s.db.Preload("Contract").Preload("AmendmentFile").First(&amendment, "id = ?", id).Error; err != nil {
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
		Preload("AmendmentFile").
		Order("sign_date DESC").
		Find(&amendments).Error; err != nil {
		return nil, err
	}

	return amendments, nil
}

// UpdateContractAmendment updates an existing contract amendment (UUID string)
func (s *ContractAmendmentService) UpdateContractAmendment(id string, userID string, req *UpdateContractAmendmentRequest) (*models.ContractAmendment, error) {
	var amendment models.ContractAmendment
	if err := s.db.Preload("Contract").First(&amendment, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("contract amendment not found")
		}
		return nil, err
	}

	// Check permission
	canManage, err := s.permissionService.CanManageBusinessInfo(userID, amendment.Contract.ProjectID)
	if err != nil {
		return nil, err
	}
	if !canManage {
		return nil, errors.New("permission denied: you do not have permission to manage business information")
	}

	// Validate amendment number uniqueness if updating
	if req.AmendmentNumber != nil && *req.AmendmentNumber != amendment.AmendmentNumber {
		var existingAmendment models.ContractAmendment
		if err := s.db.Where("amendment_number = ? AND id != ?", *req.AmendmentNumber, id).First(&existingAmendment).Error; err == nil {
			return nil, errors.New("amendment number already exists")
		}
	}

	// Validate sign date if updating (no future date restriction)

	// Calculate fee breakdown
	designFee := amendment.DesignFee
	surveyFee := amendment.SurveyFee
	consultationFee := amendment.ConsultationFee
	if req.DesignFee != nil {
		designFee = *req.DesignFee
	}
	if req.SurveyFee != nil {
		surveyFee = *req.SurveyFee
	}
	if req.ConsultationFee != nil {
		consultationFee = *req.ConsultationFee
	}

	// Calculate amendment amount
	amendmentAmount := designFee + surveyFee + consultationFee

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
		updates["design_fee"] = designFee
	}
	if req.SurveyFee != nil {
		updates["survey_fee"] = surveyFee
	}
	if req.ConsultationFee != nil {
		updates["consultation_fee"] = consultationFee
	}
	if req.DesignFee != nil || req.SurveyFee != nil || req.ConsultationFee != nil {
		updates["amendment_amount"] = amendmentAmount
	}
	if req.ContractRate != nil {
		updates["contract_rate"] = *req.ContractRate
	}
	if req.AmendmentFileID != nil {
		updates["amendment_file_id"] = req.AmendmentFileID
	}

	if err := s.db.Model(&amendment).Updates(updates).Error; err != nil {
		return nil, err
	}

	// Reload with associations
	s.db.Preload("Contract").Preload("AmendmentFile").First(&amendment, "id = ?", id)

	return &amendment, nil
}

// DeleteContractAmendment deletes a contract amendment (UUID string)
func (s *ContractAmendmentService) DeleteContractAmendment(id string, userID string) error {
	var amendment models.ContractAmendment
	if err := s.db.Preload("Contract").First(&amendment, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("contract amendment not found")
		}
		return err
	}

	// Check permission
	canManage, err := s.permissionService.CanManageBusinessInfo(userID, amendment.Contract.ProjectID)
	if err != nil {
		return err
	}
	if !canManage {
		return errors.New("permission denied: you do not have permission to manage business information")
	}

	if err := s.db.Delete(&amendment).Error; err != nil {
		return err
	}

	return nil
}
