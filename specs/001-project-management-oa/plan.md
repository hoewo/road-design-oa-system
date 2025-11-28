# Implementation Plan: 项目管理OA系统

**Branch**: `001-project-management-oa` | **Date**: 2025-01-27 | **Last Updated**: 2025-01-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-project-management-oa/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

基于Excel文件中的项目管理系统需求，构建一个完整的项目管理OA系统，支持项目基本信息、经营信息、生产信息、公司收入信息管理的全生命周期管理。文件管理功能分散到各业务模块中：合同文件在项目经营信息中管理，生产文件在项目生产信息中管理。采用React前端和Go后端的现代化Web应用架构。

**最新需求优化**（2025-11-22）：
1. 经营负责人和经营人员的下拉菜单需要支持新建和编辑人员
2. 新建合同页面，需要删除合同文件路径字段
3. 专家费新建和编辑中，需要删除专家ID字段
4. 支付信息的财务记录，需要支持编辑和删除
5. 奖金管理中的奖金记录，需要支持编辑和删除

## Technical Context

**Frontend Language/Version**: React 18+ with TypeScript  
**Backend Language/Version**: Go 1.21+  
**Primary Dependencies**: 
- Frontend: React Router, Axios, Ant Design, React Query
- Backend: Gin, GORM, JWT, MinIO (file storage)
**Storage**: PostgreSQL (primary), MinIO (file storage)  
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
- ✅ RESTful API设计，支持JSON格式
- ✅ API文档自动生成和维护

**III. Security & Data Integrity**
- ✅ 用户认证和授权机制
- ✅ 财务数据完整性保护
- ✅ 文件上传安全验证：仅限制危险文件类型（可执行文件、脚本文件等），其他文件类型均允许上传

**IV. Performance & Scalability**
- ✅ 支持1000并发用户
- ✅ 数据库查询优化
- ✅ 文件存储优化

**V. Maintainability**
- ✅ 清晰的代码结构和模块化设计
- ✅ 完整的文档和注释
- ✅ 错误处理和日志记录

**GATE STATUS**: ✅ PASSED - 所有核心原则都得到满足

### Post-Design Constitution Check

**I. Test-First Development (NON-NEGOTIABLE)**
- ✅ 完整的测试策略已定义：Jest + React Testing Library + Cypress (前端)，Go testing + testify + gomock (后端)
- ✅ 测试覆盖所有核心功能模块
- ✅ 集成测试和端到端测试计划已制定

**II. API-First Design**
- ✅ OpenAPI 3.0规范已完整定义
- ✅ RESTful API设计遵循标准规范
- ✅ 前后端分离架构，API契约清晰

**III. Security & Data Integrity**
- ✅ JWT认证机制已设计
- ✅ RBAC权限模型已定义
- ✅ 数据验证规则已制定
- ✅ 文件上传安全策略已规划：仅限制危险文件类型（可执行文件、脚本文件等），其他文件类型均允许上传

**IV. Performance & Scalability**
- ✅ 数据库索引策略已优化
- ✅ 分页查询和缓存策略已规划
- ✅ 支持1000并发用户的设计已确认

**V. Maintainability**
- ✅ 清晰的分层架构设计
- ✅ 模块化的代码结构
- ✅ 完整的文档和快速开始指南

**POST-DESIGN GATE STATUS**: ✅ PASSED - 设计阶段后所有原则依然满足

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
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
│   │   ├── project.go
│   │   ├── client.go
│   │   ├── contract.go
│   │   ├── user.go
│   │   └── file.go
│   ├── services/
│   │   ├── project_service.go
│   │   ├── auth_service.go
│   │   ├── project_business_service.go
│   │   ├── contract_service.go
│   │   ├── contract_amendment_service.go
│   │   ├── expert_fee_payment_service.go
│   │   ├── file_service.go
│   │   └── financial_service.go
│   ├── handlers/
│   │   ├── project_handler.go
│   │   ├── auth_handler.go
│   │   ├── project_business_handler.go
│   │   ├── contract_handler.go          # Uses file_service for contract files
│   │   ├── contract_amendment_handler.go
│   │   ├── expert_fee_payment_handler.go
│   │   └── financial_handler.go
│   │   # Note: No standalone file_handler.go - file operations integrated into business handlers
│   ├── middleware/
│   │   ├── auth.go
│   │   ├── cors.go
│   │   └── logging.go
│   └── config/
│       └── config.go
├── pkg/
│   ├── database/
│   ├── storage/
│   └── utils/
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
│   │   ├── project/
│   │   ├── contract/
│   │   ├── financial/
│   │   └── production/
│   ├── pages/
│   │   ├── ProjectList.tsx
│   │   ├── ProjectDetail.tsx
│   │   ├── ProjectBusiness.tsx
│   │   └── CompanyRevenue.tsx
│   ├── services/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── project.ts
│   │   └── business.ts
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

