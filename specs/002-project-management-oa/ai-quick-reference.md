# AI 快速参考：NebulaAuth 应用服务开发完整指南

> **目标读者**: AI 助手、自动化工具、快速查阅
> 
> **用途**: 提供结构化、可执行的步骤和代码模板，便于 AI 快速理解和生成代码

## 📋 系统概述

### 架构图

```
客户端 → API Gateway (8080) → 业务服务器
```

NebulaAuth 作为统一的认证网关，业务服务器作为外部服务接入。

### 核心概念

#### 认证模式对比

| 模式 | 环境 | 工作原理 | 性能 | 使用场景 |
|------|------|---------|------|---------|
| `self_validate` | 开发 | 业务服务器调用 NebulaAuth API 验证 Token | 较慢（网络调用，10-50ms） | 本地开发测试 |
| `gateway` | 生产 | 从网关注入的 Header 读取用户信息 | 快（直接读取，<1ms） | 生产环境部署 |

#### 架构流程

```
开发环境: 客户端 → 本地服务器 → NebulaAuth API (验证)
生产环境: 客户端 → NebulaAuth 网关 → 业务服务器 (Header)
```

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

| 认证级别 | 说明 | 认证要求 | 适用场景 |
|---------|------|---------|---------|
| `public` | 公开接口 | 无需认证 | 健康检查、登录注册、验证码发送 |
| `user` | 用户接口 | JWT Token 认证 | 用户信息管理、个人设置 |
| `apikey` | API密钥接口 | API密钥认证 | 服务间调用、第三方集成 |
| `admin` | 管理接口 | 管理员权限 | 系统管理、用户管理 |

### Header 规范

#### 网关注入的 Header（生产环境 gateway 模式）

**user/admin 级别（外部服务会收到）**：
```
X-User-ID: <uuid>              # 用户ID（UUID格式）
X-User-Username: <string>      # 用户名
X-User-AppID: <string>         # 应用ID
X-User-SessionID: <uuid>       # 会话ID（UUID格式）
```

**注意**: 外部服务不会收到 `X-User-Role` 和 `X-User-IsAdmin` header（出于安全考虑）。

**apikey 级别**：
```
X-User-ID: <uuid>
X-User-Username: <string>
X-User-Permissions: <json_array>        # 权限列表（JSON字符串）
X-User-Allowed-Services: <json_array>   # 允许访问的服务列表
X-Auth-Type: apikey
```

**重要**: `X-User-Permissions` 和 `X-User-Allowed-Services` 是 JSON 字符串，需要解析。

#### 客户端请求 Header

```
Authorization: Bearer <jwt_token>        # JWT token认证
Authorization: Bearer ak_<api_key>       # API密钥认证
```

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
├── .env.development      # 开发环境配置
├── .env.production       # 生产环境配置
├── config/
│   └── env.go           # 环境配置
├── middleware/
│   └── auth.go          # 统一认证中间件
├── handlers/
│   └── user.go          # 业务处理器
└── main.go              # 主程序
```

#### 2. 环境配置

**`.env.development`**:
```bash
NODE_ENV=development
AUTH_MODE=self_validate          # 自己验证 Token
NEBULA_AUTH_URL=http://your-aliyun-ip:8080
API_BASE_URL=http://localhost:8080
SERVICE_NAME=your-service
SERVICE_PORT=8080
```

**`.env.production`**:
```bash
NODE_ENV=production
AUTH_MODE=gateway                # 通过网关（从 Header 读取）
NEBULA_AUTH_URL=http://your-aliyun-ip:8080
API_BASE_URL=http://your-aliyun-ip:8080
SERVICE_NAME=your-service
SERVICE_PORT=8080
SERVICE_HOST=your-cloud-ip      # 云端服务器 IP
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
# 1. 加载开发环境变量
export $(cat .env.development | xargs)

# 2. 启动本地服务
go run main.go
# 或
npm start

# 3. 获取 Token
TOKEN=$(curl -s -X POST http://your-aliyun-ip:8080/auth-server/v1/public/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "123456",
    "code_type": "email",
    "purpose": "login"
  }' | jq -r '.data.tokens.access_token')

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

```bash
# 1. 获取管理员 Token
ADMIN_TOKEN=$(curl -s -X POST http://your-aliyun-ip:8080/auth-server/v1/public/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "code": "123456",
    "code_type": "email",
    "purpose": "login"
  }' | jq -r '.data.tokens.access_token')

# 2. 注册服务
curl -X POST http://your-aliyun-ip:8080/service-registry/v1/admin/services \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "server_name": "your-service",
    "host": "your-cloud-ip",
    "port": 8080,
    "url": "http://your-cloud-ip:8080"
  }'
```

