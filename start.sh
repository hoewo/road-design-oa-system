#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${PROJECT_ROOT}/backend"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"
PID_DIR="${PROJECT_ROOT}/.pids"
MINIO_DATA_DIR="${PROJECT_ROOT}/.minio-data"
POSTGRESQL_DATA_DIR="${PROJECT_ROOT}/.postgresql-data"
SCRIPTS_DIR="${PROJECT_ROOT}/scripts"

# 创建必要的目录
mkdir -p "${PID_DIR}"
mkdir -p "${MINIO_DATA_DIR}"
mkdir -p "${SCRIPTS_DIR}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  项目管理OA系统 - 启动脚本${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查进程是否已经运行
check_running() {
    local pid_file=$1
    local service_name=$2

    if [ -f "${pid_file}" ]; then
        local pid=$(cat "${pid_file}")
        if ps -p ${pid} > /dev/null 2>&1; then
            echo -e "${YELLOW}警告: ${service_name} 已经在运行中 (PID: ${pid})${NC}"
            return 0
        else
            rm -f "${pid_file}"
        fi
    fi
    return 1
}

# 检查端口是否被占用
check_port() {
    local port=$1
    lsof -Pi :${port} -sTCP:LISTEN -t >/dev/null 2>&1
}

# 通过端口查找进程 PID
find_pid_by_port() {
    local port=$1
    lsof -ti :${port} 2>/dev/null | head -1
}

# 停止进程（优雅关闭→等待→强制终止）
stop_process_graceful() {
    local pid=$1
    local service_name=$2

    if [ -n "${pid}" ] && ps -p ${pid} > /dev/null 2>&1; then
        echo -e "${BLUE}  停止${service_name} (PID: ${pid})...${NC}"
        kill ${pid} 2>/dev/null
        sleep 1
        if ps -p ${pid} > /dev/null 2>&1; then
            kill -9 ${pid} 2>/dev/null
            sleep 1
        fi
    fi
}

# 显示日志尾部
show_log_tail() {
    local log_file=$1
    local lines=${2:-5}
    if [ -f "${log_file}" ]; then
        echo -e "${YELLOW}  最近的错误信息:${NC}"
        tail -${lines} "${log_file}" | sed 's/^/    /'
    fi
}

