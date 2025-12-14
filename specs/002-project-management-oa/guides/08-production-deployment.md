# 生产环境部署

本文档介绍如何将业务服务部署到生产环境，包括环境变量配置、服务部署、服务注册等步骤。

## 📋 前置条件

在生产环境部署之前，请确保：

- 业务服务已开发完成并测试通过（参考 [测试与调试](./07-testing-debugging.md)）
- 已了解生产环境配置要求
- 已准备好生产服务器

## ⚙️ 环境变量配置

### 重要提示

**生产环境必须使用系统环境变量**，不要使用 `.env` 文件。

### 配置方式

#### 方式一：使用 systemd service 文件（推荐）

参考代码：`examples/deployment/systemd-service.example`

创建 `/etc/systemd/system/your-service.service`：

```ini
[Unit]
Description=Your Service
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/opt/your-service
ExecStart=/usr/local/bin/your-service
Restart=always
RestartSec=5

# 环境变量配置（生产环境必须使用系统环境变量）
Environment="NODE_ENV=production"
Environment="AUTH_MODE=gateway"
Environment="NEBULA_AUTH_URL=http://nebula-auth-server:port"
Environment="API_BASE_URL=http://nebula-auth-server:port"
Environment="SERVICE_NAME=your-service"
Environment="SERVICE_PORT=port"
Environment="SERVICE_HOST=your-cloud-ip"

[Install]
WantedBy=multi-user.target
```

#### 方式二：使用 Docker Compose（推荐）

参考代码：`examples/deployment/docker-compose.example.yml`

```yaml
version: '3.8'

services:
  your-service:
    build: .
    ports:
      - "port:port"
    environment:
      - NODE_ENV=production
      - AUTH_MODE=gateway
      - NEBULA_AUTH_URL=http://nebula-auth-server:port
      - API_BASE_URL=http://nebula-auth-server:port
      - SERVICE_NAME=your-service
      - SERVICE_PORT=port
      - SERVICE_HOST=your-cloud-ip
    restart: always
```

#### 方式三：Kubernetes ConfigMap/Secret（推荐用于 K8s 环境）

参考代码：`examples/deployment/kubernetes-configmap.example.yaml`

创建 ConfigMap：

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: your-service-config
data:
  NODE_ENV: "production"
  AUTH_MODE: "gateway"
  NEBULA_AUTH_URL: "http://nebula-auth-server:port"
  API_BASE_URL: "http://nebula-auth-server:port"
  SERVICE_NAME: "your-service"
  SERVICE_PORT: "port"
  SERVICE_HOST: "your-cloud-ip"
```

在 Deployment 中引用：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: your-service
spec:
  template:
    spec:
      containers:
      - name: your-service
        envFrom:
        - configMapRef:
            name: your-service-config
```

### 必需的环境变量

| 环境变量 | 说明 | 示例值 |
|---------|------|--------|
| `NODE_ENV` | 环境标识 | `production` |
| `AUTH_MODE` | 认证模式 | `gateway` |
| `NEBULA_AUTH_URL` | NebulaAuth 服务地址 | `http://nebula-auth-server:port` |
| `API_BASE_URL` | API 基础地址（网关地址） | `http://nebula-auth-server:port` |
| `SERVICE_NAME` | 服务名称 | `your-service` |
| `SERVICE_PORT` | 服务端口 | `port` |
| `SERVICE_HOST` | 服务主机（生产服务器IP） | `your-cloud-ip` |

## 🚀 服务部署步骤

### 步骤1：部署代码到服务器

```bash
# 使用 scp 或其他方式将代码部署到服务器
scp -r your-service user@server:/opt/
```

### 步骤2：构建服务

```bash
# 在服务器上构建服务
cd /opt/your-service
go build -o your-service main.go
# 或使用 Docker
docker build -t your-service:latest .
```

### 步骤3：配置环境变量

选择一种方式配置环境变量（参考上面的配置方式）。

### 步骤4：启动服务

#### 使用 systemd

```bash
# 重载 systemd 配置
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start your-service

# 设置开机自启
sudo systemctl enable your-service

# 查看服务状态
sudo systemctl status your-service
```

#### 使用 Docker Compose

```bash
# 启动服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f your-service
```

### 步骤5：验证部署

```bash
# 测试健康检查接口
curl http://business-server:port/your-service/health

# 应该返回：
# {
#   "status": "ok",
#   "service": "your-service",
#   "auth_mode": "gateway",
#   "timestamp": 1234567890
# }
```

## 📝 服务注册（首次部署）

**重要说明**：服务注册是手动操作，不是业务服务器启动时自动执行的。

