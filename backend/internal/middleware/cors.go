package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"project-oa-backend/internal/config"
)

// CORSMiddleware creates a CORS middleware with configurable allowed origins
func CORSMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		// Set CORS headers
		c.Header("Access-Control-Allow-Origin", cfg.CORSAllowedOrigins)
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-Requested-With")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Max-Age", "86400") // 24 hours

		// Handle preflight requests
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		// Validate origin if needed (for production, you might want stricter validation)
		// For now, we use the configured allowed origins
		if origin != "" && cfg.CORSAllowedOrigins != "*" {
			// In production, you should validate against a list of allowed origins
			// For now, we trust the configured value
		}

		c.Next()
	}
}
