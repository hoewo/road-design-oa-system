#!/bin/bash

# ============================================================================
# 生产环境部署脚本
# ============================================================================
# 功能：
#   - Go 后端服务编译（交叉编译 AMD64）
#   - React 前端应用构建
#   - Docker 镜像构建和打包
#   - 支持本地部署和远程部署两种模式
#   - 分阶段启动服务（避免依赖问题）
#   - 健康检查循环确保服务就绪
#   - 支持 SSH 密钥和密码两种认证方式（远程部署）
# ============================================================================
# 使用方法：
#   本地部署: ./scripts/deploy-prod.sh --local
#   远程部署: ./scripts/deploy-prod.sh (需要配置 PROD_SERVER_HOST 等)
# ============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${PROJECT_ROOT}"

# ============================================================================
# 解析命令行参数
# ============================================================================

DEPLOY_MODE="remote"  # 默认远程部署

while [[ $# -gt 0 ]]; do
    case $1 in
        --local|-l)
            DEPLOY_MODE="local"
            shift
            ;;
        --remote|-r)
            DEPLOY_MODE="remote"
            shift
            ;;
        --help|-h)
            echo "使用方法: $0 [选项]"
            echo ""
            echo "选项:"
            echo "  --local, -l    本地部署（在本地 Docker 环境部署）"
            echo "  --remote, -r   远程部署（默认，需要配置 SSH）"
            echo "  --help, -h     显示帮助信息"
            exit 0
            ;;
        *)
            echo -e "${RED}未知选项: $1${NC}"
            echo "使用 --help 查看帮助信息"
            exit 1
            ;;
    esac
done

# ============================================================================
# 环境变量加载和验证
# ============================================================================

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  加载环境配置${NC}"
echo -e "${BLUE}========================================${NC}"

# 从.env文件加载配置
if [ -f ".env" ]; then
    set -a
    source .env
    set +a
    echo -e "${GREEN}✓ 已加载 .env 配置文件${NC}"
else
    echo -e "${RED}✗ 未找到 .env 配置文件${NC}"
    echo -e "${YELLOW}请复制 env.example 为 .env 并填写配置${NC}"
    exit 1
fi

