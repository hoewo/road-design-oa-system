# Data Model: 项目管理OA系统

**Feature**: 001-project-management-oa  
**Date**: 2025-01-27  
**Purpose**: 定义系统的数据模型和实体关系

## Entity Overview

基于功能规格说明，系统包含以下核心实体：

1. **User** - 用户实体
2. **Project** - 项目实体
3. **Client** - 甲方实体
4. **Contract** - 合同实体
5. **ContractAmendment** - 合同补充协议实体（新增）
6. **ProjectMember** - 项目成员实体
7. **ExpertFeePayment** - 专家费支付实体（新增）
8. **File** - 文件实体
9. **FinancialRecord** - 财务记录实体
10. **Bonus** - 奖金实体
11. **CompanyConfig** - 公司配置实体（新增，2025-01-28）

## Detailed Entity Models

### 1. User (用户)

```go
type User struct {
    ID          uint      `json:"id" gorm:"primaryKey"`
    Username    string    `json:"username" gorm:"uniqueIndex;not null"`
    Email       string    `json:"email" gorm:"uniqueIndex;not null"`
    Password    string    `json:"-" gorm:"not null"`
    RealName    string    `json:"real_name" gorm:"not null"`
    Role        UserRole  `json:"role" gorm:"not null"`
    Department  string    `json:"department"`
    Phone       string    `json:"phone"`
    IsActive    bool      `json:"is_active" gorm:"default:true"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}

type UserRole string

const (
    RoleAdmin        UserRole = "admin"        // 系统管理员
    RoleManager      UserRole = "manager"      // 项目经理
    RoleBusiness     UserRole = "business"     // 经营人员
    RoleDesigner     UserRole = "designer"     // 设计人员
    RoleReviewer     UserRole = "reviewer"     // 复核人员
    RoleFinance      UserRole = "finance"      // 财务人员
)
```

**Validation Rules**:
- Username: 3-20字符，只能包含字母、数字、下划线
- Email: 有效的邮箱格式
- Password: 最少8位，包含字母和数字
- RealName: 2-10个中文字符

### 2. Project (项目)

```go
type Project struct {
    ID              uint      `json:"id" gorm:"primaryKey"`
    ProjectName     string    `json:"project_name" gorm:"not null"`
    ProjectNumber   string    `json:"project_number" gorm:"uniqueIndex;not null"`
    StartDate       time.Time `json:"start_date" gorm:"not null"`
    ProjectOverview string    `json:"project_overview" gorm:"type:text"`
    DrawingUnit     string    `json:"drawing_unit"`
    Status          ProjectStatus `json:"status" gorm:"default:'planning'"`
    ManagementFeeRatio *float64 `json:"management_fee_ratio"` // 管理费比例（可选，NULL表示使用公司默认值）
    
    // 关联关系
    ClientID        uint      `json:"client_id"`
    Client          Client    `json:"client" gorm:"foreignKey:ClientID"`
    
    ManagerID       uint      `json:"manager_id"`
    Manager         User      `json:"manager" gorm:"foreignKey:ManagerID"`
    
    // 关联数据
    Contracts       []Contract       `json:"contracts" gorm:"foreignKey:ProjectID"`
    Members         []ProjectMember  `json:"members" gorm:"foreignKey:ProjectID"`
    Files           []File           `json:"files" gorm:"foreignKey:ProjectID"`
    FinancialRecords []FinancialRecord `json:"financial_records" gorm:"foreignKey:ProjectID"`
    Bonuses         []Bonus          `json:"bonuses" gorm:"foreignKey:ProjectID"`
    
    CreatedAt       time.Time `json:"created_at"`
    UpdatedAt       time.Time `json:"updated_at"`
}

type ProjectStatus string

