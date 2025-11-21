package models

import (
	"time"
)

type FinancialType string

const (
	FinancialTypeReceivable FinancialType = "receivable" // 应收金额
	FinancialTypeInvoice    FinancialType = "invoice"    // 开票金额
	FinancialTypePayment    FinancialType = "payment"    // 支付金额
	FinancialTypeExpense    FinancialType = "expense"    // 费用支出
)

type FeeType string

const (
	FeeTypeDesign       FeeType = "design_fee"       // 设计费
	FeeTypeSurvey       FeeType = "survey_fee"       // 勘察费
	FeeTypeConsultation FeeType = "consultation_fee" // 咨询费
)

type FinancialRecord struct {
	ID               uint          `json:"id" gorm:"primaryKey"`
	RecordType       FinancialType `json:"record_type" gorm:"not null"`
	FeeType          FeeType       `json:"fee_type" gorm:"not null"` // 费用类型（设计费、勘察费、咨询费）
	Amount           float64       `json:"amount" gorm:"not null"`   // 金额（遗留字段，与receivable_amount保持一致）
	ReceivableAmount float64       `json:"receivable_amount"`        // 应收金额
	InvoiceNumber    string        `json:"invoice_number"`
	InvoiceDate      *time.Time    `json:"invoice_date"`   // 开票时间
	InvoiceAmount    float64       `json:"invoice_amount"` // 开票金额
	PaymentDate      *time.Time    `json:"payment_date"`   // 支付时间
	PaymentAmount    float64       `json:"payment_amount"` // 支付金额
	UnpaidAmount     float64       `json:"unpaid_amount"`  // 未收金额（计算字段）
	Description      string        `json:"description"`

	// 关联关系
	ProjectID uint    `json:"project_id" gorm:"not null"`
	Project   Project `json:"project" gorm:"foreignKey:ProjectID"`

	CreatedByID uint `json:"created_by_id" gorm:"not null"`
	CreatedBy   User `json:"created_by" gorm:"foreignKey:CreatedByID"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName returns the table name for the FinancialRecord model
func (FinancialRecord) TableName() string {
	return "financial_records"
}