# 启动 PostgreSQL 服务
start_postgresql() {
    echo -e "${BLUE}[1/4] 启动 PostgreSQL 服务...${NC}"

    # 检查 PID 文件，如果存在且进程运行中，直接返回
    if [ -f "${PID_DIR}/postgresql.pid" ]; then
        local existing_pid=$(cat "${PID_DIR}/postgresql.pid" 2>/dev/null)
        if [ -n "${existing_pid}" ] && ps -p ${existing_pid} > /dev/null 2>&1; then
            echo -e "${YELLOW}  PostgreSQL 已经在运行中 (PID: ${existing_pid})${NC}"
            return 0
        else
            rm -f "${PID_DIR}/postgresql.pid"
        fi
    fi

    # 检查端口是否被占用
    if check_port 5433; then
        echo -e "${YELLOW}  警告: 端口 5433 已被占用，PostgreSQL 可能已在运行${NC}"
        local port_pid=$(find_pid_by_port 5433)
        if [ -n "${port_pid}" ]; then
            echo -e "${YELLOW}  检测到进程 (PID: ${port_pid})，将使用现有服务${NC}"
            echo ${port_pid} > "${PID_DIR}/postgresql.pid"
        fi
        return 0
    fi

    # 检查 PostgreSQL 是否安装
    if ! command -v postgres &> /dev/null || ! command -v initdb &> /dev/null; then
        echo -e "${RED}  错误: 未找到 PostgreSQL，请先安装${NC}"
        echo -e "${YELLOW}  安装命令: brew install postgresql${NC}"
        return 1
    fi

    # 初始化数据目录（如果不存在）
    if [ ! -d "${POSTGRESQL_DATA_DIR}" ] || [ ! -f "${POSTGRESQL_DATA_DIR}/PG_VERSION" ]; then
        echo -e "${BLUE}  初始化 PostgreSQL 数据目录...${NC}"
        echo -e "${BLUE}  数据目录: ${POSTGRESQL_DATA_DIR}${NC}"
        mkdir -p "${POSTGRESQL_DATA_DIR}"

        initdb -D "${POSTGRESQL_DATA_DIR}" --encoding=UTF8 --locale=C 2>&1 | tee "${PROJECT_ROOT}/postgresql-init.log"

        if [ $? -ne 0 ]; then
            echo -e "${RED}  ✗ PostgreSQL 数据目录初始化失败${NC}"
            echo -e "${RED}    请查看日志: ${PROJECT_ROOT}/postgresql-init.log${NC}"
            return 1
        fi

        echo -e "${GREEN}  ✓ PostgreSQL 数据目录初始化成功${NC}"

        # 配置端口为 5433
        if [ -f "${POSTGRESQL_DATA_DIR}/postgresql.conf" ]; then
            # 更新端口配置
            sed -i '' "s/^#port = .*/port = 5433/" "${POSTGRESQL_DATA_DIR}/postgresql.conf" 2>/dev/null || \
            sed -i '' "s/^port = .*/port = 5433/" "${POSTGRESQL_DATA_DIR}/postgresql.conf" 2>/dev/null || \
            echo "port = 5433" >> "${POSTGRESQL_DATA_DIR}/postgresql.conf"
        fi

        # 配置允许本地连接（无密码）
        cat >> "${POSTGRESQL_DATA_DIR}/pg_hba.conf" << EOF

# 项目本地开发配置
local   all             all                                     trust
host    all             all             127.0.0.1/32            trust
host    all             all             ::1/128                 trust
EOF
    fi

    # 启动 PostgreSQL 服务
    echo -e "${BLUE}  启动 PostgreSQL 服务器...${NC}"

    # 使用 /tmp 作为 socket 目录，避免路径过长的问题
    # 指定端口为 5433
    nohup postgres -D "${POSTGRESQL_DATA_DIR}" \
        -k /tmp \
        -p 5433 \
        > "${PROJECT_ROOT}/postgresql.log" 2>&1 &

    local pg_pid=$!

    # 等待 PostgreSQL 启动
    echo -e "${BLUE}  等待 PostgreSQL 启动...${NC}"
    local count=0
    while ! check_port 5433 && [ ${count} -lt 10 ]; do
        sleep 1
        count=$((count + 1))
    done

    # 验证进程是否存在
    if [ -z "${pg_pid}" ] || ! ps -p ${pg_pid} > /dev/null 2>&1; then
        # 尝试通过端口查找
        pg_pid=$(find_pid_by_port 5433)
    fi

    if [ -z "${pg_pid}" ] || ! ps -p ${pg_pid} > /dev/null 2>&1; then
        echo -e "${RED}  ✗ PostgreSQL 启动失败：无法找到进程${NC}"
        echo -e "${RED}    请查看日志: ${PROJECT_ROOT}/postgresql.log${NC}"
        show_log_tail "${PROJECT_ROOT}/postgresql.log" 10
        return 1
    fi

    # 保存 PID 到文件
    echo ${pg_pid} > "${PID_DIR}/postgresql.pid"

    # 验证启动成功
    if check_port 5433 && ps -p ${pg_pid} > /dev/null 2>&1; then
        echo -e "${GREEN}  ✓ PostgreSQL 启动成功 (PID: ${pg_pid})${NC}"
        echo -e "${GREEN}  ✓ PostgreSQL 地址: localhost:5433${NC}"
        echo -e "    数据目录: ${POSTGRESQL_DATA_DIR}"
        echo -e "    日志文件: ${PROJECT_ROOT}/postgresql.log"
        return 0
    else
        echo -e "${RED}  ✗ PostgreSQL 启动失败：进程或端口验证失败${NC}"
        echo -e "${RED}    请查看日志: ${PROJECT_ROOT}/postgresql.log${NC}"
        rm -f "${PID_DIR}/postgresql.pid"
        return 1
    fi
}

