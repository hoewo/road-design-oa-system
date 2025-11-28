package services

import (
	"errors"
	"fmt"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"project-oa-backend/internal/models"
	"project-oa-backend/pkg/database"
)

// MemberNotificationAction represents the notification action type.
type MemberNotificationAction string

const (
	// MemberNotificationAssigned indicates a new assignment event.
	MemberNotificationAssigned MemberNotificationAction = "assigned"
	// MemberNotificationUpdated indicates a role update event.
	MemberNotificationUpdated MemberNotificationAction = "updated"
	// MemberNotificationRemoved indicates a removal event.
	MemberNotificationRemoved MemberNotificationAction = "removed"
)

// MemberNotificationEvent captures the payload for notifications.
type MemberNotificationEvent struct {
	Action    MemberNotificationAction
	ProjectID uint
	MemberID  uint
	UserID    uint
	Role      models.MemberRole
}

// MemberNotifier allows plugging in different notification transports.
type MemberNotifier interface {
	Notify(event MemberNotificationEvent)
}

type noopMemberNotifier struct{}

func (noopMemberNotifier) Notify(event MemberNotificationEvent) {}

// ProjectMemberService manages project members and their lifecycle.
type ProjectMemberService struct {
	db        *gorm.DB
	notifier  MemberNotifier
	timeNowFn func() time.Time
}

// NewProjectMemberService builds a new ProjectMemberService.
func NewProjectMemberService(notifier MemberNotifier) *ProjectMemberService {
	if notifier == nil {
		notifier = noopMemberNotifier{}
	}

	return &ProjectMemberService{
		db:        database.DB,
		notifier:  notifier,
		timeNowFn: time.Now,
	}
}

// CreateProjectMemberRequest represents payload for creating members.
type CreateProjectMemberRequest struct {
	UserID    uint              `json:"user_id" binding:"required"`
	Role      models.MemberRole `json:"role" binding:"required"`
	JoinDate  time.Time         `json:"join_date" binding:"required"`
	LeaveDate *time.Time        `json:"leave_date"`
	IsActive  bool              `json:"is_active"`
}

// UpdateProjectMemberRequest represents payload for updating members.
type UpdateProjectMemberRequest struct {
	Role      *models.MemberRole `json:"role"`
	JoinDate  *time.Time         `json:"join_date"`
	LeaveDate *time.Time         `json:"leave_date"`
	IsActive  *bool              `json:"is_active"`
}

// MemberUserBrief represents lightweight user information for members.
type MemberUserBrief struct {
	ID       uint   `json:"id"`
	Username string `json:"username"`
	RealName string `json:"real_name"`
	Role     string `json:"role"`
}

// ProjectMemberResponse represents the data returned to callers.
type ProjectMemberResponse struct {
	ID        uint              `json:"id"`
	ProjectID uint              `json:"project_id"`
	UserID    uint              `json:"user_id"`
	Role      models.MemberRole `json:"role"`
	JoinDate  time.Time         `json:"join_date"`
	LeaveDate *time.Time        `json:"leave_date,omitempty"`
	IsActive  bool              `json:"is_active"`
	User      MemberUserBrief   `json:"user"`
	CreatedAt time.Time         `json:"created_at"`
	UpdatedAt time.Time         `json:"updated_at"`
}

// ListMembers returns members belonging to a project.
func (s *ProjectMemberService) ListMembers(projectID uint) ([]*ProjectMemberResponse, error) {
	if err := s.ensureProjectExists(projectID); err != nil {
		return nil, err
	}

	var members []models.ProjectMember
	if err := s.db.
		Preload("User").
		Where("project_id = ?", projectID).
		Order("join_date ASC").
		Find(&members).Error; err != nil {
		return nil, err
	}

	return mapMembersToResponse(members), nil
}

// CreateMember adds a project member with validation.
func (s *ProjectMemberService) CreateMember(projectID uint, req *CreateProjectMemberRequest) (*ProjectMemberResponse, error) {
	if req == nil {
		return nil, errors.New("request cannot be nil")
	}

	if err := s.ensureProjectExists(projectID); err != nil {
		return nil, err
	}

	user, err := s.ensureUserExists(req.UserID)
	if err != nil {
		return nil, err
	}

	if err := s.validateRole(req.Role); err != nil {
		return nil, err
	}

	if err := s.ensureRoleAvailable(projectID, req.Role); err != nil {
		return nil, err
	}

	if err := s.validateDates(req.JoinDate, req.LeaveDate); err != nil {
		return nil, err
	}

	member := &models.ProjectMember{
		ProjectID: projectID,
		UserID:    req.UserID,
		Role:      req.Role,
		JoinDate:  req.JoinDate,
		LeaveDate: req.LeaveDate,
		IsActive:  req.IsActive,
	}

	if err := s.db.Create(member).Error; err != nil {
		return nil, err
	}

	member.User = *user
	response := mapMemberToResponse(member)

	s.notifier.Notify(MemberNotificationEvent{
		Action:    MemberNotificationAssigned,
		ProjectID: projectID,
		MemberID:  member.ID,
		UserID:    member.UserID,
		Role:      member.Role,
	})

	return response, nil
}

