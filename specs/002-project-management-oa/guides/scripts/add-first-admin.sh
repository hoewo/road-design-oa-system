#!/bin/sh

# NebulaAuth 添加首个管理员脚本
# 参考: guides/01-system-setup.md
# 功能: 交互式创建或设置首个管理员用户

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 数据库配置（从环境变量或使用默认值）
DB_HOST="${POSTGRES_HOST:-nebula-postgres}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-nebula_auth}"
DB_USER="${POSTGRES_USER:-nebula_admin}"
DB_PASSWORD="${POSTGRES_PASSWORD:-}"

# 检查是否在 Docker Compose 环境中
USE_DOCKER=false
if command -v docker-compose >/dev/null 2>&1 || command -v docker >/dev/null 2>&1; then
  if docker ps | grep -q "nebula-postgres" 2>/dev/null || docker-compose ps 2>/dev/null | grep -q "postgres"; then
    USE_DOCKER=true
  fi
fi

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

# 执行 SQL 命令
execute_sql() {
  local sql="$1"
  
  if [ "$USE_DOCKER" = "true" ]; then
    # 使用 Docker Compose 执行
    if command -v docker-compose >/dev/null 2>&1; then
      if [ -n "$DB_PASSWORD" ]; then
        echo "$sql" | docker-compose exec -T postgres env PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -d "$DB_NAME" 2>/dev/null || \
        echo "$sql" | docker exec -i nebula-postgres env PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -d "$DB_NAME" 2>/dev/null
      else
        echo "$sql" | docker-compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" 2>/dev/null || \
        echo "$sql" | docker exec -i nebula-postgres psql -U "$DB_USER" -d "$DB_NAME" 2>/dev/null
      fi
    else
      # 使用 docker 命令执行
      if [ -n "$DB_PASSWORD" ]; then
        echo "$sql" | docker exec -i nebula-postgres env PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -d "$DB_NAME" 2>/dev/null
      else
        echo "$sql" | docker exec -i nebula-postgres psql -U "$DB_USER" -d "$DB_NAME" 2>/dev/null
      fi
    fi
  else
    # 直接连接数据库
    if [ -n "$DB_PASSWORD" ]; then
      export PGPASSWORD="$DB_PASSWORD"
    fi
    echo "$sql" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" 2>/dev/null
  fi
}

# 检查用户是否存在
check_user_exists() {
  local email="$1"
  local result
  result=$(execute_sql "SELECT COUNT(*) FROM users WHERE email = '$email';" | grep -E '^\s*[0-9]+' | tr -d ' ')
  [ "$result" -gt 0 ]
}

# 检查用户是否已经是管理员
check_is_admin() {
  local email="$1"
  local result
  result=$(execute_sql "SELECT is_admin FROM users WHERE email = '$email';" | grep -E '^\s*(t|true|f|false)' | tr -d ' ')
  [ "$result" = "t" ] || [ "$result" = "true" ]
}

# 获取用户信息
get_user_info() {
  local email="$1"
  execute_sql "SELECT id, email, username, is_admin, is_active, is_verified FROM users WHERE email = '$email';"
}

# 设置现有用户为管理员
set_existing_user_as_admin() {
  local email="$1"
  print_info "正在将用户设置为管理员..."
  
  execute_sql "UPDATE users SET is_admin = true, updated_at = CURRENT_TIMESTAMP WHERE email = '$email';"
  
  if check_is_admin "$email"; then
    print_success "用户已成功设置为管理员！"
    return 0
  else
    print_error "设置管理员失败，请检查数据库连接和权限。"
    return 1
  fi
}

# 创建新管理员用户
create_new_admin() {
  local email="$1"
  local username="$2"
  
  print_info "正在创建新管理员用户..."
  
  execute_sql "
    INSERT INTO users (id, email, username, is_active, is_verified, is_admin)
    VALUES (
      uuid_generate_v4(),
      '$email',
      '$username',
      true,
      true,
      true
    )
    ON CONFLICT (email) DO UPDATE 
    SET is_admin = true, updated_at = CURRENT_TIMESTAMP;
  "
  
  if check_is_admin "$email"; then
    print_success "管理员用户已成功创建！"
    return 0
  else
    print_error "创建管理员失败，请检查数据库连接和权限。"
    return 1
  fi
}

