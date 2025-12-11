# 如何添加首个管理员

## 📋 概述

在 NebulaAuth 系统初始化后，需要创建第一个管理员账户才能使用管理员功能。本文档提供了多种方法来创建首个管理员。

> **重要提示**：NebulaAuth 系统使用**验证码登录**机制，而非传统的密码登录。创建管理员后，需要通过发送验证码（邮箱或短信）来登录系统，无需设置密码。

## ⚠️ 前置条件

- NebulaAuth 系统已部署并运行
- 数据库已初始化（已执行 `init-db.sql`）
- 已创建至少一个普通用户（通过注册 API 或直接插入数据库）

## 🚀 方法一：通过 SQL 直接设置（推荐，最快）

### 步骤 1：连接到数据库

```bash
# 如果使用 Docker Compose
docker-compose exec postgres psql -U nebula_admin -d nebula_auth

# 或者如果数据库在本地
psql -U nebula_admin -d nebula_auth -h localhost
```

### 步骤 2：查找要设置为管理员的用户

```sql
-- 查看所有用户
SELECT id, email, phone, username, is_admin FROM users;
```

### 步骤 3：将用户设置为管理员

```sql
-- 通过邮箱设置管理员
UPDATE users 
SET is_admin = true, updated_at = CURRENT_TIMESTAMP 
WHERE email = 'your-email@example.com';

-- 或者通过用户ID设置管理员
UPDATE users 
SET is_admin = true, updated_at = CURRENT_TIMESTAMP 
WHERE id = 'user-uuid-here';
```

### 步骤 4：验证设置

```sql
-- 确认用户已设置为管理员
SELECT id, email, username, is_admin FROM users WHERE is_admin = true;
```

## 🔧 方法二：创建初始化脚本

创建一个 SQL 脚本用于初始化管理员：

```sql
-- guides/scripts/init-admin.sql
-- 创建首个管理员用户（如果不存在）

-- 方法1: 如果用户已存在，将其设置为管理员
UPDATE users 
SET is_admin = true, updated_at = CURRENT_TIMESTAMP 
WHERE email = 'admin@example.com'  -- 替换为你的邮箱
  AND is_admin = false;

-- 方法2: 如果用户不存在，创建新管理员用户
INSERT INTO users (id, email, username, is_active, is_verified, is_admin)
VALUES (
    uuid_generate_v4(),
    'admin@example.com',  -- 替换为你的邮箱
    'admin',              -- 替换为你的用户名
    true,
    true,
    true
)
ON CONFLICT (email) DO UPDATE 
SET is_admin = true, updated_at = CURRENT_TIMESTAMP;

-- 验证管理员创建
SELECT id, email, username, is_admin, created_at 
FROM users 
WHERE is_admin = true;
```

然后执行脚本：

```bash
# 使用 Docker Compose
docker-compose exec -T postgres psql -U nebula_admin -d nebula_auth < scripts/init-admin.sql

# 或者直接执行
psql -U nebula_admin -d nebula_auth -f scripts/init-admin.sql
```

## 📝 方法三：先注册用户，再设置为管理员

### 步骤 1：通过 API 注册普通用户

```bash
# 1. 发送验证码
curl -X POST http://localhost:8080/auth-server/v1/public/send_verification \
  -H "Content-Type: application/json" \
  -d '{
    "code_type": "email",
    "target": "admin@example.com",
    "purpose": "register"
  }'

# 2. 注册用户
curl -X POST http://localhost:8080/auth-server/v1/public/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "username": "admin",
    "code": "123456",
    "code_type": "email",
    "purpose": "register"
  }'
```

### 步骤 2：使用方法一或方法二将该用户设置为管理员

## ✅ 验证管理员权限

设置完成后，需要通过**验证码登录**获取 JWT Token，然后测试管理员 API：

### 步骤 1：发送登录验证码

```bash
# 发送邮箱验证码
curl -X POST http://localhost:8080/auth-server/v1/public/send_verification \
  -H "Content-Type: application/json" \
  -d '{
    "code_type": "email",
    "target": "admin@example.com",
    "purpose": "login"
  }'

# 或发送短信验证码
curl -X POST http://localhost:8080/auth-server/v1/public/send_verification \
  -H "Content-Type: application/json" \
  -d '{
    "code_type": "sms",
    "target": "13800138000",
    "purpose": "login"
  }'
```

