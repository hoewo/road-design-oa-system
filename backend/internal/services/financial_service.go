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
	db               *gorm.DB
	permissionService *PermissionService
}

// NewFinancialService creates a new financial service
func NewFinancialService() *FinancialService {
	return &FinancialService{
		db:               database.DB,
		permissionService: NewPermissionService(),
	}
}

// CreateFinancialRecordRequest represents the request to create a financial record
// 支持统一财务记录模型
type CreateFinancialRecordRequest struct {
	FinancialType models.FinancialType      `json:"financial_type" binding:"required"` // 财务类型
	Direction     models.FinancialDirection `json:"direction" binding:"required"`      // 方向：收入/支出
	Amount        float64                   `json:"amount" binding:"required"`         // 金额
	OccurredAt    time.Time                 `json:"occurred_at" binding:"required"`    // 发生时间

	// 类型特定字段（根据FinancialType使用不同字段）
	// 奖金类型
	BonusCategory *models.BonusCategory `json:"bonus_category"` // 奖金类别：经营奖金/生产奖金
	RecipientID   *string               `json:"recipient_id"`   // 发放人员ID（奖金类型必填）

	// 成本类型
	CostCategory *models.CostCategory `json:"cost_category"` // 成本类别：打车/住宿/公共交通
	Mileage      *float64             `json:"mileage"`       // 里程（仅打车类型）

	// 甲方支付/我方开票类型
	ClientID         *string `json:"client_id"`          // 甲方ID
	RelatedPaymentID *string `json:"related_payment_id"` // 关联的甲方支付记录ID（我方开票时使用）

	// 专家费类型
	PaymentMethod *string `json:"payment_method"` // 支付方式：cash/transfer
	ExpertName    string  `json:"expert_name"`    // 专家姓名

	// 委托支付/对方开票类型
	CommissionType      *string  `json:"commission_type"`       // 委托类型：person/company
	VendorName          string   `json:"vendor_name"`           // 委托方名称
	VendorScore         *float64 `json:"vendor_score"`          // 委托方评分
	RelatedCommissionID *string  `json:"related_commission_id"` // 关联的委托支付记录ID（对方开票时使用）

	// 文件关联
	InvoiceFileID *string `json:"invoice_file_id"` // 发票文件ID

	Description string `json:"description"` // 描述
}

// ProjectFinancial represents aggregated financial information for a project
type ProjectFinancial struct {
	TotalContractAmount float64                     `json:"total_contract_amount"`
	TotalReceivable     float64                     `json:"total_receivable"`
	TotalInvoiced       float64                     `json:"total_invoiced"`
	TotalPaid           float64                     `json:"total_paid"`
	TotalOutstanding    float64                     `json:"total_outstanding"`
	ManagementFeeRatio  float64                     `json:"management_fee_ratio"`  // 有效管理费比例（项目级或公司默认）
	ManagementFeeAmount float64                     `json:"management_fee_amount"` // 计算得出的管理费金额
	FinancialRecords    []models.FinancialRecord    `json:"financial_records"`
	FeeTypeBreakdown    map[string]FeeTypeFinancial `json:"fee_type_breakdown"`
}

// FeeTypeFinancial represents financial information by fee type
// 注意：根据新的FinancialRecord模型，费用类型分组逻辑需要重新设计
// 可以根据FinancialType和业务逻辑进行分组（如：按合同类型分组）
type FeeTypeFinancial struct {
	FeeType     string  `json:"fee_type"`    // 费用类型标识（如：design_fee, survey_fee, consultation_fee）
	Receivable  float64 `json:"receivable"`  // 应收金额
	Invoiced    float64 `json:"invoiced"`    // 已开票金额
	Paid        float64 `json:"paid"`        // 已支付金额
	Outstanding float64 `json:"outstanding"` // 未收金额
}