**服务名重复处理**:
```bash
# 如果服务名已存在，使用更新接口
curl -X PUT http://your-aliyun-ip:8080/service-registry/v1/admin/services/your-service \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "host": "new-ip",
    "port": 8080,
    "url": "http://new-ip:8080"
  }'
```

#### 3. 生产环境部署步骤

```bash
# 1. 部署代码到服务器
scp -r your-service user@server:/opt/

# 2. 加载生产环境变量
export $(cat .env.production | xargs)

# 3. 启动服务
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

### 完整服务示例（Node.js）

```javascript
const express = require('express');
const authMiddleware = require('./middleware/auth');
const config = require('./config/env');

const app = express();
app.use(express.json());

// 健康检查
app.get(`/${config.serviceName}/health`, (req, res) => {
  res.json({
    status: 'ok',
    service: config.serviceName,
    auth_mode: config.authMode,
  });
});

// 公开接口
app.get(`/${config.serviceName}/v1/public/info`, (req, res) => {
  res.json({ message: '这是公开接口' });
});

// 需要认证的接口
app.use(`/${config.serviceName}/v1`, authMiddleware);

app.get(`/${config.serviceName}/v1/user/profile`, (req, res) => {
  res.json({
    user_id: req.user.id,
    username: req.user.username,
    is_admin: req.user.isAdmin,
    message: '用户信息获取成功',
  });
});

app.listen(config.servicePort, () => {
  console.log(`服务启动在端口 ${config.servicePort}，认证模式: ${config.authMode}`);
});
```

### 完整服务示例（Python/Flask）

```python
from flask import Flask, request, jsonify
import time

app = Flask(__name__)

# 健康检查
@app.route('/your-service/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'service': 'your-service',
        'timestamp': int(time.time())
    })

# 公开接口
@app.route('/your-service/v1/public/info', methods=['GET'])
def public_info():
    return jsonify({'message': '这是公开接口，无需认证'})

