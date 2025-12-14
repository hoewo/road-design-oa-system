package middleware

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"project-oa-backend/internal/config"
	"project-oa-backend/pkg/utils"
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
	// UserIsAdminKey is the context key for is_admin flag (NebulaAuth管理员标识)
	UserIsAdminKey AuthContextKey = "is_admin"
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

// 标准错误码常量
const (
	ErrorCodeUnauthorized    = "UNAUTHORIZED"
	ErrorCodeTokenMissing    = "TOKEN_MISSING"
	ErrorCodeTokenInvalid    = "TOKEN_INVALID"
	ErrorCodeValidationError = "VALIDATION_ERROR"
	ErrorCodeForbidden       = "FORBIDDEN"
)

// ValidateTokenResponse NebulaAuth Token验证完整响应（包含success和data包装层）
type ValidateTokenResponse struct {
	Success bool `json:"success"`
	Data    struct {
		Valid     bool   `json:"valid"`
		UserID    string `json:"user_id"`
		Username  string `json:"username"`
		IsAdmin   bool   `json:"is_admin"`
		AppID     string `json:"app_id"`
		SessionID string `json:"session_id"`
		Error     string `json:"error,omitempty"`
	} `json:"data"`
}

// NebulaAuthValidateResponse NebulaAuth验证响应（内部使用）
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

	// 先解析包装层（success 和 data）
	var wrappedResp ValidateTokenResponse
	if err := json.Unmarshal(body, &wrappedResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	// 检查响应是否成功
	if !wrappedResp.Success {
		errorMsg := wrappedResp.Data.Error
		if errorMsg == "" {
			errorMsg = "token validation failed"
		}
		return nil, fmt.Errorf(errorMsg)
	}

	// 检查Token是否有效
	if !wrappedResp.Data.Valid {
		errorMsg := wrappedResp.Data.Error
		if errorMsg == "" {
			errorMsg = "token is invalid"
		}
		return nil, fmt.Errorf(errorMsg)
	}

	// 提取data字段并转换为内部响应格式
	return &NebulaAuthValidateResponse{
		Valid:     wrappedResp.Data.Valid,
		UserID:    wrappedResp.Data.UserID,
		Username:  wrappedResp.Data.Username,
		AppID:     wrappedResp.Data.AppID,
		SessionID: wrappedResp.Data.SessionID,
		Role:      "", // 业务角色通过业务逻辑判断
		IsAdmin:   wrappedResp.Data.IsAdmin,
	}, nil
}

