package models

import (
	"time"
)

type FileCategory string

const (
	// 合同相关
	FileCategoryContractMain       FileCategory = "contract_main"       // 主合同文件
	FileCategoryContractAmendment FileCategory = "contract_amendment"  // 补充协议文件
	FileCategoryContractExternal  FileCategory = "contract_external"   // 外委合同文件

	// 招投标相关
	FileCategoryTender FileCategory = "tender"       // 招标文件
	FileCategoryBid    FileCategory = "bid"          // 投标文件
	FileCategoryAward  FileCategory = "award_notice" // 中标通知书

	// 生产相关
	FileCategorySchemePPT       FileCategory = "scheme_ppt"        // 方案PPT
	FileCategoryPreliminary     FileCategory = "preliminary_design" // 初步设计
	FileCategoryConstruction    FileCategory = "construction_drawing" // 施工图设计
	FileCategoryVariation       FileCategory = "variation_order"  // 变更洽商
	FileCategoryCompletion      FileCategory = "completion_report" // 竣工验收
	FileCategoryAuditReport     FileCategory = "audit_report"      // 审计报告

	// 其他
	FileCategoryInvoice FileCategory = "invoice" // 发票文件
)

type File struct {
	ID           string       `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	FileName     string       `json:"file_name" gorm:"not null"`
	OriginalName string       `json:"original_name" gorm:"not null"`
	FilePath     string       `json:"file_path" gorm:"not null"`
	FileSize     int64        `json:"file_size" gorm:"not null"`
	FileType     string       `json:"file_type" gorm:"not null"`
	MimeType     string       `json:"mime_type" gorm:"not null"`
	Category     FileCategory `json:"category" gorm:"not null"`
	Description  string       `json:"description"`

	// 关联关系
	ProjectID string  `json:"project_id" gorm:"type:uuid;not null"`
	Project   Project `json:"project" gorm:"foreignKey:ProjectID"`

	UploaderID string `json:"uploader_id" gorm:"type:uuid;not null"`
	Uploader   User   `json:"uploader" gorm:"foreignKey:UploaderID"`

	// 软删除支持
	DeletedAt *time.Time `json:"deleted_at" gorm:"index"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName returns the table name for the File model
func (File) TableName() string {
	return "files"
}