# 启动 MinIO 服务
start_minio() {
    echo ""
    echo -e "${BLUE}[2/4] 启动 MinIO 服务...${NC}"

    # 检查 PID 文件，如果存在且进程运行中，直接返回
    if [ -f "${PID_DIR}/minio.pid" ]; then
        local existing_pid=$(cat "${PID_DIR}/minio.pid" 2>/dev/null)
        if [ -n "${existing_pid}" ] && ps -p ${existing_pid} > /dev/null 2>&1; then
            echo -e "${YELLOW}警告: MinIO 已经在运行中 (PID: ${existing_pid})${NC}"
            return 0
        else
            # PID 文件存在但进程不存在，清理文件
            rm -f "${PID_DIR}/minio.pid"
        fi
    fi

    # 检查端口是否被占用（防止端口冲突）
    if check_port 9000 || check_port 9001; then
        echo -e "${RED}  错误: 端口 (9000/9001) 已被占用${NC}"
        echo -e "${YELLOW}  请先停止占用端口的服务或使用其他端口${NC}"
        return 1
    fi

    # 检查 MinIO 是否安装
    if ! command -v minio &> /dev/null; then
        echo -e "${RED}  错误: 未找到 MinIO，请先安装${NC}"
        echo -e "${YELLOW}  安装命令: brew install minio${NC}"
        return 1
    fi

    # 启动 MinIO 服务
    echo -e "${BLUE}  启动 MinIO 服务器...${NC}"
    echo -e "${BLUE}  数据目录: ${MINIO_DATA_DIR}${NC}"

    nohup minio server "${MINIO_DATA_DIR}" \
        --address ":9000" \
        --console-address ":9001" \
        > "${PROJECT_ROOT}/minio.log" 2>&1 &

    # 等待进程启动
    sleep 3

    # 通过端口查找 MinIO 进程 PID
    local minio_pid=$(find_pid_by_port 9000)

    # 验证进程是否存在
    if [ -z "${minio_pid}" ] || ! ps -p ${minio_pid} > /dev/null 2>&1; then
        echo -e "${RED}  ✗ MinIO 启动失败：无法找到进程${NC}"
        echo -e "${RED}    请查看日志: ${PROJECT_ROOT}/minio.log${NC}"
        show_log_tail "${PROJECT_ROOT}/minio.log"
        return 1
    fi

    # 保存 PID 到文件
    echo ${minio_pid} > "${PID_DIR}/minio.pid"

    # 验证启动成功
    if check_port 9000 && ps -p ${minio_pid} > /dev/null 2>&1; then
        echo -e "${GREEN}  ✓ MinIO 启动成功 (PID: ${minio_pid})${NC}"
        echo -e "${GREEN}  ✓ MinIO API: http://localhost:9000${NC}"
        echo -e "${GREEN}  ✓ MinIO 控制台: http://localhost:9001${NC}"
        echo -e "    日志文件: ${PROJECT_ROOT}/minio.log"
        echo -e "${YELLOW}  默认凭据: minioadmin / minioadmin${NC}"
        return 0
    else
        echo -e "${RED}  ✗ MinIO 启动失败：进程或端口验证失败${NC}"
        echo -e "${RED}    请查看日志: ${PROJECT_ROOT}/minio.log${NC}"
        rm -f "${PID_DIR}/minio.pid"
        return 1
    fi
}

# 加载环境变量
load_env() {
    # 优先从项目根目录的 .env 加载
    if [ -f "${PROJECT_ROOT}/.env" ]; then
        set -a
        source "${PROJECT_ROOT}/.env"
        set +a
        echo -e "${BLUE}  已加载项目根目录 .env 配置${NC}"
    # 兼容：从 backend/.env 加载（向后兼容）
    elif [ -f "${BACKEND_DIR}/.env" ]; then
        set -a
        source "${BACKEND_DIR}/.env"
        set +a
        echo -e "${BLUE}  已加载 backend/.env 配置${NC}"
    fi
}

