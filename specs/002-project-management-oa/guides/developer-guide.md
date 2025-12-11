# 开发者详细指南：NebulaAuth 深入理解

> **目标读者**: 人类开发者
> 
> **用途**: 提供详细的背景知识、最佳实践、故障排除和进阶话题

## 📖 何时使用本文档

本文档是 [AI 快速参考](./ai-quick-reference.md) 的补充，适合以下场景：

- **需要深入理解设计原理**: 想知道为什么这样设计，而不是仅仅知道怎么做
- **遇到问题需要排查**: 遇到认证失败、服务注册失败等问题，需要详细的故障排除指南
- **优化性能和安全性**: 需要了解最佳实践，优化代码性能和安全性
- **进阶开发需求**: 需要多环境管理、监控指标、单元测试等进阶话题
- **理解架构决策**: 想了解为什么需要两种认证模式，统一中间件的优势等

如果你只是需要快速开始开发，请直接使用 [AI 快速参考](./ai-quick-reference.md)。

## 🎓 设计原理

### 为什么需要两种认证模式？

#### 本地开发场景

在本地开发时，如果使用网关模式，需要：
1. 配置内网穿透工具（如 ngrok）
2. 将本地服务注册到 NebulaAuth
3. 每次启动都需要重新配置

这增加了开发复杂度。因此，我们提供了 `self_validate` 模式：
- 业务服务器直接调用 NebulaAuth API 验证 Token
- 无需内网穿透
- 无需服务注册
- 开箱即用

#### 生产环境场景

在生产环境中，使用网关模式有以下优势：
1. **性能更好**：网关已验证 Token，业务服务器直接读取 Header，无需额外 API 调用（性能提升 75-85%）
2. **安全性更高**：Token 验证集中在网关，业务服务器无需处理 Token
3. **统一管理**：所有服务通过网关统一路由和监控
4. **负载均衡**：网关可以轻松实现负载均衡

### 架构设计原理

#### 统一认证中间件

通过环境变量控制认证方式，实现：
- **代码解耦**：业务代码与认证方式无关
- **环境切换**：只需修改配置，无需改代码
- **易于测试**：两种模式可以独立测试

#### 用户信息获取方式

无论使用哪种模式，业务代码都通过统一的接口获取用户信息：

```go
// 两种模式都使用相同的接口
userID := c.GetString("user_id")
username := c.GetString("username")
isAdmin := c.GetBool("is_admin")
```

这确保了代码的一致性和可维护性。

### 路由设计原理

#### 为什么需要统一路由格式？

统一路由格式 `/{service}/{version}/{auth_level}/{path}` 的设计原因：

1. **网关路由识别**：网关可以根据服务名称快速定位目标服务
2. **版本管理**：支持 API 版本控制，便于向后兼容
3. **权限控制**：网关可以根据 `auth_level` 执行相应的认证逻辑
4. **统一规范**：所有服务遵循相同规范，降低学习成本

#### 路由组件说明

- **service**: 服务名称，用于服务发现和路由
- **version**: API 版本，支持 `v1`, `v2` 等
- **auth_level**: 认证级别，决定网关如何处理请求
- **path**: 业务接口路径，由业务服务自己定义

### Header 注入机制

#### 为什么外部服务不接收角色信息？

出于安全考虑，外部服务（HTTP）不会收到：
- `X-User-Role`: 用户角色
- `X-User-IsAdmin`: 管理员标识

**原因**：
1. 减少信息泄露风险
2. 权限验证已在网关层完成
3. 外部服务只需知道用户身份即可

**本地服务（Unix Socket）**会收到完整信息，因为：
- 本地服务更可信
- 可能需要角色信息进行业务判断

#### Header 数据格式

| Header | 类型 | 格式 | 示例 |
|--------|------|------|------|
| `X-User-ID` | 字符串 | UUID v4 | `550e8400-e29b-41d4-a716-446655440000` |
| `X-User-Username` | 字符串 | 任意 | `antu0_0` |
| `X-User-AppID` | 字符串 | 标识符 | `default` |
| `X-User-SessionID` | 字符串 | UUID v4 | `8c4c1968-302a-4442-977c-8b2f2fa57685` |
| `X-User-Permissions` | 字符串 | JSON 数组 | `["read", "write"]` |
| `X-User-Allowed-Services` | 字符串 | JSON 数组 | `["user-service"]` |

