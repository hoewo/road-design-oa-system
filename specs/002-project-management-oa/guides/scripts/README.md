# NebulaAuth 使用引导脚本

本目录包含了 NebulaAuth 系统的使用引导脚本，这些脚本作为使用指南的一部分，帮助用户快速完成常见操作。

## 📋 脚本列表

### 👤 用户管理脚本

#### `add-first-admin.sh` - 添加首个管理员脚本

**功能**: 交互式创建或设置首个管理员用户

**用法**: 
```bash
# 直接运行（会自动检测 Docker 环境）
./guides/scripts/add-first-admin.sh

# 或设置环境变量后运行（非 Docker 环境）
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_DB=nebula_auth
export POSTGRES_USER=nebula_admin
export POSTGRES_PASSWORD=your_password
./guides/scripts/add-first-admin.sh
```

**特点**:
- ✅ 自动检测 Docker Compose 环境或直接数据库连接
- ✅ 交互式输入邮箱和用户名
- ✅ 智能检测用户是否存在
- ✅ 如果用户存在，自动设置为管理员
- ✅ 如果用户不存在，自动创建新管理员用户
- ✅ 自动验证设置结果
- ✅ 友好的彩色输出和错误提示

**更多信息**: 参考 [系统部署与初始化](../01-system-setup.md#步骤三创建首个管理员)

#### `init-admin.sql` - SQL 初始化脚本

**功能**: SQL 脚本，适合自动化部署场景

**用法**: 
```bash
# 1. 编辑脚本，修改邮箱和用户名
vim guides/scripts/init-admin.sql

# 2. 使用 Docker Compose 执行
docker-compose exec -T postgres psql -U nebula_admin -d nebula_auth < guides/scripts/init-admin.sql

# 或直接执行
psql -U nebula_admin -d nebula_auth -f guides/scripts/init-admin.sql
```

**更多信息**: 参考 [系统部署与初始化](../01-system-setup.md#步骤三创建首个管理员)

### 🚀 服务注册脚本

#### `register-service.sh` - 业务服务注册脚本

**功能**: 快速注册业务服务到服务注册中心

**用法**: 
```bash
# 基本用法（使用邮箱登录）
./guides/scripts/register-service.sh \
  -n my-service \
  -h localhost \
  -p 3000 \
  -e admin@example.com

# 使用手机号登录
./guides/scripts/register-service.sh \
  -n my-service \
  -h business-server \
  -p port \
  -P 13800138000 \
  -t sms

# 使用已有Token（跳过登录）
./guides/scripts/register-service.sh \
  -n my-service \
  -h localhost \
  -p 3000 \
  --token "eyJhbGc..." \
  --user-id "uuid-here"

# 使用环境变量
export SERVICE_NAME=my-service
export ADMIN_EMAIL=admin@example.com
export SERVICE_HOST=localhost
export SERVICE_PORT=3000
./guides/scripts/register-service.sh
```

**参数说明**:
- `-n, --service-name`: 业务服务名称（必填）
- `-h, --service-host`: 业务服务主机地址（默认: localhost）
- `-p, --service-port`: 业务服务端口（默认: port）
- `-u, --service-url`: 业务服务完整URL（可选，会自动构建）
- `-e, --admin-email`: 管理员邮箱（用于登录）
- `-P, --admin-phone`: 管理员手机号（用于登录，与邮箱二选一）
- `-c, --code`: 验证码（如果不提供，会提示输入）
- `-t, --code-type`: 验证码类型: email 或 sms（默认: email）
- `-g, --gateway-url`: API网关地址（默认: http://nebula-auth-server:port）
- `-a, --auth-url`: 认证服务地址
- `-r, --registry-url`: 服务注册中心地址
- `--token`: 直接使用管理员Token（跳过登录）
- `--user-id`: 直接使用管理员用户ID（跳过获取用户信息）
- `--skip-login`: 跳过登录步骤（需要提供 --token 和 --user-id）

**特点**:
- ✅ 支持环境变量和命令行参数配置
- ✅ 自动发送验证码并登录
- ✅ 自动获取用户ID
- ✅ 支持使用已有Token跳过登录
- ✅ 友好的错误提示和彩色输出

**完整帮助**: 运行 `./guides/scripts/register-service.sh --help` 查看详细说明

**更多信息**: 参考 [服务注册与集成](../05-service-registration.md#方法一使用注册脚本推荐)

## 🎯 使用场景

### 场景一：系统初始化

1. **添加首个管理员**
   ```bash
   ./guides/scripts/add-first-admin.sh
   ```

2. **注册业务服务**
   ```bash
   ./guides/scripts/register-service.sh \
     -n your-service \
     -h business-server \
     -p port \
     -e admin@example.com
   ```

### 场景二：CI/CD 集成

在 CI/CD 流程中使用脚本自动化服务注册：

```bash
# 在部署脚本中
export SERVICE_NAME=your-service
export ADMIN_EMAIL=admin@example.com
export SERVICE_HOST=$DEPLOY_HOST
export SERVICE_PORT=$DEPLOY_PORT
export API_GATEWAY_URL=$GATEWAY_URL

# 注册服务
./guides/scripts/register-service.sh
```

## 📝 注意事项

1. **执行权限**: 确保脚本有执行权限（`chmod +x guides/scripts/*.sh`）
2. **依赖工具**: 脚本需要 `curl` 和 `jq` 工具
3. **环境变量**: 可以通过环境变量配置所有参数
4. **路径**: 脚本路径为 `guides/scripts/`，从项目根目录执行

## 🔗 相关文档

- [系统部署与初始化](../01-system-setup.md) - 系统初始化指南
- [服务注册与集成](../05-service-registration.md) - 服务注册指南
- [脚本使用指南](../tools/scripts-guide.md) - 所有脚本的详细说明
- [服务注册 API 文档](../api/service-registry.md) - API 文档

---

**最后更新**: 2024年

