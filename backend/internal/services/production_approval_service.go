package services

import (
	"errors"
	"fmt"

	"gorm.io/gorm"

	"project-oa-backend/internal/models"
	"project-oa-backend/pkg/database"
)

type ProductionApprovalService struct {
	db               *gorm.DB
	contractService  *ContractService
	permissionService *PermissionService
}

func NewProductionApprovalService() *ProductionApprovalService {
	return &ProductionApprovalService{
		db:                database.DB,
		contractService:   NewContractService(),
		permissionService: NewPermissionService(),
	}
}

// GetDB 返回数据库连接（用于handler层访问）
func (s *ProductionApprovalService) GetDB() *gorm.DB {
	return s.db
}

// GetPermissionService 返回权限服务（用于handler层访问）
func (s *ProductionApprovalService) GetPermissionService() *PermissionService {
	return s.permissionService
}

// CreateProductionApprovalRequest 创建批复审计信息请求
type CreateProductionApprovalRequest struct {
	ProjectID         string                 `json:"project_id"` // 项目ID（从路径参数获取，不需要在请求体中）
	ApprovalType      models.ApprovalType    `json:"approval_type" binding:"required"` // 类型：批复/审计
	ApproverID        *string                `json:"approver_id"` // 责任人ID（可选）
	Status            models.ApprovalStatus  `json:"status"` // 状态（可选，默认pending）
	SignedAt          *string                `json:"signed_at"` // 签字时间（可选）
	ReportFileID      *string                `json:"report_file_id"` // 报告文件ID（可选）
	
	// 金额明细（按设计费、勘察费、咨询费分别录入）
	AmountDesign      *float64               `json:"amount_design"` // 设计费（元）
	AmountSurvey      *float64               `json:"amount_survey"` // 勘察费（元）
	AmountConsulting  *float64               `json:"amount_consulting"` // 咨询费（元）
	
	// 金额来源（默认引用合同金额，可覆盖）
	SourceContractID  *string                `json:"source_contract_id"` // 关联的合同ID（可选）
	UseContractAmount bool                   `json:"use_contract_amount"` // 是否引用合同金额
	OverrideReason    string                 `json:"override_reason"` // 覆盖原因说明
	
	Remarks           string                 `json:"remarks"` // 备注
}

// UpdateProductionApprovalRequest 更新批复审计信息请求
type UpdateProductionApprovalRequest struct {
	ApprovalType      *models.ApprovalType   `json:"approval_type"`
	ApproverID        *string                `json:"approver_id"`
	Status            *models.ApprovalStatus `json:"status"`
	SignedAt          *string                `json:"signed_at"`
	ReportFileID      *string                `json:"report_file_id"`
	
	AmountDesign      *float64               `json:"amount_design"`
	AmountSurvey      *float64               `json:"amount_survey"`
	AmountConsulting  *float64               `json:"amount_consulting"`
	
	SourceContractID  *string                `json:"source_contract_id"`
	UseContractAmount *bool                  `json:"use_contract_amount"`
	OverrideReason    *string                `json:"override_reason"`
	
	Remarks           *string                `json:"remarks"`
}

// GetContractAmounts 获取项目的合同金额（包含主合同和补充协议）
func (s *ProductionApprovalService) GetContractAmounts(projectID string) (designFee, surveyFee, consultationFee float64, err error) {
	// 获取项目的主合同
	contracts, err := s.contractService.ListContractsByProject(projectID)
	if err != nil {
		return 0, 0, 0, err
	}

	// 计算所有合同（含补充协议）的金额总和
	for _, contract := range contracts {
		designFee += contract.DesignFee
		surveyFee += contract.SurveyFee
		consultationFee += contract.ConsultationFee

		// 加上补充协议的金额
		for _, amendment := range contract.Amendments {
			designFee += amendment.DesignFee
			surveyFee += amendment.SurveyFee
			consultationFee += amendment.ConsultationFee
		}
	}

	return designFee, surveyFee, consultationFee, nil
}

