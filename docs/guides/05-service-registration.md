# 服务注册与集成

本文档介绍如何将业务服务注册到 NebulaAuth 系统，实现服务发现和路由转发。

## 📋 前置条件

在注册服务之前，请确保：

- 业务服务已开发完成（参考 [业务接口开发](./04-business-api-development.md)）
- 已实现健康检查接口 `/{service}/health`
- 已创建管理员账户（参考 [系统部署与初始化](./01-system-setup.md)）
- 服务已部署并可以访问（生产环境）

## 🎯 服务注册概述

### 什么是服务注册？

服务注册是将业务服务的信息（名称、地址、端口等）注册到 NebulaAuth 服务注册中心，使网关能够发现和路由请求到您的服务。

### 注册时机

**重要说明**：服务注册是手动操作，不是业务服务器启动时自动执行的。

- **首次部署**：服务部署完成后，在启动前或启动后手动注册一次
- **服务地址变更**：当服务 IP、端口或 URL 变更时，需要更新注册信息
- **不需要每次启动都注册**：注册信息会持久化存储，服务重启不需要重新注册

### 注册方式

- **推荐方式**：使用 `register-service.sh` 脚本（自动处理登录、获取Token和注册流程）
  - 可以直接使用通用脚本 `guides/scripts/register-service.sh`
  - **可选**：为项目创建特定的包装脚本（适合团队协作，详见下方"准备阶段"）
- **备选方式**：直接调用 API 注册服务（详见下方"手动调用 API"章节）

## 🚀 服务注册完整流程（推荐方式）

### 准备阶段

#### 1. 确认前置条件

确保已完成：
- ✅ 业务服务已开发完成（参考 [业务接口开发](./04-business-api-development.md)）
- ✅ 已实现健康检查接口 `/{service}/health`
- ✅ 已创建管理员账户（参考 [系统部署与初始化](./01-system-setup.md)）
- ✅ 服务已部署并可以访问

#### 2. 选择注册方式

您可以选择两种方式使用脚本：

**方式A：使用通用脚本（简单直接）**

直接使用 `guides/scripts/register-service.sh`，适合：
- 个人开发者
- 快速测试和验证
- 一次性注册

**方式B：创建项目特定的包装脚本（可选，推荐用于团队协作）**

`register-service.sh` 是一个通用脚本，设计简洁且不依赖项目结构。但在实际项目中，您可能需要：

- **配置一致性**：从项目的 `.env` 文件自动读取服务配置，确保域名和端口配置的一致性
- **简化使用**：为团队提供更简单的调用方式，减少重复输入
- **项目特定默认值**：设置项目特定的服务名称、主机、端口等默认值
- **配置优先级管理**：统一管理命令行参数、环境变量、配置文件的优先级

**使用 AI 创建项目特定的包装脚本**

您可以使用以下 Prompt 让 AI 基于 `register-service.sh` 为您创建项目特定的包装脚本：

```markdown
请基于 NebulaAuth 的 `register-service.sh` 脚本，为我创建一个项目特定的服务注册包装脚本。

**项目信息**：
- 服务名称：{YOUR_SERVICE_NAME}
- 配置文件路径：{CONFIG_FILE_PATH}（例如：`./.env` 或 `./backend/.env`）
- register-service.sh 路径：{REGISTER_SERVICE_SCRIPT_PATH}（例如：`./guides/scripts/register-service.sh`）

**核心目标**：
创建一个包装脚本，从项目配置文件读取服务配置（服务名称、主机、端口、网关地址等），确保配置一致性，然后将所有参数透传给 `register-service.sh`。

**核心需求**：
1. **调用底层脚本**：调用 `{REGISTER_SERVICE_SCRIPT_PATH}`，完整透传所有参数
2. **配置文件加载**：从 `{CONFIG_FILE_PATH}` 读取配置，支持常见的环境变量命名约定
3. **配置优先级**：命令行参数 > 环境变量 > 配置文件 > 默认值
4. **容错处理**：配置文件不存在时给出警告但继续执行
5. **配置日志**：显示配置项的来源，便于调试

**输出要求**：
- 脚本命名为 `register-{service-name}.sh`
- 包含错误处理、用户提示和使用说明
- 代码清晰、可维护
```

**使用说明**：
1. **替换占位符**：将 Prompt 中的 `{YOUR_SERVICE_NAME}`、`{CONFIG_FILE_PATH}`、`{REGISTER_SERVICE_SCRIPT_PATH}` 替换为您的实际项目信息
2. **发送给 AI**：将完整的 Prompt 发送给 AI（如 Cursor、GitHub Copilot、ChatGPT 等）
3. **检查生成的脚本**：AI 会生成一个包装脚本，请检查配置优先级、参数透传、错误处理是否完善
4. **测试脚本**：在项目中测试生成的脚本，确保配置加载和参数透传正常工作

