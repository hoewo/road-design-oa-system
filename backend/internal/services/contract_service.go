package services

import (
	"errors"
	"time"

	"gorm.io/gorm"

	"project-oa-backend/internal/models"
	"project-oa-backend/pkg/database"
)

// ContractService handles contract-related operations
type ContractService struct {
	db               *gorm.DB
	permissionService *PermissionService
}

// NewContractService creates a new contract service
func NewContractService() *ContractService {
	return &ContractService{
		db:               database.DB,
		permissionService: NewPermissionService(),
	}
}

// CreateContractRequest represents the request to create a contract
type CreateContractRequest struct {
	ContractNumber  string    `json:"contract_number" binding:"required"`
	SignDate        time.Time `json:"sign_date" binding:"required"`
	ContractRate    *float64  `json:"contract_rate"`
	ContractAmount  float64   `json:"contract_amount" binding:"gte=0"` // 合同金额由费用明细自动计算，允许为0
	DesignFee       *float64  `json:"design_fee"`
	SurveyFee       *float64  `json:"survey_fee"`
	ConsultationFee *float64  `json:"consultation_fee"`
	ContractFileID  *string   `json:"contract_file_id"` // 合同文件ID
}

// UpdateContractRequest represents the request to update a contract
type UpdateContractRequest struct {
	ContractNumber  *string    `json:"contract_number"`
	SignDate        *time.Time `json:"sign_date"`
	ContractRate    *float64   `json:"contract_rate"`
	ContractAmount  *float64   `json:"contract_amount"`
	DesignFee       *float64   `json:"design_fee"`
	SurveyFee       *float64   `json:"survey_fee"`
	ConsultationFee *float64   `json:"consultation_fee"`
	ContractFileID  *string    `json:"contract_file_id"` // 合同文件ID
}

// CreateContract creates a new contract (UUID string)
func (s *ContractService) CreateContract(projectID string, userID string, req *CreateContractRequest) (*models.Contract, error) {
	// Check permission
	canManage, err := s.permissionService.CanManageBusinessInfo(userID, projectID)
	if err != nil {
		return nil, err
	}
	if !canManage {
		return nil, errors.New("permission denied: you do not have permission to manage business information")
	}

	// Verify project exists
	var project models.Project
	if err := s.db.First(&project, "id = ?", projectID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("project not found")
		}
		return nil, err
	}

	// Validate contract number uniqueness
	var existingContract models.Contract
	if err := s.db.Where("contract_number = ?", req.ContractNumber).First(&existingContract).Error; err == nil {
		return nil, errors.New("contract number already exists")
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

	// Validate contract amount equals sum of fees
	expectedAmount := designFee + surveyFee + consultationFee
	if req.ContractAmount != expectedAmount {
		return nil, errors.New("contract amount must equal the sum of design fee, survey fee, and consultation fee")
	}

	// Validate contract rate if provided
	if req.ContractRate != nil {
		if *req.ContractRate < 0 || *req.ContractRate > 100 {
			return nil, errors.New("contract rate must be between 0 and 100")
		}
	}

	// Create contract
	contract := &models.Contract{
		ContractNumber:  req.ContractNumber,
		SignDate:        req.SignDate,
		ContractRate:    0.0,
		ContractAmount:  req.ContractAmount,
		DesignFee:       designFee,
		SurveyFee:       surveyFee,
		ConsultationFee: consultationFee,
		ProjectID:       projectID,
		ContractFileID:  req.ContractFileID,
	}

	if req.ContractRate != nil {
		contract.ContractRate = *req.ContractRate
	}

	if err := s.db.Create(contract).Error; err != nil {
		return nil, err
	}

	// Load associations
	s.db.Preload("Project").Preload("Amendments").Preload("ContractFile").First(contract, "id = ?", contract.ID)

	return contract, nil
}

