# 快速开始指南: 项目管理OA系统

**Feature**: 001-project-management-oa  
**Date**: 2025-01-27  
**Purpose**: 帮助开发者快速搭建和运行项目管理OA系统

## 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React 前端    │    │   Go 后端 API   │    │   PostgreSQL    │
│   (Port 3000)   │◄──►│   (Port 8080)   │◄──►│   (Port 5432)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │     MinIO       │
                       │  (Port 9000)    │
                       └─────────────────┘
```

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

### 2. 使用 Docker Compose 启动

```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 3. 访问系统

- **前端应用**: http://localhost:3000
- **后端API**: http://localhost:8080
- **API文档**: http://localhost:8080/swagger
- **MinIO控制台**: http://localhost:9001 (admin/password)

## 开发环境搭建

### 后端开发

1. **安装Go依赖**

```bash
cd backend
go mod download
```

2. **配置环境变量**

```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库连接等
```

3. **运行数据库迁移**

```bash
go run cmd/migrate/main.go up
```

4. **启动开发服务器**

```bash
go run cmd/server/main.go
```

### 前端开发

1. **安装依赖**

```bash
cd frontend
npm install
```

2. **配置环境变量**

```bash
cp .env.example .env.local
# 编辑 .env.local 文件，配置API地址等
```

3. **启动开发服务器**

```bash
npm start
```

## 数据库初始化

### 1. 创建数据库

```sql
-- 连接到PostgreSQL
psql -U postgres

-- 创建数据库
CREATE DATABASE project_oa;

-- 创建用户
CREATE USER project_oa_user WITH PASSWORD 'your_password';

-- 授权
GRANT ALL PRIVILEGES ON DATABASE project_oa TO project_oa_user;
```

### 2. 运行迁移

```bash
# 使用Go迁移工具
go run cmd/migrate/main.go up

# 或者使用SQL文件
psql -U project_oa_user -d project_oa -f migrations/001_initial_schema.sql
```

### 3. 导入初始数据

```bash
# 从Excel文件导入项目数据
go run cmd/import/main.go --file input/202510/项目管理系统.xlsx
```

## 配置说明

### 后端配置 (.env)

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=project_oa
DB_USER=project_oa_user
DB_PASSWORD=your_password
DB_SSL_MODE=disable

# JWT配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE_HOURS=24

# MinIO配置
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=project-files
MINIO_USE_SSL=false

# 服务器配置
SERVER_PORT=8080
SERVER_HOST=0.0.0.0
CORS_ALLOWED_ORIGINS=http://localhost:3000

# 日志配置
LOG_LEVEL=info
LOG_FORMAT=json
```

### 前端配置 (.env.local)

```env
# API配置
REACT_APP_API_BASE_URL=http://localhost:8080/api/v1
REACT_APP_API_TIMEOUT=10000

# 文件上传配置
REACT_APP_MAX_FILE_SIZE=104857600
REACT_APP_ALLOWED_FILE_TYPES=.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png

# 应用配置
REACT_APP_APP_NAME=项目管理OA系统
REACT_APP_VERSION=1.0.0
```

## 测试

### 后端测试

```bash
cd backend

# 运行单元测试
go test ./...

# 运行集成测试
go test -tags=integration ./...

# 生成测试覆盖率报告
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

### 前端测试

```bash
cd frontend

# 运行单元测试
npm test

# 运行E2E测试
npm run test:e2e

# 生成测试覆盖率报告
npm run test:coverage
```

## 部署

### Docker部署

1. **构建镜像**

```bash
# 构建后端镜像
docker build -t project-oa-backend ./backend

# 构建前端镜像
docker build -t project-oa-frontend ./frontend
```

2. **使用Docker Compose部署**

```bash
# 生产环境部署
docker-compose -f docker-compose.prod.yml up -d
```

### 传统部署

1. **后端部署**

```bash
# 编译后端
cd backend
go build -o bin/server cmd/server/main.go

# 运行后端
./bin/server
```

2. **前端部署**

```bash
# 构建前端
cd frontend
npm run build

# 部署到Web服务器
cp -r build/* /var/www/html/
```

## 常用命令

### 开发命令

```bash
# 启动开发环境
make dev

# 运行测试
make test

# 代码格式化
make fmt

# 代码检查
make lint

# 构建项目
make build
```

### 数据库命令

```bash
# 创建迁移文件
make migrate-create name=add_user_table

# 运行迁移
make migrate-up

# 回滚迁移
make migrate-down

# 重置数据库
make migrate-reset
```

### Docker命令

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f [service_name]

# 进入容器
docker-compose exec [service_name] bash
```

## 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查数据库服务是否启动
   - 验证连接配置是否正确
   - 确认防火墙设置

2. **文件上传失败**
   - 检查MinIO服务状态
   - 验证存储桶权限
   - 确认文件大小限制

3. **前端无法连接后端**
   - 检查CORS配置
   - 验证API地址配置
   - 确认后端服务状态

### 日志查看

```bash
# 查看所有服务日志
docker-compose logs

# 查看特定服务日志
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres
docker-compose logs minio

# 实时查看日志
docker-compose logs -f backend
```

### 性能监控

```bash
# 查看容器资源使用
docker stats

# 查看数据库性能
docker-compose exec postgres psql -U project_oa_user -d project_oa -c "SELECT * FROM pg_stat_activity;"

# 查看API性能
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8080/api/v1/projects
```

## 开发指南

### 代码结构

```
backend/
├── cmd/                 # 应用程序入口
├── internal/           # 私有应用程序代码
│   ├── models/        # 数据模型
│   ├── services/      # 业务逻辑
│   ├── handlers/      # HTTP处理器
│   ├── middleware/    # 中间件
│   └── config/        # 配置
├── pkg/               # 公共库代码
├── tests/             # 测试文件
└── migrations/        # 数据库迁移

frontend/
├── src/
│   ├── components/    # React组件
│   ├── pages/         # 页面组件
│   ├── services/      # API服务
│   ├── hooks/         # 自定义Hooks
│   ├── types/         # TypeScript类型
│   └── utils/         # 工具函数
├── tests/             # 测试文件
└── public/            # 静态资源
```

### 开发流程

1. **创建功能分支**
```bash
git checkout -b feature/new-feature
```

2. **编写测试**
```bash
# 后端测试
go test -run TestNewFeature ./internal/services/

# 前端测试
npm test -- --testNamePattern="NewFeature"
```

3. **实现功能**
```bash
# 后端实现
# 编辑 internal/services/ 相关文件

# 前端实现
# 编辑 src/components/ 相关文件
```

4. **运行测试**
```bash
make test
```

5. **提交代码**
```bash
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature
```

## 联系支持

- **开发团队**: dev@company.com
- **文档**: [项目Wiki](https://github.com/company/project-oa/wiki)
- **问题反馈**: [GitHub Issues](https://github.com/company/project-oa/issues)