# 初始化数据库
init_database() {
    echo ""
    echo -e "${BLUE}初始化数据库...${NC}"

    # 加载环境变量
    load_env

    # 从环境变量获取数据库配置（如果未设置则使用默认值）
    local db_name="${DB_NAME:-project_oa}"
    local db_user="${DB_USER:-project_oa_user}"
    local db_password="${DB_PASSWORD:-project_oa_password}"
    local db_host="${DB_HOST:-localhost}"
    local db_port="${DB_PORT:-5433}"

    # 检查数据库初始化脚本是否存在
    if [ -f "${SCRIPTS_DIR}/init-db.sh" ]; then
        echo -e "${BLUE}  运行数据库初始化脚本...${NC}"
        DB_NAME="${db_name}" DB_USER="${db_user}" DB_PASSWORD="${db_password}" \
            DB_HOST="${db_host}" DB_PORT="${db_port}" \
            "${SCRIPTS_DIR}/init-db.sh"
        return $?
    else
        echo -e "${YELLOW}  警告: 数据库初始化脚本不存在，跳过自动初始化${NC}"
        echo -e "${YELLOW}  请手动创建数据库和用户，或运行: ${SCRIPTS_DIR}/init-db.sh${NC}"
        return 0
    fi
}

# 启动后端服务
start_backend() {
    echo ""
    echo -e "${BLUE}[3/4] 启动后端服务...${NC}"

    if check_running "${PID_DIR}/backend.pid" "后端服务"; then
        return 0
    fi

    # 检查端口 8082 是否被占用
    if check_port 8082; then
        local port_pid=$(find_pid_by_port 8082)
        if [ -n "${port_pid}" ]; then
            echo -e "${YELLOW}  警告: 端口 8082 已被进程 ${port_pid} 占用${NC}"
            local process_args=$(ps -p ${port_pid} -o args= 2>/dev/null)
            # 检查是否是后端服务进程
            if echo "${process_args}" | grep -qE "go run.*server/main|cmd/server/main|project-oa-backend"; then
                echo -e "${BLUE}  检测到旧的后端服务进程，尝试停止...${NC}"
                stop_process_graceful ${port_pid} "旧后端进程"
                if ! check_port 8082; then
                    echo -e "${GREEN}  ✓ 旧进程已停止${NC}"
                else
                    echo -e "${RED}  ✗ 无法停止占用端口的进程${NC}"
                    echo -e "${YELLOW}  请手动停止进程 ${port_pid}: kill -9 ${port_pid}${NC}"
                    return 1
                fi
            else
                echo -e "${RED}  错误: 端口 8082 被其他进程占用 (PID: ${port_pid})${NC}"
                echo -e "${YELLOW}  进程信息: ${process_args}${NC}"
                echo -e "${YELLOW}  请手动停止: kill ${port_pid} 或 kill -9 ${port_pid}${NC}"
                return 1
            fi
        fi
    fi

    cd "${BACKEND_DIR}"

    # 加载环境变量（从项目根目录或 backend/.env）
    load_env

    # 初始化数据库（在启动后端之前）
    if ! init_database; then
        echo -e "${YELLOW}  警告: 数据库初始化可能失败，继续尝试启动后端...${NC}"
    fi

    # 检查 Go 是否安装
    if ! command -v go &> /dev/null; then
        echo -e "${RED}  错误: 未安装 Go，请先安装 Go 1.23+${NC}"
        return 1
    fi

    # 下载依赖（如果需要）
    if [ ! -d "vendor" ] && [ ! -f "go.sum" ]; then
        echo -e "${BLUE}  下载 Go 依赖...${NC}"
        go mod download
    fi

    # 启动后端服务
    echo -e "${BLUE}  启动 Go 服务器...${NC}"

    # 清空之前的日志文件，以便检查新的启动错误
    > "${PROJECT_ROOT}/backend.log"

    nohup go run cmd/server/main.go > "${PROJECT_ROOT}/backend.log" 2>&1 &
    local go_run_pid=$!

    # 等待编译和启动（Go 程序需要编译和启动时间）
    echo -e "${BLUE}  等待后端服务启动（编译中...）...${NC}"

    local max_wait=15  # 最多等待15秒（减少到15秒）
    local wait_count=0
    local backend_pid=""
    local compile_error=false
    local check_interval=1  # 检查间隔（秒）

    # 循环等待，直到找到进程并通过健康检查或超时
    while [ ${wait_count} -lt ${max_wait} ]; do
        sleep ${check_interval}
        wait_count=$((wait_count + 1))

        # 检查 go run 进程是否还在运行（如果编译失败或运行时错误，go run 进程会退出）
        if ! ps -p ${go_run_pid} > /dev/null 2>&1; then
            # go run 进程已退出，检查是否有错误
            if [ -f "${PROJECT_ROOT}/backend.log" ]; then
                # 检查编译错误、运行时错误（panic）或退出状态
                if grep -qE "(error|Error|ERROR|failed|Failed|FAILED|panic|PANIC|exit status)" "${PROJECT_ROOT}/backend.log" 2>/dev/null; then
                    compile_error=true
                    echo -e "${RED}  ✗ 后端服务启动失败（编译或运行时错误）${NC}"
                    echo -e "${RED}    请查看日志: ${PROJECT_ROOT}/backend.log${NC}"
                    show_log_tail "${PROJECT_ROOT}/backend.log" 20
                    return 1
                fi
            fi
        fi

        # 检查日志中是否有 panic 或运行时错误（即使进程还在运行）
        if [ -f "${PROJECT_ROOT}/backend.log" ]; then
            if grep -qE "panic:|PANIC|fatal error|runtime error" "${PROJECT_ROOT}/backend.log" 2>/dev/null; then
                echo -e "${RED}  ✗ 后端服务运行时错误（panic）${NC}"
                echo -e "${RED}    请查看日志: ${PROJECT_ROOT}/backend.log${NC}"
                show_log_tail "${PROJECT_ROOT}/backend.log" 20
                # 清理进程
                if ps -p ${go_run_pid} > /dev/null 2>&1; then
                    kill ${go_run_pid} 2>/dev/null
                fi
                return 1
            fi
        fi

        # 尝试通过端口查找进程（优先）
        backend_pid=$(find_pid_by_port 8082)
        if [ -n "${backend_pid}" ] && ps -p ${backend_pid} > /dev/null 2>&1; then
            # 验证是否是实际的后端程序（不是 go run 进程）
            local process_args=$(ps -p ${backend_pid} -o args= 2>/dev/null)
            # 如果是 go run 或 go-build 进程，跳过
            if echo "${process_args}" | grep -qvE "go run|go-build"; then
                # 确认是后端程序进程
                if echo "${process_args}" | grep -qE "cmd/server/main|project-oa-backend|/tmp/go-build"; then
                    # 找到进程后，立即尝试健康检查
                    if check_port 8082; then
                        # 使用健康检查端点确认服务真正可用
                        if curl -s -f -m 2 "http://localhost:8082/api/v1/health" > /dev/null 2>&1 || \
                           curl -s -f -m 2 "http://localhost:8082/health" > /dev/null 2>&1; then
                            # 健康检查通过，服务已就绪
                            break
                        fi
                    fi
                fi
            fi
        fi

        # 如果通过端口找不到，尝试通过进程名查找实际运行的程序
        if [ -z "${backend_pid}" ]; then
            local all_pids=$(pgrep -f "cmd/server/main|project-oa-backend" 2>/dev/null)
            for pid in ${all_pids}; do
                if [ "${pid}" != "${go_run_pid}" ] && ps -p ${pid} > /dev/null 2>&1; then
                    local process_args=$(ps -p ${pid} -o args= 2>/dev/null)
                    if echo "${process_args}" | grep -qvE "^go run"; then
                        backend_pid=${pid}
                        # 找到进程后立即尝试健康检查
                        if check_port 8082; then
                            if curl -s -f -m 2 "http://localhost:8082/api/v1/health" > /dev/null 2>&1 || \
                               curl -s -f -m 2 "http://localhost:8082/health" > /dev/null 2>&1; then
                                break
                            fi
                        fi
                    fi
                fi
            done
            if [ -n "${backend_pid}" ] && check_port 8082; then
                # 再次确认健康检查
                if curl -s -f -m 2 "http://localhost:8082/api/v1/health" > /dev/null 2>&1 || \
                   curl -s -f -m 2 "http://localhost:8082/health" > /dev/null 2>&1; then
                    break
                fi
            fi
        fi

        # 每2秒显示一次等待提示（更频繁的反馈）
        if [ $((wait_count % 2)) -eq 0 ] && [ ${wait_count} -gt 0 ]; then
            echo -e "${BLUE}    等待中... (${wait_count}/${max_wait}秒)${NC}"
        fi
    done

    # 如果超时仍未找到进程或健康检查未通过，检查日志
    if [ -z "${backend_pid}" ] || ! ps -p ${backend_pid} > /dev/null 2>&1; then
        echo -e "${RED}  ✗ 后端服务启动失败：无法找到进程（等待超时）${NC}"
        echo -e "${RED}    请查看日志: ${PROJECT_ROOT}/backend.log${NC}"
        show_log_tail "${PROJECT_ROOT}/backend.log" 15

        # 清理 go run 进程（如果还在运行）
        if ps -p ${go_run_pid} > /dev/null 2>&1; then
            kill ${go_run_pid} 2>/dev/null
            sleep 1
            if ps -p ${go_run_pid} > /dev/null 2>&1; then
                kill -9 ${go_run_pid} 2>/dev/null
            fi
        fi
        return 1
    fi

    # 最终健康检查确认
    if ! curl -s -f -m 2 "http://localhost:8082/api/v1/health" > /dev/null 2>&1 && \
       ! curl -s -f -m 2 "http://localhost:8082/health" > /dev/null 2>&1; then
        echo -e "${YELLOW}  警告: 后端进程已启动，但健康检查未通过，继续等待...${NC}"
        # 再等待最多3秒进行健康检查
        local health_wait=0
        while [ ${health_wait} -lt 3 ]; do
            sleep 0.5
            health_wait=$((health_wait + 1))
            if curl -s -f -m 2 "http://localhost:8082/api/v1/health" > /dev/null 2>&1 || \
               curl -s -f -m 2 "http://localhost:8082/health" > /dev/null 2>&1; then
                break
            fi
        done
    fi

    # 保存 PID 到文件
    echo ${backend_pid} > "${PID_DIR}/backend.pid"

    # 最终验证
    if check_port 8082 && ps -p ${backend_pid} > /dev/null 2>&1; then
        echo -e "${GREEN}  ✓ 后端服务启动成功 (PID: ${backend_pid})${NC}"
        echo -e "${GREEN}  ✓ 后端地址: http://localhost:8082${NC}"
        echo -e "    日志文件: ${PROJECT_ROOT}/backend.log"
        return 0
    else
        echo -e "${RED}  ✗ 后端服务启动失败：进程或端口验证失败${NC}"
        echo -e "${RED}    请查看日志: ${PROJECT_ROOT}/backend.log${NC}"
        show_log_tail "${PROJECT_ROOT}/backend.log" 10
        rm -f "${PID_DIR}/backend.pid"
        return 1
    fi
}

