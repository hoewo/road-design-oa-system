package services

import (
	"errors"
	"fmt"
	"strings"

	"gorm.io/gorm"

	"project-oa-backend/internal/models"
	"project-oa-backend/pkg/database"
)

// ClientService handles client-related operations
type ClientService struct {
	db *gorm.DB
}

// NewClientService creates a new client service
func NewClientService() *ClientService {
	return &ClientService{
		db: database.DB,
	}
}

// CreateClientRequest represents the request to create a client
// 注意：联系人信息已移除，通过ProjectContact实体管理
type CreateClientRequest struct {
	ClientName  string `json:"client_name" binding:"required"`
	Email       string `json:"email"`
	Address     string `json:"address"`
	TaxNumber   string `json:"tax_number"`
	BankAccount string `json:"bank_account"`
	BankName    string `json:"bank_name"`
}

// UpdateClientRequest represents the request to update a client
// 注意：联系人信息已移除，通过ProjectContact实体管理
type UpdateClientRequest struct {
	ClientName  *string `json:"client_name"`
	Email       *string `json:"email"`
	Address     *string `json:"address"`
	TaxNumber   *string `json:"tax_number"`
	BankAccount *string `json:"bank_account"`
	BankName    *string `json:"bank_name"`
	IsActive    *bool   `json:"is_active"`
}

// ListClientsParams represents parameters for listing clients
type ListClientsParams struct {
	Page    int
	Size    int
	Keyword string
}

// CreateClient creates a new client
func (s *ClientService) CreateClient(req *CreateClientRequest) (*models.Client, error) {
	// Validate client name uniqueness
	var existingClient models.Client
	if err := s.db.Where("client_name = ?", req.ClientName).First(&existingClient).Error; err == nil {
		return nil, errors.New("甲方名称已存在，请使用已存在的甲方")
	}

	// Create client
	client := &models.Client{
		ClientName:  req.ClientName,
		Email:       req.Email,
		Address:     req.Address,
		TaxNumber:   req.TaxNumber,
		BankAccount: req.BankAccount,
		BankName:    req.BankName,
		IsActive:    true,
	}

	if err := s.db.Create(client).Error; err != nil {
		// Check if error is due to unique constraint violation
		// PostgreSQL returns error with "duplicate key" message for unique constraint violations
		errStr := err.Error()
		if strings.Contains(errStr, "duplicate key") || strings.Contains(errStr, "UNIQUE constraint") {
			return nil, errors.New("甲方名称已存在，请使用已存在的甲方")
		}
		return nil, err
	}

	return client, nil
}

// GetClient retrieves a client by ID (UUID string)
func (s *ClientService) GetClient(id string) (*models.Client, error) {
	var client models.Client
	if err := s.db.First(&client, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("client not found")
		}
		return nil, err
	}

	return &client, nil
}

// ListClients retrieves a paginated list of clients
func (s *ClientService) ListClients(params *ListClientsParams) ([]models.Client, int64, error) {
	var clients []models.Client
	var total int64

	query := s.db.Model(&models.Client{})

	// Apply filters
	if params.Keyword != "" {
		keyword := fmt.Sprintf("%%%s%%", params.Keyword)
		query = query.Where("client_name ILIKE ? OR email ILIKE ?", keyword, keyword)
	}

	// Count total
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Apply pagination
	offset := (params.Page - 1) * params.Size
	if err := query.
		Order("created_at DESC").
		Offset(offset).
		Limit(params.Size).
		Find(&clients).Error; err != nil {
		return nil, 0, err
	}

	return clients, total, nil
}

// UpdateClient updates an existing client (UUID string)
func (s *ClientService) UpdateClient(id string, req *UpdateClientRequest) (*models.Client, error) {
	var client models.Client
	if err := s.db.First(&client, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("client not found")
		}
		return nil, err
	}

	// Validate client name uniqueness if updating name
	if req.ClientName != nil && *req.ClientName != client.ClientName {
		var existingClient models.Client
		if err := s.db.Where("client_name = ? AND id != ?", *req.ClientName, id).First(&existingClient).Error; err == nil {
			return nil, errors.New("甲方名称已存在，请使用已存在的甲方")
		}
	}

	// Update fields
	updates := make(map[string]interface{})
	if req.ClientName != nil {
		updates["client_name"] = *req.ClientName
	}
	if req.Email != nil {
		updates["email"] = *req.Email
	}
	if req.Address != nil {
		updates["address"] = *req.Address
	}
	if req.TaxNumber != nil {
		updates["tax_number"] = *req.TaxNumber
	}
	if req.BankAccount != nil {
		updates["bank_account"] = *req.BankAccount
	}
	if req.BankName != nil {
		updates["bank_name"] = *req.BankName
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}

	if err := s.db.Model(&client).Updates(updates).Error; err != nil {
		return nil, err
	}

	// Reload
	s.db.First(&client, "id = ?", id)

	return &client, nil
}

// DeleteClient deletes a client (UUID string)
func (s *ClientService) DeleteClient(id string) error {
	var client models.Client
	if err := s.db.First(&client, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("client not found")
		}
		return err
	}

	// Check if client has related projects
	var projectCount int64
	s.db.Model(&models.Project{}).Where("client_id = ?", id).Count(&projectCount)
	if projectCount > 0 {
		return errors.New("cannot delete client with existing projects")
	}

	if err := s.db.Delete(&client).Error; err != nil {
		return err
	}

	return nil
}
