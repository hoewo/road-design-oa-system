package services

import (
	"errors"
	"time"

	"gorm.io/gorm"

	"project-oa-backend/internal/models"
	"project-oa-backend/pkg/database"
)

// FinancialService handles financial record-related operations
type FinancialService struct {
	db *gorm.DB
}

// NewFinancialService creates a new financial service
func NewFinancialService() *FinancialService {
	return &FinancialService{
		db: database.DB,
	}
}

// CreateFinancialRecordRequest represents the request to create a financial record
type CreateFinancialRecordRequest struct {
	RecordType       models.FinancialType `json:"record_type" binding:"required"`
	FeeType          models.FeeType       `json:"fee_type" binding:"required"`
	ReceivableAmount float64              `json:"receivable_amount" binding:"required"`
	InvoiceNumber    string               `json:"invoice_number"`
	InvoiceDate      *time.Time           `json:"invoice_date"`
	InvoiceAmount    float64              `json:"invoice_amount"`
	PaymentDate      *time.Time           `json:"payment_date"`
	PaymentAmount    float64              `json:"payment_amount"`
	Description      string               `json:"description"`
}

// ProjectFinancial represents aggregated financial information for a project
type ProjectFinancial struct {
	TotalContractAmount float64                     `json:"total_contract_amount"`
	TotalReceivable     float64                     `json:"total_receivable"`
	TotalInvoiced       float64                     `json:"total_invoiced"`
	TotalPaid           float64                     `json:"total_paid"`
	TotalOutstanding    float64                     `json:"total_outstanding"`
	FinancialRecords    []models.FinancialRecord    `json:"financial_records"`
	FeeTypeBreakdown    map[string]FeeTypeFinancial `json:"fee_type_breakdown"`
}

// FeeTypeFinancial represents financial information by fee type
type FeeTypeFinancial struct {
	FeeType     string  `json:"fee_type"`
	Receivable  float64 `json:"receivable"`
	Invoiced    float64 `json:"invoiced"`
	Paid        float64 `json:"paid"`
	Outstanding float64 `json:"outstanding"`
}

// CreateFinancialRecord creates a new financial record
func (s *FinancialService) CreateFinancialRecord(projectID uint, createdByID uint, req *CreateFinancialRecordRequest) (*models.FinancialRecord, error) {
	// Verify project exists
	var project models.Project
	if err := s.db.First(&project, projectID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("project not found")
		}
		return nil, err
	}

	// Validate receivable amount
	if req.ReceivableAmount <= 0 {
		return nil, errors.New("receivable amount must be greater than 0")
	}

	// Validate fee type
	if req.FeeType != models.FeeTypeDesign && req.FeeType != models.FeeTypeSurvey && req.FeeType != models.FeeTypeConsultation {
		return nil, errors.New("fee type must be design_fee, survey_fee, or consultation_fee")
	}

	// Validate invoice amount
	if req.InvoiceAmount < 0 {
		return nil, errors.New("invoice amount must be greater than or equal to 0")
	}
	if req.InvoiceAmount > req.ReceivableAmount {
		return nil, errors.New("invoice amount cannot exceed receivable amount")
	}

	// Validate payment amount
	if req.PaymentAmount < 0 {
		return nil, errors.New("payment amount must be greater than or equal to 0")
	}
	if req.PaymentAmount > req.ReceivableAmount {
		return nil, errors.New("payment amount cannot exceed receivable amount")
	}

	// Calculate unpaid amount
	unpaidAmount := req.ReceivableAmount - req.PaymentAmount

	// Validate dates
	now := time.Now()
	if req.InvoiceDate != nil && req.InvoiceDate.After(now) {
		return nil, errors.New("invoice date cannot be in the future")
	}
	if req.PaymentDate != nil && req.InvoiceDate != nil && req.PaymentDate.Before(*req.InvoiceDate) {
		return nil, errors.New("payment date cannot be earlier than invoice date")
	}

	// Create financial record
	record := &models.FinancialRecord{
		RecordType:       req.RecordType,
		FeeType:          req.FeeType,
		Amount:           req.ReceivableAmount, // 遗留字段，使用receivable_amount的值
		ReceivableAmount: req.ReceivableAmount,
		InvoiceNumber:    req.InvoiceNumber,
		InvoiceDate:      req.InvoiceDate,
		InvoiceAmount:    req.InvoiceAmount,
		PaymentDate:      req.PaymentDate,
		PaymentAmount:    req.PaymentAmount,
		UnpaidAmount:     unpaidAmount,
		Description:      req.Description,
		ProjectID:        projectID,
		CreatedByID:      createdByID,
	}

	if err := s.db.Create(record).Error; err != nil {
		return nil, err
	}

	// Load associations
	if err := s.db.Preload("Project").Preload("CreatedBy").First(record, record.ID).Error; err != nil {
		return nil, err
	}

	return record, nil
}

