package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"project-oa-backend/internal/config"
	"project-oa-backend/internal/models"
	"project-oa-backend/pkg/database"
)

// AuthService handles authentication operations
type AuthService struct {
	db     *gorm.DB
	config *config.Config
}

// NewAuthService creates a new auth service
func NewAuthService(cfg *config.Config) *AuthService {
	return &AuthService{
		db:     database.DB,
		config: cfg,
	}
}

// Login method removed - login is now handled by NebulaAuth gateway
// Users authenticate directly with NebulaAuth gateway using verification codes
// The gateway returns access_token and refresh_token, which are used for subsequent API calls

// GetCurrentUser retrieves the current user by ID (UUID string)
// If user not found in local database, fetch from NebulaAuth User Service API and sync to local database
func (s *AuthService) GetCurrentUser(userID string, token string) (*models.User, error) {
	var user models.User
	err := s.db.First(&user, "id = ?", userID).Error
	
	// If user not found in local database, fetch from NebulaAuth
	if err != nil && errors.Is(err, gorm.ErrRecordNotFound) {
		// Fetch user from NebulaAuth User Service API
		nebulaUser, fetchErr := s.fetchUserFromNebulaAuth(token)
		if fetchErr != nil {
			return nil, fmt.Errorf("failed to fetch user from NebulaAuth: %w", fetchErr)
		}
		
		// Sync to local database (create or update)
		user = *nebulaUser
		if syncErr := s.syncUserToLocalDB(&user); syncErr != nil {
			// Log error but don't fail - we can still return the user from NebulaAuth
			// In production, you might want to handle this differently
		}
	} else if err != nil {
		return nil, err
	}

	// Clear password from response
	user.Password = ""

	return &user, nil
}

// fetchUserFromNebulaAuth fetches user information from NebulaAuth User Service API
func (s *AuthService) fetchUserFromNebulaAuth(token string) (*models.User, error) {
	// 调用NebulaAuth User Service API
	// 注意：需要通过API Gateway访问，所以使用APIBaseURL（网关地址）
	url := s.config.APIBaseURL + "/user-service/v1/user/profile"
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	
	client := &http.Client{
		Timeout: 10 * time.Second,
	}
	
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to call User Service API: %w", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("User Service API returned status %d: %s", resp.StatusCode, string(body))
	}
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}
	
	var result struct {
		Success bool `json:"success"`
		Data    struct {
			ID         string `json:"id"`
			Username   string `json:"username"`
			Email      string `json:"email"`
			Phone      string `json:"phone"`
			IsActive   bool   `json:"is_active"`
			IsAdmin    bool   `json:"is_admin"`
			IsVerified bool   `json:"is_verified"`
			AvatarURL  string `json:"avatar_url"`
			CreatedAt  string `json:"created_at"`
			UpdatedAt  string `json:"updated_at"`
		} `json:"data"`
	}
	
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}
	
	if !result.Success {
		return nil, fmt.Errorf("User Service API returned success=false")
	}
	
	// Convert NebulaAuth user to local User model
	// Note: NebulaAuth doesn't have real_name, role, department, password fields
	// We'll use username as real_name, and set role based on is_admin
	// If user is NebulaAuth admin, set role to RoleAdmin, otherwise RoleMember
	var roles []string
	if result.Data.IsAdmin {
		roles = []string{string(models.RoleAdmin)}
	} else {
		roles = []string{string(models.RoleMember)}
	}

	user := &models.User{
		ID:         result.Data.ID,
		Username:   result.Data.Username,
		Email:      result.Data.Email,
		Phone:      result.Data.Phone,
		RealName:   result.Data.Username, // Use username as real_name if not available
		Roles:      pq.StringArray(roles),
		IsActive:   result.Data.IsActive,
		HasAccount: true, // User has NebulaAuth account
		Password:   "",   // No password stored locally
		CreatedAt:  time.Now(), // Set current time if not available
		UpdatedAt:  time.Now(),
	}
	
	// Parse timestamps if available
	if result.Data.CreatedAt != "" {
		if t, err := time.Parse(time.RFC3339, result.Data.CreatedAt); err == nil {
			user.CreatedAt = t
		}
	}
	if result.Data.UpdatedAt != "" {
		if t, err := time.Parse(time.RFC3339, result.Data.UpdatedAt); err == nil {
			user.UpdatedAt = t
		}
	}
	
	return user, nil
}