// CreateFinancialRecord creates a new financial record (UUID string)
func (s *FinancialService) CreateFinancialRecord(projectID string, createdByID string, req *CreateFinancialRecordRequest) (*models.FinancialRecord, error) {
	// Verify project exists
	var project models.Project
	if err := s.db.First(&project, "id = ? AND is_deleted = ?", projectID, false).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("project not found")
		}
		return nil, err
	}

	// Check permission for business-related financial records
	if req.FinancialType == models.FinancialTypeClientPayment ||
		req.FinancialType == models.FinancialTypeOurInvoice ||
		(req.FinancialType == models.FinancialTypeBonus && req.BonusCategory != nil && *req.BonusCategory == models.BonusCategoryBusiness) {
		canManage, err := s.permissionService.CanManageBusinessInfo(createdByID, projectID)
		if err != nil {
			return nil, err
		}
		if !canManage {
			return nil, errors.New("permission denied: you do not have permission to manage business information")
		}
	}

	// Check permission for production-related financial records
	if req.FinancialType == models.FinancialTypeCost ||
		(req.FinancialType == models.FinancialTypeBonus && req.BonusCategory != nil && *req.BonusCategory == models.BonusCategoryProduction) {
		canManage, err := s.permissionService.CanManageProductionInfo(createdByID, projectID)
		if err != nil {
			return nil, err
		}
		if !canManage {
			return nil, errors.New("permission denied: you do not have permission to manage production information")
		}
	}

	// Validate amount
	if req.Amount <= 0 {
		return nil, errors.New("amount must be greater than 0")
	}

	// Validate occurred_at (no future date restriction)

	// Validate type-specific fields based on FinancialType
	switch req.FinancialType {
	case models.FinancialTypeBonus:
		if req.BonusCategory == nil {
			return nil, errors.New("bonus_category is required for bonus type")
		}
		if req.RecipientID == nil || *req.RecipientID == "" {
			return nil, errors.New("recipient_id is required for bonus type")
		}
		// Verify recipient exists
		var recipient models.User
		if err := s.db.First(&recipient, "id = ?", *req.RecipientID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, errors.New("recipient not found")
			}
			return nil, err
		}

	case models.FinancialTypeCost:
		if req.CostCategory == nil {
			return nil, errors.New("cost_category is required for cost type")
		}

	case models.FinancialTypeClientPayment, models.FinancialTypeOurInvoice:
		if req.ClientID == nil || *req.ClientID == "" {
			return nil, errors.New("client_id is required for client payment/our invoice type")
		}
		// Verify client exists
		var client models.Client
		if err := s.db.First(&client, "id = ?", *req.ClientID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, errors.New("client not found")
			}
			return nil, err
		}

	case models.FinancialTypeExpertFee:
		if req.ExpertName == "" {
			return nil, errors.New("expert_name is required for expert fee type")
		}

	case models.FinancialTypeCommissionPayment, models.FinancialTypeVendorInvoice:
		if req.VendorName == "" {
			return nil, errors.New("vendor_name is required for commission payment/vendor invoice type")
		}
	}

	// Create financial record
	record := &models.FinancialRecord{
		ProjectID:     projectID,
		FinancialType: req.FinancialType,
		Direction:     req.Direction,
		Amount:        req.Amount,
		OccurredAt:    req.OccurredAt,
		Description:   req.Description,
		CreatedByID:   createdByID,

		// Type-specific fields
		BonusCategory:       req.BonusCategory,
		RecipientID:         req.RecipientID,
		CostCategory:        req.CostCategory,
		Mileage:             req.Mileage,
		ClientID:            req.ClientID,
		RelatedPaymentID:    req.RelatedPaymentID,
		PaymentMethod:       req.PaymentMethod,
		ExpertName:          req.ExpertName,
		CommissionType:      req.CommissionType,
		VendorName:          req.VendorName,
		VendorScore:         req.VendorScore,
		RelatedCommissionID: req.RelatedCommissionID,
		InvoiceFileID:       req.InvoiceFileID,
	}

	if err := s.db.Create(record).Error; err != nil {
		return nil, err
	}

	// Load associations
	if err := s.db.Preload("Project").Preload("CreatedBy").Preload("Recipient").Preload("Client").Preload("InvoiceFile").
		First(record, "id = ?", record.ID).Error; err != nil {
		return nil, err
	}

	return record, nil
}

// GetProjectFinancial retrieves financial information for a project (UUID string)
// 注意：此方法需要根据新的统一财务记录模型重新实现统计逻辑
func (s *FinancialService) GetProjectFinancial(projectID string) (*ProjectFinancial, error) {
	// Verify project exists
	var project models.Project
	if err := s.db.First(&project, "id = ? AND is_deleted = ?", projectID, false).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("project not found")
		}
		return nil, err
	}

	// Get all financial records for the project
	var records []models.FinancialRecord
	if err := s.db.Where("project_id = ?", projectID).
		Preload("CreatedBy").Preload("Recipient").Preload("Client").Preload("InvoiceFile").
		Order("occurred_at DESC").
		Find(&records).Error; err != nil {
		return nil, err
	}

	// Calculate totals based on direction and type
	var totalReceivable, totalInvoiced, totalPaid, totalOutstanding float64
	feeTypeBreakdown := make(map[string]FeeTypeFinancial)

	for _, record := range records {
		// 根据方向和类型计算金额
		// 收入类型：client_payment, our_invoice
		// 支出类型：bonus, cost, expert_fee, commission_payment, vendor_invoice
		if record.Direction == models.FinancialDirectionIncome {
			totalReceivable += record.Amount
			// 我方开票也计入已开票
			if record.FinancialType == models.FinancialTypeOurInvoice {
				totalInvoiced += record.Amount
			}
			// 甲方支付计入已支付
			if record.FinancialType == models.FinancialTypeClientPayment {
				totalPaid += record.Amount
			}
		} else {
			// 支出类型，暂时不纳入应收/开票/支付统计
			// 可以根据需要调整统计逻辑
		}

		// TODO: 根据新的财务记录模型重新实现按费用类型的统计
		// 新的模型不再有FeeType字段，需要根据FinancialType和业务逻辑重新分组
	}

	// Get total contract amount from contracts
	var totalContractAmount float64
	s.db.Model(&models.Contract{}).
		Where("project_id = ?", projectID).
		Select("COALESCE(SUM(contract_amount), 0)").
		Scan(&totalContractAmount)

	// Calculate outstanding
	totalOutstanding = totalReceivable - totalPaid

	// Calculate management fee
	managementFee, managementFeeRatio, err := s.CalculateManagementFee(projectID)
	if err != nil {
		// If calculation fails, set to 0 but don't fail the entire request
		managementFee = 0.0
		managementFeeRatio = 0.0
	}

	return &ProjectFinancial{
		TotalContractAmount: totalContractAmount,
		TotalReceivable:     totalReceivable,
		TotalInvoiced:       totalInvoiced,
		TotalPaid:           totalPaid,
		TotalOutstanding:    totalOutstanding,
		ManagementFeeRatio:  managementFeeRatio,
		ManagementFeeAmount: managementFee,
		FinancialRecords:    records,
		FeeTypeBreakdown:    feeTypeBreakdown, // TODO: 重新实现
	}, nil
}

// ListFinancialRecordsByProject retrieves all financial records for a project (UUID string)
func (s *FinancialService) ListFinancialRecordsByProject(projectID string) ([]models.FinancialRecord, error) {
	// Verify project exists
	var project models.Project
	if err := s.db.First(&project, "id = ? AND is_deleted = ?", projectID, false).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("project not found")
		}
		return nil, err
	}

	var records []models.FinancialRecord
	if err := s.db.Where("project_id = ?", projectID).
		Preload("CreatedBy").Preload("Recipient").Preload("Client").Preload("InvoiceFile").
		Order("occurred_at DESC").
		Find(&records).Error; err != nil {
		return nil, err
	}

	return records, nil
}

