# 系统部署与初始化

本文档介绍如何部署 NebulaAuth 系统并进行初始化配置，包括数据库初始化、创建管理员账户等步骤。

## 📋 前置条件

在开始之前，请确保：

- 已安装 Docker 和 Docker Compose
- 已克隆 NebulaAuth 项目代码
- 具有服务器访问权限（生产环境）

## 🚀 步骤一：部署 NebulaAuth 系统

### 开发环境部署

```bash
# 1. 进入项目目录
cd nebula-auth

# 2. 复制环境配置文件
cp env.example .env

# 3. 编辑 .env 文件，配置数据库、Redis等参数
# 根据实际情况修改配置值

# 4. 一键部署到开发环境
./scripts/deploy-dev.sh
```

### 生产环境部署

生产环境部署请参考项目根目录的 [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md)，使用 `deploy-prod.sh` 脚本进行部署。

### 验证部署

部署完成后，验证服务是否正常运行：

```bash
# 查看服务状态
docker-compose ps

# 测试健康检查
curl http://nebula-auth-server:port/health

# 查看服务日志
docker-compose logs -f
```

## 🗄️ 步骤二：数据库初始化

NebulaAuth 系统在首次启动时会自动初始化数据库。如果数据库未初始化，可以手动执行初始化脚本：

```bash
# 使用 Docker Compose 执行初始化脚本
docker-compose exec -T postgres psql -U nebula_admin -d nebula_auth < scripts/init-db.sql

# 或直接连接数据库执行
psql -U nebula_admin -d nebula_auth -f scripts/init-db.sql
```

## 👤 步骤三：创建首个管理员

系统部署完成后，需要创建第一个管理员账户才能使用管理员功能。

### 方法一：使用交互式脚本（推荐）

使用提供的交互式脚本，自动处理所有步骤：

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

**脚本功能**：
- ✅ 自动检测 Docker Compose 环境或直接数据库连接
- ✅ 交互式输入邮箱和用户名
- ✅ 智能检测用户是否存在
- ✅ 如果用户存在，自动设置为管理员
- ✅ 如果用户不存在，自动创建新管理员用户
- ✅ 自动验证设置结果

### 方法二：使用 SQL 脚本

适合自动化部署场景：

```bash
# 1. 编辑脚本配置
# 编辑 guides/scripts/init-admin.sql，修改管理员邮箱和用户名

# 2. 执行脚本
docker-compose exec -T postgres psql -U nebula_admin -d nebula_auth < guides/scripts/init-admin.sql
```

### 方法三：手动 SQL 操作

如果用户已存在，直接设置为管理员：

```sql
-- 连接到数据库
docker-compose exec postgres psql -U nebula_admin -d nebula_auth

-- 查看所有用户
SELECT id, email, phone, username, is_admin FROM users;

-- 将用户设置为管理员
UPDATE users 
SET is_admin = true, updated_at = CURRENT_TIMESTAMP 
WHERE email = 'your-email@example.com';

-- 或通过用户ID设置管理员
UPDATE users 
SET is_admin = true, updated_at = CURRENT_TIMESTAMP 
WHERE id = 'user-uuid-here';
```

### 常见问题

**Q: 设置管理员后仍然无法访问管理员接口？**

A: 请检查：
1. 确认 `is_admin` 字段已正确设置为 `true`
2. 确认使用的 Token 是对应用户的 Token
3. 检查 Token 是否过期
4. 尝试清理 Redis 缓存或重启服务

**Q: 如何撤销管理员权限？**

A: 执行以下 SQL：
```sql
UPDATE users 
SET is_admin = false, updated_at = CURRENT_TIMESTAMP 
WHERE email = 'user@example.com';
```

**Q: 可以同时有多个管理员吗？**

A: 可以，系统支持多个管理员账户。

### 验证管理员权限

创建管理员后，需要通过验证码登录获取 Token，然后测试管理员 API：

```bash
# 1. 发送登录验证码
curl -X POST http://nebula-auth-server:port/auth-server/v1/public/send_verification \
  -H "Content-Type: application/json" \
  -d '{
    "code_type": "email",
    "target": "admin@example.com",
    "purpose": "login"
  }'

# 2. 使用验证码登录
curl -X POST http://nebula-auth-server:port/auth-server/v1/public/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "code": "123456",
    "code_type": "email",
    "purpose": "login"
  }'

# 3. 使用管理员 Token 访问管理员接口
curl -X GET http://nebula-auth-server:port/user-service/v1/admin/users \
  -H "Authorization: Bearer <admin_token>"
```