**重要**：`X-User-Permissions` 和 `X-User-Allowed-Services` 是 JSON 字符串，需要解析。

### 注册接口安全考虑

#### 安全风险分析

**问题**：注册接口 `/auth-server/v1/public/register` 是 public 级别接口，没有任何访问控制限制。

**风险**：
1. 如果应用只支持预设账号登录，不提供注册功能，攻击者仍可通过直接调用注册接口创建账号
2. 绕过应用层的注册限制，导致系统安全漏洞
3. 可能被用于批量注册垃圾账号

**为什么存在这个风险**：
- 注册接口设计为 public 级别，目的是方便用户注册
- 没有配置项可以禁用注册功能
- 网关层没有对注册接口的特殊限制

#### 解决方案对比

**方案 1：网关层限制（推荐）**

在网关层拦截注册接口请求，返回 403 Forbidden。

**优点**：
- 统一控制，无法绕过
- 不影响 auth-server 代码
- 可以灵活配置哪些应用允许注册

**缺点**：
- 需要修改网关代码
- 需要维护路由规则

**实现方式**：
在网关路由处理中添加注册接口拦截逻辑，检查请求路径，如果是注册接口且应用不允许注册，则返回 403。

**方案 2：应用层限制**

应用不提供注册界面，前端不调用注册接口。

**优点**：
- 无需修改后端代码
- 实现简单

**缺点**：
- **无法阻止直接调用接口**，存在安全风险
- 攻击者可以通过 Postman、curl 等工具直接调用注册接口
- 不适合对安全性要求高的场景

**方案 3：Nginx/反向代理层限制**

在 Nginx 配置中禁止访问注册接口路径。

**优点**：
- 无需修改应用代码
- 配置灵活

**缺点**：
- 需要配置反向代理
- 如果有多层代理，需要在每一层配置

#### 预设账号登录场景最佳实践

**场景**：应用只支持预设账号登录，管理员通过后台创建账号，用户只能登录不能注册。

**推荐方案**：网关层限制 + 应用层不暴露

1. **网关层**：拦截注册接口，返回 403
2. **应用层**：不提供注册界面，不调用注册接口
3. **用户提示**：登录失败时提示"账号不存在，请联系管理员"

**实施步骤**：
1. 在网关代码中添加注册接口拦截逻辑
2. 应用前端不实现注册功能
3. 登录失败时提供明确的错误提示
4. 监控注册接口的访问日志，发现异常访问及时告警

**注意事项**：
- 仅在前端隐藏注册功能**不够安全**，必须在网关层或反向代理层限制
- 如果多个应用使用同一个 NebulaAuth，需要区分哪些应用允许注册
- 建议在网关层添加白名单机制，只允许特定应用访问注册接口

### 多应用管理机制

#### AppID 设计原理

NebulaAuth 通过 AppID 机制支持多应用管理，但**用户注册是全局的**，所有应用共享同一用户池。

**AppID 的作用**：
1. **会话隔离**：不同应用的会话相互独立，可以分别管理
2. **应用标识**：Token 中包含 AppID，业务服务可以识别请求来源
3. **登出控制**：可以按 AppID 登出所有设备，不影响其他应用

**AppID 的限制**：
1. **用户注册是全局的**：注册接口不接收 AppID 参数，注册的用户对所有应用可见
2. **没有应用级别的权限控制**：系统本身不提供基于 AppID 的权限控制
3. **业务服务需要自己实现隔离**：如果需要在应用级别隔离数据或权限，需要在业务服务中实现

#### 多应用场景分析

**场景 1：共享用户池（默认模式）**

**特点**：
- 所有应用共享同一用户池
- 用户在一个应用注册后，可以在所有应用登录
- 不同应用使用不同的 AppID 标识

