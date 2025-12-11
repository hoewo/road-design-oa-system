#!/bin/sh

# NebulaAuth 业务服务注册脚本
# 功能：快速注册业务服务到服务注册中心
# 支持通过环境变量或命令行参数配置

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 默认配置（可通过环境变量覆盖）
API_GATEWAY_URL="${API_GATEWAY_URL:-http://localhost:8080}"
AUTH_SERVER_URL="${AUTH_SERVER_URL:-${API_GATEWAY_URL}/auth-server}"
SERVICE_REGISTRY_URL="${SERVICE_REGISTRY_URL:-${API_GATEWAY_URL}/service-registry}"

# 业务服务配置（可通过环境变量或参数配置）
SERVICE_NAME="${SERVICE_NAME:-}"
SERVICE_HOST="${SERVICE_HOST:-localhost}"
SERVICE_PORT="${SERVICE_PORT:-8080}"
SERVICE_URL="${SERVICE_URL:-}"

# 管理员账号配置
ADMIN_EMAIL="${ADMIN_EMAIL:-}"
ADMIN_PHONE="${ADMIN_PHONE:-}"
ADMIN_CODE="${ADMIN_CODE:-}"

# 其他配置
CODE_TYPE="${CODE_TYPE:-email}"  # email 或 sms
SKIP_LOGIN="${SKIP_LOGIN:-false}"  # 如果已有Token，可以跳过登录
ADMIN_TOKEN="${ADMIN_TOKEN:-}"  # 如果提供Token，直接使用
ADMIN_USER_ID="${ADMIN_USER_ID:-}"  # 如果提供用户ID，直接使用

# 打印带颜色的消息
print_info() {
  echo "${BLUE}ℹ${NC} $1"
}

print_success() {
  echo "${GREEN}✓${NC} $1"
}

print_warning() {
  echo "${YELLOW}⚠${NC} $1"
}

print_error() {
  echo "${RED}✗${NC} $1" >&2
}

print_step() {
  echo "${CYAN}▶${NC} $1"
}

# 显示使用说明
show_usage() {
  cat << EOF
用法: $0 [选项]

快速注册业务服务到 NebulaAuth 服务注册中心
如果服务名称已存在，会提示是否更新现有服务

选项:
  -n, --service-name NAME      业务服务名称（必填）
  -h, --service-host HOST      业务服务主机地址（默认: localhost）
  -p, --service-port PORT      业务服务端口（默认: 8080）
  -u, --service-url URL        业务服务完整URL（可选，会自动构建）
  
  -e, --admin-email EMAIL      管理员邮箱（用于登录）
  -P, --admin-phone PHONE      管理员手机号（用于登录，与邮箱二选一）
  -c, --code CODE              验证码（如果不提供，会提示输入）
  -t, --code-type TYPE         验证码类型: email 或 sms（默认: email）
  
  -g, --gateway-url URL        API网关地址（默认: http://localhost:8080）
  -a, --auth-url URL           认证服务地址（默认: \${gateway-url}/auth-server）
  -r, --registry-url URL       服务注册中心地址（默认: \${gateway-url}/service-registry）
  
  --token TOKEN                 直接使用管理员Token（跳过登录）
  --user-id ID                  直接使用管理员用户ID（跳过获取用户信息）
  --skip-login                  跳过登录步骤（需要提供 --token 和 --user-id）
  
  --help                        显示此帮助信息

环境变量:
  所有选项都可以通过环境变量设置，环境变量名与选项对应（大写，下划线分隔）
  例如: SERVICE_NAME=my-service ADMIN_EMAIL=admin@example.com

示例:
  # 使用邮箱登录注册服务
  $0 -n my-service -h localhost -p 3000 -e admin@example.com

  # 使用手机号登录注册服务
  $0 -n my-service -h 192.168.1.100 -p 8080 -P 13800138000 -t sms

  # 使用已有Token注册服务
  $0 -n my-service -h localhost -p 3000 --token "eyJhbGc..." --user-id "uuid-here"

  # 使用环境变量
  export SERVICE_NAME=my-service
  export ADMIN_EMAIL=admin@example.com
  export SERVICE_HOST=localhost
  export SERVICE_PORT=3000
  $0

EOF
}

# 检查必需的命令
require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    print_error "需要命令 '$1'，请先安装后再运行此脚本。"
    exit 1
  fi
}