// GetProductionCosts retrieves all production cost records for a project (UUID string)
func (s *FinancialService) GetProductionCosts(projectID string) ([]models.FinancialRecord, error) {
	var records []models.FinancialRecord
	if err := s.db.Where("project_id = ? AND financial_type = ?", projectID, models.FinancialTypeCost).
		Preload("CreatedBy").Preload("InvoiceFile").
		Order("occurred_at DESC, created_at DESC").
		Find(&records).Error; err != nil {
		return nil, err
	}

	return records, nil
}

// ProductionCostStatistics represents production cost statistics
type ProductionCostStatistics struct {
	TotalCost  float64 `json:"total_cost"`  // 总成本
	RecordCount int    `json:"record_count"` // 记录数
}

// GetProductionCostStatistics calculates production cost statistics for a project (UUID string)
func (s *FinancialService) GetProductionCostStatistics(projectID string) (*ProductionCostStatistics, error) {
	var totalCost float64
	var recordCount int64

	// Get total cost
	if err := s.db.Model(&models.FinancialRecord{}).
		Where("project_id = ? AND financial_type = ?", projectID, models.FinancialTypeCost).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&totalCost).Error; err != nil {
		return nil, err
	}

	// Get record count
	if err := s.db.Model(&models.FinancialRecord{}).
		Where("project_id = ? AND financial_type = ?", projectID, models.FinancialTypeCost).
		Count(&recordCount).Error; err != nil {
		return nil, err
	}

	return &ProductionCostStatistics{
		TotalCost:   totalCost,
		RecordCount: int(recordCount),
	}, nil
}

// ProductionBonusStatistics represents production bonus statistics
type ProductionBonusStatistics struct {
	TotalAmount   float64 `json:"total_amount"`   // 总发放金额
	RecordCount   int     `json:"record_count"`   // 发放次数
	RecipientCount int    `json:"recipient_count"` // 发放人数（去重后的发放人员数量）
}

// GetProductionBonusStatistics calculates production bonus statistics for a project (UUID string)
// T245: 实现生产奖金统计计算（总发放金额、发放次数、发放人数）
func (s *FinancialService) GetProductionBonusStatistics(projectID string) (*ProductionBonusStatistics, error) {
	var totalAmount float64
	var recordCount int64
	var recipientCount int64

	// Get total amount
	if err := s.db.Model(&models.FinancialRecord{}).
		Where("project_id = ? AND financial_type = ? AND bonus_category = ?", 
			projectID, models.FinancialTypeBonus, models.BonusCategoryProduction).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&totalAmount).Error; err != nil {
		return nil, err
	}

	// Get record count
	if err := s.db.Model(&models.FinancialRecord{}).
		Where("project_id = ? AND financial_type = ? AND bonus_category = ?", 
			projectID, models.FinancialTypeBonus, models.BonusCategoryProduction).
		Count(&recordCount).Error; err != nil {
		return nil, err
	}

	// Get unique recipient count (发放人数)
	// Use subquery to count distinct recipient_id
	var distinctRecipients []string
	if err := s.db.Model(&models.FinancialRecord{}).
		Where("project_id = ? AND financial_type = ? AND bonus_category = ? AND recipient_id IS NOT NULL", 
			projectID, models.FinancialTypeBonus, models.BonusCategoryProduction).
		Distinct("recipient_id").
		Pluck("recipient_id", &distinctRecipients).Error; err != nil {
		return nil, err
	}
	recipientCount = int64(len(distinctRecipients))

	return &ProductionBonusStatistics{
		TotalAmount:    totalAmount,
		RecordCount:    int(recordCount),
		RecipientCount: int(recipientCount),
	}, nil
}

// BusinessBonusStatistics represents business bonus statistics
type BusinessBonusStatistics struct {
	TotalAmount   float64 `json:"total_amount"`   // 总发放金额
	RecordCount   int     `json:"record_count"`   // 发放次数
	RecipientCount int    `json:"recipient_count"` // 发放人数（去重后的发放人员数量）
}

// GetBusinessBonusStatistics calculates business bonus statistics for a project (UUID string)
func (s *FinancialService) GetBusinessBonusStatistics(projectID string) (*BusinessBonusStatistics, error) {
	var totalAmount float64
	var recordCount int64
	var recipientCount int64

	// Get total amount
	if err := s.db.Model(&models.FinancialRecord{}).
		Where("project_id = ? AND financial_type = ? AND bonus_category = ?", 
			projectID, models.FinancialTypeBonus, models.BonusCategoryBusiness).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&totalAmount).Error; err != nil {
		return nil, err
	}

	// Get record count
	if err := s.db.Model(&models.FinancialRecord{}).
		Where("project_id = ? AND financial_type = ? AND bonus_category = ?", 
			projectID, models.FinancialTypeBonus, models.BonusCategoryBusiness).
		Count(&recordCount).Error; err != nil {
		return nil, err
	}

	// Get unique recipient count (发放人数)
	// Use subquery to count distinct recipient_id
	var distinctRecipients []string
	if err := s.db.Model(&models.FinancialRecord{}).
		Where("project_id = ? AND financial_type = ? AND bonus_category = ? AND recipient_id IS NOT NULL", 
			projectID, models.FinancialTypeBonus, models.BonusCategoryBusiness).
		Distinct("recipient_id").
		Pluck("recipient_id", &distinctRecipients).Error; err != nil {
		return nil, err
	}
	recipientCount = int64(len(distinctRecipients))

	return &BusinessBonusStatistics{
		TotalAmount:    totalAmount,
		RecordCount:    int(recordCount),
		RecipientCount: int(recipientCount),
	}, nil
}

