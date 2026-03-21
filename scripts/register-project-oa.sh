#!/bin/bash

# 项目OA服务注册脚本
# 功能：快速注册 project-oa 服务到星云Auth服务注册中心
# 用法：./scripts/register-project-oa.sh <admin-email> [options]
# 
# 说明：
#   - 这是 register-service.sh 的封装脚本，专门用于注册 project-oa 服务
#   - 所有配置从 .env 文件读取，支持通过环境变量和命令行参数覆盖
#   - 本地注册和远程注册使用相同的逻辑，只是配置值不同
# 
# 重要概念：
#   - 业务服务部署参数（SERVER_HOST/SERVER_PORT）：业务服务在容器内监听什么地址和端口
#   - 服务注册参数（SERVICE_HOST/SERVICE_PORT）：告诉星云Auth网关如何访问业务服务
#   - 这两者不是一回事，但在某些情况下可能相同（如 Docker 同网络部署）
#   - 服务注册是手动操作，不是业务服务器启动时自动执行的

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REGISTER_SCRIPT="${PROJECT_ROOT}/docs/guides/scripts/register-service.sh"

# 用于透传给 register-service.sh 的参数数组
PASSTHROUGH_ARGS=()

# 打印带颜色的消息
print_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1" >&2
}

print_step() {
  echo -e "${CYAN}▶${NC} $1"
}

# 显示使用说明
show_usage() {
  cat << EOF
用法: $0 <admin-email> [选项]

快速注册 project-oa 服务到 NebulaAuth 服务注册中心
这是 register-service.sh 的封装脚本，所有配置从 .env 文件读取

参数:
  admin-email              管理员邮箱（必填，用于登录，除非使用 --admin-phone）

选项:
  服务配置:
  -n, --service-name NAME      业务服务名称（默认: 从 .env 读取 SERVICE_NAME）
  -h, --service-host HOST      业务服务主机地址（默认: 从 .env 读取 SERVICE_HOST）
  -p, --service-port PORT      业务服务端口（默认: 从 .env 读取 SERVICE_PORT）
  -u, --service-url URL        业务服务完整URL（默认: 从 .env 读取 SERVICE_URL）

  认证配置:
  -e, --admin-email EMAIL      管理员邮箱（用于登录，与手机号二选一）
  -P, --admin-phone PHONE      管理员手机号（用于登录，与邮箱二选一）
  -c, --code CODE              验证码（如果不提供，会提示输入）
  -t, --code-type TYPE         验证码类型: email 或 sms（默认: email）
  --token TOKEN                直接使用管理员Token（跳过登录）
  --user-id ID                 直接使用管理员用户ID（跳过获取用户信息）
  --skip-login                 跳过登录步骤（需要提供 --token 和 --user-id）

  网关配置:
  -g, --gateway-url URL        API网关地址（默认: 从 .env 读取 API_GATEWAY_URL 或 NEBULA_AUTH_URL）
  -a, --auth-url URL           认证服务地址（默认: \${gateway-url}/auth-server）
  -r, --registry-url URL       服务注册中心地址（默认: \${gateway-url}/service-registry）

  其他:
  --help                       显示此帮助信息

环境变量:
  所有配置都可以通过环境变量设置，优先级高于配置文件
  例如: SERVICE_HOST=192.168.1.100 SERVICE_PORT=8080 $0 admin@example.com

配置文件:
  脚本会自动从项目根目录的 .env 文件读取以下配置：
  
  服务注册配置（必需）：
  - SERVICE_NAME: 服务名称（默认: project-oa）
  - SERVICE_HOST: 服务注册地址（网关访问业务服务的地址）
    * Docker 同网络：容器名（如 backend）或 Docker 网络 IP
    * 不同服务器：业务服务器的公网 IP 或域名（必须设置）
    * 注意：不要使用 127.0.0.1 或 localhost，网关无法访问
  - SERVICE_PORT: 服务注册端口（网关访问业务服务的端口）
    * Docker 同网络：通常与 SERVER_PORT 相同（容器内端口）
    * 不同服务器：外部映射的端口（可能与 SERVER_PORT 不同）
  - SERVICE_URL: 服务完整URL（可选，会自动构建）
  
  网关配置（必需）：
  - API_GATEWAY_URL: 网关地址（或使用 NEBULA_AUTH_URL）
  - AUTH_SERVER_URL: 认证服务地址（可选，默认: ${API_GATEWAY_URL}/auth-server）
  - SERVICE_REGISTRY_URL: 服务注册中心地址（可选，默认: ${API_GATEWAY_URL}/service-registry）
  
  管理员认证配置（可选）：
  - ADMIN_EMAIL: 管理员邮箱（可选）
  - ADMIN_PHONE: 管理员手机号（可选）
  - ADMIN_CODE: 验证码（可选）
  - CODE_TYPE: 验证码类型（可选，默认: email）
  - ADMIN_TOKEN: 管理员Token（可选，用于跳过登录）
  - ADMIN_USER_ID: 管理员用户ID（可选，用于跳过登录）

示例:
  # 使用邮箱登录注册服务（从配置文件读取所有信息）
  $0 admin@example.com

  # 指定验证码
  $0 admin@example.com -c 123456

  # 使用手机号登录
  $0 -P 13800138000 -t sms

  # 指定网关地址和服务信息
  $0 admin@example.com -g http://192.168.1.100:8080 --service-host 192.168.1.100 -p 8082

  # 使用已有Token注册服务
  $0 admin@example.com --token "eyJhbGc..." --user-id "uuid-here"

  # 使用环境变量
  export SERVICE_HOST=192.168.1.100
  export SERVICE_PORT=8082
  $0 admin@example.com

EOF
}

