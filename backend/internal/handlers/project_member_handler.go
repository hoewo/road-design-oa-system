package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"project-oa-backend/internal/models"
	"project-oa-backend/internal/services"
	"project-oa-backend/pkg/utils"
)

// ProjectMemberHandler exposes CRUD APIs for project members.
type ProjectMemberHandler struct {
	service *services.ProjectMemberService
	logger  *zap.Logger
}

// NewProjectMemberHandler builds the handler.
func NewProjectMemberHandler(logger *zap.Logger) *ProjectMemberHandler {
	return &ProjectMemberHandler{
		service: services.NewProjectMemberService(services.NewLoggingMemberNotifier(logger)),
		logger:  logger,
	}
}

// ListMembers lists members for a project.
func (h *ProjectMemberHandler) ListMembers(c *gin.Context) {
	projectID := c.Param("id")
	if projectID == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	members, err := h.service.ListMembers(projectID)
	if err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Failed to list members", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    members,
	})
}

// CreateMemberPayload represents incoming payload.
type CreateMemberPayload struct {
	UserID    string            `json:"user_id" binding:"required"` // UUID string
	Role      models.MemberRole `json:"role" binding:"required"`
	JoinDate  string            `json:"join_date" binding:"required"`
	LeaveDate *string           `json:"leave_date"`
	IsActive  *bool             `json:"is_active"`
}

// CreateMember creates a new member.
func (h *ProjectMemberHandler) CreateMember(c *gin.Context) {
	projectID := c.Param("id")
	if projectID == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	var payload CreateMemberPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	joinDate, err := utils.ParseFlexibleDate(payload.JoinDate)
	if err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid join date", err)
		return
	}

	var leaveDate *time.Time
	if payload.LeaveDate != nil && *payload.LeaveDate != "" {
		t, err := utils.ParseFlexibleDate(*payload.LeaveDate)
		if err != nil {
			utils.HandleError(c, http.StatusBadRequest, "Invalid leave date", err)
			return
		}
		leaveDate = &t
	}

	req := &services.CreateProjectMemberRequest{
		UserID:    payload.UserID,
		Role:      payload.Role,
		JoinDate:  joinDate,
		LeaveDate: leaveDate,
		IsActive:  payload.IsActive == nil || *payload.IsActive,
	}

	member, err := h.service.CreateMember(projectID, req)
	if err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Failed to create member", err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    member,
	})
}

// UpdateMemberPayload captures update inputs.
type UpdateMemberPayload struct {
	Role      *models.MemberRole `json:"role"`
	JoinDate  *string            `json:"join_date"`
	LeaveDate *string            `json:"leave_date"`
	IsActive  *bool              `json:"is_active"`
}

// UpdateMember updates an existing member.
func (h *ProjectMemberHandler) UpdateMember(c *gin.Context) {
	memberID := c.Param("id")
	if memberID == "" {
		utils.HandleError(c, http.StatusBadRequest, "Member ID is required", nil)
		return
	}

	var payload UpdateMemberPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	req := &services.UpdateProjectMemberRequest{
		Role:     payload.Role,
		IsActive: payload.IsActive,
	}

	if payload.JoinDate != nil && *payload.JoinDate != "" {
		joinDate, err := utils.ParseFlexibleDate(*payload.JoinDate)
		if err != nil {
			utils.HandleError(c, http.StatusBadRequest, "Invalid join date", err)
			return
		}
		req.JoinDate = &joinDate
	}

	if payload.LeaveDate != nil && *payload.LeaveDate != "" {
		leaveDate, err := utils.ParseFlexibleDate(*payload.LeaveDate)
		if err != nil {
			utils.HandleError(c, http.StatusBadRequest, "Invalid leave date", err)
			return
		}
		req.LeaveDate = &leaveDate
	}

	member, err := h.service.UpdateMember(memberID, req)
	if err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Failed to update member", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    member,
	})
}

// DeleteMember removes a member.
func (h *ProjectMemberHandler) DeleteMember(c *gin.Context) {
	memberID := c.Param("id")
	if memberID == "" {
		utils.HandleError(c, http.StatusBadRequest, "Member ID is required", nil)
		return
	}

	if err := h.service.DeleteMember(memberID); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Failed to delete member", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Member removed",
	})
}

