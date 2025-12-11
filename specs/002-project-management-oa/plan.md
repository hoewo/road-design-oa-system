# Implementation Plan: 道路设计公司项目管理系统

**Branch**: `002-project-management-oa` | **Date**: 2025-01-28 | **Last Updated**: 2025-01-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-project-management-oa/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

基于道路设计公司项目管理系统需求，构建一个完整的项目管理OA系统，支持账号管理、项目信息管理、经营信息管理、生产信息管理、公司收入管理等全生命周期管理。采用React前端和Go后端的现代化Web应用架构，遵循统一的路由与认证规范，支持本地和阿里云双存储方案。

**关键设计决策**：
1. **技术架构**：以 `001-project-management-oa` 为准（React 18+ + Go 1.21+ + PostgreSQL + MinIO）
2. **业务方案**：完全参考 `002-project-management-oa` 重新设计（统一的财务记录实体、业务模型）
3. **路由与认证**：以 `specs/002-project-management-oa/ai-quick-reference.md` 为准（`/{service}/{version}/{auth_level}/{path}` 格式，根据业务需求选择三种认证级别：public、user、admin）
4. **存储方案**：同时兼容本地方案（MinIO、PostgreSQL）和阿里云方案（OSS、RDS）
5. **认证模式**：支持 `self_validate`（开发环境）和 `gateway`（生产环境）两种模式

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
- 必须支持三种认证级别：`public`（无需认证）、`user`（JWT Token 认证）、`admin`（管理员权限）
- 必须从 Header 中读取用户信息（X-User-ID, X-User-Username, X-User-AppID, X-User-SessionID 等）
- 必须支持认证模式切换：`self_validate`（开发环境）和 `gateway`（生产环境）
- 生产环境必须注册服务到 NebulaAuth 网关
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
- ✅ 用户认证和授权机制（JWT Token，通过网关验证或自行验证）
- ✅ 支持两种认证模式：`self_validate`（开发环境，调用 NebulaAuth API 验证）和 `gateway`（生产环境，从 Header 读取）
- ✅ 从 Header 中读取用户信息（X-User-ID, X-User-Username, X-User-AppID, X-User-SessionID）
- ✅ 支持三种认证级别：`public`（无需认证）、`user`（JWT Token）、`admin`（管理员）
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
├── ai-quick-reference.md # NebulaAuth 应用服务开发完整指南（已存在）
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
│   │   ├── auth.go                       # 统一认证中间件（支持 self_validate 和 gateway 两种模式）
│   │   ├── cors.go
│   │   ├── error_handler.go
│   │   └── logging.go
│   ├── config/
│   │   └── config.go                     # 支持本地/阿里云配置切换，支持认证模式配置（AUTH_MODE）
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
- 路由遵循统一格式：`/{service}/{version}/{auth_level}/{path}`（service: `project-oa`, version: `v1`）
- 支持三种认证级别：`public`（无需认证）、`user`（JWT Token）、`admin`（管理员）
- 认证模式：支持 `self_validate`（开发环境，调用 NebulaAuth API 验证）和 `gateway`（生产环境，从 Header 读取用户信息）
- 生产环境需注册服务到 NebulaAuth 网关
- 存储层抽象：支持MinIO（本地）和OSS（阿里云）切换
- 数据库层抽象：支持PostgreSQL（本地）和RDS（阿里云）切换
- 前端使用React + TypeScript，采用组件化设计
- 支持Docker容器化部署

## Design Decisions & Clarifications

### 路由与认证规范（基于 ai-quick-reference.md）

**路由格式**：
- 统一格式：`/{service}/{version}/{auth_level}/{path}`
- service: `{service}`（本项目服务名：`project-oa`）
- version: `v1` 或 `v2`（仅支持这两个版本）
- auth_level: `public`、`user`、`admin`（根据业务需求选择，NebulaAuth 还支持 `apikey`，但当前业务暂不需要）
- path: 具体接口路径

**认证级别选择（基于业务需求）**：
- **public**: 无需认证（健康检查等公开接口）
- **user**: JWT Token 认证（所有业务接口：项目管理、经营信息、生产信息等，权限通过业务逻辑判断）
- **admin**: 管理员权限（系统管理、用户管理、公司收入管理、项目彻底删除等）

