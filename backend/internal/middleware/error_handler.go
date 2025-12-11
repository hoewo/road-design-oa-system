package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"project-oa-backend/pkg/utils"
)

// ErrorHandlerMiddleware handles errors and returns consistent error responses
func ErrorHandlerMiddleware(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		// Check if there are any errors
		if len(c.Errors) > 0 {
			err := c.Errors.Last()

			// Handle AppError
			if appErr, ok := err.Err.(*utils.AppError); ok {
				logger.Error("Application error",
					zap.Int("status", appErr.Code),
					zap.String("message", appErr.Message),
					zap.Error(appErr.Err),
					zap.String("path", c.Request.URL.Path),
					zap.String("method", c.Request.Method),
				)

				// 使用统一错误格式
				utils.SendErrorResponse(c, appErr.Code, "INTERNAL_ERROR", appErr.Message)
				return
			}

			// Handle other errors
			logger.Error("Unhandled error",
				zap.Error(err.Err),
				zap.String("path", c.Request.URL.Path),
				zap.String("method", c.Request.Method),
			)

			// Don't expose internal error details to client
			utils.SendErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", "内部服务器错误")
		}
	}
}

// RecoveryMiddleware recovers from panics and returns error response
func RecoveryMiddleware(logger *zap.Logger) gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, recovered interface{}) {
		logger.Error("Panic recovered",
			zap.Any("error", recovered),
			zap.String("path", c.Request.URL.Path),
			zap.String("method", c.Request.Method),
			zap.String("ip", c.ClientIP()),
		)

		utils.SendErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", "内部服务器错误")
	})
}
