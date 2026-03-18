# 业务服务开发准备

本文档介绍如何准备开发基于 NebulaAuth 的业务服务，包括项目结构、环境配置、认证模式选择等。

## 📋 前置条件

在开始开发业务服务之前，请确保：

- NebulaAuth 系统已部署并运行（参考 [系统部署与初始化](./01-system-setup.md)）
- 已创建管理员账户
- 了解 NebulaAuth 的基本架构和路由规范

## 📁 项目结构

推荐的项目结构如下：

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

详细的项目结构说明请参考：`examples/service-setup/project-structure.txt`

## ⚙️ 环境配置

### 配置文件说明

业务服务需要配置以下环境变量：

| 文件 | 用途 | 是否提交 | 说明 |
|------|------|---------|------|
| `env.example` | 完整配置模板 | ✅ 提交 | 包含所有配置项和详细说明，供参考 |
| `.env` | 本地个人配置 | ❌ 不提交 | 用于本地开发配置，从 env.example 复制并修改 |

**配置加载优先级**（从高到低）：
1. 系统环境变量（优先级最高）
2. `.env`（如果存在，用于本地开发）
3. `env.example`（仅作为参考，不会被加载）

### 环境变量配置

完整的配置模板请参考：`examples/service-setup/env-example.txt`

主要配置项说明：

- **NODE_ENV**: 环境标识（`development` | `production`）
- **AUTH_MODE**: 认证模式（`self_validate` | `gateway`）
- **NEBULA_AUTH_URL**: NebulaAuth 服务地址（用于 Token 验证，例如：`http://nebula-auth-server:port`）
- **API_BASE_URL**: API 基础地址
  - 开发环境（`self_validate`）：业务服务器地址（例如：`http://business-server:port`）
  - 生产环境（`gateway`）：NebulaAuth 网关地址（例如：`http://nebula-auth-server:port`）
- **SERVICE_NAME**: 服务名称（用于路由）
- **SERVICE_PORT**: 服务端口
- **SERVICE_HOST**: 服务主机（生产环境填写实际 IP）

### 初始化配置文件

```bash
# 1. 从模板创建配置文件
cp env.example .env

# 2. 编辑 .env 文件，修改实际配置值
# 根据开发环境或生产环境修改相应配置
```

**重要提示**：
- `.env` 文件仅用于**本地开发**，不要提交到 Git
- **生产环境必须使用系统环境变量**，不要使用 `.env` 文件
- 在 `.gitignore` 中添加 `.env` 文件

## 🔐 认证模式选择

NebulaAuth 支持两种认证模式，根据环境选择：

### self_validate 模式（开发环境）

**特点**：
- 业务服务器直接调用 NebulaAuth API 验证 Token
- 无需内网穿透
- 无需服务注册
- 开箱即用

**适用场景**：
- 本地开发测试
- 开发环境

**配置**：
```bash
AUTH_MODE=self_validate
API_BASE_URL=http://business-server:port  # 业务服务器地址
NEBULA_AUTH_URL=http://nebula-auth-server:port  # NebulaAuth 服务器地址
```

**前端请求方式**：
- **前端直接请求业务服务器地址**（`http://business-server:port`）
- 客户端直接调用业务服务器，**不经过 NebulaAuth 网关**
- 业务服务器自己验证 Token（调用 NebulaAuth API 验证）
- **注意**：`business-server:port` 是业务服务器的地址，`nebula-auth-server:port` 是 NebulaAuth 服务器的地址

### gateway 模式（生产环境）

**特点**：
- 网关已验证 Token，业务服务器直接读取 Header
- 性能更好（性能提升 75-85%）
- 安全性更高
- 统一管理

**适用场景**：
- 生产环境部署
- 需要高性能的场景

**配置**：
```bash
AUTH_MODE=gateway
API_BASE_URL=http://nebula-auth-server:port  # NebulaAuth 网关地址
```

**前端请求方式**：
- **前端必须请求 NebulaAuth 网关地址**（`http://nebula-auth-server:port`）
- **不能直接请求业务服务器地址**：客户端不能直接调用业务服务器（`business-server:port`）
- 所有业务接口请求都发送到 NebulaAuth 网关，网关负责路由到对应的业务服务
- 网关验证 Token 后，将用户信息注入到请求 Header 中，然后转发给业务服务器
- **注意**：`nebula-auth-server:port` 是 NebulaAuth 网关的地址，`business-server:port` 是业务服务器的地址

### 模式对比