// UpdateFinancialRecordRequest represents the request to update a financial record
// 根据新的统一财务记录模型设计
type UpdateFinancialRecordRequest struct {
	FinancialType *models.FinancialType      `json:"financial_type"` // 财务类型
	Direction     *models.FinancialDirection `json:"direction"`      // 方向：收入/支出
	Amount        *float64                   `json:"amount"`         // 金额
	OccurredAt    *time.Time                 `json:"occurred_at"`    // 发生时间

	// 类型特定字段（根据FinancialType使用不同字段）
	// 奖金类型
	BonusCategory *models.BonusCategory `json:"bonus_category"` // 奖金类别
	RecipientID   *string               `json:"recipient_id"`   // 发放人员ID

	// 成本类型
	CostCategory *models.CostCategory `json:"cost_category"` // 成本类别
	Mileage      *float64             `json:"mileage"`       // 里程

	// 甲方支付/我方开票类型
	ClientID         *string `json:"client_id"`          // 甲方ID
	RelatedPaymentID *string `json:"related_payment_id"` // 关联的甲方支付记录ID

	// 专家费类型
	PaymentMethod *string `json:"payment_method"` // 支付方式
	ExpertName    *string `json:"expert_name"`    // 专家姓名

	// 委托支付/对方开票类型
	CommissionType      *string  `json:"commission_type"`       // 委托类型
	VendorName          *string  `json:"vendor_name"`           // 委托方名称
	VendorScore         *float64 `json:"vendor_score"`          // 委托方评分
	RelatedCommissionID *string  `json:"related_commission_id"` // 关联的委托支付记录ID

	// 文件关联
	InvoiceFileID *string `json:"invoice_file_id"` // 发票文件ID

	Description *string `json:"description"` // 描述
}

// UpdateFinancialRecord updates an existing financial record (UUID string)
// 根据新的统一财务记录模型实现
func (s *FinancialService) UpdateFinancialRecord(recordID string, userID string, req *UpdateFinancialRecordRequest) (*models.FinancialRecord, error) {
	var record models.FinancialRecord
	if err := s.db.Preload("Project").First(&record, "id = ?", recordID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("financial record not found")
		}
		return nil, err
	}

	// Check permission for business-related financial records
	if record.FinancialType == models.FinancialTypeClientPayment ||
		record.FinancialType == models.FinancialTypeOurInvoice ||
		(record.FinancialType == models.FinancialTypeBonus && record.BonusCategory != nil && *record.BonusCategory == models.BonusCategoryBusiness) {
		canManage, err := s.permissionService.CanManageBusinessInfo(userID, record.ProjectID)
		if err != nil {
			return nil, err
		}
		if !canManage {
			return nil, errors.New("permission denied: you do not have permission to manage business information")
		}
	}

	// Check permission for production-related financial records
	if record.FinancialType == models.FinancialTypeCost ||
		(record.FinancialType == models.FinancialTypeBonus && record.BonusCategory != nil && *record.BonusCategory == models.BonusCategoryProduction) {
		canManage, err := s.permissionService.CanManageProductionInfo(userID, record.ProjectID)
		if err != nil {
			return nil, err
		}
		if !canManage {
			return nil, errors.New("permission denied: you do not have permission to manage production information")
		}
	}

	// Update basic fields if provided
	if req.FinancialType != nil {
		record.FinancialType = *req.FinancialType
	}

	if req.Direction != nil {
		record.Direction = *req.Direction
	}

	if req.Amount != nil {
		if *req.Amount <= 0 {
			return nil, errors.New("amount must be greater than 0")
		}
		record.Amount = *req.Amount
	}

	if req.OccurredAt != nil {
		// No future date restriction
		record.OccurredAt = *req.OccurredAt
	}

	// Update type-specific fields
	if req.BonusCategory != nil {
		record.BonusCategory = req.BonusCategory
	}

	if req.RecipientID != nil {
		record.RecipientID = req.RecipientID
	}

	if req.CostCategory != nil {
		record.CostCategory = req.CostCategory
	}

	if req.Mileage != nil {
		record.Mileage = req.Mileage
	}

	if req.ClientID != nil {
		record.ClientID = req.ClientID
	}

	if req.RelatedPaymentID != nil {
		record.RelatedPaymentID = req.RelatedPaymentID
	}

	if req.PaymentMethod != nil {
		record.PaymentMethod = req.PaymentMethod
	}

	if req.ExpertName != nil {
		record.ExpertName = *req.ExpertName
	}

	if req.CommissionType != nil {
		record.CommissionType = req.CommissionType
	}

	if req.VendorName != nil {
		record.VendorName = *req.VendorName
	}

	if req.VendorScore != nil {
		record.VendorScore = req.VendorScore
	}

	if req.RelatedCommissionID != nil {
		record.RelatedCommissionID = req.RelatedCommissionID
	}

	if req.InvoiceFileID != nil {
		record.InvoiceFileID = req.InvoiceFileID
	}

	if req.Description != nil {
		record.Description = *req.Description
	}

	if err := s.db.Save(&record).Error; err != nil {
		return nil, err
	}

	// Load associations
	if err := s.db.Preload("Project").Preload("CreatedBy").Preload("Recipient").Preload("Client").Preload("InvoiceFile").
		First(&record, "id = ?", record.ID).Error; err != nil {
		return nil, err
	}

	return &record, nil
}

// DeleteFinancialRecord deletes a financial record (UUID string)
func (s *FinancialService) DeleteFinancialRecord(recordID string, userID string) error {
	var record models.FinancialRecord
	if err := s.db.Preload("Project").First(&record, "id = ?", recordID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("financial record not found")
		}
		return err
	}

	// Check permission for business-related financial records
	if record.FinancialType == models.FinancialTypeClientPayment ||
		record.FinancialType == models.FinancialTypeOurInvoice ||
		(record.FinancialType == models.FinancialTypeBonus && record.BonusCategory != nil && *record.BonusCategory == models.BonusCategoryBusiness) {
		canManage, err := s.permissionService.CanManageBusinessInfo(userID, record.ProjectID)
		if err != nil {
			return err
		}
		if !canManage {
			return errors.New("permission denied: you do not have permission to manage business information")
		}
	}

	// Check permission for production-related financial records
	if record.FinancialType == models.FinancialTypeCost ||
		(record.FinancialType == models.FinancialTypeBonus && record.BonusCategory != nil && *record.BonusCategory == models.BonusCategoryProduction) {
		canManage, err := s.permissionService.CanManageProductionInfo(userID, record.ProjectID)
		if err != nil {
			return err
		}
		if !canManage {
			return errors.New("permission denied: you do not have permission to manage production information")
		}
	}

	// Delete the record
	if err := s.db.Delete(&record).Error; err != nil {
		return err
	}

	// Statistics will be automatically recalculated when GetProjectFinancial is called
	// No need to manually update here as the calculation is done on-the-fly

	return nil
}

