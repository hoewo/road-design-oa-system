# 最佳实践

本文档介绍基于 NebulaAuth 开发业务服务的最佳实践，包括环境变量管理、错误处理、日志记录、性能优化、安全性考虑等。

## ⚙️ 环境变量管理

### 环境配置文件结构

推荐使用以下文件结构管理环境配置：

```
your-service/
├── env.example              # 完整配置模板（提交到 Git）
└── .env                     # 本地个人配置（不提交，可选）
```

**文件说明**：

| 文件 | 用途 | 是否提交 | 说明 |
|------|------|---------|------|
| `env.example` | 完整配置模板 | ✅ 提交 | 包含所有配置项和详细说明，供参考 |
| `.env` | 本地个人配置 | ❌ 不提交 | 用于本地开发配置，从 env.example 复制并修改 |

**配置加载优先级**（从高到低）：
1. 系统环境变量（优先级最高）
2. `.env`（如果存在，用于本地开发）
3. `env.example`（仅作为参考，不会被加载）

### 生产环境配置

**重要**：生产环境**必须使用系统环境变量**，不要使用 `.env` 文件。

**推荐方式**：

1. **systemd service 文件**：在 service 文件中配置环境变量
2. **Docker Compose**：在 docker-compose.yml 中使用 environment 或 env_file
3. **Kubernetes ConfigMap/Secret**：使用 ConfigMap 和 Secret 管理配置

参考代码：`examples/deployment/`

### Git 配置

**`.gitignore`** 配置:

```gitignore
# 环境配置文件
.env                    # 本地个人配置，不提交
.env.local              # 本地配置，不提交

# 注意：以下文件应该提交到 Git
# env.example
```

**重要提示**：
- ✅ **提交**：`env.example`（作为模板，不含敏感信息）
- ❌ **不提交**：`.env`、`.env.local`（个人配置，可能包含敏感信息）
- 🔒 **敏感信息**：生产环境的实际 IP、密码等敏感信息应通过系统环境变量或密钥管理工具注入，不要硬编码在配置文件中

## ⚠️ 错误处理

### 统一错误响应格式

```go
type ErrorResponse struct {
    Error     string `json:"error"`
    Code      string `json:"code"`
    Details   string `json:"details,omitempty"`
    Timestamp int64  `json:"timestamp"`
}

func ErrorResponse(c *gin.Context, statusCode int, code, message string) {
    c.JSON(statusCode, ErrorResponse{
        Error:     message,
        Code:      code,
        Timestamp: time.Now().Unix(),
    })
}
```

参考代码：`examples/business-api/error-handling-go.go`

### 错误码规范

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| `UNAUTHORIZED` | 401 | 未认证 |
| `TOKEN_MISSING` | 401 | 缺少 Token |
| `TOKEN_INVALID` | 401 | Token 无效 |
| `VALIDATION_ERROR` | 500 | 验证过程错误 |
| `FORBIDDEN` | 403 | 权限不足 |

### 错误处理最佳实践

1. **统一错误格式**：所有错误响应使用统一的格式
2. **明确的错误码**：使用有意义的错误码，便于客户端处理
3. **详细的错误信息**：开发环境提供详细错误信息，生产环境隐藏敏感信息
4. **错误日志记录**：记录错误日志，便于排查问题

## 📝 日志记录

### 记录认证模式

```go
log.Printf("[AUTH] 当前认证模式: %s", cfg.AuthMode)
```

### 记录认证结果

```go
log.Printf("[AUTH] 用户认证成功: user_id=%s, mode=%s", userID, cfg.AuthMode)
log.Printf("[AUTH] 用户认证失败: error=%s, mode=%s", err.Error(), cfg.AuthMode)
```

### 日志记录最佳实践

1. **结构化日志**：使用结构化日志格式（JSON），便于日志分析
2. **日志级别**：合理使用日志级别（debug, info, warn, error）
3. **请求追踪**：为每个请求生成唯一ID，支持全链路追踪
4. **敏感信息**：不要在日志中记录敏感信息（Token、密码等）

## ⚡ 性能优化

### Token 验证缓存（开发模式）

在开发环境（`self_validate` 模式）下，可以考虑 Token 验证缓存：

```go
var tokenCache = sync.Map{}

func getCachedUserInfo(token string) (*UserInfo, bool) {
    if cached, ok := tokenCache.Load(token); ok {
        return cached.(*UserInfo), true
    }
    return nil, false
}

func setCachedUserInfo(token string, userInfo *UserInfo, ttl time.Duration) {
    tokenCache.Store(token, userInfo)
    time.AfterFunc(ttl, func() {
        tokenCache.Delete(token)
    })
}
```

**注意**：生产环境使用网关模式，无需缓存。

### 减少 Header 解析开销

```go
// 缓存 Header 解析结果（如果框架支持）
var headerCache = sync.Map{}

func getCachedHeader(req *http.Request, key string) string {
    cacheKey := req.Header.Get("X-Request-ID") + key
    if cached, ok := headerCache.Load(cacheKey); ok {
        return cached.(string)
    }
    value := req.Header.Get(key)
    headerCache.Store(cacheKey, value)
    return value
}
```

