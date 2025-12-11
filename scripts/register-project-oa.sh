#!/bin/bash

# 项目OA服务注册脚本
# 功能：快速注册 project-oa 服务到 NebulaAuth 服务注册中心
# 用法：./scripts/register-project-oa.sh <admin-email> [options]

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
BACKEND_DIR="${PROJECT_ROOT}/backend"
REGISTER_SCRIPT="${PROJECT_ROOT}/specs/002-project-management-oa/guides/scripts/register-service.sh"

# 默认配置
ADMIN_EMAIL=""
GATEWAY_URL="http://localhost:8080"
CODE=""
CODE_TYPE="email"
SERVICE_HOST=""
SERVICE_PORT=""
SERVICE_NAME=""

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

参数:
  admin-email              管理员邮箱（必填，用于登录，除非使用 --admin-phone）

选项:
  服务配置:
  -n, --service-name NAME      业务服务名称（默认: project-oa）
  -h, --service-host HOST      业务服务主机地址（默认: 从配置文件读取）
  -p, --service-port PORT      业务服务端口（默认: 从配置文件读取）
  -u, --service-url URL        业务服务完整URL（可选，会自动构建）

  认证配置:
  -e, --admin-email EMAIL      管理员邮箱（用于登录，与手机号二选一）
  -P, --admin-phone PHONE      管理员手机号（用于登录，与邮箱二选一）
  -c, --code CODE              验证码（如果不提供，会提示输入）
  -t, --code-type TYPE         验证码类型: email 或 sms（默认: email）
  --token TOKEN                直接使用管理员Token（跳过登录）
  --user-id ID                 直接使用管理员用户ID（跳过获取用户信息）
  --skip-login                 跳过登录步骤（需要提供 --token 和 --user-id）

  网关配置:
  -g, --gateway-url URL        API网关地址（默认: http://localhost:8080）
  -a, --auth-url URL           认证服务地址（默认: \${gateway-url}/auth-server）
  -r, --registry-url URL       服务注册中心地址（默认: \${gateway-url}/service-registry）

  其他:
  --help                       显示此帮助信息

环境变量:
  可以通过环境变量设置配置，优先级高于配置文件
  例如: SERVICE_HOST=192.168.1.100 SERVICE_PORT=8080 $0 admin@example.com

配置文件:
  脚本会自动从以下文件读取配置:
  1. backend/.env

示例:
  # 使用邮箱登录注册服务（从配置文件读取服务信息）
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

# 从配置文件加载服务配置
# 参数：$1=配置文件路径, $2=是否覆盖已有值（true=覆盖，false=仅在空时设置）
load_config_from_file() {
  local config_file="$1"
  local overwrite="${2:-false}"
  
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
    
    case "$key" in
      SERVICE_NAME)
        if [ "$overwrite" = "true" ] || [ -z "$SERVICE_NAME" ]; then
          SERVICE_NAME="$value"
        fi
        ;;
      SERVICE_HOST)
        if [ "$overwrite" = "true" ] || [ -z "$SERVICE_HOST" ]; then
          SERVICE_HOST="$value"
        fi
        ;;
      SERVICE_PORT)
        if [ "$overwrite" = "true" ] || [ -z "$SERVICE_PORT" ]; then
          SERVICE_PORT="$value"
        fi
        ;;
      NEBULA_AUTH_URL)
        if [ "$overwrite" = "true" ] || [ -z "$GATEWAY_URL" ] || [ "$GATEWAY_URL" = "http://localhost:8080" ]; then
          # 从 NEBULA_AUTH_URL 提取网关地址（去掉 /auth-server 等后缀）
          GATEWAY_URL=$(echo "$value" | sed 's|/auth-server.*$||' | sed 's|/service-registry.*$||')
        fi
        ;;
      API_BASE_URL)
        if [ "$overwrite" = "true" ] || [ -z "$GATEWAY_URL" ] || [ "$GATEWAY_URL" = "http://localhost:8080" ]; then
          GATEWAY_URL="$value"
        fi
        ;;
    esac
  done < "$temp_file"
  
  rm -f "$temp_file"
  
  return 0
}

