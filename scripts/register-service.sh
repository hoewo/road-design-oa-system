#!/bin/bash

# 服务注册脚本
# 用于在生产环境部署时自动注册服务到NebulaAuth网关

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 加载配置
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# 检查必要的环境变量
if [ -z "$NEBULA_AUTH_URL" ]; then
    echo -e "${RED}Error: NEBULA_AUTH_URL is not set${NC}"
    exit 1
fi

if [ -z "$SERVICE_NAME" ]; then
    echo -e "${RED}Error: SERVICE_NAME is not set${NC}"
    exit 1
fi

if [ -z "$SERVICE_PORT" ]; then
    echo -e "${RED}Error: SERVICE_PORT is not set${NC}"
    exit 1
fi

if [ -z "$ADMIN_TOKEN" ]; then
    echo -e "${YELLOW}Warning: ADMIN_TOKEN is not set. Please provide admin token for service registration.${NC}"
    echo "Usage: ADMIN_TOKEN=<token> ./scripts/register-service.sh"
    exit 1
fi

# 构建服务URL
if [ -z "$SERVICE_HOST" ]; then
    SERVICE_URL="http://localhost:${SERVICE_PORT}"
    echo -e "${YELLOW}Warning: SERVICE_HOST is not set, using localhost${NC}"
else
    SERVICE_URL="http://${SERVICE_HOST}:${SERVICE_PORT}"
fi

echo -e "${GREEN}Registering service to NebulaAuth gateway...${NC}"
echo "Service Name: ${SERVICE_NAME}"
echo "Service URL: ${SERVICE_URL}"
echo "NebulaAuth URL: ${NEBULA_AUTH_URL}"

# 调用服务注册API
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "${NEBULA_AUTH_URL}/service-registry/v1/admin/services" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -d "{
        \"service_name\": \"${SERVICE_NAME}\",
        \"service_url\": \"${SERVICE_URL}\",
        \"description\": \"道路设计公司项目管理系统\",
        \"version\": \"v1\"
    }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo -e "${GREEN}Service registered successfully!${NC}"
    exit 0
elif [ "$HTTP_CODE" = "409" ]; then
    echo -e "${YELLOW}Service already exists, updating...${NC}"
    # 尝试更新服务
    UPDATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT \
        "${NEBULA_AUTH_URL}/service-registry/v1/admin/services/${SERVICE_NAME}" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${ADMIN_TOKEN}" \
        -d "{
            \"service_name\": \"${SERVICE_NAME}\",
            \"service_url\": \"${SERVICE_URL}\",
            \"description\": \"道路设计公司项目管理系统\",
            \"version\": \"v1\"
        }")

    UPDATE_HTTP_CODE=$(echo "$UPDATE_RESPONSE" | tail -n1)
    if [ "$UPDATE_HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}Service updated successfully!${NC}"
        exit 0
    else
        echo -e "${RED}Failed to update service. HTTP Code: ${UPDATE_HTTP_CODE}${NC}"
        echo "Response: $(echo "$UPDATE_RESPONSE" | sed '$d')"
        exit 1
    fi
else
    echo -e "${RED}Failed to register service. HTTP Code: ${HTTP_CODE}${NC}"
    echo "Response: $BODY"
    exit 1
fi