const (
    StatusPlanning    ProjectStatus = "planning"    // 规划中
    StatusBidding     ProjectStatus = "bidding"     // 招投标
    StatusContract    ProjectStatus = "contract"    // 合同签订
    StatusProduction  ProjectStatus = "production"  // 生产中
    StatusCompleted   ProjectStatus = "completed"   // 已完成
    StatusCancelled   ProjectStatus = "cancelled"   // 已取消
)
```

**Validation Rules**:
- ProjectName: 2-100字符，**必填**（核心字段）
- ProjectNumber: 唯一，格式：YYYY-XXX（年份-序号），**必填**（核心字段）
- StartDate: 可选，如果填写则不能晚于当前日期
- ProjectOverview: 可选，最多1000字符
- DrawingUnit: 可选
- Status: 可选，默认为"planning"
- ClientID: **不在项目创建时填写**，统一在项目经营信息中管理（可选，最多关联一个）
- ManagerID: 可选

**Business Rules** (Updated 2025-11-19):
- **Client Association**: Client information is NOT part of project creation. It is managed separately in project business information module
- **Client Relationship**: Each project can have at most one associated client (can be empty)
- **Client Management**: Users can select existing clients or create new clients in business information module
- **Client Changeability**: Users can change or remove client association after it's set

### 3. Client (甲方)

```go
type Client struct {
    ID          uint      `json:"id" gorm:"primaryKey"`
    ClientName  string    `json:"client_name" gorm:"uniqueIndex;not null"`
    ContactName string    `json:"contact_name"`
    ContactPhone string   `json:"contact_phone"`
    Email       string    `json:"email"`
    Address     string    `json:"address"`
    TaxNumber   string    `json:"tax_number"`
    BankAccount string    `json:"bank_account"`
    BankName    string    `json:"bank_name"`
    IsActive    bool      `json:"is_active" gorm:"default:true"`
    
    // 关联关系
    Projects    []Project `json:"projects" gorm:"foreignKey:ClientID"`
    
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}
```

**Validation Rules**:
- ClientName: 2-100字符，必填，**唯一**（数据库唯一索引 + 应用层验证）
- ContactPhone: 11位手机号或固定电话格式（可选）
- Email: 有效的邮箱格式（可选）
- TaxNumber: 18位统一社会信用代码格式（可选）

**Business Rules** (Updated 2025-11-19):
- **唯一性约束**: 甲方名称必须唯一，创建时自动检测重复并阻止
- **删除保护**: 如果甲方已被项目使用，不允许删除；未使用的甲方可以硬删除
- **维护方式**: 在项目经营信息模块中管理，支持选择已有甲方或创建新甲方
- **管理位置**: 不在项目创建表单中，统一在项目经营信息模块中管理
- **关联规则**: 每个项目最多关联一个甲方（可以为空），可以更换或删除关联
- **可选性**: 甲方信息在项目经营信息中是可选的，允许不填写

### 4. Contract (合同)

```go
type Contract struct {
    ID              uint      `json:"id" gorm:"primaryKey"`
    ContractNumber  string    `json:"contract_number" gorm:"uniqueIndex;not null"`
    ContractType    string    `json:"contract_type" gorm:"not null"` // 设计费、勘察费、咨询费
    SignDate        time.Time `json:"sign_date" gorm:"not null"`
    ContractRate    float64   `json:"contract_rate"` // 合同费率%
    ContractAmount  float64   `json:"contract_amount" gorm:"not null"` // 合同金额（应等于设计费+勘察费+咨询费之和）
    DesignFee       float64   `json:"design_fee"` // 设计费
    SurveyFee       float64   `json:"survey_fee"` // 勘察费
    ConsultationFee float64  `json:"consultation_fee"` // 咨询费
    FilePath        string    `json:"file_path"` // 合同文件路径
    
    // 关联关系
    ProjectID       uint      `json:"project_id" gorm:"not null"`
    Project         Project   `json:"project" gorm:"foreignKey:ProjectID"`
    
    // 关联数据
    Amendments      []ContractAmendment `json:"amendments" gorm:"foreignKey:ContractID"`
    
    CreatedAt       time.Time `json:"created_at"`
    UpdatedAt       time.Time `json:"updated_at"`
}
```

**Validation Rules**:
- ContractNumber: 唯一，格式：HT-YYYY-XXX
- ContractRate: 0-100之间的数值
- ContractAmount: 大于0的数值，应等于DesignFee + SurveyFee + ConsultationFee
- DesignFee, SurveyFee, ConsultationFee: 大于等于0的数值
- SignDate: 不能晚于当前日期

### 4a. ContractAmendment (合同补充协议)

```go
type ContractAmendment struct {
    ID              uint      `json:"id" gorm:"primaryKey"`
    AmendmentNumber string    `json:"amendment_number" gorm:"uniqueIndex;not null"`
    SignDate        time.Time `json:"sign_date" gorm:"not null"`
    FilePath        string    `json:"file_path"` // 补充协议文件路径
    Description     string    `json:"description" gorm:"type:text"`
    
    // 关联关系
    ContractID      uint      `json:"contract_id" gorm:"not null"`
    Contract        Contract  `json:"contract" gorm:"foreignKey:ContractID"`
    
    CreatedAt       time.Time `json:"created_at"`
    UpdatedAt       time.Time `json:"updated_at"`
}
```

**Validation Rules**:
- AmendmentNumber: 唯一，格式：XIE-YYYY-XXX
- SignDate: 不能晚于当前日期，不能早于主合同签订日期
- FilePath: 必填，文件必须存在

### 5. ExpertFeePayment (专家费支付)

```go
type ExpertFeePayment struct {
    ID            uint          `json:"id" gorm:"primaryKey"`
    PaymentMethod PaymentMethod `json:"payment_method" gorm:"not null"` // 支付方式
    Amount        float64       `json:"amount" gorm:"not null"` // 金额
    ExpertName    string        `json:"expert_name" gorm:"not null"` // 专家姓名
    ExpertID      *uint         `json:"expert_id"` // 专家用户ID（如果是系统内用户）
    Expert         *User         `json:"expert,omitempty" gorm:"foreignKey:ExpertID"`
    Description   string        `json:"description" gorm:"type:text"`
    
    // 关联关系
    ProjectID     uint      `json:"project_id" gorm:"not null"`
    Project       Project   `json:"project" gorm:"foreignKey:ProjectID"`
    
    CreatedByID   uint      `json:"created_by_id" gorm:"not null"`
    CreatedBy     User      `json:"created_by" gorm:"foreignKey:CreatedByID"`
    
    CreatedAt     time.Time `json:"created_at"`
    UpdatedAt     time.Time `json:"updated_at"`
}

