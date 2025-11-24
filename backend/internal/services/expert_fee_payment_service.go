package services

import (
	"errors"

	"gorm.io/gorm"

	"project-oa-backend/internal/models"
	"project-oa-backend/pkg/database"
)

// ExpertFeePaymentService handles expert fee payment-related operations
type ExpertFeePaymentService struct {
	db *gorm.DB
}

// NewExpertFeePaymentService creates a new expert fee payment service
func NewExpertFeePaymentService() *ExpertFeePaymentService {
	return &ExpertFeePaymentService{
		db: database.DB,
	}
}

// CreateExpertFeePaymentRequest represents the request to create an expert fee payment
type CreateExpertFeePaymentRequest struct {
	PaymentMethod models.PaymentMethod `json:"payment_method" binding:"required"`
	Amount        float64              `json:"amount" binding:"required"`
	ExpertName    string               `json:"expert_name" binding:"required"`
	Description   string               `json:"description"`
}

// UpdateExpertFeePaymentRequest represents the request to update an expert fee payment
type UpdateExpertFeePaymentRequest struct {
	PaymentMethod *models.PaymentMethod `json:"payment_method"`
	Amount        *float64              `json:"amount"`
	ExpertName    *string               `json:"expert_name"`
	Description   *string               `json:"description"`
}

// CreateExpertFeePayment creates a new expert fee payment
func (s *ExpertFeePaymentService) CreateExpertFeePayment(projectID uint, createdByID uint, req *CreateExpertFeePaymentRequest) (*models.ExpertFeePayment, error) {
	// Verify project exists
	var project models.Project
	if err := s.db.First(&project, projectID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("project not found")
		}
		return nil, err
	}

	// Validate amount
	if req.Amount <= 0 {
		return nil, errors.New("amount must be greater than 0")
	}

	// Validate payment method
	if req.PaymentMethod != models.PaymentMethodCash && req.PaymentMethod != models.PaymentMethodTransfer {
		return nil, errors.New("payment method must be cash or transfer")
	}

	// Validate expert name
	if len(req.ExpertName) < 2 || len(req.ExpertName) > 50 {
		return nil, errors.New("expert name must be between 2 and 50 characters")
	}

	// Create expert fee payment
	payment := &models.ExpertFeePayment{
		PaymentMethod: req.PaymentMethod,
		Amount:        req.Amount,
		ExpertName:    req.ExpertName,
		ExpertID:      nil, // Expert ID removed, only record expert name
		Description:   req.Description,
		ProjectID:     projectID,
		CreatedByID:   createdByID,
	}

	if err := s.db.Create(payment).Error; err != nil {
		return nil, err
	}

	// Load associations
	s.db.Preload("Project").Preload("Expert").Preload("CreatedBy").First(payment, payment.ID)

	return payment, nil
}

// GetExpertFeePayment retrieves an expert fee payment by ID
func (s *ExpertFeePaymentService) GetExpertFeePayment(id uint) (*models.ExpertFeePayment, error) {
	var payment models.ExpertFeePayment
	if err := s.db.Preload("Project").Preload("Expert").Preload("CreatedBy").First(&payment, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("expert fee payment not found")
		}
		return nil, err
	}

	return &payment, nil
}

// ListExpertFeePaymentsByProject retrieves all expert fee payments for a project
func (s *ExpertFeePaymentService) ListExpertFeePaymentsByProject(projectID uint) ([]models.ExpertFeePayment, error) {
	var payments []models.ExpertFeePayment
	if err := s.db.Where("project_id = ?", projectID).
		Preload("Expert").Preload("CreatedBy").
		Order("created_at DESC").
		Find(&payments).Error; err != nil {
		return nil, err
	}

	return payments, nil
}

// UpdateExpertFeePayment updates an existing expert fee payment
func (s *ExpertFeePaymentService) UpdateExpertFeePayment(id uint, req *UpdateExpertFeePaymentRequest) (*models.ExpertFeePayment, error) {
	var payment models.ExpertFeePayment
	if err := s.db.First(&payment, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("expert fee payment not found")
		}
		return nil, err
	}

	// Validate amount if updating
	if req.Amount != nil {
		if *req.Amount <= 0 {
			return nil, errors.New("amount must be greater than 0")
		}
	}

	// Validate payment method if updating
	if req.PaymentMethod != nil {
		if *req.PaymentMethod != models.PaymentMethodCash && *req.PaymentMethod != models.PaymentMethodTransfer {
			return nil, errors.New("payment method must be cash or transfer")
		}
	}

	// Validate expert name if updating
	if req.ExpertName != nil {
		if len(*req.ExpertName) < 2 || len(*req.ExpertName) > 50 {
			return nil, errors.New("expert name must be between 2 and 50 characters")
		}
	}

	// Update fields
	updates := make(map[string]interface{})
	if req.PaymentMethod != nil {
		updates["payment_method"] = *req.PaymentMethod
	}
	if req.Amount != nil {
		updates["amount"] = *req.Amount
	}
	if req.ExpertName != nil {
		updates["expert_name"] = *req.ExpertName
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}

	if err := s.db.Model(&payment).Updates(updates).Error; err != nil {
		return nil, err
	}

	// Reload with associations
	s.db.Preload("Project").Preload("Expert").Preload("CreatedBy").First(&payment, id)

	return &payment, nil
}

// DeleteExpertFeePayment deletes an expert fee payment
func (s *ExpertFeePaymentService) DeleteExpertFeePayment(id uint) error {
	var payment models.ExpertFeePayment
	if err := s.db.First(&payment, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("expert fee payment not found")
		}
		return err
	}

	if err := s.db.Delete(&payment).Error; err != nil {
		return err
	}

	return nil
}
