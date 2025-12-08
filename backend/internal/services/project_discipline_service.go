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
// Discipline can be either discipline name (string) or discipline_id (UUID string)
type DisciplineAssignmentInput struct {
	Discipline    string `json:"discipline" binding:"required"`     // Discipline name or ID
	DesignerID    string `json:"designer_id" binding:"required"`    // UUID string
	ParticipantID string `json:"participant_id" binding:"required"` // UUID string
	ReviewerID    string `json:"reviewer_id" binding:"required"`    // UUID string
}

// UpdateProjectDisciplineAssignmentsRequest wraps the assignment list.
type UpdateProjectDisciplineAssignmentsRequest struct {
	Assignments []DisciplineAssignmentInput `json:"assignments" binding:"required,dive"`
}

// DisciplineAssignmentResponse represents a discipline with its configured users.
type DisciplineAssignmentResponse struct {
	DisciplineID   string     `json:"discipline_id"` // UUID string
	DisciplineName string     `json:"discipline_name"`
	Designer       *UserBrief `json:"designer,omitempty"`
	Participant    *UserBrief `json:"participant,omitempty"`
	Reviewer       *UserBrief `json:"reviewer,omitempty"`
}

// UserBrief is a lightweight user payload for responses.
type UserBrief struct {
	ID       string `json:"id"` // UUID string
	Username string `json:"username"`
	RealName string `json:"real_name"`
}

// NewProjectDisciplineService builds the service instance.
func NewProjectDisciplineService() *ProjectDisciplineService {
	return &ProjectDisciplineService{
		db: database.DB,
	}
}

// ListAssignments returns structured assignments for a project (UUID string).
func (s *ProjectDisciplineService) ListAssignments(projectID string) ([]*DisciplineAssignmentResponse, error) {
	var records []models.ProjectDisciplineAssignment
	if err := s.db.
		Preload("User").
		Preload("Discipline").
		Where("project_id = ?", projectID).
		Order("discipline_id ASC").
		Find(&records).Error; err != nil {
		return nil, err
	}

	assignments := map[string]*DisciplineAssignmentResponse{}
	for _, record := range records {
		key := record.DisciplineID
		if _, ok := assignments[key]; !ok {
			disciplineName := ""
			if record.Discipline != nil {
				disciplineName = record.Discipline.Name
			}
			assignments[key] = &DisciplineAssignmentResponse{
				DisciplineID:   key,
				DisciplineName: disciplineName,
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
		return result[i].DisciplineName < result[j].DisciplineName
	})

	return result, nil
}

// ReplaceAssignments replaces all discipline assignments for a project (UUID string).
func (s *ProjectDisciplineService) ReplaceAssignments(projectID string, req *UpdateProjectDisciplineAssignmentsRequest) ([]*DisciplineAssignmentResponse, error) {
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
				ProjectID:    projectID,
				DisciplineID: assignment.DisciplineID,
				Role:         models.DisciplineRoleDesigner,
				UserID:       assignment.DesignerID,
			}).Error; err != nil {
				return err
			}

			if err := tx.Create(&models.ProjectDisciplineAssignment{
				ProjectID:    projectID,
				DisciplineID: assignment.DisciplineID,
				Role:         models.DisciplineRoleParticipant,
				UserID:       assignment.ParticipantID,
			}).Error; err != nil {
				return err
			}

			if err := tx.Create(&models.ProjectDisciplineAssignment{
				ProjectID:    projectID,
				DisciplineID: assignment.DisciplineID,
				Role:         models.DisciplineRoleReviewer,
				UserID:       assignment.ReviewerID,
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

func (s *ProjectDisciplineService) ensureProjectExists(projectID string) error {
	var project models.Project
	if err := s.db.First(&project, "id = ?", projectID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("project not found")
		}
		return err
	}
	return nil
}

func (s *ProjectDisciplineService) ensureUsersExist(userIDs []string) error {
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
	DisciplineID  string // UUID string
	DesignerID    string // UUID string
	ParticipantID string // UUID string
	ReviewerID    string // UUID string
}

func normalizeAssignmentInputs(assignments []DisciplineAssignmentInput) ([]normalizedAssignment, []string, error) {
	unique := map[string]struct{}{}
	result := make([]normalizedAssignment, 0, len(assignments))
	userSet := map[string]struct{}{}

	for _, assignment := range assignments {
		disciplineInput := strings.TrimSpace(assignment.Discipline)
		if disciplineInput == "" {
			return nil, nil, errors.New("discipline name or ID cannot be empty")
		}

		// Try to find discipline by name or ID
		var discipline models.Discipline
		if err := database.DB.Where("name = ? OR id = ?", disciplineInput, disciplineInput).First(&discipline).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, nil, fmt.Errorf("discipline not found: %s", disciplineInput)
			}
			return nil, nil, err
		}

		disciplineID := discipline.ID
		if _, exists := unique[disciplineID]; exists {
			return nil, nil, fmt.Errorf("duplicate discipline: %s", discipline.Name)
		}

		if assignment.DesignerID == "" {
			return nil, nil, fmt.Errorf("designer_id is required for discipline %s", discipline.Name)
		}
		if assignment.ParticipantID == "" {
			return nil, nil, fmt.Errorf("participant_id is required for discipline %s", discipline.Name)
		}
		if assignment.ReviewerID == "" {
			return nil, nil, fmt.Errorf("reviewer_id is required for discipline %s", discipline.Name)
		}

		unique[disciplineID] = struct{}{}
		userSet[assignment.DesignerID] = struct{}{}
		userSet[assignment.ParticipantID] = struct{}{}
		userSet[assignment.ReviewerID] = struct{}{}

		result = append(result, normalizedAssignment{
			DisciplineID:  disciplineID,
			DesignerID:    assignment.DesignerID,
			ParticipantID: assignment.ParticipantID,
			ReviewerID:    assignment.ReviewerID,
		})
	}

	userIDs := make([]string, 0, len(userSet))
	for id := range userSet {
		userIDs = append(userIDs, id)
	}

	return result, userIDs, nil
}
