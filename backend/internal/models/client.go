package models

import (
	"time"

	"gorm.io/gorm"
)

type Client struct {
	ID           uint   `json:"id" gorm:"primaryKey"`
	ClientName   string `json:"client_name" gorm:"uniqueIndex;not null"`
	ContactName  string `json:"contact_name"`
	ContactPhone string `json:"contact_phone"`
	Email        string `json:"email"`
	Address      string `json:"address"`
	TaxNumber    string `json:"tax_number"`
	BankAccount  string `json:"bank_account"`
	BankName     string `json:"bank_name"`
	IsActive     bool   `json:"is_active" gorm:"default:true"`

	// 关联关系
	Projects []Project `json:"projects" gorm:"foreignKey:ClientID"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName returns the table name for the Client model
func (Client) TableName() string {
	return "clients"
}

// BeforeCreate hook to set default values
func (c *Client) BeforeCreate(tx *gorm.DB) error {
	if !c.IsActive {
		c.IsActive = true
	}
	return nil
}