// CreateProductionApproval 创建批复审计信息
func (s *ProductionApprovalService) CreateProductionApproval(userID string, req *CreateProductionApprovalRequest) (*models.ProductionApproval, error) {
	if req == nil {
		return nil, errors.New("request cannot be nil")
	}

	// 检查权限
	canManage, err := s.permissionService.CanManageProductionInfo(userID, req.ProjectID)
	if err != nil {
		return nil, err
	}
	if !canManage {
		return nil, errors.New("permission denied: you do not have permission to manage production information")
	}

	// 验证项目存在
	if err := s.ensureProjectExists(req.ProjectID); err != nil {
		return nil, err
	}

	// 处理金额：如果选择引用合同金额，则从合同获取
	amountDesign := 0.0
	amountSurvey := 0.0
	amountConsulting := 0.0
	var sourceContractID *string

	if req.UseContractAmount {
		// 引用合同金额
		contractDesign, contractSurvey, contractConsulting, err := s.GetContractAmounts(req.ProjectID)
		if err != nil {
			return nil, fmt.Errorf("failed to get contract amounts: %w", err)
		}
		amountDesign = contractDesign
		amountSurvey = contractSurvey
		amountConsulting = contractConsulting
	} else {
		// 使用手工录入的金额
		if req.AmountDesign != nil {
			amountDesign = *req.AmountDesign
		}
		if req.AmountSurvey != nil {
			amountSurvey = *req.AmountSurvey
		}
		if req.AmountConsulting != nil {
			amountConsulting = *req.AmountConsulting
		}
	}

	// 如果指定了合同ID，使用该合同
	if req.SourceContractID != nil && *req.SourceContractID != "" {
		sourceContractID = req.SourceContractID
	}

	// 计算总金额
	totalAmount := amountDesign + amountSurvey + amountConsulting

	// 设置默认状态
	status := models.ApprovalStatusPending
	if req.Status != "" {
		status = req.Status
	}

	// 创建批复审计记录
	approval := &models.ProductionApproval{
		ProjectID:        req.ProjectID,
		ApprovalType:     req.ApprovalType,
		ApproverID:       req.ApproverID,
		Status:           status,
		ReportFileID:     req.ReportFileID,
		AmountDesign:     amountDesign,
		AmountSurvey:     amountSurvey,
		AmountConsulting: amountConsulting,
		TotalAmount:      totalAmount,
		SourceContractID: sourceContractID,
		OverrideReason:   req.OverrideReason,
		Remarks:          req.Remarks,
	}

	// 处理签字时间
	if req.SignedAt != nil && *req.SignedAt != "" {
		// 这里需要解析时间字符串，暂时留空，由Handler处理
	}

	if err := s.db.Create(approval).Error; err != nil {
		return nil, err
	}

	// 预加载关联数据
	s.db.Preload("Project").
		Preload("Approver").
		Preload("ReportFile").
		Preload("SourceContract").
		First(approval, "id = ?", approval.ID)

	return approval, nil
}

// GetProductionApproval 获取批复审计信息
func (s *ProductionApprovalService) GetProductionApproval(id string) (*models.ProductionApproval, error) {
	var approval models.ProductionApproval
	if err := s.db.Preload("Project").
		Preload("Approver").
		Preload("ReportFile").
		Preload("SourceContract").
		First(&approval, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("production approval not found")
		}
		return nil, err
	}

	return &approval, nil
}

// GetProductionApprovalsByProject 获取项目的所有批复审计信息
func (s *ProductionApprovalService) GetProductionApprovalsByProject(projectID string) ([]models.ProductionApproval, error) {
	var approvals []models.ProductionApproval
	if err := s.db.Where("project_id = ?", projectID).
		Preload("Approver").
		Preload("ReportFile").
		Preload("SourceContract").
		Order("created_at DESC").
		Find(&approvals).Error; err != nil {
		return nil, err
	}

	return approvals, nil
}

