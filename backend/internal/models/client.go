package models

import (
	"time"

	"gorm.io/gorm"
)

type Client struct {
	ID          string `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	ClientName  string `json:"client_name" gorm:"uniqueIndex;not null"`
	Email       string `json:"email"`
	Address     string `json:"address"`
	TaxNumber   string `json:"tax_number"`
	BankAccount string `json:"bank_account"`
	BankName    string `json:"bank_name"`
	IsActive    bool   `json:"is_active" gorm:"default:true"`
	// 注意：ContactName和ContactPhone已移除，联系人信息通过ProjectContact实体管理

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