// syncUserToLocalDB syncs user information to local database (create or update)
func (s *AuthService) syncUserToLocalDB(user *models.User) error {
	var existingUser models.User
	err := s.db.First(&existingUser, "id = ?", user.ID).Error
	
	if errors.Is(err, gorm.ErrRecordNotFound) {
		// Create new user
		return s.db.Create(user).Error
	} else if err != nil {
		return err
	}
	
	// Update existing user (update fields that might change from NebulaAuth, including role)
	// Role is updated based on NebulaAuth is_admin status
	updates := map[string]interface{}{
		"username":    user.Username,
		"email":       user.Email,
		"phone":       user.Phone,
		"roles":       user.Roles, // Update roles based on NebulaAuth is_admin status
		"is_active":   user.IsActive,
		"has_account": true,
		"updated_at":  time.Now(),
	}
	
	return s.db.Model(&existingUser).Updates(updates).Error
}

// generateToken generates a JWT token for a user
func (s *AuthService) generateToken(user *models.User) (string, error) {
	expirationTime := time.Now().Add(time.Duration(s.config.JWTExpireHours) * time.Hour)

	claims := jwt.MapClaims{
		"user_id":  user.ID,
		"username": user.Username,
		"roles":    user.Roles,
		"exp":      expirationTime.Unix(),
		"iat":      time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(s.config.JWTSecret))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

// Register creates a new user account
func (s *AuthService) Register(username, email, password, realName string, role models.UserRole) (*models.User, error) {
	// Check if username already exists
	var existingUser models.User
	if err := s.db.Where("username = ? OR email = ?", username, email).First(&existingUser).Error; err == nil {
		return nil, errors.New("username or email already exists")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	// Create user
	user := &models.User{
		Username: username,
		Email:    email,
		Password: string(hashedPassword),
		RealName: realName,
		Roles:    pq.StringArray{string(role)},
		IsActive: true,
	}

	if err := s.db.Create(user).Error; err != nil {
		return nil, err
	}

	// Clear password from response
	user.Password = ""

	return user, nil
}

// ValidatePassword validates a password against the user's stored password (UUID string)
func (s *AuthService) ValidatePassword(userID string, password string) error {
	var user models.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		return err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
		return errors.New("invalid password")
	}

	return nil
}

// ChangePassword changes a user's password (UUID string)
func (s *AuthService) ChangePassword(userID string, oldPassword, newPassword string) error {
	// Validate old password
	if err := s.ValidatePassword(userID, oldPassword); err != nil {
		return err
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// Update password
	if err := s.db.Model(&models.User{}).Where("id = ?", userID).Update("password", string(hashedPassword)).Error; err != nil {
		return err
	}

	return nil
}

// IsNebulaAuthAdmin 检查用户是否是NebulaAuth管理员（gateway模式）
// 通过调用NebulaAuth User Service API获取管理员状态
func (s *AuthService) IsNebulaAuthAdmin(token string) (bool, error) {
	// 调用NebulaAuth User Service API
	// 注意：需要通过API Gateway访问，所以使用APIBaseURL（网关地址）
	url := s.config.APIBaseURL + "/user-service/v1/user/profile"
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return false, fmt.Errorf("failed to create request: %w", err)
	}
	
	// 使用当前请求的Token
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	
	client := &http.Client{
		Timeout: 10 * time.Second,
	}
	
	resp, err := client.Do(req)
	if err != nil {
		return false, fmt.Errorf("failed to call User Service API: %w", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return false, fmt.Errorf("User Service API returned status %d: %s", resp.StatusCode, string(body))
	}
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return false, fmt.Errorf("failed to read response: %w", err)
	}
	
	var result struct {
		Success bool `json:"success"`
		Data    struct {
			IsAdmin bool `json:"is_admin"`
		} `json:"data"`
	}
	
	if err := json.Unmarshal(body, &result); err != nil {
		return false, fmt.Errorf("failed to unmarshal response: %w", err)
	}
	
	if !result.Success {
		return false, fmt.Errorf("User Service API returned success=false")
	}
	
	return result.Data.IsAdmin, nil
}
