// middleware/auth.go
// Go语言实现的统一认证中间件
package middleware

import (
    "bytes"
    "encoding/json"
    "io"
    "net/http"
    "strings"
    "github.com/gin-gonic/gin"
    "your-project/config"
)

type UserInfo struct {
    UserID    string
    Username  string
    IsAdmin   bool
    AppID     string
    SessionID string
}

func AuthMiddleware(cfg *config.Config) gin.HandlerFunc {
    if cfg.AuthMode == "self_validate" {
        return selfValidateAuthMiddleware(cfg)
    }
    return gatewayAuthMiddleware()
}

// gatewayAuthMiddleware 网关模式：从 Header 读取用户信息
func gatewayAuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        userID := c.GetHeader("X-User-ID")
        if userID == "" {
            c.JSON(http.StatusUnauthorized, gin.H{
                "error": "未认证",
                "code":  "UNAUTHORIZED",
            })
            c.Abort()
            return
        }
        
        userInfo := UserInfo{
            UserID:    userID,
            Username:  c.GetHeader("X-User-Username"),
            IsAdmin:   c.GetHeader("X-User-IsAdmin") == "true",
            AppID:     c.GetHeader("X-User-AppID"),
            SessionID: c.GetHeader("X-User-SessionID"),
        }
        
        c.Set("user_info", userInfo)
        c.Set("user_id", userInfo.UserID)
        c.Set("username", userInfo.Username)
        c.Set("is_admin", userInfo.IsAdmin)
        c.Next()
    }
}

// selfValidateAuthMiddleware 自己验证模式：调用 NebulaAuth API
func selfValidateAuthMiddleware(cfg *config.Config) gin.HandlerFunc {
    return func(c *gin.Context) {
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
            c.JSON(http.StatusUnauthorized, gin.H{
                "error": "缺少 Token",
                "code":  "TOKEN_MISSING",
            })
            c.Abort()
            return
        }
        
        token := strings.TrimPrefix(authHeader, "Bearer ")
        
        result, err := validateTokenWithNebulaAuth(cfg.NebulaAuthURL, token)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{
                "error": "验证 Token 失败",
                "code":  "VALIDATION_ERROR",
            })
            c.Abort()
            return
        }
        
        if !result.Success || !result.Data.Valid {
            c.JSON(http.StatusUnauthorized, gin.H{
                "error": result.Data.Error,
                "code":  "TOKEN_INVALID",
            })
            c.Abort()
            return
        }
        
        userInfo := UserInfo{
            UserID:    result.Data.UserID,
            Username:  result.Data.Username,
            IsAdmin:   result.Data.IsAdmin,
            AppID:     result.Data.AppID,
            SessionID: result.Data.SessionID,
        }
        
        c.Set("user_info", userInfo)
        c.Set("user_id", userInfo.UserID)
        c.Set("username", userInfo.Username)
        c.Set("is_admin", userInfo.IsAdmin)
        c.Next()
    }
}

// validateTokenWithNebulaAuth 验证 Token
func validateTokenWithNebulaAuth(baseURL, token string) (*ValidateTokenResponse, error) {
    reqBody := map[string]string{"token": token}
    jsonData, _ := json.Marshal(reqBody)
    
    resp, err := http.Post(
        baseURL+"/auth-server/v1/internal/validate_token",
        "application/json",
        bytes.NewBuffer(jsonData),
    )
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    
    body, _ := io.ReadAll(resp.Body)
    var result ValidateTokenResponse
    json.Unmarshal(body, &result)
    
    return &result, nil
}

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

