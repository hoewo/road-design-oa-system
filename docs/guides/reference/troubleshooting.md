# 故障排除

本文档提供常见问题的排查和解决方案，帮助开发者快速定位和解决问题。

## 🔍 问题1：本地开发时Token验证失败

### 症状

```
验证 Token 失败: connection refused
```

### 可能原因

1. `NEBULA_AUTH_URL` 配置错误
2. NebulaAuth 服务不可访问
3. 网络连接问题

### 解决方案

```bash
# 1. 检查配置
echo $NEBULA_AUTH_URL

# 2. 测试连接
curl http://nebula-auth-server:port/health

# 3. 检查网络
ping your-aliyun-ip

# 4. 检查服务是否运行
docker-compose ps
```

### 预防措施

- 确保 NebulaAuth 服务已启动并可以访问
- 检查环境变量配置是否正确
- 确保网络连接正常

## 🔍 问题2：生产环境无法获取用户信息

### 症状

```
未认证: X-User-ID header 为空
```

### 可能原因

1. 服务未正确注册到 NebulaAuth
2. 路由配置错误
3. 网关未正确转发请求
4. 认证模式配置错误（应该是 `gateway` 模式）

### 解决方案

```bash
# 1. 检查服务注册
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://nebula-auth-server:port/service-registry/v1/admin/services/your-service

# 2. 检查路由
curl -v http://nebula-auth-server:port/your-service/v1/user/profile

# 3. 查看网关日志
docker-compose logs api-gateway

# 4. 检查认证模式
curl http://business-server:port/your-service/health
# 应该返回 auth_mode: "gateway"
```

### 预防措施

- 确保服务已正确注册到 NebulaAuth
- 确保生产环境使用 `gateway` 模式
- 确保客户端通过网关调用服务

## 🔍 问题3：认证模式配置错误导致的问题

### 症状1：双重 CORS 头错误

**错误信息**：
```
[Error] Access-Control-Allow-Origin cannot contain more than one origin.
```

**原因分析**：

在 `self_validate` 模式下，前端错误地请求了网关地址，导致：
1. 请求先到达网关，网关设置了 CORS 头
2. 网关转发请求到业务服务器，业务服务器也设置了 CORS 头
3. 浏览器收到两个 `Access-Control-Allow-Origin` 头，报错

**正确流程**（self_validate 模式）：
```
前端 → 业务服务器（设置 CORS 头）→ 响应
```

**错误流程**（self_validate 模式下错误请求网关）：
```
前端 → 网关（设置 CORS 头）→ 业务服务器（设置 CORS 头）→ 响应（双重 CORS 头）❌
```

**解决方案**：

1. **检查前端配置**：
   ```javascript
   // 开发环境配置（self_validate 模式）
   const config = {
     development: {
       // ✅ 正确：直接请求业务服务器
       apiBaseURL: 'http://business-server:port',
       // ❌ 错误：不要请求网关地址
       // apiBaseURL: 'http://nebula-auth-server:port',
     }
   };
   ```

2. **检查业务服务器认证模式**：
   ```bash
   curl http://business-server:port/your-service/health
   # 应该返回：{"auth_mode": "self_validate"}
   ```

3. **验证配置一致性**：
   - 前端 `API_BASE_URL` = 业务服务器地址
   - 后端 `AUTH_MODE` = `self_validate`
   - 后端 `API_BASE_URL` = 业务服务器地址（用于内部路由）

### 症状2：无法获取用户信息（X-User-ID header 为空）

**错误信息**：
```
未认证: X-User-ID header 为空
```

**原因分析**：

在 `gateway` 模式下，前端直接请求了业务服务器地址，导致：
1. 请求未经过网关，网关无法验证 Token 并注入用户信息
2. 业务服务器期望从 Header 中读取 `X-User-ID`，但 Header 为空
3. 认证中间件返回未认证错误

**正确流程**（gateway 模式）：
```
前端 → 网关（验证 Token，注入用户信息到 Header）→ 业务服务器（从 Header 读取用户信息）→ 响应
```

**错误流程**（gateway 模式下直接请求业务服务器）：
```
前端 → 业务服务器（Header 中没有用户信息）→ 返回未认证错误 ❌
```

**解决方案**：

1. **检查前端配置**：
   ```javascript
   // 生产环境配置（gateway 模式）
   const config = {
     production: {
       // ✅ 正确：请求网关地址
       apiBaseURL: 'http://nebula-auth-server:port',
       // ❌ 错误：不要直接请求业务服务器
       // apiBaseURL: 'http://business-server:port',
     }
   };
   ```

