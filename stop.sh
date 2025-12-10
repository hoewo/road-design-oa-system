#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="${PROJECT_ROOT}/.pids"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  项目管理OA系统 - 停止脚本${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 停止服务
stop_service() {
    local pid_file=$1
    local service_name=$2

    if [ ! -f "${pid_file}" ]; then
        echo -e "${YELLOW}  ${service_name}: 未找到 PID 文件，服务可能未运行${NC}"
        # 对于后端服务，尝试通过端口查找并停止
        if [ "${service_name}" = "后端服务" ]; then
            if lsof -Pi :8082 -sTCP:LISTEN -t >/dev/null 2>&1; then
                local port_pid=$(lsof -ti :8082 2>/dev/null | head -1)
                if [ -n "${port_pid}" ]; then
                    echo -e "${YELLOW}  检测到端口 8082 被占用 (PID: ${port_pid})，尝试停止...${NC}"
                    kill ${port_pid} 2>/dev/null
                    sleep 2
                    if ps -p ${port_pid} > /dev/null 2>&1; then
                        kill -9 ${port_pid} 2>/dev/null
                    fi
                    # 停止所有相关的 go run 进程
                    pkill -f "go run.*cmd/server/main" 2>/dev/null
                fi
            fi
        fi
        return 0
    fi

    local pid=$(cat "${pid_file}")

    if ! ps -p ${pid} > /dev/null 2>&1; then
        echo -e "${YELLOW}  ${service_name}: 进程不存在 (PID: ${pid})${NC}"
        rm -f "${pid_file}"
        return 0
    fi

    echo -e "${BLUE}  停止 ${service_name} (PID: ${pid})...${NC}"

    # 对于后端服务，需要停止所有相关进程
    if [ "${service_name}" = "后端服务" ]; then
        # 停止主进程
        kill ${pid} 2>/dev/null

        # 停止所有相关的 go run 进程
        pkill -f "go run.*cmd/server/main" 2>/dev/null

        # 停止所有占用 8082 端口的进程
        local port_pids=$(lsof -ti :8082 2>/dev/null)
        if [ -n "${port_pids}" ]; then
            for port_pid in ${port_pids}; do
                if [ "${port_pid}" != "${pid}" ]; then
                    kill ${port_pid} 2>/dev/null
                fi
            done
        fi
    else
        # 其他服务直接停止
        kill ${pid} 2>/dev/null
    fi

    # 等待进程结束
    local count=0
    while ps -p ${pid} > /dev/null 2>&1 && [ ${count} -lt 10 ]; do
        sleep 1
        count=$((count + 1))
    done

    # 如果进程仍在运行，强制终止
    if ps -p ${pid} > /dev/null 2>&1; then
        echo -e "${YELLOW}  进程未响应，强制终止...${NC}"
        kill -9 ${pid} 2>/dev/null
        sleep 1
    fi

    # 对于后端服务，再次检查并清理所有相关进程
    if [ "${service_name}" = "后端服务" ]; then
        # 强制停止所有相关的 go run 进程
        pkill -9 -f "go run.*cmd/server/main" 2>/dev/null

        # 强制停止所有占用 8082 端口的进程
        local port_pids=$(lsof -ti :8082 2>/dev/null)
        if [ -n "${port_pids}" ]; then
            for port_pid in ${port_pids}; do
                kill -9 ${port_pid} 2>/dev/null
            done
        fi
        sleep 1
    fi

    # 检查进程是否已停止
    if ! ps -p ${pid} > /dev/null 2>&1; then
        echo -e "${GREEN}  ✓ ${service_name} 已停止${NC}"
        rm -f "${pid_file}"
        return 0
    else
        echo -e "${RED}  ✗ ${service_name} 停止失败${NC}"
        return 1
    fi
}

# 停止 PostgreSQL 服务
stop_postgresql() {
    echo -e "${BLUE}[4/4] 停止 PostgreSQL 服务...${NC}"

    # 检查 PID 文件
    if [ -f "${PID_DIR}/postgresql.pid" ]; then
        if stop_service "${PID_DIR}/postgresql.pid" "PostgreSQL"; then
            return 0
        fi
    fi

    # 如果没有 PID 文件，检查端口
    if ! lsof -Pi :5433 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}  PostgreSQL: 未在运行${NC}"
        return 0
    fi

    # 尝试通过 brew services 停止（如果是系统级服务）
    if command -v brew &> /dev/null; then
        if brew services list | grep -q "postgresql.*started"; then
            echo -e "${BLUE}  通过 brew services 停止 PostgreSQL...${NC}"
            if brew services stop postgresql 2>/dev/null; then
                sleep 1
                echo -e "${GREEN}  ✓ PostgreSQL 已停止${NC}"
                return 0
            fi
        fi
    fi

    # 如果端口还在监听，提示用户手动处理
    echo -e "${YELLOW}  提示: PostgreSQL 可能仍在运行${NC}"
    echo -e "${YELLOW}  请手动检查并停止 PostgreSQL 进程${NC}"
    return 0  # 不阻止继续
}

# stop_minio 已移除，直接使用 stop_service

# 主流程
main() {
    local failed=0

    # 停止前端服务
    echo -e "${BLUE}[1/4] 停止前端服务...${NC}"
    if ! stop_service "${PID_DIR}/frontend.pid" "前端服务"; then
        failed=1
    fi

    echo ""

    # 停止后端服务
    echo -e "${BLUE}[2/4] 停止后端服务...${NC}"
    if ! stop_service "${PID_DIR}/backend.pid" "后端服务"; then
        failed=1
    fi

    # 停止 MinIO 服务
    echo ""
    echo -e "${BLUE}[3/4] 停止 MinIO 服务...${NC}"
    if ! stop_service "${PID_DIR}/minio.pid" "MinIO"; then
        failed=1
    fi

    # 停止 PostgreSQL 服务
    echo ""
    if ! stop_postgresql; then
        failed=1
    fi

    echo ""

    # 清理日志文件（可选）
    read -p "是否清理日志文件? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}清理日志文件...${NC}"
        rm -f "${PROJECT_ROOT}/backend.log"
        rm -f "${PROJECT_ROOT}/frontend.log"
        rm -f "${PROJECT_ROOT}/minio.log"
        echo -e "${GREEN}  ✓ 日志文件已清理${NC}"
    fi

    echo ""

    if [ ${failed} -eq 0 ]; then
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}  所有服务已停止！${NC}"
        echo -e "${GREEN}========================================${NC}"
    else
        echo -e "${RED}========================================${NC}"
        echo -e "${RED}  部分服务停止失败${NC}"
        echo -e "${RED}========================================${NC}"
        echo ""
        echo -e "${YELLOW}提示: 可以尝试手动查找并终止进程${NC}"
        echo -e "  查找进程: ${BLUE}ps aux | grep 'go run\\|vite\\|minio'${NC}"
        echo -e "  终止进程: ${BLUE}kill -9 <PID>${NC}"
        echo -e "  PostgreSQL: ${BLUE}brew services stop postgresql${NC}"
        exit 1
    fi
}

# 执行主流程
main
