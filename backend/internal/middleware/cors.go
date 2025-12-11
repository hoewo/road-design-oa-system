package middleware

import (
	"net/http"
	"net/url"
	"strings"

	"github.com/gin-gonic/gin"

	"project-oa-backend/internal/config"
)

// CORSMiddleware creates a CORS middleware with configurable allowed origins
// Security considerations:
// 1. Never use "*" with credentials (browsers will reject it)
// 2. Always validate and match exact origins
// 3. Log rejected CORS requests for security auditing
// 4. Use case-insensitive comparison for origins
func CORSMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		allowedOrigin, allowCredentials := getAllowedOrigin(origin, cfg.CORSAllowedOrigins)

		// Set CORS headers only if origin is allowed
		if allowedOrigin != "" {
			c.Header("Access-Control-Allow-Origin", allowedOrigin)
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-Requested-With")
			c.Header("Access-Control-Max-Age", "86400") // 24 hours

			// Only set credentials header if allowed (never with "*")
			if allowCredentials {
				c.Header("Access-Control-Allow-Credentials", "true")
			}
		} else if origin != "" {
			// Log rejected CORS request for security auditing
			// Note: logger might not be available in middleware context
			// In production, consider using a proper logger here
			_ = origin // Suppress unused warning
		}

		// Handle preflight requests
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

// getAllowedOrigin returns the allowed origin and whether credentials are allowed
// Security rules:
// 1. "*" cannot be used with credentials (returns false for allowCredentials)
// 2. Origins must be exact matches (case-insensitive)
// 3. Origins are validated to be valid URLs
// Returns: (allowedOrigin, allowCredentials)
func getAllowedOrigin(requestOrigin, configuredOrigins string) (string, bool) {
	// If no request origin, no CORS needed (same-origin request)
	if requestOrigin == "" {
		return "", false
	}

	// Validate request origin format (basic security check)
	if !isValidOrigin(requestOrigin) {
		return "", false
	}

	// Normalize request origin (lowercase for comparison)
	requestOriginLower := strings.ToLower(requestOrigin)

	// If configured to allow all origins
	if configuredOrigins == "*" {
		// Security: Cannot use "*" with credentials
		// Return "*" but credentials must be false
		return "*", false
	}

	// Parse configured origins (support comma-separated list)
	origins := parseOrigins(configuredOrigins)

	// Check if request origin matches any allowed origin
	for _, allowedOrigin := range origins {
		allowedOriginLower := strings.ToLower(strings.TrimSpace(allowedOrigin))
		if allowedOriginLower == requestOriginLower {
			// Match found - return the original (not lowercased) configured origin
			// and allow credentials (since we're using explicit origin, not "*")
			return strings.TrimSpace(allowedOrigin), true
		}
	}

	// No match found - reject request
	return "", false
}

// parseOrigins parses comma-separated list of origins
func parseOrigins(originsStr string) []string {
	if originsStr == "" {
		return []string{}
	}

	origins := strings.Split(originsStr, ",")
	result := make([]string, 0, len(origins))
	for _, origin := range origins {
		origin = strings.TrimSpace(origin)
		if origin != "" {
			result = append(result, origin)
		}
	}
	return result
}

// isValidOrigin validates that the origin is a valid URL format
// This prevents basic injection attacks
func isValidOrigin(origin string) bool {
	// Basic validation: must start with http:// or https://
	if !strings.HasPrefix(origin, "http://") && !strings.HasPrefix(origin, "https://") {
		return false
	}

	// Try to parse as URL to ensure it's valid
	parsedURL, err := url.Parse(origin)
	if err != nil {
		return false
	}

	// Must have a valid scheme and host
	if parsedURL.Scheme != "http" && parsedURL.Scheme != "https" {
		return false
	}

	if parsedURL.Host == "" {
		return false
	}

	// Additional security: reject origins with userinfo, path, query, or fragment
	// CORS origins should only be scheme://host:port
	if parsedURL.User != nil || parsedURL.Path != "" || parsedURL.RawQuery != "" || parsedURL.Fragment != "" {
		return false
	}

	return true
}
