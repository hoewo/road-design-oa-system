package models

import (
	"time"
)

type Contract struct {
	ID              string    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	ContractNumber  string    `json:"contract_number" gorm:"uniqueIndex;not null"`
	SignDate        time.Time `json:"sign_date" gorm:"not null"`
	ContractRate    float64   `json:"contract_rate"`                   // 合同费率%
	ContractAmount  float64   `json:"contract_amount" gorm:"not null"` // 合同金额（应等于设计费+勘察费+咨询费之和）
	DesignFee       float64   `json:"design_fee"`                      // 设计费
	SurveyFee       float64   `json:"survey_fee"`                      // 勘察费
	ConsultationFee float64   `json:"consultation_fee"`                // 咨询费

	// 关联关系
	ProjectID string  `json:"project_id" gorm:"type:uuid;not null"`
	Project   Project `json:"project" gorm:"foreignKey:ProjectID"`

	// 合同文件（通过File实体关联）
	ContractFileID *string `json:"contract_file_id" gorm:"type:uuid"`
	ContractFile   *File   `json:"contract_file,omitempty" gorm:"foreignKey:ContractFileID"`

	// 关联数据
	Amendments []ContractAmendment `json:"amendments" gorm:"foreignKey:ContractID"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName returns the table name for the Contract model
func (Contract) TableName() string {
	return "contracts"
}
