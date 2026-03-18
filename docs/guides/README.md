# NebulaAuth 开发指南

欢迎使用 NebulaAuth 开发指南！本目录包含了基于 NebulaAuth 进行应用服务开发的完整指南，按照实际开发流程组织。

## 📚 文档结构

### 🚀 开发流程文档（按实际开发顺序）

按照实际开发顺序，从系统部署到生产环境部署的完整流程：

1. **[系统部署与初始化](./01-system-setup.md)** - NebulaAuth 系统部署、数据库初始化、创建管理员
2. **[业务服务开发准备](./02-service-development-setup.md)** - 项目结构、环境配置、认证模式选择、路由规范
3. **[认证中间件实现](./03-auth-middleware.md)** - 统一认证中间件的实现，支持两种认证模式
4. **[业务接口开发](./04-business-api-development.md)** - 路由规范、认证级别、用户信息获取、错误处理
5. **[服务注册与集成](./05-service-registration.md)** - 服务注册流程、使用脚本、健康检查
6. **[前端集成](./06-frontend-integration.md)** - 登录流程、Token管理、API调用方式
7. **[测试与调试](./07-testing-debugging.md)** - 本地开发测试、生产环境测试、常见问题排查
8. **[生产环境部署](./08-production-deployment.md)** - 环境变量配置、服务部署、服务注册、监控和日志

### 📖 参考文档（解释说明类）

深入理解系统架构、最佳实践和故障排除：

- **[架构与设计原理](./reference/architecture.md)** - 系统架构、认证模式设计原理、路由设计原理、Header注入机制
- **[最佳实践](./reference/best-practices.md)** - 环境变量管理、错误处理、日志记录、性能优化、安全性考虑
- **[故障排除](./reference/troubleshooting.md)** - 常见问题及解决方案、调试命令、日志分析
- **[API 参考](./reference/api-reference.md)** - API 快速参考，链接到详细 API 文档

### 🛠️ 工具文档

- **[脚本使用指南](./tools/scripts-guide.md)** - 所有脚本的说明和使用示例

### 📝 代码示例

所有代码示例统一放在 `examples/` 目录，按功能分类：

- `examples/system-setup/` - 系统初始化示例
- `examples/service-setup/` - 服务配置示例
- `examples/auth-middleware/` - 认证中间件示例（Go、Node.js）
- `examples/business-api/` - 业务接口示例
- `examples/service-registration/` - 服务注册示例
- `examples/frontend/` - 前端集成示例
- `examples/testing/` - 测试示例
- `examples/deployment/` - 部署配置示例

### 📡 API 文档

详细的 API 文档位于 `api/` 目录：

- [API 文档目录](./api/README.md) - API 文档索引
- [认证服务 API](./api/auth-server.md) - 认证服务 API 文档
- [用户服务 API](./api/user-service.md) - 用户服务 API 文档
- [OAuth 服务 API](./api/oauth-server.md) - OAuth 服务 API 文档
- [服务注册中心 API](./api/service-registry.md) - 服务注册中心 API 文档
- [API 网关文档](./api/api-gateway.md) - API 网关文档

### 📜 脚本

便捷脚本位于 `scripts/` 目录：

- `scripts/add-first-admin.sh` - 添加首个管理员脚本
- `scripts/init-admin.sql` - SQL 初始化脚本
- `scripts/register-service.sh` - 业务服务注册脚本

详细说明请参考：[脚本使用指南](./tools/scripts-guide.md)

## 🎯 快速开始

### 我是新手，从哪里开始？

1. **部署 NebulaAuth 系统** → [系统部署与初始化](./01-system-setup.md)
2. **准备开发业务服务** → [业务服务开发准备](./02-service-development-setup.md)
3. **实现认证中间件** → [认证中间件实现](./03-auth-middleware.md)
4. **开发业务接口** → [业务接口开发](./04-business-api-development.md)
5. **注册服务** → [服务注册与集成](./05-service-registration.md)

### 按场景查找