// GetProjectFinancial retrieves financial information for a project
func (s *FinancialService) GetProjectFinancial(projectID uint) (*ProjectFinancial, error) {
	// Verify project exists
	var project models.Project
	if err := s.db.First(&project, projectID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("project not found")
		}
		return nil, err
	}

	// Get all financial records for the project
	var records []models.FinancialRecord
	if err := s.db.Where("project_id = ?", projectID).
		Preload("CreatedBy").
		Order("created_at DESC").
		Find(&records).Error; err != nil {
		return nil, err
	}

	// Calculate totals
	var totalReceivable, totalInvoiced, totalPaid, totalOutstanding float64
	feeTypeBreakdown := make(map[string]FeeTypeFinancial)

	for _, record := range records {
		totalReceivable += record.ReceivableAmount
		totalInvoiced += record.InvoiceAmount
		totalPaid += record.PaymentAmount
		totalOutstanding += record.UnpaidAmount

		// Aggregate by fee type
		feeTypeStr := string(record.FeeType)
		if breakdown, exists := feeTypeBreakdown[feeTypeStr]; exists {
			breakdown.Receivable += record.ReceivableAmount
			breakdown.Invoiced += record.InvoiceAmount
			breakdown.Paid += record.PaymentAmount
			breakdown.Outstanding += record.UnpaidAmount
			feeTypeBreakdown[feeTypeStr] = breakdown
		} else {
			feeTypeBreakdown[feeTypeStr] = FeeTypeFinancial{
				FeeType:     feeTypeStr,
				Receivable:  record.ReceivableAmount,
				Invoiced:    record.InvoiceAmount,
				Paid:        record.PaymentAmount,
				Outstanding: record.UnpaidAmount,
			}
		}
	}

	// Get total contract amount from contracts
	var totalContractAmount float64
	s.db.Model(&models.Contract{}).
		Where("project_id = ?", projectID).
		Select("COALESCE(SUM(contract_amount), 0)").
		Scan(&totalContractAmount)

	return &ProjectFinancial{
		TotalContractAmount: totalContractAmount,
		TotalReceivable:     totalReceivable,
		TotalInvoiced:       totalInvoiced,
		TotalPaid:           totalPaid,
		TotalOutstanding:    totalOutstanding,
		FinancialRecords:    records,
		FeeTypeBreakdown:    feeTypeBreakdown,
	}, nil
}

// ListFinancialRecordsByProject retrieves all financial records for a project
func (s *FinancialService) ListFinancialRecordsByProject(projectID uint) ([]models.FinancialRecord, error) {
	// Verify project exists
	var project models.Project
	if err := s.db.First(&project, projectID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("project not found")
		}
		return nil, err
	}

	var records []models.FinancialRecord
	if err := s.db.Where("project_id = ?", projectID).
		Preload("CreatedBy").
		Order("created_at DESC").
		Find(&records).Error; err != nil {
		return nil, err
	}

	return records, nil
}

