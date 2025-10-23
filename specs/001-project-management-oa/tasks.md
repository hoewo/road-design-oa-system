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
- [ ] T006 [P] Setup Git hooks and pre-commit configuration

---

## Phase 2: Foundational (核心基础设施)

**Purpose**: 核心基础设施，所有用户故事实现前必须完成

**⚠️ CRITICAL**: 任何用户故事工作开始前必须完成此阶段

- [x] T007 Setup PostgreSQL database schema and migrations framework in backend/pkg/database/
- [ ] T008 [P] Setup MinIO file storage configuration in backend/pkg/storage/
- [ ] T009 [P] Implement JWT authentication middleware in backend/internal/middleware/auth.go
- [ ] T010 [P] Setup CORS and logging middleware in backend/internal/middleware/
- [x] T011 [P] Create base configuration management in backend/internal/config/config.go
- [x] T012 [P] Setup API routing structure in backend/internal/handlers/
- [ ] T013 [P] Configure error handling and logging infrastructure
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
- [ ] T027 [US1] Implement AuthService in backend/internal/services/auth_service.go (depends on T024)
- [ ] T028 [US1] Implement ProjectService in backend/internal/services/project_service.go (depends on T025, T026)
- [ ] T029 [US1] Implement ClientService in backend/internal/services/client_service.go (depends on T026)
- [ ] T030 [US1] Implement AuthHandler in backend/internal/handlers/auth_handler.go (depends on T027)
- [ ] T031 [US1] Implement ProjectHandler in backend/internal/handlers/project_handler.go (depends on T028)
- [ ] T032 [US1] Implement ClientHandler in backend/internal/handlers/client_handler.go (depends on T029)
- [ ] T033 [US1] Add validation and error handling for all endpoints
- [ ] T034 [US1] Add logging for user story 1 operations
- [x] T035 [P] [US1] Create TypeScript types in frontend/src/types/index.ts
- [x] T036 [P] [US1] Create API service functions in frontend/src/services/project.ts
- [x] T037 [P] [US1] Create API service functions in frontend/src/services/auth.ts
- [ ] T038 [US1] Create ProjectForm component in frontend/src/components/project/ProjectForm.tsx (depends on T035, T036)
- [ ] T039 [US1] Create ProjectList component in frontend/src/components/project/ProjectList.tsx (depends on T035, T036)
- [ ] T040 [US1] Create ProjectDetail component in frontend/src/components/project/ProjectDetail.tsx (depends on T035, T036)
- [ ] T041 [US1] Create ClientForm component in frontend/src/components/client/ClientForm.tsx (depends on T035, T036)
- [x] T042 [US1] Create ProjectList page in frontend/src/pages/ProjectList.tsx (depends on T039)
- [x] T043 [US1] Create ProjectDetail page in frontend/src/pages/ProjectDetail.tsx (depends on T040)
- [x] T044 [US1] Setup routing for project management pages in frontend/src/App.tsx

**Checkpoint**: 此时，用户故事1应该完全功能化并可独立测试

---

## Phase 4: User Story 2 - 项目经营信息管理 (Priority: P1)

**Goal**: 经营人员能够管理项目的经营相关信息，包括甲方信息、联系人、招投标信息、合同信息、支付信息和奖金分配

**Independent Test**: 可以通过为现有项目添加甲方信息、上传合同文件、记录支付信息来独立测试，验证经营数据的完整管理流程

### Tests for User Story 2

- [ ] T045 [P] [US2] Contract test for contract endpoints in backend/tests/contract/test_contracts.go
- [ ] T046 [P] [US2] Integration test for contract management flow in backend/tests/integration/test_contract_management.go
- [ ] T047 [P] [US2] Frontend component test for ContractForm in frontend/tests/components/ContractForm.test.tsx
- [ ] T048 [P] [US2] E2E test for contract management flow in frontend/tests/e2e/contract-management.spec.ts

### Implementation for User Story 2

- [ ] T049 [P] [US2] Create Contract model in backend/internal/models/contract.go
- [ ] T050 [US2] Implement ContractService in backend/internal/services/contract_service.go (depends on T049)
- [ ] T051 [US2] Implement ContractHandler in backend/internal/handlers/contract_handler.go (depends on T050)
- [ ] T052 [US2] Add contract validation and business rules
- [ ] T053 [P] [US2] Create ContractForm component in frontend/src/components/contract/ContractForm.tsx
- [ ] T054 [US2] Create ContractList component in frontend/src/components/contract/ContractList.tsx (depends on T053)
- [ ] T055 [US2] Integrate contract management with project detail page
- [ ] T056 [US2] Add contract statistics and reporting features

