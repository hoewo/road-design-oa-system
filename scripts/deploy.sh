#!/bin/bash

# 部署脚本
# 用于生产环境部署，支持SSH免密连接、数据库迁移、服务注册等

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${PROJECT_ROOT}/backend"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"

# 默认配置
DEPLOY_HOST="${DEPLOY_HOST:-}"
DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/project-oa}"
SSH_KEY="${SSH_KEY:-}"

# 显示使用说明
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --host HOST         部署目标主机地址（必需）"
    echo "  -u, --user USER          SSH用户名（默认: root）"
    echo "  -p, --path PATH         部署路径（默认: /opt/project-oa）"
    echo "  -k, --key KEY            SSH私钥路径"
    echo "  --skip-migration        跳过数据库迁移"
    echo "  --skip-register         跳过服务注册"
    echo "  --admin-token TOKEN     管理员Token（用于服务注册）"
    echo "  -h, --help              显示帮助信息"
    echo ""
    echo "Environment Variables:"
    echo "  DEPLOY_HOST             部署目标主机"
    echo "  DEPLOY_USER             SSH用户名"
    echo "  DEPLOY_PATH             部署路径"
    echo "  SSH_KEY                 SSH私钥路径"
    echo "  ADMIN_TOKEN             管理员Token"
    echo ""
    echo "Example:"
    echo "  $0 --host 192.168.1.100 --user deploy --path /opt/project-oa"
    exit 1
}

# 解析命令行参数
SKIP_MIGRATION=false
SKIP_REGISTER=false
ADMIN_TOKEN=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--host)
            DEPLOY_HOST="$2"
            shift 2
            ;;
        -u|--user)
            DEPLOY_USER="$2"
            shift 2
            ;;
        -p|--path)
            DEPLOY_PATH="$2"
            shift 2
            ;;
        -k|--key)
            SSH_KEY="$2"
            shift 2
            ;;
        --skip-migration)
            SKIP_MIGRATION=true
            shift
            ;;
        --skip-register)
            SKIP_REGISTER=true
            shift
            ;;
        --admin-token)
            ADMIN_TOKEN="$2"
            shift 2
            ;;
        --help)
            usage
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            usage
            ;;
    esac
done

# 检查必要的参数
if [ -z "$DEPLOY_HOST" ]; then
    echo -e "${RED}Error: DEPLOY_HOST is required${NC}"
    usage
fi

# 构建SSH命令
SSH_CMD="ssh"
if [ -n "$SSH_KEY" ]; then
    SSH_CMD="${SSH_CMD} -i ${SSH_KEY}"
fi
SSH_CMD="${SSH_CMD} ${DEPLOY_USER}@${DEPLOY_HOST}"

# 构建SCP命令
SCP_CMD="scp"
if [ -n "$SSH_KEY" ]; then
    SCP_CMD="${SCP_CMD} -i ${SSH_KEY}"
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  项目管理OA系统 - 部署脚本${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "部署目标: ${GREEN}${DEPLOY_USER}@${DEPLOY_HOST}${NC}"
echo -e "部署路径: ${GREEN}${DEPLOY_PATH}${NC}"
echo ""

# 测试SSH连接
echo -e "${BLUE}[1/6] 测试SSH连接...${NC}"
if ! ${SSH_CMD} "echo 'SSH connection successful'" > /dev/null 2>&1; then
    echo -e "${RED}✗ SSH连接失败${NC}"
    echo -e "${YELLOW}请确保:${NC}"
    echo -e "  1. SSH免密登录已配置"
    echo -e "  2. 主机地址和用户名正确"
    echo -e "  3. SSH密钥路径正确（如果使用）"
    exit 1
fi
echo -e "${GREEN}✓ SSH连接成功${NC}"

# 在远程服务器创建部署目录
echo ""
echo -e "${BLUE}[2/6] 创建部署目录...${NC}"
${SSH_CMD} "mkdir -p ${DEPLOY_PATH}/backend ${DEPLOY_PATH}/frontend ${DEPLOY_PATH}/scripts" || {
    echo -e "${RED}✗ 创建部署目录失败${NC}"
    exit 1
}
echo -e "${GREEN}✓ 部署目录创建成功${NC}"

# 构建前端
echo ""
echo -e "${BLUE}[3/6] 构建前端...${NC}"
cd "${FRONTEND_DIR}"
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}  安装依赖...${NC}"
    npm install
