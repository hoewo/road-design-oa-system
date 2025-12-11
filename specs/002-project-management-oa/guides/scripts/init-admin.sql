-- NebulaAuth 初始化管理员脚本
-- 参考: guides/adding-first-admin.md
-- 
-- 重要提示：
--   - NebulaAuth 系统使用验证码登录，无需设置密码
--   - 创建管理员后，需要通过发送验证码来登录系统
--   - 每次登录都需要先发送验证码（邮箱或短信），然后使用验证码登录
--
-- 使用方法: 
--   1. 修改下面的邮箱和用户名
--   2. 执行: psql -U nebula_admin -d nebula_auth -f scripts/init-admin.sql
--   或: docker-compose exec -T postgres psql -U nebula_admin -d nebula_auth < scripts/init-admin.sql

-- ============================================
-- 配置区域：请修改以下变量
-- ============================================
-- 管理员邮箱（必填）
\set admin_email 'admin@example.com'

-- 管理员用户名（可选，默认使用邮箱前缀）
\set admin_username 'admin'

-- ============================================
-- 执行脚本
-- ============================================

-- 方法1: 如果用户已存在，将其设置为管理员
UPDATE users 
SET is_admin = true, updated_at = CURRENT_TIMESTAMP 
WHERE email = :'admin_email'
  AND is_admin = false;

-- 方法2: 如果用户不存在，创建新管理员用户
INSERT INTO users (id, email, username, is_active, is_verified, is_admin)
VALUES (
    uuid_generate_v4(),
    :'admin_email',
    :'admin_username',
    true,
    true,
    true
)
ON CONFLICT (email) DO UPDATE 
SET is_admin = true, updated_at = CURRENT_TIMESTAMP;

-- 验证管理员创建
SELECT 
    id, 
    email, 
    username, 
    is_admin, 
    is_active,
    is_verified,
    created_at 
FROM users 
WHERE email = :'admin_email';

-- 显示所有管理员
SELECT 
    id, 
    email, 
    username, 
    is_admin, 
    created_at 
FROM users 
WHERE is_admin = true
ORDER BY created_at;

