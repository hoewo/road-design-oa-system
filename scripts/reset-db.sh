#!/bin/bash

# 数据库重置脚本 - 用于开发环境快速重置数据库

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${PROJECT_ROOT}/backend"

# 默认配置
DB_NAME="${DB_NAME:-project_oa}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

echo -e "${RED}========================================${NC}"
echo -e "${RED}  数据库重置工具 (开发环境)${NC}"
echo -e "${RED}========================================${NC}"
echo ""
echo -e "${YELLOW}警告: 此操作将删除数据库中的所有数据！${NC}"
echo ""

# 从 .env 读取配置
if [ -f "${BACKEND_DIR}/.env" ]; then
    source "${BACKEND_DIR}/.env" 2>/dev/null || true
    DB_NAME="${DB_NAME:-project_oa}"
    DB_HOST="${DB_HOST:-localhost}"
    DB_PORT="${DB_PORT:-5432}"
fi

echo "将重置数据库: ${DB_NAME}"
echo "主机: ${DB_HOST}:${DB_PORT}"
echo ""

# 确认操作
read -p "确定要继续吗? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${BLUE}操作已取消${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}开始重置数据库...${NC}"

# 连接到 postgres 数据库并删除目标数据库
psql -h ${DB_HOST} -p ${DB_PORT} -U ${USER} -d postgres <<EOF
-- 断开所有连接
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = '${DB_NAME}'
  AND pid <> pg_backend_pid();

-- 删除数据库
DROP DATABASE IF EXISTS ${DB_NAME};

-- 重新创建数据库
CREATE DATABASE ${DB_NAME};
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  数据库已重置！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${YELLOW}提示: 下次启动时将自动创建表结构${NC}"
else
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}  数据库重置失败${NC}"
    echo -e "${RED}========================================${NC}"
    exit 1
fi
