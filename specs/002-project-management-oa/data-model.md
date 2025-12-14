# Data Model: 道路设计公司项目管理系统

**Feature**: 002-project-management-oa  
**Date**: 2025-01-28  
**Purpose**: 定义系统的数据模型和实体关系

## Entity Overview

基于功能规格说明和业务模型设计，系统包含以下核心实体：

1. **User** - 用户实体（统一账号、经营人员、生产人员）
2. **Project** - 项目实体
3. **Client** - 甲方实体（仅包含甲方基本信息，不包含联系人信息）
4. **ProjectContact** - 项目联系人实体（甲方在特定项目中的联系人，作为独立实体存在）
5. **BiddingInfo** - 招投标信息实体
6. **Contract** - 合同实体
7. **ContractAmendment** - 合同补充协议实体
8. **FinancialRecord** - 财务记录实体（统一所有财务相关业务）
9. **ProductionApproval** - 批复审计信息实体
10. **ProductionFile** - 生产阶段文件实体
11. **ExternalCommission** - 对外委托实体
12. **File** - 文件实体
13. **Discipline** - 专业字典实体
14. **ProjectMember** - 项目成员实体（项目与用户的关联）

## Detailed Entity Models

### 1. User (用户)

```go
type User struct {
    ID          string    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
    Username    string    `json:"username" gorm:"uniqueIndex;not null"`
    Email       string    `json:"email" gorm:"uniqueIndex;not null"`
    Password    string    `json:"-" gorm:"not null"`
    RealName    string    `json:"real_name" gorm:"not null"`
    Phone       string    `json:"phone"`
    Department  string    `json:"department"`
    IsActive    bool      `json:"is_active" gorm:"default:true"`
    HasAccount  bool      `json:"has_account" gorm:"default:false"` // 是否有账号
    Roles       pq.StringArray `json:"roles" gorm:"type:text[]"` // 账号权限角色（支持多选）
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}

type UserRole string

const (
    RoleAdmin        UserRole = "admin"        // 系统管理员
    RoleProjectManager UserRole = "project_manager" // 项目管理员
    RoleBusinessManager UserRole = "business_manager" // 经营负责人
    RoleProductionManager UserRole = "production_manager" // 生产负责人
    RoleFinance      UserRole = "finance"      // 财务人员
    RoleMember       UserRole = "member"       // 普通成员
)
```

**Validation Rules**:
- Username: 3-20字符，只能包含字母、数字、下划线
- Email: 有效的邮箱格式
- Password: 最少8位，包含字母和数字（仅当HasAccount=true时）
- RealName: 2-10个中文字符
- Roles: 至少包含一个角色，角色值必须是有效的UserRole常量
- ID: UUID v4格式（从Header中读取的X-User-ID格式）

**Business Rules**:
- 用户是否有账号取决于管理员的配置（HasAccount字段）
- 有账号的用户可以登录系统，有不同的权限（Roles字段，支持多选）
- 用户角色支持多选，一个用户可以同时拥有多个角色（如：项目管理员+经营负责人）
- 系统管理员具备所有角色类型的权限，其他角色只有自己角色的权限
- 如果用户是系统管理员，角色不能修改
- 用户可以在项目中担任不同角色（通过ProjectMember关联）
- 用户ID使用UUID格式，与网关注入的X-User-ID格式一致
- 项目中关于人的配置，如果是选择的系统已有用户，应该只能选择有对应角色权限的用户

### 2. Project (项目)

```go
type Project struct {
    ID              string    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
    ProjectName     string    `json:"project_name" gorm:"not null"`
    ProjectNumber   string    `json:"project_number" gorm:"uniqueIndex;not null"`
    StartDate       *time.Time `json:"start_date"`
    ProjectOverview string    `json:"project_overview" gorm:"type:text"`
    DrawingUnit     string    `json:"drawing_unit"`
    Status          ProjectStatus `json:"status" gorm:"default:'planning'"`
    IsDeleted       bool      `json:"is_deleted" gorm:"default:false"` // 软删除标记
    
    // 负责人配置
    BusinessManagerID *string `json:"business_manager_id" gorm:"type:uuid"`
    BusinessManager    *User   `json:"business_manager,omitempty" gorm:"foreignKey:BusinessManagerID"`
    ProductionManagerID *string `json:"production_manager_id" gorm:"type:uuid"`
    ProductionManager   *User   `json:"production_manager,omitempty" gorm:"foreignKey:ProductionManagerID"`
    
    // 关联数据
    ClientID        *string  `json:"client_id" gorm:"type:uuid"`
    Client          *Client  `json:"client,omitempty" gorm:"foreignKey:ClientID"`
    
    // 项目联系人（一对一关系，可选）
    ProjectContact  *ProjectContact `json:"project_contact,omitempty" gorm:"foreignKey:ProjectID"`
    
    Members         []ProjectMember `json:"members" gorm:"foreignKey:ProjectID"`
    Contracts       []Contract      `json:"contracts" gorm:"foreignKey:ProjectID"`
    BiddingInfo     *BiddingInfo    `json:"bidding_info,omitempty" gorm:"foreignKey:ProjectID"`
    FinancialRecords []FinancialRecord `json:"financial_records" gorm:"foreignKey:ProjectID"`
    ProductionFiles []ProductionFile `json:"production_files" gorm:"foreignKey:ProjectID"`
    ProductionApprovals []ProductionApproval `json:"production_approvals" gorm:"foreignKey:ProjectID"`
    ExternalCommissions []ExternalCommission `json:"external_commissions" gorm:"foreignKey:ProjectID"`
    Files           []File           `json:"files" gorm:"foreignKey:ProjectID"`
    
    CreatedAt       time.Time `json:"created_at"`
    UpdatedAt       time.Time `json:"updated_at"`
}

type ProjectStatus string

const (
    StatusPlanning    ProjectStatus = "planning"    // 规划中
    StatusBidding     ProjectStatus = "bidding"     // 招投标
    StatusContract    ProjectStatus = "contract"     // 合同签订
    StatusProduction  ProjectStatus = "production"  // 生产中
    StatusCompleted   ProjectStatus = "completed"   // 已完成
    StatusCancelled   ProjectStatus = "cancelled"   // 已取消
)
```