// GetApprovalAndAuditByProject 分别获取批复和审计信息
func (s *ProductionApprovalService) GetApprovalAndAuditByProject(projectID string) (*models.ProductionApproval, *models.ProductionApproval, error) {
	var approvals []models.ProductionApproval
	if err := s.db.Where("project_id = ?", projectID).
		Preload("Approver").
		Preload("ReportFile").
		Preload("SourceContract").
		Find(&approvals).Error; err != nil {
		return nil, nil, err
	}

	var approval *models.ProductionApproval
	var audit *models.ProductionApproval

	for i := range approvals {
		if approvals[i].ApprovalType == models.ApprovalTypeApproval {
			approval = &approvals[i]
		} else if approvals[i].ApprovalType == models.ApprovalTypeAudit {
			audit = &approvals[i]
		}
	}

	return approval, audit, nil
}

// UpdateProductionApproval 更新批复审计信息
func (s *ProductionApprovalService) UpdateProductionApproval(userID string, id string, req *UpdateProductionApprovalRequest) (*models.ProductionApproval, error) {
	// 获取现有记录
	approval, err := s.GetProductionApproval(id)
	if err != nil {
		return nil, err
	}

	// 检查权限
	canManage, err := s.permissionService.CanManageProductionInfo(userID, approval.ProjectID)
	if err != nil {
		return nil, err
	}
	if !canManage {
		return nil, errors.New("permission denied: you do not have permission to manage production information")
	}

	// 更新字段
	if req.ApprovalType != nil {
		approval.ApprovalType = *req.ApprovalType
	}
	if req.ApproverID != nil {
		approval.ApproverID = req.ApproverID
	}
	if req.Status != nil {
		approval.Status = *req.Status
	}
	if req.ReportFileID != nil {
		approval.ReportFileID = req.ReportFileID
	}

	// 处理金额更新
	needRecalculate := false
	if req.UseContractAmount != nil && *req.UseContractAmount {
		// 引用合同金额
		contractDesign, contractSurvey, contractConsulting, err := s.GetContractAmounts(approval.ProjectID)
		if err != nil {
			return nil, fmt.Errorf("failed to get contract amounts: %w", err)
		}
		approval.AmountDesign = contractDesign
		approval.AmountSurvey = contractSurvey
		approval.AmountConsulting = contractConsulting
		needRecalculate = true
	} else {
		// 手工调整金额
		if req.AmountDesign != nil {
			approval.AmountDesign = *req.AmountDesign
			needRecalculate = true
		}
		if req.AmountSurvey != nil {
			approval.AmountSurvey = *req.AmountSurvey
			needRecalculate = true
		}
		if req.AmountConsulting != nil {
			approval.AmountConsulting = *req.AmountConsulting
			needRecalculate = true
		}
	}

	// 重新计算总金额
	if needRecalculate {
		approval.TotalAmount = approval.AmountDesign + approval.AmountSurvey + approval.AmountConsulting
	}

	if req.SourceContractID != nil {
		approval.SourceContractID = req.SourceContractID
	}
	if req.OverrideReason != nil {
		approval.OverrideReason = *req.OverrideReason
		}
	if req.Remarks != nil {
		approval.Remarks = *req.Remarks
	}

	if err := s.db.Save(approval).Error; err != nil {
		return nil, err
	}

	// 重新加载关联数据
	s.db.Preload("Project").
		Preload("Approver").
		Preload("ReportFile").
		Preload("SourceContract").
		First(approval, "id = ?", approval.ID)

	return approval, nil
}

// DeleteProductionApproval 删除批复审计信息
func (s *ProductionApprovalService) DeleteProductionApproval(userID string, id string) error {
	// 获取现有记录
	approval, err := s.GetProductionApproval(id)
	if err != nil {
		return err
	}

	// 检查权限
	canManage, err := s.permissionService.CanManageProductionInfo(userID, approval.ProjectID)
	if err != nil {
		return err
	}
	if !canManage {
		return errors.New("permission denied: you do not have permission to manage production information")
	}

	// 删除记录
	if err := s.db.Delete(approval).Error; err != nil {
		return err
	}

	return nil
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
