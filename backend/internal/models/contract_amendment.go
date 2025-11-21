package models

import (
	"time"
)

type ContractAmendment struct {
	ID              uint      `json:"id" gorm:"primaryKey"`
	AmendmentNumber string    `json:"amendment_number" gorm:"uniqueIndex;not null"`
	SignDate        time.Time `json:"sign_date" gorm:"not null"`
	FilePath        string    `json:"file_path"` // 补充协议文件路径
	Description     string    `json:"description" gorm:"type:text"`

	// 关联关系
	ContractID uint     `json:"contract_id" gorm:"not null"`
	Contract   Contract `json:"contract" gorm:"foreignKey:ContractID"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName returns the table name for the ContractAmendment model
func (ContractAmendment) TableName() string {
	return "contract_amendments"
}