# 验证邮箱格式
is_email() {
  echo "$1" | grep -Eq '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
}

# 验证手机号格式（简单验证：11位数字）
is_phone() {
  echo "$1" | grep -Eq '^[0-9]{11}$'
}

# 发送验证码
send_verification_code() {
  local target="$1"
  local code_type="$2"
  local purpose="${3:-login}"
  
  print_step "正在发送验证码到 $target..."
  
  local payload
  payload=$(jq -n \
    --arg code_type "$code_type" \
    --arg target "$target" \
    --arg purpose "$purpose" \
    '{code_type:$code_type, target:$target, purpose:$purpose}')
  
  local resp
  resp=$(curl -sS -X POST "$AUTH_SERVER_URL/v1/public/send_verification" \
    -H 'Content-Type: application/json' \
    -d "$payload")
  
  local ok
  ok=$(echo "$resp" | jq -r '.success // empty')
  if [ "$ok" != "true" ]; then
    print_error "发送验证码失败: $(echo "$resp" | jq -r '.message // .error // "未知错误"')"
    echo "$resp" | jq . >&2
    exit 1
  fi
  
  print_success "验证码已发送"
}

# 登录获取Token和用户ID
do_login() {
  local account="$1"
  local code_type="$2"
  local code="$3"
  
  print_step "正在登录..."
  
  local login_payload
  if [ "$code_type" = "email" ]; then
    login_payload=$(jq -n \
      --arg email "$account" \
      --arg code "$code" \
      --arg code_type "$code_type" \
      '{email:$email, code:$code, code_type:$code_type, purpose:"login"}')
  else
    login_payload=$(jq -n \
      --arg phone "$account" \
      --arg code "$code" \
      --arg code_type "$code_type" \
      '{phone:$phone, code:$code, code_type:$code_type, purpose:"login"}')
  fi
  
  local resp
  resp=$(curl -sS -X POST "$AUTH_SERVER_URL/v1/public/login" \
    -H 'Content-Type: application/json' \
    -d "$login_payload")
  
  local ok
  ok=$(echo "$resp" | jq -r '.success // empty')
  if [ "$ok" != "true" ]; then
    print_error "登录失败: $(echo "$resp" | jq -r '.message // .error // "未知错误"')"
    echo "$resp" | jq . >&2
    exit 1
  fi
  
  ADMIN_TOKEN=$(echo "$resp" | jq -r '.data.tokens.access_token // empty')
  
  # 尝试从登录响应中获取用户ID（可能在不同路径）
  ADMIN_USER_ID=$(echo "$resp" | jq -r '.data.user.id // .data.user.user_id // empty')
  
  if [ -z "$ADMIN_TOKEN" ]; then
    print_error "登录响应未返回 access_token"
    echo "$resp" | jq . >&2
    exit 1
  fi
  
  if [ -z "$ADMIN_USER_ID" ]; then
    print_warning "登录响应未返回用户ID，尝试通过管理员API获取..."
    # 尝试通过管理员API获取用户ID
    if [ "$code_type" = "email" ]; then
      get_user_id_by_email "$account"
    else
      print_warning "无法通过手机号自动获取用户ID，请手动提供 --user-id"
      print_info "或者先使用邮箱登录，或通过管理员API查询用户ID"
    fi
  fi
  
  print_success "登录成功"
  print_info "Token: ${ADMIN_TOKEN}"
  print_info "用户ID: $ADMIN_USER_ID"
}

# 通过邮箱获取用户ID
get_user_id_by_email() {
  local email="$1"
  
  if [ -z "$ADMIN_TOKEN" ]; then
    print_error "需要管理员Token才能获取用户信息"
    exit 1
  fi
  
  print_step "正在获取用户信息..."
  
  local resp
  resp=$(curl -sS -X GET "$API_GATEWAY_URL/user-service/v1/admin/users/email/$email" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H 'Content-Type: application/json')
  
  local ok
  ok=$(echo "$resp" | jq -r '.success // empty')
  if [ "$ok" = "true" ]; then
    ADMIN_USER_ID=$(echo "$resp" | jq -r '.data.id // empty')
    if [ -n "$ADMIN_USER_ID" ]; then
      print_success "获取用户ID成功: $ADMIN_USER_ID"
      return 0
    fi
  fi
  
  print_warning "无法通过API获取用户ID，请手动提供 --user-id"
  return 1
}