// GetContract retrieves a contract by ID (UUID string)
func (s *ContractService) GetContract(id string) (*models.Contract, error) {
	var contract models.Contract
	if err := s.db.Preload("Project").Preload("Amendments").Preload("ContractFile").First(&contract, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("contract not found")
		}
		return nil, err
	}

	return &contract, nil
}

// ListContractsByProject retrieves all contracts for a project (UUID string)
func (s *ContractService) ListContractsByProject(projectID string) ([]models.Contract, error) {
	var contracts []models.Contract
	if err := s.db.Where("project_id = ?", projectID).
		Preload("Amendments").
		Preload("ContractFile").
		Order("sign_date DESC").
		Find(&contracts).Error; err != nil {
		return nil, err
	}

	return contracts, nil
}

// UpdateContract updates an existing contract (UUID string)
func (s *ContractService) UpdateContract(id string, userID string, req *UpdateContractRequest) (*models.Contract, error) {
	var contract models.Contract
	if err := s.db.First(&contract, "id = ?", id).Error; err != nil {
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

	// Validate contract number uniqueness if updating
	if req.ContractNumber != nil && *req.ContractNumber != contract.ContractNumber {
		var existingContract models.Contract
		if err := s.db.Where("contract_number = ? AND id != ?", *req.ContractNumber, id).First(&existingContract).Error; err == nil {
			return nil, errors.New("contract number already exists")
		}
	}

	// Validate sign date if updating (no future date restriction)

	// Calculate fee breakdown
	designFee := contract.DesignFee
	surveyFee := contract.SurveyFee
	consultationFee := contract.ConsultationFee
	if req.DesignFee != nil {
		designFee = *req.DesignFee
	}
	if req.SurveyFee != nil {
		surveyFee = *req.SurveyFee
	}
	if req.ConsultationFee != nil {
		consultationFee = *req.ConsultationFee
	}

	// Validate contract amount if updating
	contractAmount := contract.ContractAmount
	if req.ContractAmount != nil {
		contractAmount = *req.ContractAmount
		expectedAmount := designFee + surveyFee + consultationFee
		if contractAmount != expectedAmount {
			return nil, errors.New("contract amount must equal the sum of design fee, survey fee, and consultation fee")
		}
	}

	// Update fields
	updates := make(map[string]interface{})
	if req.ContractNumber != nil {
		updates["contract_number"] = *req.ContractNumber
	}
	if req.SignDate != nil {
		updates["sign_date"] = *req.SignDate
	}
	if req.ContractRate != nil {
		if *req.ContractRate < 0 || *req.ContractRate > 100 {
			return nil, errors.New("contract rate must be between 0 and 100")
		}
		updates["contract_rate"] = *req.ContractRate
	}
	if req.ContractAmount != nil {
		updates["contract_amount"] = contractAmount
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
	if req.ContractFileID != nil {
		updates["contract_file_id"] = req.ContractFileID
	}

	if err := s.db.Model(&contract).Updates(updates).Error; err != nil {
		return nil, err
	}

	// Reload with associations
	s.db.Preload("Project").Preload("Amendments").Preload("ContractFile").First(&contract, "id = ?", id)

	return &contract, nil
}

// DeleteContract deletes a contract (UUID string)
func (s *ContractService) DeleteContract(id string, userID string) error {
	var contract models.Contract
	if err := s.db.First(&contract, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("contract not found")
		}
		return err
	}

	// Check permission
	canManage, err := s.permissionService.CanManageBusinessInfo(userID, contract.ProjectID)
	if err != nil {
		return err
	}
	if !canManage {
		return errors.New("permission denied: you do not have permission to manage business information")
	}

	// Check if contract has amendments
	var amendmentCount int64
	s.db.Model(&models.ContractAmendment{}).Where("contract_id = ?", id).Count(&amendmentCount)
	if amendmentCount > 0 {
		return errors.New("cannot delete contract with existing amendments")
	}

	if err := s.db.Delete(&contract).Error; err != nil {
		return err
	}

	return nil
}
