package models

import (
	"time"
)

type MemberRole string

const (
	MemberRoleManager           MemberRole = "manager"            // 项目负责人
	MemberRoleDesigner          MemberRole = "designer"           // 专业设计人
	MemberRoleParticipant       MemberRole = "participant"        // 专业参与人
	MemberRoleReviewer          MemberRole = "reviewer"           // 专业复核人
	MemberRoleAuditor           MemberRole = "auditor"            // 审核、审定
	MemberRoleBusinessManager   MemberRole = "business_manager"   // 经营负责人
	MemberRoleBusinessPersonnel MemberRole = "business_personnel" // 经营人员
)

type ProjectMember struct {
	ID        string     `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	ProjectID string     `json:"project_id" gorm:"type:uuid;not null;index:idx_project_role,priority:1;index:idx_project_user_role,priority:1"`
	UserID    string     `json:"user_id" gorm:"type:uuid;not null;index:idx_project_user_role,priority:2"`
	Role      MemberRole `json:"role" gorm:"not null;size:64;index:idx_project_role,priority:2"`

	// 专业关联（生产人员角色需要）
	DisciplineID *string     `json:"discipline_id" gorm:"type:uuid"` // 专业ID（生产人员角色必填）
	Discipline   *Discipline `json:"discipline,omitempty" gorm:"foreignKey:DisciplineID"`

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

// AllowedMemberRoles lists the supported project member roles.
var AllowedMemberRoles = map[MemberRole]struct{}{
	MemberRoleManager:           {},
	MemberRoleDesigner:          {},
	MemberRoleParticipant:       {},
	MemberRoleReviewer:          {},
	MemberRoleAuditor:           {},
	MemberRoleBusinessManager:   {},
	MemberRoleBusinessPersonnel: {},
}
