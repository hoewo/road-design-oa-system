#!/bin/bash

# 数据库初始化脚本
# 用于创建数据库、用户和设置权限

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 默认配置
DB_NAME="${DB_NAME:-project_oa}"
DB_USER="${DB_USER:-project_oa_user}"
DB_PASSWORD="${DB_PASSWORD:-project_oa_password}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5433}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  数据库初始化${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查 PostgreSQL 是否运行
check_postgres() {
    if ! command -v psql &> /dev/null; then
        echo -e "${RED}错误: 未找到 psql 命令${NC}"
        echo -e "${YELLOW}请确保 PostgreSQL 客户端已安装${NC}"
        return 1
    fi

    # 尝试连接到 postgres 数据库
    if ! psql -h ${DB_HOST} -p ${DB_PORT} -U ${USER} -d postgres -c '\q' 2>/dev/null; then
        echo -e "${YELLOW}警告: 无法连接到 PostgreSQL${NC}"
        echo -e "${YELLOW}尝试使用不同的认证方式...${NC}"

        # 尝试使用 trust 认证（本地开发环境）
        if ! PGPASSWORD="" psql -h ${DB_HOST} -p ${DB_PORT} -U postgres -d postgres -c '\q' 2>/dev/null; then
            echo -e "${RED}错误: 无法连接到 PostgreSQL${NC}"
            return 1
        fi
    fi

    return 0
}

# 检查数据库是否存在
database_exists() {
    local exists=$(psql -h ${DB_HOST} -p ${DB_PORT} -U ${USER} -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" 2>/dev/null)
    if [ "$exists" = "1" ]; then
        return 0
    else
        return 1
    fi
}

# 检查用户是否存在
user_exists() {
    local exists=$(psql -h ${DB_HOST} -p ${DB_PORT} -U ${USER} -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" 2>/dev/null)
    if [ "$exists" = "1" ]; then
        return 0
    else
        return 1
    fi
}

# 创建数据库用户
create_user() {
    echo -e "${BLUE}创建数据库用户: ${DB_USER}${NC}"

    if user_exists; then
        echo -e "${YELLOW}  用户已存在，跳过创建${NC}"
        return 0
    fi

    psql -h ${DB_HOST} -p ${DB_PORT} -U ${USER} -d postgres <<EOF
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
ALTER USER ${DB_USER} CREATEDB;
EOF

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}  ✓ 用户创建成功${NC}"
        return 0
    else
        echo -e "${RED}  ✗ 用户创建失败${NC}"
        return 1
    fi
}

# 创建数据库
create_database() {
    echo -e "${BLUE}创建数据库: ${DB_NAME}${NC}"

    if database_exists; then
        echo -e "${YELLOW}  数据库已存在${NC}"

        # 询问是否重建（默认 N，任何非 y/Y 的输入都视为不删除）
        read -p "  是否要删除并重建数据库? (y/N): " -n 1 -r
        echo
        # 只有明确输入 y 或 Y 时才删除，其他任何输入（包括空输入、回车、n、N 等）都视为不删除
        if [[ "${REPLY}" =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}  删除旧数据库...${NC}"

            # 断开所有连接
            psql -h ${DB_HOST} -p ${DB_PORT} -U ${USER} -d postgres <<EOF
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = '${DB_NAME}'
  AND pid <> pg_backend_pid();

DROP DATABASE IF EXISTS ${DB_NAME};
EOF

            if [ $? -ne 0 ]; then
                echo -e "${RED}  ✗ 删除数据库失败${NC}"
                return 1
            fi
        else
            # 默认行为：保留现有数据库（包括空输入、n、N 或其他任何字符）
            echo -e "${YELLOW}  保留现有数据库${NC}"
            return 0
        fi
    fi

    # 创建数据库
    psql -h ${DB_HOST} -p ${DB_PORT} -U ${USER} -d postgres <<EOF
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER} ENCODING 'UTF8';
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
EOF

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}  ✓ 数据库创建成功${NC}"
        return 0
    else
        echo -e "${RED}  ✗ 数据库创建失败${NC}"
        return 1
    fi
}

# 主流程
main() {
    echo "数据库配置:"
    echo "  主机: ${DB_HOST}:${DB_PORT}"
    echo "  数据库: ${DB_NAME}"
    echo "  用户: ${DB_USER}"
    echo ""

    # 检查 PostgreSQL
    if ! check_postgres; then
        echo -e "${RED}PostgreSQL 检查失败，退出${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ PostgreSQL 连接正常${NC}"
    echo ""

    # 创建用户
    if ! create_user; then
        echo -e "${RED}用户创建失败，退出${NC}"
        exit 1
    fi

    echo ""

    # 创建数据库
    if ! create_database; then
        echo -e "${RED}数据库创建失败，退出${NC}"
        exit 1
    fi

    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  数据库初始化完成！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "连接信息:"
    echo "  psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME}"
    echo ""
}

# 执行主流程
main
