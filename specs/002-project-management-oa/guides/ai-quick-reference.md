# AI 快速参考：NebulaAuth 应用服务开发完整指南

> **目标读者**: AI 助手、自动化工具、快速查阅
> 
> **用途**: 提供结构化、可执行的步骤和代码模板，便于 AI 快速理解和生成代码

## 📋 系统概述

NebulaAuth 作为统一的认证网关，业务服务器作为外部服务接入。

### 认证模式对比

| 模式 | 环境 | 工作原理 | 使用场景 |
|------|------|---------|---------|
| `self_validate` | 开发 | 业务服务器调用 NebulaAuth API 验证 Token | 本地开发测试 |
| `gateway` | 生产 | 从网关注入的 Header 读取用户信息 | 生产环境部署 |

## 🎯 开发规范

### 路由规范（必须遵循）

所有 API 必须遵循统一路由格式：
```
/{service}/{version}/{auth_level}/{path}
```

| 组件 | 说明 | 示例 | 限制 |
|------|------|------|------|
| `service` | 服务名称 | `your-service` | 不能为版本号或内部标识 |
| `version` | API 版本 | `v1`, `v2` | 仅支持 v1, v2 |
| `auth_level` | 认证级别 | `public`, `user`, `apikey`, `admin` | 仅支持这四种 |
| `path` | 接口路径 | `profile`, `data`, `stats` | 自定义 |

#### 路由示例

```
GET  /your-service/v1/public/info          # 公开接口
GET  /your-service/v1/user/profile         # 用户接口（JWT）
GET  /your-service/v1/apikey/data          # API密钥接口
GET  /your-service/v1/admin/stats          # 管理员接口
GET  /your-service/health                  # 健康检查（例外）
```

### 认证级别

**选择规则**：业务服务根据实际需求选择认证级别，不是所有服务都需要支持所有四种级别。

| 认证级别 | 说明 | 认证要求 | 适用场景 |
|---------|------|---------|---------|
| `public` | 公开接口 | 无需认证 | 健康检查、登录注册、验证码发送 |
| `user` | 用户接口 | JWT Token 认证 | 用户信息管理、个人设置 |
| `apikey` | API密钥接口 | API密钥认证 | 服务间调用、第三方集成 |
| `admin` | 管理接口 | 管理员权限 | 系统管理、用户管理 |

#### 认证级别选择表

| 服务类型 | 需要的认证级别 | 路由示例 |
|---------|--------------|---------|
| 简单用户服务 | `public` + `user` | `/{service}/v1/public/*`, `/{service}/v1/user/*` |
| 需要第三方集成 | `public` + `user` + `apikey` | `/{service}/v1/public/*`, `/{service}/v1/user/*`, `/{service}/v1/apikey/*` |
| 需要管理功能 | `public` + `user` + `admin` | `/{service}/v1/public/*`, `/{service}/v1/user/*`, `/{service}/v1/admin/*` |
| 完整平台服务 | 所有四种级别 | `/{service}/v1/public/*`, `/{service}/v1/user/*`, `/{service}/v1/apikey/*`, `/{service}/v1/admin/*` |

**注意**：所有服务必须实现 `public` 级别的健康检查接口 `/{service}/health`

### Header 规范

#### 网关注入的 Header（生产环境 gateway 模式）

**user/admin 级别（外部服务会收到）**：
```
X-User-ID: <uuid>              # 用户ID（UUID格式）
X-User-Username: <string>      # 用户名
X-User-AppID: <string>         # 应用ID
X-User-SessionID: <uuid>       # 会话ID（UUID格式）
```

**注意**: 外部服务不会收到 `X-User-Role` 和 `X-User-IsAdmin` header。

**apikey 级别**：
```
X-User-ID: <uuid>
X-User-Username: <string>
X-User-Permissions: <json_array>        # 权限列表（JSON字符串）
X-User-Allowed-Services: <json_array>   # 允许访问的服务列表
X-Auth-Type: apikey
```

