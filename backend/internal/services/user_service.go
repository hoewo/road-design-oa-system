package services

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"project-oa-backend/internal/config"
	"project-oa-backend/internal/models"
	"project-oa-backend/pkg/database"
)

// UserService handles user-related operations
type UserService struct {
	db     *gorm.DB
	config *config.Config
}

// NewUserService creates a new user service
func NewUserService() *UserService {
	return &UserService{
		db: database.DB,
	}
}

// NewUserServiceWithConfig creates a new user service with config
func NewUserServiceWithConfig(cfg *config.Config) *UserService {
	return &UserService{
		db:     database.DB,
		config: cfg,
	}
}

// ListUsersRequest represents the request to list users
type ListUsersRequest struct {
	Page      int    `form:"page"`
	Size      int    `form:"size"`
	Keyword   string `form:"keyword"`
	Role      string `form:"role"`
	IsActive  *bool  `form:"is_active"`
	HasAccount *bool `form:"has_account"` // 账号查询过滤
}

// ListUsersResponse represents the response for listing users
type ListUsersResponse struct {
	Data  []models.User `json:"data"`
	Total int64         `json:"total"`
	Page  int           `json:"page"`
	Size  int           `json:"size"`
}

// CreateUserRequest represents the request to create a user
type CreateUserRequest struct {
	Username   string          `json:"username" binding:"required"`
	Email      string          `json:"email" binding:"required,email"`
	Password   string          `json:"password" binding:"required,min=8"`
	RealName   string          `json:"real_name" binding:"required"`
	Role       models.UserRole `json:"role" binding:"required"`
	Department string          `json:"department"`
	Phone      string          `json:"phone"`
}

// UpdateUserRequest represents the request to update a user
type UpdateUserRequest struct {
	Email      *string          `json:"email"`
	RealName   *string          `json:"real_name"`
	Role       *models.UserRole `json:"role"`
	Department *string          `json:"department"`
	Phone      *string          `json:"phone"`
	IsActive   *bool            `json:"is_active"`
}

// ListUsers retrieves a list of users with pagination and filtering
func (s *UserService) ListUsers(req *ListUsersRequest) (*ListUsersResponse, error) {
	if req.Page < 1 {
		req.Page = 1
	}
	if req.Size < 1 {
		req.Size = 20
	}
	if req.Size > 100 {
		req.Size = 100
	}

	query := s.db.Model(&models.User{})

	// Apply keyword filter (search in username, real_name, email)
	if req.Keyword != "" {
		keyword := "%" + req.Keyword + "%"
		query = query.Where("username LIKE ? OR real_name LIKE ? OR email LIKE ?", keyword, keyword, keyword)
	}

	// Apply role filter
	if req.Role != "" {
		query = query.Where("role = ?", req.Role)
	}

	// Apply is_active filter
	if req.IsActive != nil {
		query = query.Where("is_active = ?", *req.IsActive)
	}

	// Apply has_account filter
	if req.HasAccount != nil {
		query = query.Where("has_account = ?", *req.HasAccount)
	}

	// Get total count
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	// Get paginated results
	var users []models.User
	offset := (req.Page - 1) * req.Size
	if err := query.Offset(offset).Limit(req.Size).Order("created_at DESC").Find(&users).Error; err != nil {
		return nil, err
	}

	// Clear passwords from response
	for i := range users {
		users[i].Password = ""
	}

	return &ListUsersResponse{
		Data:  users,
		Total: total,
		Page:  req.Page,
		Size:  req.Size,
	}, nil
}

// GetUser retrieves a user by ID (UUID string)
func (s *UserService) GetUser(userID string) (*models.User, error) {
	var user models.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}

	// Clear password from response
	user.Password = ""

	return &user, nil
}

