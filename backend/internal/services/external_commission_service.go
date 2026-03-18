package services

import (
	"errors"
	"time"

	"gorm.io/gorm"

	"project-oa-backend/internal/models"
	"project-oa-backend/pkg/database"
)

type ExternalCommissionService struct {
	db                *gorm.DB
	permissionService *PermissionService
	financialService  *FinancialService
}

func NewExternalCommissionService() *ExternalCommissionService {
	return &ExternalCommissionService{
		db:                database.DB,
		permissionService: NewPermissionService(),
		financialService:  NewFinancialService(),
	}
}

// GetPermissionService 获取权限服务（供Handler使用）
func (s *ExternalCommissionService) GetPermissionService() *PermissionService {
	return s.permissionService
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

	// 权限检查
	canManage, err := s.permissionService.CanManageProductionInfo(req.CreatedByID, req.ProjectID)
	if err != nil {
		return nil, err
	}
	if !canManage {
		return nil, errors.New("permission denied: cannot manage production info")
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

// UpdateExternalCommissionRequest 更新对外委托请求
type UpdateExternalCommissionRequest struct {
	VendorName     string
	VendorType     models.ExternalVendorType
	Score          *float64
	ContractFileID *string
	Notes          string
	UpdatedByID    string
}

// GetByID 根据ID获取对外委托记录
func (s *ExternalCommissionService) GetByID(id string) (*models.ExternalCommission, error) {
	var commission models.ExternalCommission
	if err := s.db.
		Preload("ContractFile").
		Preload("CreatedBy").
		First(&commission, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("external commission not found")
		}
		return nil, err
	}
	return &commission, nil
}

// UpdateCommission 更新对外委托记录
func (s *ExternalCommissionService) UpdateCommission(id string, req *UpdateExternalCommissionRequest) (*models.ExternalCommission, error) {
	if req == nil {
		return nil, errors.New("request cannot be nil")
	}

	var commission models.ExternalCommission
	if err := s.db.First(&commission, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("external commission not found")
		}
		return nil, err
	}

	// 权限检查
	canManage, err := s.permissionService.CanManageProductionInfo(req.UpdatedByID, commission.ProjectID)
	if err != nil {
		return nil, err
	}
	if !canManage {
		return nil, errors.New("permission denied: cannot manage production info")
	}

	// 更新字段
	if req.VendorName != "" {
		commission.VendorName = req.VendorName
	}
	if req.VendorType != "" {
		commission.VendorType = req.VendorType
	}
	commission.Score = req.Score
	commission.ContractFileID = req.ContractFileID
	if req.Notes != "" {
		commission.Notes = req.Notes
	}

	if err := s.db.Save(&commission).Error; err != nil {
		return nil, err
	}

	s.db.Preload("ContractFile").Preload("CreatedBy").First(&commission, "id = ?", id)
	return &commission, nil
}

// DeleteCommission 删除对外委托记录
func (s *ExternalCommissionService) DeleteCommission(id string, userID string) error {
	var commission models.ExternalCommission
	if err := s.db.First(&commission, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("external commission not found")
		}
		return err
	}

	// 权限检查
	canManage, err := s.permissionService.CanManageProductionInfo(userID, commission.ProjectID)
	if err != nil {
		return err
	}
	if !canManage {
		return errors.New("permission denied: cannot manage production info")
	}

	// 删除关联的财务记录（委托支付和对方开票）
	if err := s.db.Where("project_id = ? AND financial_type IN ?", commission.ProjectID, []models.FinancialType{
		models.FinancialTypeCommissionPayment,
		models.FinancialTypeVendorInvoice,
	}).Where("vendor_name = ?", commission.VendorName).Delete(&models.FinancialRecord{}).Error; err != nil {
		return err
	}

	// 删除对外委托记录
	if err := s.db.Delete(&commission).Error; err != nil {
		return err
	}

	return nil
}