// GetTotalPaidAmount calculates total paid amount (甲方支付汇总) for a project
func (s *FinancialService) GetTotalPaidAmount(projectID string) (float64, error) {
	var totalPaid float64
	if err := s.db.Model(&models.FinancialRecord{}).
		Where("project_id = ? AND financial_type = ? AND direction = ?", projectID, models.FinancialTypeClientPayment, models.FinancialDirectionIncome).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&totalPaid).Error; err != nil {
		return 0, err
	}
	return totalPaid, nil
}

// GetTotalBusinessBonus calculates total business bonus for a project
func (s *FinancialService) GetTotalBusinessBonus(projectID string) (float64, error) {
	var totalBonus float64
	if err := s.db.Model(&models.FinancialRecord{}).
		Where("project_id = ? AND financial_type = ? AND bonus_category = ?", projectID, models.FinancialTypeBonus, models.BonusCategoryBusiness).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&totalBonus).Error; err != nil {
		return 0, err
	}
	return totalBonus, nil
}

// GetEffectiveManagementFeeRatio retrieves the effective management fee ratio for a project (UUID string)
// Returns project-specific ratio if set, otherwise returns company default
func (s *FinancialService) GetEffectiveManagementFeeRatio(projectID string) (float64, error) {
	// Get project
	var project models.Project
	if err := s.db.First(&project, "id = ? AND is_deleted = ?", projectID, false).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 0.0, errors.New("project not found")
		}
		return 0.0, err
	}

	// If project has a specific ratio set, use it
	if project.ManagementFeeRatio != nil {
		return *project.ManagementFeeRatio, nil
	}

	// Otherwise, get company default
	configService := NewCompanyConfigService()
	return configService.GetDefaultManagementFeeRatio()
}

// CalculateManagementFee calculates the management fee for a project (UUID string)
// Formula: ManagementFee = TotalIncomeAmount × ManagementFeeRatio
func (s *FinancialService) CalculateManagementFee(projectID string) (float64, float64, error) {
	// Get total income amount for the project (sum of income direction records)
	var totalIncome float64
	if err := s.db.Model(&models.FinancialRecord{}).
		Where("project_id = ? AND direction = ?", projectID, models.FinancialDirectionIncome).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&totalIncome).Error; err != nil {
		return 0.0, 0.0, err
	}

	// Get effective management fee ratio
	ratio, err := s.GetEffectiveManagementFeeRatio(projectID)
	if err != nil {
		return 0.0, 0.0, err
	}

	// Calculate management fee
	managementFee := totalIncome * ratio

	return managementFee, ratio, nil
}

// CompanyRevenueStatistics represents company-level revenue statistics
type CompanyRevenueStatistics struct {
	TotalProjects      int                         `json:"total_projects"`
	TotalReceivable    float64                     `json:"total_receivable"`
	TotalInvoiced      float64                     `json:"total_invoiced"`
	TotalPaid          float64                     `json:"total_paid"`
	TotalOutstanding   float64                     `json:"total_outstanding"`
	TotalManagementFee float64                     `json:"total_management_fee"`
	FeeTypeBreakdown   map[string]FeeTypeFinancial `json:"fee_type_breakdown"`
	ProjectBreakdown   []ProjectRevenueSummary     `json:"project_breakdown"`
}

// ProjectRevenueSummary represents revenue summary for a single project
type ProjectRevenueSummary struct {
	ProjectID           string  `json:"project_id"` // UUID string
	ProjectName         string  `json:"project_name"`
	ProjectNumber       string  `json:"project_number"`
	TotalReceivable     float64 `json:"total_receivable"`
	TotalInvoiced       float64 `json:"total_invoiced"`
	TotalPaid           float64 `json:"total_paid"`
	TotalOutstanding    float64 `json:"total_outstanding"`
	ManagementFeeRatio  float64 `json:"management_fee_ratio"`
	ManagementFeeAmount float64 `json:"management_fee_amount"`
}

// GetCompanyRevenueStatistics retrieves company-level revenue statistics
// Aggregates financial data from all projects with management fee calculation
// T466: 添加权限检查
func (s *FinancialService) GetCompanyRevenueStatistics(userID string) (*CompanyRevenueStatistics, error) {
	// Check permission (T466)
	canManage, err := s.permissionService.CanManageCompanyRevenue(userID)
	if err != nil {
		return nil, err
	}
	if !canManage {
		return nil, errors.New("permission denied: you do not have permission to manage company revenue")
	}
	
	// Get all projects
	var projects []models.Project
	if err := s.db.Find(&projects).Error; err != nil {
		return nil, err
	}

	stats := &CompanyRevenueStatistics{
		TotalProjects:    len(projects),
		FeeTypeBreakdown: make(map[string]FeeTypeFinancial),
		ProjectBreakdown: make([]ProjectRevenueSummary, 0),
	}

	// Aggregate data from all projects
	for _, project := range projects {
		projectFinancial, err := s.GetProjectFinancial(project.ID)
		if err != nil {
			// Skip projects with errors, but log them
			continue
		}

		// Add to totals
		stats.TotalReceivable += projectFinancial.TotalReceivable
		stats.TotalInvoiced += projectFinancial.TotalInvoiced
		stats.TotalPaid += projectFinancial.TotalPaid
		stats.TotalOutstanding += projectFinancial.TotalOutstanding
		stats.TotalManagementFee += projectFinancial.ManagementFeeAmount

		// Aggregate by fee type
		for feeType, breakdown := range projectFinancial.FeeTypeBreakdown {
			if existing, exists := stats.FeeTypeBreakdown[feeType]; exists {
				existing.Receivable += breakdown.Receivable
				existing.Invoiced += breakdown.Invoiced
				existing.Paid += breakdown.Paid
				existing.Outstanding += breakdown.Outstanding
				stats.FeeTypeBreakdown[feeType] = existing
			} else {
				stats.FeeTypeBreakdown[feeType] = breakdown
			}
		}

		// Add project summary
		stats.ProjectBreakdown = append(stats.ProjectBreakdown, ProjectRevenueSummary{
			ProjectID:           project.ID,
			ProjectName:         project.ProjectName,
			ProjectNumber:       project.ProjectNumber,
			TotalReceivable:     projectFinancial.TotalReceivable,
			TotalInvoiced:       projectFinancial.TotalInvoiced,
			TotalPaid:           projectFinancial.TotalPaid,
			TotalOutstanding:    projectFinancial.TotalOutstanding,
			ManagementFeeRatio:  projectFinancial.ManagementFeeRatio,
			ManagementFeeAmount: projectFinancial.ManagementFeeAmount,
		})
	}

	return stats, nil
}

