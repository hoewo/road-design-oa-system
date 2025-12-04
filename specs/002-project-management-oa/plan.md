# Implementation Plan: 道路设计公司项目管理系统

**Branch**: `002-project-management-oa` | **Date**: 2025-01-28 | **Last Updated**: 2025-12-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-project-management-oa/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

基于道路设计公司项目管理系统需求，构建一个完整的项目管理OA系统，支持账号管理、项目信息管理、经营信息管理、生产信息管理、公司收入管理等全生命周期管理。采用React前端和Go后端的现代化Web应用架构，遵循统一的路由与认证规范，支持本地和阿里云双存储方案。

**关键设计决策**：
1. **技术架构**：以 `001-project-management-oa` 为准（React 18+ + Go 1.21+ + PostgreSQL + MinIO）
2. **业务方案**：完全参考 `002-project-management-oa` 重新设计（统一的财务记录实体、业务模型）
3. **路由与认证**：以 `specs/002-project-management-oa/auth.md` 为准（`/{service}/{version}/{auth_level}/{path}` 格式）
4. **存储方案**：同时兼容本地方案（MinIO、PostgreSQL）和阿里云方案（OSS、RDS）

## Technical Context

**Frontend Language/Version**: React 18+ with TypeScript  
**Backend Language/Version**: Go 1.21+  
**Primary Dependencies**: 
- Frontend: React Router, Axios, Ant Design, React Query
- Backend: Gin, GORM, JWT, MinIO/OSS (file storage), PostgreSQL/RDS (database)
**Storage**: 
- **本地开发**: PostgreSQL (primary), MinIO (file storage)
- **生产环境**: 阿里云 RDS (PostgreSQL), 阿里云 OSS (object storage)
- **兼容性**: 系统需同时支持两种存储方案，通过配置切换
**Testing**: 
- Frontend: Jest, React Testing Library, Cypress
- Backend: Go testing, testify, gomock
**Target Platform**: Web application (cross-platform browsers)  
**Project Type**: Web application (frontend + backend)  
**Performance Goals**: 
- 支持1000个并发项目数据管理
- 项目搜索响应时间<2秒
- 文件上传成功率>99%
- 支持100MB单文件上传
**Constraints**: 
- 系统可用性>99.5%
- 财务数据计算准确率100%
- 用户操作成功率>95%
- 支持中文界面和数据
- 必须遵循统一的路由格式：`/{service}/{version}/{auth_level}/{path}`
- 必须从 Header 中读取用户信息（X-User-ID, X-User-Username 等）
**Scale/Scope**: 
- 1000+并发用户
- 10000+项目数据
- 50+功能页面
- 多角色权限管理

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Core Principles Compliance

**I. Test-First Development (NON-NEGOTIABLE)**
- ✅ TDD mandatory: Tests written → User approved → Tests fail → Then implement
- ✅ Red-Green-Refactor cycle strictly enforced
- ✅ 前端和后端都需要完整的测试覆盖

**II. API-First Design**
- ✅ 后端API设计优先，前端基于API契约开发
- ✅ RESTful API设计，遵循统一路由格式：`/{service}/{version}/{auth_level}/{path}`
- ✅ API文档自动生成和维护（OpenAPI 3.0）

**III. Security & Data Integrity**
- ✅ 用户认证和授权机制（JWT Token，通过网关验证）
- ✅ 从 Header 中读取用户信息（X-User-ID, X-User-Username, X-User-AppID, X-User-SessionID）
- ✅ 财务数据完整性保护
- ✅ 文件上传安全验证：仅限制危险文件类型（可执行文件、脚本文件等），其他文件类型均允许上传

**IV. Performance & Scalability**
- ✅ 支持1000并发用户
- ✅ 数据库查询优化（PostgreSQL/RDS）
- ✅ 文件存储优化（MinIO/OSS）

**V. Maintainability**
- ✅ 清晰的代码结构和模块化设计
- ✅ 完整的文档和注释
- ✅ 错误处理和日志记录
- ✅ 存储方案抽象层，支持本地和阿里云切换

**GATE STATUS**: ✅ PASSED - 所有核心原则都得到满足

### Post-Design Constitution Check

*Will be updated after Phase 1 design completion*

## Project Structure

### Documentation (this feature)