**提示**：如果您的项目有特殊的配置文件路径或命名约定，可以在 Prompt 中补充说明，AI 会根据您的需求调整实现。

### 登录认证

脚本执行包含以下步骤：

1. **登录认证**：发送验证码并登录，获取管理员 Token
2. **服务注册**：将服务信息注册到服务注册中心
3. **验证注册**：自动验证服务注册是否成功（可选，建议执行）

**注意**：注册完成后，建议手动执行验证步骤，确保服务可以通过网关正常访问。

#### 使用通用脚本登录

**方式1：使用邮箱登录**

```bash
./guides/scripts/register-service.sh \
  -n your-service \
  -h business-server \
  -p port \
  -e admin@example.com
```

**方式2：使用手机号登录**

```bash
./guides/scripts/register-service.sh \
  -n your-service \
  -h business-server \
  -p port \
  -P 13800138000 \
  -t sms
```

**方式3：使用已有Token（适合CI/CD场景）**

```bash
./guides/scripts/register-service.sh \
  -n your-service \
  -h business-server \
  -p port \
  --token "eyJhbGc..." \
  --user-id "uuid-here"
```

**方式4：使用环境变量配置**

```bash
export SERVICE_NAME=your-service
export ADMIN_EMAIL=admin@example.com
export SERVICE_HOST=business-server
export SERVICE_PORT=port
export API_GATEWAY_URL=http://nebula-auth-server:port
./guides/scripts/register-service.sh
```

#### 使用项目特定脚本登录（可选）

如果您已经创建了项目特定的包装脚本，可以这样使用：

```bash
# 从配置文件读取配置并注册服务
./register-{service-name}.sh admin@example.com

# 覆盖配置文件中的某些配置
./register-{service-name}.sh admin@example.com -h 192.168.1.100 -p 8080

# 使用环境变量覆盖
export SERVICE_HOST=192.168.1.100
./register-{service-name}.sh admin@example.com

# 使用已有 Token 免登陆（适合 CI/CD）
./register-{service-name}.sh --token "eyJhbGc..." --user-id "uuid-here"
```

### 服务注册

执行上述登录命令后，脚本会自动完成服务注册。以下是脚本参数说明：

#### 脚本参数说明

| 参数 | 说明 | 必填 |
|------|------|------|
| `-n, --service-name` | 业务服务名称 | ✅ |
| `-h, --service-host` | 业务服务主机地址 | ✅ |
| `-p, --service-port` | 业务服务端口 | ✅ |
| `-e, --admin-email` | 管理员邮箱（用于登录） | 与手机号二选一 |
| `-P, --admin-phone` | 管理员手机号（用于登录） | 与邮箱二选一 |
| `-g, --gateway-url` | API网关地址 | 可选 |
| `--token` | 直接使用管理员Token（跳过登录） | 可选 |
| `--user-id` | 直接使用管理员用户ID | 可选 |

**完整帮助**：运行 `./guides/scripts/register-service.sh --help` 查看所有选项

#### 脚本优势

- ✅ 自动处理验证码发送和登录流程
- ✅ 自动获取用户ID
- ✅ 支持环境变量配置，适合CI/CD集成
- ✅ 友好的错误提示和验证
- ✅ 支持服务已存在时的更新流程

### 验证服务注册

注册完成后，**强烈建议**立即验证服务是否可以通过网关正常访问。

#### 快速验证（推荐）

```bash
# 通过网关测试健康检查接口（一步验证完整链路）
curl http://nebula-auth-server:port/your-service/v1/public/health

# 如果返回正常响应，说明注册成功且网关可以访问服务
# 如果返回 connection refused，可能是网络隔离问题，参考下方"常见问题"
```

**验证成功的标志**：
- ✅ 通过网关访问健康检查接口返回 `200 OK`
- ✅ 响应中包含服务的健康状态信息

#### 详细验证步骤

**1. 查询服务注册信息**