# 从配置文件加载配置
# 参数：$1=配置文件路径
load_config_from_file() {
  local config_file="$1"
  
  if [ ! -f "$config_file" ]; then
    return 1
  fi
  
  # 读取配置（忽略注释和空行）
  # 使用临时文件避免子shell问题
  local temp_file
  temp_file=$(mktemp)
  grep -E "^[A-Z_]+=" "$config_file" 2>/dev/null > "$temp_file" || true
  
  while IFS='=' read -r key value; do
    # 跳过注释和空行
    [[ "$key" =~ ^#.*$ ]] && continue
    [[ -z "$key" ]] && continue
    
    # 去除引号和空格
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs | sed "s/^['\"]//; s/['\"]$//")
    
    # 只处理服务注册相关的配置
    # 注意：这里只读取服务注册配置，不读取业务服务部署配置（SERVER_HOST/SERVER_PORT）
    case "$key" in
      # 服务注册配置
      SERVICE_NAME|SERVICE_HOST|SERVICE_PORT|SERVICE_URL)
        # 如果环境变量未设置，则从配置文件读取
        if [ -z "${!key}" ]; then
          export "$key=$value"
        fi
        ;;
      # 网关配置
      API_GATEWAY_URL|AUTH_SERVER_URL|SERVICE_REGISTRY_URL)
        # 如果环境变量未设置，则从配置文件读取
        if [ -z "${!key}" ]; then
          export "$key=$value"
        fi
        ;;
      # NEBULA_AUTH_URL 可以映射到 API_GATEWAY_URL
      NEBULA_AUTH_URL)
        if [ -z "${API_GATEWAY_URL}" ]; then
          export API_GATEWAY_URL="$value"
        fi
        ;;
      # 管理员认证配置
      ADMIN_EMAIL|ADMIN_PHONE|ADMIN_CODE|CODE_TYPE|ADMIN_TOKEN|ADMIN_USER_ID)
        # 如果环境变量未设置，则从配置文件读取
        if [ -z "${!key}" ]; then
          export "$key=$value"
        fi
        ;;
    esac
  done < "$temp_file"
  
  rm -f "$temp_file"
  
  return 0
}

# 加载配置
load_config() {
  print_step "正在加载配置..."
  
  # 从 .env 文件加载配置
    if [ -f "${PROJECT_ROOT}/.env" ]; then
      print_info "从项目根目录的 .env 文件加载配置"
    load_config_from_file "${PROJECT_ROOT}/.env"
  else
      print_warning "配置文件不存在: ${PROJECT_ROOT}/.env"
    fi
  
  # 设置默认值
  export SERVICE_NAME="${SERVICE_NAME:-project-oa}"
  export SERVICE_HOST="${SERVICE_HOST:-localhost}"
  export SERVICE_PORT="${SERVICE_PORT:-8082}"
  export API_GATEWAY_URL="${API_GATEWAY_URL:-http://localhost:8080}"
  export CODE_TYPE="${CODE_TYPE:-email}"
  
  print_success "配置加载完成"
}

