// utils/error.go
// 统一错误处理示例
package utils

import (
    "github.com/gin-gonic/gin"
    "time"
)

type ErrorResponse struct {
    Error     string `json:"error"`
    Code      string `json:"code"`
    Details   string `json:"details,omitempty"`
    Timestamp int64  `json:"timestamp"`
}

func ErrorResponse(c *gin.Context, statusCode int, code, message string) {
    c.JSON(statusCode, ErrorResponse{
        Error:     message,
        Code:      code,
        Timestamp: time.Now().Unix(),
    })
}

// 常见错误码
const (
    ErrorCodeUnauthorized    = "UNAUTHORIZED"
    ErrorCodeTokenMissing    = "TOKEN_MISSING"
    ErrorCodeTokenInvalid    = "TOKEN_INVALID"
    ErrorCodeValidationError = "VALIDATION_ERROR"
    ErrorCodeForbidden       = "FORBIDDEN"
)