// CreateUser creates a new user
func (s *UserService) CreateUser(req *CreateUserRequest) (*models.User, error) {
	// Check if username already exists
	var existingUser models.User
	if err := s.db.Where("username = ? OR email = ?", req.Username, req.Email).First(&existingUser).Error; err == nil {
		return nil, errors.New("username or email already exists")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	// Create user
	user := &models.User{
		Username:   req.Username,
		Email:      req.Email,
		Password:   string(hashedPassword),
		RealName:   req.RealName,
		Role:       req.Role,
		Department: req.Department,
		Phone:      req.Phone,
		IsActive:   true,
	}

	if err := s.db.Create(user).Error; err != nil {
		return nil, err
	}

	// Clear password from response
	user.Password = ""

	return user, nil
}

// UpdateUser updates an existing user (UUID string)
func (s *UserService) UpdateUser(userID string, req *UpdateUserRequest) (*models.User, error) {
	var user models.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}

	// Update fields if provided
	if req.Email != nil {
		// Check if email is already taken by another user
		var existingUser models.User
		if err := s.db.Where("email = ? AND id != ?", *req.Email, userID).First(&existingUser).Error; err == nil {
			return nil, errors.New("email already exists")
		}
		user.Email = *req.Email
	}

	if req.RealName != nil {
		user.RealName = *req.RealName
	}

	if req.Role != nil {
		user.Role = *req.Role
	}

	if req.Department != nil {
		user.Department = *req.Department
	}

	if req.Phone != nil {
		user.Phone = *req.Phone
	}

	if req.IsActive != nil {
		user.IsActive = *req.IsActive
	}

	if err := s.db.Save(&user).Error; err != nil {
		return nil, err
	}

	// Clear password from response
	user.Password = ""

	return &user, nil
}

// CreateNebulaAuthUserRequest 创建NebulaAuth用户请求
// 包含NebulaAuth字段和OA业务字段
// 注意：邮箱和手机号二选一即可，但至少需要提供其中一个
type CreateNebulaAuthUserRequest struct {
	// NebulaAuth字段
	Email      string `json:"email"`                  // 邮箱（可选，与手机号二选一）
	Phone      string `json:"phone,omitempty"`        // 手机号（可选，与邮箱二选一）
	Username   string `json:"username" binding:"required"`
	IsVerified bool   `json:"is_verified,omitempty"`
	IsActive   bool   `json:"is_active,omitempty"`
	// OA业务字段
	RealName   string `json:"real_name,omitempty"`   // 真实姓名
	Role       string `json:"role,omitempty"`         // OA角色（可选，如果NebulaAuth is_admin=true则会被覆盖为RoleAdmin）
	Department string `json:"department,omitempty"`   // 部门
}

// Validate 验证CreateNebulaAuthUserRequest，确保邮箱和手机号至少提供一个
func (r *CreateNebulaAuthUserRequest) Validate() error {
	if r.Email == "" && r.Phone == "" {
		return errors.New("email and phone cannot both be empty, at least one is required")
	}
	// 如果提供了邮箱，验证邮箱格式
	if r.Email != "" {
		// 简单的邮箱格式验证（包含@符号）
		if len(r.Email) < 3 || !strings.Contains(r.Email, "@") {
			return errors.New("invalid email format")
		}
	}
	// 如果提供了手机号，验证手机号格式（11位数字）
	if r.Phone != "" {
		if len(r.Phone) != 11 {
			return errors.New("phone number must be 11 digits")
		}
		for _, c := range r.Phone {
			if c < '0' || c > '9' {
				return errors.New("phone number must contain only digits")
			}
		}
	}
	return nil
}

// CreateNebulaAuthUserResponse NebulaAuth创建用户响应
type CreateNebulaAuthUserResponse struct {
	Success bool `json:"success"`
	Message string `json:"message,omitempty"`
	Data    struct {
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
	} `json:"data"`
	Error string `json:"error,omitempty"`
}

// CreateNebulaAuthUser 调用NebulaAuth User Service API创建用户
// token: 当前请求的Token（用于调用NebulaAuth API）
func (s *UserService) CreateNebulaAuthUser(req *CreateNebulaAuthUserRequest, token string) (*CreateNebulaAuthUserResponse, error) {
	if s.config == nil {
		return nil, errors.New("config is required for CreateNebulaAuthUser")
	}

	// 构建请求URL（通过API Gateway访问）
	// 注意：必须通过API Gateway访问，使用APIBaseURL（网关地址）
	url := s.config.APIBaseURL + "/user-service/v1/admin/users"

	// 构建请求体（只包含NebulaAuth需要的字段，不包含OA业务字段）
	// 注意：邮箱和手机号二选一，但至少需要提供其中一个
	nebulaReq := map[string]interface{}{
		"username":    req.Username,
		"is_verified": req.IsVerified,
		"is_active":   req.IsActive,
	}
	// 如果提供了邮箱，添加到请求中
	if req.Email != "" {
		nebulaReq["email"] = req.Email
	}
	// 如果提供了手机号，添加到请求中
	if req.Phone != "" {
		nebulaReq["phone"] = req.Phone
	}
	reqBody, err := json.Marshal(nebulaReq)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// 创建HTTP请求
	httpReq, err := http.NewRequest("POST", url, bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// 设置请求头
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+token)

	// 发送请求
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to call NebulaAuth User Service API: %w", err)
	}
	defer resp.Body.Close()

	// 读取响应
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// 解析响应
	var result CreateNebulaAuthUserResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	// 检查响应状态
	if resp.StatusCode != http.StatusCreated {
		errorMsg := result.Error
		if errorMsg == "" {
			errorMsg = fmt.Sprintf("NebulaAuth API returned status %d", resp.StatusCode)
		}
		return nil, fmt.Errorf(errorMsg)
	}

	if !result.Success {
		errorMsg := result.Error
		if errorMsg == "" {
			errorMsg = "NebulaAuth API returned success=false"
		}
		return nil, fmt.Errorf(errorMsg)
	}

	return &result, nil
}

