// admin-create-user.go
// 业务服务中管理员创建用户的示例
// 
// 说明：
// 1. NebulaAuth 现在提供了管理员创建用户的接口：POST /user-service/v1/admin/users
// 2. 如果业务服务需要在自己的服务中封装用户管理功能，可以参考此示例
// 3. 业务服务可以调用 NebulaAuth 的管理员接口或内部接口来创建用户
// 业务服务需要调用 user-service 的内部接口创建用户

package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"github.com/gin-gonic/gin"
)

// ============================================
// 方式1：直接调用 NebulaAuth 的管理员接口（推荐）
// ============================================
//
// NebulaAuth 现在提供了管理员创建用户的接口：
// POST /user-service/v1/admin/users
//
// 重要提示：
// - 必须通过 API Gateway 访问：http://<api-gateway-host>:<api-gateway-port>/user-service/v1/admin/users
// - 需要传递管理员 token（Bearer Token）
// - <api-gateway-host> 和 <api-gateway-port> 需要根据实际部署环境替换
// - Docker 环境示例：http://nebula-api-gateway:8080
// - 开发环境示例：http://<api-gateway-host>:<api-gateway-port>
//
// 如果业务服务只需要创建用户，可以直接调用此接口，无需自己实现。
// 只有在需要在业务服务中封装额外的用户管理逻辑时，才需要参考下面的方式2。
//
// 示例代码：
// func createUserViaAdminAPI(gatewayURL string, adminToken string, req AdminCreateUserRequest) (*CreateUserResponse, error) {
//     url := fmt.Sprintf("%s/user-service/v1/admin/users", gatewayURL)
//     reqBody, _ := json.Marshal(req)
//     httpReq, _ := http.NewRequest("POST", url, bytes.NewBuffer(reqBody))
//     httpReq.Header.Set("Content-Type", "application/json")
//     httpReq.Header.Set("Authorization", "Bearer "+adminToken)
//     // ... 发送请求并处理响应
// }

// ============================================
// 方式2：调用 user-service 的内部接口创建用户
// ============================================
//
// 如果业务服务需要在自己的服务中封装用户管理功能，
// 可以调用 user-service 的内部接口（不经过网关）

// CreateUserRequest 创建用户请求
type CreateUserRequest struct {
	Email     *string `json:"email,omitempty"`
	Phone     *string `json:"phone,omitempty"`
	Username  *string `json:"username,omitempty"`
	AvatarURL *string `json:"avatar_url,omitempty"`
}

// CreateUserResponse 创建用户响应
type CreateUserResponse struct {
	Success bool   `json:"success"`
	Data    User   `json:"data"`
	Message string `json:"message"`
}

// User 用户模型
type User struct {
	ID         string `json:"id"`
	Email      *string `json:"email,omitempty"`
	Phone      *string `json:"phone,omitempty"`
	Username   *string `json:"username,omitempty"`
	AvatarURL  *string `json:"avatar_url,omitempty"`
	IsActive   bool   `json:"is_active"`
	IsVerified bool   `json:"is_verified"`
	IsAdmin    bool   `json:"is_admin"`
}

// createUserViaInternalAPI 通过内部接口创建用户
// 注意：需要直接调用 user-service，不经过网关
func createUserViaInternalAPI(userServiceURL string, req CreateUserRequest) (*CreateUserResponse, error) {
	jsonData, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("序列化请求失败: %v", err)
	}

	// 调用 user-service 的内部接口（不经过网关）
	url := fmt.Sprintf("%s/v1/internal/users", userServiceURL)
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("调用 user-service 失败: %v", err)
	}
	defer resp.Body.Close()

	var result CreateUserResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("解析响应失败: %v", err)
	}

	if !result.Success {
		return nil, fmt.Errorf("创建用户失败: %s", result.Message)
	}

	return &result, nil
}

// ============================================
// 业务服务的管理接口实现
// ============================================

// AdminCreateUserRequest 管理员创建用户请求
type AdminCreateUserRequest struct {
	Email     string  `json:"email" binding:"required,email"`
	Phone     *string `json:"phone,omitempty"`
	Username  *string `json:"username,omitempty"`
	AvatarURL *string `json:"avatar_url,omitempty"`
}

// AdminCreateUserHandler 管理员创建用户接口
// 路由：POST /your-service/v1/admin/users
func AdminCreateUserHandler(userServiceURL string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. 验证管理员权限（网关已验证，可以直接使用）
		// 网关已经验证了管理员权限，如果请求能到达这里，说明用户是管理员
		
		// 2. 解析请求参数
		var req AdminCreateUserRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "请求格式错误: " + err.Error(),
			})
			return
		}

		// 3. 调用 user-service 的内部接口创建用户
		createReq := CreateUserRequest{
			Email:     &req.Email,
			Phone:     req.Phone,
			Username:  req.Username,
			AvatarURL: req.AvatarURL,
		}

		result, err := createUserViaInternalAPI(userServiceURL, createReq)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   err.Error(),
			})
			return
		}

		// 4. 返回创建结果
		c.JSON(http.StatusCreated, gin.H{
			"success": true,
			"data":    result.Data,
			"message": "用户创建成功",
		})
	}
}

// ============================================
// 使用示例
// ============================================

func setupAdminRoutes(r *gin.Engine, userServiceURL string) {
	// 管理员接口组（需要管理员权限）
	adminGroup := r.Group("/your-service/v1/admin")
	adminGroup.Use(AdminOnlyMiddleware()) // 管理员权限检查中间件
	{
		// 创建用户接口
		adminGroup.POST("/users", AdminCreateUserHandler(userServiceURL))
		
		// 其他管理员接口...
	}
}

// ============================================
// 配置说明
// ============================================

// userServiceURL 配置示例：
// - 如果 user-service 在同一 Docker 网络中：http://nebula-user-service:<port>
// - 如果 user-service 在宿主机上：http://host.docker.internal:<port>
// - 如果 user-service 在其他服务器：http://<user-service-host>:<user-service-port>
// - <port> 和 <user-service-host> 需要根据实际部署环境替换

// 注意：
// 1. 必须直接调用 user-service，不能通过网关调用
// 2. 内部接口不需要认证，但需要确保网络可达
// 3. 如果业务服务和 user-service 不在同一网络，需要配置网络连接