type PaymentMethod string

const (
    PaymentMethodCash     PaymentMethod = "cash"     // 现金
    PaymentMethodTransfer PaymentMethod = "transfer" // 转账
)
```

**Validation Rules**:
- Amount: 大于0的数值
- ExpertName: 必填，2-50字符
- PaymentMethod: 必须是cash或transfer
- ExpertID: 可选，如果填写则必须是有效的用户ID

### 6. ProjectMember (项目成员)

```go
type ProjectMember struct {
    ID          uint      `json:"id" gorm:"primaryKey"`
    ProjectID   uint      `json:"project_id" gorm:"not null"`
    UserID      uint      `json:"user_id" gorm:"not null"`
    Role        MemberRole `json:"role" gorm:"not null"`
    JoinDate    time.Time `json:"join_date" gorm:"not null"`
    LeaveDate   *time.Time `json:"leave_date"`
    IsActive    bool      `json:"is_active" gorm:"default:true"`
    
    // 关联关系
    Project     Project   `json:"project" gorm:"foreignKey:ProjectID"`
    User        User      `json:"user" gorm:"foreignKey:UserID"`
    
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}

type MemberRole string

const (
    MemberRoleManager          MemberRole = "manager"          // 项目负责人
    MemberRoleDesigner         MemberRole = "designer"         // 专业设计人
    MemberRoleParticipant       MemberRole = "participant"      // 专业参与人
    MemberRoleReviewer          MemberRole = "reviewer"        // 专业复核人
    MemberRoleAuditor           MemberRole = "auditor"          // 审核、审定
    MemberRoleBusinessManager  MemberRole = "business_manager"  // 经营负责人（新增）
    MemberRoleBusinessPersonnel MemberRole = "business_personnel" // 经营人员（新增）
)
```

**Validation Rules** (Updated 2025-01-28):
- **一人多角色支持**: 同一用户在同一项目中可以有多个角色（通过多条ProjectMember记录实现）
- **角色唯一性**: 同一项目同一角色只能有一个用户（保持原有约束）
- JoinDate: 不能晚于当前日期
- LeaveDate: 如果填写，必须晚于JoinDate
- **业务规则**: 经营负责人和经营人员通过项目成员系统管理，在项目经营信息模块中配置

### 7. File (文件)

```go
type File struct {
    ID          uint      `json:"id" gorm:"primaryKey"`
    FileName    string    `json:"file_name" gorm:"not null"`
    OriginalName string   `json:"original_name" gorm:"not null"`
    FilePath    string    `json:"file_path" gorm:"not null"`
    FileSize    int64     `json:"file_size" gorm:"not null"`
    FileType    string    `json:"file_type" gorm:"not null"`
    MimeType    string    `json:"mime_type" gorm:"not null"`
    Category    FileCategory `json:"category" gorm:"not null"`
    Description string    `json:"description"`
    
    // 关联关系
    ProjectID   uint      `json:"project_id" gorm:"not null"`
    Project     Project   `json:"project" gorm:"foreignKey:ProjectID"`
    
    UploaderID  uint      `json:"uploader_id" gorm:"not null"`
    Uploader    User      `json:"uploader" gorm:"foreignKey:UploaderID"`
    
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}

