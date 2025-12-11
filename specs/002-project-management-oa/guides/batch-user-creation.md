# 批量添加管理员和普通用户

## 📋 概述

本文档提供了多种方法来批量创建管理员和普通用户，适用于系统初始化、数据迁移等场景。

## ⚠️ 前置条件

- NebulaAuth 系统已部署并运行
- 数据库已初始化（已执行 `init-db.sql`）
- 具有数据库访问权限

## 🚀 方法一：SQL 脚本批量导入（推荐，最快）

### 创建批量导入 SQL 脚本

创建文件 `scripts/batch-create-users.sql`：

```sql
-- 批量创建管理员和普通用户

-- 批量创建管理员用户
INSERT INTO users (id, email, phone, username, avatar_url, is_active, is_verified, is_admin, created_at, updated_at)
VALUES
    (uuid_generate_v4(), 'admin1@example.com', NULL, 'admin1', NULL, true, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (uuid_generate_v4(), 'admin2@example.com', NULL, 'admin2', NULL, true, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (uuid_generate_v4(), 'admin3@example.com', '13800138001', 'admin3', NULL, true, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO UPDATE 
SET is_admin = true, updated_at = CURRENT_TIMESTAMP;

-- 批量创建普通用户
INSERT INTO users (id, email, phone, username, avatar_url, is_active, is_verified, is_admin, created_at, updated_at)
VALUES
    (uuid_generate_v4(), 'user1@example.com', NULL, 'user1', NULL, true, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (uuid_generate_v4(), 'user2@example.com', NULL, 'user2', NULL, true, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (uuid_generate_v4(), 'user3@example.com', '13800138002', 'user3', NULL, true, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (uuid_generate_v4(), NULL, '13800138003', 'user4', NULL, true, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING
ON CONFLICT (phone) DO NOTHING;

-- 验证创建结果
SELECT 
    CASE 
        WHEN is_admin THEN '管理员'
        ELSE '普通用户'
    END AS user_type,
    id, email, phone, username, is_admin, created_at
FROM users
WHERE email IN (
    'admin1@example.com', 'admin2@example.com', 'admin3@example.com',
    'user1@example.com', 'user2@example.com', 'user3@example.com'
) OR phone IN ('13800138001', '13800138002', '13800138003')
ORDER BY is_admin DESC, created_at DESC;
```

### 执行脚本

```bash
# 使用 Docker Compose
docker-compose exec -T postgres psql -U nebula_admin -d nebula_auth < scripts/batch-create-users.sql

# 或者直接执行
psql -U nebula_admin -d nebula_auth -f scripts/batch-create-users.sql
```

## 📝 方法二：Shell 脚本批量调用 API

### 创建批量导入脚本

创建文件 `scripts/batch-create-users.sh`：

