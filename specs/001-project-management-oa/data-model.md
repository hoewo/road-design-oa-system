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
5. **ProjectMember** - 项目成员实体
6. **File** - 文件实体
7. **FinancialRecord** - 财务记录实体
8. **Bonus** - 奖金实体

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
- ProjectName: 2-100字符，必填
- ProjectNumber: 唯一，格式：YYYY-XXX（年份-序号）
- StartDate: 不能晚于当前日期
- ProjectOverview: 最多1000字符

### 3. Client (甲方)

```go
type Client struct {
    ID          uint      `json:"id" gorm:"primaryKey"`
    ClientName  string    `json:"client_name" gorm:"not null"`
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
- ClientName: 2-100字符，必填
- ContactPhone: 11位手机号或固定电话格式
- Email: 有效的邮箱格式
- TaxNumber: 18位统一社会信用代码格式

### 4. Contract (合同)

```go
type Contract struct {
    ID              uint      `json:"id" gorm:"primaryKey"`
    ContractNumber  string    `json:"contract_number" gorm:"uniqueIndex;not null"`
    ContractType    string    `json:"contract_type" gorm:"not null"` // 设计费、勘察费、咨询费
    SignDate        time.Time `json:"sign_date" gorm:"not null"`
    ContractRate    float64   `json:"contract_rate"` // 合同费率%
    ContractAmount  float64   `json:"contract_amount" gorm:"not null"` // 合同金额
    FilePath        string    `json:"file_path"` // 合同文件路径
    
    // 关联关系
    ProjectID       uint      `json:"project_id" gorm:"not null"`
    Project         Project   `json:"project" gorm:"foreignKey:ProjectID"`
    
    CreatedAt       time.Time `json:"created_at"`
    UpdatedAt       time.Time `json:"updated_at"`
}
```

**Validation Rules**:
- ContractNumber: 唯一，格式：HT-YYYY-XXX
- ContractRate: 0-100之间的数值
- ContractAmount: 大于0的数值
- SignDate: 不能晚于当前日期

### 5. ProjectMember (项目成员)

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
    MemberRoleManager     MemberRole = "manager"     // 项目负责人
    MemberRoleDesigner    MemberRole = "designer"    // 专业设计人
    MemberRoleParticipant MemberRole = "participant" // 专业参与人
    MemberRoleReviewer    MemberRole = "reviewer"    // 专业复核人
    MemberRoleAuditor     MemberRole = "auditor"     // 审核、审定
)
```

**Validation Rules**:
- 同一项目同一角色只能有一个用户
- JoinDate: 不能晚于当前日期
- LeaveDate: 如果填写，必须晚于JoinDate

### 6. File (文件)

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
- FileType: 允许的文件类型列表
- OriginalName: 不能包含特殊字符

### 7. FinancialRecord (财务记录)

```go
type FinancialRecord struct {
    ID              uint      `json:"id" gorm:"primaryKey"`
    RecordType      FinancialType `json:"record_type" gorm:"not null"`
    Amount          float64   `json:"amount" gorm:"not null"`
    InvoiceNumber   string    `json:"invoice_number"`
    InvoiceDate     *time.Time `json:"invoice_date"`
    PaymentDate     *time.Time `json:"payment_date"`
    Description     string    `json:"description"`
    
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
```

**Validation Rules**:
- Amount: 大于0的数值
- InvoiceNumber: 发票号格式验证
- InvoiceDate: 不能晚于当前日期
- PaymentDate: 如果填写，不能早于InvoiceDate

### 8. Bonus (奖金)

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

-- 文件表索引
CREATE INDEX idx_files_project_id ON files(project_id);
CREATE INDEX idx_files_category ON files(category);
CREATE INDEX idx_files_uploader_id ON files(uploader_id);
CREATE INDEX idx_files_created_at ON files(created_at);

-- 财务记录表索引
CREATE INDEX idx_financial_records_project_id ON financial_records(project_id);
CREATE INDEX idx_financial_records_type ON financial_records(record_type);
CREATE INDEX idx_financial_records_invoice_date ON financial_records(invoice_date);
```

### Relationships

1. **User** 1:N **Project** (Manager)
2. **User** 1:N **ProjectMember** (Project Members)
3. **Client** 1:N **Project**
4. **Project** 1:N **Contract**
5. **Project** 1:N **File**
6. **Project** 1:N **FinancialRecord**
7. **Project** 1:N **Bonus**
8. **User** 1:N **File** (Uploader)
9. **User** 1:N **FinancialRecord** (Creator)
10. **User** 1:N **Bonus** (Recipient)

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