**说明**：
- NebulaAuth 支持四种认证级别（public、user、apikey、admin），但根据当前业务需求，只使用三种
- `apikey` 级别用于服务间调用和第三方集成，当前业务暂无此需求，如未来需要可再添加
- 业务角色（项目管理员、经营负责人、生产负责人、财务人员等）通过业务逻辑判断，不是通过认证级别区分

**认证模式**：
- **self_validate**（开发环境）：
  - 业务服务器调用 NebulaAuth API 验证 Token
  - 性能：较慢（网络调用，10-50ms）
  - 使用场景：本地开发测试
- **gateway**（生产环境）：
  - 从网关注入的 Header 读取用户信息
  - 性能：快（直接读取，<1ms）
  - 使用场景：生产环境部署

**Header 转发机制**：

**user/admin 级别（外部服务会收到）**：
  - `X-User-ID`: 用户ID（UUID格式）
  - `X-User-Username`: 用户名
  - `X-User-AppID`: 应用ID
  - `X-User-SessionID`: 会话ID（UUID格式）
- **注意**：外部服务不会收到 `X-User-Role` 和 `X-User-IsAdmin` header（出于安全考虑）

**说明**：当前业务不使用 `apikey` 级别，如未来需要第三方集成或服务间调用，可参考 `ai-quick-reference.md` 中的 apikey 级别 Header 规范

**实现要求**：
- 后端middleware根据 `AUTH_MODE` 环境变量选择认证模式
- 开发环境使用 `self_validate` 模式，调用 NebulaAuth API 验证 Token
- 生产环境使用 `gateway` 模式，从 Header 中读取用户信息
- 所有业务接口根据需求选择合适的认证级别（`user` 或 `admin`）
- 健康检查等系统接口使用 `public` 级别认证
- 生产环境必须注册服务到 NebulaAuth 网关

**环境配置**：
- `AUTH_MODE`: `self_validate`（开发）或 `gateway`（生产）
- `NEBULA_AUTH_URL`: NebulaAuth 服务地址
- `API_BASE_URL`: 客户端访问地址（开发：localhost:8080，生产：网关地址）
- `SERVICE_NAME`: 服务名称（`project-oa`）
- `SERVICE_PORT`: 服务端口（`8080`）
- `SERVICE_HOST`: 云端服务器 IP（仅生产环境需要，用于服务注册）

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
- 示例（本项目服务名：`project-oa`）：
  - `GET /project-oa/v1/public/health` - 健康检查（public）
  - `GET /project-oa/v1/user/projects` - 项目列表（user）
  - `POST /project-oa/v1/user/projects` - 创建项目（user）
  - `GET /project-oa/v1/user/projects/{id}` - 项目详情（user）
  - `GET /project-oa/v1/admin/users` - 用户管理（admin）
  - `GET /project-oa/v1/admin/revenue` - 公司收入管理（admin）

**认证要求**：
- **public**：无需认证（健康检查等公开接口）
- **user**：JWT Token 认证（所有业务接口：项目管理、经营信息、生产信息等）
- **admin**：管理员权限（系统管理、用户管理、公司收入管理、项目彻底删除等）
- 从Header中读取用户信息（X-User-ID、X-User-Username、X-User-AppID、X-User-SessionID等）
- 业务角色权限（项目管理员、经营负责人、生产负责人、财务人员等）通过业务逻辑判断，不是通过认证级别区分

**响应格式**：
- 统一JSON响应格式
- 错误信息统一格式：`{"error": "错误描述", "code": "ERROR_CODE"}`
- 支持分页、排序、筛选

### 客户端登录功能设计（基于 NebulaAuth）

**设计原则**：
- 客户端直接调用 NebulaAuth 网关的登录接口，不通过业务服务
- Token 由 NebulaAuth 网关统一管理，业务服务无需处理登录逻辑
- 支持邮箱和手机号两种登录方式（验证码登录）
- Token 存储在 localStorage，所有业务接口请求自动携带

**登录流程**：

1. **发送验证码**：
   - 接口：`POST /auth-server/v1/public/send_verification`
   - 参数：`{code_type: "email"|"sms", target: "邮箱或手机号", purpose: "login"}`
   - 用途：向用户邮箱或手机发送验证码

2. **用户登录**：
   - 接口：`POST /auth-server/v1/public/login`
   - 参数：`{email/phone: "邮箱或手机号", code: "验证码", code_type: "email"|"sms", purpose: "login"}`
   - 响应：`{success: true, data: {tokens: {access_token, refresh_token}, user: {...}}}`
   - 处理：将 `access_token` 和 `refresh_token` 存储到 localStorage