**注意**: `X-User-Permissions` 和 `X-User-Allowed-Services` 是 JSON 字符串，需要解析。

#### 客户端请求 Header

```
Authorization: Bearer <jwt_token>        # JWT token认证
Authorization: Bearer ak_<api_key>       # API密钥认证
```

### 客户端调用方式

#### 客户端配置规则

| 环境 | API_BASE_URL | 用途 |
|------|-------------|------|
| **开发环境** | `http://localhost:8080` | 直接调用本地业务服务器 |
| **生产环境** | `http://your-aliyun-ip:8080` | 通过 NebulaAuth 网关调用 |

#### 客户端代码模板

```javascript
// config/api.js
const config = {
  development: {
    apiBaseURL: 'http://localhost:8080',
    nebulaAuthURL: 'http://your-aliyun-ip:8080',
  },
  production: {
    apiBaseURL: 'http://your-aliyun-ip:8080',  // 网关地址
    nebulaAuthURL: 'http://your-aliyun-ip:8080',  // 网关地址
  }
};

// 登录获取 Token（详细接口参数见 API 文档）
async function login(email, code) {
  const response = await fetch(`${config[env].nebulaAuthURL}/auth-server/v1/public/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, code_type: 'email', purpose: 'login' })
  });
  const data = await response.json();
  return data.data.tokens.access_token;
}
// 详细接口文档：api/auth-server.md