# 解析命令行参数
parse_args() {
  local has_admin_email=false
  local has_admin_phone=false
  
  # 先检查 --help
  for arg in "$@"; do
    if [ "$arg" = "--help" ]; then
      show_usage
      exit 0
    fi
  done
  
  while [ $# -gt 0 ]; do
    case "$1" in
      # 服务配置参数
      -n|--service-name)
        export SERVICE_NAME="$2"
        PASSTHROUGH_ARGS+=("$1" "$2")
        shift 2
        ;;
      -h|--service-host)
        export SERVICE_HOST="$2"
        PASSTHROUGH_ARGS+=("$1" "$2")
        shift 2
        ;;
      -p|--service-port)
        export SERVICE_PORT="$2"
        PASSTHROUGH_ARGS+=("$1" "$2")
        shift 2
        ;;
      -u|--service-url)
        export SERVICE_URL="$2"
        PASSTHROUGH_ARGS+=("$1" "$2")
        shift 2
        ;;
      # 认证配置参数
      -e|--admin-email)
        export ADMIN_EMAIL="$2"
        has_admin_email=true
        PASSTHROUGH_ARGS+=("$1" "$2")
        shift 2
        ;;
      -P|--admin-phone)
        export ADMIN_PHONE="$2"
        has_admin_phone=true
        PASSTHROUGH_ARGS+=("$1" "$2")
        shift 2
        ;;
      -c|--code)
        export ADMIN_CODE="$2"
        PASSTHROUGH_ARGS+=("$1" "$2")
        shift 2
        ;;
      -t|--code-type)
        export CODE_TYPE="$2"
        PASSTHROUGH_ARGS+=("$1" "$2")
        shift 2
        ;;
      --token)
        export ADMIN_TOKEN="$2"
        PASSTHROUGH_ARGS+=("$1" "$2")
        shift 2
        ;;
      --user-id)
        export ADMIN_USER_ID="$2"
        PASSTHROUGH_ARGS+=("$1" "$2")
        shift 2
        ;;
      --skip-login)
        export SKIP_LOGIN="true"
        PASSTHROUGH_ARGS+=("$1")
        shift
        ;;
      # 网关配置参数
      -g|--gateway-url)
        export API_GATEWAY_URL="$2"
        PASSTHROUGH_ARGS+=("$1" "$2")
        shift 2
        ;;
      -a|--auth-url)
        export AUTH_SERVER_URL="$2"
        PASSTHROUGH_ARGS+=("$1" "$2")
        shift 2
        ;;
      -r|--registry-url)
        export SERVICE_REGISTRY_URL="$2"
        PASSTHROUGH_ARGS+=("$1" "$2")
        shift 2
        ;;
      --help)
        show_usage
        exit 0
        ;;
      *)
        # 如果第一个参数不是选项，且还没有设置管理员邮箱，则作为邮箱处理
        if [ "$has_admin_email" = "false" ] && [ "$has_admin_phone" = "false" ] && ! echo "$1" | grep -qE '^-'; then
          export ADMIN_EMAIL="$1"
          has_admin_email=true
          # 添加到透传参数（作为 -e 参数）
          PASSTHROUGH_ARGS+=("-e" "$1")
          shift
        else
          print_error "未知选项: $1"
          show_usage
          exit 1
        fi
        ;;
    esac
  done
  
  # 验证：必须提供管理员邮箱或手机号（除非使用 --token 和 --user-id）
  if [ "$has_admin_email" = "false" ] && [ "$has_admin_phone" = "false" ]; then
    # 检查是否有 token 和 user-id
    local has_token=false
    local has_user_id=false
    for arg in "${PASSTHROUGH_ARGS[@]}"; do
      [ "$arg" = "--token" ] && has_token=true
      [ "$arg" = "--user-id" ] && has_user_id=true
    done
    
    if [ "$has_token" = "false" ] || [ "$has_user_id" = "false" ]; then
      # 检查环境变量或配置文件
      if [ -z "${ADMIN_EMAIL}" ] && [ -z "${ADMIN_PHONE}" ]; then
      print_error "必须提供管理员邮箱（-e/--admin-email）或手机号（-P/--admin-phone），或使用 --token 和 --user-id"
        print_info "也可以在 .env 文件中配置 ADMIN_EMAIL 或 ADMIN_PHONE"
      show_usage
      exit 1
      fi
    fi
  fi
}

# 验证配置
validate_config() {
  local has_error=false
  
  # 验证管理员邮箱（如果提供）
  if [ -n "${ADMIN_EMAIL}" ] && ! echo "${ADMIN_EMAIL}" | grep -Eq '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'; then
    print_error "邮箱格式不正确: ${ADMIN_EMAIL}"
    has_error=true
  fi
  
  # 验证服务名称
  if [ -z "${SERVICE_NAME}" ]; then
    print_error "服务名称不能为空"
    has_error=true
  fi
  
  # 验证端口
  if [ -n "${SERVICE_PORT}" ] && ! echo "${SERVICE_PORT}" | grep -Eq '^[0-9]+$'; then
    print_error "服务端口必须是数字: ${SERVICE_PORT}"
    has_error=true
  fi
  
  # 验证 register-service.sh 脚本是否存在
  if [ ! -f "$REGISTER_SCRIPT" ]; then
    print_error "找不到注册脚本: $REGISTER_SCRIPT"
    has_error=true
  fi
  
  # 验证脚本是否可执行
  if [ ! -x "$REGISTER_SCRIPT" ]; then
    print_warning "注册脚本不可执行，尝试添加执行权限..."
    chmod +x "$REGISTER_SCRIPT" || {
      print_error "无法添加执行权限"
      has_error=true
    }
  fi
  
  if [ "$has_error" = "true" ]; then
    exit 1
  fi
}