# 加载配置
# 配置优先级（从高到低，最终应用顺序）：
# 1. 命令行参数（在 main 函数中，load_config 之后应用，优先级最高）
# 2. 环境变量（SERVICE_NAME, SERVICE_HOST, SERVICE_PORT, API_GATEWAY_URL/GATEWAY_URL）
# 3. .env 文件
# 4. 默认值（优先级最低）
load_config() {
  print_step "正在加载配置..."
  
  # 保存环境变量的原始值（如果已设置）
  # 注意：环境变量会在最后应用，确保优先级最高
  local env_service_name="${SERVICE_NAME:-}"
  local env_service_host="${SERVICE_HOST:-}"
  local env_service_port="${SERVICE_PORT:-}"
  local env_gateway_url="${API_GATEWAY_URL:-${GATEWAY_URL:-}}"
  
  # 步骤1: 从 .env 文件加载配置
  if [ -f "${BACKEND_DIR}/.env" ]; then
    print_info "从 .env 文件加载配置"
    load_config_from_file "${BACKEND_DIR}/.env" false
  else
    print_warning "配置文件不存在: ${BACKEND_DIR}/.env"
  fi
  
  # 步骤2: 应用环境变量（优先级最高，覆盖配置文件的值）
  if [ -n "$env_service_name" ]; then
    SERVICE_NAME="$env_service_name"
    print_info "使用环境变量 SERVICE_NAME=$SERVICE_NAME（覆盖配置文件）"
  fi
  if [ -n "$env_service_host" ]; then
    SERVICE_HOST="$env_service_host"
    print_info "使用环境变量 SERVICE_HOST=$SERVICE_HOST（覆盖配置文件）"
  fi
  if [ -n "$env_service_port" ]; then
    SERVICE_PORT="$env_service_port"
    print_info "使用环境变量 SERVICE_PORT=$SERVICE_PORT（覆盖配置文件）"
  fi
  if [ -n "$env_gateway_url" ]; then
    GATEWAY_URL="$env_gateway_url"
    print_info "使用环境变量 GATEWAY_URL=$GATEWAY_URL（覆盖配置文件）"
  fi
  
  # 步骤3: 设置默认值（优先级最低）
  SERVICE_NAME="${SERVICE_NAME:-project-oa}"
  SERVICE_HOST="${SERVICE_HOST:-192.168.1.63}"
  SERVICE_PORT="${SERVICE_PORT:-8082}"
  GATEWAY_URL="${GATEWAY_URL:-http://localhost:8080}"
  
  print_success "配置加载完成"
}

# 解析命令行参数
parse_args() {
  local has_admin_email=false
  local has_admin_phone=false
  
  # 先检查 --help（注意：-h 用于 --service-host，不是 --help）
  for arg in "$@"; do
    if [ "$arg" = "--help" ]; then
      show_usage
      exit 0
    fi
  done
  
  while [ $# -gt 0 ]; do
    case "$1" in
      # 服务配置参数（需要特殊处理，用于配置加载）
      -n|--service-name)
        SERVICE_NAME="$2"
        PASSTHROUGH_ARGS+=("$1" "$2")
        shift 2
        ;;
      -h|--service-host)
        SERVICE_HOST="$2"
        PASSTHROUGH_ARGS+=("$1" "$2")
        shift 2
        ;;
      -p|--service-port)
        SERVICE_PORT="$2"
        PASSTHROUGH_ARGS+=("$1" "$2")
        shift 2
        ;;
      -u|--service-url)
        PASSTHROUGH_ARGS+=("$1" "$2")
        shift 2
        ;;
      # 认证配置参数
      -e|--admin-email)
        ADMIN_EMAIL="$2"
        has_admin_email=true
        PASSTHROUGH_ARGS+=("$1" "$2")
        shift 2
        ;;
      -P|--admin-phone)
        has_admin_phone=true
        PASSTHROUGH_ARGS+=("$1" "$2")
        shift 2
        ;;
      -c|--code)
        CODE="$2"
        PASSTHROUGH_ARGS+=("$1" "$2")
        shift 2
        ;;
      -t|--code-type)
        CODE_TYPE="$2"
        PASSTHROUGH_ARGS+=("$1" "$2")
        shift 2
        ;;
      --token)
        PASSTHROUGH_ARGS+=("$1" "$2")
        shift 2
        ;;
      --user-id)
        PASSTHROUGH_ARGS+=("$1" "$2")
        shift 2
        ;;
      --skip-login)
        PASSTHROUGH_ARGS+=("$1")
        shift
        ;;
      # 网关配置参数（需要特殊处理）
      -g|--gateway-url)
        GATEWAY_URL="$2"
        PASSTHROUGH_ARGS+=("$1" "$2")
        shift 2
        ;;
      -a|--auth-url)
        PASSTHROUGH_ARGS+=("$1" "$2")
        shift 2
        ;;
      -r|--registry-url)
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
          ADMIN_EMAIL="$1"
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
      print_error "必须提供管理员邮箱（-e/--admin-email）或手机号（-P/--admin-phone），或使用 --token 和 --user-id"
      show_usage
      exit 1
    fi
  fi
}