# 检查服务是否存在
check_service_exists() {
  local server_name="$1"
  local token="$2"
  
  local resp
  local http_code
  local output
  output=$(curl -sS -w "\n%{http_code}" -X GET "$SERVICE_REGISTRY_URL/v1/admin/services/$server_name" \
    -H "Authorization: Bearer $token" \
    -H 'Content-Type: application/json' 2>/dev/null)
  
  # 分离响应体和HTTP状态码（最后一行是状态码）
  resp=$(echo "$output" | sed '$d')
  http_code=$(echo "$output" | tail -n 1)
  
  # 如果HTTP状态码是404，说明服务不存在
  if [ "$http_code" = "404" ]; then
    return 1
  fi
  
  # 如果HTTP状态码不是200，可能是网络错误或其他问题，返回1（不存在）
  if [ "$http_code" != "200" ]; then
    return 1
  fi
  
  # 检查响应是否包含错误信息
  local error
  error=$(echo "$resp" | jq -r '.error // empty' 2>/dev/null)
  if [ -n "$error" ] && [ "$error" != "null" ]; then
    # 有错误信息，服务不存在
    return 1
  fi
  
  # 检查响应是否包含服务信息
  local service
  service=$(echo "$resp" | jq -r '.service // empty' 2>/dev/null)
  if [ -n "$service" ] && [ "$service" != "null" ] && [ "$service" != "" ]; then
    # 服务存在，返回服务信息
    echo "$resp"
    return 0
  fi
  
  # 无法确定，返回1（不存在）
  return 1
}

# 更新服务
update_service() {
  local server_name="$1"
  local host="$2"
  local port="$3"
  local url="$4"
  local token="$5"
  
  print_step "正在更新服务: $server_name"
  
  local payload
  payload=$(jq -n \
    --arg host "$host" \
    --argjson port "$port" \
    --arg url "$url" \
    '{host:$host, port:$port, url:$url}')
  
  local resp
  resp=$(curl -sS -X PUT "$SERVICE_REGISTRY_URL/v1/admin/services/$server_name" \
    -H "Authorization: Bearer $token" \
    -H 'Content-Type: application/json' \
    -d "$payload")
  
  local error
  error=$(echo "$resp" | jq -r '.error // empty')
  if [ -n "$error" ]; then
    print_error "更新服务失败: $error"
    echo "$resp" | jq . >&2
    exit 1
  fi
  
  local message
  message=$(echo "$resp" | jq -r '.message // empty')
  if [ -n "$message" ]; then
    print_success "$message"
    echo
    print_info "服务信息："
    echo "$resp" | jq -r '.service | "  名称: \(.server_name)\n  主机: \(.host)\n  端口: \(.port)\n  URL: \(.url)\n  状态: \(.status)\n  创建时间: \(.created_at)\n  更新时间: \(.updated_at)"'
    return 0
  fi
  
  print_error "更新服务失败: 响应格式异常"
  echo "$resp" | jq . >&2
  exit 1
}

# 询问用户是否更新服务
ask_update_service() {
  local server_name="$1"
  local existing_service="$2"
  
  echo
  print_warning "服务 '$server_name' 已存在！"
  echo
  print_info "现有服务信息："
  echo "$existing_service" | jq -r '.service | "  名称: \(.server_name)\n  主机: \(.host)\n  端口: \(.port)\n  URL: \(.url)\n  状态: \(.status)\n  创建时间: \(.created_at)\n  更新时间: \(.updated_at)"'
  echo
  print_info "新服务配置："
  echo "  名称: $SERVICE_NAME"
  echo "  主机: $SERVICE_HOST"
  echo "  端口: $SERVICE_PORT"
  echo "  URL: $SERVICE_URL"
  echo
  
  while true; do
    printf "${YELLOW}是否要更新现有服务？(y/n): ${NC}"
    read -r answer
    case "$answer" in
      [Yy]*)
        return 0
        ;;
      [Nn]*)
        print_info "已取消操作"
        return 1
        ;;
      *)
        print_warning "请输入 y 或 n"
        ;;
    esac
  done
}