type FileCategory string

const (
    FileCategoryContract     FileCategory = "contract"     // 合同文件
    FileCategoryBidding      FileCategory = "bidding"      // 招投标文件
    FileCategoryDesign       FileCategory = "design"       // 设计文件
    FileCategoryAudit        FileCategory = "audit"        // 审计文件
    FileCategoryProduction   FileCategory = "production"   // 生产文件
    FileCategoryOther        FileCategory = "other"        // 其他文件
)
```

**Validation Rules**:
- FileSize: 最大100MB
- FileType: 仅限制危险文件类型（可执行文件、脚本文件等），其他文件类型均允许上传
  - **禁止的文件类型**: `.exe`, `.bat`, `.cmd`, `.com`, `.pif`, `.scr`, `.vbs`, `.js`, `.jar`, `.sh`, `.ps1`, `.app`, `.dmg`, `.deb`, `.rpm`, `.msi`, `.apk`, `.ipa`
  - **允许的文件类型**: 除上述危险类型外的所有文件类型（如：pdf, doc, docx, xls, xlsx, ppt, pptx, dwg, dxf, md, txt, jpg, jpeg, png, zip, rar等）
- OriginalName: 不能包含特殊字符

### 8. FinancialRecord (财务记录)

```go
type FinancialRecord struct {
    ID              uint          `json:"id" gorm:"primaryKey"`
    RecordType      FinancialType `json:"record_type" gorm:"not null"`
    FeeType         FeeType       `json:"fee_type" gorm:"not null"` // 费用类型（新增）
    ReceivableAmount float64      `json:"receivable_amount"` // 应收金额
    InvoiceNumber   string        `json:"invoice_number"`
    InvoiceDate     *time.Time    `json:"invoice_date"` // 开票时间
    InvoiceAmount   float64       `json:"invoice_amount"` // 开票金额
    PaymentDate     *time.Time    `json:"payment_date"` // 支付时间
    PaymentAmount   float64       `json:"payment_amount"` // 支付金额
    UnpaidAmount    float64       `json:"unpaid_amount"` // 未收金额（计算字段）
    Description     string        `json:"description"`
    
    // 关联关系
    ProjectID       uint      `json:"project_id" gorm:"not null"`
    Project         Project   `json:"project" gorm:"foreignKey:ProjectID"`
    
    CreatedByID     uint      `json:"created_by_id" gorm:"not null"`
    CreatedBy       User      `json:"created_by" gorm:"foreignKey:CreatedByID"`
    
    CreatedAt       time.Time `json:"created_at"`
    UpdatedAt       time.Time `json:"updated_at"`
}