**适用场景**：
- 同一公司的多个产品（如：Web 应用、移动应用、管理后台）
- 多端应用（如：iOS、Android、Web）
- 需要统一用户体系的场景

**实现方式**：
- 每个应用使用不同的 AppID（如：`web-app`, `mobile-app`, `admin-app`）
- 登录时在请求 Header 中添加 `X-App-ID`
- 业务服务可以根据 AppID 实现应用特定的功能，但用户数据是共享的

**场景 2：应用隔离（需要业务层实现）**

**特点**：
- 不同应用需要独立的用户体系
- 用户注册和访问权限按应用隔离
- 需要业务服务自己实现隔离逻辑

**适用场景**：
- 不同公司的应用
- 需要数据隔离的场景
- 需要应用级别权限控制的场景

**实现方式**：
1. **用户注册隔离**：
   - 在网关层限制注册接口，只允许特定 AppID 访问
   - 或者在业务层实现注册逻辑，根据 AppID 创建不同的用户记录
   - 或者在用户表中添加 `app_id` 字段，注册时关联 AppID

2. **访问权限控制**：
   - 业务服务从 `X-User-AppID` Header 获取应用ID
   - 实现基于 AppID 的权限检查中间件
   - 不同 AppID 可以访问不同的接口或数据

3. **数据隔离**：
   - 在数据库查询时加入 AppID 条件
   - 确保不同应用的数据相互隔离
   - 可以使用数据库视图或行级安全策略

#### 多应用最佳实践

**1. AppID 命名规范**

- 使用小写字母和连字符：`web-app`, `mobile-app`
- 保持简洁和有意义：`admin-panel`, `customer-portal`
- 避免使用版本号：不要用 `app-v1`, `app-v2`
- 全局唯一：确保不同应用的 AppID 不冲突

**2. 登录时传递 AppID**

```javascript
// 客户端登录时添加 AppID
fetch(`${API_BASE_URL}/auth-server/v1/public/login`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-App-ID': 'web-app'  // 应用标识
  },
  body: JSON.stringify({
    email: 'user@example.com',
    code: '123456',
    code_type: 'email',
    purpose: 'login'
  })
});
```

**3. 业务服务获取 AppID**

```go
// 业务服务从 Header 获取 AppID
appID := c.GetHeader("X-User-AppID")

// 根据 AppID 实现业务逻辑
if appID == "admin-app" {
    // 管理员应用的特殊逻辑
} else if appID == "customer-app" {
    // 客户应用的特殊逻辑
}
```

**4. 实现应用级别的权限控制**

```go
// 应用权限检查中间件
func AppPermissionMiddleware(allowedApps []string) gin.HandlerFunc {
    return func(c *gin.Context) {
        appID := c.GetHeader("X-User-AppID")
        
        allowed := false
        for _, allowedApp := range allowedApps {
            if appID == allowedApp {
                allowed = true
                break
            }
        }
        
        if !allowed {
            c.JSON(403, gin.H{
                "error": "应用无权访问此接口",
                "app_id": appID,
            })
            c.Abort()
            return
        }
        
        c.Next()
    }
}
```

**5. 实现应用级别的数据隔离**

```go
// 数据库查询时加入 AppID 条件
func GetUserData(userID, appID string) (*UserData, error) {
    query := `
        SELECT * FROM user_data 
        WHERE user_id = $1 AND app_id = $2
    `
    // 执行查询
}
```

#### 多应用注意事项

1. **用户注册是全局的**：
   - 注册接口不接收 AppID 参数
   - 注册的用户对所有应用可见
   - 如果需要应用隔离，需要在业务层实现

2. **没有系统级别的权限控制**：
   - NebulaAuth 不提供基于 AppID 的权限控制
   - 业务服务需要自己实现权限检查

3. **会话隔离是自动的**：
   - 不同 AppID 的会话自动隔离
   - 可以分别管理不同应用的会话

4. **Token 中包含 AppID**：
   - 业务服务可以从 Token 或 Header 中获取 AppID
   - 可以根据 AppID 实现应用特定的逻辑

