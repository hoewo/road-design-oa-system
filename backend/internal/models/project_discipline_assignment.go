package models

import "time"

// DisciplineRole represents the role type inside a discipline assignment.
type DisciplineRole string

const (
	DisciplineRoleDesigner    DisciplineRole = "designer"
	DisciplineRoleParticipant DisciplineRole = "participant"
	DisciplineRoleReviewer    DisciplineRole = "reviewer"
)

// ProjectDisciplineAssignment stores the mapping among project, discipline, role and user.
type ProjectDisciplineAssignment struct {
	ID           string         `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	ProjectID    string         `json:"project_id" gorm:"type:uuid;not null;index:idx_project_discipline_role,priority:1"`
	DisciplineID string         `json:"discipline_id" gorm:"type:uuid;not null;index:idx_project_discipline_role,priority:2"` // 使用Discipline实体
	Discipline   *Discipline    `json:"discipline,omitempty" gorm:"foreignKey:DisciplineID"`
	Role         DisciplineRole `json:"role" gorm:"not null;size:32;index:idx_project_discipline_role,priority:3"`
	UserID       string         `json:"user_id" gorm:"type:uuid;not null"`

	User User `json:"user" gorm:"foreignKey:UserID"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName sets the table name for GORM.
func (ProjectDisciplineAssignment) TableName() string {
	return "project_discipline_assignments"
}
