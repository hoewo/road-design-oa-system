package services

import (
	"errors"
	"time"

	"gorm.io/gorm"

	"project-oa-backend/internal/models"
	"project-oa-backend/pkg/database"
)

type ExternalCommissionService struct {
	db *gorm.DB
}

func NewExternalCommissionService() *ExternalCommissionService {
	return &ExternalCommissionService{db: database.DB}
}

type CreateExternalCommissionRequest struct {
	ProjectID      uint
	VendorName     string
	VendorType     models.ExternalVendorType
	Score          *int
	ContractFileID *uint
	InvoiceFileID  *uint
	PaymentAmount  float64
	PaymentDate    *time.Time
	Notes          string
	CreatedByID    uint
}

func (s *ExternalCommissionService) CreateCommission(req *CreateExternalCommissionRequest) (*models.ExternalCommission, error) {
	if req == nil {
		return nil, errors.New("request cannot be nil")
	}
	if req.ProjectID == 0 || req.VendorName == "" {
		return nil, errors.New("project_id and vendor_name are required")
	}

	if err := s.ensureProjectExists(req.ProjectID); err != nil {
		return nil, err
	}

	commission := &models.ExternalCommission{
		ProjectID:      req.ProjectID,
		VendorName:     req.VendorName,
		VendorType:     req.VendorType,
		Score:          req.Score,
		ContractFileID: req.ContractFileID,
		InvoiceFileID:  req.InvoiceFileID,
		PaymentAmount:  req.PaymentAmount,
		PaymentDate:    req.PaymentDate,
		Notes:          req.Notes,
		CreatedByID:    req.CreatedByID,
	}

	if err := s.db.Create(commission).Error; err != nil {
		return nil, err
	}

	s.db.Preload("ContractFile").Preload("InvoiceFile").Preload("CreatedBy").First(commission, commission.ID)
	return commission, nil
}

type ListExternalCommissionParams struct {
	VendorType models.ExternalVendorType
	Page       int
	Size       int
}

func (s *ExternalCommissionService) ListByProject(projectID uint, params *ListExternalCommissionParams) ([]models.ExternalCommission, int64, error) {
	query := s.db.Model(&models.ExternalCommission{}).Where("project_id = ?", projectID)
	if params != nil && params.VendorType != "" {
		query = query.Where("vendor_type = ?", params.VendorType)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	page, size := 1, 20
	if params != nil {
		if params.Page > 0 {
			page = params.Page
		}
		if params.Size > 0 && params.Size <= 100 {
			size = params.Size
		}
	}

	var items []models.ExternalCommission
	if err := query.
		Preload("ContractFile").
		Preload("InvoiceFile").
		Order("created_at DESC").
		Offset((page - 1) * size).
		Limit(size).
		Find(&items).Error; err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

func (s *ExternalCommissionService) ensureProjectExists(projectID uint) error {
	var project models.Project
	if err := s.db.Select("id").First(&project, projectID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("project not found")
		}
		return err
	}
	return nil
}
