# 测试与调试

本文档介绍如何测试和调试基于 NebulaAuth 的业务服务，包括本地开发测试、生产环境测试、常见问题排查等。

## 📋 前置条件

在开始测试之前，请确保：

- 业务服务已开发完成（参考 [业务接口开发](./04-business-api-development.md)）
- 已实现认证中间件（参考 [认证中间件实现](./03-auth-middleware.md)）
- 已了解 NebulaAuth 的基本架构

## 🧪 本地开发测试

### 环境配置

本地开发使用 `self_validate` 模式：

```bash
# .env 文件配置
AUTH_MODE=self_validate
API_BASE_URL=http://business-server:port
NEBULA_AUTH_URL=http://nebula-auth-server:port
```

### 测试流程

#### 1. 启动本地服务

```bash
# 加载环境变量
export $(cat .env | xargs)

# 启动服务
go run main.go
# 或
npm start
```

#### 2. 获取测试Token

```bash
# 发送验证码
curl -X POST http://nebula-auth-server:port/auth-server/v1/public/send_verification \
  -H "Content-Type: application/json" \
  -d '{
    "code_type": "email",
    "target": "test@example.com",
    "purpose": "login"
  }'

# 登录获取Token
TOKEN=$(curl -s -X POST http://nebula-auth-server:port/auth-server/v1/public/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "123456",
    "code_type": "email",
    "purpose": "login"
  }' | jq -r '.data.tokens.access_token')
```

#### 3. 测试业务接口

```bash
# 测试健康检查
curl http://business-server:port/your-service/health

# 测试公开接口
curl http://business-server:port/your-service/v1/public/info

# 测试用户接口（需要Token）
curl -H "Authorization: Bearer $TOKEN" \
  http://business-server:port/your-service/v1/user/profile
```

### 常用测试命令

参考代码：`examples/testing/test-commands.sh`

```bash
#!/bin/bash
# 常用测试命令脚本

# 测试健康检查
curl http://business-server:port/your-service/health

# 测试Token验证
curl -X POST http://nebula-auth-server:port/auth-server/v1/internal/validate_token \
  -H "Content-Type: application/json" \
  -d '{"token": "your-token"}'

# 测试用户接口
curl -H "Authorization: Bearer $TOKEN" \
  http://business-server:port/your-service/v1/user/profile

# 检查服务注册状态
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://nebula-auth-server:port/service-registry/v1/admin/services/your-service
```

## 🏭 生产环境测试

### 环境配置

生产环境使用 `gateway` 模式：

```bash
# 系统环境变量配置
AUTH_MODE=gateway
API_BASE_URL=http://nebula-auth-server:port
NEBULA_AUTH_URL=http://nebula-auth-server:port
```

### 测试流程

#### 1. 验证服务注册

```bash
# 查询服务信息
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://nebula-auth-server:port/service-registry/v1/admin/services/your-service
```

#### 2. 测试网关路由

```bash
# 测试公开接口（通过网关）
curl http://nebula-auth-server:port/your-service/v1/public/info

# 测试用户接口（通过网关，需要Token）
curl -H "Authorization: Bearer $TOKEN" \
  http://nebula-auth-server:port/your-service/v1/user/profile
```

#### 3. 查看网关日志

```bash
docker-compose logs api-gateway
```

## 🔍 调试技巧

### 查看当前认证模式

```bash
# 通过健康检查接口查看
curl http://business-server:port/your-service/health
# 响应中包含 auth_mode 字段
```

### 测试Token验证

```bash
# 测试Token是否有效
curl -X POST http://nebula-auth-server:port/auth-server/v1/internal/validate_token \
  -H "Content-Type: application/json" \
  -d '{"token": "your-token"}'
```

### 查看服务日志

```bash
# 查看业务服务日志
docker-compose logs your-service

# 查看网关日志
docker-compose logs api-gateway

# 查看认证服务日志
docker-compose logs auth-server
```

### 检查环境变量

```bash
# 检查环境变量配置
env | grep AUTH_MODE
env | grep NEBULA_AUTH_URL
env | grep API_BASE_URL
```

## ⚠️ 常见问题排查

### 问题1：本地开发时Token验证失败

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
curl http://nebula-auth-server:port/health

# 3. 检查网络
ping your-aliyun-ip
```

### 问题2：生产环境无法获取用户信息

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
  http://nebula-auth-server:port/service-registry/v1/admin/services/your-service

# 2. 检查路由
curl -v http://nebula-auth-server:port/your-service/v1/user/profile

# 3. 查看网关日志
docker-compose logs api-gateway
```

### 问题3：环境切换后功能异常

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
# 或使用 Docker
docker-compose restart your-service

# 3. 检查健康检查接口
curl http://business-server:port/your-service/health
# 应该返回当前的 auth_mode
```

### 问题4：服务注册失败

**症状**：
```json
{"error": "服务名称 'your-service' 已存在"}
```

**解决方案**：
```bash
# 1. 检查现有服务
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://nebula-auth-server:port/service-registry/v1/admin/services/your-service

# 2. 如果服务存在但配置需要更新，使用 PUT 接口
curl -X PUT http://nebula-auth-server:port/service-registry/v1/admin/services/your-service \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"host": "business-server", "port": port, "url": "http://business-server:port"}'

# 3. 如果服务不再需要，先删除再注册
curl -X DELETE http://nebula-auth-server:port/service-registry/v1/admin/services/your-service \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## 🧪 单元测试

### 测试认证中间件

参考代码：`examples/testing/test-middleware-go_test.go`

```go
func TestAuthMiddleware_GatewayMode(t *testing.T) {
    cfg := &config.Config{AuthMode: "gateway"}
    middleware := AuthMiddleware(cfg)
    
    w := httptest.NewRecorder()
    c, _ := gin.CreateTestContext(w)
    c.Request = httptest.NewRequest("GET", "/", nil)
    c.Request.Header.Set("X-User-ID", "test-user-id")
    c.Request.Header.Set("X-User-Username", "testuser")
    
    middleware(c)
    
    assert.Equal(t, "test-user-id", c.GetString("user_id"))
    assert.Equal(t, "testuser", c.GetString("username"))
}
```

## ✅ 测试检查清单

完成测试后，请确认：

- [ ] 本地开发环境测试通过
- [ ] 生产环境测试通过
- [ ] 所有认证级别的接口都能正常工作
- [ ] Token验证正常
- [ ] 错误处理正常
- [ ] 健康检查接口正常

## 🔗 下一步

完成测试后，您可以：

1. **生产环境部署**：参考 [生产环境部署](./08-production-deployment.md)
2. **了解故障排除**：参考 [故障排除](./reference/troubleshooting.md)
3. **了解最佳实践**：参考 [最佳实践](./reference/best-practices.md)

## 📝 相关文档

- [业务接口开发](./04-business-api-development.md) - 业务接口开发指南
- [服务注册与集成](./05-service-registration.md) - 服务注册指南
- [生产环境部署](./08-production-deployment.md) - 生产环境部署指南
- [故障排除](./reference/troubleshooting.md) - 详细的故障排除指南