### ⚠️ 网络配置注意事项

**重要**：如果 NebulaAuth 网关运行在 Docker 容器中，而业务服务运行在宿主机上：

1. **不要使用 `127.0.0.1` 或 `localhost`**：
   - 容器内的 `127.0.0.1` 指向容器自身，不是宿主机
   - 网关无法连接到宿主机上的服务

2. **使用宿主机实际 IP**：
   ```bash
   # 获取宿主机 IP
   # macOS
   ipconfig getifaddr en0
   
   # Linux
   hostname -I | awk '{print $1}'
   ```

3. **推荐配置**：
   - 生产环境：使用固定 IP 或域名
   - 开发环境：使用 `host.docker.internal`（Docker Desktop）或宿主机 IP

### 使用注册脚本（推荐）

```bash
# 使用注册脚本注册服务
# 注意：使用宿主机实际 IP，不要使用 127.0.0.1
./guides/scripts/register-service.sh \
  -n your-service \
  -h 192.168.1.100 \
  -p port \
  -e admin@example.com
```

### 手动注册

参考 [服务注册与集成](./05-service-registration.md) 文档中的手动注册方法。

### 验证服务注册

```bash
# 查询服务信息
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://nebula-auth-server:port/service-registry/v1/admin/services/your-service

# 测试网关路由
curl http://nebula-auth-server:port/your-service/v1/public/info

# 如果返回 connection refused，检查服务注册的 host 是否为实际 IP
```

## 🔄 服务更新

### 更新服务代码

```bash
# 1. 停止服务
sudo systemctl stop your-service
# 或
docker-compose down

# 2. 更新代码
git pull
# 或重新部署代码

# 3. 重新构建
go build -o your-service main.go
# 或
docker build -t your-service:latest .

# 4. 启动服务
sudo systemctl start your-service
# 或
docker-compose up -d
```

### 更新服务地址

如果服务地址变更，使用更新接口：

```bash
curl -X PUT http://nebula-auth-server:port/service-registry/v1/admin/services/your-service \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "host": "new-ip",
    "port": port,
    "url": "http://new-ip:port"
  }'
```

## 📊 监控和日志

### 服务日志

#### systemd 服务

```bash
# 查看服务日志
sudo journalctl -u your-service -f

# 查看最近的日志
sudo journalctl -u your-service -n 100
```

#### Docker 服务

```bash
# 查看服务日志
docker-compose logs -f your-service

# 查看最近的日志
docker-compose logs --tail=100 your-service
```

### 健康检查监控

定期检查服务健康状态：

```bash
# 健康检查
curl http://business-server:port/your-service/health

# 通过网关检查
curl http://nebula-auth-server:port/your-service/health
```

### 监控指标

如果集成了 Prometheus 等监控系统，可以监控以下指标：

- 服务健康状态
- 请求响应时间
- 错误率
- Token 验证成功率

## ⚠️ 注意事项

### 安全性

1. **使用HTTPS**：生产环境必须使用HTTPS
2. **环境变量安全**：敏感信息使用密钥管理工具（如 Kubernetes Secret）
3. **防火墙配置**：只开放必要的端口

### 性能优化

1. **使用gateway模式**：生产环境必须使用 `gateway` 模式
2. **连接池**：配置数据库和Redis连接池
3. **缓存策略**：合理使用缓存

### 高可用

1. **多实例部署**：部署多个服务实例
2. **负载均衡**：使用负载均衡器分发请求
3. **健康检查**：配置健康检查，自动剔除不健康的实例

## ✅ 部署检查清单

完成生产环境部署后，请确认：

- [ ] 环境变量已正确配置（使用系统环境变量，不使用 `.env` 文件）
- [ ] 服务已成功部署并启动
- [ ] 健康检查接口正常工作
- [ ] 服务已成功注册到 NebulaAuth
- [ ] 可以通过网关访问服务接口
- [ ] 所有认证级别的接口都能正常工作
- [ ] 监控和日志配置正常

## 🔗 下一步

完成生产环境部署后，您可以：

1. **监控服务**：配置监控和告警
2. **优化性能**：参考 [最佳实践](./reference/best-practices.md)
3. **故障排除**：参考 [故障排除](./reference/troubleshooting.md)

## 📝 相关文档

- [服务注册与集成](./05-service-registration.md) - 服务注册指南
- [测试与调试](./07-testing-debugging.md) - 测试和调试指南
- [最佳实践](./reference/best-practices.md) - 部署最佳实践
- [故障排除](./reference/troubleshooting.md) - 故障排除指南

