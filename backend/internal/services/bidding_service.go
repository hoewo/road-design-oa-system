package services

import (
	"errors"
	"fmt"
	"time"

	"github.com/lib/pq"
	"gorm.io/gorm"

	"project-oa-backend/internal/models"
	"project-oa-backend/pkg/database"
)

// BiddingService handles bidding information-related operations
type BiddingService struct {
	db                *gorm.DB
	permissionService *PermissionService
}

// NewBiddingService creates a new bidding service
func NewBiddingService() *BiddingService {
	return &BiddingService{
		db:                database.DB,
		permissionService: NewPermissionService(),
	}
}

// CreateOrUpdateBiddingInfoRequest represents the request to create or update bidding info
type CreateOrUpdateBiddingInfoRequest struct {
	TenderFileIDs      []string `json:"tender_file_ids"`      // 招标文件ID数组，支持多个文件
	BidFileIDs         []string `json:"bid_file_ids"`         // 投标文件ID数组，支持多个文件
	AwardNoticeFileIDs []string `json:"award_notice_file_ids"` // 中标通知书文件ID数组，支持多个文件
}

// GetBiddingInfo retrieves bidding info by project ID
func (s *BiddingService) GetBiddingInfo(projectID string) (*models.BiddingInfo, error) {
	var biddingInfo models.BiddingInfo
	if err := s.db.Where("project_id = ?", projectID).First(&biddingInfo).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("bidding info not found")
		}
		return nil, err
	}

	// Load associated files by IDs
	// Convert pq.StringArray to []string for GORM query
	if len(biddingInfo.TenderFileIDs) > 0 {
		var tenderFiles []models.File
		fileIDs := []string(biddingInfo.TenderFileIDs)
		if err := s.db.Where("id IN ?", fileIDs).Find(&tenderFiles).Error; err == nil {
			biddingInfo.TenderFiles = tenderFiles
		}
	}
	if len(biddingInfo.BidFileIDs) > 0 {
		var bidFiles []models.File
		fileIDs := []string(biddingInfo.BidFileIDs)
		if err := s.db.Where("id IN ?", fileIDs).Find(&bidFiles).Error; err == nil {
			biddingInfo.BidFiles = bidFiles
		}
	}
	if len(biddingInfo.AwardNoticeFileIDs) > 0 {
		var awardFiles []models.File
		fileIDs := []string(biddingInfo.AwardNoticeFileIDs)
		if err := s.db.Where("id IN ?", fileIDs).Find(&awardFiles).Error; err == nil {
			biddingInfo.AwardNoticeFiles = awardFiles
		}
	}

	return &biddingInfo, nil
}

// CreateOrUpdateBiddingInfo creates or updates bidding info for a project
// userID: 操作用户ID，用于权限检查
func (s *BiddingService) CreateOrUpdateBiddingInfo(projectID string, userID string, req *CreateOrUpdateBiddingInfoRequest) (*models.BiddingInfo, error) {
	// 权限检查：经营负责人、项目管理员、系统管理员可以管理项目经营信息
	canManage, err := s.permissionService.CanManageBusinessInfo(userID, projectID)
	if err != nil {
		return nil, fmt.Errorf("权限检查失败: %w", err)
	}
	if !canManage {
		return nil, errors.New("权限不足：无法管理项目经营信息")
	}

	// Verify project exists
	var project models.Project
	if err := s.db.First(&project, "id = ? AND is_deleted = ?", projectID, false).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("project not found")
		}
		return nil, err
	}

	// Check if bidding info already exists
	var biddingInfo models.BiddingInfo
	err = s.db.Where("project_id = ?", projectID).First(&biddingInfo).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		// Create new bidding info
		biddingInfo = models.BiddingInfo{
			ProjectID:         projectID,
			TenderFileIDs:      pq.StringArray(req.TenderFileIDs),
			BidFileIDs:         pq.StringArray(req.BidFileIDs),
			AwardNoticeFileIDs: pq.StringArray(req.AwardNoticeFileIDs),
		}
		if err := s.db.Create(&biddingInfo).Error; err != nil {
			return nil, err
		}
	} else if err != nil {
		return nil, err
	} else {
		// Update existing bidding info
		updates := make(map[string]interface{})
		if req.TenderFileIDs != nil {
			updates["tender_file_ids"] = pq.StringArray(req.TenderFileIDs)
		}
		if req.BidFileIDs != nil {
			updates["bid_file_ids"] = pq.StringArray(req.BidFileIDs)
		}
		if req.AwardNoticeFileIDs != nil {
			updates["award_notice_file_ids"] = pq.StringArray(req.AwardNoticeFileIDs)
		}

		if err := s.db.Model(&biddingInfo).Updates(updates).Error; err != nil {
			return nil, err
		}
	}

	// Reload with file associations
	return s.GetBiddingInfo(projectID)
}

