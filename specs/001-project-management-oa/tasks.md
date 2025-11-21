# Tasks: 项目管理OA系统

**Input**: Design documents from `/specs/001-project-management-oa/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: 基于TDD原则，所有任务都包含测试先行

**Organization**: 任务按用户故事分组，支持独立实现和测试

## Format: `[ID] [P?] [Story] Description`
- **[P]**: 可以并行执行（不同文件，无依赖关系）
- **[Story]**: 任务所属的用户故事（如US1, US2, US3）
- 描述中包含确切的文件路径

## Path Conventions
- **Web应用**: `backend/`, `frontend/`
- 基于plan.md中的项目结构

## Phase 1: Setup (项目初始化)

**Purpose**: 项目初始化和基础结构搭建

- [x] T001 Create project structure per implementation plan
- [x] T002 Initialize Go backend project with Gin dependencies in backend/
- [x] T003 [P] Initialize React frontend project with TypeScript in frontend/
- [x] T004 [P] Setup Docker and Docker Compose configuration
- [x] T005 [P] Configure linting and formatting tools for both frontend and backend
- [x] T006 [P] Setup Git hooks and pre-commit configuration

---

## Phase 2: Foundational (核心基础设施)

**Purpose**: 核心基础设施，所有用户故事实现前必须完成

**⚠️ CRITICAL**: 任何用户故事工作开始前必须完成此阶段

- [x] T007 Setup PostgreSQL database schema and migrations framework in backend/pkg/database/
- [x] T008 [P] Setup MinIO file storage configuration in backend/pkg/storage/
- [x] T008a [P] Create File model in backend/internal/models/file.go (foundation layer for file management)
- [x] T008b [P] Implement FileService (foundation layer) in backend/internal/services/file_service.go (depends on T008, T008a)
- [x] T009 [P] Implement JWT authentication middleware in backend/internal/middleware/auth.go
- [x] T010 [P] Setup CORS and logging middleware in backend/internal/middleware/
- [x] T011 [P] Create base configuration management in backend/internal/config/config.go
- [x] T012 [P] Setup API routing structure in backend/internal/handlers/
- [x] T013 [P] Configure error handling and logging infrastructure
- [x] T014 [P] Setup environment configuration management (.env files)
- [x] T015 [P] Create base database connection and GORM setup in backend/pkg/database/
- [x] T016 [P] Setup React Query and API client in frontend/src/services/api.ts

**Checkpoint**: 基础设施就绪 - 用户故事实现现在可以并行开始

---

## Phase 3: User Story 1 - 项目信息录入与管理 (Priority: P1) 🎯 MVP

**Goal**: 项目经理能够录入和管理项目的基本信息，包括项目名称、承接日期、项目概况、出图单位、项目编号等核心信息

**Independent Test**: 可以通过创建新项目并验证所有基本信息字段的录入、编辑、保存功能来独立测试，确保数据完整性和用户界面友好性

### Tests for User Story 1

**NOTE: 先编写这些测试，确保它们在实现前失败**

- [ ] T017 [P] [US1] Contract test for user authentication endpoints in backend/tests/contract/test_auth.go
- [ ] T018 [P] [US1] Contract test for project CRUD endpoints in backend/tests/contract/test_projects.go
- [ ] T019 [P] [US1] Contract test for client CRUD endpoints in backend/tests/contract/test_clients.go
- [ ] T020 [P] [US1] Integration test for project creation flow in backend/tests/integration/test_project_creation.go
- [ ] T021 [P] [US1] Frontend component test for ProjectForm in frontend/tests/components/ProjectForm.test.tsx
- [ ] T022 [P] [US1] Frontend page test for ProjectList in frontend/tests/pages/ProjectList.test.tsx
- [ ] T023 [P] [US1] E2E test for complete project management flow in frontend/tests/e2e/project-management.spec.ts

### Implementation for User Story 1

- [x] T024 [P] [US1] Create User model in backend/internal/models/user.go
- [x] T025 [P] [US1] Create Project model in backend/internal/models/project.go
- [x] T026 [P] [US1] Create Client model in backend/internal/models/client.go
- [x] T027 [US1] Implement AuthService in backend/internal/services/auth_service.go (depends on T024)
- [x] T028 [US1] Implement ProjectService in backend/internal/services/project_service.go (depends on T025, T026)
- [x] T029 [US1] Implement ClientService in backend/internal/services/client_service.go (depends on T026)
- [x] T029a [US1] Add client name uniqueness validation in backend/internal/services/client_service.go (depends on T029)
- [x] T029b [US1] Add database migration to create unique index on client_name in backend/migrations/ (depends on T026)
- [x] T029c [US1] Implement client deletion protection logic (check project associations) in backend/internal/services/client_service.go (depends on T029)
- [x] T030 [US1] Implement AuthHandler in backend/internal/handlers/auth_handler.go (depends on T027)
- [x] T031 [US1] Implement ProjectHandler in backend/internal/handlers/project_handler.go (depends on T028)
- [x] T032 [US1] Implement ClientHandler in backend/internal/handlers/client_handler.go (depends on T029)
- [x] T032a [US1] Add 409 Conflict response for duplicate client name in backend/internal/handlers/client_handler.go (depends on T029a, T032)
- [x] T033 [US1] Add validation and error handling for all endpoints
- [x] T033a [US1] Update backend validation to make only project_name and project_number required in backend/internal/services/project_service.go (depends on T028)
- [x] T034 [US1] Add logging for user story 1 operations
- [x] T035 [P] [US1] Create TypeScript types in frontend/src/types/index.ts
- [x] T036 [P] [US1] Create API service functions in frontend/src/services/project.ts
- [x] T037 [P] [US1] Create API service functions in frontend/src/services/auth.ts
- [x] T038 [US1] Create ProjectForm component in frontend/src/components/project/ProjectForm.tsx (depends on T035, T036)
- [x] T038a [US1] Update ProjectForm field validation rules to make only project_name and project_number required in frontend/src/components/project/ProjectForm.tsx (depends on T038)
- [x] T038b [US1] Remove client_id field from ProjectForm (client info now managed in business information module) in frontend/src/components/project/ProjectForm.tsx (depends on T038)
- [x] T039 [US1] Create ProjectList component in frontend/src/components/project/ProjectList.tsx (depends on T035, T036)
- [x] T040 [US1] Create ProjectDetail component in frontend/src/components/project/ProjectDetail.tsx (depends on T035, T036)
- [x] T041 [US1] Create ClientForm component in frontend/src/components/client/ClientForm.tsx (depends on T035, T036)
- [x] T041a [US1] Add client name uniqueness validation and error handling in frontend/src/components/client/ClientForm.tsx (depends on T041)
- [x] T042 [US1] Create ProjectList page in frontend/src/pages/ProjectList.tsx (depends on T039)
- [x] T042a [US1] Integrate ProjectForm modal in ProjectList page for creating new projects in frontend/src/pages/ProjectList.tsx (depends on T038, T042)
- [x] T042b [US1] Integrate ProjectForm modal in ProjectList page for editing existing projects in frontend/src/pages/ProjectList.tsx (depends on T038, T042)
- [x] T042c [US1] Implement view project functionality with navigation to ProjectDetail page in frontend/src/pages/ProjectList.tsx (depends on T043)
- [x] T042d [US1] Implement delete project functionality with confirmation dialog in frontend/src/pages/ProjectList.tsx (depends on T036)
- [x] T042e [US1] Wire up all action buttons (create, edit, view, delete) in ProjectList page in frontend/src/pages/ProjectList.tsx (depends on T042a, T042b, T042c, T042d)
- [x] T043 [US1] Create ProjectDetail page in frontend/src/pages/ProjectDetail.tsx (depends on T040)
- [x] T043a [US1] Integrate ProjectForm for editing project in ProjectDetail page in frontend/src/pages/ProjectDetail.tsx (depends on T038, T043)
- [x] T044 [US1] Setup routing for project management pages in frontend/src/App.tsx
- [x] T044a [US1] Create Login page for user authentication in frontend/src/pages/Login.tsx
- [x] T044b [US1] Implement route protection and authentication check in frontend/src/App.tsx
- [x] T044c [US1] Implement logout functionality with logout button in Header component in frontend/src/App.tsx (depends on T044b)
- [x] T044d [US1] Ensure logout button is visible and properly styled in all protected pages using Ant Design Layout in frontend/src/App.tsx (depends on T044c)

**Checkpoint**: 此时，用户故事1应该完全功能化并可独立测试

---

## Phase 4: User Story 2 - 项目经营信息管理 (Priority: P1)

**Goal**: 经营人员能够管理项目的经营相关信息，包括甲方信息、联系人、招投标信息、合同信息、支付信息和奖金分配。**注意：甲方信息统一在项目经营信息中管理，不在项目创建时填写**

**Independent Test**: 可以通过为现有项目添加甲方信息、上传合同文件、记录支付信息来独立测试，验证经营数据的完整管理流程

### Tests for User Story 2

- [ ] T045 [P] [US2] Contract test for project business information endpoints in backend/tests/contract/test_project_business.go
- [ ] T046 [P] [US2] Contract test for contract endpoints in backend/tests/contract/test_contracts.go
- [ ] T047 [P] [US2] Integration test for project business information management flow in backend/tests/integration/test_business_management.go
- [ ] T048 [P] [US2] Integration test for contract management flow in backend/tests/integration/test_contract_management.go
- [ ] T049 [P] [US2] Frontend component test for ProjectBusinessForm in frontend/tests/components/ProjectBusinessForm.test.tsx
- [ ] T050 [P] [US2] Frontend component test for ContractForm in frontend/tests/components/ContractForm.test.tsx
- [ ] T051 [P] [US2] E2E test for project business information management flow in frontend/tests/e2e/business-management.spec.ts
- [ ] T052 [P] [US2] E2E test for contract management flow in frontend/tests/e2e/contract-management.spec.ts

### Implementation for User Story 2

- [X] T053 [P] [US2] Create Contract model with fee breakdown fields (design_fee, survey_fee, consultation_fee) in backend/internal/models/contract.go
- [X] T053a [P] [US2] Create ContractAmendment model in backend/internal/models/contract_amendment.go
- [X] T053b [P] [US2] Create ExpertFeePayment model in backend/internal/models/expert_fee_payment.go
- [X] T053c [US2] Update ProjectMember model to support multi-role (add business_manager and business_personnel roles) in backend/internal/models/project_member.go (depends on T061)
- [X] T053d [US2] Update ProjectMember validation to allow multiple roles per user per project in backend/internal/models/project_member.go (depends on T053c)
- [X] T054 [US2] Implement ProjectBusinessService in backend/internal/services/project_business_service.go (depends on T025, T026, T053)
- [X] T054a [US2] Add client association management (select, create, change, remove) in backend/internal/services/project_business_service.go (depends on T054)
- [X] T054b [US2] Add client name uniqueness validation when creating new client in business info in backend/internal/services/project_business_service.go (depends on T054)
- [X] T054c [US2] Add business manager and business personnel management through ProjectMember system in backend/internal/services/project_business_service.go (depends on T053c, T054)
- [X] T055 [US2] Implement ContractService with fee breakdown validation in backend/internal/services/contract_service.go (depends on T053)
- [X] T055a [US2] Implement ContractAmendmentService in backend/internal/services/contract_amendment_service.go (depends on T053a)
- [X] T055b [US2] Implement ExpertFeePaymentService in backend/internal/services/expert_fee_payment_service.go (depends on T053b)
- [X] T056 [US2] Implement ProjectBusinessHandler in backend/internal/handlers/project_business_handler.go (depends on T054)
- [X] T057 [US2] Implement ContractHandler in backend/internal/handlers/contract_handler.go (depends on T055)
- [X] T057a [US2] Implement ContractAmendmentHandler in backend/internal/handlers/contract_amendment_handler.go (depends on T055a)
- [X] T057b [US2] Implement ExpertFeePaymentHandler in backend/internal/handlers/expert_fee_payment_handler.go (depends on T055b)
- [X] T058 [US2] Add GET /projects/{id}/business endpoint in backend/internal/handlers/project_business_handler.go (depends on T056)
- [X] T059 [US2] Add PUT /projects/{id}/business endpoint in backend/internal/handlers/project_business_handler.go (depends on T056)
- [X] T059a [US2] Add GET /projects/{id}/expert-fee-payments endpoint in backend/internal/handlers/expert_fee_payment_handler.go (depends on T057b)
- [X] T059b [US2] Add POST /projects/{id}/expert-fee-payments endpoint in backend/internal/handlers/expert_fee_payment_handler.go (depends on T057b)
- [X] T059c [US2] Add GET /projects/{id}/contracts endpoint in backend/internal/handlers/contract_handler.go (depends on T057)
- [X] T059d [US2] Add POST /projects/{id}/contracts endpoint in backend/internal/handlers/contract_handler.go (depends on T057)
- [X] T059e [US2] Add GET /contracts/{id}/amendments endpoint in backend/internal/handlers/contract_amendment_handler.go (depends on T057a)
- [X] T059f [US2] Add POST /contracts/{id}/amendments endpoint in backend/internal/handlers/contract_amendment_handler.go (depends on T057a)
- [X] T059g [US2] Add PUT /contracts/{id} endpoint in backend/internal/handlers/contract_handler.go (depends on T057)
- [X] T059h [US2] Add PUT /expert-fee-payments/{id} endpoint in backend/internal/handlers/expert_fee_payment_handler.go (depends on T057b)
- [X] T060 [US2] Add contract validation and business rules (contract_amount = design_fee + survey_fee + consultation_fee) in backend/internal/services/contract_service.go (depends on T055)
- [X] T061 [P] [US2] Create ProjectBusinessForm component in frontend/src/components/project/ProjectBusinessForm.tsx
- [X] T061a [US2] Add client selection dropdown with "Create New Client" option in ProjectBusinessForm in frontend/src/components/project/ProjectBusinessForm.tsx (depends on T061)
- [X] T061b [US2] Implement client selection, creation, change, and removal in ProjectBusinessForm in frontend/src/components/project/ProjectBusinessForm.tsx (depends on T061, T041)
- [X] T061c [US2] Add real-time search and filtering for client dropdown in ProjectBusinessForm in frontend/src/components/project/ProjectBusinessForm.tsx (depends on T061)
- [X] T061d [US2] Implement client list error handling with retry in ProjectBusinessForm in frontend/src/components/project/ProjectBusinessForm.tsx (depends on T061)
- [X] T061e [US2] Add empty state display for client dropdown in ProjectBusinessForm in frontend/src/components/project/ProjectBusinessForm.tsx (depends on T061)
- [X] T061f [US2] Configure client list to load all clients (max 100) sorted by created_at DESC in ProjectBusinessForm in frontend/src/components/project/ProjectBusinessForm.tsx (depends on T061)
- [X] T062 [P] [US2] Create ContractForm component with fee breakdown fields (design_fee, survey_fee, consultation_fee) in frontend/src/components/contract/ContractForm.tsx
- [X] T062a [P] [US2] Create ContractAmendmentForm component in frontend/src/components/contract/ContractAmendmentForm.tsx
- [X] T062b [P] [US2] Create ExpertFeePaymentForm component in frontend/src/components/project/ExpertFeePaymentForm.tsx
- [X] T062d [US2] Implement contract edit functionality in ContractForm (load existing data and update) in frontend/src/components/contract/ContractForm.tsx (depends on T062, T059g)
- [X] T062e [US2] Implement expert fee payment edit functionality in ExpertFeePaymentForm (load existing data and update) in frontend/src/components/project/ExpertFeePaymentForm.tsx (depends on T062b, T059h)
- [ ] T062c [US2] Update ProjectMemberForm to support multi-role selection (including business_manager and business_personnel) in frontend/src/components/project/ProjectMemberForm.tsx (depends on T065)
- [X] T063 [US2] Create ContractList component in frontend/src/components/contract/ContractList.tsx (depends on T062)
- [X] T063a [US2] Create ContractAmendmentList component in frontend/src/components/contract/ContractAmendmentList.tsx (depends on T062a)
- [X] T063b [US2] Create ExpertFeePaymentList component in frontend/src/components/project/ExpertFeePaymentList.tsx (depends on T062b)
- [X] T064 [US2] Create ProjectBusiness page in frontend/src/pages/ProjectBusiness.tsx (depends on T061)
- [X] T064a [US2] Add business manager and business personnel configuration section in ProjectBusinessForm in frontend/src/components/project/ProjectBusinessForm.tsx (depends on T062c, T064)
- [X] T065 [US2] Integrate ProjectBusinessForm with project detail page in frontend/src/pages/ProjectDetail.tsx (depends on T064)
- [X] T066 [US2] Integrate contract management with project business page in frontend/src/pages/ProjectBusiness.tsx (depends on T063, T064)
- [X] T066a [US2] Integrate contract amendment management with contract detail view in frontend/src/components/contract/ContractDetail.tsx (depends on T063a, T066)
- [X] T066b [US2] Integrate expert fee payment management with project business page in frontend/src/pages/ProjectBusiness.tsx (depends on T063b, T064)
- [X] T067 [US2] Add contract statistics and reporting features in frontend/src/components/contract/ContractStatistics.tsx
- [X] T067a [P] [US2] Add contract file upload endpoint using file_service in backend/internal/handlers/contract_handler.go (depends on T008b, T057)
- [X] T067b [P] [US2] Add contract file download endpoint using file_service in backend/internal/handlers/contract_handler.go (depends on T008b, T057)
- [X] T067c [P] [US2] Add contract file search endpoint using file_service in backend/internal/handlers/contract_handler.go (depends on T008b, T057)
- [X] T067d [US2] Create ContractFileUpload component using file_service in frontend/src/components/contract/ContractFileUpload.tsx (depends on T067a)
- [X] T067e [US2] Create ContractFileList component with search and filter in frontend/src/components/contract/ContractFileList.tsx (depends on T067c)
- [X] T067f [US2] Integrate contract file management with contract detail view in frontend/src/components/contract/ContractDetail.tsx (depends on T067d, T067e)

**Checkpoint**: 此时，用户故事1和2都应该独立工作

---

## Phase 5: User Story 3 - 项目生产信息管理 (Priority: P2)

**Goal**: 项目负责人能够管理项目的生产相关信息，包括人员配置、批复审计、生产文件、成本信息和对外委托

**Independent Test**: 可以通过为项目配置人员、上传生产文件、记录成本信息来独立测试，验证生产管理的完整工作流程

### Tests for User Story 3

- [ ] T068 [P] [US3] Contract test for project member endpoints in backend/tests/contract/test_project_members.go
- [ ] T069 [P] [US3] Integration test for project member management flow in backend/tests/integration/test_member_management.go
- [ ] T070 [P] [US3] Frontend component test for ProjectMemberForm in frontend/tests/components/ProjectMemberForm.test.tsx
- [ ] T071 [P] [US3] E2E test for project member management flow in frontend/tests/e2e/member-management.spec.ts

### Implementation for User Story 3

- [ ] T072 [P] [US3] Create ProjectMember model in backend/internal/models/project_member.go (Note: business_manager and business_personnel roles added in US2)
- [ ] T073 [US3] Implement ProjectMemberService with multi-role support in backend/internal/services/project_member_service.go (depends on T072)
- [ ] T074 [US3] Implement ProjectMemberHandler in backend/internal/handlers/project_member_handler.go (depends on T073)
- [ ] T075 [US3] Add member role validation and business rules (support multiple roles per user per project) in backend/internal/services/project_member_service.go (depends on T073)
- [ ] T076 [P] [US3] Create ProjectMemberForm component in frontend/src/components/project/ProjectMemberForm.tsx (Note: multi-role support added in US2)
- [ ] T077 [US3] Create ProjectMemberList component in frontend/src/components/project/ProjectMemberList.tsx (depends on T076)
- [ ] T078 [US3] Integrate member management with project detail page in frontend/src/pages/ProjectDetail.tsx
- [ ] T079 [US3] Add member notification system for role assignments in backend/internal/services/project_member_service.go (depends on T073)
- [ ] T079a [P] [US3] Add production file upload endpoint using file_service in backend/internal/handlers/production_handler.go (depends on T008b)
- [ ] T079b [P] [US3] Add production file download endpoint using file_service in backend/internal/handlers/production_handler.go (depends on T008b)
- [ ] T079c [P] [US3] Add production file search endpoint using file_service in backend/internal/handlers/production_handler.go (depends on T008b)
- [ ] T079d [US3] Create ProductionFileUpload component using file_service in frontend/src/components/production/ProductionFileUpload.tsx (depends on T079a)
- [ ] T079e [US3] Create ProductionFileList component with search, filter, and permission verification in frontend/src/components/production/ProductionFileList.tsx (depends on T079c)
- [ ] T079f [US3] Integrate production file management with production management page in frontend/src/pages/ProjectProduction.tsx (depends on T079d, T079e)

**Checkpoint**: 所有用户故事现在都应该独立功能化

---

## Phase 6: User Story 4 - 公司收入信息管理 (Priority: P2)

**Goal**: 财务人员能够管理公司的收入信息，包括项目应收款项、开票信息、支付记录、管理费比例、奖金分配和公司级别的收入统计，提供完整的财务跟踪和统计功能

**Independent Test**: 可以通过录入财务数据、生成财务报表、查看公司收入统计来独立测试，验证财务管理的准确性和完整性

### Tests for User Story 4

- [ ] T080 [P] [US4] Contract test for financial record endpoints in backend/tests/contract/test_financial.go
- [ ] T081 [P] [US4] Contract test for bonus endpoints in backend/tests/contract/test_bonuses.go
- [ ] T082 [P] [US4] Integration test for financial management flow in backend/tests/integration/test_financial_management.go
- [ ] T083 [P] [US4] Frontend component test for FinancialForm in frontend/tests/components/FinancialForm.test.tsx
- [ ] T084 [P] [US4] E2E test for financial management flow in frontend/tests/e2e/financial-management.spec.ts

### Implementation for User Story 4

- [ ] T085 [P] [US4] Update FinancialRecord model with FeeType field and payment fields (receivable_amount, invoice_date, invoice_amount, payment_date, payment_amount, unpaid_amount) in backend/internal/models/financial_record.go
- [ ] T085a [US4] Add database migration for FinancialRecord fee_type field and new payment fields in backend/migrations/ (depends on T085)
- [ ] T086 [P] [US4] Create Bonus model in backend/internal/models/bonus.go (ensure bonus_type supports business and production)
- [ ] T087 [US4] Implement FinancialService with fee type separation (design_fee, survey_fee, consultation_fee) in backend/internal/services/financial_service.go (depends on T085, T086)
- [ ] T087a [US4] Add unpaid_amount calculation logic (receivable_amount - payment_amount) in backend/internal/services/financial_service.go (depends on T087)
- [ ] T087b [US4] Add validation for payment_amount not exceeding receivable_amount per fee type in backend/internal/services/financial_service.go (depends on T087)
- [ ] T088 [US4] Implement FinancialHandler in backend/internal/handlers/financial_handler.go (depends on T087)
- [ ] T089 [US4] Add financial calculation and validation logic for fee type aggregation in backend/internal/services/financial_service.go (depends on T087)
- [ ] T090 [P] [US4] Create FinancialForm component with fee type selection (design_fee, survey_fee, consultation_fee) in frontend/src/components/financial/FinancialForm.tsx
- [ ] T090a [US4] Add separate financial record creation for each fee type in FinancialForm in frontend/src/components/financial/FinancialForm.tsx (depends on T090)
- [ ] T091 [US4] Create FinancialDashboard component with fee type breakdown in frontend/src/components/financial/FinancialDashboard.tsx (depends on T090)
- [ ] T092 [US4] Create BonusForm component supporting business and production bonus types in frontend/src/components/financial/BonusForm.tsx
- [ ] T093 [US4] Integrate financial management with project detail page in frontend/src/pages/ProjectDetail.tsx
- [ ] T094 [US4] Add financial reporting and statistics features with company-level revenue aggregation in frontend/src/components/financial/FinancialStatistics.tsx
- [ ] T094a [US4] Add company-level revenue statistics dashboard in frontend/src/components/financial/CompanyRevenueDashboard.tsx (depends on T094)

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: 影响多个用户故事的改进

- [ ] T108 [P] Documentation updates in docs/
- [ ] T109 [P] Code cleanup and refactoring across all modules
- [ ] T110 [P] Performance optimization across all stories
- [ ] T111 [P] Additional unit tests in backend/tests/unit/ and frontend/tests/unit/
- [ ] T112 [P] Security hardening and vulnerability assessment
- [ ] T113 [P] Run quickstart.md validation and update if needed
- [ ] T114 [P] Add comprehensive error handling and user feedback
- [ ] T115 [P] Implement comprehensive logging and monitoring
- [ ] T116 [P] Add data export and reporting features
- [ ] T117 [P] Performance testing and optimization
- [ ] T118 [P] Security testing and penetration testing
- [ ] T119 [P] User acceptance testing and feedback integration

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖 - 可以立即开始
- **Foundational (Phase 2)**: 依赖Setup完成 - 阻塞所有用户故事
  - **文件管理基础能力层** (T008a, T008b): 必须在User Story 2和3的文件管理功能之前完成
- **User Stories (Phase 3-6)**: 都依赖Foundational阶段完成
  - 用户故事可以并行进行（如果有足够人员）
  - 或者按优先级顺序进行（P1 → P2）
- **Polish (Phase 8)**: 依赖所有期望的用户故事完成

### User Story Dependencies

- **User Story 1 (P1)**: Foundational完成后可以开始 - 不依赖其他故事
- **User Story 2 (P1)**: Foundational完成后可以开始 - 文件管理功能依赖T008b (file_service)
- **User Story 3 (P2)**: Foundational完成后可以开始 - 文件管理功能依赖T008b (file_service)
- **User Story 4 (P2)**: Foundational完成后可以开始 - 可能与US1/US2集成但应该独立可测试

### Within Each User Story

- 测试（如果包含）必须在实现前编写并失败
- 模型在服务之前
- 服务在端点之前
- 核心实现在集成之前
- 故事完成后再进入下一个优先级

### Parallel Opportunities

- 所有标记[P]的Setup任务可以并行运行
- 所有标记[P]的Foundational任务可以并行运行（在Phase 2内）
- Foundational阶段完成后，所有用户故事可以并行开始（如果团队容量允许）
- 用户故事的所有测试标记[P]可以并行运行
- 故事内的模型标记[P]可以并行运行
- 不同用户故事可以由不同团队成员并行工作

---

## Parallel Example: User Story 1

```bash
# 同时启动用户故事1的所有测试：
Task: "Contract test for user authentication endpoints in backend/tests/contract/test_auth.go"
Task: "Contract test for project CRUD endpoints in backend/tests/contract/test_projects.go"
Task: "Contract test for client CRUD endpoints in backend/tests/contract/test_clients.go"