**Structure Decision**: 选择Web应用结构，包含独立的前端和后端目录。后端使用Go + Gin框架，采用分层架构（handlers -> services -> models）。文件管理采用两层架构：基础能力层（file_service）提供通用文件操作，业务使用层（contract_handler, production_handler）使用基础能力处理业务文件。前端使用React + TypeScript，采用组件化设计。支持Docker容器化部署。

## Design Decisions & Clarifications

### Field Validation Rules (Updated 2025-11-19)

Based on user feedback and clarification:
- **Project Creation Form**: Only `project_name` and `project_number` are required fields
- **All other fields** (start_date, project_overview, drawing_unit, status, manager_id) are optional
- **Client Information**: Client information is NOT included in project creation form. Clients are managed separately in project business information module
- **Rationale**: Separates project creation from business information management, allowing projects to be created without client information

### UX Enhancements

- **Separated Client Management**: Client information is managed in project business information module, not during project creation
- **Flexible Data Entry**: Users can create projects with minimal information and complete details later
- **Non-blocking Workflow**: Users are not required to have all information before creating a project

### Client Management & Selection Design (Updated 2025-11-19)

Based on comprehensive clarification session (2025-11-19):

1. **Client Management Location**:
   - **Decision**: Client information is managed in project business information module, NOT in project creation form
   - **Rationale**: Separates project creation from business information management, allowing projects to be created without client information
   - **Impact**: Project creation form does not include client selection. Client management is available in project business information page

2. **Client Management Approach**:
   - **Decision**: Support both selecting existing clients and creating new clients in business information module
   - **Maintenance Location**: Project business information module
   - **Rationale**: Allows flexible client management while maintaining context within business information
   - **Implementation**: Provide client selection dropdown with "Create New Client" option in business information form

3. **Client Association Rules**:
   - **Rule**: Each project can have at most one associated client (can be empty)
   - **Association**: Client association is optional in project business information
   - **Changeability**: Users can change or remove client association after it's set
   - **Rationale**: Provides flexibility while maintaining data integrity

4. **Client Name Uniqueness**:
   - **Rule**: Enforce strict uniqueness - system prevents creation of clients with duplicate names
   - **Implementation**: Backend validation checks for existing client names before creation
   - **User Experience**: Show clear error message suggesting user to use existing client if duplicate detected
   - **Rationale**: Prevents data duplication and maintains data integrity

5. **Client Deletion Rules**:
   - **Hard Delete with Protection**: Clients can be permanently deleted only if not associated with any projects
   - **Protection Logic**: Check for project associations before allowing deletion
   - **User Feedback**: Clear error message explaining why deletion is blocked
   - **Rationale**: Prevents data integrity issues while allowing cleanup of unused clients

### Project Member Multi-Role Support (Updated 2025-01-28)

Based on clarification session (2025-01-28):

1. **Multi-Role Architecture**:
   - **Decision**: Support multiple roles per user per project through multiple ProjectMember records
   - **Current Model**: ProjectMember has single Role field (one record = one role)
   - **New Requirement**: One user can have multiple roles in the same project (e.g., both business manager and business personnel)
   - **Implementation**: Allow multiple ProjectMember records with same UserID but different Role values for same ProjectID
   - **Validation Change**: Remove constraint "同一项目同一角色只能有一个用户", allow "同一用户同一项目可以有多个角色"
   - **Rationale**: Provides flexibility for real-world scenarios where people wear multiple hats

