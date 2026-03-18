# API 参考

本文档提供 NebulaAuth 系统的 API 快速参考，详细的 API 文档请参考 `guides/api/` 目录下的文档。

## 📚 API 文档位置

详细的 API 文档位于 `guides/api/` 目录：

- [auth-server.md](../api/auth-server.md) - 认证服务 API 文档
- [user-service.md](../api/user-service.md) - 用户服务 API 文档
- [oauth-server.md](../api/oauth-server.md) - OAuth 服务 API 文档
- [service-registry.md](../api/service-registry.md) - 服务注册中心 API 文档
- [api-gateway.md](../api/api-gateway.md) - API 网关文档

## 🔐 认证服务 API

### 发送验证码

**接口**：`POST /auth-server/v1/public/send_verification`

**请求**：
```json
{
  "code_type": "email",
  "target": "user@example.com",
  "purpose": "login"
}
```

**响应**：
```json
{
  "success": true,
  "message": "验证码已发送"
}
```

### 用户登录

**接口**：`POST /auth-server/v1/public/login`

**请求**：
```json
{
  "email": "user@example.com",
  "code": "123456",
  "code_type": "email",
  "purpose": "login"
}
```

**响应**：
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "tokens": {
      "access_token": "eyJhbGc...",
      "refresh_token": "eyJhbGc..."
    },
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username"
    }
  }
}
```

### 刷新Token

**接口**：`POST /auth-server/v1/public/refresh_token`

**请求**：
```json
{
  "refresh_token": "eyJhbGc..."
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "tokens": {
      "access_token": "eyJhbGc...",
      "refresh_token": "eyJhbGc..."
    }
  }
}
```

### Token验证（内部接口）

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

**注意**：此接口主要用于开发环境（`self_validate` 模式），生产环境使用网关模式，不需要调用此接口。

### 用户注册

**接口**：`POST /auth-server/v1/public/register`

**请求**：
```json
{
  "email": "user@example.com",
  "username": "username",
  "code": "123456",
  "code_type": "email",
  "purpose": "register"
}
```

**响应**：
```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username"
    }
  }
}
```

**安全提示**：如需禁用注册功能，应在网关层拦截注册接口。

## 🔧 服务注册 API

### 注册服务

**接口**：`POST /service-registry/v1/admin/services`

**请求**：
```json
{
  "server_name": "your-service",
  "host": "business-server",
  "port": port,
  "url": "http://business-server:port",
  "user_id": "admin-user-uuid"
}
```

**响应（成功）**：
```json
{
  "success": true,
  "message": "服务注册成功"
}
```

**响应（服务名重复）**：
```json
{
  "error": "服务名称 'your-service' 已存在"
}
```

### 查询服务

**接口**：`GET /service-registry/v1/admin/services/{service_name}`

**响应**：
```json
{
  "success": true,
  "data": {
    "server_name": "your-service",
    "host": "business-server",
    "port": port,
    "url": "http://business-server:port",
    "status": "active"
  }
}
```

### 更新服务

**接口**：`PUT /service-registry/v1/admin/services/{service_name}`

**请求**：
```json
{
  "host": "business-server",
  "port": port,
  "url": "http://business-server:port"
}
```

**响应**：
```json
{
  "success": true,
  "message": "服务更新成功"
}
```

### 删除服务

**接口**：`DELETE /service-registry/v1/admin/services/{service_name}`

**响应**：
```json
{
  "success": true,
  "message": "服务删除成功"
}
```

## 📋 快速参考表

### 认证级别

| 认证级别 | 说明 | 认证要求 | 适用场景 |
|---------|------|---------|---------|
| `public` | 公开接口 | 无需认证 | 健康检查、登录注册、验证码发送 |
| `user` | 用户接口 | JWT Token 认证 | 用户信息管理、个人设置 |
| `apikey` | API密钥接口 | API密钥认证 | 服务间调用、第三方集成 |
| `admin` | 管理接口 | 管理员权限 | 系统管理、用户管理 |

### Header 规范

#### 客户端请求 Header

```
Authorization: Bearer <jwt_token>        # JWT token认证
Authorization: Bearer ak_<api_key>       # API密钥认证
X-App-ID: <app_id>                       # 应用标识（可选）
```

#### 网关注入的 Header（生产环境 gateway 模式）

**user/admin 级别（外部服务会收到）**：
```
X-User-ID: <uuid>
X-User-Username: <string>
X-User-AppID: <string>
X-User-SessionID: <uuid>
```

**apikey 级别**：
```
X-User-ID: <uuid>
X-User-Username: <string>
X-User-Permissions: <json_array>
X-User-Allowed-Services: <json_array>
X-Auth-Type: apikey
```

### 路由规范

所有 API 必须遵循统一路由格式：

```
/{service}/{version}/{auth_level}/{path}
```

**示例**：
```
GET  /your-service/v1/public/info          # 公开接口
GET  /your-service/v1/user/profile         # 用户接口
GET  /your-service/v1/apikey/data          # API密钥接口
GET  /your-service/v1/admin/stats          # 管理员接口
GET  /your-service/health                   # 健康检查（例外）
```

## 🔗 相关文档

- [认证中间件实现](../03-auth-middleware.md) - 认证中间件的实现
- [业务接口开发](../04-business-api-development.md) - 业务接口开发指南
- [前端集成](../06-frontend-integration.md) - 前端集成指南
- [API 文档目录](../api/README.md) - 完整的 API 文档

