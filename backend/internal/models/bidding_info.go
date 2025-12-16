package models

import (
	"time"

	"github.com/lib/pq"
)

// BiddingInfo 招投标信息
type BiddingInfo struct {
	ID                string    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	ProjectID         string    `json:"project_id" gorm:"type:uuid;not null;uniqueIndex"`
	Project           Project   `json:"project" gorm:"foreignKey:ProjectID"`

	// 招投标文件（数组字段，支持多个文件，通过File实体关联）
	TenderFileIDs      pq.StringArray `json:"tender_file_ids" gorm:"type:text[]"`      // PostgreSQL 数组类型
	TenderFiles        []File         `json:"tender_files,omitempty" gorm:"-"`         // 关联查询，不存储
	BidFileIDs         pq.StringArray `json:"bid_file_ids" gorm:"type:text[]"`          // PostgreSQL 数组类型
	BidFiles           []File         `json:"bid_files,omitempty" gorm:"-"`             // 关联查询，不存储
	AwardNoticeFileIDs pq.StringArray `json:"award_notice_file_ids" gorm:"type:text[]"` // PostgreSQL 数组类型
	AwardNoticeFiles   []File         `json:"award_notice_files,omitempty" gorm:"-"`     // 关联查询，不存储

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName returns the table name for the BiddingInfo model
func (BiddingInfo) TableName() string {
	return "bidding_info"
}