// CompanyRevenueSummary represents company revenue summary for US23
// 公司收入管理功能的数据结构
type CompanyRevenueSummary struct {
	// 总应收金额（按费用类型分类）
	TotalReceivableByFeeType struct {
		DesignFee       float64 `json:"design_fee"`       // 设计费
		SurveyFee       float64 `json:"survey_fee"`       // 勘察费
		ConsultationFee float64 `json:"consultation_fee"` // 咨询费
		Total           float64 `json:"total"`            // 总计
	} `json:"total_receivable_by_fee_type"`
	
	// 已收金额（所有甲方支付金额）
	TotalPaid float64 `json:"total_paid"`
	
	// 未收金额
	TotalOutstanding float64 `json:"total_outstanding"`
}

// GetCompanyRevenueSummary retrieves company revenue summary for US23 (T253)
// 实现公司收入统计计算（聚合所有项目数据）
func (s *FinancialService) GetCompanyRevenueSummary(userID string, startDate, endDate *time.Time) (*CompanyRevenueSummary, error) {
	// Check permission
	canManage, err := s.permissionService.CanManageCompanyRevenue(userID)
	if err != nil {
		return nil, err
	}
	if !canManage {
		return nil, errors.New("permission denied: you do not have permission to manage company revenue")
	}
	
	return s.GetTotalReceivableByFeeType(startDate, endDate)
}

// GetTotalReceivableByFeeType calculates total receivable amount by fee type (T254)
// 实现总应收金额统计（所有项目的合同+补充协议），按设计费、勘察费、咨询费分别汇总
func (s *FinancialService) GetTotalReceivableByFeeType(startDate, endDate *time.Time) (*CompanyRevenueSummary, error) {
	summary := &CompanyRevenueSummary{}
	
	// 查询所有合同
	contractQuery := s.db.Model(&models.Contract{})
	if startDate != nil {
		contractQuery = contractQuery.Where("sign_date >= ?", *startDate)
	}
	if endDate != nil {
		contractQuery = contractQuery.Where("sign_date <= ?", *endDate)
	}
	
	// 聚合合同金额
	var contractTotals struct {
		DesignFee       float64
		SurveyFee       float64
		ConsultationFee float64
	}
	if err := contractQuery.Select("COALESCE(SUM(design_fee), 0) as design_fee, COALESCE(SUM(survey_fee), 0) as survey_fee, COALESCE(SUM(consultation_fee), 0) as consultation_fee").
		Scan(&contractTotals).Error; err != nil {
		return nil, err
	}
	
	// 查询所有补充协议
	amendmentQuery := s.db.Model(&models.ContractAmendment{})
	if startDate != nil {
		amendmentQuery = amendmentQuery.Where("sign_date >= ?", *startDate)
	}
	if endDate != nil {
		amendmentQuery = amendmentQuery.Where("sign_date <= ?", *endDate)
	}
	
	// 聚合补充协议金额
	var amendmentTotals struct {
		DesignFee       float64
		SurveyFee       float64
		ConsultationFee float64
	}
	if err := amendmentQuery.Select("COALESCE(SUM(design_fee), 0) as design_fee, COALESCE(SUM(survey_fee), 0) as survey_fee, COALESCE(SUM(consultation_fee), 0) as consultation_fee").
		Scan(&amendmentTotals).Error; err != nil {
		return nil, err
	}
	
	// 汇总
	summary.TotalReceivableByFeeType.DesignFee = contractTotals.DesignFee + amendmentTotals.DesignFee
	summary.TotalReceivableByFeeType.SurveyFee = contractTotals.SurveyFee + amendmentTotals.SurveyFee
	summary.TotalReceivableByFeeType.ConsultationFee = contractTotals.ConsultationFee + amendmentTotals.ConsultationFee
	summary.TotalReceivableByFeeType.Total = summary.TotalReceivableByFeeType.DesignFee + 
		summary.TotalReceivableByFeeType.SurveyFee + 
		summary.TotalReceivableByFeeType.ConsultationFee
	
	// 计算已收金额（所有甲方支付）
	paidQuery := s.db.Model(&models.FinancialRecord{}).
		Where("financial_type = ? AND direction = ?", models.FinancialTypeClientPayment, models.FinancialDirectionIncome)
	if startDate != nil {
		paidQuery = paidQuery.Where("occurred_at >= ?", *startDate)
	}
	if endDate != nil {
		paidQuery = paidQuery.Where("occurred_at <= ?", *endDate)
	}
	if err := paidQuery.Select("COALESCE(SUM(amount), 0)").Scan(&summary.TotalPaid).Error; err != nil {
		return nil, err
	}
	
	// 计算未收金额
	summary.TotalOutstanding = summary.TotalReceivableByFeeType.Total - summary.TotalPaid
	
	return summary, nil
}