// UpdateMember updates fields for an existing project member.
func (s *ProjectMemberService) UpdateMember(memberID uint, req *UpdateProjectMemberRequest) (*ProjectMemberResponse, error) {
	if req == nil {
		return nil, errors.New("request cannot be nil")
	}

	member, err := s.getMember(memberID)
	if err != nil {
		return nil, err
	}

	if req.Role != nil {
		if err := s.validateRole(*req.Role); err != nil {
			return nil, err
		}
		if *req.Role != member.Role {
			if err := s.ensureRoleAvailable(member.ProjectID, *req.Role); err != nil {
				return nil, err
			}
			member.Role = *req.Role
		}
	}

	if req.JoinDate != nil {
		if err := s.validateDates(*req.JoinDate, nil); err != nil {
			return nil, err
		}
		member.JoinDate = *req.JoinDate
	}

	if req.LeaveDate != nil {
		if err := s.validateDates(member.JoinDate, req.LeaveDate); err != nil {
			return nil, err
		}
		member.LeaveDate = req.LeaveDate
	}

	if req.IsActive != nil {
		member.IsActive = *req.IsActive
	}

	if err := s.db.Save(member).Error; err != nil {
		return nil, err
	}

	response := mapMemberToResponse(member)

	s.notifier.Notify(MemberNotificationEvent{
		Action:    MemberNotificationUpdated,
		ProjectID: member.ProjectID,
		MemberID:  member.ID,
		UserID:    member.UserID,
		Role:      member.Role,
	})

	return response, nil
}

// DeleteMember removes a project member.
func (s *ProjectMemberService) DeleteMember(memberID uint) error {
	member, err := s.getMember(memberID)
	if err != nil {
		return err
	}

	if err := s.db.Delete(&models.ProjectMember{}, memberID).Error; err != nil {
		return err
	}

	s.notifier.Notify(MemberNotificationEvent{
		Action:    MemberNotificationRemoved,
		ProjectID: member.ProjectID,
		MemberID:  member.ID,
		UserID:    member.UserID,
		Role:      member.Role,
	})

	return nil
}

func (s *ProjectMemberService) ensureProjectExists(projectID uint) error {
	var project models.Project
	if err := s.db.Select("id").First(&project, projectID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("project not found")
		}
		return err
	}
	return nil
}

func (s *ProjectMemberService) ensureUserExists(userID uint) (*models.User, error) {
	var user models.User
	if err := s.db.First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return &user, nil
}

func (s *ProjectMemberService) validateRole(role models.MemberRole) error {
	if _, ok := models.AllowedMemberRoles[role]; !ok {
		return fmt.Errorf("invalid role: %s", role)
	}
	return nil
}

func (s *ProjectMemberService) ensureRoleAvailable(projectID uint, role models.MemberRole) error {
	var count int64
	if err := s.db.Model(&models.ProjectMember{}).
		Where("project_id = ? AND role = ?", projectID, role).
		Count(&count).Error; err != nil {
		return err
	}

	if count > 0 {
		return fmt.Errorf("role already assigned for project: %s", role)
	}

	return nil
}

func (s *ProjectMemberService) validateDates(joinDate time.Time, leaveDate *time.Time) error {
	now := s.timeNowFn()
	if joinDate.After(now) {
		return errors.New("join date cannot be in the future")
	}
	if leaveDate != nil && leaveDate.Before(joinDate) {
		return errors.New("leave date cannot be before join date")
	}
	return nil
}

func (s *ProjectMemberService) getMember(memberID uint) (*models.ProjectMember, error) {
	var member models.ProjectMember
	if err := s.db.Preload("User").First(&member, memberID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("project member not found")
		}
		return nil, err
	}
	return &member, nil
}

func mapMembersToResponse(members []models.ProjectMember) []*ProjectMemberResponse {
	result := make([]*ProjectMemberResponse, 0, len(members))
	for i := range members {
		result = append(result, mapMemberToResponse(&members[i]))
	}
	return result
}

func mapMemberToResponse(member *models.ProjectMember) *ProjectMemberResponse {
	user := MemberUserBrief{}
	if member.User.ID != 0 {
		user = MemberUserBrief{
			ID:       member.User.ID,
			Username: member.User.Username,
			RealName: member.User.RealName,
			Role:     string(member.User.Role),
		}
	}

	return &ProjectMemberResponse{
		ID:        member.ID,
		ProjectID: member.ProjectID,
		UserID:    member.UserID,
		Role:      member.Role,
		JoinDate:  member.JoinDate,
		LeaveDate: member.LeaveDate,
		IsActive:  member.IsActive,
		User:      user,
		CreatedAt: member.CreatedAt,
		UpdatedAt: member.UpdatedAt,
	}
}

// loggingMemberNotifier emits events to the structured logger.
type loggingMemberNotifier struct {
	logger *zap.Logger
}

// NewLoggingMemberNotifier returns a notifier backed by zap logger.
func NewLoggingMemberNotifier(logger *zap.Logger) MemberNotifier {
	if logger == nil {
		return noopMemberNotifier{}
	}
	return &loggingMemberNotifier{logger: logger}
}

func (l *loggingMemberNotifier) Notify(event MemberNotificationEvent) {
	if l.logger == nil {
		return
	}
	l.logger.Info("project member notification",
		zap.String("action", string(event.Action)),
		zap.Uint("project_id", event.ProjectID),
		zap.Uint("member_id", event.MemberID),
		zap.Uint("user_id", event.UserID),
		zap.String("role", string(event.Role)),
	)
}