// GetUserByEmailOrUsername 通过邮箱、手机号或用户名查询本地数据库中的用户
func (s *UserService) GetUserByEmailOrUsername(email, phone, username string) (*models.User, error) {
	var user models.User
	// 构建查询条件：邮箱、手机号或用户名
	query := s.db
	conditions := []string{}
	args := []interface{}{}
	
	if email != "" {
		conditions = append(conditions, "email = ?")
		args = append(args, email)
	}
	if phone != "" {
		conditions = append(conditions, "phone = ?")
		args = append(args, phone)
	}
	if username != "" {
		conditions = append(conditions, "username = ?")
		args = append(args, username)
	}
	
	if len(conditions) == 0 {
		return nil, nil // 没有查询条件，返回nil
	}
	
	err := query.Where(strings.Join(conditions, " OR "), args...).First(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil // 用户不存在，返回nil但不报错
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// GetNebulaAuthUserByEmail 通过邮箱从NebulaAuth查询用户（管理员接口）
// 接口：GET /user-service/v1/admin/users/email/{email}
// 需要管理员Token认证
func (s *UserService) GetNebulaAuthUserByEmail(email, token string) (*CreateNebulaAuthUserResponse, error) {
	if s.config == nil {
		return nil, errors.New("config is required for GetNebulaAuthUserByEmail")
	}
	if email == "" {
		return nil, errors.New("email is required")
	}

	// 构建请求URL（通过API Gateway访问）
	url := s.config.APIBaseURL + "/user-service/v1/admin/users/email/" + email

	// 创建HTTP请求
	httpReq, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// 设置请求头
	httpReq.Header.Set("Authorization", "Bearer "+token)

	// 发送请求
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to call NebulaAuth User Service API: %w", err)
	}
	defer resp.Body.Close()

	// 读取响应
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// 如果返回404，用户不存在
	if resp.StatusCode == http.StatusNotFound {
		return nil, nil // 用户不存在，返回nil但不报错
	}

	// 如果返回其他错误状态码
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("NebulaAuth API returned status %d: %s", resp.StatusCode, string(body))
	}

	// 解析响应
	var result CreateNebulaAuthUserResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return &result, nil
}

// GetNebulaAuthUserByPhone 通过手机号从NebulaAuth查询用户（管理员接口）
// 接口：GET /user-service/v1/admin/users/phone/{phone}
// 需要管理员Token认证
func (s *UserService) GetNebulaAuthUserByPhone(phone, token string) (*CreateNebulaAuthUserResponse, error) {
	if s.config == nil {
		return nil, errors.New("config is required for GetNebulaAuthUserByPhone")
	}
	if phone == "" {
		return nil, errors.New("phone is required")
	}

	// 构建请求URL（通过API Gateway访问）
	url := s.config.APIBaseURL + "/user-service/v1/admin/users/phone/" + phone

	// 创建HTTP请求
	httpReq, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// 设置请求头
	httpReq.Header.Set("Authorization", "Bearer "+token)

	// 发送请求
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to call NebulaAuth User Service API: %w", err)
	}
	defer resp.Body.Close()

	// 读取响应
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// 如果返回404，用户不存在
	if resp.StatusCode == http.StatusNotFound {
		return nil, nil // 用户不存在，返回nil但不报错
	}

	// 如果返回其他错误状态码
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("NebulaAuth API returned status %d: %s", resp.StatusCode, string(body))
	}

	// 解析响应
	var result CreateNebulaAuthUserResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return &result, nil
}