| 模式 | 环境 | 工作原理 | 前端请求地址 | 性能 | 使用场景 |
|------|------|---------|------------|------|---------|
| `self_validate` | 开发 | 业务服务器调用 NebulaAuth API 验证 Token | **业务服务器地址**（`business-server:port`） | 较慢（10-50ms） | 本地开发测试 |
| `gateway` | 生产 | 从网关注入的 Header 读取用户信息 | **NebulaAuth 网关地址**（`nebula-auth-server:port`） | 快（<1ms） | 生产环境部署 |

**重要提示**：
- **开发环境（self_validate）**：
  - 前端直接请求**业务服务器地址**（`business-server:port`），**不经过 NebulaAuth 网关**
  - 业务服务器自己验证 Token（调用 NebulaAuth API，地址为 `nebula-auth-server:port`）
  - ⚠️ **错误示例**：如果前端在 `self_validate` 模式下请求网关地址，会导致双重 CORS 头、认证失败等问题
- **生产环境（gateway）**：
  - 前端必须请求**NebulaAuth 网关地址**（`nebula-auth-server:port`），**不能直接请求业务服务器**（`business-server:port`）
  - 所有业务接口请求都发送到网关，网关负责路由到业务服务器
  - ⚠️ **错误示例**：如果前端在 `gateway` 模式下直接请求业务服务器，会导致无法获取用户信息（`X-User-ID` header 为空）

**⚠️ 常见错误和后果**：

| 错误配置 | 后果 | 典型错误信息 |
|---------|------|------------|
| `self_validate` 模式下前端请求网关地址 | 双重 CORS 头、认证失败 | `Access-Control-Allow-Origin cannot contain more than one origin` |
| `gateway` 模式下前端直接请求业务服务器 | 无法获取用户信息 | `未认证: X-User-ID header 为空` |
| 前后端认证模式不一致 | 认证失败、功能异常 | `Token 无效` 或 `未认证` |