2. **Business Manager and Business Personnel Roles**:
   - **New Roles**: Add `MemberRoleBusinessManager` and `MemberRoleBusinessPersonnel` to MemberRole enum
   - **Management**: Managed through project business information module
   - **Display**: UI should show all roles for each user in project member list
   - **Rationale**: Aligns with business requirements for tracking business-related personnel

### Expert Fee Payment Design (Updated 2025-01-28)

1. **Entity Structure**:
   - **Decision**: Create ExpertFeePayment as sub-entity of bidding information, associated with Project
   - **Fields**: PaymentMethod (cash/transfer), Amount, ExpertPerson (reference to User or external expert)
   - **Association**: Directly linked to Project, part of bidding information module
   - **Rationale**: Keeps expert fee payments logically grouped with bidding process
   - **Implementation**: New entity `ExpertFeePayment` with ProjectID foreign key

### Contract Amendment Design (Updated 2025-01-28)

1. **Amendment Structure**:
   - **Decision**: ContractAmendment as sub-entity of Contract, linked to parent Contract
   - **Fields**: AmendmentFile (file path), SignDate, Description
   - **Association**: Foreign key to Contract (parent_contract_id)
   - **Rationale**: Maintains clear relationship between main contract and amendments
   - **Implementation**: New entity `ContractAmendment` with ContractID foreign key

2. **Contract Amount Breakdown**:
   - **Requirement**: Contract amount must explicitly include DesignFee, SurveyFee, ConsultationFee
   - **Decision**: Add breakdown fields to Contract entity or create ContractAmountDetail sub-entity
   - **Implementation Options**:
     - Option A: Add DesignFee, SurveyFee, ConsultationFee fields directly to Contract
     - Option B: Create ContractAmountDetail as sub-entity (more flexible for future fee types)
   - **Recommended**: Option A (simpler, covers current requirements)
   - **Validation**: ContractAmount should equal sum of DesignFee + SurveyFee + ConsultationFee

### Client Payment Information Design (Updated 2025-01-28)

1. **Payment Record Structure**:
   - **Decision**: Create separate FinancialRecord for each fee type (DesignFee, SurveyFee, ConsultationFee)
   - **Fields per Record**: ReceivableAmount, InvoiceDate, InvoiceAmount, PaymentDate, PaymentAmount, UnpaidAmount (calculated)
   - **Fee Type Field**: Add FeeType field to FinancialRecord (enum: design_fee, survey_fee, consultation_fee)
   - **Rationale**: Enables detailed tracking and reporting by fee type
   - **Implementation**: Extend FinancialRecord with FeeType field, create multiple records per project per fee type

2. **Calculation Rules**:
   - **UnpaidAmount**: Calculated as ReceivableAmount - PaymentAmount (per fee type)
   - **Aggregation**: System should provide aggregated views across all fee types
   - **Validation**: PaymentAmount should not exceed ReceivableAmount per fee type

### Bonus Management Design (Updated 2025-01-28)

1. **Bonus Entity Usage**:
   - **Decision**: Use existing Bonus entity with bonus_type field to distinguish business and production bonuses
   - **Current Structure**: Bonus has BonusType (business/production), UserID, Amount
   - **Requirement**: Track business bonus with personnel and amount
   - **Implementation**: No changes needed to entity structure, ensure bonus_type='business' is used for business bonuses
   - **Rationale**: Reuses existing well-designed entity, maintains consistency

2. **Bonus Assignment**:
   - **Rule**: Each bonus record links one user (UserID) to one amount
   - **Multiple Bonuses**: Same user can have multiple bonus records for same project (different bonus types or different time periods)
   - **Display**: Group bonuses by type and user for reporting

### File Management Architecture Design (Updated 2025-11-19)

Based on user story restructuring and separation of concerns:

1. **Two-Layer Architecture**:
   - **Decision**: Split file management into **Foundation Layer** (基础能力层) and **Business Usage Layer** (业务使用层)
   - **Foundation Layer**: Provides core file operations (upload, download, delete, search) as reusable services
   - **Business Usage Layer**: Business modules (contract, production) use foundation services for their specific file needs
   - **Rationale**: 
     - Separation of concerns: Foundation layer handles technical file operations, business layer handles business logic
     - Reusability: Same foundation services can be used by multiple business modules
     - Maintainability: Changes to file storage backend only affect foundation layer
     - Testability: Foundation layer can be tested independently