```
specs/002-project-management-oa/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── openapi.yaml     # OpenAPI 3.0 specification
├── auth.md              # 路由与认证规范（已存在）
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
backend/
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── models/
│   │   ├── user.go
│   │   ├── project.go
│   │   ├── client.go
│   │   ├── project_contact.go        # 项目联系人实体
│   │   ├── contract.go
│   │   ├── contract_amendment.go
│   │   ├── bidding_info.go
│   │   ├── financial_record.go          # 统一的财务记录实体
│   │   ├── production_approval.go
│   │   ├── production_file.go
│   │   ├── external_commission.go
│   │   ├── file.go
│   │   └── discipline.go                # 专业字典
│   ├── services/
│   │   ├── auth_service.go
│   │   ├── user_service.go
│   │   ├── project_service.go
│   │   ├── project_business_service.go
│   │   ├── contract_service.go
│   │   ├── contract_amendment_service.go
│   │   ├── bidding_service.go
│   │   ├── financial_service.go         # 统一的财务服务
│   │   ├── production_service.go
│   │   ├── production_approval_service.go
│   │   ├── production_file_service.go
│   │   ├── external_commission_service.go
│   │   ├── file_service.go
│   │   └── discipline_service.go
│   ├── handlers/
│   │   ├── auth_handler.go
│   │   ├── user_handler.go
│   │   ├── project_handler.go
│   │   ├── project_business_handler.go
│   │   ├── contract_handler.go
│   │   ├── contract_amendment_handler.go
│   │   ├── bidding_handler.go
│   │   ├── financial_handler.go
│   │   ├── production_handler.go
│   │   ├── production_approval_handler.go
│   │   ├── production_file_handler.go
│   │   ├── external_commission_handler.go
│   │   └── file_handler.go
│   ├── middleware/
│   │   ├── auth.go                       # 从 Header 读取用户信息
│   │   ├── cors.go
│   │   ├── error_handler.go
│   │   └── logging.go
│   ├── config/
│   │   └── config.go                     # 支持本地/阿里云配置切换
│   └── router/
│       └── router.go                     # 统一路由格式：/{service}/{version}/{auth_level}/{path}
├── pkg/
│   ├── database/
│   │   ├── postgres.go                   # PostgreSQL 连接
│   │   └── rds.go                        # 阿里云 RDS 连接（兼容）
│   ├── storage/
│   │   ├── interface.go                  # 存储接口抽象
│   │   ├── minio.go                      # MinIO 实现
│   │   └── oss.go                        # 阿里云 OSS 实现
│   └── utils/
│       ├── errors.go
│       ├── logger.go
│       └── params.go
├── tests/
│   ├── integration/
│   ├── unit/
│   └── fixtures/
├── go.mod
├── go.sum
└── Dockerfile

frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── common/
│   │   ├── auth/
│   │   ├── project/
│   │   ├── business/
│   │   ├── production/
│   │   ├── financial/
│   │   └── file/
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── ProjectList.tsx
│   │   ├── ProjectDetail.tsx
│   │   ├── ProjectBusiness.tsx
│   │   ├── ProjectProduction.tsx
│   │   ├── CompanyRevenue.tsx
│   │   └── FileManagement.tsx
│   ├── services/
│   │   ├── api.ts                        # API 客户端，遵循统一路由格式
│   │   ├── auth.ts
│   │   ├── project.ts
│   │   ├── business.ts
│   │   ├── production.ts
│   │   ├── financial.ts
│   │   └── file.ts
│   ├── hooks/
│   ├── types/
│   ├── utils/
│   └── App.tsx
├── tests/
│   ├── components/
│   ├── pages/
│   └── e2e/
├── package.json
├── tsconfig.json
└── Dockerfile

docker-compose.yml
README.md
```

**Structure Decision**: 
- 选择Web应用结构，包含独立的前端和后端目录
- 后端使用Go + Gin框架，采用分层架构（handlers -> services -> models）
- 路由遵循统一格式：`/{service}/{version}/{auth_level}/{path}`（service: `timejourney`, version: `v1`）
- 认证通过网关验证JWT Token，从Header中读取用户信息
- 存储层抽象：支持MinIO（本地）和OSS（阿里云）切换
- 数据库层抽象：支持PostgreSQL（本地）和RDS（阿里云）切换
- 前端使用React + TypeScript，采用组件化设计
- 支持Docker容器化部署

## Design Decisions & Clarifications

### 路由与认证规范（基于 auth.md）

**路由格式**：
- 统一格式：`/{service}/{version}/{auth_level}/{path}`
- service: `timejourney`
- version: `v1`
- auth_level: `public` 或 `user`
- path: 具体接口路径

**认证级别**：
- **public**: 无需认证（如健康检查）
- **user**: JWT Token 认证（所有业务接口）

**Header 转发机制**：
- 网关验证JWT Token成功后，注入以下Header：
  - `X-User-ID`: 用户ID（UUID格式）
  - `X-User-Username`: 用户名
  - `X-User-AppID`: 应用ID
  - `X-User-SessionID`: 会话ID（UUID格式）
- **重要**：系统不会收到 `X-User-Role` 和 `X-User-IsAdmin` header（仅本地服务可接收）
- 系统必须从Header中读取用户信息，用于数据隔离和权限验证

**实现要求**：
- 后端middleware从Header中提取用户信息
- 所有业务接口使用 `user` 级别认证
- 健康检查等系统接口使用 `public` 级别认证

### 存储方案兼容性设计

**目标**：同时支持本地方案（MinIO、PostgreSQL）和阿里云方案（OSS、RDS）

**设计原则**：
1. **接口抽象**：定义统一的存储接口，隐藏具体实现
2. **配置驱动**：通过配置文件或环境变量切换存储方案
3. **代码复用**：业务逻辑层不感知底层存储实现

