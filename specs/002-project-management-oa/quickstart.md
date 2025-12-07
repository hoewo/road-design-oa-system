# 快速开始指南: 道路设计公司项目管理系统

**Feature**: 002-project-management-oa  
**Date**: 2025-01-28  
**Purpose**: 帮助开发者快速搭建和运行道路设计公司项目管理系统

## 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React 前端    │    │   Go 后端 API   │    │   PostgreSQL    │
│   (Port 3000)   │◄──►│   (Port 8080)   │◄──►│   (Port 5432)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  MinIO / OSS    │
                       │  (文件存储)     │
                       └─────────────────┘
```

**路由格式**: 所有API遵循统一格式：`/{service}/{version}/{auth_level}/{path}`
- service: `{service}`（本项目服务名：`project-oa`）
- version: `v1`
- auth_level: `public` (无需认证) 或 `user` (需要JWT认证)

**认证机制**: 
- 认证由网关处理，后端从Header中读取用户信息
- Header: `X-User-ID`, `X-User-Username`, `X-User-AppID`, `X-User-SessionID`

**存储方案**: 
- **本地开发**: PostgreSQL + MinIO
- **生产环境**: 阿里云 RDS (PostgreSQL) + 阿里云 OSS
- 通过配置切换存储方案

## 环境要求

### 开发环境
- **Node.js**: 18.0+ (前端开发)
- **Go**: 1.21+ (后端开发)
- **Docker**: 20.0+ (容器化部署)
- **Docker Compose**: 2.0+ (多服务编排)

### 生产环境
- **服务器**: Linux (Ubuntu 20.04+ 推荐)
- **内存**: 最少 4GB，推荐 8GB+
- **存储**: 最少 50GB，推荐 100GB+
- **网络**: 稳定的互联网连接

## 快速启动

### 1. 克隆项目

```bash
git clone <repository-url>
cd road-design-oa-system
```

### 2. 配置环境变量

#### 后端配置

创建 `backend/.env` 文件：

```bash
# 数据库配置（本地开发）
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=project_oa
DB_SSLMODE=disable

# 文件存储配置（本地开发 - MinIO）
STORAGE_TYPE=minio
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=project-oa-files
MINIO_USE_SSL=false

# 生产环境配置示例（阿里云）
# DB_TYPE=rds
# DB_HOST=<rds-endpoint>
# DB_PORT=5432
# DB_USER=<username>
# DB_PASSWORD=<password>
# DB_NAME=project_oa
# DB_SSLMODE=require

# STORAGE_TYPE=oss
# OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
# OSS_ACCESS_KEY_ID=<key>
# OSS_ACCESS_KEY_SECRET=<secret>
# OSS_BUCKET=project-oa-files
# OSS_REGION=cn-hangzhou

# 服务配置
SERVER_PORT=8080
SERVER_HOST=0.0.0.0

# JWT配置（由网关处理，后端仅读取Header）
# 注意：认证由网关处理，后端从Header中读取用户信息
```

#### 前端配置

创建 `frontend/.env` 文件：

```bash
VITE_API_BASE_URL=http://localhost:8080/project-oa/v1
VITE_APP_NAME=道路设计公司项目管理系统
```

### 3. 使用 Docker Compose 启动（推荐）

```bash
# 启动所有服务（数据库、MinIO、后端、前端）
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 4. 访问系统

- **前端应用**: http://localhost:3000
- **后端API**: http://localhost:8080
- **API文档**: http://localhost:8080/swagger
- **MinIO控制台**: http://localhost:9001 (admin/password)

### 5. API 测试

#### 健康检查（无需认证）

```bash
curl http://localhost:8080/project-oa/v1/public/health
```

响应：
```json
{
  "status": "ok",
  "timestamp": "2025-01-28T10:00:00Z"
}
```

#### 获取项目列表（需要认证）

```bash
# 注意：实际使用时，网关会验证JWT Token并注入Header
# 这里仅展示API格式
curl -H "X-User-ID: <user-id>" \
     -H "X-User-Username: <username>" \
     -H "X-User-AppID: <app-id>" \
     -H "X-User-SessionID: <session-id>" \
     http://localhost:8080/project-oa/v1/user/projects
```

## 开发环境搭建

### 后端开发

1. **安装Go依赖**

```bash
cd backend
go mod download
```

2. **配置环境变量**

复制 `env.example` 到 `.env` 并修改配置：

```bash
cp env.example .env
# 编辑 .env 文件
```

3. **启动数据库和MinIO**

```bash
# 使用Docker Compose启动数据库和MinIO
docker-compose up -d postgres minio

# 等待服务启动
sleep 5

# 初始化数据库
docker-compose exec postgres psql -U postgres -c "CREATE DATABASE project_oa;"
```

4. **运行数据库迁移**

```bash
# 安装golang-migrate
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# 运行迁移
migrate -path ./migrations -database "postgres://postgres:postgres@localhost:5432/project_oa?sslmode=disable" up
```

5. **启动后端服务**