3. **Token 刷新**（可选）：
   - 接口：`POST /auth-server/v1/public/refresh_token`
   - 参数：`{refresh_token: "..."}`
   - 用途：Token 过期时自动刷新，无需重新登录

**前端实现要点**：

1. **API 配置**：
   ```javascript
   // 开发环境
   API_BASE_URL = 'http://localhost:8080'  // 本地业务服务器
   NEBULA_AUTH_URL = 'http://your-aliyun-ip:8080'  // NebulaAuth网关
   
   // 生产环境
   API_BASE_URL = 'http://your-aliyun-ip:8080'  // 网关地址（所有请求通过网关）
   NEBULA_AUTH_URL = 'http://your-aliyun-ip:8080'  // 网关地址
   ```

2. **请求拦截器**：
   - 所有业务接口请求自动添加 `Authorization: Bearer <token>` Header
   - Token 过期时（401错误）自动刷新，刷新失败跳转登录页

3. **Token 管理**：
   - 存储：localStorage（`access_token`, `refresh_token`）
   - 验证：通过业务接口的响应状态判断（401表示Token无效）
   - 刷新：自动刷新机制，无需用户手动操作

**环境差异**：

| 环境 | 登录接口 | 业务接口 | Token验证 |
|------|---------|---------|----------|
| **开发环境** | 调用NebulaAuth网关 | 直接调用本地业务服务器 | 业务服务器调用网关API验证 |
| **生产环境** | 调用NebulaAuth网关 | 通过网关调用业务服务 | 网关已验证，业务服务器从Header读取 |

**错误处理**：
- 验证码发送失败：提示用户检查邮箱/手机号
- 登录失败：提示验证码错误或账号不存在
- Token过期：自动刷新，刷新失败跳转登录页
- 网络错误：提示用户检查网络连接

**安全性考虑**：
- Token存储在localStorage，注意XSS攻击防护
- 生产环境所有请求通过网关，网关已验证Token
- 业务服务无需处理Token验证（gateway模式）或调用网关API验证（self_validate模式）

**参考文档**：
- `specs/002-project-management-oa/guides/ai-quick-reference.md` - 客户端认证流程
- `specs/002-project-management-oa/guides/developer-guide.md` - 详细实现说明
- `specs/002-project-management-oa/research.md` - 技术调研（第9节）

### 部署规范（基于 ai-quick-reference.md）

**本地开发部署**：
- 使用 `dev.sh` 脚本
- Docker Compose 启动完整环境
- 数据库初始化、环境变量配置
- 设置 `AUTH_MODE=self_validate`
- 健康检查验证

**生产部署**：
- 使用 `deploy.sh` 脚本
- SSH免密连接部署
- 数据库迁移自动执行
- 设置 `AUTH_MODE=gateway`
- 注册服务到 NebulaAuth 网关（使用管理员 Token）
- 回滚支持
- 健康检查验证

**服务注册流程**：
1. 获取管理员 Token（通过 NebulaAuth 登录接口）
2. 调用服务注册 API：`POST /service-registry/v1/admin/services`
3. 如果服务名已存在，使用更新接口：`PUT /service-registry/v1/admin/services/{service_name}`
4. 验证服务注册成功（通过健康检查接口）

## Auth 服务对接规范检查与优化方案

### 当前实现检查结果

**检查时间**: 2025-01-28  
**检查依据**: `specs/002-project-management-oa/ai-quick-reference.md`

#### ✅ 已符合的要求

1. **认证模式支持**：
   - ✅ 支持 `self_validate` 和 `gateway` 两种认证模式
   - ✅ 根据 `AUTH_MODE` 环境变量自动切换
   - ✅ `self_validate` 模式正确调用 NebulaAuth API
   - ✅ `gateway` 模式正确从 Header 读取用户信息

2. **认证级别支持**：
   - ✅ 支持 `public`、`user`、`admin` 三种认证级别
   - ✅ 路由格式符合 `/{service}/{version}/{auth_level}/{path}` 规范

3. **Header 读取**：
   - ✅ 正确读取 `X-User-ID`、`X-User-Username`、`X-User-AppID`、`X-User-SessionID`
   - ✅ 正确理解 gateway 模式下不会收到 `X-User-Role` 和 `X-User-IsAdmin`

