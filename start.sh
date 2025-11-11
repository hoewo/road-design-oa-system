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

# 创建 PID 目录
mkdir -p "${PID_DIR}"

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

# 启动后端服务
start_backend() {
    echo -e "${BLUE}[1/2] 启动后端服务...${NC}"
    
    if check_running "${PID_DIR}/backend.pid" "后端服务"; then
        return 0
    fi
    
    cd "${BACKEND_DIR}"
    
    # 检查 .env 文件
    if [ ! -f ".env" ]; then
        if [ -f "env.example" ]; then
            echo -e "${YELLOW}  提示: 未找到 .env 文件，从 env.example 复制...${NC}"
            cp env.example .env
        else
            echo -e "${RED}  错误: 未找到环境配置文件${NC}"
            return 1
        fi
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
    nohup go run cmd/server/main.go > "${PROJECT_ROOT}/backend.log" 2>&1 &
    BACKEND_PID=$!
    echo ${BACKEND_PID} > "${PID_DIR}/backend.pid"
    
    # 等待后端启动
    sleep 2
    
    if ps -p ${BACKEND_PID} > /dev/null 2>&1; then
        echo -e "${GREEN}  ✓ 后端服务启动成功 (PID: ${BACKEND_PID})${NC}"
        echo -e "${GREEN}  ✓ 后端地址: http://localhost:8080${NC}"
        echo -e "    日志文件: ${PROJECT_ROOT}/backend.log"
        return 0
    else
        echo -e "${RED}  ✗ 后端服务启动失败${NC}"
        echo -e "${RED}    请查看日志: ${PROJECT_ROOT}/backend.log${NC}"
        rm -f "${PID_DIR}/backend.pid"
        return 1
    fi
}

# 启动前端服务
start_frontend() {
    echo ""
    echo -e "${BLUE}[2/2] 启动前端服务...${NC}"
    
    if check_running "${PID_DIR}/frontend.pid" "前端服务"; then
        return 0
    fi
    
    cd "${FRONTEND_DIR}"
    
    # 检查 .env.local 文件
    if [ ! -f ".env.local" ]; then
        if [ -f "env.example" ]; then
            echo -e "${YELLOW}  提示: 未找到 .env.local 文件，从 env.example 复制...${NC}"
            cp env.example .env.local
        else
            echo -e "${YELLOW}  警告: 未找到环境配置文件${NC}"
        fi
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
    # 检查依赖服务
    echo -e "${YELLOW}提示: 请确保以下服务已启动:${NC}"
    echo -e "  - PostgreSQL (默认端口 5432)"
    echo -e "  - MinIO (默认端口 9000/9001)"
    echo ""
    
    # 启动后端
    if ! start_backend; then
        echo -e "${RED}后端启动失败，退出...${NC}"
        exit 1
    fi
    
    # 启动前端
    if ! start_frontend; then
        echo -e "${RED}前端启动失败，停止后端服务...${NC}"
        if [ -f "${PID_DIR}/backend.pid" ]; then
            kill $(cat "${PID_DIR}/backend.pid") 2>/dev/null
            rm -f "${PID_DIR}/backend.pid"
        fi
        exit 1
    fi
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  所有服务已成功启动！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "访问地址:"
    echo -e "  前端应用: ${BLUE}http://localhost:3000${NC}"
    echo -e "  后端API:  ${BLUE}http://localhost:8080${NC}"
    echo ""
    echo -e "日志文件:"
    echo -e "  后端日志: ${PROJECT_ROOT}/backend.log"
    echo -e "  前端日志: ${PROJECT_ROOT}/frontend.log"
    echo ""
    echo -e "停止服务: ${YELLOW}./stop.sh${NC}"
    echo -e "查看日志: ${YELLOW}tail -f backend.log${NC} 或 ${YELLOW}tail -f frontend.log${NC}"
    echo ""
}

# 执行主流程
main

