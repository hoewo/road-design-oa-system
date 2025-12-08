package models

import (
	"time"
)

// ProjectContact 项目联系人实体
// 甲方在特定项目中的联系人，作为独立实体存在
type ProjectContact struct {
	ID        string  `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	ProjectID string  `json:"project_id" gorm:"type:uuid;not null;uniqueIndex"`
	Project   Project `json:"project" gorm:"foreignKey:ProjectID"`

	// 关联到项目的甲方
	ClientID string `json:"client_id" gorm:"type:uuid;not null"`
	Client   Client `json:"client" gorm:"foreignKey:ClientID"`

	// 联系人信息
	ContactName  string `json:"contact_name" gorm:"not null"`
	ContactPhone string `json:"contact_phone"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName returns the table name for the ProjectContact model
func (ProjectContact) TableName() string {
	return "project_contacts"
}