4. **环境配置**：
   - ✅ 支持 `AUTH_MODE`、`NEBULA_AUTH_URL`、`SERVICE_NAME`、`SERVICE_PORT`、`SERVICE_HOST` 配置

#### ❌ 不符合的要求

1. **健康检查端点不符合规范**：
   - **要求**：`/{service_name}/health`（例如：`/project-oa/health`）
   - **当前实现**：`/{service_name}/v1/public/health` 和 `/health`（向后兼容）
   - **问题**：健康检查端点应该直接位于服务根路径下，不需要版本号和认证级别
   - **影响**：NebulaAuth 网关无法正确识别服务健康状态

2. **Token验证API响应格式不匹配**：
   - **要求**：响应格式为：
     ```json
     {
       "success": true,
       "data": {
         "valid": true,
         "user_id": "uuid",
         "username": "string",
         "is_admin": false,
         "app_id": "string",
         "session_id": "uuid",
         "error": "string" // 可选，仅在失败时
       }
     }
     ```
   - **当前实现**：直接解析响应为 `NebulaAuthValidateResponse`，没有处理 `success` 和 `data` 包装层
   - **问题**：如果 NebulaAuth API 返回包装格式，当前代码无法正确解析
   - **影响**：`self_validate` 模式下 Token 验证可能失败

3. **错误响应格式不统一**：
   - **要求**：统一格式 `{"error": "错误描述", "code": "ERROR_CODE"}`
   - **当前实现**：部分地方只返回 `{"error": "..."}`，缺少 `code` 字段
   - **问题**：错误响应格式不一致，前端难以统一处理
   - **影响**：错误处理体验不一致

4. **错误码不规范**：
   - **要求**：使用标准错误码：`UNAUTHORIZED`、`TOKEN_MISSING`、`TOKEN_INVALID`、`VALIDATION_ERROR`、`FORBIDDEN`
   - **当前实现**：错误信息是英文，且没有统一的错误码常量
   - **问题**：错误码不统一，难以维护和扩展
   - **影响**：错误处理逻辑分散，难以统一管理

5. **缺少 API_BASE_URL 配置**：
   - **要求**：需要 `API_BASE_URL` 配置项（开发：localhost:8080，生产：网关地址）
   - **当前实现**：配置中没有 `API_BASE_URL` 字段
   - **问题**：无法明确区分客户端访问地址和服务内部地址
   - **影响**：部署配置不够清晰

6. **缺少环境配置文件**：
   - **要求**：需要 `.env.development` 和 `.env.production` 环境配置文件（参考 ai-quick-reference.md）
   - **当前实现**：只有 `env.example` 文件，`config.go` 只加载 `.env` 文件
   - **问题**：缺少开发和生产环境的独立配置文件，环境切换不够清晰
   - **影响**：不符合文档要求，环境管理不够规范

### 优化方案

#### 1. 修复健康检查端点

**方案**：
- 在 `main.go` 中添加符合规范的健康检查端点：`/{service_name}/health`
- 保留 `/health` 作为向后兼容（可选）
- 移除 `/{service_name}/v1/public/health` 端点（或保留作为备用）

**实现位置**：
- `backend/cmd/server/main.go`：添加 `/{service_name}/health` 端点
- `backend/internal/router/router.go`：移除或保留 `/{service_name}/v1/public/health`（根据需求）

**健康检查响应格式**（参考 ai-quick-reference.md）：
```json
{
  "status": "ok",
  "service": "project-oa",
  "auth_mode": "self_validate",
  "timestamp": 1234567890
}
```

#### 2. 修复Token验证API响应格式

**方案**：
- 更新 `NebulaAuthValidateResponse` 结构体，支持包装格式
- 添加 `ValidateTokenResponse` 结构体处理完整响应
- 修改 `validateTokenSelfValidate` 函数，正确处理响应包装层

**实现位置**：
- `backend/internal/middleware/auth.go`：
  - 添加 `ValidateTokenResponse` 结构体（包含 `success` 和 `data` 字段）
  - 修改 `validateTokenSelfValidate` 函数，先解析包装层，再提取 `data` 字段

**代码示例**：
```go
type ValidateTokenResponse struct {
    Success bool `json:"success"`
    Data    struct {
        Valid     bool   `json:"valid"`
        UserID    string `json:"user_id"`
        Username  string `json:"username"`
        IsAdmin   bool   `json:"is_admin"`
        AppID     string `json:"app_id"`
        SessionID string `json:"session_id"`
        Error     string `json:"error,omitempty"`
    } `json:"data"`
}
```

