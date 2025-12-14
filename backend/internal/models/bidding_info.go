package models

import (
	"time"
)

// BiddingInfo 招投标信息
type BiddingInfo struct {
	ID                string    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	ProjectID         string    `json:"project_id" gorm:"type:uuid;not null;uniqueIndex"`
	Project           Project   `json:"project" gorm:"foreignKey:ProjectID"`

	// 招投标文件（通过File实体关联）
	TenderFileID      *string `json:"tender_file_id" gorm:"type:uuid"`
	TenderFile        *File   `json:"tender_file,omitempty" gorm:"foreignKey:TenderFileID"`
	BidFileID         *string `json:"bid_file_id" gorm:"type:uuid"`
	BidFile           *File   `json:"bid_file,omitempty" gorm:"foreignKey:BidFileID"`
	AwardNoticeFileID *string `json:"award_notice_file_id" gorm:"type:uuid"`
	AwardNoticeFile   *File   `json:"award_notice_file,omitempty" gorm:"foreignKey:AwardNoticeFileID"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName returns the table name for the BiddingInfo model
func (BiddingInfo) TableName() string {
	return "bidding_info"
}