### 客户端调用机制

#### 为什么客户端必须通过网关调用？

在生产环境中，客户端**必须通过 NebulaAuth 网关**调用业务服务，不能直接调用业务服务域名。

**原因**：

1. **认证集中化**：网关负责统一验证 Token，业务服务器无需处理 Token 验证逻辑
2. **用户信息注入**：网关验证 Token 后，将用户信息注入到请求 Header 中（`X-User-ID`、`X-User-Username` 等）
3. **业务服务器依赖 Header**：生产环境（`gateway` 模式）下，业务服务器从 Header 读取用户信息，而不是验证 Token
4. **安全性**：业务服务器不暴露在公网，只能通过网关访问

#### 如果直接调用业务服务域名会发生什么？

**场景**：客户端直接调用 `http://your-cloud-ip:8080/your-service/v1/user/profile`

**结果**：
1. 请求到达业务服务器，但**没有经过网关**
2. 业务服务器**无法获取用户信息**（没有 `X-User-ID` 等 Header）
3. 业务服务器返回 **401 未认证** 错误
4. **认证失败**，无法访问业务接口

**原因分析**：
- 生产环境（`gateway` 模式）下，业务服务器**依赖网关注入的用户信息 Header**
- 网关在验证 Token 后，会将用户信息注入到请求 Header 中
- 如果绕过网关直接调用，业务服务器无法获取用户信息，导致认证失败
- 业务服务器的认证中间件在 `gateway` 模式下只检查 Header，不验证 Token

#### 开发环境 vs 生产环境的调用差异

**开发环境（self_validate 模式）**：

```
客户端 → 本地业务服务器 (localhost:8080)
         ↓ 业务服务器提取 Token
         ↓ 业务服务器调用 NebulaAuth API 验证 Token
         ↓ 验证成功后处理请求
```

- 客户端直接调用本地业务服务器
- 业务服务器自己验证 Token（调用 NebulaAuth API）
- 无需通过网关

**生产环境（gateway 模式）**：

```
客户端 → NebulaAuth 网关 (your-aliyun-ip:8080)
         ↓ 网关验证 Token
         ↓ 网关注入用户信息到 Header
         ↓ 网关转发请求
业务服务器 (your-cloud-ip:8080) ← 从 Header 读取用户信息
```

- 客户端通过 NebulaAuth 网关调用
- 网关验证 Token 并注入用户信息
- 业务服务器从 Header 读取用户信息，不验证 Token

#### 域名配置说明

- **开发环境**：`API_BASE_URL = http://localhost:8080`（本地业务服务器）
- **生产环境**：`API_BASE_URL = http://your-aliyun-ip:8080`（NebulaAuth 网关地址）

**重要**：`your-aliyun-ip:8080` 是 **NebulaAuth 网关地址**，不是业务服务地址。所有业务接口请求都发送到网关，网关负责路由到对应的业务服务。

## 💡 最佳实践

### 1. 环境变量管理

#### 环境配置文件结构

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

#### 配置文件示例

**`env.example`**（完整配置模板）:
```bash
# ============================================
# NebulaAuth 业务服务环境配置模板
# ============================================
# 复制此文件为 .env 并根据实际情况修改配置值

# 环境标识
NODE_ENV=development                    # development | production

# 认证模式
AUTH_MODE=self_validate                 # self_validate | gateway
                                        # self_validate: 开发环境，自己验证 Token
                                        # gateway: 生产环境，从 Header 读取用户信息

# NebulaAuth 服务地址
NEBULA_AUTH_URL=http://your-aliyun-ip:8080

# API 基础地址
API_BASE_URL=http://localhost:8080     # 开发环境: localhost:8080
                                        # 生产环境: 网关地址 (your-aliyun-ip:8080)

# 服务配置
SERVICE_NAME=your-service               # 服务名称（用于路由）
SERVICE_PORT=8080                      # 服务端口
SERVICE_HOST=localhost                  # 服务主机（生产环境填写实际 IP）
```

