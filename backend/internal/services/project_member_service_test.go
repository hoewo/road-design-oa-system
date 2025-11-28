package services

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"project-oa-backend/internal/models"
	"project-oa-backend/pkg/database"
)

type mockMemberNotifier struct {
	events []MemberNotificationEvent
}

func (m *mockMemberNotifier) Notify(event MemberNotificationEvent) {
	m.events = append(m.events, event)
}

func setupProjectMemberTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	require.NoError(t, err)

	err = db.AutoMigrate(
		&models.User{},
		&models.Project{},
		&models.ProjectMember{},
	)
	require.NoError(t, err)

	database.DB = db
	return db
}

func TestProjectMemberService_CreateAndList(t *testing.T) {
	db := setupProjectMemberTestDB(t)
	notifier := &mockMemberNotifier{}
	service := NewProjectMemberService(notifier)

	project := &models.Project{
		ProjectName:   "生产线项目",
		ProjectNumber: "2025-100",
	}
	require.NoError(t, db.Create(project).Error)

	user := &models.User{
		Username: "pm1", Email: "pm1@example.com", Password: "pwd", RealName: "成员A", Role: models.RoleDesigner,
	}
	require.NoError(t, db.Create(user).Error)

	req := &CreateProjectMemberRequest{
		UserID:   user.ID,
		Role:     models.MemberRoleManager,
		JoinDate: time.Now().AddDate(0, -1, 0),
		IsActive: true,
	}

	member, err := service.CreateMember(project.ID, req)
	require.NoError(t, err)
	require.Equal(t, project.ID, member.ProjectID)
	require.Equal(t, user.ID, member.User.ID)

	members, err := service.ListMembers(project.ID)
	require.NoError(t, err)
	require.Len(t, members, 1)
	require.Equal(t, models.MemberRoleManager, members[0].Role)
	require.Equal(t, "成员A", members[0].User.RealName)

	require.Len(t, notifier.events, 1)
	require.Equal(t, MemberNotificationAssigned, notifier.events[0].Action)
}

func TestProjectMemberService_RoleUniqueness(t *testing.T) {
	db := setupProjectMemberTestDB(t)
	service := NewProjectMemberService(nil)

	project := &models.Project{ProjectName: "项目B", ProjectNumber: "2025-101"}
	require.NoError(t, db.Create(project).Error)

	user1 := &models.User{Username: "u1", Email: "u1@example.com", Password: "pwd", RealName: "成员1"}
	user2 := &models.User{Username: "u2", Email: "u2@example.com", Password: "pwd", RealName: "成员2"}
	require.NoError(t, db.Create(user1).Error)
	require.NoError(t, db.Create(user2).Error)

	req := &CreateProjectMemberRequest{
		UserID:   user1.ID,
		Role:     models.MemberRoleManager,
		JoinDate: time.Now().AddDate(0, -2, 0),
		IsActive: true,
	}

	_, err := service.CreateMember(project.ID, req)
	require.NoError(t, err)

	reqDuplicate := &CreateProjectMemberRequest{
		UserID:   user2.ID,
		Role:     models.MemberRoleManager,
		JoinDate: time.Now().AddDate(0, -1, 0),
	}

	_, err = service.CreateMember(project.ID, reqDuplicate)
	require.Error(t, err)
	require.Contains(t, err.Error(), "role already assigned")
}

func TestProjectMemberService_UpdateLifecycle(t *testing.T) {
	db := setupProjectMemberTestDB(t)
	notifier := &mockMemberNotifier{}
	service := NewProjectMemberService(notifier)

	project := &models.Project{ProjectName: "项目C", ProjectNumber: "2025-102"}
	require.NoError(t, db.Create(project).Error)

	user := &models.User{Username: "u99", Email: "u99@example.com", Password: "pwd", RealName: "成员C"}
	require.NoError(t, db.Create(user).Error)

	member, err := service.CreateMember(project.ID, &CreateProjectMemberRequest{
		UserID:   user.ID,
		Role:     models.MemberRoleDesigner,
		JoinDate: time.Now().AddDate(0, -3, 0),
	})
	require.NoError(t, err)

	newRole := models.MemberRoleReviewer
	leaveDate := time.Now()
	isActive := false

	updated, err := service.UpdateMember(member.ID, &UpdateProjectMemberRequest{
		Role:      &newRole,
		LeaveDate: &leaveDate,
		IsActive:  &isActive,
	})
	require.NoError(t, err)
	require.Equal(t, newRole, updated.Role)
	require.False(t, updated.IsActive)
	require.NotNil(t, updated.LeaveDate)

	require.Len(t, notifier.events, 2) // create + update
	require.Equal(t, MemberNotificationUpdated, notifier.events[1].Action)

	err = service.DeleteMember(updated.ID)
	require.NoError(t, err)
	require.Len(t, notifier.events, 3)
	require.Equal(t, MemberNotificationRemoved, notifier.events[2].Action)
}
