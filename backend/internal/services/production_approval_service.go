package services

import (
	"errors"
	"time"

	"gorm.io/gorm"

	"project-oa-backend/internal/models"
	"project-oa-backend/pkg/database"
)

type ProductionApprovalService struct {
	db *gorm.DB
}

func NewProductionApprovalService() *ProductionApprovalService {
	return &ProductionApprovalService{db: database.DB}
}

type CreateProductionApprovalRequest struct {
	ProjectID              string // UUID string
	RecordType             models.ProductionApprovalType
	ApproverID             string // UUID string
	Status                 string
	SignedAt               *time.Time
	AttachmentFileID       *string // UUID string
	Remarks                string
	ReportType             models.AuditReportType
	ReportFileID           *string // UUID string
	AmountDesign           float64
	AmountSurvey           float64
	AmountConsultation     float64
	SourceContractID       *string // UUID string
	DefaultAmountReference string
	OverrideReason         string
	CreatedByID            string // UUID string
}

func (s *ProductionApprovalService) CreateApproval(req *CreateProductionApprovalRequest) (*models.ProductionApprovalRecord, error) {
	if req == nil {
		return nil, errors.New("request cannot be nil")
	}
	if req.ProjectID == "" {
		return nil, errors.New("project_id is required")
	}

	if err := s.ensureProjectExists(req.ProjectID); err != nil {
		return nil, err
	}

	record := &models.ProductionApprovalRecord{
		ProjectID:        req.ProjectID,
		RecordType:       req.RecordType,
		ApproverID:       req.ApproverID,
		Status:           req.Status,
		SignedAt:         req.SignedAt,
		AttachmentFileID: req.AttachmentFileID,
		Remarks:          req.Remarks,
		CreatedByID:      req.CreatedByID,
	}

	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(record).Error; err != nil {
			return err
		}

		resolution := &models.AuditResolution{
			ProjectID:              req.ProjectID,
			ApprovalRecordID:       record.ID,
			ReportType:             req.ReportType,
			ReportFileID:           req.ReportFileID,
			AmountDesign:           req.AmountDesign,
			AmountSurvey:           req.AmountSurvey,
			AmountConsultation:     req.AmountConsultation,
			SourceContractID:       req.SourceContractID,
			DefaultAmountReference: req.DefaultAmountReference,
			OverrideReason:         req.OverrideReason,
			CreatedByID:            req.CreatedByID,
		}

		return tx.Create(resolution).Error
	})
	if err != nil {
		return nil, err
	}

	s.db.Preload("Approver").
		Preload("AttachmentFile").
		Preload("AuditResolution").
		Preload("AuditResolution.ReportFile").
		Preload("AuditResolution.ApprovalRecord").
		First(record, "id = ?", record.ID)

	return record, nil
}

type ListApprovalsParams struct {
	Type   *models.ProductionApprovalType
	Status string
	Page   int
	Size   int
}

func (s *ProductionApprovalService) ListApprovals(projectID string, params *ListApprovalsParams) ([]models.ProductionApprovalRecord, int64, error) {
	query := s.db.Model(&models.ProductionApprovalRecord{}).Where("project_id = ?", projectID)

	if params != nil {
		if params.Type != nil {
			query = query.Where("record_type = ?", *params.Type)
		}
		if params.Status != "" {
			query = query.Where("status = ?", params.Status)
		}
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

	var records []models.ProductionApprovalRecord
	if err := query.
		Preload("Approver").
		Preload("AttachmentFile").
		Preload("AuditResolution").
		Preload("AuditResolution.ReportFile").
		Order("created_at DESC").
		Offset((page - 1) * size).
		Limit(size).
		Find(&records).Error; err != nil {
		return nil, 0, err
	}

	return records, total, nil
}

func (s *ProductionApprovalService) ensureProjectExists(projectID string) error {
	var project models.Project
	if err := s.db.Select("id").First(&project, "id = ?", projectID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("project not found")
		}
		return err
	}
	return nil
}