// getUserFromGateway 在gateway模式下从Header读取用户信息
// 注意：gateway模式下不会收到X-User-IsAdmin header（出于安全考虑）
// 需要通过调用User Service API获取管理员状态
func getUserFromGateway(c *gin.Context, cfg *config.Config) (*NebulaAuthValidateResponse, error) {
	userID := c.GetHeader("X-User-ID")
	username := c.GetHeader("X-User-Username")
	appID := c.GetHeader("X-User-AppID")
	sessionID := c.GetHeader("X-User-SessionID")

	if userID == "" {
		return nil, fmt.Errorf("未认证")
	}

	// 从Authorization Header提取Token，用于调用User Service API
	authHeader := c.GetHeader("Authorization")
	var isAdmin bool
	
	if authHeader != "" {
		// 提取Token
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) == 2 && parts[0] == "Bearer" {
			token := parts[1]
			// 调用User Service API获取管理员状态
			// 注意：需要通过API Gateway访问，所以使用APIBaseURL
			url := cfg.APIBaseURL + "/user-service/v1/user/profile"
			
			req, err := http.NewRequest("GET", url, nil)
			if err == nil {
				req.Header.Set("Authorization", "Bearer "+token)
				req.Header.Set("Content-Type", "application/json")
				
				client := &http.Client{
					Timeout: 5 * time.Second,
				}
				
				resp, err := client.Do(req)
				if err == nil {
					defer resp.Body.Close()
					
					if resp.StatusCode == http.StatusOK {
						body, err := io.ReadAll(resp.Body)
						if err == nil {
							var result struct {
								Success bool `json:"success"`
								Data    struct {
									IsAdmin bool `json:"is_admin"`
								} `json:"data"`
							}
							
							if json.Unmarshal(body, &result) == nil && result.Success {
								isAdmin = result.Data.IsAdmin
							}
						}
					}
				}
			}
		}
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
		IsAdmin:   isAdmin, // 通过调用User Service API获取
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
			// Gateway模式：从Header读取用户信息，并调用User Service API获取管理员状态
			userInfo, err = getUserFromGateway(c, cfg)
		} else {
			// Self_validate模式：调用NebulaAuth API验证Token
			authHeader := c.GetHeader("Authorization")
			if authHeader == "" {
				utils.SendErrorResponse(c, http.StatusUnauthorized, ErrorCodeTokenMissing, "缺少 Token")
				return
			}

			// Extract token from "Bearer <token>"
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || parts[0] != "Bearer" {
				utils.SendErrorResponse(c, http.StatusUnauthorized, ErrorCodeTokenMissing, "缺少 Token")
				return
			}

			tokenString := parts[1]
			userInfo, err = validateTokenSelfValidate(cfg, tokenString)
		}

		if err != nil {
			// 根据错误类型返回不同的错误码
			errorCode := ErrorCodeValidationError
			errorMsg := "验证 Token 失败: " + err.Error()
			
			// 判断是否为Token无效错误
			if strings.Contains(err.Error(), "token is invalid") || strings.Contains(err.Error(), "token validation failed") {
				errorCode = ErrorCodeTokenInvalid
				errorMsg = err.Error()
			}
			
			utils.SendErrorResponse(c, http.StatusUnauthorized, errorCode, errorMsg)
			return
		}

		// Store user information in context (使用UUID string类型)
		c.Set(string(UserIDKey), userInfo.UserID)
		c.Set(string(UsernameKey), userInfo.Username)
		c.Set(string(UserAppIDKey), userInfo.AppID)
		c.Set(string(UserSessionIDKey), userInfo.SessionID)
		c.Set(string(UserRoleKey), userInfo.Role)
		// 设置is_admin到Context（self_validate模式下从Token验证响应获取，gateway模式下通过API获取）
		c.Set(string(UserIsAdminKey), userInfo.IsAdmin)

		// Also set in request context for use in handlers
		ctx := context.WithValue(c.Request.Context(), UserIDKey, userInfo.UserID)
		ctx = context.WithValue(ctx, UsernameKey, userInfo.Username)
		ctx = context.WithValue(ctx, UserAppIDKey, userInfo.AppID)
		ctx = context.WithValue(ctx, UserSessionIDKey, userInfo.SessionID)
		ctx = context.WithValue(ctx, UserRoleKey, userInfo.Role)
		ctx = context.WithValue(ctx, UserIsAdminKey, userInfo.IsAdmin)
		c.Request = c.Request.WithContext(ctx)

		// Admin级别需要验证管理员权限
		if level == AuthLevelAdmin {
			// 检查是否是NebulaAuth管理员
			if !userInfo.IsAdmin {
				utils.SendErrorResponse(c, http.StatusForbidden, ErrorCodeForbidden, "需要管理员权限")
				return
			}
		}

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

// GetIsAdmin retrieves is_admin flag from context (NebulaAuth管理员标识)
func GetIsAdmin(c *gin.Context) (bool, bool) {
	isAdmin, exists := c.Get(string(UserIsAdminKey))
	if !exists {
		return false, false
	}

	admin, ok := isAdmin.(bool)
	return admin, ok
}

// GetToken retrieves the Bearer token from Authorization header
func GetToken(c *gin.Context) (string, bool) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		return "", false
	}

	// Extract token from "Bearer <token>"
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || parts[0] != "Bearer" {
		return "", false
	}

	return parts[1], true
}

// RequireRole creates a middleware that requires a specific role
func RequireRole(requiredRole string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := GetUserRole(c)
		if !exists || role != requiredRole {
			utils.SendErrorResponse(c, http.StatusForbidden, ErrorCodeForbidden, "权限不足")
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
			utils.SendErrorResponse(c, http.StatusForbidden, ErrorCodeForbidden, "权限不足")
			return
		}

		for _, role := range roles {
			if userRole == role {
				c.Next()
				return
			}
		}

		utils.SendErrorResponse(c, http.StatusForbidden, ErrorCodeForbidden, "权限不足")
	}
}