// InvoiceInfo represents invoice information for company revenue
type InvoiceInfo struct {
	ID          string    `json:"id"`
	ProjectID   string    `json:"project_id"`
	ProjectName string    `json:"project_name"`
	FeeType     string    `json:"fee_type"`     // 费用类型：design_fee, survey_fee, consultation_fee
	InvoiceDate time.Time `json:"invoice_date"` // 开票时间
	Amount      float64   `json:"amount"`       // 开票金额
	InvoiceFile *models.File `json:"invoice_file,omitempty"` // 发票文件
}

// GetInvoiceInfoList retrieves all invoice information with filtering and pagination (T255, T505, T506)
// 实现所有发票信息汇总，支持搜索过滤和分页
func (s *FinancialService) GetInvoiceInfoList(userID string, filters *InvoiceFilterParams, page, pageSize int) ([]InvoiceInfo, int64, error) {
	// Check permission
	canManage, err := s.permissionService.CanManageCompanyRevenue(userID)
	if err != nil {
		return nil, 0, err
	}
	if !canManage {
		return nil, 0, errors.New("permission denied: you do not have permission to manage company revenue")
	}
	
	// Build query
	query := s.db.Model(&models.FinancialRecord{}).
		Where("financial_type = ? AND direction = ?", models.FinancialTypeOurInvoice, models.FinancialDirectionIncome).
		Joins("JOIN projects ON financial_records.project_id = projects.id").
		Preload("Project").
		Preload("InvoiceFile")
	
	// Apply filters
	if filters != nil {
		if filters.ProjectName != "" {
			query = query.Where("projects.project_name ILIKE ?", "%"+filters.ProjectName+"%")
		}
		// Fee type filter is applied after fetching records (see below)
		// because fee type needs to be calculated from contracts
		if filters.StartDate != nil {
			query = query.Where("financial_records.occurred_at >= ?", *filters.StartDate)
		}
		if filters.EndDate != nil {
			query = query.Where("financial_records.occurred_at <= ?", *filters.EndDate)
		}
	}
	
	// Get total count (before fee type filter, as it requires contract lookup)
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	
	// If fee type filter is specified, we need to fetch all records first,
	// filter by fee type, then paginate. This is less efficient but necessary
	// since fee type is calculated from contracts.
	// For better performance with large datasets, consider adding fee_type field to FinancialRecord
	var allRecords []models.FinancialRecord
	if filters != nil && filters.FeeType != "" {
		// Fetch all records (without pagination) to apply fee type filter
		if err := query.Order("financial_records.occurred_at DESC").
			Find(&allRecords).Error; err != nil {
			return nil, 0, err
		}
		
		// Filter by fee type
		filteredRecords := make([]models.FinancialRecord, 0)
		for _, record := range allRecords {
			feeType := s.getFeeTypeForProject(record.ProjectID, record.Amount)
			if feeType == filters.FeeType {
				filteredRecords = append(filteredRecords, record)
			}
		}
		
		// Update total count
		total = int64(len(filteredRecords))
		
		// Apply pagination to filtered records
		offset := (page - 1) * pageSize
		if offset >= len(filteredRecords) {
			return []InvoiceInfo{}, total, nil
		}
		end := offset + pageSize
		if end > len(filteredRecords) {
			end = len(filteredRecords)
		}
		allRecords = filteredRecords[offset:end]
	} else {
		// No fee type filter, apply pagination directly
		offset := (page - 1) * pageSize
		if err := query.Order("financial_records.occurred_at DESC").
			Offset(offset).
			Limit(pageSize).
			Find(&allRecords).Error; err != nil {
			return nil, 0, err
		}
	}
	
	// Convert to InvoiceInfo
	invoices := make([]InvoiceInfo, 0, len(allRecords))
	for _, record := range allRecords {
		feeType := s.getFeeTypeForProject(record.ProjectID, record.Amount)
		
		invoices = append(invoices, InvoiceInfo{
			ID:          record.ID,
			ProjectID:   record.ProjectID,
			ProjectName: record.Project.ProjectName,
			FeeType:     feeType,
			InvoiceDate: record.OccurredAt,
			Amount:      record.Amount,
			InvoiceFile: record.InvoiceFile,
		})
	}
	
	return invoices, total, nil
}

// PaymentInfo represents payment information for company revenue
type PaymentInfo struct {
	ID          string    `json:"id"`
	ProjectID   string    `json:"project_id"`
	ProjectName string    `json:"project_name"`
	FeeType     string    `json:"fee_type"`     // 费用类型：design_fee, survey_fee, consultation_fee
	PaymentDate time.Time `json:"payment_date"` // 支付时间
	Amount      float64   `json:"amount"`       // 支付金额
}

