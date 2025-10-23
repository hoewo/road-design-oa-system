package models

import (
	"time"
)

type Contract struct {
	ID              uint      `json:"id" gorm:"primaryKey"`
	ContractNumber  string    `json:"contract_number" gorm:"uniqueIndex;not null"`
	ContractType    string    `json:"contract_type" gorm:"not null"` // 设计费、勘察费、咨询费
	SignDate        time.Time `json:"sign_date" gorm:"not null"`
	ContractRate    float64   `json:"contract_rate"` // 合同费率%
	ContractAmount  float64   `json:"contract_amount" gorm:"not null"` // 合同金额
	FilePath        string    `json:"file_path"` // 合同文件路径

	// 关联关系
	ProjectID uint    `json:"project_id" gorm:"not null"`
	Project   Project `json:"project" gorm:"foreignKey:ProjectID"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName returns the table name for the Contract model
func (Contract) TableName() string {
	return "contracts"
}