详细的问题排查请参考：[故障排除](./reference/troubleshooting.md#问题4认证模式配置错误导致的问题)

详细的设计原理请参考：[架构与设计原理](./reference/architecture.md#客户端调用机制)

## 👥 用户管理策略选择

业务方使用 NebulaAuth 服务实现用户认证时，需要根据业务需求选择合适的用户管理策略。

### 策略1：开放注册

**适用场景**：
- 面向公众的应用（如：社交平台、电商平台、内容社区）
- 需要用户自主注册的场景
- 希望降低用户获取门槛

**特点**：
- ✅ 用户可以通过前端注册界面自主注册
- ✅ 注册流程简单，用户体验好
- ✅ 适合快速获取用户

**实现方式**：

1. **前端实现注册功能**：
   - 提供注册界面
   - 调用 NebulaAuth 注册接口：`POST /auth-server/v1/public/register`
   - 参考代码：`examples/frontend/auth-service.js`

2. **注册流程**：
   ```
   用户输入邮箱/手机号 → 发送验证码 → 用户输入验证码 → 调用注册接口 → 注册成功并自动登录
   ```

3. **前端代码示例**：
   ```javascript
   // 发送注册验证码
   export async function sendRegisterCode(email) {
     const response = await fetch(`${apiConfig.nebulaAuthURL}/auth-server/v1/public/send_verification`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ 
         code_type: 'email', 
         target: email, 
         purpose: 'register' 
       })
     });
     return await response.json();
   }

   // 用户注册
   export async function register(email, code, username) {
     const response = await fetch(`${apiConfig.nebulaAuthURL}/auth-server/v1/public/register`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ 
         email, 
         code, 
         code_type: 'email', 
         purpose: 'register',
         username 
       })
     });
     const data = await response.json();
     if (data.success) {
       // 注册成功，保存 Token（注册接口会自动登录）
       localStorage.setItem('access_token', data.data.tokens.access_token);
       localStorage.setItem('refresh_token', data.data.tokens.refresh_token);
       return data.data;
     }
     throw new Error(data.error || '注册失败');
   }
   ```

**注意事项**：
- NebulaAuth 注册接口是 `public` 级别，默认对所有用户开放
- 如果不需要限制注册，直接使用即可
- 如需限制注册（如：邀请码、白名单），需要在业务层实现

### 策略2：不开放注册，管理员添加后登录

**适用场景**：
- 企业内部应用（如：OA系统、CRM系统、内部管理平台）
- 需要严格控制用户访问的场景
- 用户由管理员统一管理的场景

**特点**：
- ✅ 用户只能由管理员添加，不能自主注册
- ✅ 安全性更高，避免未授权注册
- ✅ 适合需要用户审核的场景

**实现方式**：

#### 步骤1：禁用注册接口（网关层）

**重要**：仅在前端隐藏注册功能**不够安全**，必须在网关层或反向代理层限制注册接口。

**方案1：网关层拦截（推荐）**

在网关层拦截注册接口，返回 403：

```go
// 在 api-gateway/main.go 的 setupRoutes 函数中添加
func setupRoutes(r *gin.Engine, serviceConfig config.ServiceConfig) {
    // ... 其他路由配置
    
    // 拦截注册接口（如果不需要开放注册）
    if os.Getenv("REGISTRATION_ENABLED") != "true" {
        r.POST("/auth-server/v1/public/register", func(c *gin.Context) {
            c.JSON(http.StatusForbidden, gin.H{
                "success": false,
                "error":   "注册功能已关闭，请联系管理员",
            })
        })
    }
    
    // ... 其他路由配置
}
```

**方案2：反向代理层限制**

如果使用 Nginx 等反向代理，可以在 Nginx 配置中限制：

```nginx
location /auth-server/v1/public/register {
    return 403;
}
```

#### 步骤2：前端不提供注册功能

- 不提供注册界面
- 不调用注册接口
- 登录失败时提示："账号不存在，请联系管理员"

#### 步骤3：管理员添加用户

管理员通过以下方式添加用户：

**方式1：使用 SQL 脚本批量添加**

参考 [系统部署与初始化](./01-system-setup.md#步骤四批量创建用户可选)：

```sql
-- 批量创建用户
INSERT INTO users (id, email, phone, username, avatar_url, is_active, is_verified, is_admin, created_at, updated_at)
VALUES
    (uuid_generate_v4(), 'user1@example.com', NULL, 'user1', NULL, true, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (uuid_generate_v4(), 'user2@example.com', NULL, 'user2', NULL, true, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;
```

**方式2：通过 NebulaAuth 管理员接口直接创建（推荐）**

NebulaAuth 现在提供了管理员创建用户的接口，管理员可以直接调用该接口创建用户。

**接口信息**：
- **路径**: `POST /user-service/v1/admin/users`
- **认证**: 需要管理员 token (Bearer Token)
- **内容类型**: `application/json`
- **访问方式**: 必须通过 API Gateway 访问（不能直接访问 user-service）

**重要提示**：
- ⚠️ **必须通过 API Gateway 访问**：`user-service` 使用 `gateway` 认证模式，期望从 Header 读取用户信息
- ✅ **正确地址**：`http://<api-gateway-host>:<api-gateway-port>/user-service/v1/admin/users`（通过网关）
- ❌ **错误地址**：`http://<user-service-host>:<user-service-port>/user-service/v1/admin/users`（直接访问，会导致认证失败）

**请求示例**：

```bash
# 使用邮箱创建用户（通过 API Gateway）
curl -X POST http://<api-gateway-host>:<api-gateway-port>/user-service/v1/admin/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "email": "newuser@example.com",
    "username": "newuser",
    "is_verified": false
  }'

# 使用手机号创建用户（通过 API Gateway）
curl -X POST http://<api-gateway-host>:<api-gateway-port>/user-service/v1/admin/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "phone": "13800138000",
    "username": "newuser",
    "is_verified": true
  }'
```

**说明**：
- `<api-gateway-host>` 和 `<api-gateway-port>` 需要根据实际部署环境替换
- Docker 环境示例：`http://nebula-api-gateway:8080`
- 开发环境示例：`http://<api-gateway-host>:<api-gateway-port>`
- 生产环境根据实际部署配置调整

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | 否* | 邮箱地址（与 phone 至少提供一个） |
| phone | string | 否* | 手机号（与 email 至少提供一个） |
| username | string | 否 | 用户名 |
| avatar_url | string | 否 | 头像URL |
| is_verified | boolean | 否 | 是否已验证，默认为 false |

**响应示例**：

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "newuser@example.com",
    "phone": null,
    "username": "newuser",
    "avatar_url": null,
    "is_active": true,
    "is_verified": false,
    "is_admin": false,
    "created_at": "2024-12-19T10:00:00Z",
    "updated_at": "2024-12-19T10:00:00Z"
  },
  "message": "用户创建成功"
}
```

**方式3：通过业务服务的管理接口添加**

如果业务服务需要在自己的服务中提供用户管理接口，可以调用 NebulaAuth 的管理员接口或内部接口。

参考代码：`examples/business-api/admin-create-user.go`

**实现步骤**：

1. **业务服务提供管理员创建用户接口**：
   ```go
   // 路由：POST /your-service/v1/admin/users
   adminGroup.POST("/users", AdminCreateUserHandler(userServiceURL))
   ```

2. **调用 NebulaAuth 的管理员接口创建用户**：
   ```go
   // 方式A：调用 NebulaAuth 的管理员接口（推荐，通过网关）
   // 接口：POST http://<api-gateway-host>:<api-gateway-port>/user-service/v1/admin/users
   func createUserViaAdminAPI(gatewayURL string, req AdminCreateUserRequest) (*CreateUserResponse, error) {
       url := fmt.Sprintf("%s/user-service/v1/admin/users", gatewayURL)
       // 需要传递管理员 token
       // 注意：必须通过网关访问，不能直接访问 user-service
       // gatewayURL 示例：http://nebula-api-gateway:<port> 或 http://<api-gateway-host>:<api-gateway-port>
       // ... 处理响应
   }
   
   // 方式B：调用 user-service 的内部接口（不经过网关）
   // 接口：POST http://<user-service-host>:<user-service-port>/v1/internal/users
   func createUserViaInternalAPI(userServiceURL string, req CreateUserRequest) (*CreateUserResponse, error) {
       url := fmt.Sprintf("%s/v1/internal/users", userServiceURL)
       // userServiceURL 示例：http://nebula-user-service:<port> 或 http://<user-service-host>:<user-service-port>
       resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
       // ... 处理响应
   }
   ```

**NebulaAuth 管理员接口能力**：

NebulaAuth 提供的管理员接口（`/user-service/v1/admin/users`）包括：
- ✅ `POST /admin/users` - 创建用户（新增）
- ✅ `GET /admin/users` - 获取所有用户
- ✅ `GET /admin/users/{id}` - 获取指定用户
- ✅ `GET /admin/users/email/{email}` - 根据邮箱查找用户
- ✅ `GET /admin/users/phone/{phone}` - 根据手机号查找用户
- ✅ `PUT /admin/users/{id}` - 更新指定用户信息
- ✅ `DELETE /admin/users/{id}` - 删除指定用户

**创建用户的方式**：
- **方式1**：SQL 脚本直接操作数据库（适合批量导入和自动化部署）
- **方式2**：直接调用 NebulaAuth 管理员接口 `POST /admin/users`（推荐，最简单直接）
- **方式3**：通过业务服务调用 NebulaAuth 接口（适合需要在业务服务中封装用户管理功能的场景）

详细实现请参考：`examples/business-api/admin-create-user.go`

#### 步骤4：用户登录

用户被添加后，可以通过登录接口登录：

```javascript
// 用户登录（与开放注册场景相同）
export async function login(email, code, codeType = 'email') {
  const response = await fetch(`${apiConfig.nebulaAuthURL}/auth-server/v1/public/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      email, 
      code, 
      code_type: codeType, 
      purpose: 'login' 
    })
  });
  // ... 处理登录响应
}
```

**注意事项**：
- ⚠️ **安全要求**：必须在网关层或反向代理层限制注册接口，仅在前端隐藏不够安全
- ⚠️ **用户提示**：登录失败时提示"账号不存在，请联系管理员"，而不是"注册失败"
- ⚠️ **多应用场景**：如果多个应用使用同一个 NebulaAuth，需要区分哪些应用允许注册

### 策略对比

| 策略 | 适用场景 | 安全性 | 用户体验 | 实现复杂度 |
|------|---------|--------|---------|-----------|
| **开放注册** | 面向公众的应用 | 中等 | 好（用户自主注册） | 低（直接使用） |
| **管理员添加** | 企业内部应用 | 高（严格控制） | 中等（需要管理员操作） | 中（需要禁用注册接口） |

### 选择建议

- **选择开放注册**：如果您的应用面向公众，希望用户能够自主注册
- **选择管理员添加**：如果您的应用是企业内部应用，需要严格控制用户访问

详细的安全考虑请参考：[架构与设计原理](./reference/architecture.md#注册接口安全考虑)

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

### 认证级别

根据业务需求选择合适的认证级别：

| 认证级别 | 说明 | 认证要求 | 适用场景 |
|---------|------|---------|---------|
| `public` | 公开接口 | 无需认证 | 健康检查、登录注册、验证码发送 |
| `user` | 用户接口 | JWT Token 认证 | 用户信息管理、个人设置 |
| `apikey` | API密钥接口 | API密钥认证 | 服务间调用、第三方集成 |
| `admin` | 管理接口 | 管理员权限 | 系统管理、用户管理 |

**注意**：所有服务必须实现 `public` 级别的健康检查接口 `/{service}/health`

详细的认证级别说明请参考：[业务接口开发](./04-business-api-development.md)

## 🔌 通信协议说明

### Unix Socket vs HTTP 通信

NebulaAuth 网关会根据服务类型自动选择通信协议：

| 协议类型 | 延迟 | 性能提升 | 适用场景 | 业务服务影响 |
|---------|------|---------|---------|------------|
| **Unix Socket** | 10-20ms | **75-85%** | 本地服务（在 serviceMap 中） | 可以收到完整的 Header（包括 `X-User-IsAdmin`） |
| **HTTP** | 50-100ms | - | 外部服务（不在 serviceMap 中） | 不包含敏感 Header（如 `X-User-IsAdmin`） |

### 网关如何选择协议

网关的选择逻辑：

```go
// 伪代码
if 服务在 serviceMap 中存在 {
    使用 Unix Socket 通信（本地服务）
} else {
    使用 HTTP 通信（外部服务）
}
```

### 业务服务开发指南

**重要**：业务服务**不需要关心**网关使用哪种协议，只需要：

1. **实现标准 HTTP 接口**：业务服务只需要实现标准的 HTTP 接口
2. **从 Header 读取用户信息**：无论通过哪种协议，都从 Header 读取用户信息
3. **网关自动选择协议**：网关会根据服务类型自动选择最优协议

**示例**：

```go
// 业务服务接口实现
func getUserProfile(c *gin.Context) {
    // 业务服务不需要知道请求是通过 Unix Socket 还是 HTTP 到达的
    // 只需要从 Header 读取用户信息即可
    
    userID := c.GetHeader("X-User-ID")
    username := c.GetHeader("X-User-Username")
    
    // 处理业务逻辑...
    c.JSON(200, gin.H{
        "user_id": userID,
        "username": username,
    })
}
```

### Header 差异说明

**本地服务（Unix Socket）**会收到完整的 Header：

```
X-User-ID: <user_id>
X-User-Username: <username>
X-User-IsAdmin: true/false        # ✅ 包含管理员标识
X-User-Role: admin/user           # ✅ 包含角色信息
X-User-AppID: <app_id>
X-User-SessionID: <session_id>
```

**外部服务（HTTP）**不会收到敏感 Header：

```
X-User-ID: <user_id>
X-User-Username: <username>
X-User-AppID: <app_id>
X-User-SessionID: <session_id>
# ❌ 不包含 X-User-IsAdmin
# ❌ 不包含 X-User-Role
```

**原因**：出于安全考虑，外部服务不接收角色和管理员信息，权限验证已在网关层完成。

参考代码：`examples/business-api/communication-protocols.go`

详细的通信协议说明请参考：[架构与设计原理](./reference/architecture.md#通信协议)

## 📝 配置加载示例

### Go 语言配置加载

参考代码：`examples/auth-middleware/config-go.go`

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
        NebulaAuthURL: getEnv("NEBULA_AUTH_URL", "http://nebula-auth-server:port"),
        APIBaseURL:    getEnv("API_BASE_URL", "http://business-server:port"),
        ServiceName:   getEnv("SERVICE_NAME", "your-service"),
        ServicePort:   getEnv("SERVICE_PORT", "port"),
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

## ✅ 检查清单

在开始开发业务接口之前，请确认：

- [ ] 项目结构已创建
- [ ] 环境配置文件已创建（`env.example` 和 `.env`）
- [ ] 已选择合适的认证模式（开发环境使用 `self_validate`）
- [ ] 已了解路由规范
- [ ] 已了解认证级别

## 🔗 下一步

完成开发准备后，您可以：

1. **实现认证中间件**：参考 [认证中间件实现](./03-auth-middleware.md)
2. **开发业务接口**：参考 [业务接口开发](./04-business-api-development.md)
3. **了解架构原理**：参考 [架构与设计原理](./reference/architecture.md)

## 📝 相关文档

- [认证中间件实现](./03-auth-middleware.md) - 统一认证中间件的实现
- [业务接口开发](./04-business-api-development.md) - 业务接口开发指南
- [架构与设计原理](./reference/architecture.md) - 系统架构和设计原理
- [最佳实践](./reference/best-practices.md) - 环境变量管理等最佳实践

