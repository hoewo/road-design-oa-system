package services

import (
	"errors"

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
	ProjectID      string // UUID string
	VendorName     string
	VendorType     models.ExternalVendorType
	Score          *float64 // 委托方评分（类型从 *int 改为 *float64）
	ContractFileID *string  // UUID string
	// 注意：InvoiceFileID, PaymentAmount, PaymentDate 字段已移除，这些信息通过FinancialRecord管理
	Notes       string
	CreatedByID string // UUID string
}

func (s *ExternalCommissionService) CreateCommission(req *CreateExternalCommissionRequest) (*models.ExternalCommission, error) {
	if req == nil {
		return nil, errors.New("request cannot be nil")
	}
	if req.ProjectID == "" || req.VendorName == "" {
		return nil, errors.New("project_id and vendor_name are required")
	}

	if err := s.ensureProjectExists(req.ProjectID); err != nil {
		return nil, err
	}

	// Convert Score from *int to *float64 if needed
	var score *float64
	if req.Score != nil {
		scoreVal := float64(*req.Score)
		score = &scoreVal
	}

	commission := &models.ExternalCommission{
		ProjectID:      req.ProjectID,
		VendorName:     req.VendorName,
		VendorType:     req.VendorType,
		Score:          score,
		ContractFileID: req.ContractFileID,
		// 注意：InvoiceFileID, PaymentAmount, PaymentDate 字段已移除，这些信息通过FinancialRecord管理
		Notes:       req.Notes,
		CreatedByID: req.CreatedByID,
	}

	if err := s.db.Create(commission).Error; err != nil {
		return nil, err
	}

	s.db.Preload("ContractFile").Preload("CreatedBy").First(commission, "id = ?", commission.ID)
	return commission, nil
}

type ListExternalCommissionParams struct {
	VendorType models.ExternalVendorType
	Page       int
	Size       int
}

func (s *ExternalCommissionService) ListByProject(projectID string, params *ListExternalCommissionParams) ([]models.ExternalCommission, int64, error) {
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
		// 注意：InvoiceFile Preload已移除，因为InvoiceFileID字段已删除
		Order("created_at DESC").
		Offset((page - 1) * size).
		Limit(size).
		Find(&items).Error; err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

func (s *ExternalCommissionService) ensureProjectExists(projectID string) error {
	var project models.Project
	if err := s.db.Select("id").First(&project, "id = ?", projectID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("project not found")
		}
		return err
	}
	return nil
}