# 验证管理员设置
verify_admin() {
  local email="$1"
  print_info "正在验证管理员设置..."
  
  if check_is_admin "$email"; then
    print_success "验证成功：用户是管理员"
    echo
    print_info "用户信息："
    get_user_info "$email"
    return 0
  else
    print_error "验证失败：用户不是管理员"
    return 1
  fi
}

# 主函数
main() {
  echo "=============================="
  echo "NebulaAuth 添加首个管理员"
  echo "=============================="
  echo
  
  # 检查必需的命令
  if [ "$USE_DOCKER" = "true" ]; then
    require_cmd docker
  else
    require_cmd psql
  fi
  
  # 测试数据库连接
  print_info "正在测试数据库连接..."
  if ! execute_sql "SELECT 1;" >/dev/null 2>&1; then
    print_error "无法连接到数据库。"
    echo
    if [ "$USE_DOCKER" = "true" ]; then
      print_info "检测到 Docker 环境，请确保："
      echo "  1. Docker 容器正在运行: docker ps | grep postgres"
      echo "  2. 数据库服务已启动: docker-compose ps"
    else
      print_info "请检查："
      echo "  1. 数据库服务是否运行"
      echo "  2. 连接信息是否正确 (HOST: $DB_HOST, PORT: $DB_PORT, DB: $DB_NAME, USER: $DB_USER)"
      echo "  3. 环境变量是否已设置"
    fi
    exit 1
  fi
  print_success "数据库连接成功"
  echo
  
  # 获取用户输入
  print_info "请输入管理员信息："
  echo
  
  # 输入邮箱
  while true; do
    printf "邮箱地址: "
    read -r email
    if [ -z "$email" ]; then
      print_error "邮箱不能为空"
      continue
    fi
    if ! is_email "$email"; then
      print_error "邮箱格式不正确，请重新输入"
      continue
    fi
    break
  done
  
  # 检查用户是否存在
  if check_user_exists "$email"; then
    print_info "用户已存在: $email"
    
    # 检查是否已经是管理员
    if check_is_admin "$email"; then
      print_warning "该用户已经是管理员了！"
      echo
      print_info "当前用户信息："
      get_user_info "$email"
      echo
      printf "是否要重新设置？(y/N): "
      read -r confirm
      if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        print_info "操作已取消"
        exit 0
      fi
    fi
    
    # 设置现有用户为管理员
    if set_existing_user_as_admin "$email"; then
      echo
      verify_admin "$email"
    else
      exit 1
    fi
  else
    print_info "用户不存在，将创建新管理员用户"
    
    # 输入用户名
    printf "用户名 (可选，默认使用邮箱前缀): "
    read -r username
    if [ -z "$username" ]; then
      username=$(echo "$email" | cut -d'@' -f1)
      print_info "使用默认用户名: $username"
    fi
    
    # 创建新管理员
    if create_new_admin "$email" "$username"; then
      echo
      verify_admin "$email"
    else
      exit 1
    fi
  fi
  
  echo
  echo "=============================="
  print_success "管理员设置完成！"
  echo "=============================="
  echo
  print_info "下一步："
  echo "  1. 发送验证码到邮箱: $email"
  echo "     curl -X POST http://nebula-auth-server:port/auth-server/v1/public/send_verification \\"
  echo "       -H 'Content-Type: application/json' \\"
  echo "       -d '{\"code_type\":\"email\",\"target\":\"$email\",\"purpose\":\"login\"}'"
  echo
  echo "  2. 使用验证码登录获取 JWT Token"
  echo "     curl -X POST http://nebula-auth-server:port/auth-server/v1/public/login \\"
  echo "       -H 'Content-Type: application/json' \\"
  echo "       -d '{\"email\":\"$email\",\"code\":\"验证码\",\"code_type\":\"email\",\"purpose\":\"login\"}'"
  echo
  echo "  3. 使用 Token 访问管理员 API 进行验证"
  echo "     curl -X GET http://nebula-auth-server:port/user-service/v1/admin/users \\"
  echo "       -H 'Authorization: Bearer <admin_token>'"
  echo
  print_warning "提示：系统使用验证码登录，无需设置密码。每次登录都需要先发送验证码。"
  echo
  print_info "更多信息请参考: guides/01-system-setup.md"
  echo
}

# 运行主函数
main "$@"

