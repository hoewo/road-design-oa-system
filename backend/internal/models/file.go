package models

import (
	"time"
)

type FileCategory string

const (
	FileCategoryContract   FileCategory = "contract"   // 合同文件
	FileCategoryBidding    FileCategory = "bidding"    // 招投标文件
	FileCategoryDesign     FileCategory = "design"     // 设计文件
	FileCategoryAudit      FileCategory = "audit"      // 审计文件
	FileCategoryProduction FileCategory = "production" // 生产文件
	FileCategoryOther      FileCategory = "other"      // 其他文件
)

type File struct {
	ID           uint         `json:"id" gorm:"primaryKey"`
	FileName     string       `json:"file_name" gorm:"not null"`
	OriginalName string       `json:"original_name" gorm:"not null"`
	FilePath     string       `json:"file_path" gorm:"not null"`
	FileSize     int64        `json:"file_size" gorm:"not null"`
	FileType     string       `json:"file_type" gorm:"not null"`
	MimeType     string       `json:"mime_type" gorm:"not null"`
	Category     FileCategory `json:"category" gorm:"not null"`
	Description  string       `json:"description"`

	// 关联关系
	ProjectID uint    `json:"project_id" gorm:"not null"`
	Project   Project `json:"project" gorm:"foreignKey:ProjectID"`

	UploaderID uint `json:"uploader_id" gorm:"not null"`
	Uploader   User `json:"uploader" gorm:"foreignKey:UploaderID"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName returns the table name for the File model
func (File) TableName() string {
	return "files"
}