**`.env`**（本地开发配置，从 env.example 复制）:
```bash
# 本地开发环境配置
# 从 env.example 复制后，根据实际情况修改以下配置

# 环境标识
NODE_ENV=development

# 认证模式（开发环境使用 self_validate）
AUTH_MODE=self_validate

# NebulaAuth 服务地址（根据实际情况修改）
NEBULA_AUTH_URL=http://your-aliyun-ip:8080

# API 基础地址（开发环境使用本地地址）
API_BASE_URL=http://localhost:8080

# 服务配置
SERVICE_NAME=your-service
SERVICE_PORT=8080
SERVICE_HOST=localhost
```

**注意**：
- `.env` 文件仅用于**本地开发**，不要提交到 Git
- **生产环境必须使用系统环境变量**，不要使用 `.env` 文件

#### Git 配置

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

#### 使用配置管理工具

生产环境建议使用：
- Kubernetes ConfigMap/Secret
- Docker Compose env_file
- 配置中心（如 Consul、etcd）

### 2. 错误处理

#### 统一错误响应格式

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

#### 错误码规范

- `UNAUTHORIZED`: 未认证（401）
- `TOKEN_MISSING`: 缺少 Token（401）
- `TOKEN_INVALID`: Token 无效（401）
- `VALIDATION_ERROR`: 验证过程错误（500）
- `FORBIDDEN`: 权限不足（403）

### 3. 日志记录

#### 记录认证模式

```go
log.Printf("[AUTH] 当前认证模式: %s", cfg.AuthMode)
```

#### 记录认证结果

```go
log.Printf("[AUTH] 用户认证成功: user_id=%s, mode=%s", userID, cfg.AuthMode)
log.Printf("[AUTH] 用户认证失败: error=%s, mode=%s", err.Error(), cfg.AuthMode)
```

### 4. 性能优化

#### Token 验证缓存（开发模式）

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

#### 减少 Header 解析开销

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

### 5. 安全性考虑

#### 生产环境必须使用网关模式

```go
if cfg.NodeEnv == "production" && cfg.AuthMode != "gateway" {
    log.Fatal("生产环境必须使用 gateway 模式")
}
```

#### 验证 Header 来源

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

## 🔍 故障排除

### 问题 1: 本地开发时 Token 验证失败

**症状**：
```
验证 Token 失败: connection refused
```

**可能原因**：
1. `NEBULA_AUTH_URL` 配置错误
2. NebulaAuth 服务不可访问
3. 网络连接问题

**解决方案**：
```bash
# 1. 检查配置
echo $NEBULA_AUTH_URL

# 2. 测试连接
curl http://your-aliyun-ip:8080/health

# 3. 检查网络
ping your-aliyun-ip
```

### 问题 2: 生产环境无法获取用户信息

**症状**：
```
未认证: X-User-ID header 为空
```

**可能原因**：
1. 服务未正确注册到 NebulaAuth
2. 路由配置错误
3. 网关未正确转发请求

**解决方案**：
```bash
# 1. 检查服务注册
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://your-aliyun-ip:8080/service-registry/v1/admin/services/your-service

# 2. 检查路由
curl -v http://your-aliyun-ip:8080/your-service/v1/user/profile

# 3. 查看网关日志
docker-compose logs api-gateway
```

### 问题 3: 环境切换后功能异常

**症状**：
```
切换环境后，认证失败
```

**可能原因**：
1. 环境变量未正确加载
2. 服务未重启
3. 配置缓存问题

**解决方案**：
```bash
# 1. 确认环境变量
env | grep AUTH_MODE

# 2. 重启服务
systemctl restart your-service

# 3. 检查健康检查接口
curl http://localhost:8080/your-service/health
# 应该返回当前的 auth_mode
```

### 问题 4: 服务注册失败

**症状**：
```json
{"error": "服务名称 'your-service' 已存在"}
```

