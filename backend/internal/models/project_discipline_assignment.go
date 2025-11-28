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
	ID         uint           `json:"id" gorm:"primaryKey"`
	ProjectID  uint           `json:"project_id" gorm:"not null;index:idx_project_discipline_role,priority:1"`
	Discipline string         `json:"discipline" gorm:"size:100;not null;index:idx_project_discipline_role,priority:2"`
	Role       DisciplineRole `json:"role" gorm:"not null;size:32;index:idx_project_discipline_role,priority:3"`
	UserID     uint           `json:"user_id" gorm:"not null"`

	User User `json:"user" gorm:"foreignKey:UserID"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName sets the table name for GORM.
func (ProjectDisciplineAssignment) TableName() string {
	return "project_discipline_assignments"
}
