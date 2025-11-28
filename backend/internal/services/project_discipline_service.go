package services

import (
	"errors"
	"fmt"
	"sort"
	"strings"

	"gorm.io/gorm"

	"project-oa-backend/internal/models"
	"project-oa-backend/pkg/database"
)

// ProjectDisciplineService manages per-discipline role assignments.
type ProjectDisciplineService struct {
	db *gorm.DB
}

// DisciplineAssignmentInput represents the payload to configure assignments for a discipline.
type DisciplineAssignmentInput struct {
	Discipline    string `json:"discipline" binding:"required"`
	DesignerID    uint   `json:"designer_id" binding:"required"`
	ParticipantID uint   `json:"participant_id" binding:"required"`
	ReviewerID    uint   `json:"reviewer_id" binding:"required"`
}

// UpdateProjectDisciplineAssignmentsRequest wraps the assignment list.
type UpdateProjectDisciplineAssignmentsRequest struct {
	Assignments []DisciplineAssignmentInput `json:"assignments" binding:"required,dive"`
}

// DisciplineAssignmentResponse represents a discipline with its configured users.
type DisciplineAssignmentResponse struct {
	Discipline  string     `json:"discipline"`
	Designer    *UserBrief `json:"designer,omitempty"`
	Participant *UserBrief `json:"participant,omitempty"`
	Reviewer    *UserBrief `json:"reviewer,omitempty"`
}

// UserBrief is a lightweight user payload for responses.
type UserBrief struct {
	ID       uint   `json:"id"`
	Username string `json:"username"`
	RealName string `json:"real_name"`
}

// NewProjectDisciplineService builds the service instance.
func NewProjectDisciplineService() *ProjectDisciplineService {
	return &ProjectDisciplineService{
		db: database.DB,
	}
}

// ListAssignments returns structured assignments for a project.
func (s *ProjectDisciplineService) ListAssignments(projectID uint) ([]*DisciplineAssignmentResponse, error) {
	var records []models.ProjectDisciplineAssignment
	if err := s.db.
		Preload("User").
		Where("project_id = ?", projectID).
		Order("discipline ASC").
		Find(&records).Error; err != nil {
		return nil, err
	}

	assignments := map[string]*DisciplineAssignmentResponse{}
	for _, record := range records {
		key := record.Discipline
		if _, ok := assignments[key]; !ok {
			assignments[key] = &DisciplineAssignmentResponse{
				Discipline: key,
			}
		}

		userBrief := &UserBrief{
			ID:       record.User.ID,
			Username: record.User.Username,
			RealName: record.User.RealName,
		}

		switch record.Role {
		case models.DisciplineRoleDesigner:
			assignments[key].Designer = userBrief
		case models.DisciplineRoleParticipant:
			assignments[key].Participant = userBrief
		case models.DisciplineRoleReviewer:
			assignments[key].Reviewer = userBrief
		}
	}

	result := make([]*DisciplineAssignmentResponse, 0, len(assignments))
	for _, entry := range assignments {
		result = append(result, entry)
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].Discipline < result[j].Discipline
	})

	return result, nil
}

// ReplaceAssignments replaces all discipline assignments for a project.
func (s *ProjectDisciplineService) ReplaceAssignments(projectID uint, req *UpdateProjectDisciplineAssignmentsRequest) ([]*DisciplineAssignmentResponse, error) {
	if req == nil || len(req.Assignments) == 0 {
		return nil, errors.New("assignments cannot be empty")
	}

	if err := s.ensureProjectExists(projectID); err != nil {
		return nil, err
	}

	normalized, userIDs, err := normalizeAssignmentInputs(req.Assignments)
	if err != nil {
		return nil, err
	}

	if err := s.ensureUsersExist(userIDs); err != nil {
		return nil, err
	}

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("project_id = ?", projectID).Delete(&models.ProjectDisciplineAssignment{}).Error; err != nil {
			return err
		}

		for _, assignment := range normalized {
			if err := tx.Create(&models.ProjectDisciplineAssignment{
				ProjectID:  projectID,
				Discipline: assignment.Discipline,
				Role:       models.DisciplineRoleDesigner,
				UserID:     assignment.DesignerID,
			}).Error; err != nil {
				return err
			}

			if err := tx.Create(&models.ProjectDisciplineAssignment{
				ProjectID:  projectID,
				Discipline: assignment.Discipline,
				Role:       models.DisciplineRoleParticipant,
				UserID:     assignment.ParticipantID,
			}).Error; err != nil {
				return err
			}

			if err := tx.Create(&models.ProjectDisciplineAssignment{
				ProjectID:  projectID,
				Discipline: assignment.Discipline,
				Role:       models.DisciplineRoleReviewer,
				UserID:     assignment.ReviewerID,
			}).Error; err != nil {
				return err
			}
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return s.ListAssignments(projectID)
}

func (s *ProjectDisciplineService) ensureProjectExists(projectID uint) error {
	var project models.Project
	if err := s.db.First(&project, projectID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("project not found")
		}
		return err
	}
	return nil
}

func (s *ProjectDisciplineService) ensureUsersExist(userIDs []uint) error {
	if len(userIDs) == 0 {
		return nil
	}

	var count int64
	if err := s.db.Model(&models.User{}).Where("id IN ?", userIDs).Count(&count).Error; err != nil {
		return err
	}

	if count != int64(len(userIDs)) {
		return fmt.Errorf("some users do not exist")
	}

	return nil
}

type normalizedAssignment struct {
	Discipline    string
	DesignerID    uint
	ParticipantID uint
	ReviewerID    uint
}

func normalizeAssignmentInputs(assignments []DisciplineAssignmentInput) ([]normalizedAssignment, []uint, error) {
	unique := map[string]struct{}{}
	result := make([]normalizedAssignment, 0, len(assignments))
	userSet := map[uint]struct{}{}

	for _, assignment := range assignments {
		discipline := strings.TrimSpace(assignment.Discipline)
		if discipline == "" {
			return nil, nil, errors.New("discipline name cannot be empty")
		}

		key := strings.ToLower(discipline)
		if _, exists := unique[key]; exists {
			return nil, nil, fmt.Errorf("duplicate discipline: %s", discipline)
		}

		if assignment.DesignerID == 0 {
			return nil, nil, fmt.Errorf("designer_id is required for discipline %s", discipline)
		}
		if assignment.ParticipantID == 0 {
			return nil, nil, fmt.Errorf("participant_id is required for discipline %s", discipline)
		}
		if assignment.ReviewerID == 0 {
			return nil, nil, fmt.Errorf("reviewer_id is required for discipline %s", discipline)
		}

		unique[key] = struct{}{}
		userSet[assignment.DesignerID] = struct{}{}
		userSet[assignment.ParticipantID] = struct{}{}
		userSet[assignment.ReviewerID] = struct{}{}

		result = append(result, normalizedAssignment{
			Discipline:    discipline,
			DesignerID:    assignment.DesignerID,
			ParticipantID: assignment.ParticipantID,
			ReviewerID:    assignment.ReviewerID,
		})
	}

	userIDs := make([]uint, 0, len(userSet))
	for id := range userSet {
		userIDs = append(userIDs, id)
	}

	return result, userIDs, nil
}