**Validation Rules**:
- ProjectName: 2-100字符，**必填**
- ProjectNumber: 唯一，格式：YYYY-XXX（年份-序号），**必填**
- StartDate: 可选，如果填写则不能晚于当前日期
- ProjectOverview: 可选，最多1000字符
- DrawingUnit: 可选
- Status: 可选，默认为"planning"
- ClientID: 可选，在项目经营信息中管理
- ID: UUID v4格式

**Business Rules**:
- 项目编号唯一性约束（数据库唯一索引 + 应用层验证）
- 软删除策略：删除项目时仅标记IsDeleted=true，保留所有关联数据
- 只有admin可以彻底删除项目（硬删除）
- 经营负责人和生产负责人在项目基本信息中配置
- 甲方信息在项目经营信息中管理，不在项目创建时填写

### 3. Client (甲方)

```go
type Client struct {
    ID          string    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
    ClientName  string    `json:"client_name" gorm:"uniqueIndex;not null"`
    Email       string    `json:"email"`
    Address     string    `json:"address"`
    TaxNumber   string    `json:"tax_number"`
    BankAccount string    `json:"bank_account"`
    BankName    string    `json:"bank_name"`
    IsActive    bool      `json:"is_active" gorm:"default:true"`
    
    // 关联关系
    Projects         []Project        `json:"projects" gorm:"foreignKey:ClientID"`
    ProjectContacts  []ProjectContact `json:"project_contacts" gorm:"foreignKey:ClientID"`
    
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}
```

**Validation Rules**:
- ClientName: 2-100字符，必填，**唯一**（数据库唯一索引 + 应用层验证）
- Email: 有效的邮箱格式（可选）
- TaxNumber: 18位统一社会信用代码格式（可选）
- ID: UUID v4格式

**Business Rules**:
- 甲方名称必须唯一，创建时自动检测重复并阻止
- 如果甲方已被项目使用，不允许删除；未使用的甲方可以硬删除
- 在项目经营信息模块中管理，支持选择已有甲方或创建新甲方
- 每个项目最多关联一个甲方（可以为空），可以更换或删除关联
- **重要**：甲方实体不包含联系人信息，联系人信息通过ProjectContact实体管理

### 4. ProjectContact (项目联系人)

```go
type ProjectContact struct {
    ID          string    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
    ProjectID   string    `json:"project_id" gorm:"type:uuid;not null;uniqueIndex"`
    Project     Project   `json:"project" gorm:"foreignKey:ProjectID"`
    
    // 关联甲方
    ClientID    *string   `json:"client_id" gorm:"type:uuid"`
    Client      *Client   `json:"client,omitempty" gorm:"foreignKey:ClientID"`
    
    ContactName string    `json:"contact_name" gorm:"not null"` // 联系人姓名
    ContactPhone string  `json:"contact_phone"` // 联系人电话
    
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}
```

**Validation Rules**:
- ProjectID: 必填，必须是有效的项目ID
- ClientID: 可选，如果填写则必须是有效的甲方ID
- ContactName: 2-50字符，必填
- ContactPhone: 11位手机号或固定电话格式（可选）
- 一个项目只能有一个项目联系人（uniqueIndex约束）
- ID: UUID v4格式

**Business Rules**:
- 项目联系人与项目一对一关系
- 项目联系人关联到项目的甲方（ClientID），便于直接查询和关联
- 项目联系人实体与甲方实体分离，但通过ClientID建立关联关系
- 相同甲方在不同项目中可以有不同的项目联系人实体
- 修改一个项目的联系人信息不会影响其他项目
- 当用户为项目关联甲方时，可以同时创建项目联系人实体并关联到该甲方
- 如果用户只关联甲方但未填写联系人信息，可以不创建项目联系人实体，或创建但联系人信息为空
- ClientID应该与Project.ClientID保持一致，确保数据一致性

### 5. BiddingInfo (招投标信息)

```go
type BiddingInfo struct {
    ID              string    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
    ProjectID       string    `json:"project_id" gorm:"type:uuid;not null;uniqueIndex"`
    Project         Project   `json:"project" gorm:"foreignKey:ProjectID"`
    
    // 招投标文件（通过File实体关联）
    TenderFileID    *string   `json:"tender_file_id" gorm:"type:uuid"`
    TenderFile      *File     `json:"tender_file,omitempty" gorm:"foreignKey:TenderFileID"`
    BidFileID       *string   `json:"bid_file_id" gorm:"type:uuid"`
    BidFile         *File     `json:"bid_file,omitempty" gorm:"foreignKey:BidFileID"`
    AwardNoticeFileID *string `json:"award_notice_file_id" gorm:"type:uuid"`
    AwardNoticeFile *File     `json:"award_notice_file,omitempty" gorm:"foreignKey:AwardNoticeFileID"`
    
    // 专家费支付（通过FinancialRecord关联，financial_type=expert_fee）
    // 不在此实体中直接存储，通过ProjectID和FinancialType查询
    
    CreatedAt       time.Time `json:"created_at"`
    UpdatedAt       time.Time `json:"updated_at"`
}
```

**Validation Rules**:
- ProjectID: 必填，必须是有效的项目ID
- 一个项目只能有一条招投标信息（uniqueIndex约束）

**Business Rules**:
- 招投标信息与项目一对一关系
- 专家费支付通过FinancialRecord实体管理（financial_type=expert_fee）
- 文件通过File实体关联，支持上传、下载、删除

### 6. Contract (合同)

