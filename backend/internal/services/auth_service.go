package services

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
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
func (s *AuthService) GetCurrentUser(userID string) (*models.User, error) {
	var user models.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		return nil, err
	}

	// Clear password from response
	user.Password = ""

	return &user, nil
}

// generateToken generates a JWT token for a user
func (s *AuthService) generateToken(user *models.User) (string, error) {
	expirationTime := time.Now().Add(time.Duration(s.config.JWTExpireHours) * time.Hour)

	claims := jwt.MapClaims{
		"user_id":  user.ID,
		"username": user.Username,
		"role":     string(user.Role),
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
		Role:     role,
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