**文件存储抽象**：
```go
// pkg/storage/interface.go
type Storage interface {
    UploadFile(ctx context.Context, bucket, objectName string, file io.Reader, size int64) error
    GetFile(ctx context.Context, bucket, objectName string) (io.Reader, error)
    DeleteFile(ctx context.Context, bucket, objectName string) error
    GetFileURL(ctx context.Context, bucket, objectName string) (string, error)
}

// 实现：
// - pkg/storage/minio.go (本地MinIO)
// - pkg/storage/oss.go (阿里云OSS)
```

**数据库抽象**：
- 使用GORM，支持PostgreSQL和MySQL（RDS兼容）
- 通过数据库连接字符串切换（本地PostgreSQL vs 阿里云RDS）
- 数据库迁移工具支持两种数据库

**配置示例**：
```yaml
# 本地开发配置
storage:
  type: minio
  minio:
    endpoint: localhost:9000
    access_key: minioadmin
    secret_key: minioadmin

database:
  type: postgresql
  postgresql:
    host: localhost
    port: 5432
    database: project_oa

# 生产环境配置（阿里云）
storage:
  type: oss
  oss:
    endpoint: oss-cn-hangzhou.aliyuncs.com
    access_key_id: <key>
    access_key_secret: <secret>
    bucket: project-oa-files

database:
  type: rds
  rds:
    host: <rds-endpoint>
    port: 5432
    database: project_oa
    username: <username>
    password: <password>
```

### 业务模型设计（基于 002 spec.md）

**核心实体**：
1. **用户**：统一用户实体，支持账号管理、角色管理
2. **项目**：项目基本信息
3. **甲方**：项目委托方（仅包含甲方基本信息，不包含联系人信息）
4. **项目联系人**：甲方在特定项目中的联系人，作为独立实体存在，包含联系人姓名和联系电话。每个项目可以有一个项目联系人，关联到项目的甲方。相同甲方在不同项目上可以有不同的项目联系人
5. **招投标信息**：招投标阶段信息
6. **合同**：主合同信息
7. **补充协议**：合同补充协议，关联到主合同
8. **财务记录**：统一的财务记录实体（替代所有财务相关实体）
9. **批复审计信息**：生产阶段批复和审计信息
10. **生产阶段文件**：生产各阶段文件（方案、初步设计、施工图等）
11. **对外委托**：对外委托信息
12. **文件**：通用文件实体
13. **专业字典**：专业列表（支持自定义扩展）

**重要更新（2025-12-04）**：
- 新增**项目联系人**实体（ProjectContact），作为独立实体管理项目级别的联系人信息
- 从Client实体中移除ContactName和ContactPhone字段，联系人信息统一通过ProjectContact实体管理
- 支持相同甲方在不同项目上有不同的联系人，每个项目的联系人信息独立存储

**财务记录统一设计**：
- 所有财务相关业务统一为"财务记录"实体
- 通过财务类型（financial_type）区分：奖金、成本、甲方支付、我方开票、专家费、委托支付、对方开票
- 通过方向（direction）区分：收入、支出
- 支持支付和开票的关联（通过关联字段）
- 详细设计见：`research/financial-entity-unification.md`

**关键业务规则**：
- 项目编号唯一性约束
- 项目软删除策略
- 文件大小限制（100MB）
- 财务数据计算准确性要求（100%）
- 权限控制：项目管理员、经营负责人、生产负责人、财务人员等

### API 设计规范

**路由格式**：
- 所有API遵循：`/{service}/{version}/{auth_level}/{path}`
- 示例：
  - `GET /timejourney/v1/public/health` - 健康检查
  - `GET /timejourney/v1/user/projects` - 项目列表
  - `POST /timejourney/v1/user/projects` - 创建项目
  - `GET /timejourney/v1/user/projects/{id}` - 项目详情

**认证要求**：
- 所有业务接口使用 `user` 级别认证
- 从Header中读取用户信息（X-User-ID等）
- 系统接口（健康检查）使用 `public` 级别认证

**响应格式**：
- 统一JSON响应格式
- 错误信息统一格式
- 支持分页、排序、筛选

### 部署规范（基于 auth.md）

**本地开发部署**：
- 使用 `dev.sh` 脚本
- Docker Compose 启动完整环境
- 数据库初始化、环境变量配置
- 健康检查验证

**生产部署**：
- 使用 `deploy.sh` 脚本
- SSH免密连接部署
- 数据库迁移自动执行
- 回滚支持
- 健康检查验证

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|

## Next Steps

### Phase 0: Outline & Research
1. 研究存储方案抽象层设计（MinIO/OSS兼容）
2. 研究数据库兼容性设计（PostgreSQL/RDS）
3. 研究路由与认证中间件实现（Header读取）
4. 研究财务记录统一实体的详细设计
5. 研究专业字典的设计方案

### Phase 1: Design & Contracts
1. 生成 `data-model.md`：基于002的业务模型设计
2. 生成 `contracts/openapi.yaml`：API契约，遵循统一路由格式
3. 生成 `quickstart.md`：快速开始指南
4. 更新agent context（如果需要）

### Phase 2: Task Breakdown
1. 生成 `tasks.md`：任务拆解（由 `/speckit.tasks` 命令完成）