### 步骤 2：使用验证码登录

```bash
# 使用邮箱验证码登录
curl -X POST http://localhost:8080/auth-server/v1/public/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "code": "123456",
    "code_type": "email",
    "purpose": "login"
  }'

# 响应示例：
# {
#   "success": true,
#   "message": "登录成功",
#   "data": {
#     "tokens": {
#       "access_token": "eyJhbGc...",
#       "refresh_token": "eyJhbGc..."
#     }
#   }
# }
```

### 步骤 3：使用管理员 Token 访问管理员接口

```bash
# 使用管理员 Token 访问管理员接口
curl -X GET http://localhost:8080/user-service/v1/admin/users \
  -H "Authorization: Bearer <admin_token>"
```

> **注意**：系统使用验证码登录，无需设置密码。每次登录都需要先发送验证码，然后使用验证码登录。

## ⚠️ 注意事项

1. **管理员权限验证**: 管理员 API 需要 `is_admin = true` 的用户才能访问
2. **缓存清理**: 设置管理员后，系统会自动清理 Redis 缓存，但建议重启相关服务以确保生效
3. **安全性**: 确保首个管理员账户的邮箱和密码安全
4. **唯一性**: 建议至少保留一个管理员账户，避免所有管理员账户被删除导致无法管理

## 🔗 相关文档

- [批量添加用户](./batch-user-creation.md) - 批量创建管理员和普通用户
- [应用开发者对接指南](./developer-integration-guide.md) - 了解管理员 API 的使用

## 📞 常见问题

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

## 🛠️ 使用提供的脚本

为了简化管理员创建过程，我们提供了两个便捷脚本：

### 方法四：使用交互式脚本（推荐，最简单）

使用 `guides/scripts/add-first-admin.sh` 交互式脚本，自动处理所有步骤：

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

**脚本功能：**
- ✅ 自动检测 Docker Compose 环境或直接数据库连接
- ✅ 交互式输入邮箱和用户名
- ✅ 智能检测用户是否存在
- ✅ 如果用户存在，自动设置为管理员
- ✅ 如果用户不存在，自动创建新管理员用户
- ✅ 自动验证设置结果
- ✅ 友好的彩色输出和错误提示

**使用示例：**
```bash
$ ./guides/scripts/add-first-admin.sh
==============================
NebulaAuth 添加首个管理员
==============================

ℹ 正在测试数据库连接...
✓ 数据库连接成功

ℹ 请输入管理员信息：

邮箱地址: admin@example.com
ℹ 用户已存在: admin@example.com
ℹ 正在将用户设置为管理员...
✓ 用户已成功设置为管理员！

ℹ 正在验证管理员设置...
✓ 验证成功：用户是管理员

用户信息：
 id |        email         | username | is_admin | is_active | is_verified
----+----------------------+----------+----------+-----------+-------------
... | admin@example.com    | admin    | t        | t         | t

==============================
✓ 管理员设置完成！
==============================
```

### 方法五：使用 SQL 脚本

使用 `guides/scripts/init-admin.sql` SQL 脚本，适合自动化部署场景：

**步骤 1：编辑脚本配置**

编辑 `guides/scripts/init-admin.sql`，修改以下变量：

```sql
-- 管理员邮箱（必填）
\set admin_email 'admin@example.com'

-- 管理员用户名（可选，默认使用邮箱前缀）
\set admin_username 'admin'
```

**步骤 2：执行脚本**

```bash
# 使用 Docker Compose
docker-compose exec -T postgres psql -U nebula_admin -d nebula_auth < guides/scripts/init-admin.sql

# 或直接执行
psql -U nebula_admin -d nebula_auth -f guides/scripts/init-admin.sql
```

**脚本功能：**
- ✅ 如果用户已存在，将其设置为管理员
- ✅ 如果用户不存在，创建新管理员用户
- ✅ 自动显示创建结果和所有管理员列表

**注意事项：**
- SQL 脚本使用 psql 变量语法（`\set` 和 `:'variable'`），需要直接使用 `psql` 命令执行
- 如果使用其他数据库客户端，需要手动替换脚本中的变量值
- **登录说明**：创建管理员后，需要通过发送验证码来登录（无需密码）

---

**最后更新**: 2024年

