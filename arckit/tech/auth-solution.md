# 认证与路由技术方案

**领域**: project-management  
**状态**: ✅ 已采用  
**最后更新**: 2026-03-17

## 概述

研究基于 NebulaAuth 统一认证网关的路由与认证中间件实现，包括路由格式设计、Header 解析、Token 刷新机制和管理员权限判断。

## 路由格式设计

**决策**: 使用 Gin 的路由组功能，按 service/version/auth_level 组织路由

**路由结构**: `/{service}/{version}/{auth_level}/{path}`

**实现**:
```go
// internal/router/router.go
func SetupRouter() *gin.Engine {
    router := gin.Default()
    
    // Public routes
    public := router.Group("/project-oa/v1/public")
    {
        public.GET("/health", healthHandler)
    }
    
    // User routes (需要认证)
    user := router.Group("/project-oa/v1/user")
    user.Use(AuthMiddleware())
    {
        user.GET("/projects", projectHandler.List)
        user.POST("/projects", projectHandler.Create)
        user.GET("/projects/:id", projectHandler.Get)
        // ...
    }
    
    // Admin routes (需要管理员权限)
    adminGroup := router.Group("/project-oa/v1/admin")
    adminGroup.Use(AuthMiddleware())
    {
        adminGroup.POST("/users", userHandler.CreateUser)
    }
    
    return router
}
```

## 认证中间件（Header 读取）

**决策**: 实现自定义路由中间件，从 Header 中提取用户信息并注入到 Context

**理由**:
- 遵循统一的路由格式：`/{service}/{version}/{auth_level}/{path}`
- 网关已验证 JWT Token，后端只需从 Header 读取用户信息
- 通过中间件统一处理，避免在每个 handler 中重复代码

**实现**:
```go
// internal/middleware/auth.go
func AuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        userID := c.GetHeader("X-User-ID")
        username := c.GetHeader("X-User-Username")
        appID := c.GetHeader("X-User-AppID")
        sessionID := c.GetHeader("X-User-SessionID")
        
        if userID == "" || username == "" {
            c.JSON(401, gin.H{"error": "Unauthorized"})
            c.Abort()
            return
        }
        
        c.Set("user_id", userID)
        c.Set("username", username)
        c.Set("app_id", appID)
        c.Set("session_id", sessionID)
        c.Next()
    }
}
```

**备选方案**:
- 在每个 handler 中读取 Header：代码重复，维护困难
- 使用 JWT 解析：网关已验证，后端无需重复验证
- 使用 Session：无状态设计，不适合分布式部署

## NebulaAuth 登录集成

**决策**: 客户端直接调用 NebulaAuth 网关的登录接口，获取 Token 后存储到 localStorage

**登录流程**:

1. **发送验证码**：`POST /auth-server/v1/public/send_verification`
2. **用户登录**：`POST /auth-server/v1/public/login`
3. **刷新 Token**：`POST /auth-server/v1/public/refresh_token`

**环境差异**:

| 环境 | 登录接口 | 业务接口 |
|------|---------|---------|
| 开发环境 | 直接调用 NebulaAuth 网关 | 直接调用本地业务服务器 |
| 生产环境 | 调用 NebulaAuth 网关 | 通过网关调用业务服务 |

**前端实现要点**:
- Token 存储在 localStorage
- 请求拦截器自动添加 Authorization 头
- Token 过期时自动刷新，刷新失败跳转登录页

## Token 刷新机制（Access Token 2小时，Refresh Token 30天）

**决策**: 实现前端主动刷新和被动刷新两种机制，结合 Refresh Token（30天有效期）实现长期免登录

**问题**：用户超过 2 小时后重新打开网页，Access Token 已过期，但 Refresh Token 仍然有效（30天内）。页面加载时如果直接调用 `getCurrentUser()` 会返回 401，被误判为未认证，错误跳转到登录页。

**解决方案**：
- **主动刷新**：页面加载时，在调用业务接口前，先检查 Token 是否接近过期（如剩余 5 分钟），若接近则主动刷新
- **被动刷新**：API 拦截器检测 401 错误自动刷新（已实现）
- **初始化流程**：页面加载时先尝试刷新 Token，再调用业务接口

## 管理员权限判断

**决策**: 结合登录响应和 API 查询两种方式，优先使用本地存储，必要时调用 API 更新

**注意**：
- ⚠️ gateway 模式下，外部服务不会收到 `X-User-IsAdmin` header（出于安全考虑）
- ✅ self_validate 模式下，Token 验证 API 返回 `is_admin` 字段
- ✅ 可以通过调用 User Service API 获取管理员状态

**前端判断（已实现）**：
- 登录时保存 `is_admin` 到 localStorage
- 提供统一 `isAdmin()` 检查函数
- 前端判断仅用于 UI 显示和路由控制，真正的权限验证在服务端

**后端判断**：
- self_validate 模式：从 Token 验证响应获取 `is_admin`，注入到 Context
- gateway 模式：调用 `GET /user-service/v1/user/profile` API 获取管理员状态
