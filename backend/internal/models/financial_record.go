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

type FinancialRecord struct {
	ID            uint          `json:"id" gorm:"primaryKey"`
	RecordType    FinancialType `json:"record_type" gorm:"not null"`
	Amount        float64       `json:"amount" gorm:"not null"`
	InvoiceNumber string        `json:"invoice_number"`
	InvoiceDate   *time.Time    `json:"invoice_date"`
	PaymentDate   *time.Time    `json:"payment_date"`
	Description   string        `json:"description"`

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
