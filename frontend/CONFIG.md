# 前端环境变量配置说明

## 环境变量配置

本项目使用 Vite，环境变量需要以 `VITE_` 开头。

### 必需的环境变量

#### 1. VITE_AUTH_MODE（推荐配置）
认证模式，决定API访问方式和地址

- **gateway**: 通过网关访问（默认）
  - API地址自动指向网关：`http://localhost:8080/project-oa/v1`
  - 适用于：生产环境、本地Docker部署网关的开发环境
- **self_validate**: 直接访问后端
  - API地址自动指向后端：`http://localhost:8082/project-oa/v1`
  - 适用于：本地开发，直接访问后端服务

**注意**：如果不配置 `VITE_AUTH_MODE`，默认使用 `gateway` 模式。

#### 2. VITE_API_BASE_URL（可选）
业务API基础地址

- 如果设置了此变量，将优先使用此值（忽略 `VITE_AUTH_MODE` 的自动选择）
- 如果不设置，会根据 `VITE_AUTH_MODE` 自动选择：
  - **gateway模式**: `http://localhost:8080/project-oa/v1`
  - **self_validate模式**: `http://localhost:8082/project-oa/v1`
- **生产环境**: `http://your-aliyun-ip:8080/project-oa/v1`（必须配置）

#### 3. VITE_NEBULA_AUTH_URL
NebulaAuth网关地址（用于登录认证）

- **开发环境**: `http://localhost:8080`
- **生产环境**: `http://your-aliyun-ip:8080`

### 配置方式

#### 方式1：创建 `.env.local` 文件（推荐用于本地开发）

在 `frontend` 目录下创建 `.env.local` 文件：

**Gateway模式（推荐，通过网关访问）：**
```bash
# 认证模式
VITE_AUTH_MODE=gateway

# NebulaAuth网关地址
VITE_NEBULA_AUTH_URL=http://localhost:8080

# API地址会根据 VITE_AUTH_MODE 自动选择，也可以手动指定
# VITE_API_BASE_URL=http://localhost:8080/project-oa/v1
```

**Self_validate模式（直接访问后端）：**
```bash
# 认证模式
VITE_AUTH_MODE=self_validate

# NebulaAuth网关地址（用于登录）
VITE_NEBULA_AUTH_URL=http://localhost:8080

# API地址会根据 VITE_AUTH_MODE 自动选择，也可以手动指定
# VITE_API_BASE_URL=http://localhost:8082/project-oa/v1
```

**注意**：`.env.local` 文件会被 git 忽略，适合存放本地开发配置。

#### 方式2：使用 `env.example` 作为模板

```bash
# 复制示例文件创建 .env.local
cp env.example .env.local

# 然后编辑 .env.local 文件，修改为实际值
```

#### Vite 环境变量文件优先级

Vite 会按以下优先级加载环境变量文件（后面的会覆盖前面的）：

1. `.env.[mode].local` - 模式特定的本地文件（如 `.env.development.local`）
2. `.env.local` - 所有模式的本地文件（**推荐用于本地开发**）
3. `.env.[mode]` - 模式特定文件（如 `.env.development`）
4. `.env` - 默认文件

**推荐做法**：
- 本地开发：使用 `.env.local` 或 `.env.development.local`
- 团队共享配置：使用 `.env.development`（如果需要在团队间共享）
- 示例模板：使用 `env.example`（提交到 git）

#### 方式3：在启动命令中设置（临时）

```bash
VITE_API_BASE_URL=http://localhost:8080/project-oa/v1 \
VITE_NEBULA_AUTH_URL=http://localhost:8080 \
npm run dev
```

### 环境变量优先级

1. `window.__APP_API_BASE_URL__` / `window.__APP_NEBULA_AUTH_URL__` (运行时注入)
2. `import.meta.env.VITE_API_BASE_URL` / `import.meta.env.VITE_NEBULA_AUTH_URL` (Vite环境变量)
3. `process.env.VITE_API_BASE_URL` / `process.env.VITE_NEBULA_AUTH_URL` (Node环境变量)
4. 默认值（**仅开发环境**，生产环境必须配置）

### 环境差异

#### 开发环境
- 如果未配置环境变量，会使用默认值并显示控制台警告
- 默认值：
  - `VITE_API_BASE_URL`: `http://localhost:8080/project-oa/v1`
  - `VITE_NEBULA_AUTH_URL`: `http://localhost:8080`
- 建议：即使有默认值，也建议创建 `.env` 文件进行显式配置

#### 生产环境
- **必须**通过环境变量配置，否则应用启动时会抛出错误
- 不允许使用默认值，确保生产环境配置的明确性
- 配置方式：部署平台的环境变量设置

### 注意事项

1. **`.env` 文件不应提交到版本控制系统**（已在 `.gitignore` 中）
2. **生产环境必须配置环境变量**，否则应用无法启动
3. 修改环境变量后需要重启开发服务器才能生效
4. 开发环境虽然可以使用默认值，但建议显式配置以便团队协作