2. **检查业务服务器认证模式**：
   ```bash
   curl http://business-server:port/your-service/health
   # 应该返回：{"auth_mode": "gateway"}
   ```

3. **验证配置一致性**：
   - 前端 `API_BASE_URL` = 网关地址
   - 后端 `AUTH_MODE` = `gateway`
   - 服务已注册到 NebulaAuth

### 症状3：前后端认证模式不一致

**错误信息**：
```
Token 无效
或
未认证
```

**原因分析**：

前后端使用了不同的认证模式，导致认证流程混乱。

**解决方案**：

1. **检查配置一致性**：
   ```bash
   # 检查后端配置
   echo $AUTH_MODE
   
   # 检查前端配置（查看浏览器 Network 面板中的请求地址）
   # 开发环境：应该请求 business-server:port
   # 生产环境：应该请求 nebula-auth-server:port
   ```

2. **配置对照表**：

   | 环境 | 后端 AUTH_MODE | 前端 API_BASE_URL | 说明 |
   |------|---------------|------------------|------|
   | 开发 | `self_validate` | `business-server:port` | 前端直接请求业务服务器 |
   | 生产 | `gateway` | `nebula-auth-server:port` | 前端请求网关地址 |

3. **统一配置管理**：
   - 使用环境变量统一管理配置
   - 确保前后端使用相同的环境标识（development/production）
   - 使用配置验证脚本检查配置一致性

### 预防措施

1. **配置检查清单**：
   - [ ] 开发环境：前端 `API_BASE_URL` 指向业务服务器
   - [ ] 开发环境：后端 `AUTH_MODE` 设置为 `self_validate`
   - [ ] 生产环境：前端 `API_BASE_URL` 指向网关地址
   - [ ] 生产环境：后端 `AUTH_MODE` 设置为 `gateway`
   - [ ] 前后端配置保持一致

2. **配置验证脚本**：
   ```bash
   # 检查配置一致性
   if [ "$AUTH_MODE" = "self_validate" ]; then
     echo "开发环境：前端应该请求业务服务器地址"
   elif [ "$AUTH_MODE" = "gateway" ]; then
     echo "生产环境：前端应该请求网关地址"
   fi
   ```

3. **测试验证**：
   - 开发环境：测试直接请求业务服务器是否正常
   - 生产环境：测试通过网关请求是否正常
   - 检查浏览器 Network 面板，确认请求地址正确

## 🔍 问题4：环境切换后功能异常

### 症状

```
切换环境后，认证失败
```

### 可能原因

1. 环境变量未正确加载
2. 服务未重启
3. 配置缓存问题

### 解决方案

```bash
# 1. 确认环境变量
env | grep AUTH_MODE
env | grep NEBULA_AUTH_URL
env | grep API_BASE_URL

# 2. 重启服务
systemctl restart your-service
# 或使用 Docker
docker-compose restart your-service

# 3. 检查健康检查接口
curl http://business-server:port/your-service/health
# 应该返回当前的 auth_mode

# 4. 清除缓存（如果有）
# 重启相关服务
```

### 预防措施

- 确保环境变量正确配置
- 切换环境后重启服务
- 使用健康检查接口验证配置

## 🔍 问题4：服务注册失败

### 症状

```json
{"error": "服务名称 'your-service' 已存在"}
```

### 解决方案

```bash
# 1. 检查现有服务
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://nebula-auth-server:port/service-registry/v1/admin/services/your-service

# 2. 如果服务存在但配置需要更新，使用 PUT 接口
curl -X PUT http://nebula-auth-server:port/service-registry/v1/admin/services/your-service \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "host": "new-ip",
    "port": port,
    "url": "http://business-server:port"
  }'

# 3. 如果服务不再需要，先删除再注册
curl -X DELETE http://nebula-auth-server:port/service-registry/v1/admin/services/your-service \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 预防措施

- 注册前检查服务名是否已存在
- 使用更新接口更新服务信息，而不是删除后重新注册

## 🔍 问题5：Token过期处理

### 症状

```
Token 无效或已过期
```

### 解决方案

#### 前端处理

```javascript
// 在API请求中检测401错误，自动刷新Token
if (response.status === 401) {
  try {
    await refreshToken();
    // 重新请求
    return await apiRequest(url, options);
  } catch (error) {
    // 刷新失败，跳转到登录页
    window.location.href = '/login';
  }
}
```

#### 后端处理

后端应该返回明确的错误信息：

```go
if !result.Success || !result.Data.Valid {
    c.JSON(http.StatusUnauthorized, gin.H{
        "error": "Token 无效或已过期",
        "code":  "TOKEN_INVALID",
    })
    c.Abort()
    return
}
```

### 预防措施

- 实现Token自动刷新机制
- 在Token即将过期时主动刷新
- 提供友好的错误提示

## 🔍 问题6：健康检查失败

### 症状

```
健康检查接口返回错误或超时
```

### 可能原因

1. 服务未正确启动
2. 健康检查接口未实现
3. 端口配置错误
4. 依赖服务不可用

### 解决方案

```bash
# 1. 检查服务是否运行
systemctl status your-service
# 或
docker-compose ps