#### 3. 统一错误响应格式

**方案**：
- 定义标准错误码常量
- 创建统一的错误响应函数
- 更新所有错误响应，使用统一格式

**实现位置**：
- `backend/internal/middleware/auth.go`：定义错误码常量，更新错误响应
- `backend/pkg/utils/errors.go`（如不存在则创建）：定义统一错误响应函数

**错误码常量**：
```go
const (
    ErrorCodeUnauthorized    = "UNAUTHORIZED"
    ErrorCodeTokenMissing    = "TOKEN_MISSING"
    ErrorCodeTokenInvalid    = "TOKEN_INVALID"
    ErrorCodeValidationError = "VALIDATION_ERROR"
    ErrorCodeForbidden       = "FORBIDDEN"
)
```

**统一错误响应函数**：
```go
func ErrorResponse(c *gin.Context, statusCode int, errorCode, errorMsg string) {
    c.JSON(statusCode, gin.H{
        "error": errorMsg,
        "code":  errorCode,
    })
    c.Abort()
}
```

#### 4. 添加 API_BASE_URL 配置

**方案**：
- 在 `config.Config` 结构体中添加 `APIBaseURL` 字段
- 在 `env.example` 中添加 `API_BASE_URL` 配置项
- 更新配置加载逻辑

**实现位置**：
- `backend/internal/config/config.go`：添加 `APIBaseURL` 字段和加载逻辑
- `backend/env.example`：添加 `API_BASE_URL` 配置项

**配置示例**：
```go
// config.go
type Config struct {
    // ... 其他字段
    APIBaseURL string // 客户端访问地址（开发：localhost:8080，生产：网关地址）
}

// env.example
API_BASE_URL=http://localhost:8080  # 开发环境
# API_BASE_URL=http://your-aliyun-ip:8080  # 生产环境
```

#### 5. 优化环境配置文件管理（方案1）

**方案**：
- 创建 `.env.development` 和 `.env.production` 环境配置文件
- 修改 `config.go` 支持根据 `ENV` 环境变量自动加载对应配置文件
- 保留 `.env` 作为本地个人覆盖（可选，优先级最高）
- 保留 `env.example` 作为完整配置模板

**文件结构**：
```
backend/
├── env.example              # 完整配置模板（提交到版本控制）
├── .env.development         # 开发环境模板（提交到版本控制）
├── .env.production          # 生产环境模板（提交到版本控制）
└── .env                     # 本地个人覆盖（不提交，可选）
```

**实现位置**：
- `backend/.env.development`：创建开发环境配置模板
- `backend/.env.production`：创建生产环境配置模板
- `backend/internal/config/config.go`：修改配置加载逻辑

**配置加载逻辑优化**：
```go
func Load() *Config {
    // 获取环境变量，默认为 development
    env := os.Getenv("ENV")
    if env == "" {
        env = "development"
    }
    
    // 根据环境加载对应配置文件
    var envFile string
    switch env {
    case "production":
        envFile = ".env.production"
    case "development":
        envFile = ".env.development"
    default:
        envFile = ".env"  // 默认或自定义环境
    }
    
    // 加载环境配置文件
    if err := godotenv.Load(envFile); err != nil {
        log.Printf("Warning: %s not found, using environment variables only", envFile)
    }
    
    // 可选：.env 作为本地覆盖（优先级最高，如果存在会覆盖上面的配置）
    // 这样开发者可以在本地创建 .env 文件进行个人配置覆盖
    if err := godotenv.Overload(".env"); err == nil {
        log.Println("Loaded .env for local overrides")
    }
    
    // ... 其余配置加载逻辑
}
```

**`.env.development` 配置模板**：
```bash
# Database configuration
DB_HOST=localhost
DB_PORT=5433
DB_NAME=project_oa
DB_USER=project_oa_user
DB_PASSWORD=project_oa_password
DB_SSL_MODE=disable
DB_TYPE=postgresql

# JWT configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE_HOURS=24

# Storage configuration
STORAGE_TYPE=minio

# MinIO configuration
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=project-files
MINIO_USE_SSL=false

# Authentication configuration (开发环境)
AUTH_MODE=self_validate
NEBULA_AUTH_URL=http://your-aliyun-ip:8080
API_BASE_URL=http://localhost:8080
SERVICE_NAME=project-oa
SERVICE_PORT=8082
SERVICE_HOST=

# Server configuration
SERVER_PORT=8082
SERVER_HOST=0.0.0.0
CORS_ALLOWED_ORIGINS=http://localhost:3000

# Log configuration
LOG_LEVEL=debug
LOG_FORMAT=json
```

