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
	ProjectID string // UUID string
	MemberID  string // UUID string
	UserID    string // UUID string
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
	UserID    string            `json:"user_id" binding:"required"` // UUID string
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
	ID       string `json:"id"` // UUID string
	Username string `json:"username"`
	RealName string `json:"real_name"`
	Role     string `json:"role"`
}

// ProjectMemberResponse represents the data returned to callers.
type ProjectMemberResponse struct {
	ID        string            `json:"id"`         // UUID string
	ProjectID string            `json:"project_id"` // UUID string
	UserID    string            `json:"user_id"`    // UUID string
	Role      models.MemberRole `json:"role"`
	JoinDate  time.Time         `json:"join_date"`
	LeaveDate *time.Time        `json:"leave_date,omitempty"`
	IsActive  bool              `json:"is_active"`
	User      MemberUserBrief   `json:"user"`
	CreatedAt time.Time         `json:"created_at"`
	UpdatedAt time.Time         `json:"updated_at"`
}

// ListMembers returns members belonging to a project (UUID string).
func (s *ProjectMemberService) ListMembers(projectID string) ([]*ProjectMemberResponse, error) {
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

// CreateMember adds a project member with validation (UUID string).
// userID: 创建项目成员的用户ID，用于权限检查
func (s *ProjectMemberService) CreateMember(userID string, projectID string, req *CreateProjectMemberRequest) (*ProjectMemberResponse, error) {
	if req == nil {
		return nil, errors.New("request cannot be nil")
	}

	// 权限检查：系统管理员、项目管理员、项目经营负责人、项目生产负责人可以配置项目成员
	permissionService := NewPermissionService()
	canManage, err := permissionService.CanManageProjectMembers(userID, projectID, req.Role)
	if err != nil {
		return nil, fmt.Errorf("权限检查失败: %w", err)
	}
	if !canManage {
		return nil, errors.New("权限不足：无法配置项目成员")
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

// UpdateMember updates fields for an existing project member (UUID string).
// userID: 更新项目成员的用户ID，用于权限检查
func (s *ProjectMemberService) UpdateMember(userID string, memberID string, req *UpdateProjectMemberRequest) (*ProjectMemberResponse, error) {
	if req == nil {
		return nil, errors.New("request cannot be nil")
	}

	member, err := s.getMember(memberID)
	if err != nil {
		return nil, err
	}

	// 权限检查：系统管理员、项目管理员、项目经营负责人、项目生产负责人可以配置项目成员
	permissionService := NewPermissionService()
	memberRole := member.Role
	if req.Role != nil {
		memberRole = *req.Role
	}
	canManage, err := permissionService.CanManageProjectMembers(userID, member.ProjectID, memberRole)
	if err != nil {
		return nil, fmt.Errorf("权限检查失败: %w", err)
	}
	if !canManage {
		return nil, errors.New("权限不足：无法配置项目成员")
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

// DeleteMember removes a project member (UUID string).
func (s *ProjectMemberService) DeleteMember(memberID string) error {
	member, err := s.getMember(memberID)
	if err != nil {
		return err
	}

	if err := s.db.Delete(&models.ProjectMember{}, "id = ?", memberID).Error; err != nil {
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

func (s *ProjectMemberService) ensureProjectExists(projectID string) error {
	var project models.Project
	if err := s.db.Select("id").First(&project, "id = ?", projectID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("project not found")
		}
		return err
	}
	return nil
}

func (s *ProjectMemberService) ensureUserExists(userID string) (*models.User, error) {
	var user models.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
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
	// 禁止通过ProjectMember API创建负责人角色（负责人只能通过Project API配置）
	// 注意：MemberRole 中不再有 manager 和 business_manager 角色，这些通过 Project 的 BusinessManagerID 和 ProductionManagerID 配置
	return nil
}

func (s *ProjectMemberService) ensureRoleAvailable(projectID string, role models.MemberRole) error {
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
		// No future date restriction - allow future join dates
	}
	if leaveDate != nil && leaveDate.Before(joinDate) {
		return errors.New("leave date cannot be before join date")
	}
	return nil
}

func (s *ProjectMemberService) getMember(memberID string) (*models.ProjectMember, error) {
	var member models.ProjectMember
	if err := s.db.Preload("User").First(&member, "id = ?", memberID).Error; err != nil {
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
	if member.User.ID != "" {
		user = MemberUserBrief{
			ID:       member.User.ID,
			Username: member.User.Username,
			RealName: member.User.RealName,
			Role:     string(member.User.Roles[0]), // Use first role for backward compatibility
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
		zap.String("project_id", event.ProjectID),
		zap.String("member_id", event.MemberID),
		zap.String("user_id", event.UserID),
		zap.String("role", string(event.Role)),
	)
}
