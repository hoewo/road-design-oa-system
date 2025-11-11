# 快速启动指南

本指南介绍如何使用 `start.sh` 和 `stop.sh` 脚本快速启动和停止项目。

## 前置要求

在使用启动脚本之前，请确保已安装以下依赖：

### 必需环境

1. **Go 1.23+**
   ```bash
   go version  # 检查 Go 版本
   ```

2. **Node.js & npm**
   ```bash
   node --version  # 检查 Node.js 版本
   npm --version   # 检查 npm 版本
   ```

3. **PostgreSQL**
   ```bash
   # macOS (使用 Homebrew)
   brew services start postgresql
   
   # 或使用 PostgreSQL.app
   # 或其他方式启动 PostgreSQL
   ```

4. **MinIO** (可选，用于文件存储)
   ```bash
   # macOS (使用 Homebrew)
   brew install minio
   minio server /path/to/data
   
   # 或使用 Docker
   docker run -p 9000:9000 -p 9001:9001 minio/minio server /data --console-address ":9001"
   ```

## 使用方法

### 启动服务

```bash
# 在项目根目录执行
./start.sh
```

**启动过程：**
1. 检查并创建必要的目录
2. 检查后端和前端服务是否已运行
3. 启动后端 Go 服务（端口 8080）
4. 启动前端开发服务器（端口 3000）
5. 显示服务状态和访问地址

**输出示例：**
```
========================================
  项目管理OA系统 - 启动脚本
========================================

提示: 请确保以下服务已启动:
  - PostgreSQL (默认端口 5432)
  - MinIO (默认端口 9000/9001)

[1/2] 启动后端服务...
  启动 Go 服务器...
  ✓ 后端服务启动成功 (PID: 12345)
  ✓ 后端地址: http://localhost:8080
    日志文件: /path/to/project/backend.log

[2/2] 启动前端服务...
  启动 Vite 开发服务器...
  ✓ 前端服务启动成功 (PID: 12346)
  ✓ 前端地址: http://localhost:3000
    日志文件: /path/to/project/frontend.log

========================================
  所有服务已成功启动！
========================================

访问地址:
  前端应用: http://localhost:3000
  后端API:  http://localhost:8080

日志文件:
  后端日志: /path/to/project/backend.log
  前端日志: /path/to/project/frontend.log

停止服务: ./stop.sh
查看日志: tail -f backend.log 或 tail -f frontend.log
```

### 停止服务

```bash
# 在项目根目录执行
./stop.sh
```

**停止过程：**
1. 读取保存的进程 PID
2. 优雅地关闭前端服务
3. 优雅地关闭后端服务
4. 询问是否清理日志文件

**输出示例：**
```
========================================
  项目管理OA系统 - 停止脚本
========================================

[1/2] 停止前端服务...
  停止 前端服务 (PID: 12346)...
  ✓ 前端服务 已停止

[2/2] 停止后端服务...
  停止 后端服务 (PID: 12345)...
  ✓ 后端服务 已停止

是否清理日志文件? (y/N): 

========================================
  所有服务已停止！
========================================
```

## 查看日志

### 实时查看日志

```bash
# 查看后端日志
tail -f backend.log

# 查看前端日志
tail -f frontend.log

# 同时查看两个日志
tail -f backend.log frontend.log
```

### 搜索日志

```bash
# 搜索错误信息
grep -i error backend.log

# 搜索特定内容
grep "某个关键词" backend.log
```

## 环境配置

### 首次运行

首次运行时，脚本会自动从 `env.example` 复制配置文件：

- 后端: `backend/.env`
- 前端: `frontend/.env.local`

### 自定义配置

**后端配置** (`backend/.env`):
```env
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=project_oa
DB_USER=project_oa_user
DB_PASSWORD=your_password

# JWT配置
JWT_SECRET=your_jwt_secret

# MinIO配置
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# 服务器配置
SERVER_PORT=8080
```

**前端配置** (`frontend/.env.local`):
```env
# API配置
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

## 常见问题

### 1. 端口已被占用

**问题**: 启动时提示端口 3000 或 8080 已被占用

**解决方案**:
```bash
# 查找占用端口的进程
lsof -i :3000  # 前端端口
lsof -i :8080  # 后端端口

