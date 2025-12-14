# 业务接口开发

本文档介绍如何开发基于 NebulaAuth 的业务接口，包括路由规范、认证级别、用户信息获取、错误处理等。

## 📋 前置条件

在开始开发业务接口之前，请确保：

- 已完成认证中间件实现（参考 [认证中间件实现](./03-auth-middleware.md)）
- 已了解路由规范（参考 [业务服务开发准备](./02-service-development-setup.md#路由规范)）
- 已了解认证级别

## 🛣️ 路由规范

所有 API 必须遵循统一路由格式：

```
/{service}/{version}/{auth_level}/{path}
```

### 路由组件说明

| 组件 | 说明 | 示例 | 限制 |
|------|------|------|------|
| `service` | 服务名称 | `your-service` | 不能为版本号或内部标识 |
| `version` | API 版本 | `v1`, `v2` | 仅支持 v1, v2 |
| `auth_level` | 认证级别 | `public`, `user`, `apikey`, `admin` | 仅支持这四种 |
| `path` | 接口路径 | `profile`, `data`, `stats` | 自定义 |

### 路由示例

```
GET  /your-service/v1/public/info          # 公开接口
GET  /your-service/v1/user/profile         # 用户接口（JWT）
GET  /your-service/v1/apikey/data          # API密钥接口
GET  /your-service/v1/admin/stats          # 管理员接口
GET  /your-service/health                   # 健康检查（例外）
```

## 🔐 认证级别

根据业务需求选择合适的认证级别。不是所有服务都需要支持所有四种级别。

### 认证级别说明

| 认证级别 | 说明 | 认证要求 | 适用场景 |
|---------|------|---------|---------|
| `public` | 公开接口 | 无需认证 | 健康检查、登录注册、验证码发送 |
| `user` | 用户接口 | JWT Token 认证 | 用户信息管理、个人设置 |
| `apikey` | API密钥接口 | API密钥认证 | 服务间调用、第三方集成 |
| `admin` | 管理接口 | 管理员权限 | 系统管理、用户管理 |

### ⚠️ 关于 Internal 接口

**重要**：`internal` **不是认证级别**，而是**服务间通信接口**。

- **Internal 接口**：`/v1/internal/*` 是服务间直接通信接口，**不经过网关**
- **认证级别**：`public`、`user`、`apikey`、`admin` 是网关路由的认证级别，用于客户端访问

**区别**：

| 类型 | 路径格式 | 访问方式 | 用途 |
|------|---------|---------|------|
| **认证级别** | `/{service}/v1/{auth_level}/*` | 通过网关访问 | 客户端调用业务接口 |
| **Internal 接口** | `/v1/internal/*` | 服务间直接访问 | 服务间内部通信 |

**业务服务开发指南**：

1. **业务服务不需要实现 Internal 接口**：Internal 接口是 NebulaAuth 系统内部服务使用的
2. **业务服务只需要实现认证级别接口**：`public`、`user`、`apikey`、`admin`
3. **如果业务服务需要调用其他服务**：使用标准的认证级别接口，而不是 Internal 接口

**示例**：

```go
// ✅ 正确：业务服务实现认证级别接口
r.GET("/your-service/v1/user/profile", getUserProfile)
r.GET("/your-service/v1/admin/stats", getAdminStats)

// ❌ 错误：业务服务不应该实现 Internal 接口
// r.GET("/v1/internal/users", getUsers)  // 这是 NebulaAuth 内部服务使用的
```

### 认证级别选择

| 服务类型 | 需要的认证级别 | 路由示例 |
|---------|--------------|---------|
| 简单用户服务 | `public` + `user` | `/{service}/v1/public/*`, `/{service}/v1/user/*` |
| 需要第三方集成 | `public` + `user` + `apikey` | `/{service}/v1/public/*`, `/{service}/v1/user/*`, `/{service}/v1/apikey/*` |
| 需要管理功能 | `public` + `user` + `admin` | `/{service}/v1/public/*`, `/{service}/v1/user/*`, `/{service}/v1/admin/*` |
| 完整平台服务 | 所有四种级别 | `/{service}/v1/public/*`, `/{service}/v1/user/*`, `/{service}/v1/apikey/*`, `/{service}/v1/admin/*` |

**注意**：所有服务必须实现 `public` 级别的健康检查接口 `/{service}/health`

## 📝 健康检查接口（必须实现）

所有服务必须实现健康检查接口，用于服务发现和监控。

### 基本实现

参考代码：`examples/business-api/health-check-go.go`

```go
r.GET("/"+cfg.ServiceName+"/health", func(c *gin.Context) {
    c.JSON(200, gin.H{
        "status":    "ok",
        "service":   cfg.ServiceName,
        "auth_mode": cfg.AuthMode,
        "timestamp": time.Now().Unix(),
    })
})
```

### 增强实现（包含依赖检查）

参考代码：`examples/service-registration/health-check-enhanced.go`

可以检查数据库、Redis 等依赖服务的连接状态。

## 👤 用户信息获取

无论使用哪种认证模式，业务代码都通过统一的接口获取用户信息。

### Go 语言

```go
// 从上下文获取用户信息
userID := c.GetString("user_id")
username := c.GetString("username")
isAdmin := c.GetBool("is_admin")
appID := c.GetHeader("X-User-AppID")
sessionID := c.GetHeader("X-User-SessionID")
```

### Node.js

```javascript
// 从请求对象获取用户信息
const userID = req.user.id;
const username = req.user.username;
const isAdmin = req.user.isAdmin;
const appID = req.headers['x-user-appid'];
const sessionID = req.headers['x-user-sessionid'];
```

### API密钥接口的特殊处理

对于 `apikey` 级别的接口，需要解析权限和服务列表：

```go
// 解析权限列表（JSON字符串）
permissionsJSON := c.GetHeader("X-User-Permissions")
var permissions []string
if permissionsJSON != "" {
    json.Unmarshal([]byte(permissionsJSON), &permissions)
}

// 解析允许的服务列表（JSON字符串）
allowedServicesJSON := c.GetHeader("X-User-Allowed-Services")
var allowedServices []string
if allowedServicesJSON != "" {
    json.Unmarshal([]byte(allowedServicesJSON), &allowedServices)
}
```

详细的 Header 说明请参考：[架构与设计原理](./reference/architecture.md#header-注入机制)

## 💻 完整服务示例

完整的业务服务示例请参考：`examples/business-api/complete-service-go.go`

### 示例代码结构

```go
func main() {
    cfg := config.LoadConfig()
    r := gin.Default()
    
    // 1. 健康检查（必须实现）
    r.GET("/"+cfg.ServiceName+"/health", healthCheck)
    
    // 2. 公开接口
    r.GET("/"+cfg.ServiceName+"/v1/public/info", publicInfo)
    
    // 3. 用户接口（需要JWT认证）
    userGroup := r.Group("/" + cfg.ServiceName + "/v1/user")
    userGroup.Use(middleware.AuthMiddleware(cfg))
    {
        userGroup.GET("/profile", getUserProfile)
    }
    
    // 4. API密钥接口
    apikeyGroup := r.Group("/" + cfg.ServiceName + "/v1/apikey")
    apikeyGroup.Use(middleware.AuthMiddleware(cfg))
    {
        apikeyGroup.GET("/data", getApiKeyData)
    }
    
    // 5. 管理员接口
    adminGroup := r.Group("/" + cfg.ServiceName + "/v1/admin")
    adminGroup.Use(middleware.AuthMiddleware(cfg))
    {
        adminGroup.GET("/stats", getAdminStats)
    }
    
    r.Run(":" + cfg.ServicePort)
}
```

## ⚠️ 错误处理规范

### 统一错误响应格式

参考代码：`examples/business-api/error-handling-go.go`

```go
type ErrorResponse struct {
    Error     string `json:"error"`
    Code      string `json:"code"`
    Details   string `json:"details,omitempty"`
    Timestamp int64  `json:"timestamp"`
}
```

### 常见错误码

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| `UNAUTHORIZED` | 401 | 未认证 |
| `TOKEN_MISSING` | 401 | 缺少 Token |
| `TOKEN_INVALID` | 401 | Token 无效 |
| `VALIDATION_ERROR` | 500 | 验证过程错误 |
| `FORBIDDEN` | 403 | 权限不足 |

### 错误处理示例

```go
func ErrorResponse(c *gin.Context, statusCode int, code, message string) {
    c.JSON(statusCode, ErrorResponse{
        Error:     message,
        Code:      code,
        Timestamp: time.Now().Unix(),
    })
}

// 使用示例
if userID == "" {
    ErrorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "未认证")
    return
}
```

## 🔍 管理员权限判断

### 如何判断用户是否是管理员

业务服务可以通过以下方式判断当前用户是否是管理员：

#### 方式1：从上下文读取（推荐）

认证中间件已经将 `is_admin` 解析并存储到上下文中：

```go
// 从上下文获取管理员标识
isAdmin := c.GetBool("is_admin")

// 在业务逻辑中使用
if isAdmin {
    // 管理员逻辑
} else {
    // 普通用户逻辑
}
```

参考代码：`examples/business-api/admin-check.go`

#### 方式2：从 Header 读取（仅本地服务）

**注意**：只有本地服务（通过 Unix Socket 通信）才能收到 `X-User-IsAdmin` header。

```go
// 从 Header 读取管理员标识
isAdminStr := c.GetHeader("X-User-IsAdmin")
isAdmin := isAdminStr == "true"
```

**外部服务**不会收到 `X-User-IsAdmin` header，但管理员权限已在网关层验证。

#### 方式3：通过路由级别判断（外部服务）

对于外部服务，如果请求能到达 `admin` 级别的端点，说明用户已经是管理员：

```go
// 外部服务中，不需要再次检查 is_admin
// 网关已经验证了管理员权限
adminGroup.GET("/stats", func(c *gin.Context) {
    userID := c.GetString("user_id")
    // 直接处理管理员请求
    c.JSON(200, gin.H{"message": "管理员统计信息"})
})
```

### 管理员权限检查中间件

如果需要额外的权限检查，可以使用管理员权限检查中间件：

参考代码：`examples/business-api/admin-check.go`

```go
// AdminOnlyMiddleware 管理员权限检查中间件
func AdminOnlyMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        isAdmin := c.GetBool("is_admin")
        if !isAdmin {
            c.JSON(http.StatusForbidden, gin.H{
                "error": "需要管理员权限",
                "code":  "ADMIN_PERMISSION_REQUIRED",
            })
            c.Abort()
            return
        }
        c.Next()
    }
}

// 使用示例
adminGroup := r.Group("/v1/admin")
adminGroup.Use(AdminOnlyMiddleware())
{
    adminGroup.GET("/stats", getAdminStats)
}
```

## ✅ 开发检查清单

在完成业务接口开发后，请确认：

- [ ] 已实现健康检查接口 `/{service}/health`
- [ ] 已根据业务需求选择合适的认证级别
- [ ] 已实现业务接口，遵循路由规范
- [ ] 已处理网关注入的用户信息 Header
- [ ] 已实现统一错误处理
- [ ] 已测试所有接口功能

## 🔗 下一步

完成业务接口开发后，您可以：

1. **注册服务到 NebulaAuth**：参考 [服务注册与集成](./05-service-registration.md)
2. **集成前端**：参考 [前端集成](./06-frontend-integration.md)
3. **测试和调试**：参考 [测试与调试](./07-testing-debugging.md)

## 📝 相关文档

- [认证中间件实现](./03-auth-middleware.md) - 统一认证中间件的实现
- [服务注册与集成](./05-service-registration.md) - 服务注册指南
- [架构与设计原理](./reference/architecture.md) - 系统架构和设计原理
- [最佳实践](./reference/best-practices.md) - 错误处理等最佳实践