**解决方案**：
```bash
# 1. 检查现有服务
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://your-aliyun-ip:8080/service-registry/v1/admin/services/your-service

# 2. 如果服务存在但配置需要更新，使用 PUT 接口
curl -X PUT http://your-aliyun-ip:8080/service-registry/v1/admin/services/your-service \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"host": "new-ip", "port": 8080, "url": "http://new-ip:8080"}'

# 3. 如果服务不再需要，先删除再注册
curl -X DELETE http://your-aliyun-ip:8080/service-registry/v1/admin/services/your-service \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## 📚 进阶话题

### 1. 多环境管理

#### 使用环境配置文件

**推荐配置加载顺序**：

```go
// config/loader.go
func LoadConfig() *Config {
    // 1. 加载本地 .env 文件（如果存在，仅用于本地开发）
    // 注意：生产环境不应该使用 .env 文件，应直接使用系统环境变量
    if os.Getenv("NODE_ENV") != "production" {
        godotenv.Load(".env")  // 可选，如果文件不存在会被忽略
    }
    
    // 2. 系统环境变量（优先级最高）
    // 系统环境变量会覆盖 .env 文件中的值
    // 生产环境必须使用系统环境变量
    
    return &Config{
        // ...
    }
}
```

**配置加载优先级**（从低到高）：
1. `env.example`（仅作为参考，不会被加载）
2. `.env`（本地个人配置，如果存在，仅用于本地开发，生产环境不加载）
3. 系统环境变量（优先级最高，生产环境必须使用）

**重要说明**：
- **本地开发**：可以使用 `.env` 文件，从 `env.example` 复制并修改
- **生产环境**：必须使用系统环境变量（systemd、Docker Compose、Kubernetes 等），不要使用 `.env` 文件

**使用示例**：

```go
// main.go
func main() {
    // 加载配置（优先使用系统环境变量，本地开发时使用 .env）
    cfg := LoadConfig()
    
    // 使用配置
    // ...
}
```

### 2. 监控和指标

#### 添加认证指标

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

### 3. 单元测试

#### 测试认证中间件

```go
func TestAuthMiddleware(t *testing.T) {
    // 测试网关模式
    cfg := &config.Config{AuthMode: "gateway"}
    middleware := AuthMiddleware(cfg)
    
    // 模拟请求
    w := httptest.NewRecorder()
    c, _ := gin.CreateTestContext(w)
    c.Request = httptest.NewRequest("GET", "/", nil)
    c.Request.Header.Set("X-User-ID", "test-user-id")
    
    middleware(c)
    
    assert.Equal(t, "test-user-id", c.GetString("user_id"))
}
```

### 4. 集成测试

#### 端到端测试

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

### 5. 健康检查设计

#### 为什么需要健康检查？

1. **服务发现**：网关通过健康检查确认服务可用
2. **负载均衡**：可以基于健康状态进行负载均衡
3. **监控告警**：监控系统通过健康检查判断服务状态

#### 增强健康检查（包含依赖检查）

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

### 6. 服务注册最佳实践

#### 服务名命名规范

- 使用小写字母和连字符：`your-service`
- 避免使用版本号：不要用 `your-service-v1`
- 保持简洁：`user-service` 而不是 `user-management-service`
- 避免冲突：注册前检查服务名是否已存在

#### 服务注册时机

1. **开发环境**：可以手动注册，用于测试
2. **生产环境**：建议通过 CI/CD 自动注册
3. **更新服务**：使用 PUT 接口更新，而不是删除后重新注册

#### 使用注册脚本快速注册

NebulaAuth 提供了 `guides/scripts/register-service.sh` 脚本，可以快速注册服务，自动处理登录、获取Token和注册流程：

**基本用法**：
```bash
# 使用邮箱登录注册服务
./guides/scripts/register-service.sh \
  -n your-service \
  -h your-cloud-ip \
  -p 8080 \
  -e admin@example.com

# 使用手机号登录
./guides/scripts/register-service.sh \
  -n your-service \
  -h your-cloud-ip \
  -p 8080 \
  -P 13800138000 \
  -t sms

# 使用已有Token（适合CI/CD场景）
./guides/scripts/register-service.sh \
  -n your-service \
  -h your-cloud-ip \
  -p 8080 \
  --token "$ADMIN_TOKEN" \
  --user-id "$ADMIN_USER_ID"