# 终止进程
kill -9 <PID>
```

### 2. PostgreSQL 连接失败

**问题**: 后端日志显示数据库连接错误

**解决方案**:
1. 确保 PostgreSQL 已启动
   ```bash
   # macOS
   brew services list | grep postgresql
   ```

2. 检查数据库配置 (`backend/.env`)
3. 创建数据库（如果不存在）
   ```bash
   psql postgres
   CREATE DATABASE project_oa;
   CREATE USER project_oa_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE project_oa TO project_oa_user;
   ```

### 3. MinIO 连接失败

**问题**: 文件上传功能无法使用

**解决方案**:
1. 启动 MinIO 服务
   ```bash
   # 使用 Docker
   docker run -d -p 9000:9000 -p 9001:9001 \
     --name minio \
     -v /path/to/data:/data \
     minio/minio server /data --console-address ":9001"
   ```

2. 访问 MinIO 控制台 (http://localhost:9001)
3. 创建访问密钥并更新 `backend/.env`

### 4. 前端依赖安装失败

**问题**: npm install 失败

**解决方案**:
```bash
cd frontend

# 清理缓存
rm -rf node_modules package-lock.json

# 重新安装
npm install

# 或使用 cnpm (国内)
npm install -g cnpm --registry=https://registry.npmmirror.com
cnpm install
```

### 5. Go 依赖下载缓慢

**问题**: go mod download 很慢

**解决方案**:
```bash
# 使用国内镜像
go env -w GOPROXY=https://goproxy.cn,direct

cd backend
go mod download
```

### 6. 服务无法停止

**问题**: stop.sh 无法停止服务

**解决方案**:
```bash
# 查找相关进程
ps aux | grep "go run"
ps aux | grep "vite"

# 手动终止
kill -9 <PID>

# 清理 PID 文件
rm -rf .pids/
```

## 高级用法

### 仅启动后端

```bash
cd backend
go run cmd/server/main.go
```

### 仅启动前端

```bash
cd frontend
npm run dev
```

### 生产环境构建

```bash
# 构建前端
cd frontend
npm run build

# 构建后端
cd backend
go build -o bin/server cmd/server/main.go
```

### 查看进程状态

```bash
# 查看保存的 PID
cat .pids/backend.pid
cat .pids/frontend.pid

# 检查进程是否运行
ps -p $(cat .pids/backend.pid)
ps -p $(cat .pids/frontend.pid)
```

## 脚本工作原理

### start.sh

1. **检查环境**: 验证 Go 和 npm 是否已安装
2. **配置文件**: 自动复制环境配置模板
3. **依赖安装**: 根据需要安装依赖包
4. **启动服务**: 后台启动服务并保存 PID
5. **健康检查**: 验证服务是否成功启动

### stop.sh

1. **读取 PID**: 从 `.pids/` 目录读取进程 ID
2. **优雅关闭**: 发送 SIGTERM 信号
3. **等待退出**: 给进程时间正常退出
4. **强制终止**: 如果进程未响应，使用 SIGKILL
5. **清理文件**: 删除 PID 文件和日志（可选）

## 文件说明

- `start.sh` - 启动脚本
- `stop.sh` - 停止脚本
- `.pids/` - 存储进程 PID 的目录
- `backend.log` - 后端服务日志
- `frontend.log` - 前端服务日志
- `backend/.env` - 后端环境配置
- `frontend/.env.local` - 前端环境配置

## 注意事项

1. **开发模式**: 这些脚本用于开发环境，不适合生产部署
2. **依赖服务**: 确保 PostgreSQL 和 MinIO 在启动前已运行
3. **端口冲突**: 确保端口 3000 和 8080 未被占用
4. **权限问题**: 脚本需要执行权限 (`chmod +x start.sh stop.sh`)
5. **日志管理**: 定期清理日志文件以节省磁盘空间
6. **数据安全**: 不要提交 `.env` 文件到版本控制

## 性能优化

### 加快启动速度

1. **预安装依赖**
   ```bash
   cd backend && go mod download
   cd frontend && npm install
   ```

2. **使用依赖缓存**
   - Go: `go env -w GOCACHE=/path/to/cache`
   - npm: 使用 `.npmrc` 配置缓存

3. **禁用不必要的功能**
   - 开发时可以暂时禁用 MinIO（修改后端代码）
   - 使用 SQLite 替代 PostgreSQL 进行快速测试

## 技术支持

如遇到问题，请：
1. 查看日志文件 (`backend.log`, `frontend.log`)
2. 检查环境配置文件
3. 确认依赖服务状态
4. 提交 Issue 到项目仓库

