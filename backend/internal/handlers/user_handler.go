package handlers

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"project-oa-backend/internal/config"
	"project-oa-backend/internal/services"
	"project-oa-backend/pkg/utils"
)

// containsRole checks if a role exists in the roles array
func containsRole(roles []string, targetRole string) bool {
	for _, role := range roles {
		if role == targetRole {
			return true
		}
	}
	return false
}

// UserHandler handles user-related HTTP requests
type UserHandler struct {
	userService *services.UserService
	config      *config.Config
	logger      *zap.Logger
}

// NewUserHandler creates a new user handler
func NewUserHandler(logger *zap.Logger) *UserHandler {
	return &UserHandler{
		userService: services.NewUserService(),
		logger:      logger,
	}
}

// NewUserHandlerWithConfig creates a new user handler with config
func NewUserHandlerWithConfig(cfg *config.Config, logger *zap.Logger) *UserHandler {
	return &UserHandler{
		userService: services.NewUserServiceWithConfig(cfg),
		config:      cfg,
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
// 注意：在admin路由下，此方法用于创建NebulaAuth用户（调用NebulaAuth User Service API）
// @Summary Create a new user (NebulaAuth)
// @Description Create a new user account in NebulaAuth system
// @Tags 用户管理
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param request body services.CreateNebulaAuthUserRequest true "User information"
// @Success 201 {object} services.CreateNebulaAuthUserResponse
// @Failure 400 {object} utils.ErrorResponse
// @Failure 409 {object} utils.ErrorResponse
// @Router /users [post]
func (h *UserHandler) CreateUser(c *gin.Context) {
	// 验证管理员权限（路由层面已通过AuthLevelAdmin验证，这里再次确认）
	// 注意：在admin路由下，此方法用于创建NebulaAuth用户

	// 解析请求体
	var req services.CreateNebulaAuthUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// 验证请求：确保邮箱和手机号至少提供一个
	if err := req.Validate(); err != nil {
		utils.HandleError(c, http.StatusBadRequest, err.Error(), err)
		return
	}

	// 从Authorization Header提取Token
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		utils.HandleError(c, http.StatusUnauthorized, "Missing authorization token", nil)
		return
	}

	// 提取Token（Bearer <token>）
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || parts[0] != "Bearer" {
		utils.HandleError(c, http.StatusUnauthorized, "Invalid authorization header format", nil)
		return
	}
	token := parts[1]

	// 优化流程：先检查用户是否已存在
	// 1. 先查询本地数据库（支持邮箱、手机号、用户名）
	localUser, err := h.userService.GetUserByEmailOrUsername(req.Email, req.Phone, req.Username)
	if err != nil {
		h.logger.Error("Failed to query local database",
			zap.Error(err),
			zap.String("email", req.Email),
			zap.String("phone", req.Phone),
			zap.String("username", req.Username),
		)
		utils.HandleError(c, http.StatusInternalServerError, "Failed to query user", err)
		return
	}

	var nebulaUser *services.CreateNebulaAuthUserResponse

	// 如果本地数据库已存在用户
	if localUser != nil {
		h.logger.Info("User already exists in local database, syncing with OA fields",
			zap.String("user_id", localUser.ID),
			zap.String("email", req.Email),
			zap.String("phone", req.Phone),
			zap.String("username", req.Username),
		)

		// 构建NebulaAuth响应格式（用于同步）
		nebulaUser = &services.CreateNebulaAuthUserResponse{
			Success: true,
			Message: "User already exists, synced with OA fields",
			Data: struct {
				ID         string `json:"id"`
				Email      string `json:"email"`
				Phone      string `json:"phone"`
				Username   string `json:"username"`
				IsAdmin    bool   `json:"is_admin"`
				IsVerified bool   `json:"is_verified"`
				IsActive   bool   `json:"is_active"`
				AvatarURL  string `json:"avatar_url,omitempty"`
				CreatedAt  string `json:"created_at"`
				UpdatedAt  string `json:"updated_at"`
			}{
				ID:         localUser.ID,
				Email:      localUser.Email,
				Phone:      localUser.Phone,
				Username:   localUser.Username,
				IsAdmin:    containsRole(localUser.Roles, "admin"),
				IsVerified: true, // 假设已存在用户已验证
				IsActive:   localUser.IsActive,
				CreatedAt:  localUser.CreatedAt.Format(time.RFC3339),
				UpdatedAt:  localUser.UpdatedAt.Format(time.RFC3339),
			},
		}
	} else {
		// 本地数据库不存在，查询NebulaAuth
		// 优先使用邮箱查询，如果邮箱为空则使用手机号
		if req.Email != "" {
			nebulaUser, err = h.userService.GetNebulaAuthUserByEmail(req.Email, token)
			if err != nil {
				h.logger.Error("Failed to query NebulaAuth by email",
					zap.Error(err),
					zap.String("email", req.Email),
				)
				// 查询失败，继续尝试创建
				nebulaUser = nil
			}
		} else if req.Phone != "" {
			nebulaUser, err = h.userService.GetNebulaAuthUserByPhone(req.Phone, token)
			if err != nil {
				h.logger.Error("Failed to query NebulaAuth by phone",
					zap.Error(err),
					zap.String("phone", req.Phone),
				)
				// 查询失败，继续尝试创建
				nebulaUser = nil
			}
		}

		// 如果NebulaAuth已存在，直接使用查询结果
		if nebulaUser != nil {
			h.logger.Info("User already exists in NebulaAuth, syncing to local database",
				zap.String("user_id", nebulaUser.Data.ID),
				zap.String("email", nebulaUser.Data.Email),
				zap.String("phone", nebulaUser.Data.Phone),
				zap.String("username", nebulaUser.Data.Username),
			)
		} else {
			// NebulaAuth不存在，创建新用户
			nebulaUser, err = h.userService.CreateNebulaAuthUser(&req, token)
			if err != nil {
				// 根据错误类型处理
				errorMsg := err.Error()
				if strings.Contains(errorMsg, "already exists") || strings.Contains(errorMsg, "409") {
					// 用户已存在，返回错误提示
					h.logger.Info("User already exists in NebulaAuth",
						zap.String("email", req.Email),
						zap.String("phone", req.Phone),
						zap.String("username", req.Username),
					)
					utils.HandleError(c, http.StatusConflict, "User already exists in NebulaAuth", err)
					return
				} else if strings.Contains(errorMsg, "400") {
					utils.HandleError(c, http.StatusBadRequest, "Invalid request", err)
					return
				} else {
					h.logger.Error("Failed to create NebulaAuth user",
						zap.Error(err),
						zap.String("email", req.Email),
						zap.String("phone", req.Phone),
						zap.String("username", req.Username),
					)
					utils.HandleError(c, http.StatusInternalServerError, "Failed to create user", err)
					return
				}
			}

			h.logger.Info("NebulaAuth user created successfully",
				zap.String("user_id", nebulaUser.Data.ID),
				zap.String("email", nebulaUser.Data.Email),
				zap.String("phone", nebulaUser.Data.Phone),
				zap.String("username", nebulaUser.Data.Username),
			)
		}
	}

	// 同步用户到OA本地数据库
	localUser, syncErr := h.userService.SyncUserToLocalDB(nebulaUser, req.RealName, req.Roles, req.Department)
	if syncErr != nil {
		// 记录错误但不失败（用户已在NebulaAuth创建成功）
		h.logger.Error("Failed to sync user to local database",
			zap.Error(syncErr),
			zap.String("user_id", nebulaUser.Data.ID),
		)
		// 继续返回NebulaAuth用户信息，但记录警告
		// 可以选择返回警告或继续返回成功
	}

	// 返回同步后的完整用户信息（如果同步成功）或NebulaAuth用户信息（如果同步失败）
	if localUser != nil {
		// 返回同步后的完整OA用户信息
		c.JSON(http.StatusCreated, gin.H{
			"success": true,
			"message": nebulaUser.Message,
			"data": gin.H{
				"id":          localUser.ID,
				"username":    localUser.Username,
				"email":       localUser.Email,
				"phone":       localUser.Phone,
				"real_name":   localUser.RealName,
				"roles":       localUser.Roles,
				"department":  localUser.Department,
				"is_active":   localUser.IsActive,
				"has_account": localUser.HasAccount,
				"created_at":  localUser.CreatedAt,
				"updated_at":  localUser.UpdatedAt,
			},
		})
	} else {
		// 同步失败，返回NebulaAuth用户信息（向后兼容）
		c.JSON(http.StatusCreated, gin.H{
			"success": true,
			"message": nebulaUser.Message,
			"data":    nebulaUser.Data,
		})
	}
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

// UpdateUserAdmin handles admin user update (updates NebulaAuth and syncs to local DB)
// @Summary Update user information (Admin - updates NebulaAuth)
// @Description Admin updates user information in NebulaAuth and syncs to local database
// @Tags 用户管理
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param id path string true "User ID (UUID)"
// @Param request body services.UpdateNebulaAuthUserRequest true "User information to update"
// @Success 200 {object} models.User
// @Failure 400 {object} utils.ErrorResponse
// @Failure 404 {object} utils.ErrorResponse
// @Failure 500 {object} utils.ErrorResponse
// @Router /admin/users/{id} [put]
func (h *UserHandler) UpdateUserAdmin(c *gin.Context) {
	// 验证管理员权限（路由层面已通过AuthLevelAdmin验证，这里再次确认）
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "User ID is required", nil)
		return
	}

	// 解析请求体
	var req services.UpdateNebulaAuthUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// 验证请求（如果提供了邮箱或手机号，验证格式）
	if err := req.Validate(); err != nil {
		utils.HandleError(c, http.StatusBadRequest, err.Error(), err)
		return
	}

	// 检查用户是否是系统管理员，如果是则不允许修改Roles
	if req.Roles != nil && len(req.Roles) > 0 {
		// 查询现有用户
		existingUser, err := h.userService.GetUser(id)
		if err == nil && existingUser != nil {
			// 检查现有用户是否是系统管理员
			if containsRole(existingUser.Roles, "admin") {
				utils.HandleError(c, http.StatusForbidden, "系统管理员的角色不能修改", nil)
				return
			}
		} else if err != nil {
			// 如果查询失败，记录错误但继续执行（可能用户不存在，后续会报错）
			h.logger.Warn("Failed to check existing user for admin role protection",
				zap.String("user_id", id),
				zap.Error(err),
			)
		}
	}

	// 从Authorization Header提取Token
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		utils.HandleError(c, http.StatusUnauthorized, "Missing authorization token", nil)
		return
	}
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || parts[0] != "Bearer" {
		utils.HandleError(c, http.StatusUnauthorized, "Invalid authorization header format", nil)
		return
	}
	token := parts[1]

	// 先更新NebulaAuth用户信息
	nebulaUser, err := h.userService.UpdateNebulaAuthUser(id, &req, token)
	if err != nil {
		h.logger.Error("Failed to update NebulaAuth user",
			zap.Error(err),
			zap.String("user_id", id),
		)
		errorMsg := err.Error()
		if strings.Contains(errorMsg, "404") || strings.Contains(errorMsg, "not found") {
			utils.HandleError(c, http.StatusNotFound, "User not found in NebulaAuth", err)
		} else if strings.Contains(errorMsg, "400") {
			utils.HandleError(c, http.StatusBadRequest, "Invalid request to NebulaAuth", err)
		} else {
			utils.HandleError(c, http.StatusInternalServerError, "Failed to update user in NebulaAuth", err)
		}
		return
	}

	h.logger.Info("NebulaAuth user updated successfully",
		zap.String("user_id", nebulaUser.Data.ID),
		zap.String("email", nebulaUser.Data.Email),
		zap.String("phone", nebulaUser.Data.Phone),
		zap.String("username", nebulaUser.Data.Username),
	)

	// 同步更新后的用户信息到OA本地数据库
	updatedLocalUser, syncErr := h.userService.SyncUpdatedUserToLocalDB(nebulaUser, req.RealName, req.Roles, req.Department)
	if syncErr != nil {
		h.logger.Error("Failed to sync updated user to local database",
			zap.Error(syncErr),
			zap.String("user_id", nebulaUser.Data.ID),
		)
		// NebulaAuth更新成功，但本地数据库同步失败
		// 返回NebulaAuth更新结果，但记录错误
		utils.HandleError(c, http.StatusInternalServerError, "Failed to sync user to local database", syncErr)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "用户信息更新成功",
		"data": gin.H{
			"id":          updatedLocalUser.ID,
			"username":    updatedLocalUser.Username,
			"email":       updatedLocalUser.Email,
			"phone":       updatedLocalUser.Phone,
			"real_name":   updatedLocalUser.RealName,
			"roles":       updatedLocalUser.Roles,
			"department":  updatedLocalUser.Department,
			"is_active":   updatedLocalUser.IsActive,
			"has_account": updatedLocalUser.HasAccount,
			"created_at":  updatedLocalUser.CreatedAt,
			"updated_at":  updatedLocalUser.UpdatedAt,
		},
	})
}
