package models

import (
	"time"

	"gorm.io/gorm"
)

type UserRole string

const (
	RoleAdmin            UserRole = "admin"             // 系统管理员
	RoleProjectManager   UserRole = "project_manager"   // 项目管理员
	RoleBusinessManager  UserRole = "business_manager"  // 经营负责人
	RoleProductionManager UserRole = "production_manager" // 生产负责人
	RoleFinance          UserRole = "finance"           // 财务人员
	RoleMember           UserRole = "member"            // 普通成员
)

type User struct {
	ID         string    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Username   string    `json:"username" gorm:"uniqueIndex;not null"`
	Email      string    `json:"email" gorm:"uniqueIndex;not null"`
	Password   string    `json:"-" gorm:"not null"`
	RealName   string    `json:"real_name" gorm:"not null"`
	Role       UserRole  `json:"role" gorm:"not null"`
	Department string    `json:"department"`
	Phone      string    `json:"phone"`
	IsActive   bool      `json:"is_active" gorm:"default:true"`
	HasAccount bool      `json:"has_account" gorm:"default:false"` // 是否有账号
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
		u.Role = RoleMember // 默认角色为普通成员
	}
	return nil
}
