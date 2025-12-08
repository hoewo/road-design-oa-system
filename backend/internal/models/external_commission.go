package models

import "time"

type ExternalVendorType string

const (
	ExternalVendorCompany ExternalVendorType = "company"
	ExternalVendorPerson  ExternalVendorType = "person"
)

type ExternalCommission struct {
	ID             string             `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	ProjectID      string             `json:"project_id" gorm:"type:uuid;not null;index"`
	VendorName     string             `json:"vendor_name" gorm:"size:255;not null"`
	VendorType     ExternalVendorType `json:"vendor_type" gorm:"size:32;not null"`
	Score          *float64           `json:"score"` // 委托方评分
	ContractFileID *string            `json:"contract_file_id" gorm:"type:uuid"`
	ContractFile   *File              `json:"contract_file" gorm:"foreignKey:ContractFileID"`
	// 注意：支付和开票信息通过FinancialRecord管理（financial_type=commission_payment/vendor_invoice）
	Notes       string    `json:"notes" gorm:"type:text"`
	CreatedByID string    `json:"created_by_id" gorm:"type:uuid;not null"`
	CreatedBy   User      `json:"created_by" gorm:"foreignKey:CreatedByID"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
