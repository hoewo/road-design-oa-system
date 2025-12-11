# Swagger UI 访问指南

## 问题已修复

所有服务的Swagger UI现在都可以正常访问了。修复内容包括：

1. ✅ 为所有服务添加了端口映射（docker-compose.yml）
2. ✅ 重新生成了Swagger文档
3. ✅ 更新了构建脚本，确保在编译前生成文档

## 访问地址

启动服务后，可以通过以下地址访问Swagger UI：

### 直接访问（推荐）

- **Auth Server**: http://localhost:4433/swagger/index.html
- **User Service**: http://localhost:3001/swagger/index.html
- **OAuth Server**: http://localhost:4434/swagger/index.html
- **Service Registry**: http://localhost:4435/swagger/index.html
- **API Gateway**: http://localhost:8080/swagger/index.html

### 通过API Gateway访问

由于网关的路由规则，Swagger UI无法通过网关访问。请直接访问各服务的端口。

## 验证方法

### 1. 检查Swagger JSON

```bash
# Auth Server
curl http://localhost:4433/swagger/doc.json

# User Service
curl http://localhost:3001/swagger/doc.json

# OAuth Server
curl http://localhost:4434/swagger/doc.json

# Service Registry
curl http://localhost:4435/swagger/doc.json

# API Gateway
curl http://localhost:8080/swagger/doc.json
```

### 2. 检查服务状态

```bash
docker-compose ps
```

确保所有服务都在运行。

## 重新生成文档

如果修改了API代码，需要重新生成文档：

```bash
# 生成所有服务的文档
./scripts/generate-docs.sh

# 重新构建服务（包含文档）
./scripts/rebuild-with-docs.sh

# 或者重新构建特定服务
./scripts/rebuild-with-docs.sh auth-server
```

## 注意事项

1. **端口映射**: 服务现在暴露了端口，可以直接访问Swagger UI
2. **文档更新**: 修改API后需要重新生成文档并重新构建服务
3. **构建顺序**: 构建脚本会自动在编译前生成文档，确保docs包被包含

## 故障排查

如果Swagger UI显示空白或无法访问：

1. **检查服务是否运行**:
   ```bash
   docker-compose ps
   ```

2. **检查端口是否映射**:
   ```bash
   docker-compose port auth-server 4433
   ```

3. **检查Swagger JSON**:
   ```bash
   curl http://localhost:4433/swagger/doc.json
   ```

4. **重新生成文档并重建**:
   ```bash
   ./scripts/rebuild-with-docs.sh
   docker-compose up -d
   ```

5. **查看服务日志**:
   ```bash
   docker-compose logs auth-server
   ```