2. **Foundation Layer (基础能力层)**:
   - **Components**:
     - `backend/pkg/storage/minio.go`: Low-level MinIO operations (already exists)
     - `backend/internal/services/file_service.go`: **NEW** - High-level file service that:
       - Encapsulates MinIO storage operations
       - Manages File model (metadata, database operations)
       - Provides unified file operations API (UploadFile, GetFile, DeleteFile, SearchFiles)
       - Handles file validation, size limits, dangerous file type checking (only blocks executable and script files)
       - Manages file paths, naming conventions
   - **Responsibilities**:
     - File storage operations (upload, download, delete)
     - File metadata management (CRUD operations on File model)
     - File search and filtering (by project, category, type, date)
     - File access control (permission checking)
     - File validation (size, dangerous file type blocking - only blocks executable and script files)
   - **API Design**: Service layer methods, not HTTP endpoints (used by business handlers)

3. **Business Usage Layer (业务使用层)**:
   - **Contract File Management** (User Story 2):
     - **Location**: 项目经营信息管理 (Project Business Information Management)
     - **Scope**: Contract files, contract amendment files, bidding documents
     - **Implementation**: 
       - Contract handlers call `file_service` methods
       - Business-specific validation (file size limits, dangerous file type blocking)
       - Business context association (link files to contracts/projects)
     - **Endpoints**: `/api/v1/projects/{id}/contracts/{contractId}/files` (POST, GET, DELETE)
   - **Production File Management** (User Story 3):
     - **Location**: 项目生产信息管理 (Project Production Information Management)
     - **Scope**: Production files (scheme PPT, design files, audit reports, etc.)
     - **Implementation**:
       - Production handlers call `file_service` methods
       - Business-specific validation (file size limits, dangerous file type blocking)
       - Business context association (link files to production tasks/projects)
     - **Endpoints**: `/api/v1/projects/{id}/production/files` (POST, GET, DELETE)
   - **Rationale**: Business modules focus on business logic, delegate file operations to foundation layer

4. **File Storage Architecture**:
   - **Storage Backend**: MinIO (object storage) - Foundation layer dependency
   - **File Entity**: File model with Category field (contract, production, bidding, etc.)
   - **File Association**: Files linked to projects, with Category indicating business context
   - **Search Strategy**: Foundation layer provides unified search API, business layers add business-specific filters

5. **Implementation Structure**:
   ```
   Foundation Layer:
   - pkg/storage/minio.go (low-level MinIO ops)
   - internal/services/file_service.go (high-level file service)
   - internal/models/file.go (File entity)
   
   Business Usage Layer:
   - internal/handlers/contract_handler.go (uses file_service)
   - internal/handlers/production_handler.go (uses file_service)
   - Business handlers call file_service methods, not direct MinIO
   ```

6. **Benefits of This Architecture**:
   - **Reusability**: Same file_service used by contract, production, and future modules
   - **Maintainability**: File storage changes only affect file_service
   - **Testability**: Foundation layer can be unit tested independently
   - **Consistency**: All file operations follow same patterns and validation rules
   - **Scalability**: Easy to add new business modules that need file management

### Production Information Design (Updated 2025-11-27)
针对用户故事3新增的明确需求，生产信息模块需要补充以下设计：

1. **专业-角色-人员映射**：

 - **Decision**: 在 `ProjectDisciplineAssignment`（新表）中维护 `project_id + discipline + role_type (designer/participant/reviewer)` → `user_id` 的映射；允许同一专业分别指定三类角色，同一用户可在不同专业担任不同角色
 - **Backend Impact**: 新增模型（backend/internal/models/project_discipline_assignment.go）、服务（project_discipline_service.go）以及 `/projects/{id}/production/discipline-assignments` CRUD 接口
 - **Frontend Impact**: ProjectProduction 页面中的 `DisciplineAssignmentForm` 组件支持多专业行编辑（全局专业字典 + 项目内新增），并校验每个专业都配置三类角色
 - **Rationale**: 满足“每个专业都有设计/参与/复核人员”的约束