# 2. 测试健康检查接口
curl http://business-server:port/your-service/health

# 3. 检查端口配置
netstat -tlnp | grep port

# 4. 检查依赖服务
# 检查数据库、Redis等依赖服务是否正常
```

### 预防措施

- 实现健康检查接口
- 检查依赖服务的连接状态
- 配置合理的超时时间

## 🔍 问题7：性能问题

### 症状

```
请求响应时间过长
```

### 可能原因

1. 使用 `self_validate` 模式（开发模式）
2. 数据库查询慢
3. 网络延迟
4. 缺少缓存

### 解决方案

```bash
# 1. 检查认证模式（生产环境应该使用 gateway 模式）
curl http://business-server:port/your-service/health
# 应该返回 auth_mode: "gateway"

# 2. 优化数据库查询
# 添加索引、优化查询语句

# 3. 使用缓存
# 对频繁查询的数据使用缓存

# 4. 监控性能指标
# 使用 Prometheus 等工具监控性能
```

### 预防措施

- 生产环境必须使用 `gateway` 模式
- 优化数据库查询
- 合理使用缓存
- 监控性能指标

## 🔍 问题8：Docker 网络隔离导致网关无法访问服务

### 症状

```
网关返回：dial tcp 127.0.0.1:8082: connect: connection refused
直接访问正常：curl http://127.0.0.1:8082/health 成功
服务在运行，端口正常监听
```

### 根本原因

**网络隔离问题**：
- NebulaAuth 网关运行在 Docker 容器中（例如：IP `172.19.0.8`）
- 业务服务运行在宿主机上（监听 `127.0.0.1:8082`）
- 容器内的 `127.0.0.1` 指向容器自身，**不是宿主机**
- 网关尝试连接容器内的 `127.0.0.1:8082`，但服务在宿主机上

**架构示意**：
```
┌─────────────────────────────────────┐
│  宿主机 (Host)                      │
│  ┌───────────────────────────────┐ │
│  │ Docker 容器网络                │ │
│  │ ┌───────────────────────────┐ │ │
│  │ │ API Gateway               │ │ │
│  │ │ IP: 172.19.0.8            │ │ │
│  │ │ 尝试连接: 127.0.0.1:8082  │ │ │ ← 连接容器自身，失败！
│  │ └───────────────────────────┘ │ │
│  └───────────────────────────────┘ │
│                                     │
│  project-oa 服务                    │
│  监听: 127.0.0.1:8082              │ ← 在宿主机上
│  ✅ 直接访问正常                    │
└─────────────────────────────────────┘
```

### 解决方案

#### 方案1：使用宿主机实际 IP（推荐）

**步骤**：
1. 获取宿主机 IP 地址：
   ```bash
   # macOS
   ipconfig getifaddr en0
   
   # Linux
   hostname -I | awk '{print $1}'
   
   # 或查看网络接口
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

2. 更新服务注册信息：
   ```bash
   # 使用实际 IP 更新服务注册
   ./guides/scripts/register-service.sh \
     -n your-service \
     -h 192.168.1.100 \
     -p 8082 \
     --token YOUR_TOKEN \
     --user-id YOUR_USER_ID
   ```

**优点**：
- 简单直接，适用于大多数场景
- 不需要修改 Docker 配置

**缺点**：
- IP 地址可能变化（DHCP）
- 需要确保防火墙允许访问

#### 方案2：使用 Docker 特殊主机名（Docker Desktop）

```bash
# Docker Desktop 自动支持 host.docker.internal
./guides/scripts/register-service.sh \
  -n your-service \
  -h host.docker.internal \
  -p 8082 \
  --token YOUR_TOKEN \
  --user-id YOUR_USER_ID
```

**优点**：
- Docker Desktop 自动支持
- 不依赖 IP 地址