# 验证配置
validate_config() {
  local has_error=false
  
  # 验证管理员邮箱（如果提供）
  if [ -n "$ADMIN_EMAIL" ] && ! echo "$ADMIN_EMAIL" | grep -Eq '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'; then
    print_error "邮箱格式不正确: $ADMIN_EMAIL"
    has_error=true
  fi
  
  # 验证服务名称
  if [ -z "$SERVICE_NAME" ]; then
    print_error "服务名称不能为空"
    has_error=true
  fi
  
  # 验证端口
  if ! echo "$SERVICE_PORT" | grep -Eq '^[0-9]+$'; then
    print_error "服务端口必须是数字: $SERVICE_PORT"
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
  
  # 保存命令行参数中的服务配置（如果提供）
  local cmd_service_name="${SERVICE_NAME:-}"
  local cmd_service_host="${SERVICE_HOST:-}"
  local cmd_service_port="${SERVICE_PORT:-}"
  local cmd_gateway_url="${GATEWAY_URL:-}"
  local cmd_admin_email="${ADMIN_EMAIL:-}"
  
  # 清空这些变量，让 load_config 可以从配置文件加载
  unset SERVICE_NAME SERVICE_HOST SERVICE_PORT GATEWAY_URL ADMIN_EMAIL
  
  # 加载配置（从配置文件和环境变量）
  load_config
  
  # 应用命令行参数（优先级最高，覆盖所有配置）
  if [ -n "$cmd_service_name" ]; then
    SERVICE_NAME="$cmd_service_name"
    print_info "使用命令行参数 SERVICE_NAME=$SERVICE_NAME（覆盖配置）"
  fi
  if [ -n "$cmd_service_host" ]; then
    SERVICE_HOST="$cmd_service_host"
    print_info "使用命令行参数 SERVICE_HOST=$SERVICE_HOST（覆盖配置）"
  fi
  if [ -n "$cmd_service_port" ]; then
    SERVICE_PORT="$cmd_service_port"
    print_info "使用命令行参数 SERVICE_PORT=$SERVICE_PORT（覆盖配置）"
  fi
  if [ -n "$cmd_gateway_url" ]; then
    GATEWAY_URL="$cmd_gateway_url"
    print_info "使用命令行参数 GATEWAY_URL=$GATEWAY_URL（覆盖配置）"
  fi
  if [ -n "$cmd_admin_email" ]; then
    ADMIN_EMAIL="$cmd_admin_email"
    print_info "使用命令行参数 ADMIN_EMAIL=$ADMIN_EMAIL（覆盖配置）"
  fi
  
  # 验证配置
  validate_config
  
  # 显示配置信息
  echo
  print_info "配置信息："
  echo "  API网关地址: $GATEWAY_URL"
  echo "  业务服务名称: $SERVICE_NAME"
  echo "  业务服务主机: $SERVICE_HOST"
  echo "  业务服务端口: $SERVICE_PORT"
  if [ -n "$ADMIN_EMAIL" ]; then
    echo "  管理员邮箱: $ADMIN_EMAIL"
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
  
  # 添加基本参数（如果透传参数中没有，则使用配置值）
  if [ "$has_service_name" = "false" ]; then
    register_args+=("-n" "$SERVICE_NAME")
  fi
  if [ "$has_service_host" = "false" ]; then
    register_args+=("-h" "$SERVICE_HOST")
  fi
  if [ "$has_service_port" = "false" ]; then
    register_args+=("-p" "$SERVICE_PORT")
  fi
  if [ "$has_gateway_url" = "false" ]; then
    register_args+=("-g" "$GATEWAY_URL")
  fi
  if [ "$has_admin_email" = "false" ] && [ "$has_admin_phone" = "false" ] && [ -n "$ADMIN_EMAIL" ]; then
    register_args+=("-e" "$ADMIN_EMAIL")
  fi
  
  # 添加所有透传参数
  register_args+=("${PASSTHROUGH_ARGS[@]}")
  
  # 调用 register-service.sh
  print_step "调用注册脚本..."
  echo
  
  if "$REGISTER_SCRIPT" "${register_args[@]}"; then
    echo
    echo "=============================="
    print_success "服务注册完成！"
    echo "=============================="
    echo
    print_info "服务信息："
    echo "  服务名称: $SERVICE_NAME"
    echo "  服务地址: http://${SERVICE_HOST}:${SERVICE_PORT}"
    echo "  健康检查: ${GATEWAY_URL}/${SERVICE_NAME}/health"
    echo
  else
    print_error "服务注册失败"
    exit 1
  fi
}

# 运行主函数
main "$@"

