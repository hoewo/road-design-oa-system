# Tasks: 道路设计公司项目管理系统

**Feature**: 002-project-management-oa  
**Date**: 2025-01-28  
**Last Updated**: 2025-01-28  
**Status**: In Progress  
**Total Tasks**: 621 (已完成: 510, 待完成: 111)

## Summary

本任务列表基于现有代码基础，拆解为改造任务和新功能实现任务。首先完成现有代码的改造，然后逐步实现新的用户故事功能。

**任务组织**:
- **Phase 1**: Setup（项目初始化）
- **Phase 2**: Foundational（现有代码改造 - 路由、认证、数据模型、Auth优化、统一权限管理机制）
- **Phase 3-8**: User Stories（部分实现，US1-US6）

**最新更新（基于research.md技术方案调研）**:
- **Token刷新机制增强**（T360-T361）：解决超过2小时后重新打开网页错误跳转登录页的问题，在页面加载时先刷新Token再获取用户信息
- **管理员判断机制**（T362-T365）：实现后端管理员判断逻辑，支持self_validate和gateway两种模式
- **管理员预设用户功能**（T366-T370）：实现管理员通过业务系统调用NebulaAuth API创建用户的功能
- **用户创建流程优化**（T378-T382）：支持邮箱和手机号二选一，实现完整的查询流程（本地DB → NebulaAuth → 创建）
- **管理员编辑用户功能**（T383-T388）：实现管理员编辑用户信息功能，支持编辑所有用户信息，同步更新NebulaAuth和OA本地数据库
- **统一权限管理机制**（T389-T408）：建立统一的权限管理机制，避免权限判断代码分散到各个业务模块。实现权限服务、权限中间件和权限检查辅助函数，所有业务代码通过统一接口进行权限判断
- **招投标文件多文件支持**（T648-T653）：修改BiddingInfo模型为数组字段，支持每种类型（招标文件、投标文件、中标通知书）多个文件上传
- **专家费支付编辑和删除功能**（T654-T660）：实现专家费支付记录的编辑和删除功能，支持修改所有字段（专家姓名、金额、支付方式、支付日期、备注）

**关键改造点**:
1. 路由格式：`/api/v1` → `/{service}/v1/{auth_level}/{path}`（支持public/user/admin三种级别）
2. 认证方式：支持两种模式
   - self_validate（开发环境）：调用NebulaAuth API验证Token
   - gateway（生产环境）：从Header读取用户信息（X-User-ID等）
3. ID类型：`uint` → `UUID string`
4. 数据模型：统一财务记录、新增项目联系人实体
5. 存储方案：支持MinIO和OSS切换
6. 服务注册：生产环境需注册服务到NebulaAuth网关
7. **Auth优化**（新增）：修复健康检查端点、Token验证响应格式、统一错误响应、规范错误码、添加API_BASE_URL配置、优化环境配置文件管理
8. **统一权限管理机制**（新增）：建立统一的权限管理机制，实现权限服务（PermissionService）、权限中间件（PermissionMiddleware）和权限检查辅助函数。所有权限判断逻辑集中在权限服务中，业务代码通过统一接口进行权限判断，避免权限代码分散到各个业务模块。支持双重权限检查（用户角色 + 项目成员角色），两者取并集

---

## Phase 1: Setup

### Story Goal
完成项目基础设置，确保开发环境就绪。

### Independent Test Criteria
- 项目可以正常启动
- 数据库连接正常
- 存储服务连接正常
- 基础配置加载正常

### Implementation Tasks

- [X] T001 检查并更新项目依赖版本（Go 1.21+, React 18+）在 go.mod 和 package.json
- [X] T002 创建存储接口抽象层 pkg/storage/interface.go
- [X] T003 [P] 实现MinIO存储适配器 pkg/storage/minio.go
- [X] T004 [P] 实现OSS存储适配器 pkg/storage/oss.go
- [X] T005 更新配置结构支持存储方案切换 backend/internal/config/config.go
- [X] T006 更新数据库连接层支持PostgreSQL和RDS backend/pkg/database/postgres.go
- [X] T007 [P] 创建RDS连接适配器 backend/pkg/database/rds.go
- [X] T008 更新环境变量配置示例，添加AUTH_MODE、NEBULA_AUTH_URL等配置 backend/env.example 和 frontend/env.example

---

## Phase 2: Foundational - 现有代码改造

### Story Goal
改造现有代码以符合002规范：路由格式、认证方式、数据模型、ID类型。

### Independent Test Criteria
- 所有路由遵循新格式：`/{service}/v1/{auth_level}/{path}`
- 认证中间件从Header读取用户信息
- 所有ID字段使用UUID string类型
- 数据模型符合002规范
- **代码可以编译运行**：所有编译错误已修复，应用可以正常启动（Phase 2.8 必须完成）

### Implementation Tasks

#### 2.1 路由格式改造