**我需要部署系统**：
- 系统部署 → [系统部署与初始化](./01-system-setup.md)
- 创建管理员 → [系统部署与初始化](./01-system-setup.md#步骤三创建首个管理员)

**我需要开发业务服务**：
- 快速开始 → [业务服务开发准备](./02-service-development-setup.md)
- 实现认证 → [认证中间件实现](./03-auth-middleware.md)
- 开发接口 → [业务接口开发](./04-business-api-development.md)

**我需要集成前端**：
- 前端集成 → [前端集成](./06-frontend-integration.md)

**我需要部署到生产环境**：
- 生产部署 → [生产环境部署](./08-production-deployment.md)

**我遇到了问题**：
- 故障排除 → [故障排除](./reference/troubleshooting.md)
- 测试调试 → [测试与调试](./07-testing-debugging.md)

## 🔍 快速查找

### 按问题查找

- **如何快速开始开发？** → [业务服务开发准备](./02-service-development-setup.md)
- **如何实现认证？** → [认证中间件实现](./03-auth-middleware.md)
- **如何开发业务接口？** → [业务接口开发](./04-business-api-development.md)
- **如何注册服务？** → [服务注册与集成](./05-service-registration.md)
- **如何集成前端？** → [前端集成](./06-frontend-integration.md)
- **如何部署到生产环境？** → [生产环境部署](./08-production-deployment.md)
- **如何测试和调试？** → [测试与调试](./07-testing-debugging.md)
- **如何创建管理员？** → [系统部署与初始化](./01-system-setup.md#步骤三创建首个管理员)
- **服务名重复怎么办？** → [故障排除](./reference/troubleshooting.md#问题4服务注册失败)
- **如何切换开发和生产环境？** → [业务服务开发准备](./02-service-development-setup.md#认证模式选择)

### 按角色查找

**我是系统管理员**：
- 系统部署 → [系统部署与初始化](./01-system-setup.md)
- 创建管理员 → [系统部署与初始化](./01-system-setup.md#步骤三创建首个管理员)
- 批量创建用户 → [系统部署与初始化](./01-system-setup.md#步骤四批量创建用户可选)

**我是应用开发者**：
- 开发准备 → [业务服务开发准备](./02-service-development-setup.md)
- 实现认证 → [认证中间件实现](./03-auth-middleware.md)
- 开发接口 → [业务接口开发](./04-business-api-development.md)
- 前端集成 → [前端集成](./06-frontend-integration.md)

**我是运维人员**：
- 服务注册 → [服务注册与集成](./05-service-registration.md)
- 生产部署 → [生产环境部署](./08-production-deployment.md)
- 故障排除 → [故障排除](./reference/troubleshooting.md)

## 📖 文档说明

### 文档分类

- **开发流程文档**：按照实际开发顺序组织的步骤指南
- **参考文档**：深入理解系统架构、最佳实践和故障排除
- **工具文档**：脚本使用说明
- **代码示例**：按功能分类的代码示例

### 文档编写原则

1. **指导为主，代码为辅**：文档重点说明"怎么做"和"为什么"，代码示例作为参考
2. **充分利用脚本**：在文档中引用现有脚本，说明使用场景和参数
3. **按流程组织**：严格按照实际开发顺序组织文档
4. **清晰的引用**：代码示例通过文件路径引用
5. **避免重复**：相同内容只在一个地方说明，其他地方通过链接引用

## 🔗 相关资源

- [主文档 README](../README.md) - 项目总体介绍
- [API 文档](../API_DOCUMENTATION.md) - 完整的 API 接口说明
- [部署指南](../DEPLOYMENT_GUIDE.md) - 系统部署说明
- [使用指南](../USAGE_GUIDE.md) - 基本使用说明

## 📞 获取帮助

如果文档无法解决你的问题，可以：

1. 查看 [故障排除](./reference/troubleshooting.md)
2. 查看 [测试与调试](./07-testing-debugging.md)
3. 提交 GitHub Issue
4. 联系项目维护者

---

**最后更新**: 2024年
