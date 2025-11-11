# 项目管理OA系统

基于Excel需求的项目管理OA系统，采用React前端和Go后端的现代化Web应用架构。

## 功能特性

- **项目信息管理**: 项目基本信息录入、编辑、查询
- **甲方管理**: 客户信息管理
- **合同管理**: 合同信息跟踪
- **人员配置**: 项目团队管理
- **文件管理**: 文档上传下载
- **财务管理**: 收支记录和统计
- **奖金管理**: 奖金分配跟踪

## 技术栈

### 前端
- React 18 + TypeScript
- Ant Design (UI组件库)
- React Query (数据管理)
- React Router (路由)
- Vite (构建工具)

### 后端
- Go 1.21+ + Gin框架
- GORM (ORM)
- PostgreSQL (数据库)
- MinIO (文件存储)
- JWT (认证)

### 基础设施
- Docker + Docker Compose
- PostgreSQL
- MinIO

## 快速开始

### 使用快速启动脚本 (推荐)

```bash
# 启动所有服务（后端 + 前端）
./start.sh

# 停止所有服务
./stop.sh

# 查看服务日志
tail -f backend.log   # 后端日志
tail -f frontend.log  # 前端日志
```

**注意**: 使用脚本前，请确保 PostgreSQL 和 MinIO 已启动。

### 使用Docker Compose

```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 手动启动

#### 后端

```bash
cd backend

# 安装依赖
go mod download

# 配置环境变量
cp env.example .env
# 编辑 .env 文件

# 启动服务器
go run cmd/server/main.go
```

#### 前端

```bash
cd frontend

# 安装依赖
npm install

# 配置环境变量
cp env.example .env.local
# 编辑 .env.local 文件

# 启动开发服务器
npm run dev
```

## 访问地址

- **前端应用**: http://localhost:3000
- **后端API**: http://localhost:8080
- **MinIO控制台**: http://localhost:9001 (admin/password)

## 开发指南

### 项目结构

```
├── backend/                 # Go后端
│   ├── cmd/server/         # 应用程序入口
│   ├── internal/           # 私有应用程序代码
│   │   ├── models/        # 数据模型
│   │   ├── services/      # 业务逻辑
│   │   ├── handlers/      # HTTP处理器
│   │   ├── middleware/    # 中间件
│   │   └── config/        # 配置
│   ├── pkg/               # 公共库代码
│   └── tests/             # 测试文件
├── frontend/               # React前端
│   ├── src/
│   │   ├── components/    # React组件
│   │   ├── pages/         # 页面组件
│   │   ├── services/      # API服务
│   │   ├── hooks/         # 自定义Hooks
│   │   ├── types/         # TypeScript类型
│   │   └── utils/         # 工具函数
│   └── tests/             # 测试文件
└── docker-compose.yml     # Docker编排文件
```

### 开发命令

```bash
# 前端开发
cd frontend
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm test             # 运行测试
npm run lint         # 代码检查

# 后端开发
cd backend
go run cmd/server/main.go  # 启动服务器
go test ./...              # 运行测试
go mod tidy                # 整理依赖
```

## 测试

### 前端测试

```bash
cd frontend
npm test                    # 单元测试
npm run test:coverage       # 测试覆盖率
npm run test:e2e            # 端到端测试
```

### 后端测试

```bash
cd backend
go test ./...               # 单元测试
go test -cover ./...        # 测试覆盖率
```

## 故障排查

### 数据库迁移错误

如果遇到类似错误：
```
ERROR: could not create unique index "idx_clients_client_name" (SQLSTATE 23505)
```

**解决方案**:
```bash
# 方法 1: 重置数据库（推荐，开发环境）
./scripts/reset-db.sh
./start.sh

# 方法 2: 清理数据目录（完全重置）
./stop.sh
rm -rf .postgresql-data/
./start.sh
```

### 端口占用

如果提示端口被占用：
```bash
# 查找占用端口的进程
lsof -i :3000  # 前端
lsof -i :8080  # 后端
lsof -i :5432  # PostgreSQL
lsof -i :9000  # MinIO

# 终止进程
kill -9 <PID>
```

### 服务无法启动

```bash
# 查看日志
tail -f backend.log
tail -f frontend.log
tail -f postgresql.log

# 重置环境
./stop.sh
./start.sh
```

### 数据库管理

详细的数据库管理命令和脚本，请参考 [scripts/README.md](scripts/README.md)

## 部署

### Docker部署

```bash
# 构建镜像
docker-compose build

# 生产环境部署
docker-compose -f docker-compose.prod.yml up -d
```

### 传统部署

```bash
# 构建前端
cd frontend && npm run build

# 构建后端
cd backend && go build -o bin/server cmd/server/main.go

# 部署到服务器
# 配置Nginx反向代理
# 配置数据库连接
```

## 环境配置

### 后端环境变量

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=project_oa
DB_USER=project_oa_user
DB_PASSWORD=project_oa_password

# JWT配置
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE_HOURS=24

# MinIO配置
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=project-files

# 服务器配置
SERVER_PORT=8080
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

### 前端环境变量

```env
# API配置
REACT_APP_API_BASE_URL=http://localhost:8080/api/v1
REACT_APP_API_TIMEOUT=10000

# 应用配置
REACT_APP_APP_NAME=项目管理OA系统
REACT_APP_VERSION=1.0.0
```

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 联系方式

- 项目链接: [https://github.com/your-username/project-oa-system](https://github.com/your-username/project-oa-system)
- 问题反馈: [Issues](https://github.com/your-username/project-oa-system/issues)
