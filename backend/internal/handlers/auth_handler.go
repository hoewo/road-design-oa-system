package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"project-oa-backend/internal/config"
	"project-oa-backend/internal/middleware"
	"project-oa-backend/internal/services"
	"project-oa-backend/pkg/utils"
)

// AuthHandler handles authentication-related HTTP requests
type AuthHandler struct {
	authService *services.AuthService
	logger      *zap.Logger
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(cfg *config.Config, logger *zap.Logger) *AuthHandler {
	return &AuthHandler{
		authService: services.NewAuthService(cfg),
		logger:      logger,
	}
}

// Login method removed - login is now handled by NebulaAuth gateway
// Users authenticate directly with NebulaAuth gateway, not through this service

// Logout handles user logout
// @Summary User logout
// @Description Logout current user
// @Tags 认证
// @Security BearerAuth
// @Success 200 {object} map[string]interface{}
// @Router /auth/logout [post]
func (h *AuthHandler) Logout(c *gin.Context) {
	userID, _ := middleware.GetUserID(c)
	h.logger.Info("User logged out", zap.String("user_id", userID))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Logged out successfully",
	})
}

// GetCurrentUser returns the current authenticated user
// @Summary Get current user
// @Description Get information about the current authenticated user (from database)
// @Tags 认证
// @Security BearerAuth
// @Success 200 {object} models.User
// @Failure 401 {object} utils.ErrorResponse
// @Failure 404 {object} utils.ErrorResponse
// @Router /auth/me [get]
func (h *AuthHandler) GetCurrentUser(c *gin.Context) {
	// Get user ID from Header (set by auth middleware)
	userID, exists := middleware.GetUserID(c)
	if !exists {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	// Get token from Authorization header for calling NebulaAuth API
	token, tokenExists := middleware.GetToken(c)
	if !tokenExists {
		utils.HandleError(c, http.StatusUnauthorized, "Token not found", nil)
		return
	}

	// Get user from database or fetch from NebulaAuth if not found
	user, err := h.authService.GetCurrentUser(userID, token)
	if err != nil {
		h.logger.Error("Failed to get current user",
			zap.String("user_id", userID),
			zap.Error(err),
		)
		utils.HandleError(c, http.StatusNotFound, "User not found", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    user,
	})
}