2. **审核/审定流程与批复/审计记录**：

 - **Decision**: 引入 `ProductionApprovalRecord` 表，字段包含 `approval_type (review/approval)`, `approver_id`, `status`, `signed_at`, `attachment_file_id`, `remarks`
 - **Decision**: 引入 `AuditResolution` 表（批复/审计记录），字段包含 `report_type (approval/audit)`, `report_file_id`, `amount_design`, `amount_survey`, `amount_consulting`, `source_contract_id`, `override_reason`
 - **Data Flow**: 审核/审定流程记录在 `ProductionApprovalRecord`，批复/审计金额默认拉取 `Contract` + `ContractAmendment` 汇总值，用户可覆盖并填写说明
 - **Frontend Impact**: 生产模块新增审批流时间线 UI 与批复/审计表单（上传报告、金额拆分、引用合同金额按钮）

3. **生产文件校审与评分**：

 - **Decision**: `ProductionFile` 模型新增 `review_sheet_file_id`, `score`, `default_amount_reference` 字段
 - **Business Rule**: 方案PPT、初设、施工图必须上传校审单并填写评分；系统展示“引用合同金额”按钮以快速带出默认值
 - **Frontend**: `ProductionFileUpload` 组件新增校审单上传区、评分输入、金额默认提示

4. **对外委托与支付信息**：

 - **Decision**: 新建 `ExternalCommission` 实体，字段包含 `project_id`, `vendor_name`, `vendor_type (company/person)`, `score`, `contract_file_id`, `invoice_file_id`, `payment_amount`, `payment_date`, `notes`
 - **Integration**: 可与成本统计、奖金分配联动（如根据评分决定奖金比例）
 - **Frontend**: `ExternalCommissionForm` + `ExternalCommissionList` 组件，支持附件上传与支付信息展示

5. **生产成本与奖金联动**：

 - **Decision**: 生产成本沿用 `ProductionCost` 实体（用车、住宿、交通等），新增字段 `commission_id` 以便与外委记录关联
 - **Decision**: 生产奖金仍复用 Bonus 实体（bonus_type=production），但在生产页面提供快捷录入入口

上述新增实体需更新 data-model.md，并在 tasks.md 中拆解对应的后端/前端任务。

### Company Revenue Information Management (Updated 2025-11-19, 2025-01-28)

1. **User Story 4 Renamed**: From "财务信息管理与统计" to "公司收入信息管理" (Company Revenue Information Management)
2. **Focus Shift**: Emphasis on company-level revenue statistics and financial tracking
3. **Scope**: 
   - Project receivables, invoicing information, payment records
   - Management fee ratio
   - Bonus allocation (business and production bonuses)
   - Company-level revenue statistics and reporting
4. **Rationale**: Clarifies that this module focuses on company-wide financial overview rather than project-level financial details

### Management Fee Ratio Design (Updated 2025-01-28)

Based on clarification session (2025-01-28):

1. **Management Fee Ratio Storage Structure**:
   - **Decision**: Two-level storage - CompanyConfig table for company default, Project table for project-level override
   - **CompanyConfig Table** (NEW):
     - Fields: `id`, `config_key` (e.g., "default_management_fee_ratio"), `config_value` (float64), `description`, `created_at`, `updated_at`
     - Purpose: Store company-wide default management fee ratio
     - Access: Only finance/admin users can modify
   - **Project Table Enhancement**:
     - Add field: `management_fee_ratio *float64` (nullable, allows NULL to use company default)
     - Logic: If NULL, use company default; if set, use project-specific value
     - Rationale: Provides flexibility for projects that need different fee ratios while maintaining company-wide defaults
   - **Implementation**: 
     - Create `CompanyConfig` model in `backend/internal/models/company_config.go`
     - Add `ManagementFeeRatio *float64` field to `Project` model
     - Create migration to add field and create table
     - Add service methods to get effective management fee ratio (project value or company default)

2. **Management Fee Calculation Logic**:
   - **Base**: Management fee = Project Total Receivable Amount (sum of all fee types) × Management Fee Ratio
   - **Calculation Method**: 
     - Step 1: Sum all `ReceivableAmount` from FinancialRecords for the project (across all fee types: design_fee, survey_fee, consultation_fee)
     - Step 2: Get effective management fee ratio (project value if set, otherwise company default)
     - Step 3: Calculate: `ManagementFee = TotalReceivableAmount × ManagementFeeRatio`
   - **Unified Ratio**: Single ratio applied to total project receivable, NOT calculated per fee type or per record
   - **Rationale**: Simplifies management and aligns with business practice of applying management fee to total project revenue
   - **Implementation**: Add calculation method in `FinancialService` that:
     - Aggregates total receivable amount per project
     - Retrieves effective management fee ratio
     - Calculates and returns management fee amount

