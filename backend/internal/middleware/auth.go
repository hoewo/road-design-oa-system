package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"

	"project-oa-backend/internal/config"
)

// AuthContextKey is the key for storing auth info in context
type AuthContextKey string

const (
	// UserIDKey is the context key for user ID
	UserIDKey AuthContextKey = "user_id"
	// UsernameKey is the context key for username
	UsernameKey AuthContextKey = "username"
	// UserRoleKey is the context key for user role
	UserRoleKey AuthContextKey = "user_role"
)

// MockAuthService provides mock authentication for development
// TODO: Replace with real authentication server integration
type MockAuthService struct {
	jwtSecret []byte
}

// NewMockAuthService creates a new mock auth service
func NewMockAuthService(cfg *config.Config) *MockAuthService {
	return &MockAuthService{
		jwtSecret: []byte(cfg.JWTSecret),
	}
}

// ValidateToken validates a JWT token and returns claims
func (s *MockAuthService) ValidateToken(tokenString string) (jwt.MapClaims, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// Validate signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return s.jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, jwt.ErrSignatureInvalid
}

// GetUserFromToken extracts user information from token claims
// Mock implementation - returns mock user data
func (s *MockAuthService) GetUserFromToken(claims jwt.MapClaims) (userID uint, username string, role string, err error) {
	// Mock user data - in production, this would query the database or auth server
	// For now, we extract from token claims or use defaults
	if userIDFloat, ok := claims["user_id"].(float64); ok {
		userID = uint(userIDFloat)
	} else {
		// Default mock user
		userID = 1
	}

	if usernameStr, ok := claims["username"].(string); ok {
		username = usernameStr
	} else {
		username = "mock_user"
	}

	if roleStr, ok := claims["role"].(string); ok {
		role = roleStr
	} else {
		role = "manager"
	}

	return userID, username, role, nil
}

// AuthMiddleware creates a Gin middleware for JWT authentication
// Uses mock authentication service - can be replaced with real auth server
func AuthMiddleware(cfg *config.Config) gin.HandlerFunc {
	authService := NewMockAuthService(cfg)

	return func(c *gin.Context) {
		// Get token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Authorization header required",
			})
			c.Abort()
			return
		}

		// Extract token from "Bearer <token>"
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid authorization header format",
			})
			c.Abort()
			return
		}

		tokenString := parts[1]

		// Validate token
		claims, err := authService.ValidateToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid or expired token",
			})
			c.Abort()
			return
		}

		// Extract user information from token
		userID, username, role, err := authService.GetUserFromToken(claims)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Failed to extract user information",
			})
			c.Abort()
			return
		}

		// Store user information in context
		c.Set(string(UserIDKey), userID)
		c.Set(string(UsernameKey), username)
		c.Set(string(UserRoleKey), role)

		// Also set in request context for use in handlers
		ctx := context.WithValue(c.Request.Context(), UserIDKey, userID)
		ctx = context.WithValue(ctx, UsernameKey, username)
		ctx = context.WithValue(ctx, UserRoleKey, role)
		c.Request = c.Request.WithContext(ctx)

		c.Next()
	}
}

// OptionalAuthMiddleware creates a middleware that doesn't require authentication
// but extracts user info if token is provided
func OptionalAuthMiddleware(cfg *config.Config) gin.HandlerFunc {
	authService := NewMockAuthService(cfg)

	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.Next()
			return
		}

		tokenString := parts[1]
		claims, err := authService.ValidateToken(tokenString)
		if err != nil {
			c.Next()
			return
		}

		userID, username, role, err := authService.GetUserFromToken(claims)
		if err == nil {
			c.Set(string(UserIDKey), userID)
			c.Set(string(UsernameKey), username)
			c.Set(string(UserRoleKey), role)

			ctx := context.WithValue(c.Request.Context(), UserIDKey, userID)
			ctx = context.WithValue(ctx, UsernameKey, username)
			ctx = context.WithValue(ctx, UserRoleKey, role)
			c.Request = c.Request.WithContext(ctx)
		}

		c.Next()
	}
}

// GetUserID retrieves user ID from context
func GetUserID(c *gin.Context) (uint, bool) {
	userID, exists := c.Get(string(UserIDKey))
	if !exists {
		return 0, false
	}

	id, ok := userID.(uint)
	if !ok {
		// Try float64 (from JSON unmarshaling)
		if idFloat, ok := userID.(float64); ok {
			return uint(idFloat), true
		}
		return 0, false
	}

	return id, true
}

// GetUsername retrieves username from context
func GetUsername(c *gin.Context) (string, bool) {
	username, exists := c.Get(string(UsernameKey))
	if !exists {
		return "", false
	}

	name, ok := username.(string)
	return name, ok
}

// GetUserRole retrieves user role from context
func GetUserRole(c *gin.Context) (string, bool) {
	role, exists := c.Get(string(UserRoleKey))
	if !exists {
		return "", false
	}

	roleStr, ok := role.(string)
	return roleStr, ok
}

// RequireRole creates a middleware that requires a specific role
func RequireRole(requiredRole string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := GetUserRole(c)
		if !exists || role != requiredRole {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Insufficient permissions",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireAnyRole creates a middleware that requires any of the specified roles
func RequireAnyRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := GetUserRole(c)
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Insufficient permissions",
			})
			c.Abort()
			return
		}

		for _, role := range roles {
			if userRole == role {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{
			"error": "Insufficient permissions",
		})
		c.Abort()
	}
}
