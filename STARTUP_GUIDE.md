# 快速启动指南

本指南介绍如何使用 Docker 在本地或服务器上启动和停止项目。

## 前置要求

- 已安装 **Docker** 和 **Docker Compose**
- 项目根目录存在 **`.env`** 配置文件（可复制 `env.example` 为 `.env` 并修改）

## 本地 Docker 部署（推荐）

```bash
# 在项目根目录执行：编译、构建镜像、启动所有服务
./scripts/deploy-prod.sh --local
```

**流程说明**：脚本会依次完成 Go 后端编译、前端构建、Docker 镜像构建、数据库初始化检查，并分阶段启动 postgres → minio → backend → frontend。首次运行会提示确认。

**常用命令**：

```bash
# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f
docker compose logs -f backend   # 仅后端
docker compose logs -f frontend  # 仅前端

# 停止并移除容器
docker compose down

# 停止但保留数据卷
docker compose stop
```

## 仅启动（镜像已存在时）

若已执行过 `deploy-prod.sh --local` 或已构建好镜像，可直接：

```bash
docker compose up -d
```

## 访问地址

- **前端应用**: http://localhost:3000
- **后端 API**: http://localhost:8082
- **MinIO 控制台**: http://localhost:9001（默认账号 minioadmin/minioadmin）

## 只部署部分服务

```bash
# 仅部署后端（会自动包含 postgres、minio）
./scripts/deploy-prod.sh --local --services backend

# 仅部署前端与后端
./scripts/deploy-prod.sh --local --services backend frontend
```

## 更多说明

- 完整部署流程与参数说明见 [scripts/README.md](scripts/README.md) 中的 deploy-prod.sh 部分
- 生产/远程部署见 [README.md](README.md) 的部署章节