**缺点**：
- 仅 Docker Desktop 支持
- Linux 上需要额外配置

#### 方案3：将服务加入 Docker 网络

```bash
# 将业务服务也运行在 Docker 网络中
docker network connect nebula-auth_nebula-network <your-service-container-id>

# 或使用 Docker Compose，确保所有服务在同一网络
```

**优点**：
- 服务间通信更稳定
- 统一管理

**缺点**：
- 需要将服务容器化
- 需要修改部署方式

#### 方案4：使用宿主机网络模式（不推荐）

让网关使用 `host` 网络模式，但这会失去网络隔离的优势。

### 诊断步骤

1. **检查服务注册信息**：
   ```bash
   curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     http://<api-gateway-host>:<api-gateway-port>/service-registry/v1/admin/services/your-service
   # 查看 host 字段是否为 127.0.0.1
   ```

2. **检查网关容器网络**：
   ```bash
   docker inspect nebula-api-gateway | jq -r '.[0].NetworkSettings.Networks'
   ```

3. **测试容器内连接**：
   ```bash
   docker exec nebula-api-gateway ping -c 1 127.0.0.1
   # 如果服务在宿主机，容器内无法访问
   ```

4. **查看网关日志**：
   ```bash
   docker-compose logs api-gateway | grep "connection refused"
   ```

### 预防措施

1. **注册服务时使用实际 IP**：
   - ✅ 使用宿主机实际 IP：`192.168.1.100`
   - ❌ 不要使用 `127.0.0.1` 或 `localhost`

2. **生产环境建议**：
   - 使用固定 IP 或域名
   - 使用负载均衡器
   - 所有服务统一部署方式（都容器化或都不容器化）

3. **开发环境建议**：
   - 使用 Docker Desktop 的 `host.docker.internal`
   - 或使用宿主机实际 IP

### 验证修复

修复后验证：
```bash
# 1. 检查服务注册信息（host 应该是实际 IP）
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://<api-gateway-host>:<api-gateway-port>/service-registry/v1/admin/services/your-service

# 2. 测试网关访问
curl http://<api-gateway-host>:<api-gateway-port>/your-service/v1/public/health

# 3. 应该成功返回服务响应
```

**说明**：
- `<api-gateway-host>` 和 `<api-gateway-port>` 需要根据实际部署环境替换
- Docker 环境示例：`http://nebula-api-gateway:8080`
- 开发环境示例：`http://<api-gateway-host>:<api-gateway-port>`
```

## 🔍 问题9：权限问题

### 症状

```
权限不足或管理员接口无法访问
```

### 可能原因

1. 用户不是管理员
2. Token 不包含管理员权限
3. 网关权限验证失败

### 解决方案

```bash
# 1. 检查用户是否是管理员
# 在数据库中查询
SELECT id, email, is_admin FROM users WHERE email = 'user@example.com';

# 2. 检查Token中的权限信息
curl -X POST http://nebula-auth-server:port/auth-server/v1/internal/validate_token \
  -H "Content-Type: application/json" \
  -d '{"token": "your-token"}'
# 检查返回的 is_admin 字段

# 3. 使用管理员Token测试
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://nebula-auth-server:port/your-service/v1/admin/stats
```

### 预防措施

- 确保用户具有正确的权限
- 使用正确的Token访问接口
- 检查网关权限验证配置

## 🔧 调试技巧

### 查看服务日志

```bash
# systemd 服务
sudo journalctl -u your-service -f

# Docker 服务
docker-compose logs -f your-service

# 查看最近的日志
docker-compose logs --tail=100 your-service
```

### 查看网关日志

```bash
docker-compose logs api-gateway
```

### 测试Token验证

```bash
curl -X POST http://nebula-auth-server:port/auth-server/v1/internal/validate_token \
  -H "Content-Type: application/json" \
  -d '{"token": "your-token"}'
```

### 检查环境变量

```bash
# 检查所有相关环境变量
env | grep -E "AUTH_MODE|NEBULA_AUTH_URL|API_BASE_URL|SERVICE_NAME"
```

### 网络诊断

```bash
# 测试连接
curl -v http://nebula-auth-server:port/health

# 测试DNS解析
nslookup your-aliyun-ip

# 测试端口
telnet nebula-auth-server port
```

## 📚 相关文档

- [测试与调试](../07-testing-debugging.md) - 测试和调试指南
- [最佳实践](./best-practices.md) - 最佳实践和优化建议
- [架构与设计原理](./architecture.md) - 系统架构和设计原理