# 同时启动用户故事1的所有模型：
Task: "Create User model in backend/internal/models/user.go"
Task: "Create Project model in backend/internal/models/project.go"
Task: "Create Client model in backend/internal/models/client.go"

# 同时启动用户故事1的前端组件：
Task: "Create TypeScript types in frontend/src/types/index.ts"
Task: "Create API service functions in frontend/src/services/project.ts"
Task: "Create API service functions in frontend/src/services/auth.ts"
```

---

## Implementation Strategy

### MVP First (仅用户故事1)

1. 完成Phase 1: Setup
2. 完成Phase 2: Foundational (CRITICAL - 阻塞所有故事)
3. 完成Phase 3: User Story 1
4. **停止并验证**: 独立测试用户故事1
5. 如果准备就绪则部署/演示

### Incremental Delivery

1. 完成Setup + Foundational → 基础设施就绪（包括文件管理基础能力层）
2. 添加用户故事1 → 独立测试 → 部署/演示 (MVP!)
3. 添加用户故事2 → 独立测试 → 部署/演示（包括合同文件管理）
4. 添加用户故事3 → 独立测试 → 部署/演示（包括生产文件管理）
5. 添加用户故事4 → 独立测试 → 部署/演示（公司收入信息管理）
6. 每个故事都增加价值而不破坏之前的故事

### Parallel Team Strategy

多开发者团队：

1. 团队一起完成Setup + Foundational（包括文件管理基础能力层）
2. Foundational完成后：
   - 开发者A: 用户故事1
   - 开发者B: 用户故事2（使用file_service进行合同文件管理）
   - 开发者C: 用户故事3（使用file_service进行生产文件管理）
   - 开发者D: 用户故事4（公司收入信息管理）
3. 故事独立完成和集成

---

## Notes

- [P] 任务 = 不同文件，无依赖关系
- [Story] 标签将任务映射到特定用户故事以便追踪
- 每个用户故事应该独立完成和可测试
- 实现前验证测试失败
- 每个任务或逻辑组后提交
- 在任何检查点停止以独立验证故事
- 避免：模糊任务、同一文件冲突、破坏独立性的跨故事依赖

## Task Summary

- **总任务数**: 207个任务 (更新后)
- **Foundational阶段任务数**: 18个任务 (T007-T016 + T008a-T008b) - 新增文件管理基础能力层
- **用户故事1任务数**: 42个任务 (T017-T044 + T042a-T042e, T043a, T044a-T044b, T033a, T038a-T038b, T029a-T029c, T032a, T041a) - 已移除项目创建表单中的甲方相关任务
- **用户故事2任务数**: 54个任务 (T045-T067 + T053a-T053d, T054a-T054c, T055a-T055b, T057a-T057b, T059a-T059h, T060, T062a-T062e, T063a-T063b, T064a, T066a-T066b, T067a-T067f) - 新增专家费支付、合同补充协议、经营负责人/人员、一人多角色支持、合同文件管理（使用file_service）
- **用户故事3任务数**: 18个任务 (T068-T079 + T079a-T079f) - 新增生产文件管理（使用file_service）
- **用户故事4任务数**: 22个任务 (T080-T094 + T085a, T087a-T087b, T090a, T094a) - 更新为公司收入信息管理，新增公司级别统计
- **Polish阶段任务数**: 12个任务 (T108-T119) - 保持不变
- **并行机会**: 所有标记[P]的任务可以并行执行
- **独立测试标准**: 每个用户故事都有明确的独立测试标准
- **建议MVP范围**: 仅用户故事1 (项目信息录入与管理)
- **格式验证**: 所有任务都遵循检查清单格式 (checkbox, ID, labels, file paths)

## New Requirements Added (2025-01-28, 2025-11-19)

### User Story 2 Enhancements:
- **经营负责人和经营人员**: 通过ProjectMember系统管理，支持一人多角色 (T053c, T053d, T054c, T062c, T064a)
- **专家费支付**: 新增ExpertFeePayment实体和相关端点 (T053b, T055b, T057b, T059a-T059b, T059h, T062b, T062e, T063b, T066b)
- **合同补充协议**: 新增ContractAmendment实体和相关端点 (T053a, T055a, T057a, T059e-T059f, T062a, T063a, T066a)
- **合同金额明细**: 合同实体添加费用明细字段 (T053, T060, T062, T062d, T059g)
- **合同文件管理**: 使用file_service进行合同文件的上传、下载、搜索 (T067a-T067f)

### User Story 3 Enhancements:
- **生产文件管理**: 使用file_service进行生产文件的上传、下载、搜索和权限验证 (T079a-T079f)

### User Story 4 Enhancements (2025-11-19):
- **重命名为公司收入信息管理**: 从"财务信息管理与统计"改为"公司收入信息管理"，强调公司级别统计 (Phase 6标题更新)
- **按费用类型分别记录**: FinancialRecord支持按设计费、勘察费、咨询费分别记录 (T085, T085a, T087, T087a-T087b, T090, T090a)
- **支付信息完整字段**: 添加应收金额、开票时间、开票金额、支付时间、支付金额、未收金额 (T085, T087a)
- **公司级别收入统计**: 新增公司级别收入统计和报表功能 (T094, T094a)
- **经营奖金**: Bonus实体支持business类型 (T086, T092)

### Architecture Changes (2025-11-19):
- **文件管理两层架构**: 
  - 基础能力层: File模型 (T008a) 和 FileService (T008b) 在Foundational阶段
  - 业务使用层: 合同文件管理在User Story 2 (T067a-T067f)，生产文件管理在User Story 3 (T079a-T079f)
- **删除User Story 5**: 文件管理功能已分散到User Story 2和3中，不再需要独立的文件管理用户故事