3. **Receivable Amount Display by Fee Type**:
   - **Requirement**: Display receivable amounts separately by fee type (design_fee, survey_fee, consultation_fee)
   - **Decision**: 
     - Financial record list shows fee type column with clear labels
     - Statistics and reports support filtering and grouping by fee type
     - Company-level statistics show breakdown by fee type
   - **Implementation**:
     - Frontend: Add fee type filter and grouping in FinancialList component
     - Backend: Enhance `GetProjectFinancial` to return `FeeTypeBreakdown` (already exists)
     - Reports: Include fee type breakdown in company revenue statistics
   - **Rationale**: Enables detailed financial tracking and analysis by fee type

4. **Management Fee Ratio Configuration**:
   - **Company Level**: 
     - Finance/admin users can set default management fee ratio in company configuration
     - Stored in CompanyConfig table
     - Applies to all projects that don't have project-specific ratio
   - **Project Level**:
     - Projects default to company ratio (NULL in Project.management_fee_ratio means use company default)
     - Finance users can override at project level
     - When project ratio is set, it overrides company default for that project only
   - **UI Flow**:
     - Company configuration page: Set default management fee ratio
     - Project financial page: Show current effective ratio, allow override
     - Display: Show "Using company default (X%)" or "Project-specific (X%)"
   - **Implementation**:
     - Add company configuration management endpoints
     - Add project-level management fee ratio field in project financial form
     - Update financial statistics to use effective ratio in calculations

### Business Information Requirements Optimization (Updated 2025-11-22)

Based on clarification session (2025-11-22):

1. **Business Manager and Personnel Dropdown Enhancement**:
   - **Requirement**: Support creating and editing users directly from dropdown menu
   - **Decision**: Dropdown menu provides "Create New User" button at bottom, opens modal for creation; editing triggered via dropdown action items (similar to client dropdown implementation)
   - **Implementation**: Add user management API endpoints (GET /users, POST /users, PUT /users/{id}) and integrate into ProjectBusinessForm component
   - **Rationale**: Consistent UX with existing client management pattern, improves workflow efficiency

2. **Contract Form Field Removal**:
   - **Requirement**: Remove contract file path field from contract creation form
   - **Decision**: Contract files managed separately through file management functionality
   - **Implementation**: Remove `file_path` field from ContractForm component and CreateContractRequest
   - **Rationale**: File paths should be managed through proper file upload mechanism, not manual input

3. **Expert Fee Payment Form Simplification**:
   - **Requirement**: Remove expert ID field from expert fee payment form
   - **Decision**: Only record expert name, remove expert_id field
   - **Implementation**: Remove `expert_id` field from ExpertFeePaymentForm and CreateExpertFeePaymentRequest
   - **Rationale**: Experts may not be system users, forcing user ID association is not practical

4. **Financial Record Edit and Delete Support**:
   - **Requirement**: Support editing and deleting financial records
   - **Decision**: 
     - All users with access to project business information can edit/delete (same permissions as create)
     - Delete requires confirmation dialog
     - Statistics automatically recalculated after delete
     - Editing allows modification of all business fields except system fields (created_at, id)
   - **Implementation**: Add PUT /financial-records/{id} and DELETE /financial-records/{id} endpoints
   - **Rationale**: Financial data may need correction, edit/delete functionality is necessary for data accuracy

5. **Bonus Record Edit and Delete Support**:
   - **Requirement**: Support editing and deleting bonus records
   - **Decision**: 
     - All users with access to project business information can edit/delete (same permissions as create)
     - Delete requires confirmation dialog
     - Bonus statistics automatically updated after delete
     - Editing allows modification of all business fields except system fields (created_at, id)
   - **Implementation**: Add PUT /bonuses/{id} and DELETE /bonuses/{id} endpoints
   - **Rationale**: Bonus allocation may need adjustment, edit/delete functionality provides necessary flexibility

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
