# Tasks: 道路设计公司项目管理系统

**Feature**: 002-project-management-oa  
**Date**: 2025-01-28  
**Status**: In Progress  
**Total Tasks**: 120+ (Part 1: 60 tasks)

## Summary

本任务列表基于现有代码基础，拆解为改造任务和新功能实现任务。首先完成现有代码的改造，然后逐步实现新的用户故事功能。

**任务组织**:
- **Phase 1**: Setup（项目初始化）
- **Phase 2**: Foundational（现有代码改造 - 路由、认证、数据模型）
- **Phase 3-8**: User Stories（部分实现，US1-US6）

**关键改造点**:
1. 路由格式：`/api/v1` → `/{service}/v1/{auth_level}/{path}`（支持public/user/admin三种级别）
2. 认证方式：支持两种模式
   - self_validate（开发环境）：调用NebulaAuth API验证Token
   - gateway（生产环境）：从Header读取用户信息（X-User-ID等）
3. ID类型：`uint` → `UUID string`
4. 数据模型：统一财务记录、新增项目联系人实体
5. 存储方案：支持MinIO和OSS切换
6. 服务注册：生产环境需注册服务到NebulaAuth网关

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

- [ ] T001 检查并更新项目依赖版本（Go 1.21+, React 18+）在 go.mod 和 package.json
- [ ] T002 创建存储接口抽象层 pkg/storage/interface.go
- [ ] T003 [P] 实现MinIO存储适配器 pkg/storage/minio.go
- [ ] T004 [P] 实现OSS存储适配器 pkg/storage/oss.go
- [ ] T005 更新配置结构支持存储方案切换 backend/internal/config/config.go
- [ ] T006 更新数据库连接层支持PostgreSQL和RDS backend/pkg/database/postgres.go
- [ ] T007 [P] 创建RDS连接适配器 backend/pkg/database/rds.go
- [ ] T008 更新环境变量配置示例，添加AUTH_MODE、NEBULA_AUTH_URL等配置 backend/env.example 和 frontend/env.example

---

## Phase 2: Foundational - 现有代码改造

### Story Goal
改造现有代码以符合002规范：路由格式、认证方式、数据模型、ID类型。

### Independent Test Criteria
- 所有路由遵循新格式：`/{service}/v1/{auth_level}/{path}`
- 认证中间件从Header读取用户信息
- 所有ID字段使用UUID string类型
- 数据模型符合002规范

### Implementation Tasks

#### 2.1 路由格式改造

