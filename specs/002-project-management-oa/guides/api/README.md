# NebulaAuth API 文档

本文档目录包含所有微服务的API文档，由Swagger自动生成。

## 文档格式

- **Swagger UI**: 每个服务都提供了交互式Swagger UI界面
- **Markdown**: 自动生成的Markdown格式文档

## 访问方式

### Swagger UI

启动服务后，访问以下地址查看交互式API文档：

- **Auth Server**: `http://localhost:4433/swagger/index.html`
- **User Service**: `http://localhost:3001/swagger/index.html`
- **OAuth Server**: `http://localhost:4434/swagger/index.html`
- **Service Registry**: `http://localhost:4435/swagger/index.html`
- **API Gateway**: `http://localhost:8080/swagger/index.html`

### Markdown文档

Markdown文档位于本目录下：

- [auth-server.md](./auth-server.md) - 认证服务API文档
- [user-service.md](./user-service.md) - 用户服务API文档
- [oauth-server.md](./oauth-server.md) - OAuth服务API文档
- [service-registry.md](./service-registry.md) - 服务注册中心API文档
- [api-gateway.md](./api-gateway.md) - API网关文档
- [index.md](./index.md) - 文档索引

## 生成文档

### 自动生成

运行文档生成脚本：

```bash
./scripts/generate-docs.sh
```

### 手动生成

为单个服务生成文档：

```bash
cd services/auth-server
swag init -g main.go -o docs
```

## 更新文档

当API接口发生变化时，需要重新生成文档：

1. 更新代码中的Swagger注释
2. 运行 `./scripts/generate-docs.sh` 重新生成文档
3. 提交生成的文档文件

## 注意事项

- Swagger文档基于代码注释自动生成，请确保注释准确完整
- 文档生成不会影响服务运行，可以随时重新生成
- 生成的Markdown文档仅供参考，以Swagger UI为准

