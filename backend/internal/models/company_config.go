package models

import (
	"time"
)

// CompanyConfig represents company-level configuration settings
type CompanyConfig struct {
	ID          string    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	ConfigKey   string    `json:"config_key" gorm:"uniqueIndex;not null"` // 配置键（如：default_management_fee_ratio）
	ConfigValue string    `json:"config_value" gorm:"not null"`           // 配置值（JSON字符串或简单值）
	Description string    `json:"description" gorm:"type:text"`           // 配置说明
	CreatedByID string    `json:"created_by_id" gorm:"type:uuid;not null"`
	CreatedBy   User      `json:"created_by" gorm:"foreignKey:CreatedByID"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// TableName returns the table name for the CompanyConfig model
func (CompanyConfig) TableName() string {
	return "company_configs"
}

// Common config keys
const (
	ConfigKeyDefaultManagementFeeRatio = "default_management_fee_ratio" // 默认管理费比例
)
