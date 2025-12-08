package middleware

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"project-oa-backend/internal/config"
)

// AuthContextKey is the key for storing auth info in context
type AuthContextKey string

const (
	// UserIDKey is the context key for user ID (UUID string)
	UserIDKey AuthContextKey = "user_id"
	// UsernameKey is the context key for username
	UsernameKey AuthContextKey = "username"
	// UserRoleKey is the context key for user role
	UserRoleKey AuthContextKey = "user_role"
	// UserAppIDKey is the context key for app ID
	UserAppIDKey AuthContextKey = "user_app_id"
	// UserSessionIDKey is the context key for session ID
	UserSessionIDKey AuthContextKey = "user_session_id"
)

// AuthLevel 认证级别
type AuthLevel string

const (
	// AuthLevelPublic 无需认证
	AuthLevelPublic AuthLevel = "public"
	// AuthLevelUser 需要JWT Token认证
	AuthLevelUser AuthLevel = "user"
	// AuthLevelAdmin 需要管理员权限
	AuthLevelAdmin AuthLevel = "admin"
)

// NebulaAuthValidateResponse NebulaAuth验证响应
type NebulaAuthValidateResponse struct {
	Valid     bool   `json:"valid"`
	UserID    string `json:"user_id"`
	Username  string `json:"username"`
	AppID     string `json:"app_id"`
	SessionID string `json:"session_id"`
	Role      string `json:"role"`
	IsAdmin   bool   `json:"is_admin"`
}

// validateTokenSelfValidate 在self_validate模式下验证Token（调用NebulaAuth API）
func validateTokenSelfValidate(cfg *config.Config, tokenString string) (*NebulaAuthValidateResponse, error) {
	// 调用NebulaAuth API验证Token
	url := cfg.NebulaAuthURL + "/auth-server/v1/public/auth/validate"

	reqBody := map[string]string{
		"token": tokenString,
	}
	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to call NebulaAuth API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("NebulaAuth API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var validateResp NebulaAuthValidateResponse
	if err := json.Unmarshal(body, &validateResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	if !validateResp.Valid {
		return nil, fmt.Errorf("token is invalid")
	}

	return &validateResp, nil
}

// getUserFromGateway 在gateway模式下从Header读取用户信息
func getUserFromGateway(c *gin.Context) (*NebulaAuthValidateResponse, error) {
	userID := c.GetHeader("X-User-ID")
	username := c.GetHeader("X-User-Username")
	appID := c.GetHeader("X-User-AppID")
	sessionID := c.GetHeader("X-User-SessionID")

	if userID == "" {
		return nil, fmt.Errorf("X-User-ID header is required")
	}

	// 注意：gateway模式下不会收到X-User-Role和X-User-IsAdmin（出于安全考虑）
	// 业务角色权限通过业务逻辑判断
	return &NebulaAuthValidateResponse{
		Valid:     true,
		UserID:    userID,
		Username:  username,
		AppID:     appID,
		SessionID: sessionID,
		Role:      "",    // 业务角色通过业务逻辑判断
		IsAdmin:   false, // 管理员权限通过业务逻辑判断
	}, nil
}

// AuthMiddleware 创建认证中间件，支持两种认证模式和三种认证级别
func AuthMiddleware(cfg *config.Config, level AuthLevel) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Public级别无需认证
		if level == AuthLevelPublic {
			c.Next()
			return
		}

		var userInfo *NebulaAuthValidateResponse
		var err error

		// 根据认证模式获取用户信息
		if cfg.AuthMode == "gateway" {
			// Gateway模式：从Header读取用户信息
			userInfo, err = getUserFromGateway(c)
		} else {
			// Self_validate模式：调用NebulaAuth API验证Token
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
			userInfo, err = validateTokenSelfValidate(cfg, tokenString)
		}

		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Authentication failed: " + err.Error(),
			})
			c.Abort()
			return
		}

		// Admin级别需要验证管理员权限
		if level == AuthLevelAdmin {
			// 注意：gateway模式下不会收到IsAdmin header，需要通过业务逻辑判断
			// 这里暂时允许通过，实际权限验证在业务层进行
			// TODO: 实现管理员权限验证逻辑
		}

		// Store user information in context (使用UUID string类型)
		c.Set(string(UserIDKey), userInfo.UserID)
		c.Set(string(UsernameKey), userInfo.Username)
		c.Set(string(UserAppIDKey), userInfo.AppID)
		c.Set(string(UserSessionIDKey), userInfo.SessionID)
		c.Set(string(UserRoleKey), userInfo.Role)

		// Also set in request context for use in handlers
		ctx := context.WithValue(c.Request.Context(), UserIDKey, userInfo.UserID)
		ctx = context.WithValue(ctx, UsernameKey, userInfo.Username)
		ctx = context.WithValue(ctx, UserAppIDKey, userInfo.AppID)
		ctx = context.WithValue(ctx, UserSessionIDKey, userInfo.SessionID)
		ctx = context.WithValue(ctx, UserRoleKey, userInfo.Role)
		c.Request = c.Request.WithContext(ctx)

		c.Next()
	}
}

// GetUserID retrieves user ID from context (returns UUID string)
func GetUserID(c *gin.Context) (string, bool) {
	userID, exists := c.Get(string(UserIDKey))
	if !exists {
		return "", false
	}

	id, ok := userID.(string)
	if !ok {
		return "", false
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
