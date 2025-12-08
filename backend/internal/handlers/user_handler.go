package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"project-oa-backend/internal/services"
	"project-oa-backend/pkg/utils"
)

// UserHandler handles user-related HTTP requests
type UserHandler struct {
	userService *services.UserService
	logger      *zap.Logger
}

// NewUserHandler creates a new user handler
func NewUserHandler(logger *zap.Logger) *UserHandler {
	return &UserHandler{
		userService: services.NewUserService(),
		logger:      logger,
	}
}

// ListUsers handles retrieving a list of users
// @Summary Get user list
// @Description Get a paginated list of users with search, role filtering, and active status filtering
// @Tags 用户管理
// @Security BearerAuth
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param size query int false "Page size" default(20)
// @Param keyword query string false "Search keyword (username, real_name, email)"
// @Param role query string false "Filter by role (admin, manager, business, designer, reviewer, finance)"
// @Param is_active query bool false "Filter by active status"
// @Success 200 {object} services.ListUsersResponse
// @Failure 400 {object} utils.ErrorResponse
// @Router /users [get]
func (h *UserHandler) ListUsers(c *gin.Context) {
	var req services.ListUsersRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid query parameters", err)
		return
	}

	response, err := h.userService.ListUsers(&req)
	if err != nil {
		h.logger.Error("Failed to list users",
			zap.Error(err),
		)
		utils.HandleError(c, http.StatusInternalServerError, "Failed to list users", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response.Data,
		"total":   response.Total,
		"page":    response.Page,
		"size":    response.Size,
	})
}

// GetUser handles retrieving a user by ID (UUID string)
// @Summary Get user details
// @Description Get detailed information about a specific user
// @Tags 用户管理
// @Security BearerAuth
// @Produce json
// @Param id path string true "User ID (UUID)"
// @Success 200 {object} models.User
// @Failure 404 {object} utils.ErrorResponse
// @Router /users/{id} [get]
func (h *UserHandler) GetUser(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "User ID is required", nil)
		return
	}

	user, err := h.userService.GetUser(id)
	if err != nil {
		h.logger.Error("Failed to get user",
			zap.Error(err),
			zap.String("user_id", id),
		)
		if err.Error() == "user not found" {
			utils.HandleError(c, http.StatusNotFound, "User not found", err)
		} else {
			utils.HandleError(c, http.StatusInternalServerError, "Failed to get user", err)
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    user,
	})
}

// CreateUser handles user creation
// @Summary Create a new user
// @Description Create a new user account
// @Tags 用户管理
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param request body services.CreateUserRequest true "User information"
// @Success 201 {object} models.User
// @Failure 400 {object} utils.ErrorResponse
// @Failure 409 {object} utils.ErrorResponse
// @Router /users [post]
func (h *UserHandler) CreateUser(c *gin.Context) {
	var req services.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	user, err := h.userService.CreateUser(&req)
	if err != nil {
		h.logger.Error("Failed to create user",
			zap.Error(err),
		)
		if err.Error() == "username or email already exists" {
			utils.HandleError(c, http.StatusConflict, "Username or email already exists", err)
		} else {
			utils.HandleError(c, http.StatusBadRequest, "Failed to create user", err)
		}
		return
	}

	h.logger.Info("User created successfully",
		zap.String("user_id", user.ID),
		zap.String("username", user.Username),
	)

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    user,
	})
}

// UpdateUser handles user update
// @Summary Update user information
// @Description Update user information (allows modification of business fields except system fields like created_at, id)
// @Tags 用户管理
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param id path string true "User ID (UUID)"
// @Param request body services.UpdateUserRequest true "User information to update"
// @Success 200 {object} models.User
// @Failure 400 {object} utils.ErrorResponse
// @Failure 404 {object} utils.ErrorResponse
// @Failure 409 {object} utils.ErrorResponse
// @Router /users/{id} [put]
func (h *UserHandler) UpdateUser(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "User ID is required", nil)
		return
	}

	var req services.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	user, err := h.userService.UpdateUser(id, &req)
	if err != nil {
		h.logger.Error("Failed to update user",
			zap.Error(err),
			zap.String("user_id", id),
		)
		if err.Error() == "user not found" {
			utils.HandleError(c, http.StatusNotFound, "User not found", err)
		} else if err.Error() == "email already exists" {
			utils.HandleError(c, http.StatusConflict, "Email already exists", err)
		} else {
			utils.HandleError(c, http.StatusBadRequest, "Failed to update user", err)
		}
		return
	}

	h.logger.Info("User updated successfully",
		zap.String("user_id", user.ID),
	)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    user,
	})
}
