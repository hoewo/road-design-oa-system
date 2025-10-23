package models

import (
	"time"
)

type MemberRole string

const (
	MemberRoleManager     MemberRole = "manager"     // 项目负责人
	MemberRoleDesigner    MemberRole = "designer"    // 专业设计人
	MemberRoleParticipant MemberRole = "participant" // 专业参与人
	MemberRoleReviewer    MemberRole = "reviewer"    // 专业复核人
	MemberRoleAuditor     MemberRole = "auditor"     // 审核、审定
)

type ProjectMember struct {
	ID        uint       `json:"id" gorm:"primaryKey"`
	ProjectID uint       `json:"project_id" gorm:"not null"`
	UserID    uint       `json:"user_id" gorm:"not null"`
	Role      MemberRole `json:"role" gorm:"not null"`
	JoinDate  time.Time  `json:"join_date" gorm:"not null"`
	LeaveDate *time.Time `json:"leave_date"`
	IsActive  bool       `json:"is_active" gorm:"default:true"`

	// 关联关系
	Project Project `json:"project" gorm:"foreignKey:ProjectID"`
	User    User    `json:"user" gorm:"foreignKey:UserID"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName returns the table name for the ProjectMember model
func (ProjectMember) TableName() string {
	return "project_members"
}