```

**在CI/CD中使用**：
```bash
# 在部署脚本中集成服务注册
# 1. 先登录获取Token
ADMIN_TOKEN=$(./guides/scripts/register-service.sh \
  -n your-service \
  -h $DEPLOY_HOST \
  -p $DEPLOY_PORT \
  -e $ADMIN_EMAIL \
  --token-only)  # 假设脚本支持只返回Token

# 2. 注册服务
./guides/scripts/register-service.sh \
  -n your-service \
  -h $DEPLOY_HOST \
  -p $DEPLOY_PORT \
  --token "$ADMIN_TOKEN" \
  --user-id "$ADMIN_USER_ID"
```

**脚本优势**：
- 自动处理验证码发送和登录流程
- 自动获取用户ID
- 支持环境变量配置，适合CI/CD集成
- 友好的错误提示和验证

**更多信息**：参考 [脚本使用说明](./scripts/README.md)

#### 服务状态管理

服务注册后，网关会定期检查服务健康状态：
- `active`: 服务正常
- `inactive`: 服务不可用
- `deleted`: 服务已删除（软删除）

可以通过更新接口修改服务状态。

## 🎯 开发工作流

### 典型开发流程

1. **本地开发**
   ```bash
   # 1. 克隆项目后，从模板创建配置文件
   cp env.example .env
   # 编辑 .env，修改实际配置值
   
   # 2. 设置环境变量（如果配置加载库不支持自动加载）
   export $(cat .env | xargs)
   
   # 4. 启动服务
   go run main.go
   
   # 5. 测试
   curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8080/your-service/v1/user/profile
   ```

2. **代码提交**
   ```bash
   git add .
   git commit -m "feat: 添加用户接口"
   git push
   ```

3. **CI/CD 部署**
   ```bash
   # CI 自动构建和测试
   # CD 自动部署到生产环境
   ```

4. **生产验证**
   ```bash
   # 验证部署
   curl http://your-aliyun-ip:8080/your-service/health
   ```

## 🤔 常见问题

### Q: 为什么本地开发不直接用网关模式？

A: 网关模式需要内网穿透或部署到云端，增加了开发复杂度。`self_validate` 模式让本地开发更简单。

### Q: 两种模式的性能差异有多大？

A: 
- 网关模式：几乎无延迟（直接读取 Header，<1ms）
- 自己验证模式：每次请求需要调用 API（通常 10-50ms）

对于开发环境，这个延迟是可以接受的。

### Q: 可以在生产环境使用 `self_validate` 模式吗？

A: 技术上可以，但不推荐。网关模式性能更好，安全性更高，且便于统一管理。

### Q: 如何调试认证问题？

A: 
1. 查看服务日志
2. 检查环境变量配置
3. 使用健康检查接口查看当前模式
4. 测试 Token 验证 API
5. 检查网关日志（生产环境）

### Q: 如何实现 Token 刷新？

A: Token 刷新由客户端处理。业务服务器只需验证 Token 是否有效。如果 Token 过期，返回 401，客户端自动刷新。

### Q: 如何判断用户是否是管理员？

A: 对于外部服务，如果请求能到达 `admin` 级别的端点，说明用户已经是管理员（权限已在网关层验证）。

### Q: 如何处理 Token 过期？

A: 网关会返回 401 错误，客户端需要重新登录或刷新 Token。

### Q: 如何平滑切换环境？

A: 只需修改环境变量 `AUTH_MODE`，无需修改业务代码。

### Q: 两种模式的业务代码需要修改吗？

A: 不需要。业务代码使用统一的接口（从上下文获取用户信息），与认证方式无关。

## 📖 相关资源

- [AI 快速参考](./ai-quick-reference.md) - 快速查阅和代码模板
- [API 文档](../API_DOCUMENTATION.md) - 完整的 API 接口说明
- [添加首个管理员](./adding-first-admin.md) - 创建管理员账户

---

**最后更新**: 2024年