# 启动前端服务
start_frontend() {
    echo ""
    echo -e "${BLUE}[4/4] 启动前端服务...${NC}"

    if check_running "${PID_DIR}/frontend.pid" "前端服务"; then
        return 0
    fi

    cd "${FRONTEND_DIR}"

    # 加载环境变量（从项目根目录的 .env，Vite 会自动读取 VITE_ 开头的变量）
    # Vite 会自动从项目根目录的 .env 文件读取环境变量
    # 如果需要前端特定的配置，可以创建 frontend/.env.local
    if [ -f "${PROJECT_ROOT}/.env" ]; then
        echo -e "${BLUE}  使用项目根目录 .env 配置（Vite 会自动读取 VITE_ 变量）${NC}"
    elif [ -f ".env.local" ]; then
        echo -e "${BLUE}  使用 frontend/.env.local 配置${NC}"
        else
        echo -e "${YELLOW}  提示: 未找到环境配置文件，使用默认配置${NC}"
    fi

    # 检查 npm 是否安装
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}  错误: 未安装 npm，请先安装 Node.js${NC}"
        return 1
    fi

    # 安装依赖（如果需要）
    if [ ! -d "node_modules" ]; then
        echo -e "${BLUE}  安装 npm 依赖...${NC}"
        npm install
    fi

    # 启动前端服务
    echo -e "${BLUE}  启动 Vite 开发服务器...${NC}"
    nohup npm run dev > "${PROJECT_ROOT}/frontend.log" 2>&1 &
    FRONTEND_PID=$!
    echo ${FRONTEND_PID} > "${PID_DIR}/frontend.pid"

    # 等待前端启动
    sleep 3

    if ps -p ${FRONTEND_PID} > /dev/null 2>&1; then
        echo -e "${GREEN}  ✓ 前端服务启动成功 (PID: ${FRONTEND_PID})${NC}"
        echo -e "${GREEN}  ✓ 前端地址: http://localhost:3000${NC}"
        echo -e "    日志文件: ${PROJECT_ROOT}/frontend.log"
        return 0
    else
        echo -e "${RED}  ✗ 前端服务启动失败${NC}"
        echo -e "${RED}    请查看日志: ${PROJECT_ROOT}/frontend.log${NC}"
        rm -f "${PID_DIR}/frontend.pid"
        return 1
    fi
}

