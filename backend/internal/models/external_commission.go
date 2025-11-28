package models

import "time"

type ExternalVendorType string

const (
	ExternalVendorCompany ExternalVendorType = "company"
	ExternalVendorPerson  ExternalVendorType = "person"
)

type ExternalCommission struct {
	ID             uint               `json:"id" gorm:"primaryKey"`
	ProjectID      uint               `json:"project_id" gorm:"not null;index"`
	VendorName     string             `json:"vendor_name" gorm:"size:255;not null"`
	VendorType     ExternalVendorType `json:"vendor_type" gorm:"size:32;not null"`
	Score          *int               `json:"score"`
	ContractFileID *uint              `json:"contract_file_id"`
	ContractFile   *File              `json:"contract_file" gorm:"foreignKey:ContractFileID"`
	InvoiceFileID  *uint              `json:"invoice_file_id"`
	InvoiceFile    *File              `json:"invoice_file" gorm:"foreignKey:InvoiceFileID"`
	PaymentAmount  float64            `json:"payment_amount"`
	PaymentDate    *time.Time         `json:"payment_date"`
	Notes          string             `json:"notes" gorm:"type:text"`
	CreatedByID    uint               `json:"created_by_id" gorm:"not null"`
	CreatedBy      User               `json:"created_by" gorm:"foreignKey:CreatedByID"`
	CreatedAt      time.Time          `json:"created_at"`
	UpdatedAt      time.Time          `json:"updated_at"`
}