// CreateCommissionPayment 创建委托支付记录
func (s *ExternalCommissionService) CreateCommissionPayment(commissionID string, amount float64, occurredAt time.Time, createdByID string) (*models.FinancialRecord, error) {
	commission, err := s.GetByID(commissionID)
	if err != nil {
		return nil, err
	}

	// 转换VendorType为FinancialRecord需要的格式
	var commissionType string
	if commission.VendorType == models.ExternalVendorCompany {
		commissionType = "company"
	} else {
		commissionType = "person"
	}

	req := &CreateFinancialRecordRequest{
		FinancialType: models.FinancialTypeCommissionPayment,
		Direction:     models.FinancialDirectionExpense,
		Amount:        amount,
		OccurredAt:    occurredAt,
		CommissionType: &commissionType,
		VendorName:    commission.VendorName,
		VendorScore:   commission.Score,
	}

	return s.financialService.CreateFinancialRecord(commission.ProjectID, createdByID, req)
}

// CreateVendorInvoice 创建对方开票记录
func (s *ExternalCommissionService) CreateVendorInvoice(commissionID string, relatedPaymentID string, amount float64, occurredAt time.Time, createdByID string) (*models.FinancialRecord, error) {
	commission, err := s.GetByID(commissionID)
	if err != nil {
		return nil, err
	}

	// 转换VendorType为FinancialRecord需要的格式
	var commissionType string
	if commission.VendorType == models.ExternalVendorCompany {
		commissionType = "company"
	} else {
		commissionType = "person"
	}

	req := &CreateFinancialRecordRequest{
		FinancialType:       models.FinancialTypeVendorInvoice,
		Direction:           models.FinancialDirectionIncome,
		Amount:              amount,
		OccurredAt:          occurredAt,
		CommissionType:      &commissionType,
		VendorName:          commission.VendorName,
		VendorScore:         commission.Score,
		RelatedCommissionID: &relatedPaymentID,
	}

	return s.financialService.CreateFinancialRecord(commission.ProjectID, createdByID, req)
}

// GetSummary 获取对外委托汇总统计
func (s *ExternalCommissionService) GetSummary(projectID string) (*ExternalCommissionSummary, error) {
	var totalCount int64
	if err := s.db.Model(&models.ExternalCommission{}).Where("project_id = ?", projectID).Count(&totalCount).Error; err != nil {
		return nil, err
	}

	// 获取所有委托支付记录的总金额
	var totalAmount float64
	if err := s.db.Model(&models.FinancialRecord{}).
		Where("project_id = ? AND financial_type = ?", projectID, models.FinancialTypeCommissionPayment).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&totalAmount).Error; err != nil {
		return nil, err
	}

	// 计算平均评分
	var avgScore *float64
	var scoreSum float64
	var scoreCount int64
	if err := s.db.Model(&models.ExternalCommission{}).
		Where("project_id = ? AND score IS NOT NULL", projectID).
		Select("COALESCE(SUM(score), 0)").Scan(&scoreSum).Error; err != nil {
		return nil, err
	}
	if err := s.db.Model(&models.ExternalCommission{}).
		Where("project_id = ? AND score IS NOT NULL", projectID).
		Count(&scoreCount).Error; err != nil {
		return nil, err
	}
	if scoreCount > 0 {
		avg := scoreSum / float64(scoreCount)
		avgScore = &avg
	}

	return &ExternalCommissionSummary{
		TotalCount: totalCount,
		TotalAmount: totalAmount,
		AverageScore: avgScore,
	}, nil
}

// ExternalCommissionSummary 对外委托汇总统计
type ExternalCommissionSummary struct {
	TotalCount   int64    `json:"total_count"`
	TotalAmount  float64  `json:"total_amount"`
	AverageScore *float64 `json:"average_score"`
}

func (s *ExternalCommissionService) ensureProjectExists(projectID string) error {
	var project models.Project
	if err := s.db.Select("id").First(&project, "id = ? AND is_deleted = ?", projectID, false).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("project not found")
		}
		return err
	}
	return nil
}

