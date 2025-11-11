#!/bin/bash

# 数据库初始化脚本
# 用于创建 PostgreSQL 用户和数据库

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 默认配置（可以从环境变量或参数覆盖）
DB_NAME="${DB_NAME:-project_oa}"
DB_USER="${DB_USER:-project_oa_user}"
DB_PASSWORD="${DB_PASSWORD:-project_oa_password}"
POSTGRES_USER="${POSTGRES_USER:-$(whoami)}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  PostgreSQL 数据库初始化${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查 PostgreSQL 是否运行
if ! command -v psql &> /dev/null; then
    echo -e "${RED}错误: 未找到 psql 命令，请确保 PostgreSQL 已安装${NC}"
    exit 1
fi

# 检查 PostgreSQL 是否在运行
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo -e "${RED}错误: PostgreSQL 未运行，请先启动 PostgreSQL${NC}"
    echo -e "${YELLOW}启动命令: brew services start postgresql${NC}"
    exit 1
fi

echo -e "${GREEN}✓ PostgreSQL 正在运行${NC}"
echo ""

# 检查用户是否已存在
if psql -h localhost -U "${POSTGRES_USER}" -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1; then
    echo -e "${YELLOW}用户 '${DB_USER}' 已存在${NC}"
else
    echo -e "${BLUE}创建用户 '${DB_USER}'...${NC}"
    # 使用 PGPASSWORD 环境变量避免交互式密码提示
    PGPASSWORD="${POSTGRES_PASSWORD:-}" psql -h localhost -U "${POSTGRES_USER}" -d postgres \
        -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ 用户创建成功${NC}"
    else
        # 如果失败，尝试使用 postgres 用户
        if [ "${POSTGRES_USER}" != "postgres" ]; then
            echo -e "${YELLOW}尝试使用 postgres 用户创建...${NC}"
            psql -h localhost -U postgres -d postgres \
                -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';" 2>/dev/null
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✓ 用户创建成功${NC}"
            else
                echo -e "${RED}✗ 用户创建失败${NC}"
                echo -e "${YELLOW}提示: 请手动创建用户:${NC}"
                echo -e "${YELLOW}  psql -U postgres -c \"CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';\"${NC}"
                exit 1
            fi
        else
            echo -e "${RED}✗ 用户创建失败${NC}"
            exit 1
        fi
    fi
fi

# 检查数据库是否已存在
if psql -h localhost -U "${POSTGRES_USER}" -d postgres -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "${DB_NAME}"; then
    echo -e "${YELLOW}数据库 '${DB_NAME}' 已存在${NC}"
else
    echo -e "${BLUE}创建数据库 '${DB_NAME}'...${NC}"
    psql -h localhost -U "${POSTGRES_USER}" -d postgres \
        -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ 数据库创建成功${NC}"
    else
        # 如果失败，尝试使用 postgres 用户
        if [ "${POSTGRES_USER}" != "postgres" ]; then
            echo -e "${YELLOW}尝试使用 postgres 用户创建...${NC}"
            psql -h localhost -U postgres -d postgres \
                -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" 2>/dev/null
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✓ 数据库创建成功${NC}"
            else
                echo -e "${RED}✗ 数据库创建失败${NC}"
                echo -e "${YELLOW}提示: 请手动创建数据库:${NC}"
                echo -e "${YELLOW}  psql -U postgres -c \"CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};\"${NC}"
                exit 1
            fi
        else
            echo -e "${RED}✗ 数据库创建失败${NC}"
            exit 1
        fi
    fi
fi

# 授予权限（使用 postgres 用户以确保权限足够）
echo -e "${BLUE}设置数据库权限...${NC}"
psql -h localhost -U postgres -d postgres \
    -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 数据库权限设置成功${NC}"
else
    echo -e "${YELLOW}警告: 数据库权限设置可能失败（继续执行）${NC}"
fi

# 授予 schema 权限
echo -e "${BLUE}设置 Schema 权限...${NC}"
psql -h localhost -U postgres -d "${DB_NAME}" \
    -c "GRANT ALL ON SCHEMA public TO ${DB_USER};" 2>/dev/null
psql -h localhost -U postgres -d "${DB_NAME}" \
    -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};" 2>/dev/null
psql -h localhost -U postgres -d "${DB_NAME}" \
    -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_USER};" 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Schema 权限设置成功${NC}"
else
    echo -e "${YELLOW}警告: Schema 权限设置可能失败（继续执行）${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  数据库初始化完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "数据库信息:"
echo -e "  数据库名: ${BLUE}${DB_NAME}${NC}"
echo -e "  用户名: ${BLUE}${DB_USER}${NC}"
echo -e "  密码: ${BLUE}${DB_PASSWORD}${NC}"
echo ""
