package services

import (
	"errors"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"project-oa-backend/internal/models"
	"project-oa-backend/pkg/database"
)

// UserService handles user-related operations
type UserService struct {
	db *gorm.DB
}

// NewUserService creates a new user service
func NewUserService() *UserService {
	return &UserService{
		db: database.DB,
	}
}

// ListUsersRequest represents the request to list users
type ListUsersRequest struct {
	Page      int    `form:"page"`
	Size      int    `form:"size"`
	Keyword   string `form:"keyword"`
	Role      string `form:"role"`
	IsActive  *bool  `form:"is_active"`
	HasAccount *bool `form:"has_account"` // 账号查询过滤
}

// ListUsersResponse represents the response for listing users
type ListUsersResponse struct {
	Data  []models.User `json:"data"`
	Total int64         `json:"total"`
	Page  int           `json:"page"`
	Size  int           `json:"size"`
}

// CreateUserRequest represents the request to create a user
type CreateUserRequest struct {
	Username   string          `json:"username" binding:"required"`
	Email      string          `json:"email" binding:"required,email"`
	Password   string          `json:"password" binding:"required,min=8"`
	RealName   string          `json:"real_name" binding:"required"`
	Role       models.UserRole `json:"role" binding:"required"`
	Department string          `json:"department"`
	Phone      string          `json:"phone"`
}

// UpdateUserRequest represents the request to update a user
type UpdateUserRequest struct {
	Email      *string          `json:"email"`
	RealName   *string          `json:"real_name"`
	Role       *models.UserRole `json:"role"`
	Department *string          `json:"department"`
	Phone      *string          `json:"phone"`
	IsActive   *bool            `json:"is_active"`
}

// ListUsers retrieves a list of users with pagination and filtering
func (s *UserService) ListUsers(req *ListUsersRequest) (*ListUsersResponse, error) {
	if req.Page < 1 {
		req.Page = 1
	}
	if req.Size < 1 {
		req.Size = 20
	}
	if req.Size > 100 {
		req.Size = 100
	}

	query := s.db.Model(&models.User{})

	// Apply keyword filter (search in username, real_name, email)
	if req.Keyword != "" {
		keyword := "%" + req.Keyword + "%"
		query = query.Where("username LIKE ? OR real_name LIKE ? OR email LIKE ?", keyword, keyword, keyword)
	}

	// Apply role filter
	if req.Role != "" {
		query = query.Where("role = ?", req.Role)
	}

	// Apply is_active filter
	if req.IsActive != nil {
		query = query.Where("is_active = ?", *req.IsActive)
	}

	// Apply has_account filter
	if req.HasAccount != nil {
		query = query.Where("has_account = ?", *req.HasAccount)
	}

	// Get total count
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	// Get paginated results
	var users []models.User
	offset := (req.Page - 1) * req.Size
	if err := query.Offset(offset).Limit(req.Size).Order("created_at DESC").Find(&users).Error; err != nil {
		return nil, err
	}

	// Clear passwords from response
	for i := range users {
		users[i].Password = ""
	}

	return &ListUsersResponse{
		Data:  users,
		Total: total,
		Page:  req.Page,
		Size:  req.Size,
	}, nil
}

// GetUser retrieves a user by ID (UUID string)
func (s *UserService) GetUser(userID string) (*models.User, error) {
	var user models.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}

	// Clear password from response
	user.Password = ""

	return &user, nil
}

// CreateUser creates a new user
func (s *UserService) CreateUser(req *CreateUserRequest) (*models.User, error) {
	// Check if username already exists
	var existingUser models.User
	if err := s.db.Where("username = ? OR email = ?", req.Username, req.Email).First(&existingUser).Error; err == nil {
		return nil, errors.New("username or email already exists")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	// Create user
	user := &models.User{
		Username:   req.Username,
		Email:      req.Email,
		Password:   string(hashedPassword),
		RealName:   req.RealName,
		Role:       req.Role,
		Department: req.Department,
		Phone:      req.Phone,
		IsActive:   true,
	}

	if err := s.db.Create(user).Error; err != nil {
		return nil, err
	}

	// Clear password from response
	user.Password = ""

	return user, nil
}

// UpdateUser updates an existing user (UUID string)
func (s *UserService) UpdateUser(userID string, req *UpdateUserRequest) (*models.User, error) {
	var user models.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}

	// Update fields if provided
	if req.Email != nil {
		// Check if email is already taken by another user
		var existingUser models.User
		if err := s.db.Where("email = ? AND id != ?", *req.Email, userID).First(&existingUser).Error; err == nil {
			return nil, errors.New("email already exists")
		}
		user.Email = *req.Email
	}

	if req.RealName != nil {
		user.RealName = *req.RealName
	}

	if req.Role != nil {
		user.Role = *req.Role
	}

	if req.Department != nil {
		user.Department = *req.Department
	}

	if req.Phone != nil {
		user.Phone = *req.Phone
	}

	if req.IsActive != nil {
		user.IsActive = *req.IsActive
	}

	if err := s.db.Save(&user).Error; err != nil {
		return nil, err
	}

	// Clear password from response
	user.Password = ""

	return &user, nil
}
