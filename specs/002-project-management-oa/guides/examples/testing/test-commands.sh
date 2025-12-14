#!/bin/bash
# 常用测试命令脚本

# 测试健康检查（开发环境：直接请求业务服务器）
curl http://business-server:port/your-service/health

# 测试Token验证（请求 NebulaAuth 服务器）
curl -X POST http://nebula-auth-server:port/auth-server/v1/internal/validate_token \
  -H "Content-Type: application/json" \
  -d '{"token": "your-token"}'

# 测试用户接口（开发环境：直接请求业务服务器）
curl -H "Authorization: Bearer $TOKEN" \
  http://business-server:port/your-service/v1/user/profile

# 检查服务注册状态（请求 NebulaAuth 服务器）
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://nebula-auth-server:port/service-registry/v1/admin/services/your-service