# 根据部署模式进行不同的验证
if [ "$DEPLOY_MODE" = "local" ]; then
    # 本地部署：检查 Docker 和 Docker Compose
    echo -e "${BLUE}  部署模式: ${GREEN}本地部署${NC}"
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}✗ 未找到 Docker，请先安装 Docker${NC}"
        exit 1
    fi
    
    if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}✗ 未找到 Docker Compose，请先安装 Docker Compose${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Docker 环境检查通过${NC}"
    
    # 本地部署不需要 SSH 配置
    SSH_CMD=""
    SCP_CMD=""
    SSH_TARGET=""
    REMOTE_DIR="${PROJECT_ROOT}"
    AUTH_METHOD="本地部署（无需 SSH）"
    
else
    # 远程部署：检查必要的环境变量
    echo -e "${BLUE}  部署模式: ${GREEN}远程部署${NC}"
    
    required_vars=(
        "PROD_SERVER_HOST"
        "PROD_SERVER_USER"
        "PROD_SERVER_PROJECT_DIR"
    )

    missing_vars=()
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        fi
    done

    if [ ${#missing_vars[@]} -ne 0 ]; then
        echo -e "${RED}✗ 以下环境变量未设置:${NC}"
        for var in "${missing_vars[@]}"; do
            echo -e "${RED}  - $var${NC}"
        done
        echo -e "${YELLOW}提示: 如需本地部署，请使用: $0 --local${NC}"
        exit 1
    fi

    # SSH 认证配置
    SSH_KEY="${PROD_SSH_KEY:-}"
    SSH_PASSWORD="${PROD_SSH_PASSWORD:-}"

    # 检查 SSH 认证方式
    if [ -z "$SSH_KEY" ] && [ -z "$SSH_PASSWORD" ]; then
        echo -e "${RED}✗ 未配置 SSH 认证方式${NC}"
        echo -e "${YELLOW}请在 .env 中设置 PROD_SSH_KEY 或 PROD_SSH_PASSWORD${NC}"
        echo -e "${YELLOW}或使用本地部署: $0 --local${NC}"
        exit 1
    fi

    # 构建 SSH 和 SCP 命令
    if [ -n "$SSH_KEY" ]; then
        SSH_CMD="ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no"
        SCP_CMD="scp -i ${SSH_KEY} -o StrictHostKeyChecking=no"
        AUTH_METHOD="密钥认证"
    elif [ -n "$SSH_PASSWORD" ]; then
        # 检查 sshpass 是否安装
        if ! command -v sshpass &> /dev/null; then
            echo -e "${YELLOW}检测到密码认证，但未安装 sshpass${NC}"
            echo -e "${BLUE}正在尝试安装 sshpass...${NC}"
            if [[ "$OSTYPE" == "darwin"* ]]; then
                if command -v brew &> /dev/null; then
                    brew install hudochenkov/sshpass/sshpass || {
                        echo -e "${RED}✗ 安装 sshpass 失败，请手动安装: brew install hudochenkov/sshpass/sshpass${NC}"
                        exit 1
                    }
                else
                    echo -e "${RED}✗ 未找到 Homebrew，请先安装 Homebrew 或手动安装 sshpass${NC}"
                    exit 1
                fi
            else
                sudo apt-get update && sudo apt-get install -y sshpass || {
                    echo -e "${RED}✗ 安装 sshpass 失败，请手动安装: sudo apt-get install sshpass${NC}"
                    exit 1
                }
            fi
        fi
        SSH_CMD="sshpass -p '${SSH_PASSWORD}' ssh -o StrictHostKeyChecking=no"
        SCP_CMD="sshpass -p '${SSH_PASSWORD}' scp -o StrictHostKeyChecking=no"
        AUTH_METHOD="密码认证"
    fi

    SSH_TARGET="${PROD_SERVER_USER}@${PROD_SERVER_HOST}"
    REMOTE_DIR="${PROD_SERVER_PROJECT_DIR}"
fi

# ============================================================================
# 端口冲突检查
# ============================================================================

check_port_conflicts() {
    local deploy_mode="$1"
    local check_remote=false
    
    if [ "$deploy_mode" = "remote" ]; then
        check_remote=true
    fi
    
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  端口冲突检查${NC}"
    echo -e "${BLUE}========================================${NC}"
    
    # 获取需要检查的端口
    local postgres_port="${POSTGRES_PORT:-5433}"
    local minio_api_port="${MINIO_API_PORT:-9000}"
    local minio_console_port="${MINIO_CONSOLE_PORT:-9001}"
    local server_port="${SERVER_PORT:-8082}"
    local frontend_port="${FRONTEND_PORT:-3000}"
    
    # 定义端口和服务映射（格式：端口:容器名:服务描述）
    local port_checks=(
        "${postgres_port}:project-oa-postgres:PostgreSQL"
        "${minio_api_port}:project-oa-minio:MinIO API"
        "${minio_console_port}:project-oa-minio:MinIO Console"
        "${server_port}:project-oa-backend:Backend"
        "${frontend_port}:project-oa-frontend:Frontend"
    )
    
    local conflicts_found=false
    local conflict_details=()
    
    # 检查每个端口
    for port_check in "${port_checks[@]}"; do
        local port=$(echo "$port_check" | cut -d':' -f1)
        local expected_container=$(echo "$port_check" | cut -d':' -f2)
        local service_name=$(echo "$port_check" | cut -d':' -f3)
        
        echo -e "${BLUE}  检查端口 ${port} (${service_name})...${NC}"
        
        local port_in_use=false
        local conflicting_container=""
        
        # 使用更简单的方法：直接检查端口是否被占用
        # Docker端口映射格式示例：
        # - 0.0.0.0:5433->5432/tcp
        # - [::]:5433->5432/tcp
        # - 0.0.0.0:5433->5432/tcp, 0.0.0.0:9000->9000/tcp
        
        if [ "$check_remote" = true ]; then
            # 远程检查：通过SSH执行docker命令，查找占用该端口的容器
            # 使用临时脚本避免复杂的管道在SSH中执行
            local temp_script="/tmp/check_port_${port}_$$.sh"
            cat > "$temp_script" <<EOF
#!/bin/bash
docker ps --format '{{.Names}}|{{.Ports}}' 2>/dev/null | while IFS='|' read -r name ports; do
  if echo "\$ports" | grep -qE ":${port}->"; then
    echo "\$name"
  fi
done
EOF
            chmod +x "$temp_script"
            ${SCP_CMD} "$temp_script" "${SSH_TARGET}:/tmp/check_port_${port}.sh" >/dev/null 2>&1
            local containers_using_port=$(${SSH_CMD} "${SSH_TARGET}" "bash /tmp/check_port_${port}.sh 2>/dev/null; rm -f /tmp/check_port_${port}.sh" 2>/dev/null || echo "")
            rm -f "$temp_script"
        else
            # 本地检查：直接执行docker命令
            local containers_using_port=$(docker ps --format '{{.Names}}|{{.Ports}}' 2>/dev/null | while IFS='|' read -r name ports; do
                if echo "$ports" | grep -qE ":${port}->"; then
                    echo "$name"
                fi
            done || echo "")
        fi
        
        if [ -n "$containers_using_port" ]; then
            # 检查是否有容器占用该端口
            while IFS= read -r container_name; do
                if [ -n "$container_name" ]; then
                    if [[ "$container_name" != "$expected_container" ]]; then
                        # 端口被其他服务占用，这是冲突
                        port_in_use=true
                        conflicting_container="$container_name"
                        break
                    else
                        # 端口被预期容器占用，这是正常的
                        port_in_use=true
                        conflicting_container=""
                    fi
                fi
            done <<< "$containers_using_port"
        fi
        
        if [ "$port_in_use" = true ]; then
            if [ -n "$conflicting_container" ]; then
                # 发现冲突
                conflicts_found=true
                conflict_details+=("端口 ${port} (${service_name}) 被容器 '${conflicting_container}' 占用（期望: ${expected_container}）")
                echo -e "${RED}    ✗ 冲突: 端口 ${port} 已被容器 '${conflicting_container}' 占用${NC}"
            else
                # 端口被预期容器使用，正常
                echo -e "${GREEN}    ✓ 端口 ${port} 由预期容器 '${expected_container}' 使用${NC}"
            fi
        else
            echo -e "${GREEN}    ✓ 端口 ${port} 未被占用${NC}"
        fi
    done
    
    # 如果发现冲突，显示详细信息并退出
    if [ "$conflicts_found" = true ]; then
        echo ""
        echo -e "${RED}========================================${NC}"
        echo -e "${RED}  端口冲突检测失败${NC}"
        echo -e "${RED}========================================${NC}"
        echo ""
        echo -e "${YELLOW}发现以下端口冲突:${NC}"
        for detail in "${conflict_details[@]}"; do
            echo -e "${RED}  - ${detail}${NC}"
        done
        echo ""
        echo -e "${YELLOW}解决方案:${NC}"
        echo -e "  1. 停止冲突的容器: ${BLUE}docker stop <container_name>${NC}"
        echo -e "  2. 修改 .env 文件中的端口配置:"
        echo -e "     - POSTGRES_PORT=${postgres_port}"
        echo -e "     - MINIO_API_PORT=${minio_api_port}"
        echo -e "     - MINIO_CONSOLE_PORT=${minio_console_port}"
        echo -e "     - SERVER_PORT=${server_port}"
        echo -e "     - FRONTEND_PORT=${frontend_port}"
        echo -e "  3. 或使用不同的端口映射"
        echo ""
        if [ "$check_remote" = true ]; then
            echo -e "${BLUE}查看远程服务器上的容器:${NC}"
            echo -e "  ${BLUE}ssh ${SSH_TARGET} 'docker ps --format \"table {{.Names}}\\t{{.Ports}}\"'${NC}"
        else
            echo -e "${BLUE}查看本地容器:${NC}"
            echo -e "  ${BLUE}docker ps --format \"table {{.Names}}\\t{{.Ports}}\"${NC}"
        fi
        echo ""
        exit 1
    fi
    
    echo ""
    echo -e "${GREEN}✓ 端口冲突检查通过${NC}"
}

# 执行端口冲突检查
check_port_conflicts "$DEPLOY_MODE"

# ============================================================================
# 部署前确认
# ============================================================================

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  部署信息确认${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "项目名称: ${GREEN}road-design-oa-system${NC}"
echo -e "项目类型: ${GREEN}全栈应用（Go 后端 + React 前端）${NC}"
echo -e "技术栈: ${GREEN}Go + React + Docker Compose${NC}"
echo ""
echo -e "服务列表:"
echo -e "  ${GREEN}✓${NC} 应用服务: backend (Go), frontend (React)"
echo -e "  ${GREEN}✓${NC} 基础设施: postgres, minio"
echo ""
echo -e "部署目标:"
if [ "$DEPLOY_MODE" = "local" ]; then
    echo -e "  部署模式: ${GREEN}本地部署${NC}"
    echo -e "  项目目录: ${GREEN}${PROJECT_ROOT}${NC}"
    echo -e "  Docker: ${GREEN}本地 Docker 环境${NC}"
else
    echo -e "  部署模式: ${GREEN}远程部署${NC}"
    echo -e "  服务器: ${GREEN}${SSH_TARGET}${NC}"
    echo -e "  项目目录: ${GREEN}${REMOTE_DIR}${NC}"
    echo -e "  SSH 认证: ${GREEN}${AUTH_METHOD}${NC}"
fi
echo ""
echo -e "特殊功能:"
echo -e "  ${GREEN}✓${NC} Go 后端编译（交叉编译 AMD64）"
echo -e "  ${GREEN}✓${NC} React 前端构建"
echo -e "  ${GREEN}✓${NC} 分阶段启动（postgres → minio → backend → frontend）"
echo -e "  ${GREEN}✓${NC} 健康检查循环"
echo -e "  ${GREEN}✓${NC} 数据库初始化检查"
echo ""

read -p "是否继续部署？(y/N): " -n 1 -r
echo
if [[ ! "$REPLY" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}部署已取消${NC}"
    exit 0
fi

# ============================================================================
# Step 0: 编译构建
# ============================================================================

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Step 0: 编译构建${NC}"
echo -e "${BLUE}========================================${NC}"

# 0.1: Go 后端编译
echo ""
echo -e "${CYAN}[0.1] 编译 Go 后端服务...${NC}"
if [ -f "scripts/build-services.sh" ]; then
    chmod +x scripts/build-services.sh
    ./scripts/build-services.sh || {
        echo -e "${RED}✗ Go 后端编译失败${NC}"
        exit 1
    }
    echo -e "${GREEN}✓ Go 后端编译成功${NC}"
else
    echo -e "${YELLOW}⚠ 未找到 build-services.sh，将在 Docker 构建时编译${NC}"
fi

# 0.2: React 前端构建
echo ""
echo -e "${CYAN}[0.2] 构建 React 前端应用...${NC}"
cd frontend

# 加载环境变量（Vite 需要 VITE_ 前缀的环境变量在构建时注入）
if [ -f "../.env" ]; then
    echo -e "${BLUE}  加载环境变量...${NC}"
    set -a
    source ../.env
    set +a
    # 显示已加载的 VITE_ 环境变量（隐藏敏感信息）
    echo -e "${BLUE}  已加载 VITE_ 环境变量:${NC}"
    env | grep "^VITE_" | sed 's/=.*/=***/' | sed 's/^/    /' || echo -e "${BLUE}    (无 VITE_ 环境变量)${NC}"
fi

# 检查 node_modules
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}  安装前端依赖...${NC}"
    npm install || {
        echo -e "${RED}✗ 前端依赖安装失败${NC}"
        exit 1
    }
fi

# 构建前端（Vite 会自动读取 VITE_ 开头的环境变量）
echo -e "${BLUE}  执行构建...${NC}"
npm run build || {
    echo -e "${RED}✗ 前端构建失败${NC}"
    exit 1
}

# 检查 dist 目录是否存在
if [ ! -d "dist" ]; then
    echo -e "${RED}✗ 前端构建失败：dist 目录不存在${NC}"
    exit 1
fi

# 检查 dist 目录是否有内容
if [ -z "$(ls -A dist)" ]; then
    echo -e "${RED}✗ 前端构建失败：dist 目录为空${NC}"
    exit 1
fi

DIST_SIZE=$(du -sh dist | cut -f1)
echo -e "${BLUE}  构建产物大小: ${DIST_SIZE}${NC}"

cd "${PROJECT_ROOT}"
echo -e "${GREEN}✓ React 前端构建成功${NC}"

# ============================================================================
# Step 0.5: 配置模板处理（如果需要）
# ============================================================================

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Step 0.5: 配置模板处理${NC}"
echo -e "${BLUE}========================================${NC}"

# 检查 envsubst 是否可用
if ! command -v envsubst &> /dev/null; then
    echo -e "${YELLOW}⚠ envsubst 未安装，跳过配置模板处理${NC}"
else
    # 处理配置模板（如果有）
    template_files=(
        "monitoring/prometheus.yml.template"
        "monitoring/alertmanager.yml.template"
    )
    
    processed=false
    for template in "${template_files[@]}"; do
        if [ -f "$template" ]; then
            output_file="${template%.template}"
            echo -e "${BLUE}  处理模板: ${template}${NC}"
            envsubst < "$template" > "$output_file"
            processed=true
        fi
    done
    
    if [ "$processed" = true ]; then
        echo -e "${GREEN}✓ 配置模板处理完成${NC}"
    else
        echo -e "${BLUE}  未找到配置模板，跳过${NC}"
    fi
fi

# 验证 docker-compose.yml 使用环境变量
echo ""
echo -e "${BLUE}  验证 docker-compose.yml 配置...${NC}"
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}✗ docker-compose.yml 不存在${NC}"
    exit 1
fi

# 确保关键环境变量已设置（用于 docker-compose.yml 中的环境变量替换）
# 这些变量会在 docker compose 启动时自动从 .env 或环境变量中读取
echo -e "${BLUE}  使用环境变量配置（从 .env 加载）${NC}"
echo -e "${GREEN}✓ docker-compose.yml 已就绪（支持环境变量）${NC}"

# ============================================================================
# Step 1: 构建 Docker 镜像
# ============================================================================

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Step 1: 构建 Docker 镜像${NC}"
echo -e "${BLUE}========================================${NC}"

# 设置 Docker 构建平台
export DOCKER_DEFAULT_PLATFORM=linux/amd64

echo -e "${BLUE}  构建平台: linux/amd64${NC}"
echo -e "${BLUE}  开始构建镜像...${NC}"
echo -e "${BLUE}  使用 docker-compose.yml（环境变量已从 .env 加载）${NC}"

# 直接使用 docker-compose.yml（已支持环境变量）
docker compose build --no-cache || {
    echo -e "${RED}✗ Docker 镜像构建失败${NC}"
    exit 1
}

echo -e "${GREEN}✓ Docker 镜像构建成功${NC}"

# ============================================================================
# Step 2: 保存镜像为 tar 文件（仅远程部署需要）
# ============================================================================

if [ "$DEPLOY_MODE" = "remote" ]; then
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  Step 2: 保存镜像为 tar 文件${NC}"
    echo -e "${BLUE}========================================${NC}"

    # 从 docker compose 获取镜像名称（更可靠）
    echo -e "${BLUE}  获取镜像列表...${NC}"
    COMPOSE_IMAGES=$(docker compose config --images 2>/dev/null || echo "")

    if [ -z "$COMPOSE_IMAGES" ]; then
        echo -e "${RED}✗ 无法从 docker-compose.yml 获取镜像列表${NC}"
        exit 1
    fi

    # 解析镜像列表（排除基础镜像，只保留需要构建的镜像）
    IMAGES=()
    while IFS= read -r line; do
        if [ -n "$line" ]; then
            # 排除 postgres 和 minio 等基础镜像（它们不需要保存，可以直接拉取）
            if [[ "$line" != *"postgres"* ]] && [[ "$line" != *"minio"* ]]; then
                IMAGES+=("$line")
            fi
        fi
    done <<< "$COMPOSE_IMAGES"

    if [ ${#IMAGES[@]} -eq 0 ]; then
        echo -e "${RED}✗ 未找到需要保存的镜像${NC}"
        exit 1
    fi

    IMAGES_TAR="/tmp/road-design-oa-images-$(date +%Y%m%d-%H%M%S).tar"

    echo -e "${BLUE}  保存镜像到: ${IMAGES_TAR}${NC}"
    echo -e "${BLUE}  镜像列表:${NC}"
    for image in "${IMAGES[@]}"; do
        echo -e "${BLUE}    - ${image}${NC}"
    done

    docker save "${IMAGES[@]}" -o "${IMAGES_TAR}" || {
        echo -e "${RED}✗ 镜像保存失败${NC}"
        exit 1
    }

    # 获取文件大小
    TAR_SIZE=$(du -h "${IMAGES_TAR}" | cut -f1)
    echo -e "${GREEN}✓ 镜像保存成功 (${TAR_SIZE})${NC}"

    # ============================================================================
    # Step 3: 上传镜像到服务器
    # ============================================================================

    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  Step 3: 上传镜像到服务器${NC}"
    echo -e "${BLUE}========================================${NC}"

    REMOTE_TAR="/tmp/images.tar"

    echo -e "${BLUE}  上传镜像文件...${NC}"
    ${SCP_CMD} "${IMAGES_TAR}" "${SSH_TARGET}:${REMOTE_TAR}" || {
        echo -e "${RED}✗ 镜像上传失败${NC}"
        exit 1
    }

    echo -e "${GREEN}✓ 镜像上传成功${NC}"

    # ============================================================================
    # Step 3.5: 上传配置文件到服务器
    # ============================================================================

    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  Step 3.5: 上传配置文件${NC}"
    echo -e "${BLUE}========================================${NC}"

    # 在远程服务器创建必要的目录
    echo -e "${BLUE}  创建远程目录结构...${NC}"
    ${SSH_CMD} "${SSH_TARGET}" "mkdir -p ${REMOTE_DIR}/scripts ${REMOTE_DIR}/monitoring ${REMOTE_DIR}/frontend" || {
        echo -e "${RED}✗ 创建远程目录失败${NC}"
        exit 1
    }

    # 上传必需文件
    echo -e "${BLUE}  上传配置文件...${NC}"

    # .env 文件（如果存在）
    if [ -f ".env" ]; then
        ${SCP_CMD} ".env" "${SSH_TARGET}:${REMOTE_DIR}/.env" || {
            echo -e "${YELLOW}⚠ .env 文件上传失败（可能包含敏感信息，请手动上传）${NC}"
        }
    fi

    # docker-compose.yml（已支持环境变量，可直接使用）
    ${SCP_CMD} "docker-compose.yml" "${SSH_TARGET}:${REMOTE_DIR}/docker-compose.yml" || {
        echo -e "${RED}✗ docker-compose.yml 上传失败${NC}"
        exit 1
    }
    echo -e "${GREEN}  ✓ docker-compose.yml 上传成功${NC}"

    # 前端 nginx.conf（必需，Dockerfile 需要）
    if [ -f "frontend/nginx.conf" ]; then
        ${SCP_CMD} "frontend/nginx.conf" "${SSH_TARGET}:${REMOTE_DIR}/frontend/nginx.conf" || {
            echo -e "${RED}✗ nginx.conf 上传失败${NC}"
            exit 1
        }
        echo -e "${GREEN}  ✓ nginx.conf 上传成功${NC}"
    else
        echo -e "${RED}✗ 未找到 frontend/nginx.conf，Docker 构建将失败${NC}"
        exit 1
    fi

    # 监控配置文件（如果存在）
    if [ -d "monitoring" ]; then
        ${SCP_CMD} -r "monitoring/"* "${SSH_TARGET}:${REMOTE_DIR}/monitoring/" 2>/dev/null || {
            echo -e "${YELLOW}⚠ 监控配置文件上传失败（可选）${NC}"
        }
    fi

    # 数据库初始化脚本（如果存在）
    if [ -f "scripts/init-db.sh" ]; then
        ${SCP_CMD} "scripts/init-db.sh" "${SSH_TARGET}:${REMOTE_DIR}/scripts/init-db.sh" || {
            echo -e "${YELLOW}⚠ 数据库初始化脚本上传失败（可选）${NC}"
        }
        ${SSH_CMD} "${SSH_TARGET}" "chmod +x ${REMOTE_DIR}/scripts/init-db.sh" || true
    fi

    echo -e "${GREEN}✓ 配置文件上传成功${NC}"
else
    # 本地部署：跳过镜像保存和上传步骤
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  本地部署：跳过镜像上传步骤${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  镜像已在本地构建，直接使用${NC}"
fi

# ============================================================================
# Step 4: 部署服务（本地或远程）
# ============================================================================

echo ""
if [ "$DEPLOY_MODE" = "local" ]; then
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  Step 4: 本地部署${NC}"
    echo -e "${BLUE}========================================${NC}"
    
    # 本地部署：直接执行部署逻辑
    DEPLOY_DIR="${PROJECT_ROOT}"
else
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  Step 4: 远程部署${NC}"
    echo -e "${BLUE}========================================${NC}"
    
    # 生成远程部署脚本
    REMOTE_DEPLOY_SCRIPT="/tmp/remote-deploy-$(date +%Y%m%d-%H%M%S).sh"
    DEPLOY_DIR="${REMOTE_DIR}"
fi

# 定义部署函数（本地和远程共用）
deploy_services() {
    local DEPLOY_DIR="$1"
    local REMOTE_TAR="${2:-}"
    local DEPLOY_MODE_LOCAL="${3:-local}"
    
    cd "$DEPLOY_DIR"
    
    # 检查 docker-compose.yml
    if [ ! -f "docker-compose.yml" ]; then
        echo -e "${RED}✗ docker-compose.yml 不存在${NC}"
        exit 1
    fi
    
    # 加载 .env 配置（如果存在）
    if [ -f ".env" ]; then
        set -a
        source .env
        set +a
        echo -e "${GREEN}✓ 已加载 .env 配置${NC}"
    fi
    
    # 停止现有服务
    echo ""
    echo -e "${CYAN}[1/8] 停止现有服务...${NC}"
    docker compose down || {
        echo -e "${YELLOW}⚠ 停止服务时出现警告（可能是首次部署）${NC}"
    }
    
    # 清理旧镜像（可选，节省空间）
    echo ""
    echo -e "${CYAN}[2/8] 清理旧镜像...${NC}"
    # 获取项目相关的旧镜像（通过容器名称前缀匹配）
    OLD_IMAGES=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep -E "(road-design-oa|project-oa)" || true)
    if [ -n "$OLD_IMAGES" ]; then
        echo "$OLD_IMAGES" | while read -r img; do
            if [ -n "$img" ]; then
                docker rmi -f "$img" 2>/dev/null || {
                    echo -e "${YELLOW}  ⚠ 无法删除镜像: $img（可能正在使用）${NC}"
                }
            fi
        done
    fi
    
    # 加载新镜像（仅远程部署需要）
    if [ -n "$REMOTE_TAR" ] && [ -f "$REMOTE_TAR" ]; then
        echo ""
        echo -e "${CYAN}[3/8] 加载新镜像...${NC}"
        docker load -i "$REMOTE_TAR" || {
            echo -e "${RED}✗ 镜像加载失败${NC}"
            exit 1
        }
        echo -e "${GREEN}✓ 镜像加载成功${NC}"
        
        # 清理镜像文件（节省空间）
        echo ""
        echo -e "${CYAN}[4/8] 清理镜像文件...${NC}"
        rm -f "$REMOTE_TAR"
        echo -e "${GREEN}✓ 镜像文件已清理${NC}"
    else
        echo ""
        echo -e "${CYAN}[3/8] 跳过镜像加载（本地部署，镜像已构建）...${NC}"
        echo -e "${CYAN}[4/8] 跳过镜像文件清理...${NC}"
    fi
    
    # 数据库初始化检查
    echo ""
    echo -e "${CYAN}[5/8] 检查数据库初始化...${NC}"
    
    # 检查数据库是否已初始化（通过检查数据库和用户是否存在）
    DB_INITIALIZED=false
    DB_NAME="${DB_NAME:-project_oa}"
    DB_USER="${DB_USER:-project_oa_user}"
    DB_PASSWORD="${DB_PASSWORD:-project_oa_password}"
    
    # 等待 PostgreSQL 就绪（如果还没启动）
    if ! docker compose ps postgres | grep -q "Up"; then
        echo -e "${BLUE}  启动 PostgreSQL...${NC}"
        docker compose up -d postgres
        sleep 5
    fi
    
    # 等待 PostgreSQL 就绪
    max_wait=30
    wait_count=0
    while [ $wait_count -lt $max_wait ]; do
        if docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
            break
        fi
        sleep 1
        ((wait_count++))
    done
    
    if [ $wait_count -ge $max_wait ]; then
        echo -e "${YELLOW}⚠ PostgreSQL 启动超时，跳过数据库初始化${NC}"
        DB_INITIALIZED=true  # 假设已初始化，避免后续步骤失败
    else
        # 检查数据库是否存在
        DB_EXISTS=$(docker compose exec -T postgres psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" 2>/dev/null || echo "")
        # 检查用户是否存在
        USER_EXISTS=$(docker compose exec -T postgres psql -U postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" 2>/dev/null || echo "")
        
        if [ "$DB_EXISTS" = "1" ] && [ "$USER_EXISTS" = "1" ]; then
            # 尝试连接数据库验证
            if docker compose exec -T postgres psql -U "${DB_USER}" -d "${DB_NAME}" -c '\q' > /dev/null 2>&1; then
                DB_INITIALIZED=true
                echo -e "${GREEN}✓ 数据库已初始化${NC}"
            fi
        fi
        
        if [ "$DB_INITIALIZED" = false ]; then
            echo -e "${BLUE}  执行数据库初始化...${NC}"
            
            # 创建数据库用户（如果不存在）
            if [ "$USER_EXISTS" != "1" ]; then
                echo -e "${BLUE}    创建数据库用户: ${DB_USER}${NC}"
                docker compose exec -T postgres psql -U postgres <<EOF 2>/dev/null || true
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
ALTER USER ${DB_USER} CREATEDB;
EOF
            fi
            
            # 创建数据库（如果不存在）
            if [ "$DB_EXISTS" != "1" ]; then
                echo -e "${BLUE}    创建数据库: ${DB_NAME}${NC}"
                docker compose exec -T postgres psql -U postgres <<EOF 2>/dev/null || true
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER} ENCODING 'UTF8';
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
EOF
            fi
            
            # 验证初始化结果
            if docker compose exec -T postgres psql -U "${DB_USER}" -d "${DB_NAME}" -c '\q' > /dev/null 2>&1; then
                echo -e "${GREEN}✓ 数据库初始化成功${NC}"
            else
                echo -e "${YELLOW}⚠ 数据库初始化可能不完整，请手动检查${NC}"
            fi
        fi
    fi
    
    # 分阶段启动服务
    echo ""
    echo -e "${CYAN}[6/8] 分阶段启动服务...${NC}"
    
    # 阶段1: 启动基础设施服务
    echo -e "${BLUE}  阶段1: 启动基础设施服务 (postgres, minio)...${NC}"
    docker compose up -d postgres minio
    sleep 15
    
    # 等待 PostgreSQL 就绪
    echo -e "${BLUE}  等待 PostgreSQL 就绪...${NC}"
    max_wait=30
    wait_count=0
    while [ $wait_count -lt $max_wait ]; do
        if docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
            echo -e "${GREEN}  ✓ PostgreSQL 就绪${NC}"
            break
        fi
        sleep 1
        ((wait_count++))
    done
    
    # 等待 MinIO 就绪
    echo -e "${BLUE}  等待 MinIO 就绪...${NC}"
    max_wait=30
    wait_count=0
    MINIO_PORT="${MINIO_API_PORT:-9000}"
    while [ $wait_count -lt $max_wait ]; do
        if curl -s "http://localhost:${MINIO_PORT}/minio/health/live" > /dev/null 2>&1; then
            echo -e "${GREEN}  ✓ MinIO 就绪${NC}"
            break
        fi
        sleep 1
        ((wait_count++))
    done
    
    # 阶段2: 启动应用服务
    echo ""
    echo -e "${BLUE}  阶段2: 启动应用服务 (backend)...${NC}"
    docker compose up -d backend
    sleep 10
    
    # 阶段3: 健康检查循环（等待后端就绪）
    echo ""
    echo -e "${BLUE}  阶段3: 等待后端服务就绪...${NC}"
    # 使用环境变量中的 SERVICE_NAME，默认为 project-oa
    SERVICE_NAME="${SERVICE_NAME:-project-oa}"
    SERVER_PORT="${SERVER_PORT:-8082}"
    BACKEND_HEALTH_URL="http://localhost:${SERVER_PORT}/${SERVICE_NAME}/health"
    echo -e "${BLUE}  健康检查端点: ${BACKEND_HEALTH_URL}${NC}"
    max_attempts=30
    attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -sf "${BACKEND_HEALTH_URL}" > /dev/null 2>&1; then
            echo -e "${GREEN}  ✓ 后端服务就绪 (尝试 ${attempt}/${max_attempts})${NC}"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            echo -e "${YELLOW}  ⚠ 后端服务健康检查超时，但继续部署${NC}"
        else
            echo -e "${BLUE}    等待后端服务... (${attempt}/${max_attempts})${NC}"
        fi
        
        sleep 2
        ((attempt++))
    done
    
    # 阶段4: 启动前端服务
    echo ""
    echo -e "${BLUE}  阶段4: 启动前端服务 (frontend)...${NC}"
    docker compose up -d frontend
    sleep 5
    
    echo -e "${GREEN}✓ 所有服务启动完成${NC}"
    
    # 容器状态检查
    echo ""
    echo -e "${CYAN}[7/8] 检查容器状态...${NC}"
    REQUIRED_CONTAINERS=(
        "project-oa-postgres"
        "project-oa-minio"
        "project-oa-backend"
        "project-oa-frontend"
    )
    
    all_running=true
    for container in "${REQUIRED_CONTAINERS[@]}"; do
        if docker ps --format "{{.Names}}" | grep -q "^${container}$"; then
            STATUS=$(docker ps --format "{{.Status}}" --filter "name=^${container}$")
            echo -e "${GREEN}  ✓ ${container}: ${STATUS}${NC}"
        else
            echo -e "${RED}  ✗ ${container}: 未运行${NC}"
            all_running=false
        fi
    done
    
    if [ "$all_running" = false ]; then
        echo -e "${YELLOW}⚠ 部分容器未运行，请检查日志${NC}"
        echo -e "${BLUE}  查看日志: docker compose logs${NC}"
    fi
    
    # 最终健康检查
    echo ""
    echo -e "${CYAN}[8/8] 最终健康检查...${NC}"
    
    # 检查后端健康
    SERVICE_NAME="${SERVICE_NAME:-project-oa}"
    SERVER_PORT="${SERVER_PORT:-8082}"
    BACKEND_HEALTH_URL="http://localhost:${SERVER_PORT}/${SERVICE_NAME}/health"
    if curl -sf "${BACKEND_HEALTH_URL}" > /dev/null 2>&1; then
        echo -e "${GREEN}  ✓ 后端健康检查通过${NC}"
    else
        echo -e "${YELLOW}  ⚠ 后端健康检查失败 (${BACKEND_HEALTH_URL})${NC}"
    fi
    
    # 检查前端（通过 nginx）
    FRONTEND_PORT="${FRONTEND_PORT:-3000}"
    if curl -sf "http://localhost:${FRONTEND_PORT}" > /dev/null 2>&1; then
        echo -e "${GREEN}  ✓ 前端服务可访问${NC}"
    else
        echo -e "${YELLOW}  ⚠ 前端服务检查失败${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    if [ "$DEPLOY_MODE_LOCAL" = "local" ]; then
        echo -e "${GREEN}  本地部署完成！${NC}"
    else
        echo -e "${GREEN}  远程部署完成！${NC}"
    fi
    echo -e "${GREEN}========================================${NC}"
}

# 根据部署模式执行
if [ "$DEPLOY_MODE" = "local" ]; then
    # 本地部署：直接调用部署函数
    deploy_services "$DEPLOY_DIR" "" "local"
else
    # 远程部署：生成并上传部署脚本

cat > "${REMOTE_DEPLOY_SCRIPT}" <<'REMOTE_SCRIPT_EOF'
#!/bin/bash
set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

REMOTE_DIR="${1:-/root/workspace/road-design-oa-system}"
REMOTE_TAR="${2:-/tmp/images.tar}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  远程部署执行${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "项目目录: ${REMOTE_DIR}"
echo -e "镜像文件: ${REMOTE_TAR}"
echo ""

# 检查项目目录
if [ ! -d "$REMOTE_DIR" ]; then
    echo -e "${RED}✗ 项目目录不存在: ${REMOTE_DIR}${NC}"
    exit 1
fi

cd "$REMOTE_DIR"

# 检查 docker-compose.yml
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}✗ docker-compose.yml 不存在${NC}"
    exit 1
fi

# 加载 .env 配置（如果存在）
if [ -f ".env" ]; then
    set -a
    source .env
    set +a
    echo -e "${GREEN}✓ 已加载 .env 配置${NC}"
fi

# 停止现有服务
echo ""
echo -e "${CYAN}[1/8] 停止现有服务...${NC}"
docker compose down || {
    echo -e "${YELLOW}⚠ 停止服务时出现警告（可能是首次部署）${NC}"
}

# 清理旧镜像（可选，节省空间）
echo ""
echo -e "${CYAN}[2/8] 清理旧镜像...${NC}"
# 获取项目相关的旧镜像（通过容器名称前缀匹配）
OLD_IMAGES=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep -E "(road-design-oa|project-oa)" || true)
if [ -n "$OLD_IMAGES" ]; then
    echo "$OLD_IMAGES" | while read -r img; do
        if [ -n "$img" ]; then
            docker rmi -f "$img" 2>/dev/null || {
                echo -e "${YELLOW}  ⚠ 无法删除镜像: $img（可能正在使用）${NC}"
            }
        fi
    done
fi

# 加载新镜像
echo ""
echo -e "${CYAN}[3/8] 加载新镜像...${NC}"
if [ ! -f "$REMOTE_TAR" ]; then
    echo -e "${RED}✗ 镜像文件不存在: ${REMOTE_TAR}${NC}"
    exit 1
fi

docker load -i "$REMOTE_TAR" || {
    echo -e "${RED}✗ 镜像加载失败${NC}"
    exit 1
}
echo -e "${GREEN}✓ 镜像加载成功${NC}"

# 清理镜像文件（节省空间）
echo ""
echo -e "${CYAN}[4/8] 清理镜像文件...${NC}"
rm -f "$REMOTE_TAR"
echo -e "${GREEN}✓ 镜像文件已清理${NC}"

# 数据库初始化检查
echo ""
echo -e "${CYAN}[5/8] 检查数据库初始化...${NC}"

# 检查数据库是否已初始化（通过检查数据库和用户是否存在）
DB_INITIALIZED=false
DB_NAME="${DB_NAME:-project_oa}"
DB_USER="${DB_USER:-project_oa_user}"
DB_PASSWORD="${DB_PASSWORD:-project_oa_password}"

# 等待 PostgreSQL 就绪（如果还没启动）
if ! docker compose ps postgres | grep -q "Up"; then
    echo -e "${BLUE}  启动 PostgreSQL...${NC}"
    docker compose up -d postgres
    sleep 5
fi

# 等待 PostgreSQL 就绪
max_wait=30
wait_count=0
while [ $wait_count -lt $max_wait ]; do
    if docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        break
    fi
    sleep 1
    ((wait_count++))
done

if [ $wait_count -ge $max_wait ]; then
    echo -e "${YELLOW}⚠ PostgreSQL 启动超时，跳过数据库初始化${NC}"
    DB_INITIALIZED=true  # 假设已初始化，避免后续步骤失败
else
    # 检查数据库是否存在
    DB_EXISTS=$(docker compose exec -T postgres psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" 2>/dev/null || echo "")
    # 检查用户是否存在
    USER_EXISTS=$(docker compose exec -T postgres psql -U postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" 2>/dev/null || echo "")
    
    if [ "$DB_EXISTS" = "1" ] && [ "$USER_EXISTS" = "1" ]; then
        # 尝试连接数据库验证
        if docker compose exec -T postgres psql -U "${DB_USER}" -d "${DB_NAME}" -c '\q' > /dev/null 2>&1; then
            DB_INITIALIZED=true
            echo -e "${GREEN}✓ 数据库已初始化${NC}"
        fi
    fi
    
    if [ "$DB_INITIALIZED" = false ]; then
        echo -e "${BLUE}  执行数据库初始化...${NC}"
        
        # 创建数据库用户（如果不存在）
        if [ "$USER_EXISTS" != "1" ]; then
            echo -e "${BLUE}    创建数据库用户: ${DB_USER}${NC}"
            docker compose exec -T postgres psql -U postgres <<EOF 2>/dev/null || true
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
ALTER USER ${DB_USER} CREATEDB;
EOF
        fi
        
        # 创建数据库（如果不存在）
        if [ "$DB_EXISTS" != "1" ]; then
            echo -e "${BLUE}    创建数据库: ${DB_NAME}${NC}"
            docker compose exec -T postgres psql -U postgres <<EOF 2>/dev/null || true
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER} ENCODING 'UTF8';
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
EOF
        fi
        
        # 验证初始化结果
        if docker compose exec -T postgres psql -U "${DB_USER}" -d "${DB_NAME}" -c '\q' > /dev/null 2>&1; then
            echo -e "${GREEN}✓ 数据库初始化成功${NC}"
        else
            echo -e "${YELLOW}⚠ 数据库初始化可能不完整，请手动检查${NC}"
        fi
    fi
fi

# 分阶段启动服务
echo ""
echo -e "${CYAN}[6/8] 分阶段启动服务...${NC}"

# 阶段1: 启动基础设施服务
echo -e "${BLUE}  阶段1: 启动基础设施服务 (postgres, minio)...${NC}"
docker compose up -d postgres minio
sleep 15

# 等待 PostgreSQL 就绪
echo -e "${BLUE}  等待 PostgreSQL 就绪...${NC}"
max_wait=30
wait_count=0
while [ $wait_count -lt $max_wait ]; do
    if docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo -e "${GREEN}  ✓ PostgreSQL 就绪${NC}"
        break
    fi
    sleep 1
    ((wait_count++))
done

# 等待 MinIO 就绪
echo -e "${BLUE}  等待 MinIO 就绪...${NC}"
max_wait=30
wait_count=0
while [ $wait_count -lt $max_wait ]; do
    if curl -s http://localhost:9000/minio/health/live > /dev/null 2>&1; then
        echo -e "${GREEN}  ✓ MinIO 就绪${NC}"
        break
    fi
    sleep 1
    ((wait_count++))
done

# 阶段2: 启动应用服务
echo ""
echo -e "${BLUE}  阶段2: 启动应用服务 (backend)...${NC}"
docker compose up -d backend
sleep 10

# 阶段3: 健康检查循环（等待后端就绪）
echo ""
echo -e "${BLUE}  阶段3: 等待后端服务就绪...${NC}"
# 使用环境变量中的 SERVICE_NAME，默认为 project-oa
SERVICE_NAME="${SERVICE_NAME:-project-oa}"
SERVER_PORT="${SERVER_PORT:-8082}"
BACKEND_HEALTH_URL="http://localhost:${SERVER_PORT}/${SERVICE_NAME}/health"
echo -e "${BLUE}  健康检查端点: ${BACKEND_HEALTH_URL}${NC}"
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if curl -sf "${BACKEND_HEALTH_URL}" > /dev/null 2>&1; then
        echo -e "${GREEN}  ✓ 后端服务就绪 (尝试 ${attempt}/${max_attempts})${NC}"
        break
    fi
    
    if [ $attempt -eq $max_attempts ]; then
        echo -e "${YELLOW}  ⚠ 后端服务健康检查超时，但继续部署${NC}"
    else
        echo -e "${BLUE}    等待后端服务... (${attempt}/${max_attempts})${NC}"
    fi
    
    sleep 2
    ((attempt++))
done

# 阶段4: 启动前端服务
echo ""
echo -e "${BLUE}  阶段4: 启动前端服务 (frontend)...${NC}"
docker compose up -d frontend
sleep 5

echo -e "${GREEN}✓ 所有服务启动完成${NC}"

# 容器状态检查
echo ""
echo -e "${CYAN}[7/8] 检查容器状态...${NC}"
REQUIRED_CONTAINERS=(
    "project-oa-postgres"
    "project-oa-minio"
    "project-oa-backend"
    "project-oa-frontend"
)

all_running=true
for container in "${REQUIRED_CONTAINERS[@]}"; do
    if docker ps --format "{{.Names}}" | grep -q "^${container}$"; then
        STATUS=$(docker ps --format "{{.Status}}" --filter "name=^${container}$")
        echo -e "${GREEN}  ✓ ${container}: ${STATUS}${NC}"
    else
        echo -e "${RED}  ✗ ${container}: 未运行${NC}"
        all_running=false
    fi
done

if [ "$all_running" = false ]; then
    echo -e "${YELLOW}⚠ 部分容器未运行，请检查日志${NC}"
    echo -e "${BLUE}  查看日志: docker compose logs${NC}"
fi

# 最终健康检查
echo ""
echo -e "${CYAN}[8/8] 最终健康检查...${NC}"

# 检查后端健康
SERVICE_NAME="${SERVICE_NAME:-project-oa}"
SERVER_PORT="${SERVER_PORT:-8082}"
BACKEND_HEALTH_URL="http://localhost:${SERVER_PORT}/${SERVICE_NAME}/health"
if curl -sf "${BACKEND_HEALTH_URL}" > /dev/null 2>&1; then
    echo -e "${GREEN}  ✓ 后端健康检查通过${NC}"
else
    echo -e "${YELLOW}  ⚠ 后端健康检查失败 (${BACKEND_HEALTH_URL})${NC}"
fi

# 检查前端（通过 nginx）
if curl -sf "http://localhost:3000" > /dev/null 2>&1; then
    echo -e "${GREEN}  ✓ 前端服务可访问${NC}"
else
    echo -e "${YELLOW}  ⚠ 前端服务检查失败${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  远程部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
REMOTE_SCRIPT_EOF

# 上传远程部署脚本
echo -e "${BLUE}  上传远程部署脚本...${NC}"
${SCP_CMD} "${REMOTE_DEPLOY_SCRIPT}" "${SSH_TARGET}:/tmp/remote-deploy.sh" || {
    echo -e "${RED}✗ 远程部署脚本上传失败${NC}"
    exit 1
}

# 执行远程部署
echo -e "${BLUE}  执行远程部署...${NC}"
${SSH_CMD} "${SSH_TARGET}" "chmod +x /tmp/remote-deploy.sh && /tmp/remote-deploy.sh ${REMOTE_DIR} ${REMOTE_TAR}" || {
    echo -e "${RED}✗ 远程部署失败${NC}"
    exit 1
}

echo -e "${GREEN}✓ 远程部署成功${NC}"
fi  # 结束 if [ "$DEPLOY_MODE" = "local" ]

# ============================================================================
# Step 5: 清理临时文件
# ============================================================================

if [ "$DEPLOY_MODE" = "remote" ]; then
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  Step 5: 清理临时文件${NC}"
    echo -e "${BLUE}========================================${NC}"

    # 清理本地临时文件
    echo -e "${BLUE}  清理本地临时文件...${NC}"
    rm -f "${IMAGES_TAR}"
    rm -f "${REMOTE_DEPLOY_SCRIPT}"
    echo -e "${GREEN}✓ 本地临时文件已清理${NC}"

    # 清理远程临时文件
    echo -e "${BLUE}  清理远程临时文件...${NC}"
    ${SSH_CMD} "${SSH_TARGET}" "rm -f /tmp/remote-deploy.sh" || true
    echo -e "${GREEN}✓ 远程临时文件已清理${NC}"
fi

# ============================================================================
# 部署完成
# ============================================================================

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

if [ "$DEPLOY_MODE" = "local" ]; then
    # 本地部署信息
    echo -e "${CYAN}访问地址:${NC}"
    FRONTEND_PORT="${FRONTEND_PORT:-3000}"
    SERVER_PORT="${SERVER_PORT:-8082}"
    MINIO_CONSOLE_PORT="${MINIO_CONSOLE_PORT:-9001}"
    SERVICE_NAME="${SERVICE_NAME:-project-oa}"
    echo -e "  前端: ${GREEN}http://localhost:${FRONTEND_PORT}${NC}"
    echo -e "  后端 API: ${GREEN}http://localhost:${SERVER_PORT}${NC}"
    echo -e "  健康检查: ${GREEN}http://localhost:${SERVER_PORT}/${SERVICE_NAME}/health${NC}"
    echo -e "  MinIO 控制台: ${GREEN}http://localhost:${MINIO_CONSOLE_PORT}${NC}"
    echo ""
    echo -e "${CYAN}常用命令:${NC}"
    echo -e "  查看服务状态: ${BLUE}docker compose ps${NC}"
    echo -e "  查看服务日志: ${BLUE}docker compose logs -f${NC}"
    echo -e "  停止服务: ${BLUE}docker compose down${NC}"
    echo -e "  重启服务: ${BLUE}docker compose restart${NC}"
else
    # 远程部署信息
    echo -e "${CYAN}访问地址:${NC}"
    FRONTEND_PORT="${FRONTEND_PORT:-3000}"
    SERVER_PORT="${SERVER_PORT:-8082}"
    MINIO_CONSOLE_PORT="${MINIO_CONSOLE_PORT:-9001}"
    SERVICE_NAME="${SERVICE_NAME:-project-oa}"
    echo -e "  前端: ${GREEN}http://${PROD_SERVER_HOST}:${FRONTEND_PORT}${NC}"
    echo -e "  后端 API: ${GREEN}http://${PROD_SERVER_HOST}:${SERVER_PORT}${NC}"
    echo -e "  健康检查: ${GREEN}http://${PROD_SERVER_HOST}:${SERVER_PORT}/${SERVICE_NAME}/health${NC}"
    echo -e "  MinIO 控制台: ${GREEN}http://${PROD_SERVER_HOST}:${MINIO_CONSOLE_PORT}${NC}"
    echo ""
    echo -e "${CYAN}常用命令:${NC}"
    if [ -n "$SSH_KEY" ]; then
        echo -e "  查看服务状态: ${BLUE}ssh -i ${SSH_KEY} ${SSH_TARGET} 'cd ${REMOTE_DIR} && docker compose ps'${NC}"
        echo -e "  查看服务日志: ${BLUE}ssh -i ${SSH_KEY} ${SSH_TARGET} 'cd ${REMOTE_DIR} && docker compose logs -f'${NC}"
        echo -e "  停止服务: ${BLUE}ssh -i ${SSH_KEY} ${SSH_TARGET} 'cd ${REMOTE_DIR} && docker compose down'${NC}"
    else
        echo -e "  查看服务状态: ${BLUE}sshpass -p '***' ssh ${SSH_TARGET} 'cd ${REMOTE_DIR} && docker compose ps'${NC}"
        echo -e "  查看服务日志: ${BLUE}sshpass -p '***' ssh ${SSH_TARGET} 'cd ${REMOTE_DIR} && docker compose logs -f'${NC}"
        echo -e "  停止服务: ${BLUE}sshpass -p '***' ssh ${SSH_TARGET} 'cd ${REMOTE_DIR} && docker compose down'${NC}"
    fi
fi

echo ""
echo -e "${YELLOW}注意事项:${NC}"
echo -e "  - 首次部署后请检查 .env 配置文件是否正确"
echo -e "  - 确保数据库连接配置正确"
if [ "$DEPLOY_MODE" = "remote" ]; then
    echo -e "  - 检查防火墙规则，确保端口 ${FRONTEND_PORT}、${SERVER_PORT}、9000、${MINIO_CONSOLE_PORT} 已开放"
fi
echo ""
