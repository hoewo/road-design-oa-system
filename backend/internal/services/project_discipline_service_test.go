package services

import (
	"testing"

	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"project-oa-backend/internal/models"
	"project-oa-backend/pkg/database"
)

func setupProjectDisciplineTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	require.NoError(t, err)

	err = db.AutoMigrate(
		&models.User{},
		&models.Project{},
		&models.ProjectDisciplineAssignment{},
	)
	require.NoError(t, err)

	database.DB = db
	return db
}

func TestProjectDisciplineService_UpdateAndList(t *testing.T) {
	db := setupProjectDisciplineTestDB(t)
	service := NewProjectDisciplineService()

	project := &models.Project{
		ProjectName:   "测试项目",
		ProjectNumber: "2025-001",
	}
	require.NoError(t, db.Create(project).Error)

	designer := &models.User{Username: "designer", Email: "d@example.com", Password: "pwd", RealName: "设计人"}
	participant := &models.User{Username: "participant", Email: "p@example.com", Password: "pwd", RealName: "参与人"}
	reviewer := &models.User{Username: "reviewer", Email: "r@example.com", Password: "pwd", RealName: "复核人"}
	require.NoError(t, db.Create(designer).Error)
	require.NoError(t, db.Create(participant).Error)
	require.NoError(t, db.Create(reviewer).Error)

	req := &UpdateProjectDisciplineAssignmentsRequest{
		Assignments: []DisciplineAssignmentInput{
			{
				Discipline:    "道路",
				DesignerID:    designer.ID,
				ParticipantID: participant.ID,
				ReviewerID:    reviewer.ID,
			},
		},
	}

	assignments, err := service.ReplaceAssignments(project.ID, req)
	require.NoError(t, err)
	require.Len(t, assignments, 1)
	require.Equal(t, "道路", assignments[0].Discipline)
	require.Equal(t, designer.ID, assignments[0].Designer.ID)

	// list
	listed, err := service.ListAssignments(project.ID)
	require.NoError(t, err)
	require.Len(t, listed, 1)
	require.Equal(t, assignments[0], listed[0])
}

func TestProjectDisciplineService_UpdateValidation(t *testing.T) {
	db := setupProjectDisciplineTestDB(t)
	service := NewProjectDisciplineService()

	project := &models.Project{
		ProjectName:   "测试项目",
		ProjectNumber: "2025-002",
	}
	require.NoError(t, db.Create(project).Error)

	req := &UpdateProjectDisciplineAssignmentsRequest{
		Assignments: []DisciplineAssignmentInput{
			{
				Discipline:    "道路",
				DesignerID:    0,
				ParticipantID: 1,
				ReviewerID:    2,
			},
		},
	}

	_, err := service.ReplaceAssignments(project.ID, req)
	require.Error(t, err)
	require.Contains(t, err.Error(), "designer_id is required")
}