**Checkpoint**: 此时，用户故事1和2都应该独立工作

---

## Phase 5: User Story 3 - 项目生产信息管理 (Priority: P2)

**Goal**: 项目负责人能够管理项目的生产相关信息，包括人员配置、批复审计、生产文件、成本信息和对外委托

**Independent Test**: 可以通过为项目配置人员、上传生产文件、记录成本信息来独立测试，验证生产管理的完整工作流程

### Tests for User Story 3

- [ ] T057 [P] [US3] Contract test for project member endpoints in backend/tests/contract/test_project_members.go
- [ ] T058 [P] [US3] Integration test for project member management flow in backend/tests/integration/test_member_management.go
- [ ] T059 [P] [US3] Frontend component test for ProjectMemberForm in frontend/tests/components/ProjectMemberForm.test.tsx
- [ ] T060 [P] [US3] E2E test for project member management flow in frontend/tests/e2e/member-management.spec.ts

### Implementation for User Story 3

- [ ] T061 [P] [US3] Create ProjectMember model in backend/internal/models/project_member.go
- [ ] T062 [US3] Implement ProjectMemberService in backend/internal/services/project_member_service.go (depends on T061)
- [ ] T063 [US3] Implement ProjectMemberHandler in backend/internal/handlers/project_member_handler.go (depends on T062)
- [ ] T064 [US3] Add member role validation and business rules
- [ ] T065 [P] [US3] Create ProjectMemberForm component in frontend/src/components/project/ProjectMemberForm.tsx
- [ ] T066 [US3] Create ProjectMemberList component in frontend/src/components/project/ProjectMemberList.tsx (depends on T065)
- [ ] T067 [US3] Integrate member management with project detail page
- [ ] T068 [US3] Add member notification system for role assignments

**Checkpoint**: 所有用户故事现在都应该独立功能化

---

## Phase 6: User Story 4 - 财务信息管理与统计 (Priority: P2)

**Goal**: 财务人员能够管理项目的财务信息，包括应收金额、开票信息、支付记录、管理费比例和奖金分配

**Independent Test**: 可以通过录入财务数据、生成财务报表、查看收入统计来独立测试，验证财务管理的准确性和完整性

### Tests for User Story 4

- [ ] T069 [P] [US4] Contract test for financial record endpoints in backend/tests/contract/test_financial.go
- [ ] T070 [P] [US4] Contract test for bonus endpoints in backend/tests/contract/test_bonuses.go
- [ ] T071 [P] [US4] Integration test for financial management flow in backend/tests/integration/test_financial_management.go
- [ ] T072 [P] [US4] Frontend component test for FinancialForm in frontend/tests/components/FinancialForm.test.tsx
- [ ] T073 [P] [US4] E2E test for financial management flow in frontend/tests/e2e/financial-management.spec.ts

### Implementation for User Story 4

- [ ] T074 [P] [US4] Create FinancialRecord model in backend/internal/models/financial_record.go
- [ ] T075 [P] [US4] Create Bonus model in backend/internal/models/bonus.go
- [ ] T076 [US4] Implement FinancialService in backend/internal/services/financial_service.go (depends on T074, T075)
- [ ] T077 [US4] Implement FinancialHandler in backend/internal/handlers/financial_handler.go (depends on T076)
- [ ] T078 [US4] Add financial calculation and validation logic
- [ ] T079 [P] [US4] Create FinancialForm component in frontend/src/components/financial/FinancialForm.tsx
- [ ] T080 [US4] Create FinancialDashboard component in frontend/src/components/financial/FinancialDashboard.tsx (depends on T079)
- [ ] T081 [US4] Create BonusForm component in frontend/src/components/financial/BonusForm.tsx
- [ ] T082 [US4] Integrate financial management with project detail page
- [ ] T083 [US4] Add financial reporting and statistics features

---

## Phase 7: User Story 5 - 文件管理与存档 (Priority: P3)

**Goal**: 系统用户能够上传、管理和检索项目相关的各种文件，包括合同文件、设计文件、审计报告等

**Independent Test**: 可以通过上传各种类型的项目文件、设置文件权限、搜索和下载文件来独立测试，验证文件管理的完整功能

### Tests for User Story 5