// GetNebulaAuthUserByEmailOrUsername 通过邮箱或用户名从NebulaAuth查询用户
// 注意：此方法已废弃，请使用GetNebulaAuthUserByEmail或GetNebulaAuthUserByPhone
// 保留此方法以保持向后兼容
func (s *UserService) GetNebulaAuthUserByEmailOrUsername(email, username, token string) (*CreateNebulaAuthUserResponse, error) {
	if s.config == nil {
		return nil, nil // 配置不存在，返回nil表示未找到（不报错）
	}
	// 优先使用邮箱查询
	if email != "" {
		return s.GetNebulaAuthUserByEmail(email, token)
	}
	// 如果邮箱为空，返回nil（不支持通过用户名查询）
	return nil, nil
}

// SyncUserToLocalDB 同步NebulaAuth用户到OA本地数据库
// nebulaUser: NebulaAuth返回的用户信息
// realName: OA业务字段-真实姓名（可选，如果为空则使用username）
// role: OA业务字段-角色（可选，如果NebulaAuth is_admin=true则会被覆盖为RoleAdmin）
// department: OA业务字段-部门（可选）
func (s *UserService) SyncUserToLocalDB(nebulaUser *CreateNebulaAuthUserResponse, realName, role, department string) (*models.User, error) {
	// 确定OA角色
	var oaRole models.UserRole
	if nebulaUser.Data.IsAdmin {
		// NebulaAuth管理员 → OA系统管理员
		oaRole = models.RoleAdmin
	} else {
		// 非管理员：使用前端传入的role，如果未传则默认RoleMember
		if role != "" {
			oaRole = models.UserRole(role)
		} else {
			oaRole = models.RoleMember
		}
	}

	// 确定真实姓名
	oaRealName := realName
	if oaRealName == "" {
		oaRealName = nebulaUser.Data.Username
	}

	// 解析时间戳
	var createdAt, updatedAt time.Time
	if nebulaUser.Data.CreatedAt != "" {
		if t, err := time.Parse(time.RFC3339, nebulaUser.Data.CreatedAt); err == nil {
			createdAt = t
		} else {
			createdAt = time.Now()
		}
	} else {
		createdAt = time.Now()
	}
	if nebulaUser.Data.UpdatedAt != "" {
		if t, err := time.Parse(time.RFC3339, nebulaUser.Data.UpdatedAt); err == nil {
			updatedAt = t
		} else {
			updatedAt = time.Now()
		}
	} else {
		updatedAt = time.Now()
	}

	// 构建User模型
	user := &models.User{
		ID:         nebulaUser.Data.ID,
		Username:   nebulaUser.Data.Username,
		Email:      nebulaUser.Data.Email,
		Phone:      nebulaUser.Data.Phone,
		RealName:   oaRealName,
		Role:       oaRole,
		Department: department,
		IsActive:   nebulaUser.Data.IsActive,
		HasAccount: true, // 用户有NebulaAuth账号
		Password:   "",   // 无密码存储
		CreatedAt:  createdAt,
		UpdatedAt:  updatedAt,
	}

	// 检查用户是否已存在
	var existingUser models.User
	err := s.db.First(&existingUser, "id = ?", user.ID).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		// 创建新用户
		if err := s.db.Create(user).Error; err != nil {
			return nil, fmt.Errorf("failed to create user in local database: %w", err)
		}
		return user, nil
	} else if err != nil {
		return nil, fmt.Errorf("failed to check existing user: %w", err)
	}

	// 更新现有用户（更新字段，包括角色）
	updates := map[string]interface{}{
		"username":    user.Username,
		"email":       user.Email,
		"phone":       user.Phone,
		"real_name":   user.RealName,
		"role":        user.Role, // 更新角色（根据NebulaAuth is_admin或前端传入）
		"department":  user.Department,
		"is_active":   user.IsActive,
		"has_account": true,
		"updated_at":  time.Now(),
	}

	if err := s.db.Model(&existingUser).Updates(updates).Error; err != nil {
		return nil, fmt.Errorf("failed to update user in local database: %w", err)
	}

	// 重新查询更新后的用户
	if err := s.db.First(&existingUser, "id = ?", user.ID).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch updated user: %w", err)
	}

	return &existingUser, nil
}
