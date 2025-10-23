package models

import (
	"time"

	"gorm.io/gorm"
)

type UserRole string

const (
	RoleAdmin    UserRole = "admin"    // 系统管理员
	RoleManager  UserRole = "manager"  // 项目经理
	RoleBusiness UserRole = "business" // 经营人员
	RoleDesigner UserRole = "designer" // 设计人员
	RoleReviewer UserRole = "reviewer" // 复核人员
	RoleFinance  UserRole = "finance"  // 财务人员
)

type User struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	Username   string    `json:"username" gorm:"uniqueIndex;not null"`
	Email      string    `json:"email" gorm:"uniqueIndex;not null"`
	Password   string    `json:"-" gorm:"not null"`
	RealName   string    `json:"real_name" gorm:"not null"`
	Role       UserRole  `json:"role" gorm:"not null"`
	Department string    `json:"department"`
	Phone      string    `json:"phone"`
	IsActive   bool      `json:"is_active" gorm:"default:true"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// TableName returns the table name for the User model
func (User) TableName() string {
	return "users"
}

// BeforeCreate hook to set default values
func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.Role == "" {
		u.Role = RoleManager
	}
	return nil
}
