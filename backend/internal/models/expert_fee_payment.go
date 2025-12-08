package models

import (
	"time"
)

type PaymentMethod string

const (
	PaymentMethodCash     PaymentMethod = "cash"     // 现金
	PaymentMethodTransfer PaymentMethod = "transfer" // 转账
)

type ExpertFeePayment struct {
	ID            string        `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	PaymentMethod PaymentMethod `json:"payment_method" gorm:"not null"` // 支付方式
	Amount        float64       `json:"amount" gorm:"not null"`         // 金额
	ExpertName    string        `json:"expert_name" gorm:"not null"`    // 专家姓名
	ExpertID      *string       `json:"expert_id" gorm:"type:uuid"`     // 专家用户ID（如果是系统内用户）
	Expert        *User         `json:"expert,omitempty" gorm:"foreignKey:ExpertID"`
	Description   string        `json:"description" gorm:"type:text"`

	// 关联关系
	ProjectID string  `json:"project_id" gorm:"type:uuid;not null"`
	Project   Project `json:"project" gorm:"foreignKey:ProjectID"`

	CreatedByID string `json:"created_by_id" gorm:"type:uuid;not null"`
	CreatedBy   User   `json:"created_by" gorm:"foreignKey:CreatedByID"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName returns the table name for the ExpertFeePayment model
func (ExpertFeePayment) TableName() string {
	return "expert_fee_payments"
}
