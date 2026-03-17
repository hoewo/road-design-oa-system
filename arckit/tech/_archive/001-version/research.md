# Research Document: 项目管理OA系统

**Feature**: 001-project-management-oa  
**Date**: 2025-01-27  
**Purpose**: 解决技术选择和研究最佳实践

## Research Tasks & Findings

### 1. React前端技术栈选择

**Task**: 研究React 18+生态系统的最佳实践和组件库选择

**Decision**: React 18 + TypeScript + Ant Design + React Query

**Rationale**:
- React 18提供并发特性和更好的性能
- TypeScript提供类型安全和更好的开发体验
- Ant Design提供完整的中文UI组件库，符合项目需求
- React Query提供强大的数据获取和缓存能力

**Alternatives considered**:
- Material-UI: 更适合国际化项目，中文支持不如Ant Design
- Chakra UI: 组件较少，生态不如Ant Design成熟
- 原生CSS: 开发效率低，维护成本高

### 2. Go后端框架选择

**Task**: 研究Go语言Web框架和ORM选择

**Decision**: Gin + GORM + JWT

**Rationale**:
- Gin是Go生态最流行的Web框架，性能优秀，文档完善
- GORM提供强大的ORM功能，支持PostgreSQL，开发效率高
- JWT提供无状态的用户认证，适合分布式部署

**Alternatives considered**:
- Echo: 性能略好于Gin，但生态不如Gin丰富
- Fiber: 性能更好，但兼容性不如Gin
- 原生net/http: 开发效率低，需要大量样板代码

### 3. 数据库选择

**Task**: 研究关系型数据库选择，考虑中文支持和性能

**Decision**: PostgreSQL

**Rationale**:
- 对中文支持优秀，UTF-8编码完善
- 支持复杂查询和事务，适合财务数据管理
- 性能优秀，支持高并发
- 开源免费，社区活跃

**Alternatives considered**:
- MySQL: 中文支持不如PostgreSQL，复杂查询性能较差
- SQLite: 不适合高并发场景
- MongoDB: 不适合关系型数据，财务数据需要ACID特性

### 4. 文件存储方案

**Task**: 研究文件存储解决方案，支持大文件上传和下载

**Decision**: MinIO + 本地存储

**Rationale**:
- MinIO提供S3兼容的API，易于集成
- 支持大文件上传和断点续传
- 可以部署在本地，数据安全可控
- 支持文件版本管理和元数据

**Alternatives considered**:
- AWS S3: 成本高，数据在海外
- 阿里云OSS: 成本较高，依赖第三方
- 本地文件系统: 扩展性差，备份困难

### 5. 认证和授权方案

**Task**: 研究用户认证和权限管理方案

**Decision**: JWT + RBAC (基于角色的访问控制)

**Rationale**:
- JWT无状态，适合分布式部署
- RBAC模型清晰，易于理解和实现
- 支持细粒度权限控制
- 前端可以基于角色显示不同功能

**Alternatives considered**:
- Session: 需要服务器存储状态，不适合分布式
- OAuth2: 过于复杂，项目不需要第三方登录
- 简单密码认证: 安全性不足

### 6. 测试策略

**Task**: 研究前后端测试最佳实践

**Decision**: 
- 前端: Jest + React Testing Library + Cypress
- 后端: Go testing + testify + gomock

**Rationale**:
- Jest是React生态标准的测试框架
- React Testing Library专注于组件行为测试
- Cypress提供端到端测试能力
- Go testing + testify提供完整的单元测试和集成测试
- gomock提供接口模拟能力

**Alternatives considered**:
- Enzyme: 已被React Testing Library替代
- Puppeteer: 不如Cypress易用
- 手动测试: 效率低，覆盖率不足

### 7. 部署和容器化

**Task**: 研究容器化部署方案

**Decision**: Docker + Docker Compose

**Rationale**:
- Docker提供一致的运行环境
- Docker Compose简化多服务部署
- 支持开发、测试、生产环境一致性
- 易于扩展和维护

**Alternatives considered**:
- Kubernetes: 过于复杂，项目规模不需要
- 传统部署: 环境一致性差，部署复杂
- 云服务: 成本高，依赖第三方

## Technology Stack Summary

### Frontend
- **Framework**: React 18 + TypeScript
- **UI Library**: Ant Design
- **State Management**: React Query + Context API
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Testing**: Jest + React Testing Library + Cypress