```bash
#!/bin/bash
# scripts/batch-create-users.sh
# 批量创建用户（管理员和普通用户）

set -e

BASE_URL="${BASE_URL:-http://localhost:8080}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查依赖
require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo -e "${RED}错误: 需要命令 '$1'，请先安装后再运行此脚本。${NC}" >&2
    exit 1
  fi
}

require_cmd curl
require_cmd jq

# 用户数据文件格式（JSON）
USERS_FILE="${1:-scripts/users.json}"

if [ ! -f "$USERS_FILE" ]; then
    echo -e "${RED}错误: 用户数据文件不存在: $USERS_FILE${NC}" >&2
    echo "请创建一个 JSON 文件，格式如下："
    cat <<EOF
[
  {
    "email": "admin1@example.com",
    "phone": null,
    "username": "admin1",
    "is_admin": true
  },
  {
    "email": "user1@example.com",
    "phone": null,
    "username": "user1",
    "is_admin": false
  }
]
EOF
    exit 1
fi

echo -e "${GREEN}开始批量创建用户...${NC}"
echo "用户数据文件: $USERS_FILE"
echo "API 地址: $BASE_URL"
echo

# 读取用户数据
users=$(cat "$USERS_FILE" | jq -c '.[]')

success_count=0
fail_count=0

while IFS= read -r user; do
    email=$(echo "$user" | jq -r '.email // empty')
    phone=$(echo "$user" | jq -r '.phone // empty')
    username=$(echo "$user" | jq -r '.username // empty')
    is_admin=$(echo "$user" | jq -r '.is_admin // false')
    
    if [ -z "$email" ] && [ -z "$phone" ]; then
        echo -e "${RED}跳过: 用户必须提供邮箱或手机号${NC}"
        ((fail_count++))
        continue
    fi
    
    account="$email"
    code_type="email"
    if [ -z "$email" ]; then
        account="$phone"
        code_type="sms"
    fi
    
    echo -e "${YELLOW}处理用户: $account (用户名: $username, 管理员: $is_admin)${NC}"
    
    # 发送验证码
    echo "  发送验证码..."
    send_resp=$(curl -sS -X POST "$BASE_URL/auth-server/v1/public/send_verification" \
        -H 'Content-Type: application/json' \
        -d "{\"code_type\":\"$code_type\",\"target\":\"$account\",\"purpose\":\"register\"}")
    
    if [ "$(echo "$send_resp" | jq -r '.success // false')" != "true" ]; then
        echo -e "  ${RED}发送验证码失败: $(echo "$send_resp" | jq -r '.message // .error // "未知错误"')${NC}"
        ((fail_count++))
        continue
    fi
    
    echo "  验证码已发送，请手动输入验证码:"
    read -p "  验证码: " code
    
    # 注册用户
    if [ "$code_type" = "email" ]; then
        reg_payload=$(jq -n \
            --arg email "$email" \
            --arg username "$username" \
            --arg code "$code" \
            --arg code_type "$code_type" \
            '{email:$email, username:$username, code:$code, code_type:$code_type, purpose:"register"}')
    else
        reg_payload=$(jq -n \
            --arg phone "$phone" \
            --arg username "$username" \
            --arg code "$code" \
            --arg code_type "$code_type" \
            '{phone:$phone, username:$username, code:$code, code_type:$code_type, purpose:"register"}')
    fi
    
    reg_resp=$(curl -sS -X POST "$BASE_URL/auth-server/v1/public/register" \
        -H 'Content-Type: application/json' \
        -d "$reg_payload")
    
    if [ "$(echo "$reg_resp" | jq -r '.success // false')" != "true" ]; then
        echo -e "  ${RED}注册失败: $(echo "$reg_resp" | jq -r '.message // .error // "未知错误"')${NC}"
        ((fail_count++))
        continue
    fi
    
    user_id=$(echo "$reg_resp" | jq -r '.data.user.id // empty')
    
    # 如果是管理员，需要更新数据库
    if [ "$is_admin" = "true" ]; then
        echo "  设置为管理员..."
        echo "  提示: 用户已创建，请手动执行 SQL 设置管理员权限:"
        echo "  UPDATE users SET is_admin = true WHERE id = '$user_id';"
    fi
    
    echo -e "  ${GREEN}✓ 用户创建成功: $account (ID: $user_id)${NC}"
    ((success_count++))
    echo
    
done <<< "$users"

echo
echo -e "${GREEN}批量创建完成！${NC}"
echo "成功: $success_count"
echo "失败: $fail_count"
```

### 创建用户数据文件

创建文件 `scripts/users.json`：

```json
[
  {
    "email": "admin1@example.com",
    "phone": null,
    "username": "admin1",
    "is_admin": true
  },
  {
    "email": "admin2@example.com",
    "phone": null,
    "username": "admin2",
    "is_admin": true
  },
  {
    "email": "user1@example.com",
    "phone": null,
    "username": "user1",
    "is_admin": false
  },
  {
    "email": "user2@example.com",
    "phone": null,
    "username": "user2",
    "is_admin": false
  },
  {
    "email": null,
    "phone": "13800138000",
    "username": "user3",
    "is_admin": false
  }
]
```

### 使用方法

```bash
chmod +x scripts/batch-create-users.sh
./scripts/batch-create-users.sh scripts/users.json
```

## 📊 方法三：CSV 格式批量导入

### 创建 CSV 导入脚本

创建文件 `scripts/batch-import-csv.sh`：