- [X] T009 创建统一路由模块 backend/internal/router/router.go
- [X] T010 实现路由分组逻辑（public/user/admin级别）backend/internal/router/router.go
- [X] T011 更新main.go使用新路由模块 backend/cmd/server/main.go
- [X] T012 [P] 迁移健康检查路由到 /project-oa/v1/public/health
- [X] T013 [P] 迁移认证路由到 /project-oa/v1/public/auth/*
- [X] T014 [P] 迁移项目路由到 /project-oa/v1/user/projects/*
- [X] T015 [P] 迁移合同路由到 /project-oa/v1/user/contracts/*
- [X] T016 [P] 迁移客户端路由到 /project-oa/v1/user/clients/*
- [X] T017 [P] 迁移用户路由到 /project-oa/v1/user/users/*
- [X] T018 [P] 迁移财务路由到 /project-oa/v1/user/financial-records/*
- [X] T019 [P] 迁移文件路由到 /project-oa/v1/user/files/*
- [X] T020 [P] 迁移用户管理路由到 /project-oa/v1/admin/users/*（系统管理功能）
- [X] T021 [P] 迁移公司收入管理路由到 /project-oa/v1/admin/revenue/*（需要管理员权限）
- [X] T022 更新前端API客户端使用新路由格式 frontend/src/services/api.ts

#### 2.2 认证中间件改造

- [X] T023 重构认证中间件支持两种认证模式（self_validate/gateway）backend/internal/middleware/auth.go
- [X] T024 实现gateway模式：从Header读取用户信息（X-User-ID, X-User-Username, X-User-AppID, X-User-SessionID）backend/internal/middleware/auth.go
- [X] T025 实现self_validate模式：调用NebulaAuth API验证Token（/auth-server/v1/public/auth/validate）backend/internal/middleware/auth.go
- [X] T026 实现认证模式切换逻辑（根据AUTH_MODE环境变量）backend/internal/middleware/auth.go
- [X] T027 实现三种认证级别支持（public/user/admin）backend/internal/middleware/auth.go
- [X] T028 更新GetUserID函数返回UUID string类型 backend/internal/middleware/auth.go
- [X] T029 移除旧的JWT Token验证逻辑 backend/internal/middleware/auth.go
- [X] T030 更新所有handler使用新的用户ID获取方式 backend/internal/handlers/*.go（已完成：所有handler已使用middleware.GetUserID(c)）
- [X] T031 更新前端认证服务适配新认证方式 frontend/src/services/auth.ts

#### 2.3 数据模型ID类型改造

- [X] T032 更新User模型ID为UUID string类型 backend/internal/models/user.go
- [X] T033 更新Project模型ID为UUID string类型 backend/internal/models/project.go
- [X] T034 更新Client模型ID为UUID string类型 backend/internal/models/client.go
- [X] T035 更新Contract模型ID为UUID string类型 backend/internal/models/contract.go
- [X] T036 更新ContractAmendment模型ID为UUID string类型 backend/internal/models/contract_amendment.go
- [X] T037 更新File模型ID为UUID string类型 backend/internal/models/file.go
- [X] T038 更新FinancialRecord模型ID为UUID string类型 backend/internal/models/financial_record.go
- [X] T039 更新所有关联外键字段为UUID string类型 backend/internal/models/*.go
- [X] T040 创建数据库迁移脚本迁移现有数据ID类型 scripts/migrations/001_convert_ids_to_uuid.sql（模板已创建）
- [X] T041 更新所有Service层使用UUID string类型 backend/internal/services/*.go（已完成：UserService, ProjectService, ClientService, FinancialService, ContractService, FileService, ProjectMemberService, ProjectBusinessService, ProjectDisciplineService, ProjectContactService, DisciplineService, CompanyConfigService, ExternalCommissionService, ProductionCostService, ProductionApprovalService, ProductionFileService, ContractAmendmentService, ExpertFeePaymentService, BonusService）
- [X] T042 更新所有Handler层使用UUID string类型 backend/internal/handlers/*.go（已完成：UserHandler, ProjectHandler, ClientHandler, FinancialHandler, ContractHandler, ProjectMemberHandler, ProjectBusinessHandler, ProjectDisciplineHandler, ProjectContactHandler, DisciplineHandler, ProductionFileHandler, ProductionApprovalHandler, ExternalCommissionHandler, ProductionCostHandler, ContractAmendmentHandler, ExpertFeePaymentHandler, BonusHandler）

#### 2.4 项目联系人实体改造

- [X] T043 创建ProjectContact模型 backend/internal/models/project_contact.go
- [X] T044 从Client模型移除ContactName和ContactPhone字段 backend/internal/models/client.go
- [X] T045 更新Project模型添加ProjectContact关联 backend/internal/models/project.go
- [X] T046 创建ProjectContactService backend/internal/services/project_contact_service.go
- [X] T047 创建ProjectContactHandler backend/internal/handlers/project_contact_handler.go
- [X] T048 创建数据库迁移脚本添加project_contacts表 scripts/migrations/002_add_project_contacts.sql
- [X] T049 创建数据迁移脚本迁移联系人数据 scripts/migrations/003_migrate_contact_data.sql

#### 2.5 财务记录实体统一改造

- [X] T050 重构FinancialRecord模型为统一财务记录实体 backend/internal/models/financial_record.go
- [X] T051 添加FinancialType和FinancialDirection枚举 backend/internal/models/financial_record.go
- [X] T052 添加类型特定字段（BonusCategory, CostCategory等）backend/internal/models/financial_record.go
- [X] T053 更新FinancialService支持统一财务记录 backend/internal/services/financial_service.go
- [X] T054 迁移Bonus数据到FinancialRecord scripts/migrations/004_migrate_bonus_to_financial_record.sql
- [X] T055 迁移ExpertFeePayment数据到FinancialRecord scripts/migrations/005_migrate_expert_fee_to_financial_record.sql
- [X] T056 迁移ProductionCost数据到FinancialRecord scripts/migrations/006_migrate_production_cost_to_financial_record.sql
- [X] T057 更新FinancialHandler支持新财务记录类型 backend/internal/handlers/financial_handler.go
- [ ] T058 移除旧的Bonus模型 backend/internal/models/bonus.go（注意：当前BonusService和BonusHandler仍在路由中使用，需要先完成路由重构，将所有Bonus相关功能迁移到FinancialHandler后再删除）
- [ ] T059 移除旧的ExpertFeePayment模型 backend/internal/models/expert_fee_payment.go（注意：当前ExpertFeePaymentService和ExpertFeePaymentHandler仍在路由中使用，需要先完成路由重构，将所有ExpertFeePayment相关功能迁移到FinancialHandler后再删除）
- [ ] T060 移除旧的ProductionCost模型 backend/internal/models/production_cost.go（注意：当前ProductionCostService和ProductionCostHandler仍在路由中使用，需要先完成路由重构，将所有ProductionCost相关功能迁移到FinancialHandler后再删除）

#### 2.6 专业字典实体

- [X] T061 创建Discipline模型 backend/internal/models/discipline.go
- [X] T062 创建DisciplineService backend/internal/services/discipline_service.go
- [X] T063 创建DisciplineHandler backend/internal/handlers/discipline_handler.go
- [X] T064 创建数据库迁移脚本添加disciplines表 scripts/migrations/007_add_disciplines.sql

#### 2.7 服务注册和部署配置

- [X] T065 实现服务注册功能（调用NebulaAuth服务注册API）backend/internal/services/service_registry.go
- [X] T066 创建服务注册脚本（生产环境部署时自动注册）scripts/register-service.sh
- [X] T067 更新部署脚本支持AUTH_MODE环境变量配置 scripts/deploy.sh
- [X] T068 更新开发环境配置示例（AUTH_MODE=self_validate）backend/.env.development.example
- [X] T069 更新生产环境配置示例（AUTH_MODE=gateway）backend/.env.production.example

#### 2.8 代码清理和编译错误修复（确保代码可运行）

**问题根因分析**：
在执行 Phase 1 和 Phase 2 的重构任务后，发现以下编译错误：
1. 认证中间件遗留代码：`OptionalAuthMiddleware` 函数使用了已删除的 `NewMockAuthService`
2. Logging中间件类型不匹配：userID 从 uint 改为 string，但 logging.go 仍使用 `zap.Uint`
3. FinancialService 使用旧字段：使用了不存在的 `models.FeeType`、`record.RecordType` 等
4. ContractAmendmentService 使用已删除字段：使用了模型注释中说明已移除的 `FilePath` 字段
5. ExternalCommissionService 使用已删除字段：使用了已迁移到 FinancialRecord 的字段（InvoiceFileID, PaymentAmount, PaymentDate）
6. FinancialHandler 使用旧字段：UpdateFinancialRecordRequestRaw 中使用了 `RecordType` 和 `FeeType`，并尝试转换为不存在的类型
7. ExternalCommissionHandler 使用已删除字段：请求中使用了 InvoiceFileID, PaymentAmount, PaymentDate
8. ContractService 可能的问题：ContractType 字段在模型中存在，但根据新设计可能应该移除（现在有独立的 DesignFee, SurveyFee, ConsultationFee 字段）

**修复任务**：

**中间件修复**：
- [X] T070 修复认证中间件遗留代码：更新或删除 OptionalAuthMiddleware 函数，移除对 NewMockAuthService 的引用 backend/internal/middleware/auth.go
- [X] T071 修复Logging中间件类型错误：将 userID 日志从 zap.Uint 改为 zap.String backend/internal/middleware/logging.go

**FinancialService 修复**：
- [X] T072 修复FinancialService字段引用错误：将 UpdateFinancialRecordRequest 中的 models.FeeType 改为 models.FinancialType backend/internal/services/financial_service.go
- [X] T073 修复FinancialService字段访问错误：将 record.RecordType 改为 record.FinancialType backend/internal/services/financial_service.go
- [X] T074 修复FinancialService枚举值错误：移除对不存在的 models.FeeTypeDesign 等枚举值的引用，使用新的 FinancialType 枚举 backend/internal/services/financial_service.go
- [X] T075 修复FinancialService UpdateFinancialRecord 方法：根据新的统一财务记录模型重新实现更新逻辑，移除对旧字段（ReceivableAmount, InvoiceNumber, InvoiceDate, InvoiceAmount, PaymentDate, PaymentAmount, UnpaidAmount）的引用 backend/internal/services/financial_service.go
- [X] T076 修复FinancialService FeeTypeFinancial 结构体：根据新的 FinancialRecord 模型重新设计费用类型分组逻辑，移除对旧 FeeType 概念的依赖 backend/internal/services/financial_service.go

**ContractAmendmentService 修复**：
- [X] T077 修复ContractAmendmentService字段错误：从 CreateContractAmendmentRequest 和 UpdateContractAmendmentRequest 中移除 FilePath 字段，因为模型中没有此字段（文件通过File实体关联） backend/internal/services/contract_amendment_service.go
- [X] T078 修复ContractAmendmentService创建逻辑：移除对 FilePath 字段的赋值操作 backend/internal/services/contract_amendment_service.go
- [X] T079 修复ContractAmendmentService更新逻辑：移除对 FilePath 字段的更新操作 backend/internal/services/contract_amendment_service.go

**ExternalCommissionService 修复**：
- [X] T080 修复ExternalCommissionService字段类型错误：将 CreateExternalCommissionRequest 中的 Score 字段从 *int 改为 *float64 以匹配模型定义 backend/internal/services/external_commission_service.go
- [X] T081 修复ExternalCommissionService字段错误：从 CreateExternalCommissionRequest 中移除 InvoiceFileID, PaymentAmount, PaymentDate 字段，这些字段已迁移到 FinancialRecord backend/internal/services/external_commission_service.go
- [X] T082 修复ExternalCommissionService创建逻辑：移除对已删除字段（InvoiceFileID, PaymentAmount, PaymentDate）的赋值操作 backend/internal/services/external_commission_service.go
- [X] T083 修复ExternalCommissionService Preload：移除对 InvoiceFile 的 Preload（因为 InvoiceFileID 字段已删除）backend/internal/services/external_commission_service.go

**FinancialHandler 修复**：
- [X] T084 修复FinancialHandler UpdateFinancialRecordRequestRaw：移除 RecordType 和 FeeType 字段，使用 FinancialType 和 Direction 字段 backend/internal/handlers/financial_handler.go
- [X] T085 修复FinancialHandler类型转换错误：移除对不存在的 models.FeeType 类型的转换，使用正确的 FinancialType 类型 backend/internal/handlers/financial_handler.go
- [X] T086 修复FinancialHandler UpdateFinancialRecord 方法：更新请求转换逻辑以匹配新的 UpdateFinancialRecordRequest 结构 backend/internal/handlers/financial_handler.go

**ExternalCommissionHandler 修复**：
- [X] T087 修复ExternalCommissionHandler请求结构：从 CreateCommission 的请求 payload 中移除 InvoiceFileID, PaymentAmount, PaymentDate 字段 backend/internal/handlers/external_commission_handler.go
- [X] T088 修复ExternalCommissionHandler类型转换：将 Score 字段从 *int 改为 *float64 backend/internal/handlers/external_commission_handler.go
- [X] T089 修复ExternalCommissionHandler服务调用：更新 CreateCommission 调用以匹配新的 CreateExternalCommissionRequest 结构 backend/internal/handlers/external_commission_handler.go

**ContractService 潜在问题检查**：
- [X] T090 检查ContractService ContractType字段：确认 ContractType 字段是否应该保留（模型中有但可能冗余，因为已有 DesignFee, SurveyFee, ConsultationFee）backend/internal/services/contract_service.go 和 backend/internal/models/contract.go（已添加注释说明，暂时保留以保持兼容性）

**验证任务**：
- [X] T091 验证代码编译：运行 `go build` 确保所有编译错误已修复 backend/
- [X] T092 验证代码运行：运行 `go run cmd/server/main.go` 确保应用可以正常启动 backend/

#### 2.7 Auth 服务对接规范优化

**目标**：根据 `ai-quick-reference.md` 规范，修复 Auth 服务对接中的不符合项，确保完全符合 NebulaAuth 对接要求。

**高优先级任务（影响功能）**：

- [X] T314 修复健康检查端点：在 main.go 中添加符合规范的健康检查端点 `/{service_name}/health`，返回格式包含 status、service、auth_mode、timestamp backend/cmd/server/main.go
- [X] T315 [P] 修复Token验证API响应格式：添加 ValidateTokenResponse 结构体处理 success 和 data 包装层 backend/internal/middleware/auth.go
- [X] T316 更新 validateTokenSelfValidate 函数：正确处理响应包装层，先解析包装层再提取 data 字段 backend/internal/middleware/auth.go

**中优先级任务（影响体验）**：

- [X] T317 定义标准错误码常量：在 middleware/auth.go 中定义 UNAUTHORIZED、TOKEN_MISSING、TOKEN_INVALID、VALIDATION_ERROR、FORBIDDEN 常量 backend/internal/middleware/auth.go
- [X] T318 创建统一错误响应函数：在 pkg/utils/errors.go 中创建 ErrorResponse 函数，返回统一格式 {"error": "错误描述", "code": "ERROR_CODE"} backend/pkg/utils/errors.go
- [X] T319 更新认证中间件错误响应：将所有错误响应改为使用统一格式和错误码 backend/internal/middleware/auth.go
- [X] T320 [P] 更新其他中间件错误响应：更新 CORS、错误处理等中间件使用统一错误格式 backend/internal/middleware/*.go

**低优先级任务（影响配置清晰度）**：

- [X] T321 添加 API_BASE_URL 配置：在 config.Config 结构体中添加 APIBaseURL 字段 backend/internal/config/config.go
- [X] T322 更新配置加载逻辑：在 config.Load() 函数中加载 API_BASE_URL 环境变量 backend/internal/config/config.go
- [X] T323 更新 env.example：添加 API_BASE_URL 配置项及注释说明 backend/env.example
- [X] T324 创建 .env.development 文件：创建开发环境配置模板，包含所有必需配置项（AUTH_MODE=self_validate, API_BASE_URL=http://localhost:8080等）backend/.env.development
- [X] T325 创建 .env.production 文件：创建生产环境配置模板，包含所有必需配置项（AUTH_MODE=gateway, API_BASE_URL=http://your-aliyun-ip:8080等）backend/.env.production
- [X] T326 优化配置加载逻辑：修改 config.Load() 函数支持根据 ENV 环境变量自动加载对应配置文件（.env.development 或 .env.production）backend/internal/config/config.go
- [X] T327 实现 .env 本地覆盖支持：在配置加载逻辑中添加 .env 文件覆盖功能（使用 godotenv.Overload）backend/internal/config/config.go
- [X] T328 更新 .gitignore：确保 .env 文件被忽略，但 .env.development 和 .env.production 可以提交 .gitignore

#### 2.10 统一权限管理机制

**目标**：建立统一的权限管理机制，避免权限判断代码分散到各个业务模块。所有权限检查逻辑集中在权限服务中，业务代码通过统一接口进行权限判断。

**实现任务**：

- [X] T389 创建权限检查辅助函数：实现 GetUserRoleLevel、HasRoleOrHigher、IsSystemAdmin、IsProjectManager 等辅助函数 backend/internal/utils/permission.go
- [X] T390 创建权限服务结构体：定义 PermissionService 结构体，包含 db 字段 backend/internal/services/permission_service.go
- [X] T391 实现权限等级常量：定义 RoleLevelSystemAdmin、RoleLevelProjectManager、RoleLevelManager、RoleLevelMember 常量 backend/internal/services/permission_service.go
- [X] T392 实现 CanCreateProject 方法：检查用户是否可以创建项目（只有项目管理员角色的用户才能创建项目）backend/internal/services/permission_service.go
- [X] T393 实现 CanManageProjectManagers 方法：检查用户是否可以配置项目负责人（项目管理员或系统管理员）backend/internal/services/permission_service.go
- [X] T394 实现 CanManageProjectMembers 方法：检查用户是否可以配置项目成员（系统管理员、项目管理员、项目经营负责人、项目生产负责人）backend/internal/services/permission_service.go
- [X] T395 实现 CanAccessProject 方法：检查用户是否可以访问项目（考虑用户角色和项目成员角色，两者取并集）backend/internal/services/permission_service.go
- [X] T396 实现 GetAvailableUsersForMemberRole 方法：获取可用于配置项目成员的用户列表（返回所有用户，不需要角色过滤）backend/internal/services/permission_service.go
- [X] T397 实现 GetAvailableUsersForManagerRole 方法：获取可用于配置项目负责人的用户列表（根据角色过滤，支持向上兼容）backend/internal/services/permission_service.go
- [X] T397.1 实现 CanManageBusinessInfo 方法：检查用户是否可以管理项目经营信息（经营负责人、项目管理员、系统管理员）backend/internal/services/permission_service.go
- [X] T397.2 实现 CanManageProductionInfo 方法：检查用户是否可以管理项目生产信息（生产负责人、项目管理员、系统管理员）backend/internal/services/permission_service.go
- [X] T397.3 实现 CanManageCompanyRevenue 方法：检查用户是否可以管理公司收入（财务人员、系统管理员）backend/internal/services/permission_service.go
- [X] T398 创建权限中间件：实现 PermissionMiddleware 函数，在路由层面进行权限检查 backend/internal/middleware/permission.go
- [X] T399 更新 ProjectService 使用权限服务：在 CreateProject 方法中调用权限服务检查创建权限 backend/internal/services/project_service.go
- [X] T400 更新 ProjectService 使用权限服务：在配置项目负责人时调用权限服务检查权限 backend/internal/services/project_service.go
- [X] T401 更新 ProjectMemberService 使用权限服务：在配置项目成员时调用权限服务检查权限 backend/internal/services/project_member_service.go
- [X] T402 更新 ProjectHandler 使用权限服务：在 CreateProject Handler 中调用权限服务 backend/internal/handlers/project_handler.go
- [X] T403 更新 ProjectHandler 使用权限服务：在配置项目负责人 Handler 中调用权限服务 backend/internal/handlers/project_handler.go
- [X] T404 更新 ProjectMemberHandler 使用权限服务：在配置项目成员 Handler 中调用权限服务 backend/internal/handlers/project_member_handler.go
- [X] T405 更新前端项目创建页面：使用权限服务检查权限，无权限时显示提示信息 frontend/src/pages/ProjectList.tsx
- [X] T406 更新前端项目详情页面：使用权限服务检查权限，根据权限显示/隐藏编辑按钮 frontend/src/components/project/BasicInfoTab.tsx
- [X] T407 更新前端项目成员配置：使用权限服务获取可选择的用户列表 frontend/src/components/project/ProjectMemberList.tsx
- [X] T408 更新前端负责人配置：使用权限服务获取可选择的用户列表（支持向上兼容）frontend/src/components/project/BasicInfoTab.tsx

#### 2.9 负责人配置改造（确保符合User Story 3要求）

**问题说明**：
根据 User Story 3 的要求，经营负责人和生产负责人应该在项目基本信息中配置，而不是在经营信息或生产信息中配置。当前实现存在以下问题：
1. `BusinessPersonnelList` 组件允许添加 `business_manager` 角色，这是不对的
2. 需要确保基本信息中正确支持配置负责人
3. 需要确保经营信息和生产信息中只能配置参与人，不能配置负责人

**改造任务**：

- [X] T348 [US3] 改造BusinessPersonnelList组件：移除business_manager角色选项，只允许添加business_personnel角色 frontend/src/components/business/BusinessPersonnelList.tsx
- [X] T349 [US3] 更新BusinessPersonnelList组件：移除角色选择Radio，默认使用business_personnel角色 frontend/src/components/business/BusinessPersonnelList.tsx
- [X] T350 [US3] 更新BusinessPersonnelList组件：过滤显示逻辑，只显示business_personnel角色的成员，不显示business_manager角色 frontend/src/components/business/BusinessPersonnelList.tsx
- [X] T351 [US3] 更新ProjectMemberService：添加验证逻辑，禁止通过ProjectMember API创建business_manager或manager角色的成员（负责人只能通过Project API配置）backend/internal/services/project_member_service.go
- [X] T352 [US3] 更新ProjectMemberHandler：添加验证逻辑，拒绝创建business_manager或manager角色的请求 backend/internal/handlers/project_member_handler.go
- [X] T353 [US3] 验证BasicInfoTab组件：确保经营负责人和生产负责人配置功能正常工作，使用Project API而不是ProjectMember API frontend/src/components/project/BasicInfoTab.tsx
- [X] T354 [US3] 检查生产信息组件：确保生产信息中不包含生产负责人配置功能，只包含生产参与人配置 frontend/src/components/production/ProductionInfo.tsx
- [X] T355 [US3] 更新项目成员列表显示：在经营信息和生产信息中，只显示参与人，不显示负责人（负责人在基本信息中显示）frontend/src/components/business/BusinessPersonnelList.tsx 和 frontend/src/components/production/ProductionInfo.tsx

---

## Phase 3: User Story 1 - 账号管理 (P1)

### Story Goal
用户可以使用系统管理员预设的账号登录系统。系统采用基于NebulaAuth的验证码登录方式（支持邮箱和手机号），前端直接调用NebulaAuth网关接口，不通过业务服务。系统不提供公开注册功能，所有账号由系统管理员预先创建和管理。系统管理员可以编辑用户信息（包括用户名、真实姓名、邮箱、手机号、部门、角色、激活状态等所有信息），系统不存储密码，登录通过NebulaAuth的验证码方式。

### Independent Test Criteria
- 用户可以使用邮箱或手机号+验证码登录系统（通过NebulaAuth网关）
- 验证码发送功能正常工作（邮箱和手机号两种方式）
- Token（access_token和refresh_token）正确存储到localStorage
- 所有业务接口请求自动携带Token
- Token过期时自动刷新，刷新失败跳转登录页
- 用户可以通过Header中的用户信息访问系统（gateway模式）
- 系统能够正确识别用户身份
- 权限控制正常工作
- 系统不提供注册功能，用户无法自行注册账号
- 系统管理员可以编辑用户信息（所有字段），编辑后同步更新NebulaAuth和OA本地数据库
- 非管理员用户无法编辑其他用户信息

### Implementation Tasks

- [X] T093 [US1] 更新User模型添加HasAccount字段 backend/internal/models/user.go
- [X] T094 [US1] 更新UserService支持账号查询 backend/internal/services/user_service.go
- [X] T095 [US1] 更新UserHandler支持账号查询 backend/internal/handlers/user_handler.go
- [X] T096 [US1] 实现用户信息获取接口（从Header读取）backend/internal/handlers/auth_handler.go
- [X] T097 [US1] 更新前端登录页面适配新认证方式，移除注册入口 frontend/src/pages/Login.tsx
- [X] T098 [US1] 实现前端登录页面提示（如需账号请联系管理员）frontend/src/pages/Login.tsx
- [X] T099 [US1] 更新前端用户信息显示组件 frontend/src/components/auth/UserInfo.tsx

#### 登录页面改造（基于NebulaAuth验证码登录）

**目标**：将登录页面从用户名+密码方式改造为基于NebulaAuth的验证码登录方式（支持邮箱和手机号），前后端分离，前端直接调用NebulaAuth网关接口。

**执行顺序**：
1. 配置和类型定义（T329, T344-T347）：必须先完成，为后续任务提供基础
2. Auth服务改造（T330-T336）：改造authService和API拦截器，支持NebulaAuth接口调用
3. UI组件实现（T338-T341）：实现验证码输入、倒计时、登录方式选择、错误提示等组件
4. 登录页面重写（T337）：使用新组件完全重写Login页面
5. 旧代码清理（T342-T343）：移除旧的用户名密码登录代码和后端登录接口

**注意**：所有任务必须按顺序执行，确保最终功能完整可执行。不需要保留旧代码。

- [X] T329 [US1] [P] 创建前端API配置模块，添加NEBULA_AUTH_URL环境变量支持 frontend/src/config/api.ts
- [X] T330 [US1] 改造authService.sendVerification方法：调用NebulaAuth网关发送验证码接口（POST /auth-server/v1/public/send_verification）frontend/src/services/auth.ts
- [X] T331 [US1] 改造authService.login方法：调用NebulaAuth网关登录接口（POST /auth-server/v1/public/login），处理响应格式并存储access_token和refresh_token到localStorage frontend/src/services/auth.ts
- [X] T332 [US1] 实现authService.refreshToken方法：调用NebulaAuth网关刷新Token接口（POST /auth-server/v1/public/refresh_token）frontend/src/services/auth.ts
- [X] T333 [US1] 更新authService.getToken方法：从localStorage读取access_token（替换旧的token）frontend/src/services/auth.ts
- [X] T334 [US1] 更新authService.isAuthenticated方法：检查access_token是否存在 frontend/src/services/auth.ts
- [X] T335 [US1] 更新API拦截器：从localStorage读取access_token并添加到Authorization Header（替换旧的token）frontend/src/services/api.ts
- [X] T336 [US1] 实现API响应拦截器：Token过期（401）时自动调用refreshToken刷新，刷新失败跳转登录页 frontend/src/services/api.ts
- [X] T337 [US1] 完全重写Login页面组件：实现验证码登录流程（选择登录方式、发送验证码、输入验证码、登录），支持邮箱和手机号两种方式，包含所有状态（初始、发送中、已发送、登录中、成功、错误）frontend/src/pages/Login.tsx
- [X] T338 [US1] 实现验证码输入组件：6位数字输入框，自动聚焦，实时验证格式 frontend/src/components/auth/VerificationCodeInput.tsx
- [X] T339 [US1] 实现验证码倒计时组件：60秒倒计时，倒计时结束后可重新发送 frontend/src/components/auth/ResendCodeButton.tsx
- [X] T340 [US1] 实现登录方式选择组件：邮箱登录/手机号登录单选按钮组 frontend/src/components/auth/LoginMethodSelector.tsx
- [X] T341 [US1] 实现错误提示组件：显示验证码发送失败、验证码错误、账号不存在、网络错误等错误信息 frontend/src/components/auth/LoginErrorAlert.tsx
- [X] T342 [US1] 移除旧的用户名密码登录相关代码：删除Login页面中的username和password输入框及相关逻辑 frontend/src/pages/Login.tsx
- [X] T343 [US1] 移除后端登录接口：删除backend中的登录相关handler和service（auth_handler.go中的Login方法，auth_service.go中的Login方法），因为登录完全由NebulaAuth网关处理 backend/internal/handlers/auth_handler.go 和 backend/internal/services/auth_service.go
- [X] T344 [US1] 更新前端环境变量配置：添加VITE_NEBULA_AUTH_URL配置项 frontend/.env.example
- [X] T345 [US1] 创建前端开发环境配置：添加NEBULA_AUTH_URL配置 frontend/.env.development
- [X] T346 [US1] 创建前端生产环境配置：添加NEBULA_AUTH_URL配置 frontend/.env.production
- [X] T347 [US1] 更新前端类型定义：添加LoginRequest类型（支持email/phone、code、code_type字段），更新LoginResponse类型（包含tokens.access_token和tokens.refresh_token）frontend/src/types/index.ts

#### Token刷新机制增强（解决超过2小时后重新打开网页错误跳转登录页问题）

**问题说明**：
超过2小时后重新打开网页，Access Token已过期，但Refresh Token仍然有效（30天内）。页面加载时，`AuthContext` 初始化直接调用 `getCurrentUser()`，使用过期的Access Token导致401错误，虽然API拦截器会尝试刷新，但可能已经被误判为未认证，错误跳转到登录页。

**解决方案**：在页面加载时，先刷新Token，再获取用户信息。

**执行顺序**：
1. 修改AuthContext的refreshAuth方法（T360）：必须先完成，确保页面加载时先刷新Token
2. 或者，在应用入口处初始化（T361）：替代方案，在应用启动前刷新Token

- [X] T360 [US1] 修改AuthContext的refreshAuth方法：在获取用户信息前，先检查Refresh Token是否存在，如果存在则主动刷新Token，刷新成功后再获取用户信息 frontend/src/contexts/AuthContext.tsx
- [X] T361 [US1] [P] 实现应用入口初始化函数：在应用启动时（main.tsx或App.tsx），先调用authService.initializeAuth()刷新Token（如果Refresh Token存在），确保进入应用时Token有效 frontend/src/services/auth.ts 和 frontend/src/main.tsx

#### 管理员判断机制实现

**问题说明**：
登录用户需要明确判断是否是NebulaAuth的管理员。前端已有判断逻辑，但后端需要增强：在self_validate模式下从Token验证响应获取，在gateway模式下调用User Service API获取。

**执行顺序**：
1. 后端管理员判断实现（T362-T364）：实现后端判断逻辑
2. 前端管理员判断增强（T365）：确保前端判断逻辑完整

- [X] T362 [US1] 实现后端管理员判断函数（self_validate模式）：在认证中间件中，从Token验证API响应获取is_admin字段并设置到Context backend/internal/middleware/auth.go
- [X] T363 [US1] 实现后端管理员判断函数（gateway模式）：创建IsNebulaAuthAdmin函数，调用NebulaAuth User Service API获取管理员状态 backend/internal/services/auth_service.go
- [X] T364 [US1] 更新认证中间件：在gateway模式下，调用IsNebulaAuthAdmin函数获取管理员状态并设置到Context backend/internal/middleware/auth.go
- [X] T365 [US1] 增强前端管理员判断：确保登录时保存is_admin，页面加载时更新，提供统一的isAdmin()检查函数 frontend/src/services/auth.ts

#### 管理员预设用户功能实现

**问题说明**：
管理员要能在项目管理系统中预设（新建）用户，现在没有这个能力。需要业务服务提供管理员创建用户接口，内部调用NebulaAuth User Service API创建用户。

**执行顺序**：
1. 后端实现（T366-T368）：实现调用NebulaAuth API创建用户的逻辑
2. 前端实现（T369-T370）：实现管理员创建用户界面

- [X] T366 [US1] 实现CreateNebulaAuthUser方法：在UserService中实现调用NebulaAuth User Service API创建用户的方法（POST /user-service/v1/admin/users）backend/internal/services/user_service.go
- [X] T367 [US1] 实现管理员创建用户Handler：在UserHandler中实现CreateUser方法，验证管理员权限后调用CreateNebulaAuthUser backend/internal/handlers/user_handler.go
- [X] T368 [US1] 添加管理员创建用户路由：在admin路由组中添加POST /project-oa/v1/admin/users路由 backend/internal/router/router.go（路由已存在，无需修改）
- [X] T369 [US1] 创建前端管理员创建用户表单组件：实现用户创建表单（邮箱、手机号、用户名、验证状态等）frontend/src/components/admin/CreateUserForm.tsx
- [X] T370 [US1] 更新前端用户管理页面：集成创建用户功能，添加创建用户按钮和表单弹窗 frontend/src/pages/UserManagement.tsx

#### 管理员创建用户同步到本地数据库

**问题说明**：
管理员创建用户后，用户只在NebulaAuth中存在，OA系统的用户管理列表查询本地数据库，导致新创建的用户不可见，直到用户首次登录时才会同步。

**解决方案**：
在创建NebulaAuth用户成功后，立即同步到OA本地数据库，确保用户管理列表可见。

**执行顺序**：
1. 修改CreateUserRequest，添加OA业务字段（real_name, role, department）
2. 实现UserService.SyncUserToLocalDB方法，同步用户到本地数据库
3. 修改UserHandler.CreateUser，在创建NebulaAuth用户后调用同步方法
4. 修改前端CreateUserForm，添加OA业务字段输入

- [X] T373 [US1] 修改CreateNebulaAuthUserRequest，添加OA业务字段：在UserService中添加real_name、role、department字段 backend/internal/services/user_service.go
- [X] T374 [US1] 实现SyncUserToLocalDB方法：在UserService中实现同步用户到本地数据库的方法，根据NebulaAuth的is_admin确定OA角色，使用前端传入的OA业务字段 backend/internal/services/user_service.go
- [X] T375 [US1] 修改UserHandler.CreateUser：在创建NebulaAuth用户成功后，调用SyncUserToLocalDB同步到本地数据库，返回同步后的完整用户信息 backend/internal/handlers/user_handler.go
- [X] T376 [US1] 修改前端CreateUserForm：添加real_name、role、department字段输入，提交时包含这些字段 frontend/src/components/admin/CreateUserForm.tsx
- [X] T377 [US1] 修改前端CreateNebulaAuthUserRequest类型：添加real_name、role、department字段 frontend/src/services/user.ts

#### 用户创建流程优化（邮箱和手机号二选一，查询NebulaAuth）

**问题说明**：
根据最新的业务需求，用户创建流程需要进一步优化：
1. 邮箱和手机号二选一即可，但至少需要提供其中一个
2. 先查询OA本地数据库（支持通过邮箱、手机号或用户名查询）
3. 如果本地不存在，再查询NebulaAuth（通过邮箱或手机号，二选一）
4. 如果NebulaAuth也不存在，才创建新用户

**解决方案**：
1. 更新CreateNebulaAuthUserRequest，使邮箱和手机号二选一（移除邮箱必填验证，添加自定义验证确保至少提供一个）
2. 更新GetUserByEmailOrUsername方法，支持通过手机号查询
3. 实现GetNebulaAuthUserByEmailOrUsername方法，查询NebulaAuth用户（优先使用邮箱，如果邮箱为空则使用手机号）
4. 更新CreateUser handler，实现完整的查询流程（本地DB → NebulaAuth → 创建）

**执行顺序**：
1. 更新CreateNebulaAuthUserRequest验证规则（T378）：必须先完成，确保邮箱和手机号二选一
2. 更新GetUserByEmailOrUsername支持手机号查询（T379）：扩展本地数据库查询能力
3. 实现GetNebulaAuthUserByEmailOrUsername方法（T380-T381）：实现NebulaAuth用户查询
4. 更新CreateUser handler实现完整流程（T382）：整合所有查询逻辑

- [X] T378 [US1] 更新CreateNebulaAuthUserRequest验证规则：移除Email的required验证，添加自定义验证函数，确保邮箱和手机号至少提供一个 backend/internal/services/user_service.go
- [X] T379 [US1] 更新GetUserByEmailOrUsername方法：扩展查询条件，支持通过邮箱、手机号或用户名查询本地数据库（WHERE email = ? OR phone = ? OR username = ?）backend/internal/services/user_service.go
- [X] T380 [US1] 实现GetNebulaAuthUserByEmail方法：在UserService中实现通过邮箱查询NebulaAuth用户的方法（GET /user-service/v1/admin/users/email/{email}，需要管理员Token）backend/internal/services/user_service.go
- [X] T381 [US1] 实现GetNebulaAuthUserByPhone方法：在UserService中实现通过手机号查询NebulaAuth用户的方法（GET /user-service/v1/admin/users/phone/{phone}，需要管理员Token）backend/internal/services/user_service.go
- [X] T382 [US1] 更新UserHandler.CreateUser实现完整查询流程：先查询本地数据库（支持邮箱、手机号、用户名），如果不存在则查询NebulaAuth（优先邮箱，如果邮箱为空则使用手机号），如果NebulaAuth也不存在才创建新用户 backend/internal/handlers/user_handler.go

#### 用户管理导航入口实现

**问题说明**：
用户管理功能的后端API和前端页面都已实现，但缺少导航入口，管理员无法从界面访问用户管理功能。

**执行顺序**：
1. 在 ProjectList 页面添加"用户管理"按钮（仅管理员可见）
2. 在 UserInfo 下拉菜单中添加"用户管理"选项（仅管理员可见）

- [X] T371 [US1] 在 ProjectList 页面添加"用户管理"按钮：检查当前用户是否为管理员，如果是则显示"用户管理"按钮，点击跳转到 /users 页面 frontend/src/pages/ProjectList.tsx
- [X] T372 [US1] 在 UserInfo 组件添加"用户管理"菜单项：检查当前用户是否为管理员，如果是则在下拉菜单中添加"用户管理"选项，点击跳转到 /users 页面 frontend/src/components/auth/UserInfo.tsx

#### 管理员编辑用户功能实现

**问题说明**：
管理员需要能够编辑已创建的用户信息，现在只有创建功能，没有编辑能力。需要支持编辑所有用户信息（用户名、真实姓名、邮箱、手机号、部门、角色、激活状态等），同时同步更新NebulaAuth和OA本地数据库。

**解决方案**：
1. 实现UpdateNebulaAuthUser方法，调用NebulaAuth API更新用户信息
2. 实现UpdateUser Handler，处理编辑用户请求，先更新NebulaAuth再同步本地数据库
3. 添加编辑用户路由（PUT /project-oa/v1/admin/users/{user_id}）
4. 创建前端编辑用户表单组件
5. 更新前端用户管理页面，添加编辑功能

**执行顺序**：
1. 后端实现（T383-T386）：实现调用NebulaAuth API更新用户的逻辑和Handler
2. 前端实现（T387-T388）：实现管理员编辑用户界面

- [X] T383 [US1] 实现UpdateNebulaAuthUser方法：在UserService中实现调用NebulaAuth User Service API更新用户的方法（PUT /user-service/v1/admin/users/{user_id}），支持编辑所有字段（邮箱、手机号、用户名、激活状态等），邮箱和手机号二选一 backend/internal/services/user_service.go
- [X] T384 [US1] 实现UpdateNebulaAuthUserRequest结构体：在UserService中定义UpdateNebulaAuthUserRequest结构体，包含所有可编辑字段（email, phone, username, real_name, role, department, is_active），添加Validate方法验证邮箱和手机号格式 backend/internal/services/user_service.go
- [X] T385 [US1] 实现管理员编辑用户Handler：在UserHandler中实现UpdateUserAdmin方法，验证管理员权限后调用UpdateNebulaAuthUser更新NebulaAuth，然后同步更新OA本地数据库 backend/internal/handlers/user_handler.go
- [X] T386 [US1] 更新管理员编辑用户路由：在admin路由组中更新PUT /project-oa/v1/admin/users/{id}路由，使用UpdateUserAdmin方法 backend/internal/router/router.go
- [X] T387 [US1] 创建前端编辑用户表单组件：实现用户编辑表单（支持编辑所有字段：用户名、真实姓名、邮箱、手机号、部门、角色、激活状态），复用CreateUserForm或创建独立的EditUserForm组件 frontend/src/components/admin/EditUserForm.tsx
- [X] T388 [US1] 更新前端用户管理页面：集成编辑用户功能，在用户列表中添加编辑按钮，点击后打开编辑表单弹窗 frontend/src/pages/UserManagement.tsx

#### 用户角色多选支持实现

**问题说明**：
根据权限规则，用户角色应该支持多选，一个用户可以同时拥有多个角色（如：项目管理员+经营负责人）。当前实现中User模型使用单个Role字段，需要改为支持多选的Roles数组字段。

**解决方案**：
1. 更新User模型，将Role字段改为Roles数组字段（使用PostgreSQL的text[]类型）
2. 创建数据库迁移脚本，将现有数据从Role迁移到Roles
3. 更新UserService的请求结构体，支持多选角色
4. 更新权限服务，适配多选角色（getUserRoles方法需要调整）
5. 更新前端表单，使用多选Select组件
6. 更新前端类型定义，支持多选角色
7. 实现系统管理员角色不可修改的规则

**执行顺序**：
1. 数据库模型和迁移（T473-T475）：必须先完成，确保数据结构支持多选
2. 后端服务层更新（T476-T479）：更新服务层支持多选角色
3. 权限服务适配（T480）：更新权限服务适配多选角色
4. 前端类型和表单更新（T481-T485）：更新前端支持多选角色
5. 系统管理员角色保护（T486）：实现系统管理员角色不可修改的规则

- [X] T473 [US1] 更新User模型支持多选角色：将Role字段改为Roles字段（类型改为[]UserRole，使用pq.StringArray或gorm的text[]类型）backend/internal/models/user.go
- [X] T474 [US1] 创建数据库迁移脚本：将users表的role字段迁移到roles字段（text[]类型），将现有单个角色值转换为数组格式 scripts/migrations/XXX_migrate_user_role_to_roles.sql
- [X] T475 [US1] 更新User模型的BeforeCreate hook：适配多选角色，如果Roles为空则设置默认值[RoleMember] backend/internal/models/user.go
- [X] T476 [US1] 更新CreateUserRequest支持多选角色：将Role字段改为Roles字段（类型改为[]models.UserRole），添加验证规则确保至少包含一个角色 backend/internal/services/user_service.go
- [X] T477 [US1] 更新UpdateUserRequest支持多选角色：将Role字段改为Roles字段（类型改为*[]models.UserRole），添加验证规则确保至少包含一个角色 backend/internal/services/user_service.go
- [X] T478 [US1] 更新CreateUser方法：适配多选角色，处理Roles数组字段 backend/internal/services/user_service.go
- [X] T479 [US1] 更新UpdateUser方法：适配多选角色，处理Roles数组字段，如果Roles为空则不更新 backend/internal/services/user_service.go
- [X] T480 [US1] 更新权限服务getUserRoles方法：直接从User.Roles字段获取角色数组，移除单个Role到数组的转换逻辑 backend/internal/services/permission_service.go
- [X] T481 [US1] 更新前端User类型定义：将role字段改为roles字段（类型改为UserRole[]），保持向后兼容性 frontend/src/types/index.ts
- [X] T482 [US1] 更新前端CreateUserForm组件：将角色选择改为多选Select（mode="multiple"），支持选择多个角色 frontend/src/components/admin/CreateUserForm.tsx
- [X] T483 [US1] 更新前端EditUserForm组件：将角色选择改为多选Select（mode="multiple"），支持选择多个角色，如果用户是系统管理员则禁用角色编辑 frontend/src/components/admin/EditUserForm.tsx
- [X] T484 [US1] 更新前端CreateNebulaAuthUserRequest类型：将role字段改为roles字段（类型改为UserRole[]）frontend/src/services/user.ts
- [X] T485 [US1] 更新前端UpdateNebulaAuthUserRequest类型：将role字段改为roles字段（类型改为UserRole[]）frontend/src/services/user.ts
- [X] T486 [US1] 实现系统管理员角色保护：在UpdateUserAdmin方法中，如果用户是系统管理员（Roles包含admin），则不允许修改Roles字段，返回错误提示 backend/internal/handlers/user_handler.go

---

## Phase 4: User Story 2 - 创建项目 (P1)

### Story Goal
项目管理员能够创建新项目并录入项目的基本信息。

### Independent Test Criteria
- 项目管理员可以创建新项目
- 项目编号唯一性验证正常
- 项目基本信息保存成功

### Implementation Tasks

- [X] T100 [US2] 更新Project模型符合002规范 backend/internal/models/project.go
- [X] T101 [US2] 更新ProjectService支持项目创建 backend/internal/services/project_service.go
- [X] T102 [US2] 实现项目编号唯一性验证 backend/internal/services/project_service.go
- [X] T103 [US2] 更新ProjectHandler支持项目创建 backend/internal/handlers/project_handler.go
- [X] T104 [US2] 更新前端项目创建表单 frontend/src/components/project/ProjectForm.tsx
- [X] T105 [US2] 更新前端项目列表页面 frontend/src/pages/ProjectList.tsx
- [X] T106 [US2] 实现项目编号重复验证前端提示 frontend/src/components/project/ProjectForm.tsx

---

## Phase 5: User Story 3 - 配置项目负责人 (P1)

### Story Goal
项目管理员能够在项目基本信息中配置经营负责人和生产负责人。

### Independent Test Criteria
- 项目管理员可以配置经营负责人和生产负责人
- 负责人配置保存成功
- 非项目管理员无法配置负责人

### Implementation Tasks

- [X] T107 [US3] 更新Project模型添加负责人字段 backend/internal/models/project.go
- [X] T108 [US3] 更新ProjectService支持负责人配置 backend/internal/services/project_service.go
- [X] T109 [US3] 实现负责人权限验证 backend/internal/services/project_service.go
- [X] T110 [US3] 更新ProjectHandler支持负责人配置 backend/internal/handlers/project_handler.go
- [X] T111 [US3] 更新前端项目详情页面显示负责人信息 frontend/src/pages/ProjectDetail.tsx
- [X] T112 [US3] 实现负责人选择组件 frontend/src/components/project/ManagerSelector.tsx
- [X] T113 [US3] 实现负责人配置权限控制 frontend/src/components/project/BasicInfoTab.tsx
- [X] T356 [US3] 在负责人配置Card中添加编辑按钮：在查看模式下，为负责人配置Card添加独立的编辑按钮 frontend/src/components/project/BasicInfoTab.tsx
- [X] T357 [US3] 实现负责人配置独立编辑模式：添加负责人配置的独立编辑状态，允许只编辑负责人而不编辑其他基本信息 frontend/src/components/project/BasicInfoTab.tsx
- [X] T358 [US3] 实现负责人配置保存逻辑：负责人配置编辑模式下，只更新business_manager_id和production_manager_id字段 frontend/src/components/project/BasicInfoTab.tsx
- [X] T359 [US3] 优化负责人配置编辑体验：添加取消按钮，编辑时显示保存和取消按钮，保存后自动退出编辑模式 frontend/src/components/project/BasicInfoTab.tsx

---

## Phase 6: User Story 4 - 管理甲方信息 (P1)

### Story Goal
经营负责人能够在项目经营信息中管理甲方信息，并为每个项目录入项目级别的联系人信息。

### Independent Test Criteria
- 经营负责人可以选择已有甲方或创建新甲方
- 项目联系人信息可以独立管理
- 相同甲方在不同项目上可以有不同的联系人

### Implementation Tasks

- [X] T114 [US4] 更新ClientService支持甲方管理 backend/internal/services/client_service.go
- [X] T115 [US4] 更新ClientHandler支持甲方CRUD backend/internal/handlers/client_handler.go
- [X] T116 [US4] 更新ProjectContactService支持项目联系人管理 backend/internal/services/project_contact_service.go
- [X] T117 [US4] 实现项目联系人创建和更新逻辑 backend/internal/services/project_contact_service.go
- [X] T118 [US4] 更新ProjectContactHandler支持联系人管理 backend/internal/handlers/project_contact_handler.go
- [X] T119 [US4] 更新前端甲方选择组件 frontend/src/components/business/ClientSelectModal.tsx
- [X] T120 [US4] 实现项目联系人表单组件 frontend/src/components/business/ProjectContactForm.tsx
- [X] T121 [US4] 更新前端项目经营信息页面集成联系人管理 frontend/src/components/project/BusinessInfoTab.tsx
- [X] T409 [US4] 更新ClientService使用权限服务：在管理甲方信息时调用权限服务检查权限（CanManageBusinessInfo）backend/internal/services/client_service.go
- [X] T410 [US4] 更新ProjectContactService使用权限服务：在管理项目联系人时调用权限服务检查权限（CanManageBusinessInfo）backend/internal/services/project_contact_service.go
- [X] T411 [US4] 更新ClientHandler使用权限服务：在甲方管理Handler中调用权限服务 backend/internal/handlers/client_handler.go
- [X] T412 [US4] 更新ProjectContactHandler使用权限服务：在项目联系人Handler中调用权限服务 backend/internal/handlers/project_contact_handler.go
- [X] T413 [US4] 更新前端甲方管理页面：使用权限服务检查权限，无权限时显示提示信息 frontend/src/components/business/ClientSelectModal.tsx

---

## Phase 7: User Story 5 - 配置经营参与人 (P1)

### Story Goal
项目管理员或经营负责人能够为项目配置经营参与人。

### Independent Test Criteria
- 项目管理员和经营负责人可以配置经营参与人
- 经营参与人配置保存成功
- 非授权用户无法配置经营参与人

### Implementation Tasks

- [X] T122 [US5] 更新ProjectMember模型支持经营参与人角色 backend/internal/models/project_member.go
- [X] T123 [US5] 更新ProjectMemberService支持经营参与人配置 backend/internal/services/project_member_service.go
- [X] T124 [US5] 实现经营参与人权限验证 backend/internal/services/project_member_service.go
- [X] T125 [US5] 更新ProjectMemberHandler支持经营参与人管理 backend/internal/handlers/project_member_handler.go
- [X] T126 [US5] 更新前端项目成员管理组件 frontend/src/components/business/BusinessPersonnelList.tsx
- [X] T127 [US5] 实现经营参与人选择组件 frontend/src/components/business/BusinessPersonnelList.tsx
- [X] T487 [US5] 更新ProjectMemberService使用权限服务：在配置经营参与人时调用权限服务检查权限（CanManageProjectMembers，memberRole为business_personnel）backend/internal/services/project_member_service.go
- [X] T488 [US5] 更新ProjectMemberHandler使用权限服务：在经营参与人管理Handler中调用权限服务 backend/internal/handlers/project_member_handler.go
- [X] T489 [US5] 更新前端经营参与人管理组件：使用权限服务检查权限，无权限时隐藏编辑入口（添加、删除按钮等），所有用户可查看内容 frontend/src/components/business/BusinessPersonnelList.tsx

---

## Phase 8: User Story 6 - 招投标阶段管理 (P1)

### Story Goal
经营负责人能够管理项目的招投标阶段信息，包括上传招标文件、投标文件、中标通知书（每种类型支持多个文件），以及记录、编辑和删除专家费支付信息。

### Independent Test Criteria
- 经营负责人可以上传多个招投标文件（每种类型支持多个文件）
- 专家费支付信息可以记录、编辑和删除
- 招投标信息可以查看（按文件类型分组显示多个文件）

### Implementation Tasks

- [X] T128 [US6] 创建BiddingInfo模型 backend/internal/models/bidding_info.go
- [X] T129 [US6] 创建BiddingService backend/internal/services/bidding_service.go
- [X] T130 [US6] 创建BiddingHandler backend/internal/handlers/bidding_handler.go
- [X] T131 [US6] 实现招投标文件上传功能 backend/internal/handlers/bidding_handler.go
- [X] T132 [US6] 实现专家费支付记录（使用FinancialRecord）backend/internal/services/bidding_service.go
- [X] T133 [US6] 创建数据库迁移脚本添加bidding_info表 scripts/migrations/008_add_bidding_info.sql
- [X] T134 [US6] 创建前端招投标管理组件 frontend/src/components/business/BiddingFileList.tsx
- [X] T135 [US6] 实现招投标文件上传UI frontend/src/components/business/BiddingFileList.tsx
- [X] T136 [US6] 实现专家费支付表单 frontend/src/components/business/ExpertFeeForm.tsx
- [X] T137 [US6] 更新前端项目经营信息页面集成招投标管理 frontend/src/components/project/BusinessInfoTab.tsx
- [X] T414 [US6] 更新BiddingService使用权限服务：在管理招投标信息时调用权限服务检查权限（CanManageBusinessInfo）backend/internal/services/bidding_service.go
- [X] T415 [US6] 更新BiddingHandler使用权限服务：在招投标管理Handler中调用权限服务 backend/internal/handlers/bidding_handler.go
- [X] T416 [US6] 更新前端招投标管理组件：使用权限服务检查权限，无权限时隐藏编辑入口（上传、删除按钮等），所有用户可查看内容 frontend/src/components/business/BiddingFileList.tsx
- [X] T642 [US6] 实现查询专家费支付记录列表接口：在BiddingService中添加GetExpertFeePayments方法，通过FinancialRecord查询（financial_type=expert_fee）backend/internal/services/bidding_service.go
- [X] T643 [US6] 实现查询专家费支付记录Handler：在BiddingHandler中添加GetExpertFeePayments方法 backend/internal/handlers/bidding_handler.go
- [X] T644 [US6] 添加查询专家费支付记录路由：在router中添加GET /projects/:id/bidding/expert-fee路由 backend/internal/router/router.go
- [X] T645 [US6] 实现前端专家费支付记录列表组件：创建ExpertFeePaymentList组件，显示专家费支付记录列表（专家姓名、金额、支付方式、支付日期、备注等）frontend/src/components/business/ExpertFeePaymentList.tsx
- [X] T646 [US6] 更新biddingService添加查询方法：添加getExpertFeePayments方法 frontend/src/services/bidding.ts
- [X] T647 [US6] 更新BiddingFileList组件集成记录列表：在专家费支付部分显示记录列表，替换或补充现有的提示文本 frontend/src/components/business/BiddingFileList.tsx
- [X] T648 [US6] 更新BiddingInfo模型为数组字段：将TenderFileID、BidFileID、AwardNoticeFileID改为数组字段（TenderFileIDs、BidFileIDs、AwardNoticeFileIDs），使用pq.StringArray类型 backend/internal/models/bidding_info.go
- [X] T649 [US6] 创建数据库迁移脚本：将bidding_info表的单文件字段迁移为数组字段，现有数据转换为数组格式（包含单个元素）scripts/migrations/009_migrate_bidding_files_to_array.sql
- [X] T650 [US6] 更新BiddingService支持数组字段：修改CreateOrUpdateBiddingInfo方法，支持接收和处理文件ID数组 backend/internal/services/bidding_service.go
- [X] T651 [US6] 更新BiddingHandler支持数组字段：修改CreateOrUpdateBiddingInfo请求结构，支持数组格式的文件ID列表 backend/internal/handlers/bidding_handler.go
- [X] T652 [US6] 更新前端BiddingFileList组件支持多文件：修改文件上传逻辑，支持多选上传，按类型分组显示多个文件 frontend/src/components/business/BiddingFileList.tsx
- [X] T653 [US6] 更新前端biddingService支持数组：修改createOrUpdateBiddingInfo方法，发送数组格式的文件ID列表 frontend/src/services/bidding.ts
- [X] T654 [US6] 实现专家费支付记录更新接口：在BiddingService中添加UpdateExpertFeePayment方法，支持更新所有字段（专家姓名、金额、支付方式、支付日期、备注）backend/internal/services/bidding_service.go
- [X] T655 [US6] 实现专家费支付记录删除接口：在BiddingService中添加DeleteExpertFeePayment方法，支持删除专家费支付记录 backend/internal/services/bidding_service.go
- [X] T656 [US6] 实现专家费支付记录更新Handler：在BiddingHandler中添加UpdateExpertFeePayment方法，处理PUT请求 backend/internal/handlers/bidding_handler.go
- [X] T657 [US6] 实现专家费支付记录删除Handler：在BiddingHandler中添加DeleteExpertFeePayment方法，处理DELETE请求 backend/internal/handlers/bidding_handler.go
- [X] T658 [US6] 添加专家费支付编辑和删除路由：在router中添加PUT和DELETE路由 /projects/:id/bidding/expert-fee/:record_id backend/internal/router/router.go
- [X] T659 [US6] 更新前端biddingService添加编辑和删除方法：添加updateExpertFeePayment和deleteExpertFeePayment方法 frontend/src/services/bidding.ts
- [X] T660 [US6] 更新ExpertFeePaymentList组件添加编辑和删除功能：添加编辑和删除按钮（仅对有权限用户显示），实现编辑表单和删除确认对话框 frontend/src/components/business/ExpertFeePaymentList.tsx

---

## Dependencies

### Story Completion Order

1. **Phase 1 (Setup)** → 必须首先完成
2. **Phase 2 (Foundational)** → 必须在所有用户故事之前完成
3. **Phase 3 (US1)** → 可以与其他P1故事并行，但登录页面改造任务（T329-T347）必须按顺序执行，确保功能完整可执行
4. **Phase 4 (US2)** → 依赖Phase 2完成
5. **Phase 5 (US3)** → 依赖Phase 4完成
6. **Phase 6 (US4)** → 依赖Phase 4和Phase 2完成
7. **Phase 7 (US5)** → 依赖Phase 4和Phase 5完成
8. **Phase 8 (US6)** → 依赖Phase 4完成

### Parallel Execution Examples

**Phase 2内部并行**:
- T003, T004, T007 可以并行（不同存储适配器）
- T012-T021 可以并行（不同路由迁移，包括admin级别路由）
- T023-T025 可以并行（认证中间件的不同功能实现）
- T032-T039 可以并行（不同模型ID改造）

**Phase 3-8内部并行**:
- 每个Phase内的[P]标记任务可以并行执行

---

## Implementation Strategy

### MVP Scope
- Phase 1: Setup（必需）
- Phase 2: Foundational（必需）
- Phase 3: US1 - 账号管理（基础功能）
- Phase 4: US2 - 创建项目（核心功能）

### Incremental Delivery
1. **Week 1**: Phase 1 + Phase 2.1-2.2（路由和认证改造）
2. **Week 2**: Phase 2.3-2.4（ID类型和项目联系人改造）
3. **Week 3**: Phase 2.5-2.6（财务记录统一和专业字典）
4. **Week 4**: Phase 3-4（账号管理和项目创建）
5. **Week 5**: Phase 5-6（负责人配置和甲方管理）
6. **Week 6**: Phase 7-8（经营参与人和招投标管理）

---

## Notes

- 所有任务必须遵循002规范（路由格式、认证方式、数据模型）
- ID类型改造需要数据迁移脚本，建议在测试环境先验证
- 财务记录统一改造需要仔细处理数据迁移，确保数据完整性
- 项目联系人改造需要从Client实体迁移联系人数据
- 存储方案切换通过配置实现，不影响业务逻辑

**任务进度**: 60/120+ (50%)

---

## Phase 9: User Story 7 - 合同签订 (P1)

### Story Goal
经营负责人能够录入项目主合同信息，包括上传合同文件、记录签订时间、合同金额（按设计费、勘察费、咨询费分别录入）、合同费率等信息。

### Independent Test Criteria
- 经营负责人可以创建合同并上传合同文件
- 合同金额明细（设计费、勘察费、咨询费）可以分别录入
- 合同信息保存成功并更新项目经营统计
- 合同信息可以编辑和查看

### Implementation Tasks

- [X] T138 [US7] 更新Contract模型符合002规范（ID为UUID，文件通过File实体关联）backend/internal/models/contract.go
- [X] T139 [US7] 更新ContractService支持合同创建、更新和删除 backend/internal/services/contract_service.go
- [X] T140 [US7] 实现合同金额验证（总金额=设计费+勘察费+咨询费）backend/internal/services/contract_service.go
- [X] T141 [US7] 更新ContractHandler支持合同CRUD（创建、读取、更新、删除）backend/internal/handlers/contract_handler.go
- [X] T142 [US7] 实现合同文件上传功能 backend/internal/handlers/contract_handler.go
- [X] T143 [US7] 更新前端合同表单组件（支持创建和编辑模式）frontend/src/components/business/ContractForm.tsx
- [X] T144 [US7] 实现合同金额明细录入（设计费、勘察费、咨询费）frontend/src/components/business/ContractForm.tsx
- [X] T145 [US7] 实现合同文件上传UI frontend/src/components/business/ContractFileUpload.tsx
- [X] T661 [US7] 在合同表单中集成文件上传功能：在ContractForm中添加文件上传组件，支持在创建/编辑合同时上传合同文件，参考ContractAmendmentForm的实现方式，使用fileService.uploadFile上传文件，将上传后的文件ID传递给contract_file_id字段 frontend/src/components/contract/ContractForm.tsx
- [X] T146 [US7] 实现合同列表显示组件 frontend/src/components/business/ContractList.tsx
- [X] T147 [US7] 更新前端项目经营信息页面集成合同管理（包含列表、创建、编辑、删除功能）frontend/src/pages/ProjectBusiness.tsx
- [X] T417 [US7] 更新ContractService使用权限服务：在管理合同信息时调用权限服务检查权限（CanManageBusinessInfo）backend/internal/services/contract_service.go
- [X] T418 [US7] 更新ContractHandler使用权限服务：在合同管理Handler中调用权限服务 backend/internal/handlers/contract_handler.go
- [X] T419 [US7] 更新前端合同管理组件：使用权限服务检查权限，无权限时隐藏编辑入口（添加、编辑、删除按钮等），所有用户可查看内容 frontend/src/components/business/ContractForm.tsx

---

## Phase 10: User Story 8 - 补充协议管理 (P1)

### Story Goal
经营负责人能够为已签订的主合同添加补充协议，包括上传补充协议文件、记录签订时间、补充协议金额（按设计费、勘察费、咨询费分别录入）、合同费率等信息。

### Independent Test Criteria
- 经营负责人可以为合同添加补充协议
- 补充协议金额明细可以分别录入
- 补充协议关联到主合同并更新总应收金额
- 补充协议可以编辑和删除

### Implementation Tasks

- [X] T148 [US8] 更新ContractAmendment模型符合002规范 backend/internal/models/contract_amendment.go
- [X] T149 [US8] 更新ContractAmendmentService支持补充协议创建、更新和删除 backend/internal/services/contract_amendment_service.go
- [X] T150 [US8] 实现补充协议金额验证 backend/internal/services/contract_amendment_service.go
- [X] T151 [US8] 实现补充协议关联主合同并更新统计 backend/internal/services/contract_amendment_service.go
- [X] T152 [US8] 更新ContractAmendmentHandler支持补充协议CRUD（创建、读取、更新、删除）backend/internal/handlers/contract_amendment_handler.go
- [X] T153 [US8] 实现补充协议文件上传功能 backend/internal/handlers/contract_amendment_handler.go
- [X] T154 [US8] 更新前端补充协议表单组件（支持创建和编辑模式）frontend/src/components/business/ContractAmendmentForm.tsx
- [X] T155 [US8] 实现补充协议列表显示（包含编辑和删除按钮）frontend/src/components/business/ContractAmendmentList.tsx
- [ ] T156 [US8] 更新前端合同详情页面集成补充协议管理（包含列表、创建、编辑、删除功能）frontend/src/components/business/ContractDetail.tsx
- [X] T420 [US8] 更新ContractAmendmentService使用权限服务：在管理补充协议时调用权限服务检查权限（CanManageBusinessInfo）backend/internal/services/contract_amendment_service.go
- [X] T421 [US8] 更新ContractAmendmentHandler使用权限服务：在补充协议管理Handler中调用权限服务 backend/internal/handlers/contract_amendment_handler.go
- [X] T422 [US8] 更新前端补充协议管理组件：使用权限服务检查权限，无权限时隐藏编辑入口（添加、编辑、删除按钮等），所有用户可查看内容 frontend/src/components/business/ContractAmendmentForm.tsx

---

## Phase 11: User Story 9 - 记录甲方支付 (P1)

### Story Goal
经营负责人能够记录甲方的支付信息，包括支付时间、支付金额等信息，用于跟踪项目的收款情况。

### Independent Test Criteria
- 经营负责人可以记录甲方支付信息
- 支付记录保存成功并更新已收金额统计
- 支付记录可以编辑和删除

### Implementation Tasks

- [X] T157 [US9] 实现甲方支付记录创建（使用FinancialRecord，financial_type=client_payment）backend/internal/services/financial_service.go
- [X] T158 [US9] 实现支付记录更新和删除逻辑 backend/internal/services/financial_service.go
- [X] T159 [US9] 实现已收金额统计计算 backend/internal/services/financial_service.go
- [X] T160 [US9] 更新FinancialHandler支持甲方支付记录（包含创建、读取、更新、删除接口）backend/internal/handlers/financial_handler.go
- [X] T161 [US9] 创建前端甲方支付表单组件（支持创建和编辑模式）frontend/src/components/business/ClientPaymentForm.tsx
- [X] T162 [US9] 实现支付记录列表显示（包含编辑和删除按钮）frontend/src/components/business/PaymentRecordList.tsx
- [ ] T163 [US9] 更新前端项目经营信息页面集成支付记录管理（包含列表、创建、编辑、删除功能）frontend/src/pages/ProjectBusiness.tsx
- [X] T423 [US9] 更新FinancialService使用权限服务：在记录甲方支付时调用权限服务检查权限（CanManageBusinessInfo）backend/internal/services/financial_service.go
- [X] T424 [US9] 更新FinancialHandler使用权限服务：在甲方支付记录Handler中调用权限服务 backend/internal/handlers/financial_handler.go
- [ ] T425 [US9] 更新前端甲方支付表单组件：使用权限服务检查权限，无权限时隐藏编辑入口（添加、编辑、删除按钮等），所有用户可查看内容 frontend/src/components/business/ClientPaymentForm.tsx

---

## Phase 12: User Story 10 - 记录我方开票 (P1)

### Story Goal
经营负责人能够记录我方向甲方的开票信息，包括开票时间、开票金额、上传发票文件等信息。

### Independent Test Criteria
- 经营负责人可以记录开票信息并上传发票文件
- 开票记录可以关联到对应的支付记录
- 开票记录可以编辑和更新

### Implementation Tasks

- [X] T164 [US10] 实现我方开票记录创建（使用FinancialRecord，financial_type=our_invoice）backend/internal/services/financial_service.go
- [X] T165 [US10] 实现开票记录更新和删除逻辑（支持编辑开票信息和更新发票文件）backend/internal/services/financial_service.go
- [X] T166 [US10] 实现开票记录关联支付记录逻辑 backend/internal/services/financial_service.go
- [X] T167 [US10] 实现发票文件上传和关联 backend/internal/services/financial_service.go
- [X] T168 [US10] 更新FinancialHandler支持我方开票记录（包含创建、读取、更新、删除接口）backend/internal/handlers/financial_handler.go
- [X] T169 [US10] 创建前端我方开票表单组件（支持创建和编辑模式）frontend/src/components/business/OurInvoiceForm.tsx
- [X] T170 [US10] 实现发票文件上传UI frontend/src/components/business/OurInvoiceForm.tsx（已集成在表单中）
- [X] T171 [US10] 实现开票记录列表显示（包含编辑和删除按钮）frontend/src/components/business/InvoiceRecordList.tsx
- [ ] T172 [US10] 更新前端项目经营信息页面集成开票记录管理（包含列表、创建、编辑、删除功能）frontend/src/pages/ProjectBusiness.tsx
- [X] T426 [US10] 更新FinancialService使用权限服务：在记录我方开票时调用权限服务检查权限（CanManageBusinessInfo）backend/internal/services/financial_service.go
- [X] T427 [US10] 更新FinancialHandler使用权限服务：在我方开票记录Handler中调用权限服务 backend/internal/handlers/financial_handler.go
- [ ] T428 [US10] 更新前端我方开票表单组件：使用权限服务检查权限，无权限时隐藏编辑入口（添加、编辑、删除按钮等），所有用户可查看内容 frontend/src/components/business/OurInvoiceForm.tsx

---

## Phase 13: User Story 11 - 分配经营奖金 (P2)

### Story Goal
经营负责人能够为项目经营相关人员分配经营奖金，包括选择发放人员、录入发放金额、发放时间等信息。

### Independent Test Criteria
- 经营负责人可以选择发放人员并录入奖金信息
- 奖金记录保存成功并更新奖金统计
- 奖金记录可以编辑和删除

### Implementation Tasks

- [X] T173 [US11] 实现经营奖金记录创建（使用FinancialRecord，financial_type=bonus，bonus_category=business）backend/internal/services/financial_service.go
- [X] T174 [US11] 实现奖金记录更新和删除逻辑 backend/internal/services/financial_service.go
- [X] T175 [US11] 实现奖金发放人员关联（RecipientID）backend/internal/services/financial_service.go
- [X] T176 [US11] 实现经营奖金统计计算 backend/internal/services/financial_service.go
- [X] T177 [US11] 更新FinancialHandler支持经营奖金记录（包含创建、读取、更新、删除接口）backend/internal/handlers/financial_handler.go
- [ ] T178 [US11] 创建前端经营奖金表单组件（支持创建和编辑模式）frontend/src/components/business/BusinessBonusForm.tsx
- [ ] T179 [US11] 实现发放人员选择组件 frontend/src/components/business/BonusRecipientSelector.tsx
- [ ] T180 [US11] 实现奖金记录列表显示（包含编辑和删除按钮）frontend/src/components/business/BusinessBonusList.tsx
- [X] T181 [US11] 更新前端项目经营信息页面集成奖金管理（包含列表、创建、编辑、删除功能）frontend/src/pages/ProjectBusiness.tsx
- [X] T429 [US11] 更新FinancialService使用权限服务：在分配经营奖金时调用权限服务检查权限（CanManageBusinessInfo）backend/internal/services/financial_service.go
- [X] T430 [US11] 更新FinancialHandler使用权限服务：在经营奖金分配Handler中调用权限服务 backend/internal/handlers/financial_handler.go
- [ ] T431 [US11] 更新前端经营奖金表单组件：使用权限服务检查权限，无权限时隐藏编辑入口（添加、编辑、删除按钮等），所有用户可查看内容 frontend/src/components/business/BusinessBonusForm.tsx

---

## Phase 14: User Story 12 - 查看经营信息统计 (P1)

### Story Goal
经营负责人能够查看项目的经营信息统计，包括总应收金额（合同金额）、已收金额（甲方支付）、未收金额（应收减去已收）等关键指标。

### Independent Test Criteria
- 经营信息统计准确计算并显示
- 统计数据实时更新
- 支持按时间段查看历史统计数据

### Implementation Tasks

- [X] T182 [US12] 实现总应收金额计算（合同金额+补充协议金额）backend/internal/services/project_business_service.go
- [X] T183 [US12] 实现已收金额计算（甲方支付汇总）backend/internal/services/project_business_service.go
- [X] T184 [US12] 实现未收金额计算（总应收-已收）backend/internal/services/project_business_service.go
- [X] T185 [US12] 实现经营信息统计接口 backend/internal/handlers/project_business_handler.go
- [X] T186 [US12] 实现按时间段统计功能 backend/internal/services/project_business_service.go
- [X] T187 [US12] 创建前端经营信息统计组件 frontend/src/components/business/BusinessStatistics.tsx
- [X] T188 [US12] 实现统计数据可视化展示 frontend/src/components/business/BusinessStatistics.tsx
- [ ] T189 [US12] 实现统计报表导出功能 frontend/src/components/business/BusinessStatistics.tsx（暂不考虑，见spec.md）
- [X] T190 [US12] 更新前端项目经营信息页面集成统计展示 frontend/src/pages/ProjectBusiness.tsx
- [X] T432 [US12] 更新ProjectBusinessService使用权限服务：在查看经营信息统计时调用权限服务检查权限（CanManageBusinessInfo）backend/internal/services/project_business_service.go
- [X] T433 [US12] 更新ProjectBusinessHandler使用权限服务：在经营信息统计Handler中调用权限服务 backend/internal/handlers/project_business_handler.go
- [X] T434 [US12] 更新前端经营信息统计组件：使用权限服务检查权限，无权限时隐藏编辑入口（如有），所有用户可查看统计内容 frontend/src/components/business/BusinessStatistics.tsx

---

## Phase 15: User Story 13 - 配置生产人员 (P2)

### Story Goal
项目管理员或生产负责人能够为项目配置生产人员，包括按专业维度配置设计人、参与人、复核人，以及配置审核人、审定人。支持添加、编辑、删除生产人员配置。审核人和审定人应该与生产人员放在一起，审核人和审定人排在前面，编辑时应该一起修改（在同一个弹出框中编辑和保存）；生产人员（按专业）统一入口，在弹出框中编辑和保存，列表支持编辑和删除；专业选择支持新增、编辑、删除。

### Independent Test Criteria
- 项目管理员和生产负责人可以按专业配置生产人员
- 审核人和审定人可以在弹出框中编辑和保存
- 生产人员（按专业）统一入口，在弹出框中编辑和保存，列表支持编辑和删除
- 专业选择支持新增、编辑、删除并同步到专业字典
- 生产人员配置保存成功
- 生产人员配置可以编辑和删除

### Implementation Tasks

- [X] T165 [US13] 更新ProjectMember模型支持生产人员角色（designer, participant, reviewer, auditor, approver）backend/internal/models/project_member.go
- [X] T166 [US13] 实现按专业维度配置生产人员逻辑（包含创建、更新、删除）backend/internal/services/project_member_service.go
- [X] T167 [US13] 实现专业关联验证（生产人员角色必须关联专业）backend/internal/services/project_member_service.go
- [X] T168 [US13] 实现专业管理逻辑（创建、更新、删除专业并同步到专业字典）backend/internal/services/project_member_service.go
- [X] T169 [US13] 更新ProjectMemberHandler支持生产人员配置（包含创建、读取、更新、删除接口）backend/internal/handlers/project_member_handler.go
- [X] T180 [US13] 更新前端生产人员配置主组件：将审核人、审定人和生产人员放在一起，审核人和审定人排在前面，使用统一编辑弹出框 frontend/src/components/production/ProductionPersonnelManager.tsx
- [X] T172 [US13] 实现生产人员（按专业）编辑弹出框（支持添加、编辑生产人员，包含专业选择、角色选择、人员选择等）frontend/src/components/production/DisciplinePersonnelModal.tsx
- [X] T179 [US13] 实现审核人和审定人统一编辑弹出框（支持在同一个弹出框中一起编辑和保存审核人、审定人）frontend/src/components/production/ReviewerModal.tsx
- [X] T174 [US13] 实现专业选择器组件（支持选择专业、新增专业、编辑专业、删除专业）frontend/src/components/production/DisciplineSelector.tsx
- [X] T177 [US13] 实现专业管理弹出框（支持新增、编辑、删除专业）frontend/src/components/production/DisciplineManageModal.tsx
- [X] T178 [US13] 更新前端项目生产信息页面集成人员配置（统一入口，包含生产人员列表和审核人/审定人配置入口）frontend/src/components/production/ProductionInfo.tsx
- [X] T435 [US13] 更新ProjectMemberService使用权限服务：在配置生产人员时调用权限服务检查权限（CanManageProjectMembers，memberRole为生产人员角色）backend/internal/services/project_member_service.go
- [X] T436 [US13] 更新ProjectMemberHandler使用权限服务：在生产人员配置Handler中调用权限服务 backend/internal/handlers/project_member_handler.go
- [X] T437 [US13] 更新前端生产人员配置组件：使用权限服务检查权限，无权限时隐藏编辑入口（添加、编辑、删除按钮等），所有用户可查看内容 frontend/src/components/production/ProductionPersonnelManager.tsx

---

## Phase 16: User Story 14 - 批复审计阶段管理 (P2)

### Story Goal
生产负责人能够管理项目的批复和审计阶段信息，包括上传批复报告、审计报告，以及录入批复金额和审计金额（按设计费、勘察费、咨询费分别录入）。支持添加、编辑、删除批复审计记录，文件在保存时上传，支持文件下载和删除。

### Independent Test Criteria
- 生产负责人可以上传批复审计报告
- 批复审计金额明细可以分别录入
- 批复审计金额默认引用合同金额，可手工调整
- 批复审计记录可以编辑和删除
- 批复审计报告文件可以下载和删除

### Implementation Tasks

- [X] T175 [US14] 更新ProductionApproval模型符合002规范 backend/internal/models/production_approval.go
- [X] T176 [US14] 实现批复审计金额默认引用合同金额逻辑 backend/internal/services/production_approval_service.go
- [X] T177 [US14] 实现批复审计金额手工调整和覆盖原因记录 backend/internal/services/production_approval_service.go
- [X] T178 [US14] 更新ProductionApprovalService支持批复审计管理（包含创建、读取、更新、删除）backend/internal/services/production_approval_service.go
- [X] T179 [US14] 更新ProductionApprovalHandler支持批复审计CRUD（包含创建、读取、更新、删除接口）backend/internal/handlers/production_approval_handler.go
- [X] T180 [US14] 实现批复审计报告文件上传功能（在保存时触发上传）backend/internal/handlers/production_approval_handler.go
- [X] T180.1 [US14] 实现批复审计报告文件下载功能 backend/internal/handlers/production_approval_handler.go
- [X] T180.2 [US14] 实现批复审计报告文件删除功能 backend/internal/handlers/production_approval_handler.go
- [X] T438 [US14] 更新ProductionApprovalService使用权限服务：在管理批复审计信息时调用权限服务检查权限（CanManageProductionInfo）backend/internal/services/production_approval_service.go
- [X] T439 [US14] 更新ProductionApprovalHandler使用权限服务：在批复审计管理Handler中调用权限服务 backend/internal/handlers/production_approval_handler.go
- [X] T440 [US14] 更新前端批复审计查看组件：使用权限服务检查权限，无权限时隐藏编辑入口（新建/编辑按钮），所有用户可查看内容 frontend/src/components/production/ApprovalAuditView.tsx
- [X] T456 [US14] 创建前端批复审计查看组件（左右并排布局：批复列和审计列，每列包含报告和金额）frontend/src/components/production/ApprovalAuditView.tsx
- [X] T457 [US14] 创建前端批复审计弹窗表单组件（支持新建和编辑模式，弹窗形式，左右并排布局）frontend/src/components/production/ApprovalAuditModal.tsx
- [X] T458 [US14] 实现批复审计左右并排布局（批复列：批复报告+批复金额，审计列：审计报告+审计金额）frontend/src/components/production/ApprovalAuditModal.tsx
- [X] T459 [US14] 实现批复审计金额明细录入（设计费、勘察费、咨询费，分别录入批复金额和审计金额）frontend/src/components/production/ApprovalAuditModal.tsx
- [X] T460 [US14] 实现引用合同金额功能（批复金额可引用合同金额，审计金额可引用批复金额）frontend/src/components/production/ApprovalAuditModal.tsx
- [X] T461 [US14] 实现批复审计报告上传UI（批复报告和审计报告分别上传，文件选择后不立即上传，在表单保存时触发上传）frontend/src/components/production/ApprovalAuditModal.tsx
- [X] T462 [US14] 实现批复审计报告文件下载功能（批复报告和审计报告分别支持下载）frontend/src/components/production/ApprovalAuditView.tsx
- [X] T463 [US14] 实现批复审计报告文件删除功能（批复报告和审计报告分别支持删除）frontend/src/components/production/ApprovalAuditView.tsx
- [X] T464 [US14] 实现统一的编辑入口按钮（无内容时显示"+ 新建"，有内容时显示"编辑"，位于右上角）frontend/src/components/production/ApprovalAuditView.tsx
- [X] T465 [US14] 实现覆盖原因说明录入（当金额被手工调整时显示并填写）frontend/src/components/production/ApprovalAuditModal.tsx
- [X] T466 [US14] 实现金额自动计算合计（批复金额和审计金额分别计算合计并实时显示）frontend/src/components/production/ApprovalAuditModal.tsx
- [X] T467 [US14] 更新前端项目生产信息页面集成批复审计管理（集成查看组件，支持新建/编辑弹窗，删除确认）frontend/src/components/production/ProductionInfo.tsx
- [X] T468 [US14] 更新前端批复审计弹窗组件：使用权限服务检查权限，无权限时禁用编辑功能 frontend/src/components/production/ApprovalAuditModal.tsx

---

## Phase 17: User Story 15 - 方案阶段文件管理 (P2)

### Story Goal
生产负责人能够上传方案阶段的文件，包括方案文件、校审单和评分，确保方案阶段的工作成果得到完整记录。支持添加、编辑、删除方案文件，文件在保存时上传，支持文件下载和删除。

### Independent Test Criteria
- 生产负责人可以上传方案文件、校审单和评分
- 校审单和评分为必填项
- 文件上传成功并关联到项目
- 方案文件可以编辑和删除
- 方案文件、校审单可以下载和删除

### Implementation Tasks

- [ ] T186 [US15] 更新ProductionFile模型支持Stage枚举（scheme阶段）backend/internal/models/production_file.go
- [ ] T187 [US15] 实现方案阶段文件上传逻辑（包含校审单和评分验证，支持创建、更新、删除）backend/internal/services/production_file_service.go
- [ ] T188 [US15] 实现校审单和评分必填验证 backend/internal/services/production_file_service.go
- [ ] T189 [US15] 更新ProductionFileHandler支持方案阶段文件管理（包含创建、读取、更新、删除接口）backend/internal/handlers/production_file_handler.go
- [ ] T189.1 [US15] 实现方案阶段文件下载功能 backend/internal/handlers/production_file_handler.go
- [ ] T189.2 [US15] 实现方案阶段文件删除功能 backend/internal/handlers/production_file_handler.go
- [ ] T190 [US15] 创建前端方案阶段文件管理主组件（包含加载中、成功、空状态、错误状态）frontend/src/components/production/SchemeStageFileManagement.tsx
- [ ] T190.1 [US15] 实现加载中状态显示（显示"正在加载文件信息..."）frontend/src/components/production/SchemeStageFileManagement.tsx
- [ ] T190.2 [US15] 实现成功状态显示（有文件数据时显示文件列表和评分）frontend/src/components/production/SchemeStageFileManagement.tsx
- [ ] T190.3 [US15] 实现空状态显示（无文件时显示提示信息）frontend/src/components/production/SchemeStageFileManagement.tsx
- [ ] T190.4 [US15] 实现错误状态显示（显示错误提示信息）frontend/src/components/production/SchemeStageFileManagement.tsx
- [ ] T191 [US15] 创建上传文件弹窗组件（文件类型选择、文件上传区域、保存/取消按钮）frontend/src/components/production/SchemeFileUploadModal.tsx
- [ ] T191.1 [US15] 实现文件类型选择（方案文件、校审单）frontend/src/components/production/SchemeFileUploadModal.tsx
- [ ] T191.2 [US15] 实现文件上传区域（支持点击和拖拽上传，显示文件格式和大小限制提示）frontend/src/components/production/SchemeFileUploadModal.tsx
- [ ] T191.3 [US15] 实现弹窗保存和取消功能（保存时触发文件上传，取消时关闭弹窗）frontend/src/components/production/SchemeFileUploadModal.tsx
- [ ] T192 [US15] 创建编辑评分弹窗组件（评分输入框、保存/取消按钮）frontend/src/components/production/SchemeScoreEditModal.tsx
- [ ] T192.1 [US15] 实现评分输入验证（0-100范围，必填项验证）frontend/src/components/production/SchemeScoreEditModal.tsx
- [ ] T192.2 [US15] 实现弹窗保存和取消功能（保存时更新评分，取消时关闭弹窗）frontend/src/components/production/SchemeScoreEditModal.tsx
- [ ] T193 [US15] 实现方案文件列表显示（包含文件名、大小、上传时间、下载、删除按钮）frontend/src/components/production/SchemeStageFileManagement.tsx
- [ ] T193.1 [US15] 实现方案文件下载功能 frontend/src/components/production/SchemeStageFileManagement.tsx
- [ ] T193.2 [US15] 实现方案文件删除功能（包含删除确认）frontend/src/components/production/SchemeStageFileManagement.tsx
- [ ] T194 [US15] 实现校审单文件显示（包含文件名、大小、上传时间、下载、删除按钮）frontend/src/components/production/SchemeStageFileManagement.tsx
- [ ] T194.1 [US15] 实现校审单文件下载功能 frontend/src/components/production/SchemeStageFileManagement.tsx
- [ ] T194.2 [US15] 实现校审单文件删除功能（包含删除确认）frontend/src/components/production/SchemeStageFileManagement.tsx
- [ ] T195 [US15] 实现评分显示和编辑入口（显示当前评分，点击编辑按钮打开评分编辑弹窗）frontend/src/components/production/SchemeStageFileManagement.tsx
- [ ] T196 [US15] 更新前端项目生产信息页面集成方案阶段文件管理（集成主组件，支持所有状态和弹窗交互）frontend/src/components/production/ProductionInfo.tsx
- [ ] T441 [US15] 更新ProductionFileService使用权限服务：在管理方案阶段文件时调用权限服务检查权限（CanManageProductionInfo）backend/internal/services/production_file_service.go
- [ ] T442 [US15] 更新ProductionFileHandler使用权限服务：在方案阶段文件管理Handler中调用权限服务 backend/internal/handlers/production_file_handler.go
- [ ] T443 [US15] 更新前端方案阶段文件管理组件：使用权限服务检查权限，无权限时隐藏编辑入口（上传、删除、编辑按钮等），所有用户可查看内容 frontend/src/components/production/SchemeStageFileManagement.tsx

---

## Phase 18: User Story 16 - 初步设计阶段文件管理 (P2)

### Story Goal
生产负责人能够上传初步设计阶段的文件，包括初步设计文件、校审单和评分，确保初步设计阶段的工作成果得到完整记录。支持添加、编辑、删除初步设计文件，文件在保存时上传，支持文件下载和删除。

### Independent Test Criteria
- 生产负责人可以上传初步设计文件、校审单和评分
- 校审单和评分为必填项
- 文件上传成功并关联到项目
- 初步设计文件可以编辑和删除
- 初步设计文件、校审单可以下载和删除

### Implementation Tasks

- [ ] T197 [US16] 实现初步设计阶段文件上传逻辑（包含校审单和评分验证，支持创建、更新、删除）backend/internal/services/production_file_service.go
- [ ] T198 [US16] 更新ProductionFileHandler支持初步设计阶段文件管理（包含创建、读取、更新、删除接口）backend/internal/handlers/production_file_handler.go
- [ ] T198.1 [US16] 实现初步设计阶段文件下载功能 backend/internal/handlers/production_file_handler.go
- [ ] T198.2 [US16] 实现初步设计阶段文件删除功能 backend/internal/handlers/production_file_handler.go
- [ ] T199 [US16] 创建前端初步设计阶段文件管理主组件（包含加载中、成功、空状态、错误状态）frontend/src/components/production/PreliminaryStageFileManagement.tsx
- [ ] T199.1 [US16] 实现加载中状态显示（显示"正在加载文件信息..."）frontend/src/components/production/PreliminaryStageFileManagement.tsx
- [ ] T199.2 [US16] 实现成功状态显示（有文件数据时显示文件列表和评分）frontend/src/components/production/PreliminaryStageFileManagement.tsx
- [ ] T199.3 [US16] 实现空状态显示（无文件时显示提示信息）frontend/src/components/production/PreliminaryStageFileManagement.tsx
- [ ] T199.4 [US16] 实现错误状态显示（显示错误提示信息）frontend/src/components/production/PreliminaryStageFileManagement.tsx
- [ ] T200 [US16] 创建上传文件弹窗组件（文件类型选择、文件上传区域、保存/取消按钮）frontend/src/components/production/PreliminaryFileUploadModal.tsx
- [ ] T200.1 [US16] 实现文件类型选择（初步设计文件、校审单）frontend/src/components/production/PreliminaryFileUploadModal.tsx
- [ ] T200.2 [US16] 实现文件上传区域（支持点击和拖拽上传，显示文件格式和大小限制提示）frontend/src/components/production/PreliminaryFileUploadModal.tsx
- [ ] T200.3 [US16] 实现弹窗保存和取消功能（保存时触发文件上传，取消时关闭弹窗）frontend/src/components/production/PreliminaryFileUploadModal.tsx
- [ ] T201 [US16] 创建编辑评分弹窗组件（评分输入框、保存/取消按钮）frontend/src/components/production/PreliminaryScoreEditModal.tsx
- [ ] T201.1 [US16] 实现评分输入验证（0-100范围，必填项验证）frontend/src/components/production/PreliminaryScoreEditModal.tsx
- [ ] T201.2 [US16] 实现弹窗保存和取消功能（保存时更新评分，取消时关闭弹窗）frontend/src/components/production/PreliminaryScoreEditModal.tsx
- [ ] T202 [US16] 实现初步设计文件列表显示（包含文件名、大小、上传时间、下载、删除按钮）frontend/src/components/production/PreliminaryStageFileManagement.tsx
- [ ] T202.1 [US16] 实现初步设计文件下载功能 frontend/src/components/production/PreliminaryStageFileManagement.tsx
- [ ] T202.2 [US16] 实现初步设计文件删除功能（包含删除确认）frontend/src/components/production/PreliminaryStageFileManagement.tsx
- [ ] T203 [US16] 实现校审单文件显示（包含文件名、大小、上传时间、下载、删除按钮）frontend/src/components/production/PreliminaryStageFileManagement.tsx
- [ ] T203.1 [US16] 实现校审单文件下载功能 frontend/src/components/production/PreliminaryStageFileManagement.tsx
- [ ] T203.2 [US16] 实现校审单文件删除功能（包含删除确认）frontend/src/components/production/PreliminaryStageFileManagement.tsx
- [ ] T204 [US16] 实现评分显示和编辑入口（显示当前评分，点击编辑按钮打开评分编辑弹窗）frontend/src/components/production/PreliminaryStageFileManagement.tsx
- [ ] T205 [US16] 更新前端项目生产信息页面集成初步设计阶段文件管理（集成主组件，支持所有状态和弹窗交互）frontend/src/components/production/ProductionInfo.tsx
- [ ] T444 [US16] 更新ProductionFileService使用权限服务：在管理初步设计阶段文件时调用权限服务检查权限（CanManageProductionInfo）backend/internal/services/production_file_service.go
- [ ] T445 [US16] 更新ProductionFileHandler使用权限服务：在初步设计阶段文件管理Handler中调用权限服务 backend/internal/handlers/production_file_handler.go
- [ ] T446 [US16] 更新前端初步设计阶段文件管理组件：使用权限服务检查权限，无权限时隐藏编辑入口（上传、删除、编辑按钮等），所有用户可查看内容 frontend/src/components/production/PreliminaryStageFileManagement.tsx

---

## Phase 19: User Story 17 - 施工图设计阶段文件管理 (P2)

### Story Goal
生产负责人能够上传施工图设计阶段的文件，包括施工图设计文件、校审单和评分，确保施工图设计阶段的工作成果得到完整记录。支持添加、编辑、删除施工图设计文件，文件在保存时上传，支持文件下载和删除。

### Independent Test Criteria
- 生产负责人可以上传施工图设计文件、校审单和评分
- 校审单和评分为必填项
- 文件上传成功并关联到项目
- 施工图设计文件可以编辑和删除
- 施工图设计文件、校审单可以下载和删除

### Implementation Tasks

- [ ] T206 [US17] 实现施工图设计阶段文件上传逻辑（包含校审单和评分验证，支持创建、更新、删除）backend/internal/services/production_file_service.go
- [ ] T207 [US17] 更新ProductionFileHandler支持施工图设计阶段文件管理（包含创建、读取、更新、删除接口）backend/internal/handlers/production_file_handler.go
- [ ] T207.1 [US17] 实现施工图设计阶段文件下载功能 backend/internal/handlers/production_file_handler.go
- [ ] T207.2 [US17] 实现施工图设计阶段文件删除功能 backend/internal/handlers/production_file_handler.go
- [ ] T208 [US17] 创建前端施工图设计阶段文件管理主组件（包含加载中、成功、空状态、错误状态）frontend/src/components/production/ConstructionStageFileManagement.tsx
- [ ] T208.1 [US17] 实现加载中状态显示（显示"正在加载文件信息..."）frontend/src/components/production/ConstructionStageFileManagement.tsx
- [ ] T208.2 [US17] 实现成功状态显示（有文件数据时显示文件列表和评分）frontend/src/components/production/ConstructionStageFileManagement.tsx
- [ ] T208.3 [US17] 实现空状态显示（无文件时显示提示信息）frontend/src/components/production/ConstructionStageFileManagement.tsx
- [ ] T208.4 [US17] 实现错误状态显示（显示错误提示信息）frontend/src/components/production/ConstructionStageFileManagement.tsx
- [ ] T209 [US17] 创建上传文件弹窗组件（文件类型选择、文件上传区域、保存/取消按钮）frontend/src/components/production/ConstructionFileUploadModal.tsx
- [ ] T209.1 [US17] 实现文件类型选择（施工图设计文件、校审单）frontend/src/components/production/ConstructionFileUploadModal.tsx
- [ ] T209.2 [US17] 实现文件上传区域（支持点击和拖拽上传，显示文件格式和大小限制提示）frontend/src/components/production/ConstructionFileUploadModal.tsx
- [ ] T209.3 [US17] 实现弹窗保存和取消功能（保存时触发文件上传，取消时关闭弹窗）frontend/src/components/production/ConstructionFileUploadModal.tsx
- [ ] T210 [US17] 创建编辑评分弹窗组件（评分输入框、保存/取消按钮）frontend/src/components/production/ConstructionScoreEditModal.tsx
- [ ] T210.1 [US17] 实现评分输入验证（0-100范围，必填项验证）frontend/src/components/production/ConstructionScoreEditModal.tsx
- [ ] T210.2 [US17] 实现弹窗保存和取消功能（保存时更新评分，取消时关闭弹窗）frontend/src/components/production/ConstructionScoreEditModal.tsx
- [ ] T211 [US17] 实现施工图设计文件列表显示（包含文件名、大小、上传时间、下载、删除按钮）frontend/src/components/production/ConstructionStageFileManagement.tsx
- [ ] T211.1 [US17] 实现施工图设计文件下载功能 frontend/src/components/production/ConstructionStageFileManagement.tsx
- [ ] T211.2 [US17] 实现施工图设计文件删除功能（包含删除确认）frontend/src/components/production/ConstructionStageFileManagement.tsx
- [ ] T212 [US17] 实现校审单文件显示（包含文件名、大小、上传时间、下载、删除按钮）frontend/src/components/production/ConstructionStageFileManagement.tsx
- [ ] T212.1 [US17] 实现校审单文件下载功能 frontend/src/components/production/ConstructionStageFileManagement.tsx
- [ ] T212.2 [US17] 实现校审单文件删除功能（包含删除确认）frontend/src/components/production/ConstructionStageFileManagement.tsx
- [ ] T213 [US17] 实现评分显示和编辑入口（显示当前评分，点击编辑按钮打开评分编辑弹窗）frontend/src/components/production/ConstructionStageFileManagement.tsx
- [ ] T214 [US17] 更新前端项目生产信息页面集成施工图设计阶段文件管理（集成主组件，支持所有状态和弹窗交互）frontend/src/components/production/ProductionInfo.tsx
- [ ] T447 [US17] 更新ProductionFileService使用权限服务：在管理施工图设计阶段文件时调用权限服务检查权限（CanManageProductionInfo）backend/internal/services/production_file_service.go
- [ ] T448 [US17] 更新ProductionFileHandler使用权限服务：在施工图设计阶段文件管理Handler中调用权限服务 backend/internal/handlers/production_file_handler.go
- [ ] T449 [US17] 更新前端施工图设计阶段文件管理组件：使用权限服务检查权限，无权限时隐藏编辑入口（上传、删除、编辑按钮等），所有用户可查看内容 frontend/src/components/production/ConstructionStageFileManagement.tsx

---

## Phase 20: User Story 18 - 变更洽商文件管理 (P2)

### Story Goal
生产负责人能够上传变更洽商阶段的文件，记录项目执行过程中的变更和洽商信息。支持添加、编辑、删除变更洽商文件，文件在保存时上传，支持文件下载和删除。

### Independent Test Criteria
- 生产负责人可以上传变更洽商文件
- 文件上传成功并关联到项目
- 变更洽商文件可以查看、编辑、删除和下载

### Implementation Tasks

- [ ] T215 [US18] 实现变更洽商阶段文件上传逻辑（支持创建、更新、删除）backend/internal/services/production_file_service.go
- [ ] T216 [US18] 更新ProductionFileHandler支持变更洽商阶段文件管理（包含创建、读取、更新、删除接口）backend/internal/handlers/production_file_handler.go
- [ ] T216.1 [US18] 实现变更洽商文件下载功能 backend/internal/handlers/production_file_handler.go
- [ ] T216.2 [US18] 实现变更洽商文件删除功能 backend/internal/handlers/production_file_handler.go
- [ ] T217 [US18] 创建前端变更洽商阶段文件上传组件（支持创建和编辑模式，文件选择后不立即上传，在表单保存时触发上传）frontend/src/components/production/ChangeFileUpload.tsx
- [ ] T218 [US18] 实现变更洽商文件列表显示（包含编辑、删除、下载按钮）frontend/src/components/production/ChangeFileList.tsx
- [ ] T218.1 [US18] 实现变更洽商文件下载功能 frontend/src/components/production/ChangeFileList.tsx
- [ ] T218.2 [US18] 实现变更洽商文件删除功能 frontend/src/components/production/ChangeFileList.tsx
- [ ] T219 [US18] 更新前端项目生产信息页面集成变更洽商文件管理（包含列表、创建、编辑、删除功能）frontend/src/pages/ProjectProduction.tsx
- [ ] T450 [US18] 更新ProductionFileService使用权限服务：在管理变更洽商文件时调用权限服务检查权限（CanManageProductionInfo）backend/internal/services/production_file_service.go
- [ ] T451 [US18] 更新ProductionFileHandler使用权限服务：在变更洽商文件管理Handler中调用权限服务 backend/internal/handlers/production_file_handler.go
- [ ] T452 [US18] 更新前端变更洽商文件上传组件：使用权限服务检查权限，无权限时隐藏编辑入口（上传、删除按钮等），所有用户可查看内容 frontend/src/components/production/ChangeFileUpload.tsx

---

## Phase 21: User Story 19 - 竣工验收文件管理 (P2)

### Story Goal
生产负责人能够上传竣工验收阶段的文件，记录项目的竣工验收信息。支持添加、编辑、删除竣工验收文件，文件在保存时上传，支持文件下载和删除。

### Independent Test Criteria
- 生产负责人可以上传竣工验收文件
- 文件上传成功并关联到项目
- 竣工验收文件可以查看、编辑、删除和下载

### Implementation Tasks

- [ ] T220 [US19] 实现竣工验收阶段文件上传逻辑（支持创建、更新、删除）backend/internal/services/production_file_service.go
- [ ] T221 [US19] 更新ProductionFileHandler支持竣工验收阶段文件管理（包含创建、读取、更新、删除接口）backend/internal/handlers/production_file_handler.go
- [ ] T221.1 [US19] 实现竣工验收文件下载功能 backend/internal/handlers/production_file_handler.go
- [ ] T221.2 [US19] 实现竣工验收文件删除功能 backend/internal/handlers/production_file_handler.go
- [ ] T222 [US19] 创建前端竣工验收阶段文件上传组件（支持创建和编辑模式，文件选择后不立即上传，在表单保存时触发上传）frontend/src/components/production/CompletionFileUpload.tsx
- [ ] T223 [US19] 实现竣工验收文件列表显示（包含编辑、删除、下载按钮）frontend/src/components/production/CompletionFileList.tsx
- [ ] T223.1 [US19] 实现竣工验收文件下载功能 frontend/src/components/production/CompletionFileList.tsx
- [ ] T223.2 [US19] 实现竣工验收文件删除功能 frontend/src/components/production/CompletionFileList.tsx
- [ ] T224 [US19] 更新前端项目生产信息页面集成竣工验收文件管理（包含列表、创建、编辑、删除功能）frontend/src/pages/ProjectProduction.tsx
- [ ] T453 [US19] 更新ProductionFileService使用权限服务：在管理竣工验收文件时调用权限服务检查权限（CanManageProductionInfo）backend/internal/services/production_file_service.go
- [ ] T454 [US19] 更新ProductionFileHandler使用权限服务：在竣工验收文件管理Handler中调用权限服务 backend/internal/handlers/production_file_handler.go
- [ ] T455 [US19] 更新前端竣工验收文件上传组件：使用权限服务检查权限，无权限时隐藏编辑入口（上传、删除按钮等），所有用户可查看内容 frontend/src/components/production/CompletionFileUpload.tsx

---

## Phase 22: User Story 20 - 记录生产成本 (P2)

### Story Goal
生产负责人能够记录项目的生产成本信息，包括打车（时间、里程、金额）、住宿（时间、金额）、公共交通（时间、金额）等，并上传相关发票。支持添加、编辑、删除生产成本记录，发票文件在保存时上传，支持发票文件下载和删除。

### Independent Test Criteria
- 生产负责人可以记录不同类型的生产成本
- 成本记录保存成功并更新成本统计
- 发票文件可以上传和关联
- 生产成本记录可以编辑和删除
- 发票文件可以下载和删除

### Implementation Tasks

- [ ] T215 [US20] 实现生产成本记录创建（使用FinancialRecord，financial_type=cost）backend/internal/services/financial_service.go
- [ ] T215.1 [US20] 实现生产成本记录更新 backend/internal/services/financial_service.go
- [ ] T215.2 [US20] 实现生产成本记录删除 backend/internal/services/financial_service.go
- [ ] T216 [US20] 实现成本类别区分（打车、住宿、公共交通）backend/internal/services/financial_service.go
- [ ] T217 [US20] 实现打车成本记录（包含里程字段）backend/internal/services/financial_service.go
- [ ] T218 [US20] 实现成本发票文件上传和关联（在保存时触发上传）backend/internal/services/financial_service.go
- [ ] T218.1 [US20] 实现成本发票文件下载功能 backend/internal/handlers/financial_handler.go
- [ ] T218.2 [US20] 实现成本发票文件删除功能 backend/internal/handlers/financial_handler.go
- [ ] T219 [US20] 实现生产成本统计计算 backend/internal/services/financial_service.go
- [ ] T220 [US20] 更新FinancialHandler支持生产成本记录（包含创建、读取、更新、删除接口）backend/internal/handlers/financial_handler.go
- [ ] T221 [US20] 创建前端生产成本表单组件（支持创建和编辑模式，包含添加、编辑、删除按钮）frontend/src/components/production/ProductionCostForm.tsx
- [ ] T222 [US20] 实现成本类型选择（打车、住宿、公共交通）frontend/src/components/production/ProductionCostForm.tsx
- [ ] T223 [US20] 实现打车成本表单（时间、里程、金额）frontend/src/components/production/TaxiCostForm.tsx
- [ ] T224 [US20] 实现住宿和公共交通成本表单 frontend/src/components/production/AccommodationCostForm.tsx
- [ ] T225 [US20] 实现成本发票上传UI（文件选择后不立即上传，在表单保存时触发上传）frontend/src/components/production/ProductionCostForm.tsx
- [ ] T225.1 [US20] 实现成本发票文件下载功能 frontend/src/components/production/ProductionCostList.tsx
- [ ] T225.2 [US20] 实现成本发票文件删除功能 frontend/src/components/production/ProductionCostList.tsx
- [ ] T226 [US20] 实现生产成本列表显示（包含编辑、删除、下载按钮）frontend/src/components/production/ProductionCostList.tsx
- [ ] T227 [US20] 实现成本统计展示 frontend/src/components/production/ProductionCostStatistics.tsx
- [ ] T228 [US20] 更新前端项目生产信息页面集成成本管理（包含列表、创建、编辑、删除功能）frontend/src/pages/ProjectProduction.tsx
- [ ] T456 [US20] 更新FinancialService使用权限服务：在记录生产成本时调用权限服务检查权限（CanManageProductionInfo）backend/internal/services/financial_service.go
- [ ] T457 [US20] 更新FinancialHandler使用权限服务：在生产成本记录Handler中调用权限服务 backend/internal/handlers/financial_handler.go
- [ ] T458 [US20] 更新前端生产成本表单组件：使用权限服务检查权限，无权限时隐藏编辑入口（添加、编辑、删除按钮等），所有用户可查看内容 frontend/src/components/production/ProductionCostForm.tsx

---

## Updated Dependencies

### Story Completion Order (Updated)

1. **Phase 1 (Setup)** → 必须首先完成
2. **Phase 2 (Foundational)** → 必须在所有用户故事之前完成
3. **Phase 3 (US1)** → 可以与其他P1故事并行
4. **Phase 4 (US2)** → 依赖Phase 2完成
5. **Phase 5 (US3)** → 依赖Phase 4完成
6. **Phase 6 (US4)** → 依赖Phase 4和Phase 2完成
7. **Phase 7 (US5)** → 依赖Phase 4和Phase 5完成
8. **Phase 8 (US6)** → 依赖Phase 4完成
9. **Phase 9 (US7)** → 依赖Phase 4完成
10. **Phase 10 (US8)** → 依赖Phase 9完成
11. **Phase 11 (US9)** → 依赖Phase 9完成
12. **Phase 12 (US10)** → 依赖Phase 11完成（可关联支付记录）
13. **Phase 13 (US11)** → 依赖Phase 4完成
14. **Phase 14 (US12)** → 依赖Phase 9、10、11完成
15. **Phase 15 (US13)** → 依赖Phase 4和Phase 2完成
16. **Phase 16 (US14)** → 依赖Phase 9完成（引用合同金额）
17. **Phase 17-19 (US15-17)** → 依赖Phase 15完成
18. **Phase 20-21 (US18-19)** → 依赖Phase 4完成
19. **Phase 22 (US20)** → 依赖Phase 4完成

### Parallel Execution Examples (Updated)

**Phase 9-14内部并行**:
- T104-T112 (US7) 可以部分并行
- T113-T121 (US8) 可以部分并行
- T122-T128 (US9) 可以部分并行
- T129-T136 (US10) 可以部分并行
- T137-T144 (US11) 可以部分并行
- T145-T153 (US12) 可以部分并行

**Phase 15-22内部并行**:
- T154-T163 (US13) 可以部分并行
- T164-T174 (US14) 可以部分并行
- T175-T183 (US15) 可以部分并行
- T184-T188 (US16) 可以部分并行
- T189-T193 (US17) 可以部分并行
- T194-T198 (US18) 可以部分并行
- T199-T203 (US19) 可以部分并行
- T204-T217 (US20) 可以部分并行

---

## Updated Implementation Strategy

### MVP Scope (Updated)
- Phase 1: Setup（必需）
- Phase 2: Foundational（必需）
- Phase 3: US1 - 账号管理（基础功能）
- Phase 4: US2 - 创建项目（核心功能）
- Phase 9: US7 - 合同签订（核心经营功能）
- Phase 11: US9 - 记录甲方支付（核心财务功能）
- Phase 14: US12 - 查看经营信息统计（核心价值功能）

### Incremental Delivery (Updated)
1. **Week 1**: Phase 1 + Phase 2.1-2.2（路由和认证改造）
2. **Week 2**: Phase 2.3-2.4（ID类型和项目联系人改造）
3. **Week 3**: Phase 2.5-2.6（财务记录统一和专业字典）
4. **Week 4**: Phase 3-4（账号管理和项目创建）
5. **Week 5**: Phase 5-6（负责人配置和甲方管理）
6. **Week 6**: Phase 7-8（经营参与人和招投标管理）
7. **Week 7**: Phase 9-10（合同签订和补充协议）
8. **Week 8**: Phase 11-12（甲方支付、我方开票和经营统计）
9. **Week 9**: Phase 13（配置生产人员）
10. **Week 10**: Phase 14（批复审计阶段管理）
11. **Week 11**: Phase 15-17（方案、初步设计、施工图文件管理）
12. **Week 12**: Phase 18-20（变更洽商、竣工验收、生产成本）

---

## Updated Notes

- 所有任务必须遵循002规范（路由格式、认证方式、数据模型）
- ID类型改造需要数据迁移脚本，建议在测试环境先验证
- 财务记录统一改造需要仔细处理数据迁移，确保数据完整性
- 项目联系人改造需要从Client实体迁移联系人数据
- 存储方案切换通过配置实现，不影响业务逻辑
- 生产阶段文件管理需要区分不同阶段，使用Stage枚举
- 校审单和评分在方案、初步设计、施工图阶段为必填项
- 批复审计金额默认引用合同金额，支持手工调整

**任务进度**: 217/240+ (90%)

---

## Phase 23: User Story 21 - 管理对外委托 (P2)

### Story Goal
生产负责人能够管理项目的对外委托及支付信息，包括记录委托类型（个人或单位）、对委托方的评分、委托合同、给委托方支付（金额、时间、索要发票）等信息。支持添加、编辑、删除对外委托记录，委托合同文件在保存时上传，支持委托合同文件下载和删除。

### Independent Test Criteria
- 生产负责人可以创建对外委托记录
- 委托支付信息通过FinancialRecord管理
- 委托信息保存成功并更新成本统计
- 对外委托记录可以编辑和删除
- 委托合同文件可以下载和删除

### Implementation Tasks

- [ ] T229 [US21] 更新ExternalCommission模型符合002规范（ID为UUID，支付信息通过FinancialRecord关联）backend/internal/models/external_commission.go
- [ ] T230 [US21] 更新ExternalCommissionService支持对外委托管理（包含创建、读取、更新、删除）backend/internal/services/external_commission_service.go
- [ ] T231 [US21] 实现委托支付记录创建（使用FinancialRecord，financial_type=commission_payment）backend/internal/services/external_commission_service.go
- [ ] T232 [US21] 实现对方开票记录创建（使用FinancialRecord，financial_type=vendor_invoice）backend/internal/services/external_commission_service.go
- [ ] T233 [US21] 实现委托支付和开票关联逻辑 backend/internal/services/external_commission_service.go
- [ ] T234 [US21] 更新ExternalCommissionHandler支持对外委托CRUD（包含创建、读取、更新、删除接口）backend/internal/handlers/external_commission_handler.go
- [ ] T235 [US21] 实现委托合同文件上传功能（在保存时触发上传）backend/internal/handlers/external_commission_handler.go
- [ ] T235.1 [US21] 实现委托合同文件下载功能 backend/internal/handlers/external_commission_handler.go
- [ ] T235.2 [US21] 实现委托合同文件删除功能 backend/internal/handlers/external_commission_handler.go
- [ ] T236 [US21] 创建前端对外委托表单组件（支持创建和编辑模式，包含添加、编辑、删除按钮）frontend/src/components/production/ExternalCommissionForm.tsx
- [ ] T237 [US21] 实现委托类型选择（个人/单位）frontend/src/components/production/ExternalCommissionForm.tsx
- [ ] T238 [US21] 实现委托方评分录入组件 frontend/src/components/production/VendorScoreInput.tsx
- [ ] T239 [US21] 实现委托支付和开票记录管理 frontend/src/components/production/CommissionPaymentManager.tsx
- [ ] T240 [US21] 实现委托合同文件上传UI（文件选择后不立即上传，在表单保存时触发上传）frontend/src/components/production/ExternalCommissionForm.tsx
- [ ] T240.1 [US21] 实现委托合同文件下载功能 frontend/src/components/production/ExternalCommissionList.tsx
- [ ] T240.2 [US21] 实现委托合同文件删除功能 frontend/src/components/production/ExternalCommissionList.tsx
- [ ] T241 [US21] 实现对外委托列表显示（包含编辑、删除、下载按钮）frontend/src/components/production/ExternalCommissionList.tsx
- [ ] T242 [US21] 更新前端项目生产信息页面集成对外委托管理（包含列表、创建、编辑、删除功能）frontend/src/pages/ProjectProduction.tsx
- [ ] T459 [US21] 更新ExternalCommissionService使用权限服务：在管理对外委托时调用权限服务检查权限（CanManageProductionInfo）backend/internal/services/external_commission_service.go
- [ ] T460 [US21] 更新ExternalCommissionHandler使用权限服务：在对外委托管理Handler中调用权限服务 backend/internal/handlers/external_commission_handler.go
- [ ] T461 [US21] 更新前端对外委托表单组件：使用权限服务检查权限，无权限时隐藏编辑入口（添加、编辑、删除按钮等），所有用户可查看内容 frontend/src/components/production/ExternalCommissionForm.tsx

---

## Phase 24: User Story 22 - 分配生产奖金 (P2)

### Story Goal
生产负责人能够为项目生产相关人员分配生产奖金，包括选择发放人员、录入发放金额、发放时间等信息。支持添加、编辑、删除生产奖金记录。

### Independent Test Criteria
- 生产负责人可以选择发放人员并录入奖金信息
- 奖金记录保存成功并更新奖金统计
- 奖金记录可以编辑和删除

### Implementation Tasks

- [ ] T243 [US22] 实现生产奖金记录创建（使用FinancialRecord，financial_type=bonus，bonus_category=production）backend/internal/services/financial_service.go
- [ ] T243.1 [US22] 实现生产奖金记录更新 backend/internal/services/financial_service.go
- [ ] T243.2 [US22] 实现生产奖金记录删除 backend/internal/services/financial_service.go
- [ ] T244 [US22] 实现奖金发放人员关联（RecipientID）backend/internal/services/financial_service.go
- [ ] T245 [US22] 实现生产奖金统计计算 backend/internal/services/financial_service.go
- [ ] T246 [US22] 更新FinancialHandler支持生产奖金记录（包含创建、读取、更新、删除接口）backend/internal/handlers/financial_handler.go
- [ ] T247 [US22] 创建前端生产奖金表单组件（支持创建和编辑模式，包含添加、编辑、删除按钮）frontend/src/components/production/ProductionBonusForm.tsx
- [ ] T248 [US22] 实现发放人员选择组件（从项目生产人员中选择）frontend/src/components/production/ProductionBonusRecipientSelector.tsx
- [ ] T249 [US22] 实现奖金记录列表显示（包含编辑、删除按钮）frontend/src/components/production/ProductionBonusList.tsx
- [ ] T250 [US22] 更新前端项目生产信息页面集成生产奖金管理（包含列表、创建、编辑、删除功能）frontend/src/pages/ProjectProduction.tsx
- [ ] T462 [US22] 更新FinancialService使用权限服务：在分配生产奖金时调用权限服务检查权限（CanManageProductionInfo）backend/internal/services/financial_service.go
- [ ] T463 [US22] 更新FinancialHandler使用权限服务：在生产奖金分配Handler中调用权限服务 backend/internal/handlers/financial_handler.go
- [ ] T464 [US22] 更新前端生产奖金表单组件：使用权限服务检查权限，无权限时隐藏编辑入口（添加、编辑、删除按钮等），所有用户可查看内容 frontend/src/components/production/ProductionBonusForm.tsx

---

## Phase 25: User Story 23 - 公司收入管理 (P3)

### Story Goal
财务人员能够管理公司的收入信息，包括设置管理费比例、查看信息汇总（总应收金额、所有发票信息、所有支付信息、未收金额）。需要权限隔离，配置了才能查看公司收入。

### Independent Test Criteria
- 财务人员可以设置管理费比例
- 财务人员可以查看公司收入统计
- 非财务人员无法访问公司收入信息

### Implementation Tasks

- [ ] T251 [US23] 更新CompanyConfig模型符合002规范（ID为UUID）backend/internal/models/company_config.go
- [ ] T252 [US23] 更新CompanyConfigService支持管理费比例设置 backend/internal/services/company_config_service.go
- [ ] T253 [US23] 实现公司收入统计计算（聚合所有项目数据）backend/internal/services/financial_service.go
- [ ] T254 [US23] 实现总应收金额统计（所有项目的合同+补充协议）backend/internal/services/financial_service.go
- [ ] T255 [US23] 实现所有发票信息汇总 backend/internal/services/financial_service.go
- [ ] T256 [US23] 实现所有支付信息汇总 backend/internal/services/financial_service.go
- [ ] T257 [US23] 实现未收金额统计（总应收-已收）backend/internal/services/financial_service.go
- [ ] T465 [US23] 更新CompanyConfigService使用权限服务：在设置管理费比例时调用权限服务检查权限（CanManageCompanyRevenue）backend/internal/services/company_config_service.go
- [ ] T466 [US23] 更新FinancialService使用权限服务：在查看公司收入统计时调用权限服务检查权限（CanManageCompanyRevenue）backend/internal/services/financial_service.go
- [ ] T467 [US23] 更新CompanyConfigHandler使用权限服务：在管理费设置Handler中调用权限服务 backend/internal/handlers/company_config_handler.go
- [ ] T468 [US23] 更新FinancialHandler使用权限服务：在公司收入统计Handler中调用权限服务 backend/internal/handlers/financial_handler.go
- [ ] T259 [US23] 更新CompanyConfigHandler支持管理费设置 backend/internal/handlers/company_config_handler.go
- [ ] T260 [US23] 更新FinancialHandler支持公司收入统计查询 backend/internal/handlers/financial_handler.go
- [ ] T261 [US23] 创建前端管理费设置组件 frontend/src/components/financial/ManagementFeeSetting.tsx
- [ ] T262 [US23] 创建前端公司收入统计组件 frontend/src/components/financial/CompanyRevenueStatistics.tsx
- [ ] T263 [US23] 实现总应收金额展示（按设计费、勘察费、咨询费分类）frontend/src/components/financial/CompanyRevenueStatistics.tsx
- [ ] T264 [US23] 实现发票信息列表展示 frontend/src/components/financial/InvoiceSummary.tsx
- [ ] T265 [US23] 实现支付信息列表展示 frontend/src/components/financial/PaymentSummary.tsx
- [ ] T266 [US23] 实现未收金额统计展示 frontend/src/components/financial/UnpaidAmountSummary.tsx
- [ ] T469 [US23] 更新前端公司收入管理页面：使用权限服务检查权限（CanManageCompanyRevenue），无权限时拒绝访问并显示提示信息（完全不可访问模式）frontend/src/pages/CompanyRevenue.tsx
- [ ] T268 [US23] 更新前端公司收入管理页面 frontend/src/pages/CompanyRevenue.tsx

---

## Phase 26: User Story 24 - 文件管理 (P2)

### Story Goal
用户能够上传、存储、搜索和下载所有项目活动中产生的文件和发票，包括合同文件、生产文件、发票文件等。

### Independent Test Criteria
- 用户可以上传文件并指定文件类型和关联项目
- 用户可以按项目、文件类型、上传时间搜索文件
- 用户可以下载文件（权限验证）

### Implementation Tasks

- [ ] T269 [US24] 更新File模型符合002规范（ID为UUID，支持文件类型分类）backend/internal/models/file.go
- [ ] T270 [US24] 更新FileService支持文件上传、下载、搜索 backend/internal/services/file_service.go
- [ ] T271 [US24] 实现文件类型验证（仅限制危险文件类型）backend/internal/services/file_service.go
- [ ] T272 [US24] 实现文件大小验证（最大100MB）backend/internal/services/file_service.go
- [ ] T273 [US24] 实现文件搜索功能（按项目、文件类型、上传时间）backend/internal/services/file_service.go
- [ ] T470 [US24] 更新FileService使用权限服务：在文件上传、下载、搜索时调用权限服务检查权限（CanAccessProject）backend/internal/services/file_service.go
- [ ] T471 [US24] 更新FileHandler使用权限服务：在文件管理Handler中调用权限服务 backend/internal/handlers/file_handler.go
- [ ] T275 [US24] 创建FileHandler支持文件管理接口 backend/internal/handlers/file_handler.go
- [ ] T276 [US24] 实现文件上传接口 backend/internal/handlers/file_handler.go
- [ ] T277 [US24] 实现文件下载接口（带权限验证）backend/internal/handlers/file_handler.go
- [ ] T278 [US24] 实现文件搜索接口 backend/internal/handlers/file_handler.go
- [ ] T279 [US24] 实现文件删除接口（软删除）backend/internal/handlers/file_handler.go
- [ ] T280 [US24] 创建前端文件上传组件 frontend/src/components/file/FileUpload.tsx
- [ ] T281 [US24] 创建前端文件搜索组件 frontend/src/components/file/FileSearch.tsx
- [ ] T282 [US24] 实现文件类型选择器 frontend/src/components/file/FileTypeSelector.tsx
- [ ] T283 [US24] 实现文件列表展示组件 frontend/src/components/file/FileList.tsx
- [ ] T284 [US24] 实现文件下载功能 frontend/src/components/file/FileDownload.tsx
- [ ] T285 [US24] 实现文件搜索筛选（项目、文件类型、上传时间）frontend/src/components/file/FileSearch.tsx
- [ ] T286 [US24] 创建前端文件管理页面 frontend/src/pages/FileManagement.tsx
- [ ] T287 [US24] 更新前端路由集成文件管理页面 frontend/src/App.tsx
- [ ] T472 [US24] 更新前端文件管理页面：使用权限服务检查权限（CanAccessProject），无权限时隐藏编辑入口（上传、删除按钮等），所有用户可查看文件列表 frontend/src/pages/FileManagement.tsx

---

## Final Phase: Polish & Cross-Cutting Concerns

### Story Goal
完善系统功能，处理边界情况，优化用户体验，确保系统稳定性和可维护性。

### Independent Test Criteria
- 所有边界情况处理正常
- 错误提示友好准确
- 系统性能满足要求
- 代码质量符合规范

### Implementation Tasks

- [ ] T288 实现项目编号重复验证和错误提示 backend/internal/services/project_service.go
- [ ] T289 实现项目软删除功能 backend/internal/services/project_service.go
- [ ] T290 实现项目恢复功能（仅admin）backend/internal/services/project_service.go
- [ ] T291 实现并发编辑冲突提示 backend/internal/handlers/project_handler.go
- [ ] T292 实现文件大小超限错误提示 frontend/src/components/file/FileUpload.tsx
- [ ] T293 实现危险文件类型拦截和错误提示 frontend/src/components/file/FileUpload.tsx
- [ ] T294 实现文件上传失败重试机制 frontend/src/components/file/FileUpload.tsx
- [ ] T295 实现文件下载权限验证失败提示 frontend/src/components/file/FileDownload.tsx
- [ ] T296 实现文件搜索无结果提示 frontend/src/components/file/FileSearch.tsx
- [ ] T297 实现财务数据计算异常处理和回滚 backend/internal/services/financial_service.go
- [ ] T298 实现统计数据实时更新机制 backend/internal/services/project_business_service.go
- [ ] T299 实现数据导出功能（经营统计、公司收入）backend/internal/handlers/financial_handler.go
- [ ] T300 优化数据库查询性能（添加必要索引）scripts/migrations/009_add_performance_indexes.sql
- [ ] T301 实现缓存机制（统计数据缓存）backend/internal/services/cache_service.go
- [ ] T302 完善错误日志记录 backend/internal/middleware/logging.go
- [ ] T303 实现系统健康检查接口 backend/internal/handlers/health_handler.go
- [ ] T304 完善API文档（OpenAPI规范）specs/002-project-management-oa/contracts/openapi.yaml
- [ ] T305 实现前端错误边界组件 frontend/src/components/common/ErrorBoundary.tsx
- [ ] T306 实现前端加载状态组件 frontend/src/components/common/LoadingSpinner.tsx
- [ ] T307 实现前端空状态组件 frontend/src/components/common/EmptyState.tsx
- [ ] T308 优化前端路由和导航体验 frontend/src/App.tsx
- [ ] T309 实现前端国际化支持（中文/英文）frontend/src/i18n/
- [ ] T310 完善单元测试覆盖 backend/tests/unit/
- [ ] T311 完善集成测试覆盖 backend/tests/integration/
- [ ] T312 完善前端组件测试 frontend/tests/components/
- [ ] T313 实现E2E测试场景 frontend/tests/e2e/

---

## Final Dependencies

### Story Completion Order (Final)

1. **Phase 1 (Setup)** → 必须首先完成
2. **Phase 2 (Foundational)** → 必须在所有用户故事之前完成
   - **Phase 2.10 (统一权限管理机制)** → 必须在所有需要权限检查的用户故事之前完成（T389-T408）
   - **权限集成任务** → 必须在对应的用户故事实现完成后进行（T409-T472）
3. **Phase 3-8 (US1-US6)** → P1优先级，基础功能（依赖Phase 2.10完成）
4. **Phase 9-14 (US7-US12)** → P1优先级，核心经营功能
5. **Phase 15-22 (US13-US20)** → P2优先级，生产管理功能
6. **Phase 23-24 (US21-US22)** → P2优先级，生产管理补充功能
7. **Phase 25 (US23)** → P3优先级，财务管理功能（依赖前面功能）
8. **Phase 26 (US24)** → P2优先级，文件管理功能（支撑功能）
9. **Final Phase** → 完善和优化

### Parallel Execution Examples (Final)

**Phase 23-26内部并行**:
- T218-T231 (US21) 可以部分并行
- T232-T239 (US22) 可以部分并行
- T240-T257 (US23) 可以部分并行
- T258-T276 (US24) 可以部分并行

**Phase 2.10内部并行**:
- T389-T391 (权限辅助函数和权限服务基础) 可以部分并行
- T392-T397.3 (权限服务方法实现) 可以部分并行
- T398-T404 (权限中间件和业务代码集成) 可以部分并行
- T405-T408 (前端权限集成) 可以部分并行

**各用户故事权限集成任务并行**:
- US4-US12的权限集成任务（T409-T434）可以部分并行
- US13-US22的权限集成任务（T435-T464）可以部分并行
- US23-US24的权限集成任务（T465-T472）可以部分并行

**Final Phase内部并行**:
- T288-T291 (边界情况处理) 可以并行
- T292-T297 (错误处理和优化) 可以并行
- T298-T302 (性能优化和测试) 可以并行
- T303-T312 (完善和测试) 可以并行

---

## Final Implementation Strategy

### MVP Scope (Final)
- Phase 1: Setup（必需）
- Phase 2: Foundational（必需）
- Phase 3: US1 - 账号管理（基础功能）
- Phase 4: US2 - 创建项目（核心功能）
- Phase 9: US7 - 合同签订（核心经营功能）
- Phase 11: US9 - 记录甲方支付（核心财务功能）
- Phase 14: US12 - 查看经营信息统计（核心价值功能）

### Incremental Delivery (Final)
1. **Week 1**: Phase 1 + Phase 2.1-2.2（路由和认证改造）
2. **Week 2**: Phase 2.3-2.4（ID类型和项目联系人改造）
3. **Week 3**: Phase 2.5-2.6（财务记录统一和专业字典）+ Phase 2.10（统一权限管理机制）
4. **Week 4**: Phase 3-4（账号管理和项目创建）
5. **Week 5**: Phase 5-6（负责人配置和甲方管理）
6. **Week 6**: Phase 7-8（经营参与人和招投标管理）
7. **Week 7**: Phase 9-10（合同签订和补充协议）
8. **Week 8**: Phase 11-12（甲方支付、我方开票和经营统计）
9. **Week 9**: Phase 13（配置生产人员）
10. **Week 10**: Phase 14（批复审计阶段管理）
11. **Week 11**: Phase 15-17（方案、初步设计、施工图文件管理）
12. **Week 12**: Phase 18-20（变更洽商、竣工验收、生产成本）
13. **Week 13**: Phase 21-22（对外委托、生产奖金）
14. **Week 14**: Phase 23（公司收入管理）
15. **Week 15**: Phase 24（文件管理）
16. **Week 16**: Final Phase（完善和优化）

---

## Final Notes

- 所有任务必须遵循002规范（路由格式、认证方式、数据模型）
- ID类型改造需要数据迁移脚本，建议在测试环境先验证
- 财务记录统一改造需要仔细处理数据迁移，确保数据完整性
- 项目联系人改造需要从Client实体迁移联系人数据
- 存储方案切换通过配置实现，不影响业务逻辑
- 生产阶段文件管理需要区分不同阶段，使用Stage枚举
- 校审单和评分在方案、初步设计、施工图阶段为必填项
- 批复审计金额默认引用合同金额，支持手工调整
- 对外委托支付和开票通过FinancialRecord管理
- 公司收入管理需要权限隔离，仅财务人员可访问
- 文件管理需要支持搜索、下载和权限验证
- 所有边界情况需要妥善处理，提供友好的错误提示

**任务进度**: 364/580+ (63%)

**任务统计**:
- Phase 1-2: 75个任务（Setup和Foundational改造，包含Auth优化）
- Phase 2.9: 8个任务（负责人配置改造，确保符合User Story 3要求）
- Phase 2.10: 23个任务（统一权限管理机制，新增权限服务、权限中间件和权限检查辅助函数，包含3个权限服务方法：CanManageBusinessInfo、CanManageProductionInfo、CanManageCompanyRevenue）
- Phase 3: 49个任务（US1 - 账号管理，包含19个登录页面改造任务，新增10个Token刷新、管理员判断、管理员预设用户任务，新增5个用户创建流程优化任务，新增6个管理员编辑用户任务）+ 14个用户角色多选支持任务（T473-T486）
- Phase 4-8: 44个任务（US2-US6，其中Phase 5包含4个负责人配置编辑入口任务）+ 11个权限集成任务（US4: T409-T413, US5: T487-T489, US6: T414-T416）
- Phase 9-14: 56个任务（US7-US12，优化后新增6个任务：合同列表显示、补充协议编辑删除明确化、开票记录编辑、奖金记录编辑删除）+ 18个权限集成任务（T417-T434）
- Phase 15-22: 64个任务（US13-US20，优化后新增约50个任务：补充编辑删除功能、文件上传在保存时触发、文件下载和删除功能）+ 24个权限集成任务（T435-T458）
- Phase 23-24: 22个任务（US21-US22，优化后新增约15个任务：补充编辑删除功能、文件上传在保存时触发、文件下载和删除功能）+ 6个权限集成任务（T459-T464）
- Phase 25: 18个任务（US23）+ 5个权限集成任务（T465-T469，替换T258和T267）
- Phase 26: 19个任务（US24）+ 3个权限集成任务（T470-T472，替换T274和T277）
- Final Phase: 26个任务（完善和优化）

**总计**: 580+个任务（**User Story 13-22优化**：新增约65个任务，确保所有用户故事符合以下要求：1) 遵守统一权限管理机制（已有权限集成任务）；2) 添加、编辑、删除入口完整（补充编辑和删除任务）；3) 文件上传功能明确包含操作入口，触发上传在保存时触发（明确文件上传时机）；4) 文件都能删除和下载（为所有文件添加下载和删除任务）。具体包括：US13补充编辑删除任务；US14补充编辑删除、文件下载删除任务；US15-17补充编辑删除、文件下载删除任务；US18-19补充编辑删除、文件下载删除任务；US20补充编辑删除、发票下载删除任务；US21补充编辑删除、合同下载删除任务；US22补充编辑删除任务）