- [ ] T009 创建统一路由模块 backend/internal/router/router.go
- [ ] T010 实现路由分组逻辑（public/user/admin级别）backend/internal/router/router.go
- [ ] T011 更新main.go使用新路由模块 backend/cmd/server/main.go
- [ ] T012 [P] 迁移健康检查路由到 /project-oa/v1/public/health
- [ ] T013 [P] 迁移认证路由到 /project-oa/v1/public/auth/*
- [ ] T014 [P] 迁移项目路由到 /project-oa/v1/user/projects/*
- [ ] T015 [P] 迁移合同路由到 /project-oa/v1/user/contracts/*
- [ ] T016 [P] 迁移客户端路由到 /project-oa/v1/user/clients/*
- [ ] T017 [P] 迁移用户路由到 /project-oa/v1/user/users/*
- [ ] T018 [P] 迁移财务路由到 /project-oa/v1/user/financial-records/*
- [ ] T019 [P] 迁移文件路由到 /project-oa/v1/user/files/*
- [ ] T020 [P] 迁移用户管理路由到 /project-oa/v1/admin/users/*（系统管理功能）
- [ ] T021 [P] 迁移公司收入管理路由到 /project-oa/v1/admin/revenue/*（需要管理员权限）
- [ ] T022 更新前端API客户端使用新路由格式 frontend/src/services/api.ts

#### 2.2 认证中间件改造

- [ ] T023 重构认证中间件支持两种认证模式（self_validate/gateway）backend/internal/middleware/auth.go
- [ ] T024 实现gateway模式：从Header读取用户信息（X-User-ID, X-User-Username, X-User-AppID, X-User-SessionID）backend/internal/middleware/auth.go
- [ ] T025 实现self_validate模式：调用NebulaAuth API验证Token（/auth-server/v1/public/auth/validate）backend/internal/middleware/auth.go
- [ ] T026 实现认证模式切换逻辑（根据AUTH_MODE环境变量）backend/internal/middleware/auth.go
- [ ] T027 实现三种认证级别支持（public/user/admin）backend/internal/middleware/auth.go
- [ ] T028 更新GetUserID函数返回UUID string类型 backend/internal/middleware/auth.go
- [ ] T029 移除旧的JWT Token验证逻辑 backend/internal/middleware/auth.go
- [ ] T030 更新所有handler使用新的用户ID获取方式 backend/internal/handlers/*.go
- [ ] T031 更新前端认证服务适配新认证方式 frontend/src/services/auth.ts

#### 2.3 数据模型ID类型改造

- [ ] T032 更新User模型ID为UUID string类型 backend/internal/models/user.go
- [ ] T033 更新Project模型ID为UUID string类型 backend/internal/models/project.go
- [ ] T034 更新Client模型ID为UUID string类型 backend/internal/models/client.go
- [ ] T035 更新Contract模型ID为UUID string类型 backend/internal/models/contract.go
- [ ] T036 更新ContractAmendment模型ID为UUID string类型 backend/internal/models/contract_amendment.go
- [ ] T037 更新File模型ID为UUID string类型 backend/internal/models/file.go
- [ ] T038 更新FinancialRecord模型ID为UUID string类型 backend/internal/models/financial_record.go
- [ ] T039 更新所有关联外键字段为UUID string类型 backend/internal/models/*.go
- [ ] T040 创建数据库迁移脚本迁移现有数据ID类型 scripts/migrations/001_convert_ids_to_uuid.sql
- [ ] T041 更新所有Service层使用UUID string类型 backend/internal/services/*.go
- [ ] T042 更新所有Handler层使用UUID string类型 backend/internal/handlers/*.go

#### 2.4 项目联系人实体改造

- [ ] T043 创建ProjectContact模型 backend/internal/models/project_contact.go
- [ ] T044 从Client模型移除ContactName和ContactPhone字段 backend/internal/models/client.go
- [ ] T045 更新Project模型添加ProjectContact关联 backend/internal/models/project.go
- [ ] T046 创建ProjectContactService backend/internal/services/project_contact_service.go
- [ ] T047 创建ProjectContactHandler backend/internal/handlers/project_contact_handler.go
- [ ] T048 创建数据库迁移脚本添加project_contacts表 scripts/migrations/002_add_project_contacts.sql
- [ ] T049 创建数据迁移脚本迁移联系人数据 scripts/migrations/003_migrate_contact_data.sql

#### 2.5 财务记录实体统一改造

- [ ] T050 重构FinancialRecord模型为统一财务记录实体 backend/internal/models/financial_record.go
- [ ] T051 添加FinancialType和FinancialDirection枚举 backend/internal/models/financial_record.go
- [ ] T052 添加类型特定字段（BonusCategory, CostCategory等）backend/internal/models/financial_record.go
- [ ] T053 更新FinancialService支持统一财务记录 backend/internal/services/financial_service.go
- [ ] T054 迁移Bonus数据到FinancialRecord scripts/migrations/004_migrate_bonus_to_financial_record.sql
- [ ] T055 迁移ExpertFeePayment数据到FinancialRecord scripts/migrations/005_migrate_expert_fee_to_financial_record.sql
- [ ] T056 迁移ProductionCost数据到FinancialRecord scripts/migrations/006_migrate_production_cost_to_financial_record.sql
- [ ] T057 更新FinancialHandler支持新财务记录类型 backend/internal/handlers/financial_handler.go
- [ ] T058 移除旧的Bonus模型 backend/internal/models/bonus.go
- [ ] T059 移除旧的ExpertFeePayment模型 backend/internal/models/expert_fee_payment.go
- [ ] T060 移除旧的ProductionCost模型 backend/internal/models/production_cost.go

#### 2.6 专业字典实体

- [ ] T061 创建Discipline模型 backend/internal/models/discipline.go
- [ ] T062 创建DisciplineService backend/internal/services/discipline_service.go
- [ ] T063 创建DisciplineHandler backend/internal/handlers/discipline_handler.go
- [ ] T064 创建数据库迁移脚本添加disciplines表 scripts/migrations/007_add_disciplines.sql

#### 2.7 服务注册和部署配置

- [ ] T065 实现服务注册功能（调用NebulaAuth服务注册API）backend/internal/services/service_registry.go
- [ ] T066 创建服务注册脚本（生产环境部署时自动注册）scripts/register-service.sh
- [ ] T067 更新部署脚本支持AUTH_MODE环境变量配置 scripts/deploy.sh
- [ ] T068 更新开发环境配置示例（AUTH_MODE=self_validate）backend/.env.development.example
- [ ] T069 更新生产环境配置示例（AUTH_MODE=gateway）backend/.env.production.example

---

## Phase 3: User Story 1 - 账号管理 (P1)

### Story Goal
用户能够创建账号、登录系统，账号是使用系统的前提条件。

### Independent Test Criteria
- 用户可以通过Header中的用户信息访问系统
- 系统能够正确识别用户身份
- 权限控制正常工作

### Implementation Tasks

- [ ] T070 [US1] 更新User模型添加HasAccount字段 backend/internal/models/user.go
- [ ] T071 [US1] 更新UserService支持账号管理 backend/internal/services/user_service.go
- [ ] T072 [US1] 更新UserHandler支持账号查询 backend/internal/handlers/user_handler.go
- [ ] T073 [US1] 实现用户信息获取接口（从Header读取）backend/internal/handlers/auth_handler.go
- [ ] T074 [US1] 更新前端登录页面适配新认证方式 frontend/src/pages/Login.tsx
- [ ] T075 [US1] 更新前端用户信息显示组件 frontend/src/components/auth/UserInfo.tsx

---

## Phase 4: User Story 2 - 创建项目 (P1)

### Story Goal
项目管理员能够创建新项目并录入项目的基本信息。

### Independent Test Criteria
- 项目管理员可以创建新项目
- 项目编号唯一性验证正常
- 项目基本信息保存成功

### Implementation Tasks

- [ ] T066 [US2] 更新Project模型符合002规范 backend/internal/models/project.go
- [ ] T067 [US2] 更新ProjectService支持项目创建 backend/internal/services/project_service.go
- [ ] T068 [US2] 实现项目编号唯一性验证 backend/internal/services/project_service.go
- [ ] T069 [US2] 更新ProjectHandler支持项目创建 backend/internal/handlers/project_handler.go
- [ ] T070 [US2] 更新前端项目创建表单 frontend/src/components/project/ProjectForm.tsx
- [ ] T071 [US2] 更新前端项目列表页面 frontend/src/pages/ProjectList.tsx
- [ ] T072 [US2] 实现项目编号重复验证前端提示 frontend/src/components/project/ProjectForm.tsx

---

## Phase 5: User Story 3 - 配置项目负责人 (P1)

### Story Goal
项目管理员能够在项目基本信息中配置经营负责人和生产负责人。

### Independent Test Criteria
- 项目管理员可以配置经营负责人和生产负责人
- 负责人配置保存成功
- 非项目管理员无法配置负责人

### Implementation Tasks

- [ ] T073 [US3] 更新Project模型添加负责人字段 backend/internal/models/project.go
- [ ] T074 [US3] 更新ProjectService支持负责人配置 backend/internal/services/project_service.go
- [ ] T075 [US3] 实现负责人权限验证 backend/internal/services/project_service.go
- [ ] T076 [US3] 更新ProjectHandler支持负责人配置 backend/internal/handlers/project_handler.go
- [ ] T077 [US3] 更新前端项目详情页面显示负责人信息 frontend/src/pages/ProjectDetail.tsx
- [ ] T078 [US3] 实现负责人选择组件 frontend/src/components/project/ManagerSelector.tsx
- [ ] T079 [US3] 实现负责人配置权限控制 frontend/src/components/project/ManagerSelector.tsx

---

## Phase 6: User Story 4 - 管理甲方信息 (P1)

### Story Goal
经营负责人能够在项目经营信息中管理甲方信息，并为每个项目录入项目级别的联系人信息。

### Independent Test Criteria
- 经营负责人可以选择已有甲方或创建新甲方
- 项目联系人信息可以独立管理
- 相同甲方在不同项目上可以有不同的联系人

### Implementation Tasks

- [ ] T080 [US4] 更新ClientService支持甲方管理 backend/internal/services/client_service.go
- [ ] T081 [US4] 更新ClientHandler支持甲方CRUD backend/internal/handlers/client_handler.go
- [ ] T082 [US4] 更新ProjectContactService支持项目联系人管理 backend/internal/services/project_contact_service.go
- [ ] T083 [US4] 实现项目联系人创建和更新逻辑 backend/internal/services/project_contact_service.go
- [ ] T084 [US4] 更新ProjectContactHandler支持联系人管理 backend/internal/handlers/project_contact_handler.go
- [ ] T085 [US4] 更新前端甲方选择组件 frontend/src/components/business/ClientSelector.tsx
- [ ] T086 [US4] 实现项目联系人表单组件 frontend/src/components/business/ProjectContactForm.tsx
- [ ] T087 [US4] 更新前端项目经营信息页面集成联系人管理 frontend/src/pages/ProjectBusiness.tsx

---

## Phase 7: User Story 5 - 配置经营参与人 (P1)

### Story Goal
项目管理员或经营负责人能够为项目配置经营参与人。

### Independent Test Criteria
- 项目管理员和经营负责人可以配置经营参与人
- 经营参与人配置保存成功
- 非授权用户无法配置经营参与人

### Implementation Tasks

- [ ] T088 [US5] 更新ProjectMember模型支持经营参与人角色 backend/internal/models/project_member.go
- [ ] T089 [US5] 更新ProjectMemberService支持经营参与人配置 backend/internal/services/project_member_service.go
- [ ] T090 [US5] 实现经营参与人权限验证 backend/internal/services/project_member_service.go
- [ ] T091 [US5] 更新ProjectMemberHandler支持经营参与人管理 backend/internal/handlers/project_member_handler.go
- [ ] T092 [US5] 更新前端项目成员管理组件 frontend/src/components/project/ProjectMemberManager.tsx
- [ ] T093 [US5] 实现经营参与人选择组件 frontend/src/components/business/BusinessPersonnelSelector.tsx

---

## Phase 8: User Story 6 - 招投标阶段管理 (P1)

### Story Goal
经营负责人能够管理项目的招投标阶段信息，包括上传招标文件、投标文件、中标通知书，以及记录专家费支付信息。

### Independent Test Criteria
- 经营负责人可以上传招投标文件
- 专家费支付信息可以记录
- 招投标信息可以查看

### Implementation Tasks

- [ ] T094 [US6] 创建BiddingInfo模型 backend/internal/models/bidding_info.go
- [ ] T095 [US6] 创建BiddingService backend/internal/services/bidding_service.go
- [ ] T096 [US6] 创建BiddingHandler backend/internal/handlers/bidding_handler.go
- [ ] T097 [US6] 实现招投标文件上传功能 backend/internal/handlers/bidding_handler.go
- [ ] T098 [US6] 实现专家费支付记录（使用FinancialRecord）backend/internal/services/bidding_service.go
- [ ] T099 [US6] 创建数据库迁移脚本添加bidding_info表 scripts/migrations/008_add_bidding_info.sql
- [ ] T100 [US6] 创建前端招投标管理组件 frontend/src/components/business/BiddingInfoManager.tsx
- [ ] T101 [US6] 实现招投标文件上传UI frontend/src/components/business/BiddingFileUpload.tsx
- [ ] T102 [US6] 实现专家费支付表单 frontend/src/components/business/ExpertFeeForm.tsx
- [ ] T103 [US6] 更新前端项目经营信息页面集成招投标管理 frontend/src/pages/ProjectBusiness.tsx

---

## Dependencies

### Story Completion Order

1. **Phase 1 (Setup)** → 必须首先完成
2. **Phase 2 (Foundational)** → 必须在所有用户故事之前完成
3. **Phase 3 (US1)** → 可以与其他P1故事并行
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

### Implementation Tasks

- [ ] T104 [US7] 更新Contract模型符合002规范（ID为UUID，文件通过File实体关联）backend/internal/models/contract.go
- [ ] T105 [US7] 更新ContractService支持合同创建和更新 backend/internal/services/contract_service.go
- [ ] T106 [US7] 实现合同金额验证（总金额=设计费+勘察费+咨询费）backend/internal/services/contract_service.go
- [ ] T107 [US7] 更新ContractHandler支持合同CRUD backend/internal/handlers/contract_handler.go
- [ ] T108 [US7] 实现合同文件上传功能 backend/internal/handlers/contract_handler.go
- [ ] T109 [US7] 更新前端合同表单组件 frontend/src/components/business/ContractForm.tsx
- [ ] T110 [US7] 实现合同金额明细录入（设计费、勘察费、咨询费）frontend/src/components/business/ContractForm.tsx
- [ ] T111 [US7] 实现合同文件上传UI frontend/src/components/business/ContractFileUpload.tsx
- [ ] T112 [US7] 更新前端项目经营信息页面集成合同管理 frontend/src/pages/ProjectBusiness.tsx

---

## Phase 10: User Story 8 - 补充协议管理 (P1)

### Story Goal
经营负责人能够为已签订的主合同添加补充协议，包括上传补充协议文件、记录签订时间、补充协议金额（按设计费、勘察费、咨询费分别录入）、合同费率等信息。

### Independent Test Criteria
- 经营负责人可以为合同添加补充协议
- 补充协议金额明细可以分别录入
- 补充协议关联到主合同并更新总应收金额

### Implementation Tasks

- [ ] T113 [US8] 更新ContractAmendment模型符合002规范 backend/internal/models/contract_amendment.go
- [ ] T114 [US8] 更新ContractAmendmentService支持补充协议管理 backend/internal/services/contract_amendment_service.go
- [ ] T115 [US8] 实现补充协议金额验证 backend/internal/services/contract_amendment_service.go
- [ ] T116 [US8] 实现补充协议关联主合同并更新统计 backend/internal/services/contract_amendment_service.go
- [ ] T117 [US8] 更新ContractAmendmentHandler支持补充协议CRUD backend/internal/handlers/contract_amendment_handler.go
- [ ] T118 [US8] 实现补充协议文件上传功能 backend/internal/handlers/contract_amendment_handler.go
- [ ] T119 [US8] 更新前端补充协议表单组件 frontend/src/components/business/ContractAmendmentForm.tsx
- [ ] T120 [US8] 实现补充协议列表显示 frontend/src/components/business/ContractAmendmentList.tsx
- [ ] T121 [US8] 更新前端合同详情页面集成补充协议管理 frontend/src/components/business/ContractDetail.tsx

---

## Phase 11: User Story 9 - 记录甲方支付 (P1)

### Story Goal
经营负责人能够记录甲方的支付信息，包括支付时间、支付金额等信息，用于跟踪项目的收款情况。

### Independent Test Criteria
- 经营负责人可以记录甲方支付信息
- 支付记录保存成功并更新已收金额统计
- 支付记录可以编辑和删除

### Implementation Tasks

- [ ] T122 [US9] 实现甲方支付记录创建（使用FinancialRecord，financial_type=client_payment）backend/internal/services/financial_service.go
- [ ] T123 [US9] 实现支付记录更新和删除逻辑 backend/internal/services/financial_service.go
- [ ] T124 [US9] 实现已收金额统计计算 backend/internal/services/financial_service.go
- [ ] T125 [US9] 更新FinancialHandler支持甲方支付记录 backend/internal/handlers/financial_handler.go
- [ ] T126 [US9] 创建前端甲方支付表单组件 frontend/src/components/business/ClientPaymentForm.tsx
- [ ] T127 [US9] 实现支付记录列表显示 frontend/src/components/business/ClientPaymentList.tsx
- [ ] T128 [US9] 更新前端项目经营信息页面集成支付记录管理 frontend/src/pages/ProjectBusiness.tsx

---

## Phase 12: User Story 10 - 记录我方开票 (P1)

### Story Goal
经营负责人能够记录我方向甲方的开票信息，包括开票时间、开票金额、上传发票文件等信息。

### Independent Test Criteria
- 经营负责人可以记录开票信息并上传发票文件
- 开票记录可以关联到对应的支付记录
- 开票记录可以编辑和更新

### Implementation Tasks

- [ ] T129 [US10] 实现我方开票记录创建（使用FinancialRecord，financial_type=our_invoice）backend/internal/services/financial_service.go
- [ ] T130 [US10] 实现开票记录关联支付记录逻辑 backend/internal/services/financial_service.go
- [ ] T131 [US10] 实现发票文件上传和关联 backend/internal/services/financial_service.go
- [ ] T132 [US10] 更新FinancialHandler支持我方开票记录 backend/internal/handlers/financial_handler.go
- [ ] T133 [US10] 创建前端我方开票表单组件 frontend/src/components/business/OurInvoiceForm.tsx
- [ ] T134 [US10] 实现发票文件上传UI frontend/src/components/business/InvoiceFileUpload.tsx
- [ ] T135 [US10] 实现开票记录列表显示 frontend/src/components/business/OurInvoiceList.tsx
- [ ] T136 [US10] 更新前端项目经营信息页面集成开票记录管理 frontend/src/pages/ProjectBusiness.tsx

---

## Phase 13: User Story 11 - 分配经营奖金 (P2)

### Story Goal
经营负责人能够为项目经营相关人员分配经营奖金，包括选择发放人员、录入发放金额、发放时间等信息。

### Independent Test Criteria
- 经营负责人可以选择发放人员并录入奖金信息
- 奖金记录保存成功并更新奖金统计
- 奖金记录可以编辑和删除

### Implementation Tasks

- [ ] T137 [US11] 实现经营奖金记录创建（使用FinancialRecord，financial_type=bonus，bonus_category=business）backend/internal/services/financial_service.go
- [ ] T138 [US11] 实现奖金发放人员关联（RecipientID）backend/internal/services/financial_service.go
- [ ] T139 [US11] 实现经营奖金统计计算 backend/internal/services/financial_service.go
- [ ] T140 [US11] 更新FinancialHandler支持经营奖金记录 backend/internal/handlers/financial_handler.go
- [ ] T141 [US11] 创建前端经营奖金表单组件 frontend/src/components/business/BusinessBonusForm.tsx
- [ ] T142 [US11] 实现发放人员选择组件 frontend/src/components/business/BonusRecipientSelector.tsx
- [ ] T143 [US11] 实现奖金记录列表显示 frontend/src/components/business/BusinessBonusList.tsx
- [ ] T144 [US11] 更新前端项目经营信息页面集成奖金管理 frontend/src/pages/ProjectBusiness.tsx

---

## Phase 14: User Story 12 - 查看经营信息统计 (P1)

### Story Goal
经营负责人能够查看项目的经营信息统计，包括总应收金额（合同金额）、已收金额（甲方支付）、未收金额（应收减去已收）等关键指标。

### Independent Test Criteria
- 经营信息统计准确计算并显示
- 统计数据实时更新
- 支持按时间段查看历史统计数据

### Implementation Tasks

- [ ] T145 [US12] 实现总应收金额计算（合同金额+补充协议金额）backend/internal/services/project_business_service.go
- [ ] T146 [US12] 实现已收金额计算（甲方支付汇总）backend/internal/services/project_business_service.go
- [ ] T147 [US12] 实现未收金额计算（总应收-已收）backend/internal/services/project_business_service.go
- [ ] T148 [US12] 实现经营信息统计接口 backend/internal/handlers/project_business_handler.go
- [ ] T149 [US12] 实现按时间段统计功能 backend/internal/services/project_business_service.go
- [ ] T150 [US12] 创建前端经营信息统计组件 frontend/src/components/business/BusinessStatistics.tsx
- [ ] T151 [US12] 实现统计数据可视化展示 frontend/src/components/business/BusinessStatistics.tsx
- [ ] T152 [US12] 实现统计报表导出功能 frontend/src/components/business/BusinessStatistics.tsx
- [ ] T153 [US12] 更新前端项目经营信息页面集成统计展示 frontend/src/pages/ProjectBusiness.tsx

---

## Phase 15: User Story 13 - 配置生产人员 (P2)

### Story Goal
项目管理员或生产负责人能够为项目配置生产人员，包括按专业维度配置设计人、参与人、复核人，以及配置审核人、审定人。

### Independent Test Criteria
- 项目管理员和生产负责人可以按专业配置生产人员
- 支持自定义专业并同步到专业字典
- 生产人员配置保存成功

### Implementation Tasks

- [ ] T154 [US13] 更新ProjectMember模型支持生产人员角色（designer, participant, reviewer, auditor, approver）backend/internal/models/project_member.go
- [ ] T155 [US13] 实现按专业维度配置生产人员逻辑 backend/internal/services/project_member_service.go
- [ ] T156 [US13] 实现专业关联验证（生产人员角色必须关联专业）backend/internal/services/project_member_service.go
- [ ] T157 [US13] 实现自定义专业创建并同步到专业字典 backend/internal/services/project_member_service.go
- [ ] T158 [US13] 更新ProjectMemberHandler支持生产人员配置 backend/internal/handlers/project_member_handler.go
- [ ] T159 [US13] 创建前端生产人员配置组件 frontend/src/components/production/ProductionPersonnelManager.tsx
- [ ] T160 [US13] 实现按专业维度的人员配置UI frontend/src/components/production/DisciplinePersonnelConfig.tsx
- [ ] T161 [US13] 实现审核人和审定人配置UI frontend/src/components/production/ReviewerConfig.tsx
- [ ] T162 [US13] 实现专业选择器（支持创建新专业）frontend/src/components/production/DisciplineSelector.tsx
- [ ] T163 [US13] 更新前端项目生产信息页面集成人员配置 frontend/src/pages/ProjectProduction.tsx

---

## Phase 16: User Story 14 - 批复审计阶段管理 (P2)

### Story Goal
生产负责人能够管理项目的批复和审计阶段信息，包括上传批复报告、审计报告，以及录入批复金额和审计金额（按设计费、勘察费、咨询费分别录入）。

### Independent Test Criteria
- 生产负责人可以上传批复审计报告
- 批复审计金额明细可以分别录入
- 批复审计金额默认引用合同金额，可手工调整

### Implementation Tasks

- [ ] T164 [US14] 更新ProductionApproval模型符合002规范 backend/internal/models/production_approval.go
- [ ] T165 [US14] 实现批复审计金额默认引用合同金额逻辑 backend/internal/services/production_approval_service.go
- [ ] T166 [US14] 实现批复审计金额手工调整和覆盖原因记录 backend/internal/services/production_approval_service.go
- [ ] T167 [US14] 更新ProductionApprovalService支持批复审计管理 backend/internal/services/production_approval_service.go
- [ ] T168 [US14] 更新ProductionApprovalHandler支持批复审计CRUD backend/internal/handlers/production_approval_handler.go
- [ ] T169 [US14] 实现批复审计报告文件上传功能 backend/internal/handlers/production_approval_handler.go
- [ ] T170 [US14] 创建前端批复审计表单组件 frontend/src/components/production/ApprovalForm.tsx
- [ ] T171 [US14] 实现批复审计金额明细录入（设计费、勘察费、咨询费）frontend/src/components/production/ApprovalForm.tsx
- [ ] T172 [US14] 实现引用合同金额功能 frontend/src/components/production/ApprovalForm.tsx
- [ ] T173 [US14] 实现批复审计报告上传UI frontend/src/components/production/ApprovalReportUpload.tsx
- [ ] T174 [US14] 更新前端项目生产信息页面集成批复审计管理 frontend/src/pages/ProjectProduction.tsx

---

## Phase 17: User Story 15 - 方案阶段文件管理 (P2)

### Story Goal
生产负责人能够上传方案阶段的文件，包括方案文件、校审单和评分，确保方案阶段的工作成果得到完整记录。

### Independent Test Criteria
- 生产负责人可以上传方案文件、校审单和评分
- 校审单和评分为必填项
- 文件上传成功并关联到项目

### Implementation Tasks

- [ ] T175 [US15] 更新ProductionFile模型支持Stage枚举（scheme阶段）backend/internal/models/production_file.go
- [ ] T176 [US15] 实现方案阶段文件上传逻辑（包含校审单和评分验证）backend/internal/services/production_file_service.go
- [ ] T177 [US15] 实现校审单和评分必填验证 backend/internal/services/production_file_service.go
- [ ] T178 [US15] 更新ProductionFileHandler支持方案阶段文件管理 backend/internal/handlers/production_file_handler.go
- [ ] T179 [US15] 创建前端方案阶段文件上传组件 frontend/src/components/production/SchemeFileUpload.tsx
- [ ] T180 [US15] 实现校审单上传UI frontend/src/components/production/ReviewSheetUpload.tsx
- [ ] T181 [US15] 实现评分录入组件 frontend/src/components/production/ScoreInput.tsx
- [ ] T182 [US15] 实现方案文件列表显示 frontend/src/components/production/SchemeFileList.tsx
- [ ] T183 [US15] 更新前端项目生产信息页面集成方案阶段文件管理 frontend/src/pages/ProjectProduction.tsx

---

## Phase 18: User Story 16 - 初步设计阶段文件管理 (P2)

### Story Goal
生产负责人能够上传初步设计阶段的文件，包括初步设计文件、校审单和评分，确保初步设计阶段的工作成果得到完整记录。

### Independent Test Criteria
- 生产负责人可以上传初步设计文件、校审单和评分
- 校审单和评分为必填项
- 文件上传成功并关联到项目

### Implementation Tasks

- [ ] T184 [US16] 实现初步设计阶段文件上传逻辑（包含校审单和评分验证）backend/internal/services/production_file_service.go
- [ ] T185 [US16] 更新ProductionFileHandler支持初步设计阶段文件管理 backend/internal/handlers/production_file_handler.go
- [ ] T186 [US16] 创建前端初步设计阶段文件上传组件 frontend/src/components/production/PreliminaryFileUpload.tsx
- [ ] T187 [US16] 实现初步设计文件列表显示 frontend/src/components/production/PreliminaryFileList.tsx
- [ ] T188 [US16] 更新前端项目生产信息页面集成初步设计阶段文件管理 frontend/src/pages/ProjectProduction.tsx

---

## Phase 19: User Story 17 - 施工图设计阶段文件管理 (P2)

### Story Goal
生产负责人能够上传施工图设计阶段的文件，包括施工图设计文件、校审单和评分，确保施工图设计阶段的工作成果得到完整记录。

### Independent Test Criteria
- 生产负责人可以上传施工图设计文件、校审单和评分
- 校审单和评分为必填项
- 文件上传成功并关联到项目

### Implementation Tasks

- [ ] T189 [US17] 实现施工图设计阶段文件上传逻辑（包含校审单和评分验证）backend/internal/services/production_file_service.go
- [ ] T190 [US17] 更新ProductionFileHandler支持施工图设计阶段文件管理 backend/internal/handlers/production_file_handler.go
- [ ] T191 [US17] 创建前端施工图设计阶段文件上传组件 frontend/src/components/production/ConstructionFileUpload.tsx
- [ ] T192 [US17] 实现施工图设计文件列表显示 frontend/src/components/production/ConstructionFileList.tsx
- [ ] T193 [US17] 更新前端项目生产信息页面集成施工图设计阶段文件管理 frontend/src/pages/ProjectProduction.tsx

---

## Phase 20: User Story 18 - 变更洽商文件管理 (P2)

### Story Goal
生产负责人能够上传变更洽商阶段的文件，记录项目执行过程中的变更和洽商信息。

### Independent Test Criteria
- 生产负责人可以上传变更洽商文件
- 文件上传成功并关联到项目
- 变更洽商文件可以查看和下载

### Implementation Tasks

- [ ] T194 [US18] 实现变更洽商阶段文件上传逻辑 backend/internal/services/production_file_service.go
- [ ] T195 [US18] 更新ProductionFileHandler支持变更洽商阶段文件管理 backend/internal/handlers/production_file_handler.go
- [ ] T196 [US18] 创建前端变更洽商阶段文件上传组件 frontend/src/components/production/ChangeFileUpload.tsx
- [ ] T197 [US18] 实现变更洽商文件列表显示 frontend/src/components/production/ChangeFileList.tsx
- [ ] T198 [US18] 更新前端项目生产信息页面集成变更洽商文件管理 frontend/src/pages/ProjectProduction.tsx

---

## Phase 21: User Story 19 - 竣工验收文件管理 (P2)

### Story Goal
生产负责人能够上传竣工验收阶段的文件，记录项目的竣工验收信息。

### Independent Test Criteria
- 生产负责人可以上传竣工验收文件
- 文件上传成功并关联到项目
- 竣工验收文件可以查看和下载

### Implementation Tasks

- [ ] T199 [US19] 实现竣工验收阶段文件上传逻辑 backend/internal/services/production_file_service.go
- [ ] T200 [US19] 更新ProductionFileHandler支持竣工验收阶段文件管理 backend/internal/handlers/production_file_handler.go
- [ ] T201 [US19] 创建前端竣工验收阶段文件上传组件 frontend/src/components/production/CompletionFileUpload.tsx
- [ ] T202 [US19] 实现竣工验收文件列表显示 frontend/src/components/production/CompletionFileList.tsx
- [ ] T203 [US19] 更新前端项目生产信息页面集成竣工验收文件管理 frontend/src/pages/ProjectProduction.tsx

---

## Phase 22: User Story 20 - 记录生产成本 (P2)

### Story Goal
生产负责人能够记录项目的生产成本信息，包括打车（时间、里程、金额）、住宿（时间、金额）、公共交通（时间、金额）等，并上传相关发票。

### Independent Test Criteria
- 生产负责人可以记录不同类型的生产成本
- 成本记录保存成功并更新成本统计
- 发票文件可以上传和关联

### Implementation Tasks

- [ ] T204 [US20] 实现生产成本记录创建（使用FinancialRecord，financial_type=cost）backend/internal/services/financial_service.go
- [ ] T205 [US20] 实现成本类别区分（打车、住宿、公共交通）backend/internal/services/financial_service.go
- [ ] T206 [US20] 实现打车成本记录（包含里程字段）backend/internal/services/financial_service.go
- [ ] T207 [US20] 实现成本发票文件上传和关联 backend/internal/services/financial_service.go
- [ ] T208 [US20] 实现生产成本统计计算 backend/internal/services/financial_service.go
- [ ] T209 [US20] 更新FinancialHandler支持生产成本记录 backend/internal/handlers/financial_handler.go
- [ ] T210 [US20] 创建前端生产成本表单组件 frontend/src/components/production/ProductionCostForm.tsx
- [ ] T211 [US20] 实现成本类型选择（打车、住宿、公共交通）frontend/src/components/production/ProductionCostForm.tsx
- [ ] T212 [US20] 实现打车成本表单（时间、里程、金额）frontend/src/components/production/TaxiCostForm.tsx
- [ ] T213 [US20] 实现住宿和公共交通成本表单 frontend/src/components/production/AccommodationCostForm.tsx
- [ ] T214 [US20] 实现成本发票上传UI frontend/src/components/production/CostInvoiceUpload.tsx
- [ ] T215 [US20] 实现生产成本列表显示 frontend/src/components/production/ProductionCostList.tsx
- [ ] T216 [US20] 实现成本统计展示 frontend/src/components/production/ProductionCostStatistics.tsx
- [ ] T217 [US20] 更新前端项目生产信息页面集成成本管理 frontend/src/pages/ProjectProduction.tsx

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
生产负责人能够管理项目的对外委托及支付信息，包括记录委托类型（个人或单位）、对委托方的评分、委托合同、给委托方支付（金额、时间、索要发票）等信息。

### Independent Test Criteria
- 生产负责人可以创建对外委托记录
- 委托支付信息通过FinancialRecord管理
- 委托信息保存成功并更新成本统计

### Implementation Tasks

- [ ] T218 [US21] 更新ExternalCommission模型符合002规范（ID为UUID，支付信息通过FinancialRecord关联）backend/internal/models/external_commission.go
- [ ] T219 [US21] 更新ExternalCommissionService支持对外委托管理 backend/internal/services/external_commission_service.go
- [ ] T220 [US21] 实现委托支付记录创建（使用FinancialRecord，financial_type=commission_payment）backend/internal/services/external_commission_service.go
- [ ] T221 [US21] 实现对方开票记录创建（使用FinancialRecord，financial_type=vendor_invoice）backend/internal/services/external_commission_service.go
- [ ] T222 [US21] 实现委托支付和开票关联逻辑 backend/internal/services/external_commission_service.go
- [ ] T223 [US21] 更新ExternalCommissionHandler支持对外委托CRUD backend/internal/handlers/external_commission_handler.go
- [ ] T224 [US21] 实现委托合同文件上传功能 backend/internal/handlers/external_commission_handler.go
- [ ] T225 [US21] 创建前端对外委托表单组件 frontend/src/components/production/ExternalCommissionForm.tsx
- [ ] T226 [US21] 实现委托类型选择（个人/单位）frontend/src/components/production/ExternalCommissionForm.tsx
- [ ] T227 [US21] 实现委托方评分录入组件 frontend/src/components/production/VendorScoreInput.tsx
- [ ] T228 [US21] 实现委托支付和开票记录管理 frontend/src/components/production/CommissionPaymentManager.tsx
- [ ] T229 [US21] 实现委托合同文件上传UI frontend/src/components/production/CommissionContractUpload.tsx
- [ ] T230 [US21] 实现对外委托列表显示 frontend/src/components/production/ExternalCommissionList.tsx
- [ ] T231 [US21] 更新前端项目生产信息页面集成对外委托管理 frontend/src/pages/ProjectProduction.tsx

---

## Phase 24: User Story 22 - 分配生产奖金 (P2)

### Story Goal
生产负责人能够为项目生产相关人员分配生产奖金，包括选择发放人员、录入发放金额、发放时间等信息。

### Independent Test Criteria
- 生产负责人可以选择发放人员并录入奖金信息
- 奖金记录保存成功并更新奖金统计
- 奖金记录可以编辑和删除

### Implementation Tasks

- [ ] T232 [US22] 实现生产奖金记录创建（使用FinancialRecord，financial_type=bonus，bonus_category=production）backend/internal/services/financial_service.go
- [ ] T233 [US22] 实现奖金发放人员关联（RecipientID）backend/internal/services/financial_service.go
- [ ] T234 [US22] 实现生产奖金统计计算 backend/internal/services/financial_service.go
- [ ] T235 [US22] 更新FinancialHandler支持生产奖金记录 backend/internal/handlers/financial_handler.go
- [ ] T236 [US22] 创建前端生产奖金表单组件 frontend/src/components/production/ProductionBonusForm.tsx
- [ ] T237 [US22] 实现发放人员选择组件（从项目生产人员中选择）frontend/src/components/production/ProductionBonusRecipientSelector.tsx
- [ ] T238 [US22] 实现奖金记录列表显示 frontend/src/components/production/ProductionBonusList.tsx
- [ ] T239 [US22] 更新前端项目生产信息页面集成生产奖金管理 frontend/src/pages/ProjectProduction.tsx

---

## Phase 25: User Story 23 - 公司收入管理 (P3)

### Story Goal
财务人员能够管理公司的收入信息，包括设置管理费比例、查看信息汇总（总应收金额、所有发票信息、所有支付信息、未收金额）。需要权限隔离，配置了才能查看公司收入。

### Independent Test Criteria
- 财务人员可以设置管理费比例
- 财务人员可以查看公司收入统计
- 非财务人员无法访问公司收入信息

### Implementation Tasks

- [ ] T240 [US23] 更新CompanyConfig模型符合002规范（ID为UUID）backend/internal/models/company_config.go
- [ ] T241 [US23] 更新CompanyConfigService支持管理费比例设置 backend/internal/services/company_config_service.go
- [ ] T242 [US23] 实现公司收入统计计算（聚合所有项目数据）backend/internal/services/financial_service.go
- [ ] T243 [US23] 实现总应收金额统计（所有项目的合同+补充协议）backend/internal/services/financial_service.go
- [ ] T244 [US23] 实现所有发票信息汇总 backend/internal/services/financial_service.go
- [ ] T245 [US23] 实现所有支付信息汇总 backend/internal/services/financial_service.go
- [ ] T246 [US23] 实现未收金额统计（总应收-已收）backend/internal/services/financial_service.go
- [ ] T247 [US23] 实现财务人员权限验证中间件 backend/internal/middleware/auth.go
- [ ] T248 [US23] 更新CompanyConfigHandler支持管理费设置 backend/internal/handlers/company_config_handler.go
- [ ] T249 [US23] 更新FinancialHandler支持公司收入统计查询 backend/internal/handlers/financial_handler.go
- [ ] T250 [US23] 创建前端管理费设置组件 frontend/src/components/financial/ManagementFeeSetting.tsx
- [ ] T251 [US23] 创建前端公司收入统计组件 frontend/src/components/financial/CompanyRevenueStatistics.tsx
- [ ] T252 [US23] 实现总应收金额展示（按设计费、勘察费、咨询费分类）frontend/src/components/financial/CompanyRevenueStatistics.tsx
- [ ] T253 [US23] 实现发票信息列表展示 frontend/src/components/financial/InvoiceSummary.tsx
- [ ] T254 [US23] 实现支付信息列表展示 frontend/src/components/financial/PaymentSummary.tsx
- [ ] T255 [US23] 实现未收金额统计展示 frontend/src/components/financial/UnpaidAmountSummary.tsx
- [ ] T256 [US23] 实现权限控制（非财务人员无法访问）frontend/src/pages/CompanyRevenue.tsx
- [ ] T257 [US23] 更新前端公司收入管理页面 frontend/src/pages/CompanyRevenue.tsx

---

## Phase 26: User Story 24 - 文件管理 (P2)

### Story Goal
用户能够上传、存储、搜索和下载所有项目活动中产生的文件和发票，包括合同文件、生产文件、发票文件等。

### Independent Test Criteria
- 用户可以上传文件并指定文件类型和关联项目
- 用户可以按项目、文件类型、上传时间搜索文件
- 用户可以下载文件（权限验证）

### Implementation Tasks

- [ ] T258 [US24] 更新File模型符合002规范（ID为UUID，支持文件类型分类）backend/internal/models/file.go
- [ ] T259 [US24] 更新FileService支持文件上传、下载、搜索 backend/internal/services/file_service.go
- [ ] T260 [US24] 实现文件类型验证（仅限制危险文件类型）backend/internal/services/file_service.go
- [ ] T261 [US24] 实现文件大小验证（最大100MB）backend/internal/services/file_service.go
- [ ] T262 [US24] 实现文件搜索功能（按项目、文件类型、上传时间）backend/internal/services/file_service.go
- [ ] T263 [US24] 实现文件权限验证（用户只能访问有权限的项目文件）backend/internal/services/file_service.go
- [ ] T264 [US24] 创建FileHandler支持文件管理接口 backend/internal/handlers/file_handler.go
- [ ] T265 [US24] 实现文件上传接口 backend/internal/handlers/file_handler.go
- [ ] T266 [US24] 实现文件下载接口（带权限验证）backend/internal/handlers/file_handler.go
- [ ] T267 [US24] 实现文件搜索接口 backend/internal/handlers/file_handler.go
- [ ] T268 [US24] 实现文件删除接口（软删除）backend/internal/handlers/file_handler.go
- [ ] T269 [US24] 创建前端文件上传组件 frontend/src/components/file/FileUpload.tsx
- [ ] T270 [US24] 创建前端文件搜索组件 frontend/src/components/file/FileSearch.tsx
- [ ] T271 [US24] 实现文件类型选择器 frontend/src/components/file/FileTypeSelector.tsx
- [ ] T272 [US24] 实现文件列表展示组件 frontend/src/components/file/FileList.tsx
- [ ] T273 [US24] 实现文件下载功能 frontend/src/components/file/FileDownload.tsx
- [ ] T274 [US24] 实现文件搜索筛选（项目、文件类型、上传时间）frontend/src/components/file/FileSearch.tsx
- [ ] T275 [US24] 创建前端文件管理页面 frontend/src/pages/FileManagement.tsx
- [ ] T276 [US24] 更新前端路由集成文件管理页面 frontend/src/App.tsx

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

- [ ] T277 实现项目编号重复验证和错误提示 backend/internal/services/project_service.go
- [ ] T278 实现项目软删除功能 backend/internal/services/project_service.go
- [ ] T279 实现项目恢复功能（仅admin）backend/internal/services/project_service.go
- [ ] T280 实现并发编辑冲突提示 backend/internal/handlers/project_handler.go
- [ ] T281 实现文件大小超限错误提示 frontend/src/components/file/FileUpload.tsx
- [ ] T282 实现危险文件类型拦截和错误提示 frontend/src/components/file/FileUpload.tsx
- [ ] T283 实现文件上传失败重试机制 frontend/src/components/file/FileUpload.tsx
- [ ] T284 实现文件下载权限验证失败提示 frontend/src/components/file/FileDownload.tsx
- [ ] T285 实现文件搜索无结果提示 frontend/src/components/file/FileSearch.tsx
- [ ] T286 实现财务数据计算异常处理和回滚 backend/internal/services/financial_service.go
- [ ] T287 实现统计数据实时更新机制 backend/internal/services/project_business_service.go
- [ ] T288 实现数据导出功能（经营统计、公司收入）backend/internal/handlers/financial_handler.go
- [ ] T289 优化数据库查询性能（添加必要索引）scripts/migrations/009_add_performance_indexes.sql
- [ ] T290 实现缓存机制（统计数据缓存）backend/internal/services/cache_service.go
- [ ] T291 完善错误日志记录 backend/internal/middleware/logging.go
- [ ] T292 实现系统健康检查接口 backend/internal/handlers/health_handler.go
- [ ] T293 完善API文档（OpenAPI规范）specs/002-project-management-oa/contracts/openapi.yaml
- [ ] T294 实现前端错误边界组件 frontend/src/components/common/ErrorBoundary.tsx
- [ ] T295 实现前端加载状态组件 frontend/src/components/common/LoadingSpinner.tsx
- [ ] T296 实现前端空状态组件 frontend/src/components/common/EmptyState.tsx
- [ ] T297 优化前端路由和导航体验 frontend/src/App.tsx
- [ ] T298 实现前端国际化支持（中文/英文）frontend/src/i18n/
- [ ] T299 完善单元测试覆盖 backend/tests/unit/
- [ ] T300 完善集成测试覆盖 backend/tests/integration/
- [ ] T301 完善前端组件测试 frontend/tests/components/
- [ ] T302 实现E2E测试场景 frontend/tests/e2e/

---

## Final Dependencies

### Story Completion Order (Final)

1. **Phase 1 (Setup)** → 必须首先完成
2. **Phase 2 (Foundational)** → 必须在所有用户故事之前完成
3. **Phase 3-8 (US1-US6)** → P1优先级，基础功能
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

**Final Phase内部并行**:
- T277-T285 (边界情况处理) 可以并行
- T286-T292 (后端优化) 可以并行
- T293-T298 (前端优化) 可以并行
- T299-T302 (测试) 可以并行

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

**任务进度**: 302/302 (100%) ✅

**任务统计**:
- Phase 1-2: 59个任务（Setup和Foundational改造）
- Phase 3-8: 44个任务（US1-US6）
- Phase 9-14: 50个任务（US7-US12）
- Phase 15-22: 64个任务（US13-US20）
- Phase 23-24: 22个任务（US21-US22）
- Phase 25: 18个任务（US23）
- Phase 26: 19个任务（US24）
- Final Phase: 26个任务（完善和优化）

**总计**: 302个任务