**`.env.production` 配置模板**：
```bash
# Database configuration
DB_HOST=your-rds-endpoint
DB_PORT=5432
DB_NAME=project_oa
DB_USER=project_oa_user
DB_PASSWORD=your_production_password
DB_SSL_MODE=require
DB_TYPE=rds

# JWT configuration
JWT_SECRET=your_production_jwt_secret_key
JWT_EXPIRE_HOURS=24

# Storage configuration
STORAGE_TYPE=oss

# OSS configuration
OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
OSS_ACCESS_KEY_ID=your_oss_access_key_id
OSS_ACCESS_KEY_SECRET=your_oss_access_key_secret
OSS_BUCKET_NAME=project-oa-files

# Authentication configuration (生产环境)
AUTH_MODE=gateway
NEBULA_AUTH_URL=http://your-aliyun-ip:8080
API_BASE_URL=http://your-aliyun-ip:8080
SERVICE_NAME=project-oa
SERVICE_PORT=8080
SERVICE_HOST=your-cloud-ip

# Server configuration
SERVER_PORT=8080
SERVER_HOST=0.0.0.0
CORS_ALLOWED_ORIGINS=http://your-frontend-domain

# Log configuration
LOG_LEVEL=info
LOG_FORMAT=json
```

**使用方式**：
1. **开发环境**：
   ```bash
   export ENV=development
   go run cmd/server/main.go
   # 或直接使用默认值（development）
   go run cmd/server/main.go
   ```

2. **生产环境**：
   ```bash
   export ENV=production
   ./server
   ```

3. **本地个人覆盖**：
   - 创建 `.env` 文件（不提交到版本控制）
   - 配置会覆盖 `.env.development` 或 `.env.production` 中的对应项
   - 适合个人开发时的临时配置调整

**优势**：
- ✅ 符合 `ai-quick-reference.md` 文档要求
- ✅ 支持自动加载，也支持手动导出（兼容文档中的 `export $(cat .env.development | xargs)` 方式）
- ✅ `.env` 作为本地个人覆盖，灵活性高
- ✅ 配置文件结构清晰，易于管理
- ✅ 符合常见 Go 项目实践

### 实施优先级

1. **高优先级**（影响功能）：
   - 修复健康检查端点（影响服务注册和网关识别）
   - 修复Token验证API响应格式（影响认证功能）

2. **中优先级**（影响体验）：
   - 统一错误响应格式（影响错误处理一致性）
   - 规范错误码（影响错误处理可维护性）

3. **低优先级**（影响配置清晰度）：
   - 添加 API_BASE_URL 配置（不影响功能，但提升配置清晰度）
   - 优化环境配置文件管理（方案1）（提升配置管理规范性）

### 实施计划

1. **Phase 1：修复关键问题**
   - 修复健康检查端点
   - 修复Token验证API响应格式

2. **Phase 2：优化错误处理**
   - 统一错误响应格式
   - 规范错误码

3. **Phase 3：完善配置**
   - 添加 API_BASE_URL 配置
   - 优化环境配置文件管理（创建 `.env.development` 和 `.env.production`，修改 `config.go` 加载逻辑）
   - 更新文档

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|

## Next Steps

### Phase 0: Outline & Research
1. 研究存储方案抽象层设计（MinIO/OSS兼容）
2. 研究数据库兼容性设计（PostgreSQL/RDS）
3. 研究路由与认证中间件实现（支持 self_validate 和 gateway 两种模式）
4. 研究三种认证级别的实现方式（public、user、admin），了解 NebulaAuth 支持的 apikey 级别（暂不使用）
5. 研究服务注册到 NebulaAuth 的流程
6. 研究财务记录统一实体的详细设计
7. 研究专业字典的设计方案

### Phase 1: Design & Contracts
1. 生成 `data-model.md`：基于002的业务模型设计
2. 生成 `contracts/openapi.yaml`：API契约，遵循统一路由格式
3. 生成 `quickstart.md`：快速开始指南
4. 更新agent context（如果需要）

### Phase 2: Task Breakdown
1. 生成 `tasks.md`：任务拆解（由 `/speckit.tasks` 命令完成）