```bash
go run cmd/server/main.go
```

后端服务将在 `http://localhost:8080` 启动。

### 前端开发

1. **安装依赖**

```bash
cd frontend
npm install
```

2. **启动开发服务器**

```bash
npm run dev
```

前端应用将在 `http://localhost:3000` 启动。

3. **运行测试**

```bash
# 单元测试
npm test

# E2E测试
npm run test:e2e
```

## 生产环境部署

### 使用部署脚本

1. **配置生产环境变量**

```bash
# 设置SSH连接信息
export DEPLOY_SSH_HOST=<server-ip>
export DEPLOY_SSH_USER=<username>
export DEPLOY_SSH_KEY=<path-to-ssh-key>

# 设置阿里云配置
export OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
export OSS_ACCESS_KEY_ID=<key>
export OSS_ACCESS_KEY_SECRET=<secret>
export OSS_BUCKET=project-oa-files

export RDS_HOST=<rds-endpoint>
export RDS_USER=<username>
export RDS_PASSWORD=<password>
export RDS_DATABASE=project_oa
```

2. **执行部署**

```bash
./deploy.sh
```

部署脚本将：
- 在本地构建Docker镜像
- 通过SSH传输到生产服务器
- 在服务器上执行部署
- 自动执行数据库迁移
- 进行健康检查
- 支持回滚

### 手动部署

1. **构建镜像**

```bash
# 构建后端镜像
cd backend
docker build -t project-oa-backend:latest .

# 构建前端镜像
cd ../frontend
docker build -t project-oa-frontend:latest .
```

2. **配置生产环境**

在生产服务器上创建配置文件：

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  backend:
    image: project-oa-backend:latest
    environment:
      - DB_TYPE=rds
      - DB_HOST=${RDS_HOST}
      - STORAGE_TYPE=oss
      - OSS_ENDPOINT=${OSS_ENDPOINT}
    ports:
      - "8080:8080"
  
  frontend:
    image: project-oa-frontend:latest
    ports:
      - "80:80"
```

3. **启动服务**

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 存储方案切换

### 从本地切换到阿里云

1. **修改环境变量**

```bash
# 数据库
DB_TYPE=rds
DB_HOST=<rds-endpoint>
DB_USER=<username>
DB_PASSWORD=<password>

# 文件存储
STORAGE_TYPE=oss
OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
OSS_ACCESS_KEY_ID=<key>
OSS_ACCESS_KEY_SECRET=<secret>
OSS_BUCKET=project-oa-files
```

2. **重启服务**

```bash
docker-compose restart backend
```

### 从阿里云切换到本地

1. **修改环境变量**

```bash
# 数据库
DB_TYPE=postgresql
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=postgres

# 文件存储
STORAGE_TYPE=minio
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

2. **重启服务**

```bash
docker-compose restart backend
```

## 数据库迁移

### 创建迁移

```bash
# 创建新的迁移文件
migrate create -ext sql -dir ./migrations -seq add_user_table
```

### 执行迁移

```bash
# 本地开发
migrate -path ./migrations -database "postgres://postgres:postgres@localhost:5432/project_oa?sslmode=disable" up

# 生产环境（RDS）
migrate -path ./migrations -database "postgres://user:password@<rds-endpoint>:5432/project_oa?sslmode=require" up
```

### 回滚迁移

```bash
migrate -path ./migrations -database "postgres://postgres:postgres@localhost:5432/project_oa?sslmode=disable" down
```

## 常见问题

### 1. 数据库连接失败

**问题**: 无法连接到数据库

**解决方案**:
- 检查数据库服务是否启动：`docker-compose ps`
- 检查环境变量配置是否正确
- 检查数据库端口是否被占用
- 检查防火墙设置

### 2. 文件上传失败

**问题**: 文件上传到MinIO/OSS失败

**解决方案**:
- 检查存储服务是否启动（MinIO）或配置是否正确（OSS）
- 检查存储服务的访问权限
- 检查文件大小是否超过限制（100MB）
- 检查文件类型是否被禁止

### 3. API认证失败

**问题**: 请求返回401未授权

**解决方案**:
- 确认网关已正确配置并验证JWT Token
- 检查Header是否正确注入（X-User-ID等）
- 检查路由格式是否正确：`/{service}/{version}/{auth_level}/{path}`
- 查看后端日志确认Header读取是否正常

### 4. 存储方案切换后文件无法访问

**问题**: 切换存储方案后，旧文件无法访问

**解决方案**:
- 旧文件路径可能不兼容，需要数据迁移
- 检查文件路径格式是否正确
- 确认新存储方案的访问权限配置

## 下一步

- 查看 [plan.md](./plan.md) 了解完整的技术方案
- 查看 [data-model.md](./data-model.md) 了解数据模型设计
- 查看 [contracts/openapi.yaml](./contracts/openapi.yaml) 了解API规范
- 查看 [auth.md](./auth.md) 了解路由与认证规范

## 技术支持

如有问题，请联系开发团队或查看项目文档。