# 注册服务
register_service() {
  local server_name="$1"
  local host="$2"
  local port="$3"
  local url="$4"
  local user_id="$5"
  local token="$6"
  
  # 先检查服务是否已存在
  print_step "正在检查服务是否已存在: $server_name"
  local existing_service
  if existing_service=$(check_service_exists "$server_name" "$token"); then
    # 服务已存在，询问用户是否要更新
    if ask_update_service "$server_name" "$existing_service"; then
      # 用户选择更新
      update_service "$server_name" "$host" "$port" "$url" "$token"
      return 0
    else
      # 用户选择不更新，退出
      exit 0
    fi
  fi
  
  # 服务不存在，创建新服务
  print_step "正在注册服务: $server_name"
  
  local payload
  payload=$(jq -n \
    --arg server_name "$server_name" \
    --arg host "$host" \
    --argjson port "$port" \
    --arg url "$url" \
    --arg user_id "$user_id" \
    '{server_name:$server_name, host:$host, port:$port, url:$url, user_id:$user_id}')
  
  local resp
  resp=$(curl -sS -X POST "$SERVICE_REGISTRY_URL/v1/admin/services" \
    -H "Authorization: Bearer $token" \
    -H 'Content-Type: application/json' \
    -d "$payload")
  
  local error
  error=$(echo "$resp" | jq -r '.error // empty')
  if [ -n "$error" ]; then
    # 检查是否是服务已存在的错误
    if echo "$error" | grep -q "已存在"; then
      # 服务已存在，再次检查并询问
      if existing_service=$(check_service_exists "$server_name" "$token"); then
        if ask_update_service "$server_name" "$existing_service"; then
          update_service "$server_name" "$host" "$port" "$url" "$token"
          return 0
        else
          exit 0
        fi
      fi
    fi
    print_error "注册服务失败: $error"
    echo "$resp" | jq . >&2
    exit 1
  fi
  
  local message
  message=$(echo "$resp" | jq -r '.message // empty')
  if [ -n "$message" ]; then
    print_success "$message"
    echo
    print_info "服务信息："
    echo "$resp" | jq -r '.service | "  名称: \(.server_name)\n  主机: \(.host)\n  端口: \(.port)\n  URL: \(.url)\n  状态: \(.status)\n  创建时间: \(.created_at)"'
    return 0
  fi
  
  print_error "注册服务失败: 响应格式异常"
  echo "$resp" | jq . >&2
  exit 1
}

# 解析命令行参数
parse_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      -n|--service-name)
        SERVICE_NAME="$2"
        shift 2
        ;;
      -h|--service-host)
        SERVICE_HOST="$2"
        shift 2
        ;;
      -p|--service-port)
        SERVICE_PORT="$2"
        shift 2
        ;;
      -u|--service-url)
        SERVICE_URL="$2"
        shift 2
        ;;
      -e|--admin-email)
        ADMIN_EMAIL="$2"
        shift 2
        ;;
      -P|--admin-phone)
        ADMIN_PHONE="$2"
        shift 2
        ;;
      -c|--code)
        ADMIN_CODE="$2"
        shift 2
        ;;
      -t|--code-type)
        CODE_TYPE="$2"
        shift 2
        ;;
      -g|--gateway-url)
        API_GATEWAY_URL="$2"
        AUTH_SERVER_URL="${API_GATEWAY_URL}/auth-server"
        SERVICE_REGISTRY_URL="${API_GATEWAY_URL}/service-registry"
        shift 2
        ;;
      -a|--auth-url)
        AUTH_SERVER_URL="$2"
        shift 2
        ;;
      -r|--registry-url)
        SERVICE_REGISTRY_URL="$2"
        shift 2
        ;;
      --token)
        ADMIN_TOKEN="$2"
        shift 2
        ;;
      --user-id)
        ADMIN_USER_ID="$2"
        shift 2
        ;;
      --skip-login)
        SKIP_LOGIN="true"
        shift
        ;;
      --help)
        show_usage
        exit 0
        ;;
      *)
        print_error "未知选项: $1"
        show_usage
        exit 1
        ;;
    esac
  done
}