确认服务已成功注册到服务注册中心：

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://nebula-auth-server:port/service-registry/v1/admin/services/your-service
```

**预期响应**：
```json
{
  "service": {
    "id": 1,
    "server_name": "your-service",
    "host": "192.168.1.100",
    "port": 8080,
    "url": "http://192.168.1.100:8080",
    "status": "active",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

**2. 通过网关测试健康检查接口（最重要）**

验证网关可以正常访问服务：

```bash
curl http://nebula-auth-server:port/your-service/v1/public/health
```

**预期响应**：
```json
{
  "status": "ok",
  "service": "your-service",
  "auth_mode": "gateway",
  "timestamp": 1234567890
}
```

**3. 测试其他接口**

```bash
# 测试公开接口
curl http://nebula-auth-server:port/your-service/v1/public/info

# 测试用户接口（需要 Token）
curl -H "Authorization: Bearer $TOKEN" \
  http://nebula-auth-server:port/your-service/v1/user/profile
```

**4. 查看网关日志**

如果验证失败，查看网关日志获取详细信息：

```bash
docker-compose logs api-gateway | grep "your-service"
# 或查看最近的日志
docker-compose logs --tail=50 api-gateway
```

**如果验证失败**：
- 检查服务是否正常运行：`curl http://business-server:port/your-service/health`
- 检查服务注册的 host 是否为实际 IP（不要使用 `127.0.0.1` 或 `localhost`）
- 查看网关日志：`docker-compose logs api-gateway | grep "your-service"`
- 参考下方"常见问题"中的"Docker 网络隔离问题"

## 📝 手动调用 API（备选方式）

如果不想使用脚本，也可以手动调用 API 注册服务：

### 步骤1：发送验证码

```bash
curl -X POST http://nebula-auth-server:port/auth-server/v1/public/send_verification \
  -H "Content-Type: application/json" \
  -d '{
    "code_type": "email",
    "target": "admin@example.com",
    "purpose": "login"
  }'
```

### 步骤2：获取管理员 Token

```bash
ADMIN_TOKEN=$(curl -s -X POST http://nebula-auth-server:port/auth-server/v1/public/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "code": "123456",
    "code_type": "email",
    "purpose": "login"
  }' | jq -r '.data.tokens.access_token')
```

### 步骤3：注册服务

```bash
curl -X POST http://nebula-auth-server:port/service-registry/v1/admin/services \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "server_name": "your-service",
    "host": "your-cloud-ip",
    "port": port,
    "url": "http://business-server:port",
    "user_id": "admin-user-uuid"
  }'
```

### 步骤4：验证服务注册（重要）

注册完成后，**强烈建议**立即验证服务是否可以通过网关正常访问。验证方法请参考上方"验证服务注册"章节。

## 🔄 服务更新和删除

### 更新服务信息

如果服务地址变更，使用更新接口：

```bash
curl -X PUT http://nebula-auth-server:port/service-registry/v1/admin/services/your-service \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "host": "new-ip",
    "port": port,
    "url": "http://business-server:port"
  }'
```

### 删除服务

```bash
curl -X DELETE http://nebula-auth-server:port/service-registry/v1/admin/services/your-service \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## ✅ 健康检查实现

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

可以检查数据库、Redis 等依赖服务的连接状态，返回更详细的健康信息。

## 🔍 验证服务注册

> **提示**：如果您已经按照上面的步骤完成了验证，可以跳过此部分。此部分提供更详细的验证方法。

### 快速验证（推荐）

注册完成后，使用以下命令快速验证：

```bash
# 通过网关测试健康检查接口（一步验证完整链路）
curl http://nebula-auth-server:port/your-service/v1/public/health

# 如果返回正常响应，说明注册成功且网关可以访问服务
```

### 详细验证步骤

#### 1. 查询服务注册信息

确认服务已成功注册到服务注册中心：

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://nebula-auth-server:port/service-registry/v1/admin/services/your-service
```

**预期响应**：
```json
{
  "service": {
    "id": 1,
    "server_name": "your-service",
    "host": "192.168.1.100",
    "port": 8080,
    "url": "http://192.168.1.100:8080",
    "status": "active",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### 2. 通过网关测试健康检查接口（最重要）

验证网关可以正常访问服务：

```bash
curl http://nebula-auth-server:port/your-service/v1/public/health
```

**预期响应**：
```json
{
  "status": "ok",
  "service": "your-service",
  "auth_mode": "gateway",
  "timestamp": 1234567890
}
```

**如果失败**：
- 返回 `connection refused`：可能是网络隔离问题，参考"常见问题"
- 返回 `404`：检查服务名称是否正确
- 返回 `502`：检查服务是否正常运行

#### 3. 测试其他接口

```bash
# 测试公开接口
curl http://nebula-auth-server:port/your-service/v1/public/info

# 测试用户接口（需要 Token）
curl -H "Authorization: Bearer $TOKEN" \
  http://nebula-auth-server:port/your-service/v1/user/profile
```

#### 4. 查看网关日志

如果验证失败，查看网关日志获取详细信息：

```bash
docker-compose logs api-gateway | grep "your-service"
# 或查看最近的日志
docker-compose logs --tail=50 api-gateway
```

## ⚠️ 常见问题

### 服务名重复

如果服务名已存在，会返回错误：

```json
{
  "error": "服务名称 'your-service' 已存在"
}
```

**解决方案**：
1. 使用更新接口更新现有服务信息
2. 或先删除再重新注册

### 服务注册后无法访问

**可能原因**：
1. 服务未正确启动
2. 健康检查接口未实现或返回错误
3. 网络连接问题（**特别是 Docker 网络隔离问题**）
4. 路由配置错误

**排查步骤**：
1. 检查服务是否正常运行
2. 测试健康检查接口：`curl http://business-server:port/your-service/health`
3. 检查服务注册信息是否正确
4. 查看网关日志

### Docker 网络隔离问题（重要）

**问题现象**：
- 网关返回：`dial tcp 127.0.0.1:8082: connect: connection refused`
- 直接访问服务正常：`curl http://127.0.0.1:8082/health` 成功
- 服务在运行，端口正常监听

**根本原因**：
当 NebulaAuth 网关运行在 Docker 容器中，而业务服务运行在宿主机上时：
- 容器内的 `127.0.0.1` 指向容器自身，**不是宿主机**
- 如果服务注册时使用 `127.0.0.1` 或 `localhost`，网关无法连接到宿主机上的服务

**解决方案**：

#### 方案1：使用宿主机实际 IP（推荐）
```bash
# 获取宿主机 IP 地址
# Linux/macOS
ipconfig getifaddr en0  # macOS
# 或
hostname -I | awk '{print $1}'  # Linux

# 使用实际 IP 注册服务
./guides/scripts/register-service.sh \
  -n your-service \
  -h 192.168.1.100 \
  -p 8082 \
  -e admin@example.com
```

#### 方案2：使用 Docker 特殊主机名（Docker Desktop）
```bash
# Docker Desktop 支持 host.docker.internal
./guides/scripts/register-service.sh \
  -n your-service \
  -h host.docker.internal \
  -p 8082 \
  -e admin@example.com
```

#### 方案3：将业务服务也加入 Docker 网络
```bash
# 将服务加入同一个 Docker 网络
docker network connect nebula-auth_nebula-network <your-service-container-id>
```

**验证方法**：
```bash
# 1. 检查服务注册信息
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://<api-gateway-host>:<api-gateway-port>/service-registry/v1/admin/services/your-service

# 2. 测试网关访问
curl http://<api-gateway-host>:<api-gateway-port>/your-service/v1/public/health

# 3. 如果失败，检查网关日志
docker-compose logs api-gateway | grep "your-service"
```

**说明**：
- `<api-gateway-host>` 和 `<api-gateway-port>` 需要根据实际部署环境替换
- Docker 环境示例：`http://nebula-api-gateway:8080`
- 开发环境示例：`http://<api-gateway-host>:<api-gateway-port>`

**预防措施**：
- ✅ 注册服务时使用宿主机实际 IP，不要使用 `127.0.0.1` 或 `localhost`
- ✅ 如果使用 Docker Compose，确保所有服务在同一网络中
- ✅ 生产环境建议使用固定 IP 或域名

## 🔗 CI/CD 集成

在 CI/CD 流程中集成服务注册：

```bash
# 在部署脚本中
export SERVICE_NAME=your-service
export ADMIN_EMAIL=$ADMIN_EMAIL
export SERVICE_HOST=$DEPLOY_HOST
export SERVICE_PORT=$DEPLOY_PORT
export API_GATEWAY_URL=$GATEWAY_URL

# 注册服务
./guides/scripts/register-service.sh
```

## ✅ 检查清单

完成服务注册后，请确认：

- [ ] 服务已部署并启动
- [ ] 健康检查接口正常工作
- [ ] 服务已成功注册到 NebulaAuth
- [ ] 可以通过网关访问服务接口
- [ ] 所有认证级别的接口都能正常工作

## 🔗 下一步

完成服务注册后，您可以：

1. **集成前端**：参考 [前端集成](./06-frontend-integration.md)
2. **测试和调试**：参考 [测试与调试](./07-testing-debugging.md)
3. **生产环境部署**：参考 [生产环境部署](./08-production-deployment.md)

## 📝 相关文档

- [业务接口开发](./04-business-api-development.md) - 业务接口开发指南
- [前端集成](./06-frontend-integration.md) - 前端集成指南
- [脚本使用指南](./tools/scripts-guide.md) - 所有脚本的详细说明
- [API 参考](./reference/api-reference.md) - 服务注册 API 文档