type FinancialType string

const (
    FinancialTypeReceivable  FinancialType = "receivable"  // 应收金额
    FinancialTypeInvoice     FinancialType = "invoice"     // 开票金额
    FinancialTypePayment     FinancialType = "payment"     // 支付金额
    FinancialTypeExpense     FinancialType = "expense"     // 费用支出
)

type FeeType string

const (
    FeeTypeDesign       FeeType = "design_fee"       // 设计费（新增）
    FeeTypeSurvey       FeeType = "survey_fee"       // 勘察费（新增）
    FeeTypeConsultation FeeType = "consultation_fee" // 咨询费（新增）
)
```

**Validation Rules** (Updated 2025-01-28):
- ReceivableAmount: 大于0的数值
- InvoiceAmount: 大于等于0的数值，不能超过ReceivableAmount
- PaymentAmount: 大于等于0的数值，不能超过ReceivableAmount
- UnpaidAmount: 自动计算为 ReceivableAmount - PaymentAmount
- InvoiceNumber: 发票号格式验证（可选）
- InvoiceDate: 不能晚于当前日期（可选）
- PaymentDate: 如果填写，不能早于InvoiceDate（可选）
- **按费用类型分别记录**: 每个费用类型（设计费、勘察费、咨询费）应创建独立的财务记录

### 9. Bonus (奖金)

```go
type Bonus struct {
    ID          uint      `json:"id" gorm:"primaryKey"`
    BonusType   BonusType `json:"bonus_type" gorm:"not null"`
    Amount      float64   `json:"amount" gorm:"not null"`
    Description string    `json:"description"`
    
    // 关联关系
    ProjectID   uint      `json:"project_id" gorm:"not null"`
    Project     Project   `json:"project" gorm:"foreignKey:ProjectID"`
    
    UserID      uint      `json:"user_id" gorm:"not null"`
    User        User      `json:"user" gorm:"foreignKey:UserID"`
    
    CreatedByID uint      `json:"created_by_id" gorm:"not null"`
    CreatedBy   User      `json:"created_by" gorm:"foreignKey:CreatedByID"`
    
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}

type BonusType string