# 验证配置
validate_config() {
  local has_error=false
  
  # 验证服务名称
  if [ -z "$SERVICE_NAME" ]; then
    print_error "服务名称不能为空（使用 -n 或 --service-name 指定）"
    has_error=true
  fi
  
  # 验证端口
  if ! echo "$SERVICE_PORT" | grep -Eq '^[0-9]+$'; then
    print_error "服务端口必须是数字: $SERVICE_PORT"
    has_error=true
  fi
  
  # 构建服务URL（如果未提供）
  if [ -z "$SERVICE_URL" ]; then
    if [ "$SERVICE_HOST" = "localhost" ] || [ "$SERVICE_HOST" = "127.0.0.1" ]; then
      SERVICE_URL="http://${SERVICE_HOST}:${SERVICE_PORT}"
    else
      SERVICE_URL="http://${SERVICE_HOST}:${SERVICE_PORT}"
    fi
    print_info "自动构建服务URL: $SERVICE_URL"
  fi
  
  # 验证登录相关配置
  if [ "$SKIP_LOGIN" != "true" ] && [ -z "$ADMIN_TOKEN" ]; then
    if [ -z "$ADMIN_EMAIL" ] && [ -z "$ADMIN_PHONE" ]; then
      print_error "必须提供管理员邮箱（-e）或手机号（-P），或提供Token（--token）"
      has_error=true
    fi
    
    if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PHONE" ]; then
      print_error "不能同时提供邮箱和手机号，请选择其一"
      has_error=true
    fi
    
    if [ -n "$ADMIN_EMAIL" ] && ! is_email "$ADMIN_EMAIL"; then
      print_error "邮箱格式不正确: $ADMIN_EMAIL"
      has_error=true
    fi
    
    if [ -n "$ADMIN_PHONE" ] && ! is_phone "$ADMIN_PHONE"; then
      print_error "手机号格式不正确（应为11位数字）: $ADMIN_PHONE"
      has_error=true
    fi
    
    # 确定验证码类型
    if [ -n "$ADMIN_EMAIL" ]; then
      CODE_TYPE="email"
    elif [ -n "$ADMIN_PHONE" ]; then
      CODE_TYPE="sms"
    fi
  fi
  
  # 验证Token和用户ID
  if [ -n "$ADMIN_TOKEN" ] && [ -z "$ADMIN_USER_ID" ]; then
    print_warning "已提供Token但未提供用户ID，将尝试自动获取"
  fi
  
  if [ "$has_error" = "true" ]; then
    exit 1
  fi
}

# 主函数
main() {
  echo "=============================="
  echo "NebulaAuth 业务服务注册工具"
  echo "=============================="
  echo
  
  # 解析命令行参数
  parse_args "$@"
  
  # 检查必需的命令
  require_cmd curl
  require_cmd jq
  
  # 验证配置
  validate_config
  
  # 显示配置信息
  echo
  print_info "配置信息："
  echo "  API网关地址: $API_GATEWAY_URL"
  echo "  认证服务地址: $AUTH_SERVER_URL"
  echo "  服务注册中心: $SERVICE_REGISTRY_URL"
  echo "  业务服务名称: $SERVICE_NAME"
  echo "  业务服务主机: $SERVICE_HOST"
  echo "  业务服务端口: $SERVICE_PORT"
  echo "  业务服务URL: $SERVICE_URL"
  echo
  
  # 登录流程
  if [ "$SKIP_LOGIN" != "true" ] && [ -z "$ADMIN_TOKEN" ]; then
    local account
    if [ -n "$ADMIN_EMAIL" ]; then
      account="$ADMIN_EMAIL"
    else
      account="$ADMIN_PHONE"
    fi
    
    # 发送验证码
    if [ -z "$ADMIN_CODE" ]; then
      send_verification_code "$account" "$CODE_TYPE" "login"
      echo
      printf "请输入验证码: "
      read -r ADMIN_CODE
      echo
    else
      print_info "使用提供的验证码"
    fi
    
    # 登录
    do_login "$account" "$CODE_TYPE" "$ADMIN_CODE"
    echo
  elif [ -n "$ADMIN_TOKEN" ]; then
    print_info "使用提供的Token，跳过登录"
    if [ -z "$ADMIN_USER_ID" ]; then
      if [ -n "$ADMIN_EMAIL" ]; then
        get_user_id_by_email "$ADMIN_EMAIL"
      else
        print_error "需要提供用户ID（--user-id）或管理员邮箱（-e）以获取用户ID"
        exit 1
      fi
    fi
    echo
  else
    print_error "未提供登录信息或Token"
    exit 1
  fi
  
  # 注册服务
  register_service "$SERVICE_NAME" "$SERVICE_HOST" "$SERVICE_PORT" "$SERVICE_URL" "$ADMIN_USER_ID" "$ADMIN_TOKEN"
  
  echo
  echo "=============================="
  print_success "操作完成！"
  echo "=============================="
  echo
}

# 运行主函数
main "$@"