# 主流程
main() {
    local failed=0

    # 启动 PostgreSQL
    if ! start_postgresql; then
        echo -e "${RED}PostgreSQL 启动失败，退出...${NC}"
        exit 1
    fi

    # 启动 MinIO
    if ! start_minio; then
        echo -e "${RED}MinIO 启动失败，退出...${NC}"
        exit 1
    fi

    # 启动后端
    if ! start_backend; then
        echo -e "${RED}后端启动失败，停止已启动的服务...${NC}"
        failed=1
    fi

    # 启动前端
    if ! start_frontend; then
        echo -e "${RED}前端启动失败，停止已启动的服务...${NC}"
        failed=1
    fi

    # 如果启动失败，清理已启动的服务
    if [ ${failed} -eq 1 ]; then
        echo ""
        echo -e "${YELLOW}清理已启动的服务...${NC}"

        # 清理失败的服务
        for service in backend frontend; do
            local pid_file="${PID_DIR}/${service}.pid"
            if [ -f "${pid_file}" ]; then
                local pid=$(cat "${pid_file}" 2>/dev/null)
                stop_process_graceful "${pid}" "${service}服务"
                rm -f "${pid_file}"
            fi
        done

        # MinIO 和 PostgreSQL 是基础设施服务，即使后端/前端失败也保留
        # 用户可以通过 stop.sh 手动停止
        echo ""
        echo -e "${YELLOW}提示: MinIO 和 PostgreSQL 服务仍在运行${NC}"
        echo -e "${YELLOW}如需停止所有服务，请运行: ./stop.sh${NC}"
        echo ""
        exit 1
    fi

    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  所有服务已成功启动！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "访问地址:"
    echo -e "  前端应用: ${BLUE}http://localhost:3000${NC}"
    echo -e "  后端API:  ${BLUE}http://localhost:8082${NC}"
    echo -e "  MinIO API: ${BLUE}http://localhost:9000${NC}"
    echo -e "  MinIO 控制台: ${BLUE}http://localhost:9001${NC}"
    echo ""
    echo -e "日志文件:"
    echo -e "  后端日志: ${PROJECT_ROOT}/backend.log"
    echo -e "  前端日志: ${PROJECT_ROOT}/frontend.log"
    echo -e "  MinIO 日志: ${PROJECT_ROOT}/minio.log"
    echo ""
    echo -e "停止服务: ${YELLOW}./stop.sh${NC}"
    echo -e "查看日志: ${YELLOW}tail -f backend.log${NC} 或 ${YELLOW}tail -f frontend.log${NC}"
    echo ""
}

# 执行主流程
main