fi
echo -e "${BLUE}  构建生产版本...${NC}"
npm run build
echo -e "${GREEN}✓ 前端构建成功${NC}"

# 上传文件
echo ""
echo -e "${BLUE}[4/6] 上传文件到服务器...${NC}"
echo -e "${BLUE}  上传后端文件...${NC}"
${SCP_CMD} -r "${BACKEND_DIR}"/* "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/backend/" || {
    echo -e "${RED}✗ 上传后端文件失败${NC}"
    exit 1
}

echo -e "${BLUE}  上传前端构建文件...${NC}"
${SCP_CMD} -r "${FRONTEND_DIR}/dist"/* "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/frontend/" || {
    echo -e "${RED}✗ 上传前端文件失败${NC}"
    exit 1
}

echo -e "${BLUE}  上传部署脚本...${NC}"
${SCP_CMD} "${PROJECT_ROOT}/scripts/register-service.sh" "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/scripts/" || {
    echo -e "${YELLOW}  警告: 上传服务注册脚本失败（可忽略）${NC}"
}
${SSH_CMD} "chmod +x ${DEPLOY_PATH}/scripts/register-service.sh" || true

echo -e "${GREEN}✓ 文件上传成功${NC}"

# 数据库迁移
if [ "$SKIP_MIGRATION" = false ]; then
    echo ""
    echo -e "${BLUE}[5/6] 执行数据库迁移...${NC}"
    ${SSH_CMD} "cd ${DEPLOY_PATH}/backend && go run cmd/server/main.go migrate" || {
        echo -e "${YELLOW}  警告: 数据库迁移失败（如果数据库已是最新版本，可忽略）${NC}"
    }
    echo -e "${GREEN}✓ 数据库迁移完成${NC}"
else
    echo ""
    echo -e "${YELLOW}[5/6] 跳过数据库迁移${NC}"
fi

# 服务注册
if [ "$SKIP_REGISTER" = false ] && [ -n "$ADMIN_TOKEN" ]; then
    echo ""
    echo -e "${BLUE}[6/6] 注册服务到NebulaAuth网关...${NC}"
    ${SSH_CMD} "cd ${DEPLOY_PATH} && ADMIN_TOKEN=${ADMIN_TOKEN} ./scripts/register-service.sh" || {
        echo -e "${YELLOW}  警告: 服务注册失败（可手动注册）${NC}"
    }
    echo -e "${GREEN}✓ 服务注册完成${NC}"
else
    echo ""
    if [ "$SKIP_REGISTER" = true ]; then
        echo -e "${YELLOW}[6/6] 跳过服务注册${NC}"
    else
        echo -e "${YELLOW}[6/6] 跳过服务注册（未提供ADMIN_TOKEN）${NC}"
        echo -e "${YELLOW}  提示: 可以稍后手动运行: ADMIN_TOKEN=<token> ${DEPLOY_PATH}/scripts/register-service.sh${NC}"
    fi
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "部署信息:"
echo -e "  后端路径: ${DEPLOY_PATH}/backend"
echo -e "  前端路径: ${DEPLOY_PATH}/frontend"
echo ""
echo -e "下一步:"
echo -e "  1. 在服务器上配置环境变量（.env文件）"
echo -e "  2. 设置 AUTH_MODE=gateway（生产环境）"
echo -e "  3. 启动服务"
echo ""
