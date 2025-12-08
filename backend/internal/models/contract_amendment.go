package models

import (
	"time"
)

type ContractAmendment struct {
	ID              string    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	AmendmentNumber string    `json:"amendment_number" gorm:"uniqueIndex;not null"`
	SignDate        time.Time `json:"sign_date" gorm:"not null"`
	Description     string    `json:"description" gorm:"type:text"`
	// 注意：FilePath已移除，文件通过File实体关联

	// 金额明细（按设计费、勘察费、咨询费分别录入）
	DesignFee       float64 `json:"design_fee"`       // 设计费
	SurveyFee       float64 `json:"survey_fee"`       // 勘察费
	ConsultationFee float64 `json:"consultation_fee"` // 咨询费
	ContractRate    float64 `json:"contract_rate"`    // 合同费率%

	// 关联关系
	ContractID string   `json:"contract_id" gorm:"type:uuid;not null"`
	Contract   Contract `json:"contract" gorm:"foreignKey:ContractID"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName returns the table name for the ContractAmendment model
func (ContractAmendment) TableName() string {
	return "contract_amendments"
}