```bash
#!/bin/bash
# scripts/batch-import-csv.sh
# 从 CSV 文件批量导入用户

set -e

BASE_URL="${BASE_URL:-http://localhost:8080}"
CSV_FILE="${1:-scripts/users.csv}"

# CSV 格式: email,phone,username,is_admin
# 示例:
# admin1@example.com,,admin1,true
# user1@example.com,,user1,false
# ,13800138000,user2,false

if [ ! -f "$CSV_FILE" ]; then
    echo "错误: CSV 文件不存在: $CSV_FILE"
    echo "CSV 格式: email,phone,username,is_admin"
    exit 1
fi

# 跳过 CSV 标题行，读取数据
tail -n +2 "$CSV_FILE" | while IFS=',' read -r email phone username is_admin; do
    # 清理字段（去除引号和空格）
    email=$(echo "$email" | sed 's/^"//;s/"$//' | xargs)
    phone=$(echo "$phone" | sed 's/^"//;s/"$//' | xargs)
    username=$(echo "$username" | sed 's/^"//;s/"$//' | xargs)
    is_admin=$(echo "$is_admin" | sed 's/^"//;s/"$//' | xargs)
    
    # 构建 SQL
    if [ -n "$email" ]; then
        account="$email"
        account_field="email"
        account_value="'$email'"
    elif [ -n "$phone" ]; then
        account="$phone"
        account_field="phone"
        account_value="'$phone'"
    else
        echo "跳过: 必须提供邮箱或手机号"
        continue
    fi
    
    is_admin_bool="false"
    if [ "$is_admin" = "true" ] || [ "$is_admin" = "1" ]; then
        is_admin_bool="true"
    fi
    
    # 生成 SQL
    sql="INSERT INTO users (id, email, phone, username, is_active, is_verified, is_admin, created_at, updated_at)
         VALUES (
             uuid_generate_v4(),
             $(if [ -n "$email" ]; then echo "'$email'"; else echo "NULL"; fi),
             $(if [ -n "$phone" ]; then echo "'$phone'"; else echo "NULL"; fi),
             '$username',
             true,
             true,
             $is_admin_bool,
             CURRENT_TIMESTAMP,
             CURRENT_TIMESTAMP
         )
         ON CONFLICT ($account_field) DO UPDATE 
         SET is_admin = $is_admin_bool, updated_at = CURRENT_TIMESTAMP;"
    
    echo "处理: $account (用户名: $username, 管理员: $is_admin_bool)"
    
    # 执行 SQL（需要数据库连接）
    docker-compose exec -T postgres psql -U nebula_admin -d nebula_auth -c "$sql"
done

echo "批量导入完成！"
```

### 创建 CSV 文件

创建文件 `scripts/users.csv`：

```csv
email,phone,username,is_admin
admin1@example.com,,admin1,true
admin2@example.com,,admin2,true
user1@example.com,,user1,false
user2@example.com,,user2,false
,13800138000,user3,false
```

### 使用方法

```bash
chmod +x scripts/batch-import-csv.sh
./scripts/batch-import-csv.sh scripts/users.csv
```

## ✅ 验证批量导入结果

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

## ⚠️ 注意事项

1. **数据格式**: 确保邮箱和手机号格式正确，避免重复
2. **冲突处理**: SQL 脚本使用 `ON CONFLICT` 处理重复数据
3. **验证码**: 方法二需要手动输入验证码，适合少量用户
4. **性能**: 方法一（SQL 直接导入）性能最好，适合大量用户
5. **安全性**: 批量导入时注意保护用户隐私信息

## 🔗 相关文档

- [添加首个管理员](./adding-first-admin.md) - 创建第一个管理员
- [应用开发者对接指南](./developer-integration-guide.md) - 了解用户管理 API

## 📞 常见问题

**Q: 批量导入时如何处理重复用户？**

A: SQL 脚本使用 `ON CONFLICT` 子句处理：
- 管理员用户：如果邮箱已存在，会更新 `is_admin` 为 `true`
- 普通用户：如果邮箱或手机号已存在，会跳过（`DO NOTHING`）

**Q: 可以只导入邮箱或只导入手机号吗？**

A: 可以，但每个用户必须至少提供邮箱或手机号之一。

**Q: 批量导入后如何验证？**

A: 使用验证 SQL 查询，或通过管理员 API 查看用户列表。

---

**最后更新**: 2024年