### 性能优化最佳实践

1. **使用网关模式**：生产环境必须使用 `gateway` 模式，性能提升 75-85%
2. **连接池**：配置数据库和Redis连接池
3. **缓存策略**：合理使用缓存，减少数据库查询
4. **异步处理**：对于耗时操作，使用异步处理

## 🔒 安全性考虑

### 生产环境必须使用网关模式

```go
if cfg.NodeEnv == "production" && cfg.AuthMode != "gateway" {
    log.Fatal("生产环境必须使用 gateway 模式")
}
```

### 验证 Header 来源（可选）

在生产环境中，可以验证请求是否来自网关：

```go
func gatewayAuth() gin.HandlerFunc {
    return func(c *gin.Context) {
        // 验证是否来自网关（可选）
        gatewayIP := c.GetHeader("X-Forwarded-For")
        if !isValidGatewayIP(gatewayIP) {
            c.JSON(403, gin.H{"error": "非法请求来源"})
            c.Abort()
            return
        }
        // ...
    }
}
```

### 安全性最佳实践

1. **使用HTTPS**：生产环境必须使用HTTPS
2. **Token安全**：不要在日志中记录Token
3. **输入验证**：验证所有用户输入，防止SQL注入、XSS等攻击
4. **权限检查**：在业务逻辑中检查用户权限
5. **错误信息**：生产环境不要暴露详细的错误信息

## 🧪 测试最佳实践

### 单元测试

为认证中间件编写单元测试：

参考代码：`examples/testing/test-middleware-go_test.go`

```go
func TestAuthMiddleware_GatewayMode(t *testing.T) {
    cfg := &config.Config{AuthMode: "gateway"}
    middleware := AuthMiddleware(cfg)
    
    w := httptest.NewRecorder()
    c, _ := gin.CreateTestContext(w)
    c.Request = httptest.NewRequest("GET", "/", nil)
    c.Request.Header.Set("X-User-ID", "test-user-id")
    
    middleware(c)
    
    assert.Equal(t, "test-user-id", c.GetString("user_id"))
}
```

### 集成测试

编写端到端测试，验证完整的认证流程：

```go
func TestE2EAuthFlow(t *testing.T) {
    // 1. 启动测试服务器
    server := startTestServer()
    defer server.Close()
    
    // 2. 获取 Token
    token := getTestToken()
    
    // 3. 测试业务接口
    resp := testAPIRequest(server.URL+"/api/user/profile", token)
    assert.Equal(t, 200, resp.StatusCode)
}
```

### 测试最佳实践

1. **单元测试**：为关键组件编写单元测试
2. **集成测试**：编写端到端测试，验证完整流程
3. **测试覆盖率**：保持较高的测试覆盖率
4. **测试数据**：使用测试数据，不要影响生产数据

## 📊 监控和指标

### 健康检查设计

增强的健康检查（包含依赖检查）：

参考代码：`examples/service-registration/health-check-enhanced.go`

```go
r.GET("/your-service/health", func(c *gin.Context) {
    health := gin.H{
        "status":    "ok",
        "service":   "your-service",
        "timestamp": time.Now().Unix(),
    }
    
    // 检查数据库连接
    if err := db.Ping(); err != nil {
        health["status"] = "degraded"
        health["database"] = "unavailable"
    } else {
        health["database"] = "ok"
    }
    
    // 检查 Redis 连接
    if err := redis.Ping(); err != nil {
        health["status"] = "degraded"
        health["cache"] = "unavailable"
    } else {
        health["cache"] = "ok"
    }
    
    statusCode := 200
    if health["status"] == "degraded" {
        statusCode = 503
    }
    
    c.JSON(statusCode, health)
})
```

### 监控指标

添加认证相关的监控指标：

```go
var (
    authSuccessCounter = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "auth_success_total",
            Help: "认证成功次数",
        },
        []string{"mode"},
    )
    authFailureCounter = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "auth_failure_total",
            Help: "认证失败次数",
        },
        []string{"mode", "error"},
    )
)
```

## 🔄 服务注册最佳实践

### 服务名命名规范

- 使用小写字母和连字符：`your-service`
- 避免使用版本号：不要用 `your-service-v1`
- 保持简洁：`user-service` 而不是 `user-management-service`
- 避免冲突：注册前检查服务名是否已存在

### 服务注册时机

1. **开发环境**：可以手动注册，用于测试
2. **生产环境**：建议通过 CI/CD 自动注册
3. **更新服务**：使用 PUT 接口更新，而不是删除后重新注册

### 使用注册脚本

使用 `guides/scripts/register-service.sh` 脚本可以快速注册服务，自动处理登录、获取Token和注册流程。

详细说明请参考：[服务注册与集成](../05-service-registration.md)

## 📚 相关文档

- [业务服务开发准备](../02-service-development-setup.md) - 环境配置
- [认证中间件实现](../03-auth-middleware.md) - 认证中间件实现
- [业务接口开发](../04-business-api-development.md) - 业务接口开发
- [架构与设计原理](./architecture.md) - 系统架构和设计原理

