package services

import (
	"errors"
	"time"

	"gorm.io/gorm"

	"project-oa-backend/internal/models"
	"project-oa-backend/pkg/database"
)

// BiddingService handles bidding information-related operations
type BiddingService struct {
	db *gorm.DB
}

// NewBiddingService creates a new bidding service
func NewBiddingService() *BiddingService {
	return &BiddingService{
		db: database.DB,
	}
}

// CreateOrUpdateBiddingInfoRequest represents the request to create or update bidding info
type CreateOrUpdateBiddingInfoRequest struct {
	TenderFileID      *string `json:"tender_file_id"`      // 招标文件ID
	BidFileID         *string `json:"bid_file_id"`        // 投标文件ID
	AwardNoticeFileID *string `json:"award_notice_file_id"` // 中标通知书文件ID
}

// GetBiddingInfo retrieves bidding info by project ID
func (s *BiddingService) GetBiddingInfo(projectID string) (*models.BiddingInfo, error) {
	var biddingInfo models.BiddingInfo
	if err := s.db.Where("project_id = ?", projectID).
		Preload("TenderFile").
		Preload("BidFile").
		Preload("AwardNoticeFile").
		First(&biddingInfo).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("bidding info not found")
		}
		return nil, err
	}

	return &biddingInfo, nil
}

// CreateOrUpdateBiddingInfo creates or updates bidding info for a project
func (s *BiddingService) CreateOrUpdateBiddingInfo(projectID string, req *CreateOrUpdateBiddingInfoRequest) (*models.BiddingInfo, error) {
	// Verify project exists
	var project models.Project
	if err := s.db.First(&project, "id = ?", projectID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("project not found")
		}
		return nil, err
	}

	// Check if bidding info already exists
	var biddingInfo models.BiddingInfo
	err := s.db.Where("project_id = ?", projectID).First(&biddingInfo).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		// Create new bidding info
		biddingInfo = models.BiddingInfo{
			ProjectID:         projectID,
			TenderFileID:      req.TenderFileID,
			BidFileID:         req.BidFileID,
			AwardNoticeFileID: req.AwardNoticeFileID,
		}
		if err := s.db.Create(&biddingInfo).Error; err != nil {
			return nil, err
		}
	} else if err != nil {
		return nil, err
	} else {
		// Update existing bidding info
		updates := make(map[string]interface{})
		if req.TenderFileID != nil {
			updates["tender_file_id"] = *req.TenderFileID
		}
		if req.BidFileID != nil {
			updates["bid_file_id"] = *req.BidFileID
		}
		if req.AwardNoticeFileID != nil {
			updates["award_notice_file_id"] = *req.AwardNoticeFileID
		}

		if err := s.db.Model(&biddingInfo).Updates(updates).Error; err != nil {
			return nil, err
		}
	}

	// Reload with associations
	s.db.Preload("TenderFile").
		Preload("BidFile").
		Preload("AwardNoticeFile").
		First(&biddingInfo, "id = ?", biddingInfo.ID)

	return &biddingInfo, nil
}

// CreateExpertFeePayment creates an expert fee payment record using FinancialRecord
func (s *BiddingService) CreateExpertFeePayment(projectID string, createdByID string, expertName string, amount float64, occurredAt time.Time, paymentMethod string, description string) (*models.FinancialRecord, error) {
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

// DeleteBiddingInfo deletes bidding info for a project
func (s *BiddingService) DeleteBiddingInfo(projectID string) error {
	// Verify project exists
	var project models.Project
	if err := s.db.First(&project, "id = ?", projectID).Error; err != nil {
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

// CanManageBiddingInfo checks if the given user has permission to manage bidding info.
// Only BusinessManager or Admin roles can manage bidding info.
func (s *BiddingService) CanManageBiddingInfo(userID string) (bool, error) {
	var user models.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, errors.New("user not found")
		}
		return false, err
	}
	// Check if user has business manager or admin role
	for _, role := range user.Roles {
		if role == string(models.RoleBusinessManager) || role == string(models.RoleAdmin) {
			return true, nil
		}
	}
	return false, nil
}