### Backend
- **Language**: Go 1.21+
- **Framework**: Gin
- **ORM**: GORM
- **Database**: PostgreSQL
- **Authentication**: JWT
- **File Storage**: MinIO
- **Testing**: Go testing + testify + gomock

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Database**: PostgreSQL
- **File Storage**: MinIO
- **Reverse Proxy**: Nginx (optional)

## Performance Considerations

1. **数据库优化**: 使用索引优化查询性能，支持分页查询
2. **文件上传**: 支持分片上传和断点续传
3. **缓存策略**: 使用Redis缓存热点数据（可选）
4. **CDN**: 静态资源使用CDN加速（可选）

## Security Considerations

1. **输入验证**: 前后端双重验证，防止SQL注入和XSS
2. **文件上传**: 文件类型和大小限制，病毒扫描
3. **权限控制**: 基于角色的细粒度权限管理
4. **数据加密**: 敏感数据加密存储
5. **HTTPS**: 生产环境强制使用HTTPS

## Scalability Considerations

1. **水平扩展**: 无状态设计，支持负载均衡
2. **数据库**: 支持读写分离和分库分表
3. **文件存储**: MinIO支持集群部署
4. **缓存**: 使用Redis集群提高性能

## 需求优化点研究决策 (2025-01-27)

### 8. 经营负责人和经营人员下拉菜单交互设计

**Task**: 研究下拉菜单中新建和编辑人员的交互方式

**Decision**: 下拉菜单底部提供"新建人员"按钮，点击后弹出模态框创建；编辑通过下拉菜单中的操作项触发

**Rationale**:
- 与现有甲方下拉菜单的实现方式保持一致，用户体验统一
- 模态框方式不会打断当前操作流程
- 下拉菜单中的操作项提供快速编辑入口

**Alternatives considered**:
- 内嵌表单: 下拉菜单空间有限，不适合复杂表单
- 独立页面: 需要跳转，打断当前操作流程
- 悬浮面板: 不如模态框稳定，容易误操作

### 9. 合同文件路径字段移除

**Task**: 研究合同文件管理方式

**Decision**: 从合同表单中移除文件路径字段，合同文件通过文件管理功能单独上传和管理

**Rationale**:
- 文件路径手动输入容易出错
- 统一使用文件上传功能，确保文件存储在MinIO中
- 文件管理功能已实现，无需重复

**Alternatives considered**:
- 保留文件路径字段: 容易出错，不符合最佳实践
- 文件路径自动生成: 需要额外逻辑，增加复杂度

### 10. 专家费支付表单简化

**Task**: 研究专家费支付表单字段设计

**Decision**: 从专家费支付表单中移除专家ID字段，仅记录专家姓名

**Rationale**:
- 专家可能不是系统内用户，强制关联用户ID不合理
- 仅记录专家姓名已能满足业务需求
- 简化表单，提升用户体验

**Alternatives considered**:
- 保留专家ID字段: 限制性强，专家可能不在系统中
- 专家ID必填: 不符合实际业务场景

### 11. 财务记录编辑和删除功能

**Task**: 研究财务记录的编辑和删除功能设计

**Decision**: 
- 支持编辑和删除操作（所有有权限访问项目经营信息的用户都可以操作）
- 删除操作需要确认提示（弹出确认对话框）
- 删除后自动重新计算相关统计数据

**Rationale**:
- 财务数据可能需要修正，编辑功能是必要的
- 删除确认提示防止误操作，保护重要数据
- 自动重新计算确保统计数据实时准确

**Alternatives considered**:
- 不允许编辑: 不符合实际业务需求，财务数据可能需要修正
- 软删除: 增加复杂度，硬删除已能满足需求
- 手动刷新统计: 用户体验差，容易忘记刷新

### 12. 奖金记录编辑和删除功能

**Task**: 研究奖金记录的编辑和删除功能设计

**Decision**: 
- 支持编辑和删除操作（所有有权限访问项目经营信息的用户都可以操作）
- 删除操作需要确认提示（弹出确认对话框）
- 删除后自动更新奖金统计
- 编辑时允许修改除系统字段外的所有业务字段

**Rationale**:
- 奖金分配可能需要调整，编辑功能是必要的
- 删除确认提示防止误操作
- 自动更新统计确保数据一致性
- 系统字段（创建时间、ID）不应被修改，保持数据完整性

**Alternatives considered**:
- 不允许编辑: 不符合实际业务需求
- 仅允许创建者编辑: 权限模型过于复杂，统一权限更简单
- 允许修改所有字段: 系统字段不应被修改，保持数据完整性