// UpdateFinancialRecordRequest represents the request to update a financial record
type UpdateFinancialRecordRequest struct {
	RecordType       *models.FinancialType `json:"record_type"`
	FeeType          *models.FeeType       `json:"fee_type"`
	ReceivableAmount *float64              `json:"receivable_amount"`
	InvoiceNumber    *string               `json:"invoice_number"`
	InvoiceDate      *time.Time            `json:"invoice_date"`
	InvoiceAmount    *float64              `json:"invoice_amount"`
	PaymentDate      *time.Time            `json:"payment_date"`
	PaymentAmount    *float64              `json:"payment_amount"`
	Description      *string               `json:"description"`
}

// UpdateFinancialRecord updates an existing financial record (allows modification of business fields except system fields)
func (s *FinancialService) UpdateFinancialRecord(recordID uint, req *UpdateFinancialRecordRequest) (*models.FinancialRecord, error) {
	var record models.FinancialRecord
	if err := s.db.First(&record, recordID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("financial record not found")
		}
		return nil, err
	}

	// Update fields if provided
	if req.RecordType != nil {
		record.RecordType = *req.RecordType
	}

	if req.FeeType != nil {
		// Validate fee type
		if *req.FeeType != models.FeeTypeDesign && *req.FeeType != models.FeeTypeSurvey && *req.FeeType != models.FeeTypeConsultation {
			return nil, errors.New("fee type must be design_fee, survey_fee, or consultation_fee")
		}
		record.FeeType = *req.FeeType
	}

	if req.ReceivableAmount != nil {
		if *req.ReceivableAmount <= 0 {
			return nil, errors.New("receivable amount must be greater than 0")
		}
		record.ReceivableAmount = *req.ReceivableAmount
		record.Amount = *req.ReceivableAmount // 遗留字段
	}

	if req.InvoiceNumber != nil {
		record.InvoiceNumber = *req.InvoiceNumber
	}

	if req.InvoiceDate != nil {
		now := time.Now()
		if req.InvoiceDate.After(now) {
			return nil, errors.New("invoice date cannot be in the future")
		}
		record.InvoiceDate = req.InvoiceDate
	}

	if req.InvoiceAmount != nil {
		if *req.InvoiceAmount < 0 {
			return nil, errors.New("invoice amount must be greater than or equal to 0")
		}
		if *req.InvoiceAmount > record.ReceivableAmount {
			return nil, errors.New("invoice amount cannot exceed receivable amount")
		}
		record.InvoiceAmount = *req.InvoiceAmount
	}

	if req.PaymentDate != nil {
		if record.InvoiceDate != nil && req.PaymentDate.Before(*record.InvoiceDate) {
			return nil, errors.New("payment date cannot be earlier than invoice date")
		}
		record.PaymentDate = req.PaymentDate
	}

	if req.PaymentAmount != nil {
		if *req.PaymentAmount < 0 {
			return nil, errors.New("payment amount must be greater than or equal to 0")
		}
		if *req.PaymentAmount > record.ReceivableAmount {
			return nil, errors.New("payment amount cannot exceed receivable amount")
		}
		record.PaymentAmount = *req.PaymentAmount
	}

	if req.Description != nil {
		record.Description = *req.Description
	}

	// Recalculate unpaid amount
	record.UnpaidAmount = record.ReceivableAmount - record.PaymentAmount

	if err := s.db.Save(&record).Error; err != nil {
		return nil, err
	}

	// Load associations
	if err := s.db.Preload("Project").Preload("CreatedBy").First(&record, record.ID).Error; err != nil {
		return nil, err
	}

	return &record, nil
}

// DeleteFinancialRecord deletes a financial record and automatically recalculates statistics
func (s *FinancialService) DeleteFinancialRecord(recordID uint) error {
	var record models.FinancialRecord
	if err := s.db.First(&record, recordID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("financial record not found")
		}
		return err
	}

	// Delete the record
	if err := s.db.Delete(&record).Error; err != nil {
		return err
	}

	// Statistics will be automatically recalculated when GetProjectFinancial is called
	// No need to manually update here as the calculation is done on-the-fly

	return nil
}
