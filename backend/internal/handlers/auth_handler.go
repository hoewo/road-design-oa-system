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

// Login handles user login
// @Summary User login
// @Description Authenticate user and return JWT token
// @Tags 认证
// @Accept json
// @Produce json
// @Param request body services.LoginRequest true "Login credentials"
// @Success 200 {object} services.LoginResponse
// @Failure 400 {object} utils.ErrorResponse
// @Failure 401 {object} utils.ErrorResponse
// @Router /auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	var req services.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	response, err := h.authService.Login(&req)
	if err != nil {
		h.logger.Warn("Login failed",
			zap.String("username", req.Username),
			zap.Error(err),
		)
		utils.HandleError(c, http.StatusUnauthorized, "Invalid credentials", err)
		return
	}

	h.logger.Info("User logged in successfully",
		zap.String("username", req.Username),
		zap.String("user_id", response.User.ID),
	)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

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
// @Description Get information about the current authenticated user
// @Tags 认证
// @Security BearerAuth
// @Success 200 {object} models.User
// @Failure 401 {object} utils.ErrorResponse
// @Router /auth/me [get]
func (h *AuthHandler) GetCurrentUser(c *gin.Context) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	user, err := h.authService.GetCurrentUser(userID)
	if err != nil {
		utils.HandleError(c, http.StatusNotFound, "User not found", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    user,
	})
}