// 调用业务接口
async function getUserProfile(token) {
  const response = await fetch(`${config[env].apiBaseURL}/your-service/v1/user/profile`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
}
```

#### AI 开发检查清单

- [ ] 开发环境：客户端 `API_BASE_URL = http://localhost:8080`
- [ ] 生产环境：客户端 `API_BASE_URL = http://your-aliyun-ip:8080`（网关地址）
- [ ] 所有业务接口请求发送到 `API_BASE_URL`，添加 `Authorization: Bearer <token>` Header
- [ ] 不要直接调用业务服务器域名

### 多应用管理

**AppID 机制**：通过 `X-App-ID` Header 区分不同应用，业务服务从 `X-User-AppID` Header 获取。

**使用方式**：
- 客户端登录时添加 `X-App-ID: <your-app-id>` Header
- 如果不提供，默认使用 `"default"`
- 业务服务从 `X-User-AppID` Header 读取应用ID

### 客户端认证流程

**认证流程**：
1. 发送验证码：`POST /auth-server/v1/public/send_verification`
2. 用户登录：`POST /auth-server/v1/public/login` → 获取 `access_token` 和 `refresh_token`
3. 刷新 Token：`POST /auth-server/v1/public/refresh_token`（Token 过期时使用）

**可选功能**：
- 用户注册：`POST /auth-server/v1/public/register`（如需禁用，应在网关层拦截）

**详细接口文档**：参见 [auth-server API 文档](api/auth-server.md)

**注意**：如需禁用注册功能，应在网关层拦截注册接口。

### 错误处理规范

#### 统一错误响应格式

```json
{
  "error": "错误描述",
  "code": "ERROR_CODE"
}
```

#### 常见错误码

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| `UNAUTHORIZED` | 401 | 未认证 |
| `TOKEN_MISSING` | 401 | 缺少 Token |
| `TOKEN_INVALID` | 401 | Token 无效 |
| `VALIDATION_ERROR` | 500 | 验证过程错误 |
| `FORBIDDEN` | 403 | 权限不足 |

## 💻 对接 Auth 完整流程

### 本地开发模式（self_validate）

#### 1. 项目结构模板

```
your-service/
├── env.example              # 完整配置模板（提交到 Git）
├── .env                     # 本地个人配置（不提交，可选）
├── config/
│   └── env.go              # 环境配置加载逻辑
├── middleware/
│   └── auth.go             # 统一认证中间件
├── handlers/
│   └── user.go             # 业务处理器
└── main.go                 # 主程序
```

#### 2. 环境配置文件说明

**文件用途**：

| 文件 | 用途 | 是否提交 | 说明 |
|------|------|---------|------|
| `env.example` | 完整配置模板 | ✅ 提交 | 包含所有配置项和说明，供参考 |
| `.env` | 本地个人配置 | ❌ 不提交 | 用于本地开发配置，从 env.example 复制并修改 |

**配置加载优先级**（从高到低）：
1. 系统环境变量（优先级最高）
2. `.env`（如果存在，用于本地开发）
3. `env.example`（仅作为参考，不会被加载）

#### 3. 环境配置文件内容

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

**`.gitignore`** 配置:
```gitignore
# 环境配置文件
.env                    # 本地个人配置，不提交
.env.local              # 本地配置，不提交

# 注意：以下文件应该提交到 Git
# env.example
```

#### 3. 统一认证中间件实现

**Go 实现**:

```go
// config/env.go
package config

import "os"

type Config struct {
    NodeEnv       string
    AuthMode      string
    NebulaAuthURL string
    APIBaseURL    string
    ServiceName   string
    ServicePort   string
    ServiceHost   string
}

func LoadConfig() *Config {
    return &Config{
        NodeEnv:       getEnv("NODE_ENV", "development"),
        AuthMode:      getEnv("AUTH_MODE", "gateway"),
        NebulaAuthURL: getEnv("NEBULA_AUTH_URL", "http://localhost:8080"),
        APIBaseURL:    getEnv("API_BASE_URL", "http://localhost:8080"),
        ServiceName:   getEnv("SERVICE_NAME", "your-service"),
        ServicePort:   getEnv("SERVICE_PORT", "8080"),
        ServiceHost:   getEnv("SERVICE_HOST", "localhost"),
    }
}

func getEnv(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}
```

```go
// middleware/auth.go
package middleware

import (
    "bytes"
    "encoding/json"
    "io"
    "net/http"
    "strings"
    "github.com/gin-gonic/gin"
    "your-project/config"
)

type UserInfo struct {
    UserID    string
    Username  string
    IsAdmin   bool
    AppID     string
    SessionID string
}

func AuthMiddleware(cfg *config.Config) gin.HandlerFunc {
    if cfg.AuthMode == "self_validate" {
        return selfValidateAuthMiddleware(cfg)
    }
    return gatewayAuthMiddleware()
}

// gatewayAuthMiddleware 网关模式：从 Header 读取用户信息
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
        
        userInfo := UserInfo{
            UserID:    userID,
            Username:  c.GetHeader("X-User-Username"),
            IsAdmin:   c.GetHeader("X-User-IsAdmin") == "true",
            AppID:     c.GetHeader("X-User-AppID"),
            SessionID: c.GetHeader("X-User-SessionID"),
        }
        
        c.Set("user_info", userInfo)
        c.Set("user_id", userInfo.UserID)
        c.Set("username", userInfo.Username)
        c.Set("is_admin", userInfo.IsAdmin)
        c.Next()
    }
}

// selfValidateAuthMiddleware 自己验证模式：调用 NebulaAuth API
func selfValidateAuthMiddleware(cfg *config.Config) gin.HandlerFunc {
    return func(c *gin.Context) {
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
        
        result, err := validateTokenWithNebulaAuth(cfg.NebulaAuthURL, token)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{
                "error": "验证 Token 失败",
                "code":  "VALIDATION_ERROR",
            })
            c.Abort()
            return
        }
        
        if !result.Success || !result.Data.Valid {
            c.JSON(http.StatusUnauthorized, gin.H{
                "error": result.Data.Error,
                "code":  "TOKEN_INVALID",
            })
            c.Abort()
            return
        }
        
        userInfo := UserInfo{
            UserID:    result.Data.UserID,
            Username:  result.Data.Username,
            IsAdmin:   result.Data.IsAdmin,
            AppID:     result.Data.AppID,
            SessionID: result.Data.SessionID,
        }
        
        c.Set("user_info", userInfo)
        c.Set("user_id", userInfo.UserID)
        c.Set("username", userInfo.Username)
        c.Set("is_admin", userInfo.IsAdmin)
        c.Next()
    }
}

// validateTokenWithNebulaAuth 验证 Token（详细接口参数见 api/auth-server.md）
func validateTokenWithNebulaAuth(baseURL, token string) (*ValidateTokenResponse, error) {
    reqBody := map[string]string{"token": token}
    jsonData, _ := json.Marshal(reqBody)
    
    resp, err := http.Post(
        baseURL+"/auth-server/v1/public/auth/validate",
        "application/json",
        bytes.NewBuffer(jsonData),
    )
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    
    body, _ := io.ReadAll(resp.Body)
    var result ValidateTokenResponse
    json.Unmarshal(body, &result)
    
    return &result, nil
}

type ValidateTokenResponse struct {
    Success bool `json:"success"`
    Data    struct {
        Valid     bool   `json:"valid"`
        UserID    string `json:"user_id"`
        Username  string `json:"username"`
        IsAdmin   bool   `json:"is_admin"`
        AppID     string `json:"app_id"`
        SessionID string `json:"session_id"`
        Error     string `json:"error,omitempty"`
    } `json:"data"`
}
```

**Node.js 实现**:

```javascript
// middleware/auth.js
const axios = require('axios');
const config = require('../config/env');

function authMiddleware(req, res, next) {
  if (config.authMode === 'self_validate') {
    return selfValidateAuth(req, res, next);
  }
  return gatewayAuth(req, res, next);
}

function gatewayAuth(req, res, next) {
  const userID = req.headers['x-user-id'];
  if (!userID) {
    return res.status(401).json({ error: '未认证', code: 'UNAUTHORIZED' });
  }
  
  req.user = {
    id: userID,
    username: req.headers['x-user-username'],
    isAdmin: req.headers['x-user-isadmin'] === 'true',
    appID: req.headers['x-user-appid'],
    sessionID: req.headers['x-user-sessionid'],
  };
  
  next();
}

async function selfValidateAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '缺少 Token', code: 'TOKEN_MISSING' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    // 详细接口参数见 api/auth-server.md
    const response = await axios.post(
      `${config.nebulaAuthURL}/auth-server/v1/public/auth/validate`,
      { token }
    );
    
    if (!response.data.success || !response.data.data.valid) {
      return res.status(401).json({ 
        error: response.data.data.error || 'Token 无效',
        code: 'TOKEN_INVALID'
      });
    }
    
    req.user = {
      id: response.data.data.user_id,
      username: response.data.data.username,
      isAdmin: response.data.data.is_admin,
      appID: response.data.data.app_id,
      sessionID: response.data.data.session_id,
    };
    
    next();
  } catch (error) {
    return res.status(500).json({ error: '验证 Token 失败', code: 'VALIDATION_ERROR' });
  }
}

module.exports = authMiddleware;
```

#### 4. 本地开发测试流程

```bash
# 1. 加载环境变量
export $(cat .env | xargs)

# 2. 启动本地服务
go run main.go
# 或
npm start

# 3. 获取 Token（详细接口参数见 API 文档）
TOKEN=$(curl -s -X POST http://your-aliyun-ip:8080/auth-server/v1/public/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "code": "123456", "code_type": "email", "purpose": "login"}' \
  | jq -r '.data.tokens.access_token')
# 详细接口文档：api/auth-server.md

# 4. 测试本地接口（直接访问，不通过网关）
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/your-service/v1/user/profile
```

### 生产部署模式（gateway）

#### 1. 实现健康检查端点

**必须实现**: `/{service_name}/health`

```go
// main.go
r.GET("/your-service/health", func(c *gin.Context) {
    c.JSON(200, gin.H{
        "status":    "ok",
        "service":   "your-service",
        "auth_mode": cfg.AuthMode,
        "timestamp": time.Now().Unix(),
    })
})
```

#### 2. 注册服务到 NebulaAuth

**重要说明：服务注册是手动操作，不是自动的**

**注册时机**：
- **首次部署**：服务部署完成后，在启动前或启动后手动注册一次
- **服务地址变更**：当服务 IP、端口或 URL 变更时，需要更新注册信息
- **不需要每次启动都注册**：注册信息会持久化存储，服务重启不需要重新注册

**注册方式**：通过 API 手动调用（可以使用脚本自动化，但不是服务启动时自动执行）

##### 方式一：使用注册脚本（推荐，最简单）

使用 `scripts/register-service.sh` 脚本可以快速注册服务，自动处理登录、获取Token和注册流程：

```bash
# 基本用法（使用邮箱登录）
./scripts/register-service.sh \
  -n your-service \
  -h your-cloud-ip \
  -p 8080 \
  -e admin@example.com

# 使用手机号登录
./scripts/register-service.sh \
  -n your-service \
  -h your-cloud-ip \
  -p 8080 \
  -P 13800138000 \
  -t sms

# 使用已有Token（跳过登录）
./scripts/register-service.sh \
  -n your-service \
  -h your-cloud-ip \
  -p 8080 \
  --token "eyJhbGc..." \
  --user-id "uuid-here"

# 使用环境变量配置
export SERVICE_NAME=your-service
export ADMIN_EMAIL=admin@example.com
export SERVICE_HOST=your-cloud-ip
export SERVICE_PORT=8080
export API_GATEWAY_URL=http://your-aliyun-ip:8080
./scripts/register-service.sh
```

**脚本参数说明**：
- `-n, --service-name`: 业务服务名称（必填）
- `-h, --service-host`: 业务服务主机地址
- `-p, --service-port`: 业务服务端口
- `-e, --admin-email`: 管理员邮箱（用于登录）
- `-P, --admin-phone`: 管理员手机号（用于登录）
- `-c, --code`: 验证码（不提供会提示输入）
- `-g, --gateway-url`: API网关地址（默认: http://localhost:8080）
- `--token`: 直接使用管理员Token（跳过登录）
- `--user-id`: 直接使用管理员用户ID

**完整帮助**: 运行 `./scripts/register-service.sh --help` 查看所有选项

##### 方式二：手动调用 API

如果不想使用脚本，也可以手动调用 API：

```bash
# 1. 发送验证码
curl -X POST http://your-aliyun-ip:8080/auth-server/v1/public/send_verification \
  -H "Content-Type: application/json" \
  -d '{"code_type": "email", "target": "admin@example.com", "purpose": "login"}'

# 2. 获取管理员 Token（详细接口参数见 API 文档）
ADMIN_TOKEN=$(curl -s -X POST http://your-aliyun-ip:8080/auth-server/v1/public/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "code": "123456", "code_type": "email", "purpose": "login"}' \
  | jq -r '.data.tokens.access_token')
# 详细接口文档：api/auth-server.md

# 3. 注册服务（首次部署时执行）
curl -X POST http://your-aliyun-ip:8080/service-registry/v1/admin/services \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "server_name": "your-service",
    "host": "your-cloud-ip",
    "port": 8080,
    "url": "http://your-cloud-ip:8080",
    "user_id": "admin-user-uuid"
  }'
```

**服务名重复处理**（服务地址变更时使用）:
```bash
# 如果服务名已存在，使用更新接口更新地址
curl -X PUT http://your-aliyun-ip:8080/service-registry/v1/admin/services/your-service \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "host": "new-ip",
    "port": 8080,
    "url": "http://new-ip:8080"
  }'
```

**自动化建议**（可选）：
- 可以在部署脚本中集成服务注册步骤（使用 `register-service.sh` 脚本）
- 可以在 CI/CD 流程中添加服务注册步骤
- 但不建议在业务服务器启动代码中自动注册（避免循环依赖和启动失败风险）

#### 3. 生产环境部署步骤

**重要**：生产环境**必须使用系统环境变量**，不要使用 `.env` 文件。

```bash
# 1. 部署代码到服务器
scp -r your-service user@server:/opt/

# 2. 设置系统环境变量（推荐方式）
# 方式一：使用 systemd service 文件（推荐）
# 编辑 /etc/systemd/system/your-service.service
# [Service]
# Environment="NODE_ENV=production"
# Environment="AUTH_MODE=gateway"
# Environment="NEBULA_AUTH_URL=http://your-aliyun-ip:8080"
# Environment="API_BASE_URL=http://your-aliyun-ip:8080"
# Environment="SERVICE_NAME=your-service"
# Environment="SERVICE_PORT=8080"
# Environment="SERVICE_HOST=your-cloud-ip"

# 方式二：使用 Docker Compose（推荐）
# 在 docker-compose.yml 中使用 environment 或 env_file
# environment:
#   - NODE_ENV=production
#   - AUTH_MODE=gateway
#   # ... 其他配置

# 方式三：临时设置（仅用于测试，不推荐生产使用）
# export NODE_ENV=production
# export AUTH_MODE=gateway
# export NEBULA_AUTH_URL=http://your-aliyun-ip:8080
# export API_BASE_URL=http://your-aliyun-ip:8080
# export SERVICE_NAME=your-service
# export SERVICE_PORT=8080
# export SERVICE_HOST=your-cloud-ip

# 3. 启动服务
systemctl daemon-reload
systemctl start your-service
# 或使用 Docker
docker-compose up -d

# 4. 验证部署
curl http://your-aliyun-ip:8080/your-service/health
```

#### 4. 测试生产环境接口

```bash
# 1. 测试公开接口
curl http://your-aliyun-ip:8080/your-service/v1/public/info

# 2. 测试用户接口（需要 Token）
curl -H "Authorization: Bearer $TOKEN" \
  http://your-aliyun-ip:8080/your-service/v1/user/profile

# 3. 测试管理员接口（需要管理员 Token）
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://your-aliyun-ip:8080/your-service/v1/admin/stats
```

## 🛠️ 业务开发指南

### 认证级别选择

根据服务类型选择认证级别（参考上方的认证级别选择表）。示例代码展示了所有级别，实际开发时只实现需要的级别。

### 完整服务示例（Go）

```go
// main.go
package main

import (
    "encoding/json"
    "github.com/gin-gonic/gin"
    "net/http"
    "time"
    "your-project/config"
    "your-project/middleware"
)

func main() {
    cfg := config.LoadConfig()
    r := gin.Default()
    
    // 健康检查（必须实现）
    r.GET("/"+cfg.ServiceName+"/health", func(c *gin.Context) {
        c.JSON(200, gin.H{
            "status":    "ok",
            "service":   cfg.ServiceName,
            "auth_mode": cfg.AuthMode,
            "timestamp": time.Now().Unix(),
        })
    })
    
    // 公开接口
    r.GET("/"+cfg.ServiceName+"/v1/public/info", func(c *gin.Context) {
        c.JSON(200, gin.H{"message": "公开接口"})
    })
    
    // 用户接口（从 Header 读取用户信息）
    r.GET("/"+cfg.ServiceName+"/v1/user/profile", func(c *gin.Context) {
        userID := c.GetString("user_id")
        username := c.GetString("username")
        isAdmin := c.GetBool("is_admin")
        
        if userID == "" {
            c.JSON(401, gin.H{"error": "未认证"})
            return
        }
        
        c.JSON(200, gin.H{
            "user_id":   userID,
            "username":  username,
            "is_admin":  isAdmin,
            "message":   "用户信息获取成功",
        })
    })
    
    // API密钥接口
    r.GET("/"+cfg.ServiceName+"/v1/apikey/data", func(c *gin.Context) {
        permissionsJSON := c.GetHeader("X-User-Permissions")
        var permissions []string
        if permissionsJSON != "" {
        json.Unmarshal([]byte(permissionsJSON), &permissions)
        }
        c.JSON(200, gin.H{"permissions": permissions})
    })
    
    // 管理员接口
    r.GET("/"+cfg.ServiceName+"/v1/admin/stats", func(c *gin.Context) {
        c.JSON(200, gin.H{"message": "管理员接口"})
    })
    
    r.Run(":" + cfg.ServicePort)
}
```


## 🔍 调试指南

### 关键调试命令

```bash
# 查看当前认证模式
curl http://localhost:8080/your-service/health

# 测试 Token 验证（详细接口参数见 API 文档）
curl -X POST http://your-aliyun-ip:8080/auth-server/v1/public/auth/validate \
  -H "Content-Type: application/json" -d '{"token": "your-token"}'
# 详细接口文档：api/auth-server.md

# 检查服务注册状态（生产环境）
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://your-aliyun-ip:8080/service-registry/v1/admin/services/your-service

# 查看网关日志（生产环境）
docker-compose logs api-gateway
```

## 🚀 快速部署

### 本地开发

```bash
# 1. 从模板创建配置文件
cp env.example .env
# 编辑 .env，修改配置值

# 2. 加载环境变量并启动
export $(cat .env | xargs)
go run main.go
```

### 生产部署

**重要**：生产环境**必须使用系统环境变量**，不要使用 `.env` 文件。

```bash
# 1. 设置系统环境变量（选择一种方式）

# 方式一：使用 systemd service 文件（推荐）
# 编辑 /etc/systemd/system/your-service.service
# [Service]
# Environment="NODE_ENV=production"
# Environment="AUTH_MODE=gateway"
# Environment="NEBULA_AUTH_URL=http://your-aliyun-ip:8080"
# Environment="API_BASE_URL=http://your-aliyun-ip:8080"
# Environment="SERVICE_NAME=your-service"
# Environment="SERVICE_PORT=8080"
# Environment="SERVICE_HOST=your-cloud-ip"

# 方式二：使用 Docker Compose（推荐）
# 在 docker-compose.yml 中：
# environment:
#   - NODE_ENV=production
#   - AUTH_MODE=gateway
#   - NEBULA_AUTH_URL=http://your-aliyun-ip:8080
#   - API_BASE_URL=http://your-aliyun-ip:8080
#   - SERVICE_NAME=your-service
#   - SERVICE_PORT=8080
#   - SERVICE_HOST=your-cloud-ip

# 方式三：Kubernetes ConfigMap/Secret（推荐用于 K8s 环境）
# 创建 ConfigMap 和 Secret，在 Deployment 中引用

# 2. 启动服务
systemctl daemon-reload
systemctl start your-service
# 或使用 Docker
docker-compose up -d

# 3. 注册服务到 NebulaAuth（首次部署时执行一次）
# 详细步骤见"生产部署模式"章节
```

### 环境切换检查清单

#### 本地开发 → 生产部署

- [ ] **配置系统环境变量**（不要使用 `.env` 文件）：
  - [ ] `NODE_ENV=production`
  - [ ] `AUTH_MODE=gateway`
  - [ ] `API_BASE_URL` 设置为网关地址（`http://your-aliyun-ip:8080`）
  - [ ] `NEBULA_AUTH_URL` 设置为网关地址
  - [ ] `SERVICE_HOST` 设置为生产服务器 IP
  - [ ] 其他必要的配置项
- [ ] 部署服务到生产服务器
- [ ] 启动服务并验证健康检查
- [ ] **手动注册服务到 NebulaAuth**（首次部署时执行一次，不是自动的）
- [ ] 确保服务端口可访问
- [ ] 更新前端配置指向网关
- [ ] 测试所有接口功能
- [ ] 配置日志和监控

#### 生产部署 → 本地开发

- [ ] 从 `env.example` 创建 `.env` 文件：`cp env.example .env`
- [ ] 编辑 `.env` 文件，设置：
  - [ ] `NODE_ENV=development`
  - [ ] `AUTH_MODE=self_validate`
  - [ ] `API_BASE_URL=http://localhost:8080`
  - [ ] 其他本地开发需要的配置
- [ ] 加载环境变量：`export $(cat .env | xargs)`
- [ ] 前端配置指向本地服务器
- [ ] 测试认证流程

## 📡 API 参考

### Auth Server API

**Token 验证**：`POST /auth-server/v1/public/auth/validate`
- 用途：开发环境（self_validate 模式）验证 Token
- 请求：`{token: "jwt_token"}`
- 响应：`{valid: true/false, user_id, username, ...}`

**详细接口文档**：参见 [auth-server API 文档](api/auth-server.md)

**主要接口**：
- 登录：`POST /auth-server/v1/public/login`
- 注册：`POST /auth-server/v1/public/register`
- 刷新 Token：`POST /auth-server/v1/public/refresh_token`
- 发送验证码：`POST /auth-server/v1/public/send_verification`
- Token 验证：`POST /auth-server/v1/public/auth/validate`（内部接口）

### 服务注册 API

**端点**: `POST /service-registry/v1/admin/services`

**请求**:
```json
{
    "server_name": "your-service",
  "host": "192.168.31.189",
    "port": 8080,
  "url": "http://192.168.31.189:8080"
}
```

**响应（成功）**:
```json
{
  "success": true,
  "message": "服务注册成功"
}
```

**响应（服务名重复）**:
```json
{
  "error": "服务名称 'your-service' 已存在"
}
```

### 服务更新 API

**端点**: `PUT /service-registry/v1/admin/services/{service_name}`

**请求**:
```json
{
  "host": "new-ip",
    "port": 8080,
  "url": "http://new-ip:8080"
}
```

## ✅ 完整对接检查清单

### 服务准备

- [ ] 实现健康检查端点 `/{service}/health`（必须）
- [ ] 根据业务需求选择合适的认证级别（不是所有服务都需要支持所有四种级别）
- [ ] 实现业务接口，遵循路由规范 `/{service}/{version}/{auth_level}/{path}`
- [ ] 处理网关注入的 Header（X-User-ID 等）
- [ ] 实现错误处理（统一格式）

### 服务注册（手动操作，在服务部署后执行）

**注意**：服务注册是手动操作，不是业务服务器启动时自动执行的。

- [ ] 服务已部署并启动（或准备启动）
- [ ] 获取管理员 Token（或使用注册脚本自动获取）
- [ ] 检查服务名是否已存在
- [ ] 首次部署：注册服务到 NebulaAuth
  - **推荐方式**：使用 `./scripts/register-service.sh -n your-service -h host -p port -e admin@example.com`
  - **手动方式**：调用 API 注册服务
- [ ] 地址变更：更新现有服务信息（使用 PUT 接口）
- [ ] 验证服务注册成功（查询服务信息确认）
- [ ] 测试健康检查（通过网关访问 `/{service}/health`）

### 功能测试

- [ ] 测试 public 级别接口（健康检查必须测试）
- [ ] 如果实现了 user 级别，测试 user 级别接口（JWT Token）
- [ ] 如果实现了 apikey 级别，测试 apikey 级别接口（API Key）
- [ ] 如果实现了 admin 级别，测试 admin 级别接口（管理员 Token）
- [ ] 验证 Header 注入正常
- [ ] 验证错误处理正常

## 🎯 快速决策树

```
需要本地开发？
├─ 是 → AUTH_MODE=self_validate
│      → API_BASE_URL=localhost:8080
│      → 客户端直接调用本地业务服务器
│
└─ 否 → AUTH_MODE=gateway
       → API_BASE_URL=网关地址
       → 注册服务到 NebulaAuth
       → 客户端通过网关调用
```

## 📌 关键配置项

| 配置项 | 开发环境 | 生产环境 | 说明 |
|--------|---------|---------|------|
| `AUTH_MODE` | `self_validate` | `gateway` | 认证模式 |
| `NEBULA_AUTH_URL` | 云端地址 | 云端地址 | NebulaAuth 服务地址 |
| `API_BASE_URL` | `localhost:8080` | 网关地址 | 客户端访问地址 |
| `SERVICE_HOST` | 不需要 | 云端 IP | 服务注册用 |

---

**最后更新**: 2024年
