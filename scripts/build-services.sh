#!/bin/bash

# ============================================================================
# Go 服务编译脚本
# ============================================================================
# 功能：
#   - 交叉编译 Go 后端服务为 Linux AMD64 架构
#   - 生成可执行文件供 Docker 构建使用
# ============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${PROJECT_ROOT}/backend"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Go 服务编译${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查 Go 环境
if ! command -v go &> /dev/null; then
    echo -e "${RED}✗ 未找到 Go 编译器${NC}"
    echo -e "${YELLOW}请先安装 Go: https://golang.org/dl/${NC}"
    exit 1
fi

GO_VERSION=$(go version | awk '{print $3}')
echo -e "${BLUE}Go 版本: ${GO_VERSION}${NC}"
echo ""

cd "${BACKEND_DIR}"

# 检查 go.mod
if [ ! -f "go.mod" ]; then
    echo -e "${RED}✗ 未找到 go.mod 文件${NC}"
    exit 1
fi

# 下载依赖
echo -e "${CYAN}[1/3] 下载 Go 依赖...${NC}"
go mod download || {
    echo -e "${RED}✗ 依赖下载失败${NC}"
    exit 1
}
echo -e "${GREEN}✓ 依赖下载完成${NC}"

# 清理旧的构建文件
echo ""
echo -e "${CYAN}[2/3] 清理旧的构建文件...${NC}"
rm -f main server
rm -f bin/main
mkdir -p bin
echo -e "${GREEN}✓ 清理完成${NC}"

# 交叉编译（Linux AMD64）
echo ""
echo -e "${CYAN}[3/3] 交叉编译 Go 服务 (Linux AMD64)...${NC}"
echo -e "${BLUE}  目标平台: linux/amd64${NC}"
echo -e "${BLUE}  输出文件: ${BACKEND_DIR}/bin/main${NC}"

CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -a -installsuffix cgo \
    -ldflags '-w -s' \
    -o bin/main \
    ./cmd/server || {
    echo -e "${RED}✗ 编译失败${NC}"
    exit 1
}

# 检查输出文件
if [ -f "bin/main" ]; then
    FILE_SIZE=$(du -h bin/main | cut -f1)
    echo -e "${GREEN}✓ 编译成功 (${FILE_SIZE})${NC}"
    echo ""
    echo -e "${BLUE}编译信息:${NC}"
    file bin/main
else
    echo -e "${RED}✗ 编译输出文件不存在${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Go 服务编译完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}输出文件: ${BACKEND_DIR}/bin/main${NC}"
echo -e "${BLUE}注意: 此文件将在 Docker 构建时使用${NC}"
echo ""