# 主函数
main() {
  echo "=============================="
  echo "项目OA服务注册工具"
  echo "=============================="
  echo
  
  # 解析命令行参数
  parse_args "$@"
  
  # 加载配置（从配置文件和环境变量）
  load_config
  
  # 验证配置
  validate_config
  
  # 显示配置信息
  echo
  print_info "配置信息："
  echo "  API网关地址: ${API_GATEWAY_URL}"
  echo "  业务服务名称: ${SERVICE_NAME}"
  echo "  服务注册地址（SERVICE_HOST）: ${SERVICE_HOST}"
  echo "  服务注册端口（SERVICE_PORT）: ${SERVICE_PORT}"
  echo "  说明：SERVICE_HOST/SERVICE_PORT 用于告诉网关如何访问业务服务"
  if [ -n "${ADMIN_EMAIL}" ]; then
    echo "  管理员邮箱: ${ADMIN_EMAIL}"
  elif [ -n "${ADMIN_PHONE}" ]; then
    echo "  管理员手机号: ${ADMIN_PHONE}"
  fi
  echo
  
  # 构建 register-service.sh 调用参数
  # 检查透传参数中是否已经包含基本参数
  local has_service_name=false
  local has_service_host=false
  local has_service_port=false
  local has_gateway_url=false
  local has_admin_email=false
  local has_admin_phone=false
  
  local i=0
  while [ $i -lt ${#PASSTHROUGH_ARGS[@]} ]; do
    case "${PASSTHROUGH_ARGS[$i]}" in
      -n|--service-name) has_service_name=true ;;
      -h|--service-host) has_service_host=true ;;
      -p|--service-port) has_service_port=true ;;
      -g|--gateway-url) has_gateway_url=true ;;
      -e|--admin-email) has_admin_email=true ;;
      -P|--admin-phone) has_admin_phone=true ;;
    esac
    i=$((i + 1))
  done
  
  local register_args=()
  
  # 添加基本参数（如果透传参数中没有，则使用环境变量）
  if [ "$has_service_name" = "false" ]; then
    register_args+=("-n" "${SERVICE_NAME}")
  fi
  if [ "$has_service_host" = "false" ]; then
    register_args+=("-h" "${SERVICE_HOST}")
  fi
  if [ "$has_service_port" = "false" ]; then
    register_args+=("-p" "${SERVICE_PORT}")
  fi
  if [ "$has_gateway_url" = "false" ]; then
    register_args+=("-g" "${API_GATEWAY_URL}")
  fi
  if [ "$has_admin_email" = "false" ] && [ "$has_admin_phone" = "false" ] && [ -n "${ADMIN_EMAIL}" ]; then
    register_args+=("-e" "${ADMIN_EMAIL}")
  fi
  
  # 添加所有透传参数
  register_args+=("${PASSTHROUGH_ARGS[@]}")
  
  # 调用 register-service.sh
  print_step "调用注册脚本..."
  echo
  
  # 导出环境变量供 register-service.sh 使用
  export SERVICE_NAME SERVICE_HOST SERVICE_PORT SERVICE_URL
  export API_GATEWAY_URL AUTH_SERVER_URL SERVICE_REGISTRY_URL
  export ADMIN_EMAIL ADMIN_PHONE ADMIN_CODE CODE_TYPE
  export ADMIN_TOKEN ADMIN_USER_ID SKIP_LOGIN
  
  if "$REGISTER_SCRIPT" "${register_args[@]}"; then
    echo
    echo "=============================="
    print_success "服务注册完成！"
    echo "=============================="
    echo
    print_info "服务信息："
    echo "  服务名称: ${SERVICE_NAME}"
    echo "  服务地址: http://${SERVICE_HOST}:${SERVICE_PORT}"
    echo "  健康检查: ${API_GATEWAY_URL}/${SERVICE_NAME}/health"
    echo
  else
    print_error "服务注册失败"
    exit 1
  fi
}

# 运行主函数
main "$@"