// GetPaymentInfoList retrieves all payment information with filtering and pagination (T256, T507, T508)
// 实现所有支付信息汇总，支持搜索过滤和分页
func (s *FinancialService) GetPaymentInfoList(userID string, filters *PaymentFilterParams, page, pageSize int) ([]PaymentInfo, int64, error) {
	// Check permission
	canManage, err := s.permissionService.CanManageCompanyRevenue(userID)
	if err != nil {
		return nil, 0, err
	}
	if !canManage {
		return nil, 0, errors.New("permission denied: you do not have permission to manage company revenue")
	}
	
	// Build query
	query := s.db.Model(&models.FinancialRecord{}).
		Where("financial_type = ? AND direction = ?", models.FinancialTypeClientPayment, models.FinancialDirectionIncome).
		Joins("JOIN projects ON financial_records.project_id = projects.id").
		Preload("Project")
	
	// Apply filters
	if filters != nil {
		if filters.ProjectName != "" {
			query = query.Where("projects.project_name ILIKE ?", "%"+filters.ProjectName+"%")
		}
		if filters.FeeType != "" {
			// 注意：新的FinancialRecord模型没有FeeType字段，需要根据业务逻辑判断
		}
		if filters.StartDate != nil {
			query = query.Where("financial_records.occurred_at >= ?", *filters.StartDate)
		}
		if filters.EndDate != nil {
			query = query.Where("financial_records.occurred_at <= ?", *filters.EndDate)
		}
	}
	
	// Get total count (before fee type filter, as it requires contract lookup)
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	
	// If fee type filter is specified, we need to fetch all records first,
	// filter by fee type, then paginate. This is less efficient but necessary
	// since fee type is calculated from contracts.
	// For better performance with large datasets, consider adding fee_type field to FinancialRecord
	var allRecords []models.FinancialRecord
	if filters != nil && filters.FeeType != "" {
		// Fetch all records (without pagination) to apply fee type filter
		if err := query.Order("financial_records.occurred_at DESC").
			Find(&allRecords).Error; err != nil {
			return nil, 0, err
		}
		
		// Filter by fee type
		filteredRecords := make([]models.FinancialRecord, 0)
		for _, record := range allRecords {
			feeType := s.getFeeTypeForProject(record.ProjectID, record.Amount)
			if feeType == filters.FeeType {
				filteredRecords = append(filteredRecords, record)
			}
		}
		
		// Update total count
		total = int64(len(filteredRecords))
		
		// Apply pagination to filtered records
		offset := (page - 1) * pageSize
		if offset >= len(filteredRecords) {
			return []PaymentInfo{}, total, nil
		}
		end := offset + pageSize
		if end > len(filteredRecords) {
			end = len(filteredRecords)
		}
		allRecords = filteredRecords[offset:end]
	} else {
		// No fee type filter, apply pagination directly
		offset := (page - 1) * pageSize
		if err := query.Order("financial_records.occurred_at DESC").
			Offset(offset).
			Limit(pageSize).
			Find(&allRecords).Error; err != nil {
			return nil, 0, err
		}
	}
	
	// Convert to PaymentInfo
	payments := make([]PaymentInfo, 0, len(allRecords))
	for _, record := range allRecords {
		feeType := s.getFeeTypeForProject(record.ProjectID, record.Amount)
		
		payments = append(payments, PaymentInfo{
			ID:          record.ID,
			ProjectID:   record.ProjectID,
			ProjectName: record.Project.ProjectName,
			FeeType:     feeType,
			PaymentDate: record.OccurredAt,
			Amount:      record.Amount,
		})
	}
	
	return payments, total, nil
}

// InvoiceFilterParams represents filter parameters for invoice search
type InvoiceFilterParams struct {
	ProjectName string     `json:"project_name"` // 项目名称（模糊搜索）
	FeeType     string     `json:"fee_type"`     // 费用类型：design_fee, survey_fee, consultation_fee
	StartDate   *time.Time `json:"start_date"`   // 开票时间（起）
	EndDate     *time.Time `json:"end_date"`     // 开票时间（止）
}

// PaymentFilterParams represents filter parameters for payment search
type PaymentFilterParams struct {
	ProjectName string     `json:"project_name"` // 项目名称（模糊搜索）
	FeeType     string     `json:"fee_type"`     // 费用类型：design_fee, survey_fee, consultation_fee
	StartDate   *time.Time `json:"start_date"`   // 支付时间（起）
	EndDate     *time.Time `json:"end_date"`     // 支付时间（止）
}

// getFeeTypeForProject determines the fee type for a financial record based on project contracts
// Returns the most likely fee type (design_fee, survey_fee, consultation_fee) or empty string if cannot determine
func (s *FinancialService) getFeeTypeForProject(projectID string, amount float64) string {
	// Get all contracts for the project, ordered by sign date (newest first)
	var contracts []models.Contract
	if err := s.db.Where("project_id = ?", projectID).
		Order("sign_date DESC").
		Find(&contracts).Error; err != nil {
		return ""
	}
	
	if len(contracts) == 0 {
		return ""
	}
	
	// Use the most recent contract (or the one with the largest amount)
	// For simplicity, we'll use the most recent contract
	contract := contracts[0]
	
	// Calculate total fees from contract and amendments
	totalDesignFee := contract.DesignFee
	totalSurveyFee := contract.SurveyFee
	totalConsultationFee := contract.ConsultationFee
	
	// Add amendment fees
	var amendments []models.ContractAmendment
	if err := s.db.Where("contract_id = ?", contract.ID).Find(&amendments).Error; err == nil {
		for _, amendment := range amendments {
			totalDesignFee += amendment.DesignFee
			totalSurveyFee += amendment.SurveyFee
			totalConsultationFee += amendment.ConsultationFee
		}
	}
	
	// Determine fee type based on which fee category the amount is closest to
	// This is a heuristic approach - in a real scenario, you might need more sophisticated logic
	totalContractAmount := totalDesignFee + totalSurveyFee + totalConsultationFee
	if totalContractAmount == 0 {
		return ""
	}
	
	// Calculate proportions
	designRatio := totalDesignFee / totalContractAmount
	surveyRatio := totalSurveyFee / totalContractAmount
	consultationRatio := totalConsultationFee / totalContractAmount
	
	// Find the fee type with the highest proportion
	maxRatio := designRatio
	feeType := "design_fee"
	
	if surveyRatio > maxRatio {
		maxRatio = surveyRatio
		feeType = "survey_fee"
	}
	if consultationRatio > maxRatio {
		maxRatio = consultationRatio
		feeType = "consultation_fee"
	}
	
	// If the highest proportion is less than 50%, we can't confidently determine the fee type
	// In this case, return empty string or the most likely one
	if maxRatio < 0.5 {
		// Return the fee type with the highest absolute amount
		if totalDesignFee >= totalSurveyFee && totalDesignFee >= totalConsultationFee {
			return "design_fee"
		} else if totalSurveyFee >= totalConsultationFee {
			return "survey_fee"
		} else {
			return "consultation_fee"
		}
	}
	
	return feeType
}