const (
    BonusTypeBusiness BonusType = "business" // 经营奖金
    BonusTypeProduction BonusType = "production" // 生产奖金
)
```

**Validation Rules**:
- Amount: 大于等于0的数值
- 同一用户同一项目同一类型奖金只能有一条记录

### 10. CompanyConfig (公司配置) (新增 2025-01-28)

```go
type CompanyConfig struct {
    ID          uint      `json:"id" gorm:"primaryKey"`
    ConfigKey   string    `json:"config_key" gorm:"uniqueIndex;not null"` // 配置键（如：default_management_fee_ratio）
    ConfigValue string    `json:"config_value" gorm:"not null"` // 配置值（JSON字符串或简单值）
    Description string    `json:"description" gorm:"type:text"` // 配置说明
    CreatedByID uint      `json:"created_by_id" gorm:"not null"`
    CreatedBy   User      `json:"created_by" gorm:"foreignKey:CreatedByID"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}
```

**Validation Rules**:
- ConfigKey: 唯一，不能为空
- ConfigValue: 不能为空
- 常用配置键：
  - `default_management_fee_ratio`: 默认管理费比例（float64，范围0-1，如0.15表示15%）

**Usage**:
- 存储公司级别的默认配置信息
- 管理费比例：如果Project.management_fee_ratio为NULL，则使用CompanyConfig中default_management_fee_ratio的值
- 只有财务人员和管理员可以修改公司配置

## Database Schema

### Indexes

```sql
-- 用户表索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- 项目表索引
CREATE INDEX idx_projects_number ON projects(project_number);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_manager_id ON projects(manager_id);
CREATE INDEX idx_projects_start_date ON projects(start_date);

-- 合同表索引
CREATE INDEX idx_contracts_number ON contracts(contract_number);
CREATE INDEX idx_contracts_project_id ON contracts(project_id);
CREATE INDEX idx_contracts_sign_date ON contracts(sign_date);

-- 合同补充协议表索引
CREATE INDEX idx_contract_amendments_number ON contract_amendments(amendment_number);
CREATE INDEX idx_contract_amendments_contract_id ON contract_amendments(contract_id);
CREATE INDEX idx_contract_amendments_sign_date ON contract_amendments(sign_date);

-- 专家费支付表索引
CREATE INDEX idx_expert_fee_payments_project_id ON expert_fee_payments(project_id);
CREATE INDEX idx_expert_fee_payments_expert_id ON expert_fee_payments(expert_id);
CREATE INDEX idx_expert_fee_payments_payment_method ON expert_fee_payments(payment_method);

-- 项目成员表索引
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_project_members_role ON project_members(role);
CREATE UNIQUE INDEX idx_project_members_project_user_role ON project_members(project_id, user_id, role);

-- 文件表索引
CREATE INDEX idx_files_project_id ON files(project_id);
CREATE INDEX idx_files_category ON files(category);
CREATE INDEX idx_files_uploader_id ON files(uploader_id);
CREATE INDEX idx_files_created_at ON files(created_at);

-- 财务记录表索引
CREATE INDEX idx_financial_records_project_id ON financial_records(project_id);
CREATE INDEX idx_financial_records_type ON financial_records(record_type);
CREATE INDEX idx_financial_records_fee_type ON financial_records(fee_type);
CREATE INDEX idx_financial_records_invoice_date ON financial_records(invoice_date);
CREATE INDEX idx_financial_records_payment_date ON financial_records(payment_date);

-- 奖金表索引
CREATE INDEX idx_bonuses_project_id ON bonuses(project_id);
CREATE INDEX idx_bonuses_user_id ON bonuses(user_id);
CREATE INDEX idx_bonuses_type ON bonuses(bonus_type);
```

### Relationships

1. **User** 1:N **Project** (Manager)
2. **User** 1:N **ProjectMember** (Project Members) - 支持一人多角色
3. **Client** 1:N **Project**
4. **Project** 1:N **Contract**
5. **Contract** 1:N **ContractAmendment** (主合同与补充协议)
6. **Project** 1:N **ExpertFeePayment** (项目与专家费支付)
7. **Project** 1:N **File**
8. **Project** 1:N **FinancialRecord** (按费用类型分别记录)
9. **Project** 1:N **Bonus**
10. **User** 1:N **File** (Uploader)
11. **User** 1:N **FinancialRecord** (Creator)
12. **User** 1:N **Bonus** (Recipient)
13. **User** 0..1:N **ExpertFeePayment** (Expert, 如果是系统内用户)

## Data Validation Rules

### Business Rules

1. **项目状态流转**: 项目状态必须按照预定义的流程流转
2. **财务数据一致性**: 应收金额 = 开票金额 + 未收金额
3. **文件权限**: 用户只能访问有权限的项目文件
4. **奖金分配**: 奖金总额不能超过项目利润的一定比例
5. **合同金额**: 合同金额必须与项目预算匹配

### Data Integrity

1. **外键约束**: 所有外键关系都有数据库约束
2. **唯一性约束**: 项目编号、合同编号等业务唯一字段
3. **非空约束**: 必填字段都有非空约束
4. **检查约束**: 金额、日期等字段有范围检查

## Migration Strategy

1. **初始迁移**: 创建所有表和索引
2. **数据迁移**: 从Excel文件导入初始数据
3. **索引优化**: 根据查询模式优化索引
4. **分区策略**: 大表考虑按时间分区