- [ ] T084 [P] [US5] Contract test for file endpoints in backend/tests/contract/test_files.go
- [ ] T085 [P] [US5] Integration test for file management flow in backend/tests/integration/test_file_management.go
- [ ] T086 [P] [US5] Frontend component test for FileUpload in frontend/tests/components/FileUpload.test.tsx
- [ ] T087 [P] [US5] E2E test for file management flow in frontend/tests/e2e/file-management.spec.ts

### Implementation for User Story 5

- [ ] T088 [P] [US5] Create File model in backend/internal/models/file.go
- [ ] T089 [US5] Implement FileService in backend/internal/services/file_service.go (depends on T088)
- [ ] T090 [US5] Implement FileHandler in backend/internal/handlers/file_handler.go (depends on T089)
- [ ] T091 [US5] Add file upload validation and security checks
- [ ] T092 [P] [US5] Create FileUpload component in frontend/src/components/file/FileUpload.tsx
- [ ] T093 [US5] Create FileList component in frontend/src/components/file/FileList.tsx (depends on T092)
- [ ] T094 [US5] Create FileManagement page in frontend/src/pages/FileManagement.tsx (depends on T093)
- [ ] T095 [US5] Integrate file management with project detail page
- [ ] T096 [US5] Add file search and filtering capabilities

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: 影响多个用户故事的改进

- [ ] T097 [P] Documentation updates in docs/
- [ ] T098 [P] Code cleanup and refactoring across all modules
- [ ] T099 [P] Performance optimization across all stories
- [ ] T100 [P] Additional unit tests in backend/tests/unit/ and frontend/tests/unit/
- [ ] T101 [P] Security hardening and vulnerability assessment
- [ ] T102 [P] Run quickstart.md validation and update if needed
- [ ] T103 [P] Add comprehensive error handling and user feedback
- [ ] T104 [P] Implement comprehensive logging and monitoring
- [ ] T105 [P] Add data export and reporting features
- [ ] T106 [P] Performance testing and optimization
- [ ] T107 [P] Security testing and penetration testing
- [ ] T108 [P] User acceptance testing and feedback integration

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖 - 可以立即开始
- **Foundational (Phase 2)**: 依赖Setup完成 - 阻塞所有用户故事
- **User Stories (Phase 3-7)**: 都依赖Foundational阶段完成
  - 用户故事可以并行进行（如果有足够人员）
  - 或者按优先级顺序进行（P1 → P2 → P3）
- **Polish (Phase 8)**: 依赖所有期望的用户故事完成

### User Story Dependencies

- **User Story 1 (P1)**: Foundational完成后可以开始 - 不依赖其他故事
- **User Story 2 (P1)**: Foundational完成后可以开始 - 可能与US1集成但应该独立可测试
- **User Story 3 (P2)**: Foundational完成后可以开始 - 可能与US1/US2集成但应该独立可测试
- **User Story 4 (P2)**: Foundational完成后可以开始 - 可能与US1/US2集成但应该独立可测试
- **User Story 5 (P3)**: Foundational完成后可以开始 - 可能与所有故事集成但应该独立可测试

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

1. 完成Setup + Foundational → 基础设施就绪
2. 添加用户故事1 → 独立测试 → 部署/演示 (MVP!)
3. 添加用户故事2 → 独立测试 → 部署/演示
4. 添加用户故事3 → 独立测试 → 部署/演示
5. 添加用户故事4 → 独立测试 → 部署/演示
6. 添加用户故事5 → 独立测试 → 部署/演示
7. 每个故事都增加价值而不破坏之前的故事

### Parallel Team Strategy

多开发者团队：

1. 团队一起完成Setup + Foundational
2. Foundational完成后：
   - 开发者A: 用户故事1
   - 开发者B: 用户故事2
   - 开发者C: 用户故事3
   - 开发者D: 用户故事4
   - 开发者E: 用户故事5
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

- **总任务数**: 108个任务
- **用户故事1任务数**: 28个任务 (T017-T044)
- **用户故事2任务数**: 12个任务 (T045-T056)
- **用户故事3任务数**: 12个任务 (T057-T068)
- **用户故事4任务数**: 15个任务 (T069-T083)
- **用户故事5任务数**: 13个任务 (T084-T096)
- **Polish阶段任务数**: 12个任务 (T097-T108)
- **并行机会**: 所有标记[P]的任务可以并行执行
- **独立测试标准**: 每个用户故事都有明确的独立测试标准
- **建议MVP范围**: 仅用户故事1 (项目信息录入与管理)
- **格式验证**: 所有任务都遵循检查清单格式 (checkbox, ID, labels, file paths)