```go
type Contract struct {
    ID              string    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
    ContractNumber  string    `json:"contract_number" gorm:"uniqueIndex;not null"`
    ProjectID       string    `json:"project_id" gorm:"type:uuid;not null"`
    Project         Project   `json:"project" gorm:"foreignKey:ProjectID"`
    
    SignDate        time.Time `json:"sign_date" gorm:"not null"`
    ContractRate    float64   `json:"contract_rate"` // 合同费率%
    
    // 合同金额明细（按设计费、勘察费、咨询费分别录入）
    DesignFee       float64   `json:"design_fee" gorm:"not null;default:0"` // 设计费（元）
    SurveyFee       float64   `json:"survey_fee" gorm:"not null;default:0"` // 勘察费（元）
    ConsultationFee float64   `json:"consultation_fee" gorm:"not null;default:0"` // 咨询费（元）
    ContractAmount  float64   `json:"contract_amount" gorm:"not null"` // 合同总金额（应等于设计费+勘察费+咨询费之和）
    
    // 合同文件（通过File实体关联）
    ContractFileID  *string   `json:"contract_file_id" gorm:"type:uuid"`
    ContractFile    *File     `json:"contract_file,omitempty" gorm:"foreignKey:ContractFileID"`
    
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

**Business Rules**:
- 合同金额必须明确包含设计费、勘察费、咨询费等明细
- 合同总金额应等于各项费用之和
- 合同文件通过文件管理功能单独上传和管理
- 支持补充协议（通过ContractAmendment关联）

### 7. ContractAmendment (合同补充协议)

```go
type ContractAmendment struct {
    ID              string    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
    AmendmentNumber string    `json:"amendment_number" gorm:"uniqueIndex;not null"`
    ContractID      string    `json:"contract_id" gorm:"type:uuid;not null"`
    Contract        Contract  `json:"contract" gorm:"foreignKey:ContractID"`
    
    SignDate        time.Time `json:"sign_date" gorm:"not null"`
    ContractRate    float64   `json:"contract_rate"` // 合同费率%
    
    // 补充协议金额明细（按设计费、勘察费、咨询费分别录入）
    DesignFee       float64   `json:"design_fee" gorm:"not null;default:0"` // 设计费（元）
    SurveyFee       float64   `json:"survey_fee" gorm:"not null;default:0"` // 勘察费（元）
    ConsultationFee float64   `json:"consultation_fee" gorm:"not null;default:0"` // 咨询费（元）
    AmendmentAmount float64   `json:"amendment_amount" gorm:"not null"` // 补充协议总金额
    
    // 补充协议文件（通过File实体关联）
    AmendmentFileID *string   `json:"amendment_file_id" gorm:"type:uuid"`
    AmendmentFile  *File     `json:"amendment_file,omitempty" gorm:"foreignKey:AmendmentFileID"`
    
    Description     string    `json:"description" gorm:"type:text"`
    
    CreatedAt       time.Time `json:"created_at"`
    UpdatedAt       time.Time `json:"updated_at"`
}
```

**Validation Rules**:
- AmendmentNumber: 唯一，格式：XIE-YYYY-XXX
- SignDate: 不能晚于当前日期，不能早于主合同签订日期
- AmendmentAmount: 大于0的数值，应等于DesignFee + SurveyFee + ConsultationFee
- DesignFee, SurveyFee, ConsultationFee: 大于等于0的数值

**Business Rules**:
- 补充协议关联到主合同
- 补充协议金额会影响项目的总应收金额和财务统计
- 补充协议文件通过文件管理功能上传

### 8. FinancialRecord (财务记录) - 统一财务实体

```go
type FinancialRecord struct {
    ID              string          `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
    ProjectID       string          `json:"project_id" gorm:"type:uuid;not null"`
    Project         Project         `json:"project" gorm:"foreignKey:ProjectID"`
    
    FinancialType   FinancialType   `json:"financial_type" gorm:"not null"` // 财务类型
    Direction       FinancialDirection `json:"direction" gorm:"not null"` // 方向：收入/支出
    Amount          float64         `json:"amount" gorm:"not null"` // 金额
    OccurredAt      time.Time       `json:"occurred_at" gorm:"not null"` // 发生时间
    
    // 类型特定字段（根据FinancialType使用不同字段）
    // 奖金类型
    BonusCategory   *BonusCategory  `json:"bonus_category"` // 奖金类别：经营奖金/生产奖金
    RecipientID     *string         `json:"recipient_id" gorm:"type:uuid"` // 发放人员ID（奖金类型必填）
    Recipient       *User           `json:"recipient,omitempty" gorm:"foreignKey:RecipientID"`
    
    // 成本类型
    CostCategory    *CostCategory   `json:"cost_category"` // 成本类别：打车/住宿/公共交通
    Mileage         *float64        `json:"mileage"` // 里程（仅打车类型）
    InvoiceFileID    *string         `json:"invoice_file_id" gorm:"type:uuid"` // 发票文件ID
    InvoiceFile     *File           `json:"invoice_file,omitempty" gorm:"foreignKey:InvoiceFileID"`
    
    // 甲方支付/我方开票类型
    ClientID        *string         `json:"client_id" gorm:"type:uuid"` // 甲方ID
    Client          *Client         `json:"client,omitempty" gorm:"foreignKey:ClientID"`
    RelatedPaymentID *string        `json:"related_payment_id" gorm:"type:uuid"` // 关联的甲方支付记录ID（我方开票时使用）
    RelatedPayment  *FinancialRecord `json:"related_payment,omitempty" gorm:"foreignKey:RelatedPaymentID"`
    
    // 专家费类型
    PaymentMethod   *PaymentMethod  `json:"payment_method"` // 支付方式：现金/转账
    ExpertName      string          `json:"expert_name"` // 专家姓名
    
    // 委托支付/对方开票类型
    CommissionType  *CommissionType `json:"commission_type"` // 委托类型：个人/单位
    VendorName      string          `json:"vendor_name"` // 委托方名称
    VendorScore     *float64        `json:"vendor_score"` // 委托方评分
    RelatedCommissionID *string     `json:"related_commission_id" gorm:"type:uuid"` // 关联的委托支付记录ID（对方开票时使用）
    RelatedCommission   *FinancialRecord `json:"related_commission,omitempty" gorm:"foreignKey:RelatedCommissionID"`
    
    Description     string          `json:"description" gorm:"type:text"`
    
    CreatedByID     string          `json:"created_by_id" gorm:"type:uuid;not null"`
    CreatedBy       User            `json:"created_by" gorm:"foreignKey:CreatedByID"`
    UpdatedByID     *string         `json:"updated_by_id" gorm:"type:uuid"`
    UpdatedBy       *User           `json:"updated_by,omitempty" gorm:"foreignKey:UpdatedByID"`
    
    CreatedAt       time.Time       `json:"created_at"`
    UpdatedAt       time.Time       `json:"updated_at"`
}

type FinancialType string

const (
    FinancialTypeBonus        FinancialType = "bonus"         // 奖金
    FinancialTypeCost         FinancialType = "cost"          // 成本
    FinancialTypeClientPayment FinancialType = "client_payment" // 甲方支付
    FinancialTypeOurInvoice    FinancialType = "our_invoice"  // 我方开票
    FinancialTypeExpertFee     FinancialType = "expert_fee"    // 专家费
    FinancialTypeCommissionPayment FinancialType = "commission_payment" // 委托支付
    FinancialTypeVendorInvoice  FinancialType = "vendor_invoice" // 对方开票
)

type FinancialDirection string

const (
    DirectionIncome  FinancialDirection = "income"  // 收入
    DirectionExpense FinancialDirection = "expense" // 支出
)

type BonusCategory string

const (
    BonusCategoryBusiness   BonusCategory = "business"   // 经营奖金
    BonusCategoryProduction BonusCategory = "production" // 生产奖金
)

type CostCategory string

const (
    CostCategoryTaxi        CostCategory = "taxi"        // 打车
    CostCategoryAccommodation CostCategory = "accommodation" // 住宿
    CostCategoryPublicTransport CostCategory = "public_transport" // 公共交通
)

type PaymentMethod string

const (
    PaymentMethodCash     PaymentMethod = "cash"     // 现金
    PaymentMethodTransfer PaymentMethod = "transfer" // 转账
)

type CommissionType string

const (
    CommissionTypePerson CommissionType = "person" // 个人
    CommissionTypeCompany CommissionType = "company" // 单位
)
```

**Validation Rules**:
- Amount: 大于0的数值
- OccurredAt: 不能晚于当前日期
- FinancialType: 必须是有效的财务类型
- Direction: 必须是income或expense
- 类型特定字段根据FinancialType进行验证

**Business Rules**:
- 统一的财务记录实体，替代所有财务相关实体（奖金、成本、支付、开票等）
- 通过FinancialType区分不同业务场景
- 通过Direction区分收入和支出
- 支持支付和开票的关联（通过RelatedPaymentID和RelatedCommissionID）
- 奖金发放人员必须关联到项目中的用户
- 详细业务规则见：`research/financial-entity-unification.md`

### 9. ProductionApproval (批复审计信息)

```go
type ProductionApproval struct {
    ID              string    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
    ProjectID       string    `json:"project_id" gorm:"type:uuid;not null"`
    Project         Project   `json:"project" gorm:"foreignKey:ProjectID"`
    
    ApprovalType    ApprovalType `json:"approval_type" gorm:"not null"` // 类型：批复/审计
    ApproverID      *string   `json:"approver_id" gorm:"type:uuid"` // 责任人ID
    Approver         *User     `json:"approver,omitempty" gorm:"foreignKey:ApproverID"`
    Status          ApprovalStatus `json:"status" gorm:"default:'pending'"` // 状态：待审核/已审核
    SignedAt        *time.Time `json:"signed_at"` // 签字/确认时间
    
    // 批复/审计报告文件
    ReportFileID    *string   `json:"report_file_id" gorm:"type:uuid"`
    ReportFile      *File     `json:"report_file,omitempty" gorm:"foreignKey:ReportFileID"`
    
    // 批复/审计金额（按设计费、勘察费、咨询费拆分）
    AmountDesign    float64   `json:"amount_design" gorm:"not null;default:0"` // 设计费（元）
    AmountSurvey    float64   `json:"amount_survey" gorm:"not null;default:0"` // 勘察费（元）
    AmountConsulting float64  `json:"amount_consulting" gorm:"not null;default:0"` // 咨询费（元）
    TotalAmount     float64   `json:"total_amount" gorm:"not null"` // 总金额
    
    // 金额来源（默认引用合同金额，可覆盖）
    SourceContractID *string  `json:"source_contract_id" gorm:"type:uuid"` // 关联的合同ID
    SourceContract   *Contract `json:"source_contract,omitempty" gorm:"foreignKey:SourceContractID"`
    OverrideReason   string   `json:"override_reason" gorm:"type:text"` // 覆盖原因说明
    
    Remarks         string    `json:"remarks" gorm:"type:text"`
    
    CreatedAt       time.Time `json:"created_at"`
    UpdatedAt       time.Time `json:"updated_at"`
}

type ApprovalType string

const (
    ApprovalTypeApproval ApprovalType = "approval" // 批复
    ApprovalTypeAudit    ApprovalType = "audit"    // 审计
)

type ApprovalStatus string

const (
    ApprovalStatusPending ApprovalStatus = "pending" // 待审核
    ApprovalStatusApproved ApprovalStatus = "approved" // 已审核
)
```

**Validation Rules**:
- AmountDesign, AmountSurvey, AmountConsulting: 大于等于0的数值
- TotalAmount: 应等于AmountDesign + AmountSurvey + AmountConsulting
- SignedAt: 如果填写，不能晚于当前日期

**Business Rules**:
- 批复/审计金额默认引用关联合同（含补充协议）的费用明细
- 可在批复/审计记录中手工调整金额，并填写覆盖原因
- 支持两级在线审批流程（审核、审定）

## Database Schema

### Indexes

```sql
-- 用户表索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_has_account ON users(has_account);

-- 项目表索引
CREATE INDEX idx_projects_number ON projects(project_number);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_business_manager_id ON projects(business_manager_id);
CREATE INDEX idx_projects_production_manager_id ON projects(production_manager_id);
CREATE INDEX idx_projects_is_deleted ON projects(is_deleted);

-- 甲方表索引
CREATE INDEX idx_clients_name ON clients(client_name);

-- 项目联系人表索引
CREATE INDEX idx_project_contacts_project_id ON project_contacts(project_id);
CREATE INDEX idx_project_contacts_client_id ON project_contacts(client_id);

-- 招投标信息表索引
CREATE INDEX idx_bidding_info_project_id ON bidding_info(project_id);

-- 合同表索引
CREATE INDEX idx_contracts_number ON contracts(contract_number);
CREATE INDEX idx_contracts_project_id ON contracts(project_id);
CREATE INDEX idx_contracts_sign_date ON contracts(sign_date);

-- 合同补充协议表索引
CREATE INDEX idx_contract_amendments_number ON contract_amendments(amendment_number);
CREATE INDEX idx_contract_amendments_contract_id ON contract_amendments(contract_id);
CREATE INDEX idx_contract_amendments_sign_date ON contract_amendments(sign_date);

-- 财务记录表索引
CREATE INDEX idx_financial_records_project_id ON financial_records(project_id);
CREATE INDEX idx_financial_records_type ON financial_records(financial_type);
CREATE INDEX idx_financial_records_direction ON financial_records(direction);
CREATE INDEX idx_financial_records_occurred_at ON financial_records(occurred_at);
CREATE INDEX idx_financial_records_recipient_id ON financial_records(recipient_id);
CREATE INDEX idx_financial_records_client_id ON financial_records(client_id);

-- 文件表索引
CREATE INDEX idx_files_project_id ON files(project_id);
CREATE INDEX idx_files_category ON files(category);
CREATE INDEX idx_files_uploader_id ON files(uploader_id);
CREATE INDEX idx_files_created_at ON files(created_at);

-- 项目成员表索引
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_project_members_role ON project_members(role);
CREATE INDEX idx_project_members_discipline_id ON project_members(discipline_id);

-- 批复审计信息表索引
CREATE INDEX idx_production_approvals_project_id ON production_approvals(project_id);
CREATE INDEX idx_production_approvals_type ON production_approvals(approval_type);
CREATE INDEX idx_production_approvals_status ON production_approvals(status);
CREATE INDEX idx_production_approvals_approver_id ON production_approvals(approver_id);
CREATE INDEX idx_production_approvals_source_contract_id ON production_approvals(source_contract_id);

-- 生产阶段文件表索引
CREATE INDEX idx_production_files_project_id ON production_files(project_id);
CREATE INDEX idx_production_files_stage ON production_files(stage);
CREATE INDEX idx_production_files_file_id ON production_files(file_id);
CREATE INDEX idx_production_files_review_sheet_file_id ON production_files(review_sheet_file_id);
CREATE INDEX idx_production_files_created_by_id ON production_files(created_by_id);

-- 对外委托表索引
CREATE INDEX idx_external_commissions_project_id ON external_commissions(project_id);
CREATE INDEX idx_external_commissions_vendor_type ON external_commissions(vendor_type);
CREATE INDEX idx_external_commissions_created_by_id ON external_commissions(created_by_id);

-- 专业字典表索引
CREATE INDEX idx_disciplines_name ON disciplines(name);
CREATE INDEX idx_disciplines_code ON disciplines(code);
CREATE INDEX idx_disciplines_is_global ON disciplines(is_global);
CREATE INDEX idx_disciplines_project_id ON disciplines(project_id);
```

### Relationships

1. **User** 1:N **Project** (BusinessManager, ProductionManager)
2. **User** 1:N **ProjectMember** (Project Members)
3. **User** 1:N **FinancialRecord** (Recipient, CreatedBy, UpdatedBy)
4. **User** 1:N **File** (Uploader)
5. **Client** 1:N **Project**
6. **Client** 1:N **FinancialRecord** (ClientPayment, OurInvoice)
7. **Client** 1:N **ProjectContact** (项目联系人关联的甲方)
8. **Project** 1:1 **ProjectContact** (项目联系人)
9. **Project** 1:1 **BiddingInfo**
10. **Project** 1:N **Contract**
11. **Project** 1:N **FinancialRecord**
12. **Project** 1:N **ProductionFile**
13. **Project** 1:N **ProductionApproval**
14. **Project** 1:N **ExternalCommission**
15. **Project** 1:N **File**
16. **Contract** 1:N **ContractAmendment**
17. **FinancialRecord** 1:N **FinancialRecord** (RelatedPayment, RelatedCommission)
18. **File** 1:1 **BiddingInfo** (TenderFile, BidFile, AwardNoticeFile)
19. **File** 1:1 **Contract** (ContractFile)
20. **File** 1:1 **ContractAmendment** (AmendmentFile)
21. **File** 1:1 **FinancialRecord** (InvoiceFile)
22. **File** 1:1 **ProductionApproval** (ReportFile)
23. **File** 1:1 **ProductionFile** (File, ReviewSheetFile)
24. **File** 1:1 **ExternalCommission** (ContractFile)
25. **User** 1:N **ProductionApproval** (Approver)
26. **User** 1:N **ProductionFile** (CreatedBy)
27. **User** 1:N **ExternalCommission** (CreatedBy)
28. **Contract** 1:N **ProductionApproval** (SourceContract)
29. **Discipline** 1:N **ProjectMember** (生产人员专业关联)
30. **Project** 1:N **Discipline** (项目级专业)

## Data Validation Rules

### Business Rules

1. **项目编号唯一性**: 项目编号必须唯一，创建时自动检测重复并阻止
2. **项目软删除**: 删除项目时仅标记IsDeleted=true，保留所有关联数据
3. **甲方名称唯一性**: 甲方名称必须唯一，创建时自动检测重复并阻止
4. **合同金额验证**: 合同总金额应等于设计费+勘察费+咨询费之和
5. **财务数据一致性**: 财务记录金额必须大于0，发生时间不能晚于当前日期
6. **文件权限**: 用户只能访问有权限的项目文件
7. **用户ID格式**: 所有用户ID使用UUID v4格式，与网关注入的X-User-ID格式一致
8. **生产阶段文件验证**: 方案、初步设计、施工图设计阶段必须上传校审单并填写评分
9. **批复审计金额引用**: 批复/审计金额默认引用关联合同（含补充协议）的费用明细，可手工调整
10. **专业字典管理**: 全局专业名称唯一，项目级专业在项目内唯一，可同步回全局字典
11. **项目成员多角色**: 同一用户在同一项目中可以有多个角色，通过多条ProjectMember记录实现
12. **生产人员专业关联**: 生产人员角色（设计人、参与人、复核人）必须关联专业
13. **对外委托支付关联**: 委托支付和对方开票通过FinancialRecord实体管理，通过ProjectID和FinancialType查询
14. **负责人账号删除处理**: 负责人账号被删除或禁用时，系统保留负责人配置信息（BusinessManagerID、ProductionManagerID），但在权限检查时视为无效，提示项目管理员更新负责人配置。注：暂时不考虑账号删除和禁用功能，后续有需要时再进行功能开发

### Data Integrity

1. **外键约束**: 所有外键关系都有数据库约束
2. **唯一性约束**: 项目编号、合同编号、甲方名称等业务唯一字段
3. **非空约束**: 必填字段都有非空约束
4. **检查约束**: 金额、日期等字段有范围检查
5. **UUID格式**: 所有ID字段使用UUID v4格式

## Migration Strategy

1. **初始迁移**: 创建所有表和索引
2. **数据迁移**: 从现有系统导入初始数据（如果需要）
3. **索引优化**: 根据查询模式优化索引
4. **分区策略**: 大表考虑按时间分区（如财务记录表）

## Entity Relationship Diagram

```
User
  ├── 1:N Project (BusinessManager, ProductionManager)
  ├── 1:N ProjectMember
  ├── 1:N FinancialRecord (Recipient, CreatedBy, UpdatedBy)
  ├── 1:N File (Uploader)
  ├── 1:N ProductionApproval (Approver)
  ├── 1:N ProductionFile (CreatedBy)
  └── 1:N ExternalCommission (CreatedBy)

Project
  ├── 1:1 Client
  ├── 1:1 ProjectContact (项目联系人)
  ├── 1:1 BiddingInfo

Client
  ├── 1:N Project
  ├── 1:N FinancialRecord (ClientPayment, OurInvoice)
  └── 1:N ProjectContact (项目联系人关联的甲方)

ProjectContact
  ├── 1:1 Project
  └── 1:1 Client (关联的甲方)
  ├── 1:N Contract
  ├── 1:N FinancialRecord
  ├── 1:N ProductionFile
  ├── 1:N ProductionApproval
  ├── 1:N ExternalCommission
  ├── 1:N File
  ├── 1:N ProjectMember
  └── 1:N Discipline (项目级专业)

Contract
  ├── 1:N ContractAmendment
  ├── 1:1 File (ContractFile)
  └── 1:N ProductionApproval (SourceContract)

FinancialRecord
  ├── 1:N FinancialRecord (RelatedPayment, RelatedCommission)
  ├── 1:1 User (Recipient, CreatedBy, UpdatedBy)
  ├── 1:1 Client (ClientPayment, OurInvoice)
  └── 1:1 File (InvoiceFile)

ProductionFile
  ├── 1:1 File (File, ReviewSheetFile)
  └── 1:1 User (CreatedBy)

ProductionApproval
  ├── 1:1 File (ReportFile)
  ├── 1:1 User (Approver)
  └── 1:1 Contract (SourceContract)

ExternalCommission
  ├── 1:1 File (ContractFile)
  └── 1:1 User (CreatedBy)

ProjectMember
  ├── 1:1 User
  ├── 1:1 Project
  └── 1:1 Discipline (生产人员专业关联)

Discipline
  ├── 1:1 Project (项目级专业)
  └── 1:N ProjectMember
```

## Query Patterns & Performance Considerations

### 高频查询场景

1. **项目列表查询**
   - 需要关联：Client, BusinessManager, ProductionManager
   - 索引：project_number, status, is_deleted
   - 建议：使用分页，避免全表扫描

2. **项目详情查询**
   - 需要关联：所有关联实体（Contract, FinancialRecord, ProductionFile等）
   - 建议：使用预加载（Preload）或批量查询，避免N+1问题

3. **财务记录统计**
   - 需要聚合：按项目、财务类型、方向分组统计
   - 索引：project_id, financial_type, direction, occurred_at
   - 建议：使用数据库聚合函数，考虑物化视图

4. **文件搜索**
   - 需要筛选：项目、类别、上传时间
   - 索引：project_id, category, created_at
   - 建议：支持全文搜索（如需要）

5. **项目成员查询**
   - 需要关联：User, Discipline
   - 索引：project_id, user_id, role, discipline_id
   - 建议：支持按专业、角色筛选

### 性能优化建议

1. **数据库层面**
   - 合理使用索引，避免过度索引
   - 大表考虑分区（如财务记录表按时间分区）
   - 定期分析表统计信息，优化查询计划

2. **应用层面**
   - 使用连接池管理数据库连接
   - 使用缓存减少数据库查询（Redis）
   - 批量查询避免N+1问题
   - 分页查询避免一次性加载大量数据

3. **文件存储**
   - 使用CDN加速文件访问（生产环境）
   - 文件路径使用UUID避免冲突
   - 支持断点续传（大文件上传）

## Data Migration Notes

### 从001版本迁移到002版本

如果从001版本迁移，需要注意以下变更：

1. **财务实体统一**
   - 原Bonus、ExpertFeePayment、ProductionCost等实体需要迁移到FinancialRecord
   - 需要根据原实体类型设置FinancialType和Direction
   - 需要保留原关联关系（如UserID映射到RecipientID）

2. **ID格式变更**
   - 原使用uint类型的ID需要迁移到UUID格式
   - 需要生成新的UUID并建立映射关系
   - 外键关系需要更新

3. **新增实体**
   - ProductionApproval、ProductionFile、ExternalCommission、Discipline为新增实体
   - 需要根据业务需求初始化数据

4. **字段变更**
   - Project表新增BusinessManagerID、ProductionManagerID字段
   - Contract表金额字段拆分（DesignFee, SurveyFee, ConsultationFee）
   - Client表移除ContactName、ContactPhone字段（迁移到ProjectContact实体）
   - 需要数据迁移脚本处理

5. **项目联系人实体**
   - 新增ProjectContact实体，用于存储项目级别的联系人信息
   - 从Client实体中移除联系人字段，联系人信息通过ProjectContact实体管理
   - 需要将现有Client表中的联系人信息迁移到ProjectContact表

### 迁移脚本示例

```sql
-- 示例：将Bonus实体迁移到FinancialRecord
INSERT INTO financial_records (
    id, project_id, financial_type, direction, amount, occurred_at,
    bonus_category, recipient_id, created_by_id, created_at, updated_at
)
SELECT 
    gen_random_uuid(),
    project_id,
    'bonus',
    'expense',
    amount,
    created_at,
    bonus_type,
    user_id,
    created_by_id,
    created_at,
    updated_at
FROM bonuses;
```

## Notes

- 所有实体ID使用UUID v4格式，与网关注入的Header格式一致
- 财务记录实体统一了所有财务相关业务，详细设计见 `research/financial-entity-unification.md`
- 文件实体通过外键关联到各业务实体，支持统一的文件管理
- 专业字典支持全局和项目级专业，保证跨项目一致性又保留扩展性
- 项目成员支持一人多角色，按专业维度维护生产人员配置
- 存储方案兼容：支持MinIO（本地）和OSS（阿里云），通过配置切换
- 数据库兼容：支持PostgreSQL（本地）和RDS（阿里云），通过连接字符串切换
- **项目联系人管理**：项目联系人作为独立实体存在，与甲方实体分离，支持相同甲方在不同项目上有不同的联系人

### 10. ProductionFile (生产阶段文件)

```go
type ProductionFile struct {
    ID              string    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
    ProjectID       string    `json:"project_id" gorm:"type:uuid;not null"`
    Project         Project   `json:"project" gorm:"foreignKey:ProjectID"`
    
    Stage           ProductionStage `json:"stage" gorm:"not null"` // 生产阶段
    FileID          string    `json:"file_id" gorm:"type:uuid;not null"` // 生产文件
    File             File     `json:"file" gorm:"foreignKey:FileID"`
    
    // 校审单和评分（方案、初步设计、施工图设计必填）
    ReviewSheetFileID *string `json:"review_sheet_file_id" gorm:"type:uuid"` // 校审单文件ID
    ReviewSheetFile   *File   `json:"review_sheet_file,omitempty" gorm:"foreignKey:ReviewSheetFileID"`
    Score            *float64 `json:"score"` // 评分
    
    // 金额默认引用（引用合同金额作为默认值）
    DefaultAmountReference *string `json:"default_amount_reference" gorm:"type:text"` // 默认金额引用说明
    
    Description     string    `json:"description" gorm:"type:text"`
    
    CreatedByID     string    `json:"created_by_id" gorm:"type:uuid;not null"`
    CreatedBy       User      `json:"created_by" gorm:"foreignKey:CreatedByID"`
    
    CreatedAt       time.Time `json:"created_at"`
    UpdatedAt       time.Time `json:"updated_at"`
}

type ProductionStage string

const (
    StageScheme        ProductionStage = "scheme"         // 方案
    StagePreliminary   ProductionStage = "preliminary"    // 初步设计
    StageConstruction  ProductionStage = "construction"   // 施工图设计
    StageChange        ProductionStage = "change"         // 变更洽商
    StageCompletion    ProductionStage = "completion"     // 竣工验收
)
```

**Validation Rules**:
- Stage: 必须是有效的生产阶段
- FileID: 必填，必须是有效的文件ID
- ReviewSheetFileID: 方案、初步设计、施工图设计阶段必填
- Score: 方案、初步设计、施工图设计阶段必填，0-100之间的数值

**Business Rules**:
- 方案、初步设计、施工图设计必须上传校审单并填写评分
- 校审单和评分为必填项（仅限方案、初步设计、施工图设计阶段）
- 系统展示"引用合同金额"按钮以快速带出默认值

### 11. ExternalCommission (对外委托)

```go
type ExternalCommission struct {
    ID              string    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
    ProjectID       string    `json:"project_id" gorm:"type:uuid;not null"`
    Project         Project   `json:"project" gorm:"foreignKey:ProjectID"`
    
    VendorType      CommissionType `json:"vendor_type" gorm:"not null"` // 委托类型：个人/单位
    VendorName      string    `json:"vendor_name" gorm:"not null"` // 委托单位/个人名称
    Score           *float64  `json:"score"` // 对委托方的评分
    
    // 委托合同文件
    ContractFileID  *string   `json:"contract_file_id" gorm:"type:uuid"`
    ContractFile    *File     `json:"contract_file,omitempty" gorm:"foreignKey:ContractFileID"`
    
    // 支付信息（通过FinancialRecord关联，financial_type=commission_payment）
    // 对方开票信息（通过FinancialRecord关联，financial_type=vendor_invoice）
    // 不在此实体中直接存储，通过ProjectID和FinancialType查询
    
    Notes           string    `json:"notes" gorm:"type:text"`
    
    CreatedByID     string    `json:"created_by_id" gorm:"type:uuid;not null"`
    CreatedBy       User      `json:"created_by" gorm:"foreignKey:CreatedByID"`
    
    CreatedAt       time.Time `json:"created_at"`
    UpdatedAt       time.Time `json:"updated_at"`
}
```

**Validation Rules**:
- VendorName: 必填，2-100字符
- Score: 0-100之间的数值（可选）

**Business Rules**:
- 委托支付和对方开票通过FinancialRecord实体管理
- 可与成本统计、奖金分配联动（如根据评分决定奖金比例）

### 12. File (文件)

```go
type File struct {
    ID          string    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
    FileName    string    `json:"file_name" gorm:"not null"` // 存储文件名
    OriginalName string   `json:"original_name" gorm:"not null"` // 原始文件名
    FilePath    string    `json:"file_path" gorm:"not null"` // 存储路径（MinIO/OSS路径）
    FileSize    int64     `json:"file_size" gorm:"not null"` // 文件大小（字节）
    MimeType    string    `json:"mime_type" gorm:"not null"` // MIME类型
    Category    FileCategory `json:"category" gorm:"not null"` // 文件类别
    Description string    `json:"description" gorm:"type:text"`
    
    // 关联关系
    ProjectID   string    `json:"project_id" gorm:"type:uuid;not null"`
    Project     Project   `json:"project" gorm:"foreignKey:ProjectID"`
    
    UploaderID  string    `json:"uploader_id" gorm:"type:uuid;not null"`
    Uploader    User      `json:"uploader" gorm:"foreignKey:UploaderID"`
    
    IsDeleted   bool      `json:"is_deleted" gorm:"default:false"` // 软删除标记
    
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}

type FileCategory string

const (
    FileCategoryContract     FileCategory = "contract"     // 合同文件
    FileCategoryBidding      FileCategory = "bidding"      // 招投标文件
    FileCategoryProduction   FileCategory = "production"   // 生产文件
    FileCategoryInvoice      FileCategory = "invoice"       // 发票文件
    FileCategoryApproval     FileCategory = "approval"     // 批复审计文件
    FileCategoryOther        FileCategory = "other"        // 其他文件
)
```

**Validation Rules**:
- FileSize: 最大100MB（104857600字节）
- FileType: 仅限制危险文件类型（可执行文件、脚本文件等），其他文件类型均允许上传
  - **禁止的文件类型**: `.exe`, `.bat`, `.cmd`, `.com`, `.pif`, `.scr`, `.vbs`, `.js`, `.jar`, `.sh`, `.ps1`, `.app`, `.dmg`, `.deb`, `.rpm`, `.msi`, `.apk`, `.ipa`
  - **允许的文件类型**: 除上述危险类型外的所有文件类型
- OriginalName: 不能包含特殊字符
- FilePath: 格式：`projects/{project_id}/{category}/{file_id}/{filename}`

**Business Rules**:
- 文件存储路径统一格式，兼容MinIO和OSS
- 支持软删除，删除后保留文件记录但标记为已删除
- 文件权限验证：用户只能访问有权限的项目文件
- 支持按项目、文件类型、上传时间搜索和筛选

### 13. Discipline (专业字典)

```go
type Discipline struct {
    ID          string    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
    Name        string    `json:"name" gorm:"uniqueIndex;not null"` // 专业名称
    Code        string    `json:"code" gorm:"uniqueIndex"` // 专业代码（可选）
    Description string    `json:"description" gorm:"type:text"`
    IsGlobal    bool      `json:"is_global" gorm:"default:true"` // 是否全局专业
    ProjectID   *string   `json:"project_id" gorm:"type:uuid"` // 项目级专业关联项目ID
    Project     *Project  `json:"project,omitempty" gorm:"foreignKey:ProjectID"`
    
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}
```

**Validation Rules**:
- Name: 必填，2-50字符，全局专业名称唯一
- Code: 可选，如果填写则必须唯一
- IsGlobal: 如果为true，ProjectID必须为NULL；如果为false，ProjectID必须填写

**Business Rules**:
- 全局专业：所有项目可用，由管理员维护
- 项目级专业：仅在特定项目中使用，可同步回全局字典
- 专业列表优先从全局专业字典选择，若缺少可在项目内新增并同步回字典
- 保证跨项目一致性又保留扩展性

### 14. ProjectMember (项目成员)

```go
type ProjectMember struct {
    ID          string    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
    ProjectID   string    `json:"project_id" gorm:"type:uuid;not null"`
    Project     Project   `json:"project" gorm:"foreignKey:ProjectID"`
    UserID      string    `json:"user_id" gorm:"type:uuid;not null"`
    User        User      `json:"user" gorm:"foreignKey:UserID"`
    
    Role        MemberRole `json:"role" gorm:"not null"` // 成员角色
    DisciplineID *string   `json:"discipline_id" gorm:"type:uuid"` // 专业ID（生产人员使用）
    Discipline   *Discipline `json:"discipline,omitempty" gorm:"foreignKey:DisciplineID"`
    
    JoinDate    time.Time `json:"join_date" gorm:"not null"`
    LeaveDate   *time.Time `json:"leave_date"`
    IsActive    bool      `json:"is_active" gorm:"default:true"`
    
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}

type MemberRole string

const (
    MemberRoleDesigner         MemberRole = "designer"         // 专业设计人
    MemberRoleParticipant     MemberRole = "participant"      // 专业参与人
    MemberRoleReviewer        MemberRole = "reviewer"         // 专业复核人
    MemberRoleAuditor         MemberRole = "auditor"          // 审核人
    MemberRoleApprover        MemberRole = "approver"         // 审定人
    MemberRoleBusinessPersonnel MemberRole = "business_personnel" // 经营参与人
)
```

**Validation Rules**:
- JoinDate: 不能晚于当前日期
- LeaveDate: 如果填写，必须晚于JoinDate
- Role: 必须是有效的成员角色
- DisciplineID: 生产人员角色（designer, participant, reviewer）必填

**Business Rules**:
- 支持一人多角色：同一用户在同一项目中可以有多个角色（通过多条ProjectMember记录实现）
- 按专业维度维护：每个专业分别配置专业设计人、专业参与人、专业复核人
- 允许同一人员在不同专业下承担不同角色
- 经营参与人由项目管理员或经营负责人配置
- 生产人员（分不同专业的设计人、参与人、复核人）由项目管理员或生产负责人配置

## Notes

- 所有实体ID使用UUID v4格式，与网关注入的Header格式一致
- 财务记录实体统一了所有财务相关业务，详细设计见 `research/financial-entity-unification.md`
- 文件实体通过外键关联到各业务实体，支持统一的文件管理
- 专业字典支持全局和项目级专业，保证跨项目一致性又保留扩展性
- 项目成员支持一人多角色，按专业维度维护生产人员配置
- **管理费设置**: 管理费比例是系统全局配置参数，可通过以下方式实现：
  - 方式1：使用系统配置表（如 `system_config` 表），存储 key-value 配置，key 为 `management_fee_ratio`，value 为管理费比例（0-100）
  - 方式2：使用环境变量或配置文件，在应用启动时读取
  - 方式3：如果后续需要更复杂的配置管理，可定义 `CompanyConfig` 实体，包含管理费比例等全局配置项
  - 当前建议使用方式1（系统配置表），便于运行时修改且无需重启应用

