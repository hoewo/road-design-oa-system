# 认证中间件实现

本文档介绍如何实现统一认证中间件，支持两种认证模式（`self_validate` 和 `gateway`），实现代码与认证方式解耦。

## 📋 前置条件

在实现认证中间件之前，请确保：

- 已完成业务服务开发准备（参考 [业务服务开发准备](./02-service-development-setup.md)）
- 已了解认证模式选择（参考 [业务服务开发准备](./02-service-development-setup.md#认证模式选择)）
- 已配置环境变量

## 🎯 设计原理

统一认证中间件通过环境变量控制认证方式，实现：

- **代码解耦**：业务代码与认证方式无关
- **环境切换**：只需修改配置，无需改代码
- **易于测试**：两种模式可以独立测试

详细的设计原理请参考：[架构与设计原理](./reference/architecture.md#统一认证中间件)

## 🔧 实现方式

### 两种模式的实现

#### gateway 模式（生产环境）

**工作原理**：
- 网关已验证 Token
- 业务服务器从 Header 读取用户信息
- 无需额外 API 调用

**实现要点**：
- 从 `X-User-ID` Header 读取用户ID
- 如果 Header 为空，返回 401 未认证
- 将用户信息设置到上下文（Context）中

#### self_validate 模式（开发环境）

**工作原理**：
- 业务服务器提取 Token
- 调用 NebulaAuth API 验证 Token
- 验证成功后处理请求

**实现要点**：
- 从 `Authorization: Bearer <token>` Header 提取 Token
- 调用 `/auth-server/v1/internal/validate_token` 接口验证
- 验证成功后设置用户信息到上下文

## 💻 代码实现

### Go 语言实现

完整代码请参考：`examples/auth-middleware/auth-middleware-go.go`

**核心实现**：

```go
func AuthMiddleware(cfg *config.Config) gin.HandlerFunc {
    if cfg.AuthMode == "self_validate" {
        return selfValidateAuthMiddleware(cfg)
    }
    return gatewayAuthMiddleware()
}
```

**gateway 模式实现**：

```go
func gatewayAuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        userID := c.GetHeader("X-User-ID")
        if userID == "" {
            c.JSON(http.StatusUnauthorized, gin.H{
                "error": "未认证",
                "code":  "UNAUTHORIZED",
            })
            c.Abort()
            return
        }
        
        // 设置用户信息到上下文
        c.Set("user_id", userID)
        c.Set("username", c.GetHeader("X-User-Username"))
        c.Set("is_admin", c.GetHeader("X-User-IsAdmin") == "true")
        c.Next()
    }
}
```

**self_validate 模式实现**：

```go
func selfValidateAuthMiddleware(cfg *config.Config) gin.HandlerFunc {
    return func(c *gin.Context) {
        // 提取 Token
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
            c.JSON(http.StatusUnauthorized, gin.H{
                "error": "缺少 Token",
                "code":  "TOKEN_MISSING",
            })
            c.Abort()
            return
        }
        
        token := strings.TrimPrefix(authHeader, "Bearer ")
        
        // 调用 NebulaAuth API 验证 Token
        result, err := validateTokenWithNebulaAuth(cfg.NebulaAuthURL, token)
        if err != nil || !result.Success || !result.Data.Valid {
            c.JSON(http.StatusUnauthorized, gin.H{
                "error": "Token 无效",
                "code":  "TOKEN_INVALID",
            })
            c.Abort()
            return
        }
        
        // 设置用户信息到上下文
        c.Set("user_id", result.Data.UserID)
        c.Set("username", result.Data.Username)
        c.Set("is_admin", result.Data.IsAdmin)
        c.Next()
    }
}
```

### Node.js 实现

完整代码请参考：`examples/auth-middleware/auth-middleware-nodejs.js`

**核心实现**：

```javascript
function authMiddleware(req, res, next) {
  if (config.authMode === 'self_validate') {
    return selfValidateAuth(req, res, next);
  }
  return gatewayAuth(req, res, next);
}
```

## 📡 Header 处理

### gateway 模式下的 Header

网关在验证 Token 后，会将用户信息注入到请求 Header 中：

**user/admin 级别（外部服务会收到）**：
- `X-User-ID`: 用户ID（UUID格式）
- `X-User-Username`: 用户名
- `X-User-AppID`: 应用ID
- `X-User-SessionID`: 会话ID（UUID格式）

**注意**：外部服务不会收到 `X-User-Role` 和 `X-User-IsAdmin` header（出于安全考虑）。

**apikey 级别**：
- `X-User-ID`: 用户ID
- `X-User-Username`: 用户名
- `X-User-Permissions`: 权限列表（JSON字符串）
- `X-User-Allowed-Services`: 允许访问的服务列表（JSON字符串）
- `X-Auth-Type`: `apikey`

详细的 Header 说明请参考：[架构与设计原理](./reference/architecture.md#header-注入机制)

### 获取用户信息

无论使用哪种模式，业务代码都通过统一的接口获取用户信息：

```go
// Go 语言
userID := c.GetString("user_id")
username := c.GetString("username")
isAdmin := c.GetBool("is_admin")
```

```javascript
// Node.js
const userID = req.user.id;
const username = req.user.username;
const isAdmin = req.user.isAdmin;
```

这确保了代码的一致性和可维护性。

## 🔍 Token 验证 API

在 `self_validate` 模式下，需要调用 NebulaAuth API 验证 Token：

**接口**：`POST /auth-server/v1/internal/validate_token`

**请求**：
```json
{
  "token": "jwt_token"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "valid": true,
    "user_id": "uuid",
    "username": "username",
    "is_admin": false,
    "app_id": "default",
    "session_id": "uuid"
  }
}
```

详细的 API 文档请参考：[API 参考](./reference/api-reference.md)

## ✅ 使用示例

### 在路由中使用中间件

```go
// main.go
func main() {
    cfg := config.LoadConfig()
    r := gin.Default()
    
    // 用户接口组（需要认证）
    userGroup := r.Group("/" + cfg.ServiceName + "/v1/user")
    userGroup.Use(middleware.AuthMiddleware(cfg))
    {
        userGroup.GET("/profile", getUserProfile)
    }
    
    r.Run(":" + cfg.ServicePort)
}

func getUserProfile(c *gin.Context) {
    // 从上下文获取用户信息
    userID := c.GetString("user_id")
    username := c.GetString("username")
    
    c.JSON(200, gin.H{
        "user_id": userID,
        "username": username,
    })
}
```

## 🧪 测试

认证中间件的单元测试示例请参考：`examples/testing/test-middleware-go_test.go`

## ⚠️ 注意事项

1. **生产环境必须使用 gateway 模式**：性能更好，安全性更高
2. **Header 可用性**：外部服务不会收到 `X-User-Role` 和 `X-User-IsAdmin` header
3. **错误处理**：统一错误响应格式，参考 [业务接口开发](./04-business-api-development.md#错误处理规范)
4. **性能优化**：开发环境可以考虑 Token 验证缓存（生产环境不需要）

## 🔗 下一步

实现认证中间件后，您可以：

1. **开发业务接口**：参考 [业务接口开发](./04-business-api-development.md)
2. **了解最佳实践**：参考 [最佳实践](./reference/best-practices.md)
3. **测试和调试**：参考 [测试与调试](./07-testing-debugging.md)

## 📝 相关文档

- [业务服务开发准备](./02-service-development-setup.md) - 环境配置和认证模式选择
- [业务接口开发](./04-business-api-development.md) - 业务接口开发指南
- [架构与设计原理](./reference/architecture.md) - 系统架构和设计原理
- [最佳实践](./reference/best-practices.md) - 性能优化等最佳实践