> **重要提示**：NebulaAuth 系统使用**验证码登录**机制，而非传统的密码登录。创建管理员后，需要通过发送验证码来登录，无需设置密码。

## 👥 步骤四：批量创建用户（可选）

如果需要批量创建管理员和普通用户，可以使用以下方法：

### 方法一：SQL 脚本批量导入（推荐，最快）

创建 SQL 脚本批量导入用户：

```sql
-- 批量创建管理员和普通用户

-- 批量创建管理员用户
INSERT INTO users (id, email, phone, username, avatar_url, is_active, is_verified, is_admin, created_at, updated_at)
VALUES
    (uuid_generate_v4(), 'admin1@example.com', NULL, 'admin1', NULL, true, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (uuid_generate_v4(), 'admin2@example.com', NULL, 'admin2', NULL, true, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO UPDATE 
SET is_admin = true, updated_at = CURRENT_TIMESTAMP;

-- 批量创建普通用户
INSERT INTO users (id, email, phone, username, avatar_url, is_active, is_verified, is_admin, created_at, updated_at)
VALUES
    (uuid_generate_v4(), 'user1@example.com', NULL, 'user1', NULL, true, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (uuid_generate_v4(), 'user2@example.com', NULL, 'user2', NULL, true, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (uuid_generate_v4(), NULL, '13800138000', 'user3', NULL, true, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING
ON CONFLICT (phone) DO NOTHING;
```

执行脚本：

```bash
# 使用 Docker Compose
docker-compose exec -T postgres psql -U nebula_admin -d nebula_auth < scripts/batch-create-users.sql

# 或直接执行
psql -U nebula_admin -d nebula_auth -f scripts/batch-create-users.sql
```

### 方法二：通过 API 批量创建

使用 API 批量创建用户，需要手动输入验证码，适合少量用户场景。需要编写脚本调用注册 API，详细实现可以参考批量创建用户的脚本示例。

### 验证批量导入结果

```sql
-- 查看所有管理员
SELECT id, email, phone, username, is_admin, created_at 
FROM users 
WHERE is_admin = true 
ORDER BY created_at DESC;

-- 查看所有普通用户
SELECT id, email, phone, username, is_admin, created_at 
FROM users 
WHERE is_admin = false 
ORDER BY created_at DESC;

-- 统计用户数量
SELECT 
    CASE WHEN is_admin THEN '管理员' ELSE '普通用户' END AS user_type,
    COUNT(*) AS count
FROM users
GROUP BY is_admin;
```

## ✅ 验证系统初始化

完成以上步骤后，验证系统是否已正确初始化：

```bash
# 1. 检查服务健康状态
curl http://nebula-auth-server:port/health

# 2. 检查数据库连接
docker-compose exec postgres psql -U nebula_admin -d nebula_auth -c "SELECT COUNT(*) FROM users WHERE is_admin = true;"

# 3. 测试管理员登录
# 使用步骤三中的登录流程获取管理员 Token
```

## 🔗 下一步

系统初始化完成后，您可以：

1. **开发业务服务**：参考 [业务服务开发准备](./02-service-development-setup.md)
2. **了解系统架构**：参考 [架构与设计原理](./reference/architecture.md)
3. **查看 API 文档**：参考 [API 参考](./reference/api-reference.md)

## 📝 相关文档

- [部署指南](../DEPLOYMENT_GUIDE.md) - 详细的部署说明
- [脚本使用指南](./tools/scripts-guide.md) - 所有脚本的详细说明

## ⚠️ 注意事项

1. **管理员权限验证**：管理员 API 需要 `is_admin = true` 的用户才能访问
2. **缓存清理**：设置管理员后，系统会自动清理 Redis 缓存，但建议重启相关服务以确保生效
3. **安全性**：确保首个管理员账户的邮箱安全
4. **唯一性**：建议至少保留一个管理员账户，避免所有管理员账户被删除导致无法管理