// CreateExpertFeePayment creates an expert fee payment record using FinancialRecord
// createdByID: 创建用户ID，用于权限检查
func (s *BiddingService) CreateExpertFeePayment(projectID string, createdByID string, expertName string, amount float64, occurredAt time.Time, paymentMethod string, description string) (*models.FinancialRecord, error) {
	// 权限检查：经营负责人、项目管理员、系统管理员可以管理项目经营信息
	canManage, err := s.permissionService.CanManageBusinessInfo(createdByID, projectID)
	if err != nil {
		return nil, fmt.Errorf("权限检查失败: %w", err)
	}
	if !canManage {
		return nil, errors.New("权限不足：无法管理项目经营信息")
	}
	// Use FinancialService to create the expert fee payment
	financialService := NewFinancialService()
	req := &CreateFinancialRecordRequest{
		FinancialType: models.FinancialTypeExpertFee,
		Direction:     models.FinancialDirectionExpense,
		Amount:        amount,
		OccurredAt:    occurredAt,
		ExpertName:    expertName,
		PaymentMethod: &paymentMethod,
		Description:   description,
	}

	return financialService.CreateFinancialRecord(projectID, createdByID, req)
}

// GetExpertFeePayments retrieves all expert fee payment records for a project
// 通过FinancialRecord查询，financial_type=expert_fee
func (s *BiddingService) GetExpertFeePayments(projectID string) ([]models.FinancialRecord, error) {
	var records []models.FinancialRecord
	if err := s.db.Where("project_id = ? AND financial_type = ?", projectID, models.FinancialTypeExpertFee).
		Preload("CreatedBy").
		Order("occurred_at DESC, created_at DESC").
		Find(&records).Error; err != nil {
		return nil, err
	}

	return records, nil
}

// UpdateExpertFeePaymentRequest represents the request to update expert fee payment
type UpdateExpertFeePaymentRequest struct {
	ExpertName    *string    `json:"expert_name"`    // 专家姓名
	Amount        *float64   `json:"amount"`         // 支付金额
	OccurredAt    *time.Time `json:"occurred_at"`    // 支付日期
	PaymentMethod *string    `json:"payment_method"` // 支付方式：cash/transfer
	Description   *string    `json:"description"`    // 备注信息
}

// UpdateExpertFeePayment updates an expert fee payment record
// userID: 操作用户ID，用于权限检查
func (s *BiddingService) UpdateExpertFeePayment(projectID string, recordID string, userID string, req *UpdateExpertFeePaymentRequest) (*models.FinancialRecord, error) {
	// 权限检查：经营负责人、项目管理员、系统管理员可以管理项目经营信息
	canManage, err := s.permissionService.CanManageBusinessInfo(userID, projectID)
	if err != nil {
		return nil, fmt.Errorf("权限检查失败: %w", err)
	}
	if !canManage {
		return nil, errors.New("权限不足：无法管理项目经营信息")
	}

	// 验证记录是否存在且属于该项目
	var record models.FinancialRecord
	if err := s.db.Where("id = ? AND project_id = ? AND financial_type = ?", recordID, projectID, models.FinancialTypeExpertFee).
		First(&record).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("expert fee payment not found")
		}
		return nil, err
	}

	// 使用FinancialService更新记录
	financialService := NewFinancialService()
	updateReq := &UpdateFinancialRecordRequest{
		Amount:        req.Amount,
		OccurredAt:    req.OccurredAt,
		PaymentMethod: req.PaymentMethod,
		ExpertName:    req.ExpertName,
		Description:   req.Description,
	}

	updatedRecord, err := financialService.UpdateFinancialRecord(recordID, userID, updateReq)
	if err != nil {
		return nil, err
	}

	// 重新加载完整记录
	if err := s.db.Preload("CreatedBy").First(updatedRecord, "id = ?", recordID).Error; err != nil {
		return nil, err
	}

	return updatedRecord, nil
}

// DeleteExpertFeePayment deletes an expert fee payment record
// userID: 操作用户ID，用于权限检查
func (s *BiddingService) DeleteExpertFeePayment(projectID string, recordID string, userID string) error {
	// 权限检查：经营负责人、项目管理员、系统管理员可以管理项目经营信息
	canManage, err := s.permissionService.CanManageBusinessInfo(userID, projectID)
	if err != nil {
		return fmt.Errorf("权限检查失败: %w", err)
	}
	if !canManage {
		return errors.New("权限不足：无法管理项目经营信息")
	}

	// 验证记录是否存在且属于该项目
	var record models.FinancialRecord
	if err := s.db.Where("id = ? AND project_id = ? AND financial_type = ?", recordID, projectID, models.FinancialTypeExpertFee).
		First(&record).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("expert fee payment not found")
		}
		return err
	}

	// 使用FinancialService删除记录
	financialService := NewFinancialService()
	return financialService.DeleteFinancialRecord(recordID, userID)
}

// DeleteBiddingInfo deletes bidding info for a project
// userID: 操作用户ID，用于权限检查
func (s *BiddingService) DeleteBiddingInfo(projectID string, userID string) error {
	// 权限检查：经营负责人、项目管理员、系统管理员可以管理项目经营信息
	canManage, err := s.permissionService.CanManageBusinessInfo(userID, projectID)
	if err != nil {
		return fmt.Errorf("权限检查失败: %w", err)
	}
	if !canManage {
		return errors.New("权限不足：无法管理项目经营信息")
	}

	// Verify project exists
	var project models.Project
	if err := s.db.First(&project, "id = ? AND is_deleted = ?", projectID, false).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("project not found")
		}
		return err
	}

	// Delete bidding info
	if err := s.db.Where("project_id = ?", projectID).Delete(&models.BiddingInfo{}).Error; err != nil {
		return err
	}

	return nil
}