# 用户接口
@app.route('/your-service/v1/user/profile', methods=['GET'])
def user_profile():
    user_id = request.headers.get('X-User-ID')
    username = request.headers.get('X-User-Username')
    
    if not user_id:
        return jsonify({'error': '未获取到用户信息'}), 401
    
    return jsonify({
        'message': '用户信息获取成功',
        'user': {
            'id': user_id,
            'username': username,
        }
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

## 🔍 调试指南

### 本地调试方法

#### 1. 查看当前认证模式

```bash
# 健康检查接口会返回当前认证模式
curl http://localhost:8080/your-service/health

# 响应示例：
# {
#   "status": "ok",
#   "service": "your-service",
#   "auth_mode": "self_validate"  # 或 "gateway"
# }
```

#### 2. 测试 Token 验证

```bash
# 直接调用 NebulaAuth 验证 API
curl -X POST http://your-aliyun-ip:8080/auth-server/v1/public/auth/validate \
  -H "Content-Type: application/json" \
  -d '{"token": "your-token-here"}'
```

#### 3. 日志记录

在中间件中添加日志：

```go
func selfValidateAuthMiddleware(cfg *config.Config) gin.HandlerFunc {
    return func(c *gin.Context) {
        log.Printf("[AUTH] 使用自己验证模式，调用 NebulaAuth API: %s", cfg.NebulaAuthURL)
        // ...
    }
}
```

### 生产环境调试

#### 1. 检查服务注册状态

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://your-aliyun-ip:8080/service-registry/v1/admin/services/your-service
```

#### 2. 查看网关日志

```bash
docker-compose logs api-gateway
```

#### 3. 测试网关路由

```bash
# 测试路由是否正确转发
curl -v http://your-aliyun-ip:8080/your-service/v1/user/profile \
  -H "Authorization: Bearer $TOKEN"
```

### 常见问题排查

#### 问题 1: 本地开发时 Token 验证失败

**症状**: `验证 Token 失败: connection refused`

**解决方案**:
```bash
# 1. 检查配置
echo $NEBULA_AUTH_URL

# 2. 测试连接
curl http://your-aliyun-ip:8080/health

# 3. 检查网络
ping your-aliyun-ip
```

#### 问题 2: 生产环境无法获取用户信息

**症状**: `未认证: X-User-ID header 为空`

**解决方案**:
```bash
# 1. 检查服务注册
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://your-aliyun-ip:8080/service-registry/v1/admin/services/your-service

# 2. 检查路由
curl -v http://your-aliyun-ip:8080/your-service/v1/user/profile

# 3. 查看网关日志
docker-compose logs api-gateway
```

#### 问题 3: 环境切换后功能异常

**症状**: `切换环境后，认证失败`

**解决方案**:
```bash
# 1. 确认环境变量
env | grep AUTH_MODE

# 2. 重启服务
systemctl restart your-service

# 3. 检查健康检查接口
curl http://localhost:8080/your-service/health
```

## 🚀 部署流程

### 本地开发环境设置

```bash
# 1. 创建项目目录
mkdir your-service
cd your-service

# 2. 创建环境配置文件
cat > .env.development << EOF
NODE_ENV=development
AUTH_MODE=self_validate
NEBULA_AUTH_URL=http://your-aliyun-ip:8080
API_BASE_URL=http://localhost:8080
SERVICE_NAME=your-service
SERVICE_PORT=8080
EOF

# 3. 加载环境变量
export $(cat .env.development | xargs)

# 4. 启动服务
go run main.go
```

### 生产环境部署步骤

```bash
# 1. 在云端服务器上创建项目目录
mkdir -p /opt/your-service
cd /opt/your-service

# 2. 上传代码（使用 git、scp 等）

# 3. 创建生产环境配置
cat > .env.production << EOF
NODE_ENV=production
AUTH_MODE=gateway
NEBULA_AUTH_URL=http://your-aliyun-ip:8080
API_BASE_URL=http://your-aliyun-ip:8080
SERVICE_NAME=your-service
SERVICE_PORT=8080
SERVICE_HOST=your-cloud-ip
EOF

# 4. 加载环境变量
export $(cat .env.production | xargs)

# 5. 注册服务到 NebulaAuth
# （见"生产部署模式"章节）

# 6. 启动服务
systemctl start your-service
```

### 环境切换检查清单

#### 本地开发 → 生产部署

- [ ] 修改环境变量：`AUTH_MODE=gateway`
- [ ] 修改 `API_BASE_URL` 为网关地址
- [ ] 在 NebulaAuth 注册服务
- [ ] 确保服务端口可访问
- [ ] 更新前端配置指向网关
- [ ] 测试所有接口功能
- [ ] 配置日志和监控

#### 生产部署 → 本地开发

- [ ] 修改环境变量：`AUTH_MODE=self_validate`
- [ ] 修改 `API_BASE_URL` 为本地地址
- [ ] 前端配置指向本地服务器
- [ ] 测试认证流程

## 📡 API 参考

### Token 验证 API

**端点**: `POST /auth-server/v1/public/auth/validate`

**请求**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**响应（成功）**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "user_id": "uuid",
    "username": "string",
    "is_admin": false,
    "app_id": "string",
    "session_id": "uuid"
  }
}
```

**响应（失败）**:
```json
{
  "success": true,
  "data": {
    "valid": false,
    "error": "token expired"
  }
}
```

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

- [ ] 实现健康检查端点 `/{service}/health`
- [ ] 实现业务接口，遵循路由规范 `/{service}/{version}/{auth_level}/{path}`
- [ ] 处理网关注入的 Header（X-User-ID 等）
- [ ] 实现错误处理（统一格式）
- [ ] 支持四种认证级别（public, user, apikey, admin）

### 服务注册

- [ ] 获取管理员 Token
- [ ] 检查服务名是否已存在
- [ ] 注册服务到 NebulaAuth（或更新现有服务）
- [ ] 验证服务注册成功
- [ ] 测试健康检查（通过网关）

### 功能测试

- [ ] 测试 public 级别接口（无需认证）
- [ ] 测试 user 级别接口（JWT Token）
- [ ] 测试 apikey 级别接口（API Key）
- [ ] 测试 admin 级别接口（管理员 Token）
- [ ] 验证 Header 注入正常
- [ ] 验证错误处理正常

## 🎯 快速决策树

```
需要本地开发？
├─ 是 → AUTH_MODE=self_validate
│      → API_BASE_URL=localhost:8080
│      → 客户端直接访问本地服务器
│
└─ 否 → AUTH_MODE=gateway
       → API_BASE_URL=网关地址
       → 注册服务到 NebulaAuth
       → 客户端通过网关访问
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
