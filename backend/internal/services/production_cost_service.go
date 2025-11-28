package services

import (
	"errors"
	"time"

	"gorm.io/gorm"

	"project-oa-backend/internal/models"
	"project-oa-backend/pkg/database"
)

type ProductionCostService struct {
	db *gorm.DB
}

func NewProductionCostService() *ProductionCostService {
	return &ProductionCostService{db: database.DB}
}

type CreateProductionCostRequest struct {
	ProjectID    uint
	CostType     models.ProductionCostType
	Amount       float64
	Description  string
	IncurredAt   *time.Time
	CommissionID *uint
	CreatedByID  uint
}

func (s *ProductionCostService) CreateCost(req *CreateProductionCostRequest) (*models.ProductionCost, error) {
	if req == nil {
		return nil, errors.New("request cannot be nil")
	}
	if req.ProjectID == 0 {
		return nil, errors.New("project_id is required")
	}
	if req.Amount <= 0 {
		return nil, errors.New("amount must be greater than zero")
	}

	if err := s.ensureProjectExists(req.ProjectID); err != nil {
		return nil, err
	}

	if req.CommissionID != nil {
		if err := s.ensureCommissionBelongsToProject(*req.CommissionID, req.ProjectID); err != nil {
			return nil, err
		}
	}

	cost := &models.ProductionCost{
		ProjectID:    req.ProjectID,
		CostType:     req.CostType,
		Amount:       req.Amount,
		Description:  req.Description,
		IncurredAt:   req.IncurredAt,
		CommissionID: req.CommissionID,
		CreatedByID:  req.CreatedByID,
	}

	if err := s.db.Create(cost).Error; err != nil {
		return nil, err
	}

	s.db.Preload("Commission").Preload("CreatedBy").First(cost, cost.ID)
	return cost, nil
}

func (s *ProductionCostService) ListCosts(projectID uint) ([]models.ProductionCost, error) {
	var costs []models.ProductionCost
	if err := s.db.
		Where("project_id = ?", projectID).
		Preload("Commission").
		Preload("Commission.ContractFile").
		Preload("Commission.InvoiceFile").
		Order("incurred_at DESC, created_at DESC").
		Find(&costs).Error; err != nil {
		return nil, err
	}
	return costs, nil
}

func (s *ProductionCostService) ensureProjectExists(projectID uint) error {
	var project models.Project
	if err := s.db.Select("id").First(&project, projectID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("project not found")
		}
		return err
	}
	return nil
}

func (s *ProductionCostService) ensureCommissionBelongsToProject(commissionID, projectID uint) error {
	var commission models.ExternalCommission
	if err := s.db.First(&commission, commissionID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("external commission not found")
		}
		return err
	}
	if commission.ProjectID != projectID {
		return errors.New("commission does not belong to project")
	}
	return nil
}
