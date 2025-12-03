# 001 vs 002 数据模型对比分析报告

**生成时间**: 2025-01-28  
**对比范围**: `001-project-management-oa` vs `002-project-management-oa`  
**对比文件**: `data-model.md`

## 概述

本报告对比分析了 001 和 002 两个版本的数据模型差异，重点关注 **001 相比 002 多了哪些、少了哪些**。

### 主要变化总结

- **ID 类型变更**: 001 使用 `uint`，002 使用 `UUID` (string)
- **财务实体统一**: 001 中的 `Bonus` 和 `ExpertFeePayment` 在 002 中被整合到统一的 `FinancialRecord` 实体
- **新增业务实体**: 002 新增了 `BiddingInfo`、`ProductionApproval`、`ProductionFile`、`ExternalCommission`、`Discipline` 等实体
- **移除配置实体**: 001 中的 `CompanyConfig` 在 002 中未出现

---

## 一、001 相比 002 多出的内容

### 1.1 独立实体

#### 1. ExpertFeePayment (专家费支付)

**001 中存在，002 中已整合到 FinancialRecord**

```go
// 001 中的定义
type ExpertFeePayment struct {
    ID            uint          `json:"id"`
    PaymentMethod PaymentMethod `json:"payment_method"`
    Amount        float64       `json:"amount"`
    ExpertName    string        `json:"expert_name"`
    ExpertID      *uint         `json:"expert_id"`
    Description   string        `json:"description"`
    ProjectID     uint          `json:"project_id"`
    CreatedByID   uint          `json:"created_by_id"`
    CreatedAt     time.Time     `json:"created_at"`
    UpdatedAt     time.Time     `json:"updated_at"`
}
```

**在 002 中的对应**: 通过 `FinancialRecord` 的 `financial_type=expert_fee` 实现，相关字段：
- `PaymentMethod` → `FinancialRecord.payment_method`
- `ExpertName` → `FinancialRecord.expert_name`
- `Amount` → `FinancialRecord.amount`
- `ExpertID` → 不再直接关联，通过 `expert_name` 字符串存储

#### 2. Bonus (奖金)

**001 中存在，002 中已整合到 FinancialRecord**

```go
// 001 中的定义
type Bonus struct {
    ID          uint      `json:"id"`
    BonusType   BonusType `json:"bonus_type"`
    Amount      float64   `json:"amount"`
    Description string    `json:"description"`
    ProjectID   uint      `json:"project_id"`
    UserID      uint      `json:"user_id"`
    CreatedByID uint      `json:"created_by_id"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}
```

**在 002 中的对应**: 通过 `FinancialRecord` 的 `financial_type=bonus` 实现，相关字段：
- `BonusType` → `FinancialRecord.bonus_category` (business/production)
- `Amount` → `FinancialRecord.amount`
- `UserID` → `FinancialRecord.recipient_id`
- `Direction` → 固定为 `expense`

#### 3. CompanyConfig (公司配置)

**001 中存在，002 中未出现**

```go
// 001 中的定义
type CompanyConfig struct {
    ID          uint      `json:"id"`
    ConfigKey   string    `json:"config_key"`   // 如：default_management_fee_ratio
    ConfigValue string    `json:"config_value"`  // JSON字符串或简单值
    Description string    `json:"description"`
    CreatedByID uint      `json:"created_by_id"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}
```

**用途**: 存储公司级别的默认配置，如默认管理费比例  
**002 中的处理**: 未在数据模型中定义，可能通过其他方式管理（如环境变量、配置文件等）

### 1.2 字段差异（001 有但 002 没有）

#### User 实体

| 字段 | 001 | 002 | 说明 |
|------|-----|-----|------|
| `ID` | `uint` | `string (UUID)` | ID 类型变更 |
| `Role` 枚举值 | `admin, manager, business, designer, reviewer, finance` | `admin, project_manager, business_manager, production_manager, finance, member` | 角色定义更细化 |
| - | - | `HasAccount bool` | 002 新增：是否有账号 |

#### Project 实体

| 字段 | 001 | 002 | 说明 |
|------|-----|-----|------|
| `ID` | `uint` | `string (UUID)` | ID 类型变更 |
| `ManagerID` | `uint` | - | 001 使用单一 ManagerID |
| `ManagementFeeRatio` | `*float64` | - | 001 支持项目级管理费比例 |
| `BusinessManagerID` | - | `*string (UUID)` | 002 新增：经营负责人 |
| `ProductionManagerID` | - | `*string (UUID)` | 002 新增：生产负责人 |
| `IsDeleted` | - | `bool` | 002 新增：软删除标记 |

#### FinancialRecord 实体

| 字段 | 001 | 002 | 说明 |
|------|-----|-----|------|
| `ID` | `uint` | `string (UUID)` | ID 类型变更 |
| `RecordType` | `receivable, invoice, payment, expense` | - | 001 的财务类型 |
| `FeeType` | `design_fee, survey_fee, consultation_fee` | - | 001 的费用类型（按费用类型分别记录） |
| `ReceivableAmount` | `float64` | - | 001 的应收金额 |
| `InvoiceNumber` | `string` | - | 001 的发票号 |
| `InvoiceDate` | `*time.Time` | - | 001 的开票时间 |
| `InvoiceAmount` | `float64` | - | 001 的开票金额 |
| `PaymentDate` | `*time.Time` | - | 001 的支付时间 |
| `PaymentAmount` | `float64` | - | 001 的支付金额 |
| `UnpaidAmount` | `float64` | - | 001 的未收金额（计算字段） |
| `FinancialType` | - | `bonus, cost, client_payment, our_invoice, expert_fee, commission_payment, vendor_invoice` | 002 的统一财务类型 |
| `Direction` | - | `income, expense` | 002 新增：收入/支出方向 |
| `OccurredAt` | - | `time.Time` | 002 新增：发生时间 |
| `BonusCategory` | - | `business, production` | 002 新增：奖金类别 |
| `CostCategory` | - | `taxi, accommodation, public_transport` | 002 新增：成本类别 |
| `Mileage` | - | `*float64` | 002 新增：里程（打车类型） |
| `ClientID` | - | `*string (UUID)` | 002 新增：甲方ID |
| `RelatedPaymentID` | - | `*string (UUID)` | 002 新增：关联的支付记录ID |
| `PaymentMethod` | - | `cash, transfer` | 002 新增：支付方式 |
| `ExpertName` | - | `string` | 002 新增：专家姓名 |
| `CommissionType` | - | `person, company` | 002 新增：委托类型 |
| `VendorName` | - | `string` | 002 新增：委托方名称 |
| `VendorScore` | - | `*float64` | 002 新增：委托方评分 |
| `RelatedCommissionID` | - | `*string (UUID)` | 002 新增：关联的委托记录ID |
| `UpdatedByID` | - | `*string (UUID)` | 002 新增：更新人ID |

**说明**: 001 的 `FinancialRecord` 主要用于记录应收、开票、支付信息，按费用类型（设计费、勘察费、咨询费）分别记录。002 统一了所有财务相关业务，包括奖金、成本、支付、开票等。

#### ProjectMember 实体

| 字段 | 001 | 002 | 说明 |
|------|-----|-----|------|
| `ID` | `uint` | `string (UUID)` | ID 类型变更 |
| `Role` 枚举值 | `manager, designer, participant, reviewer, auditor, business_manager, business_personnel` | `designer, participant, reviewer, auditor, approver, business_personnel` | 002 移除了 `manager`，新增了 `approver` |
| `DisciplineID` | - | `*string (UUID)` | 002 新增：专业ID（生产人员使用） |

#### File 实体

| 字段 | 001 | 002 | 说明 |
|------|-----|-----|------|
| `ID` | `uint` | `string (UUID)` | ID 类型变更 |
| `FileType` | `string` | - | 001 的文件类型字段 |
| `Category` 枚举值 | `contract, bidding, design, audit, production, other` | `contract, bidding, production, invoice, approval, other` | 002 移除了 `design` 和 `audit`，新增了 `invoice` 和 `approval` |
| `IsDeleted` | - | `bool` | 002 新增：软删除标记 |

#### Contract 实体

| 字段 | 001 | 002 | 说明 |
|------|-----|-----|------|
| `ID` | `uint` | `string (UUID)` | ID 类型变更 |
| `ContractType` | `string` | - | 001 的合同类型字段（设计费、勘察费、咨询费） |
| `FilePath` | `string` | - | 001 直接存储文件路径 |
| `ContractFileID` | - | `*string (UUID)` | 002 通过 File 实体关联 |

#### ContractAmendment 实体

| 字段 | 001 | 002 | 说明 |
|------|-----|-----|------|
| `ID` | `uint` | `string (UUID)` | ID 类型变更 |
| `FilePath` | `string` | - | 001 直接存储文件路径 |
| `AmendmentFileID` | - | `*string (UUID)` | 002 通过 File 实体关联 |
| `ContractRate` | - | `float64` | 002 新增：合同费率 |
| `DesignFee` | - | `float64` | 002 新增：设计费明细 |
| `SurveyFee` | - | `float64` | 002 新增：勘察费明细 |
| `ConsultationFee` | - | `float64` | 002 新增：咨询费明细 |
| `AmendmentAmount` | - | `float64` | 002 新增：补充协议总金额 |

---

## 二、001 相比 002 缺少的内容

### 2.1 新增实体

#### 1. BiddingInfo (招投标信息)

**002 中新增，001 中不存在**

```go
type BiddingInfo struct {
    ID              string    `json:"id" gorm:"type:uuid;primaryKey"`
    ProjectID       string    `json:"project_id" gorm:"type:uuid;not null;uniqueIndex"`
    TenderFileID    *string   `json:"tender_file_id" gorm:"type:uuid"`
    BidFileID       *string   `json:"bid_file_id" gorm:"type:uuid"`
    AwardNoticeFileID *string `json:"award_notice_file_id" gorm:"type:uuid"`
    CreatedAt       time.Time `json:"created_at"`
    UpdatedAt       time.Time `json:"updated_at"`
}
```

**用途**: 管理项目的招投标信息，包括招标文件、投标文件、中标通知书等  
**关系**: 与 Project 一对一关系

#### 2. ProductionApproval (批复审计信息)

**002 中新增，001 中不存在**

```go
type ProductionApproval struct {
    ID              string    `json:"id" gorm:"type:uuid;primaryKey"`
    ProjectID       string    `json:"project_id" gorm:"type:uuid;not null"`
    ApprovalType    ApprovalType `json:"approval_type"` // approval/audit
    ApproverID      *string   `json:"approver_id" gorm:"type:uuid"`
    Status          ApprovalStatus `json:"status"` // pending/approved
    SignedAt        *time.Time `json:"signed_at"`
    ReportFileID    *string   `json:"report_file_id" gorm:"type:uuid"`
    AmountDesign    float64   `json:"amount_design"`
    AmountSurvey    float64   `json:"amount_survey"`
    AmountConsulting float64  `json:"amount_consulting"`
    TotalAmount     float64   `json:"total_amount"`
    SourceContractID *string  `json:"source_contract_id" gorm:"type:uuid"`
    OverrideReason   string   `json:"override_reason"`
    Remarks         string    `json:"remarks"`
    CreatedAt       time.Time `json:"created_at"`
    UpdatedAt       time.Time `json:"updated_at"`
}
```

**用途**: 管理项目的批复和审计信息，包括批复/审计金额（按设计费、勘察费、咨询费拆分）  
**关系**: 与 Project 多对一，与 Contract 多对一（可选）

#### 3. ProductionFile (生产阶段文件)

**002 中新增，001 中不存在**

```go
type ProductionFile struct {
    ID              string    `json:"id" gorm:"type:uuid;primaryKey"`
    ProjectID       string    `json:"project_id" gorm:"type:uuid;not null"`
    Stage           ProductionStage `json:"stage"` // scheme/preliminary/construction/change/completion
    FileID          string    `json:"file_id" gorm:"type:uuid;not null"`
    ReviewSheetFileID *string `json:"review_sheet_file_id" gorm:"type:uuid"`
    Score            *float64 `json:"score"`
    Description     string    `json:"description"`
    CreatedByID     string    `json:"created_by_id" gorm:"type:uuid;not null"`
    CreatedAt       time.Time `json:"created_at"`
    UpdatedAt       time.Time `json:"updated_at"`
}
```

**用途**: 管理项目生产阶段的文件，包括方案、初步设计、施工图设计、变更洽商、竣工验收等阶段  
**关系**: 与 Project 多对一，与 File 多对一

#### 4. ExternalCommission (对外委托)

**002 中新增，001 中不存在**

```go
type ExternalCommission struct {
    ID              string    `json:"id" gorm:"type:uuid;primaryKey"`
    ProjectID       string    `json:"project_id" gorm:"type:uuid;not null"`
    VendorType      CommissionType `json:"vendor_type"` // person/company
    VendorName      string    `json:"vendor_name"`
    Score           *float64  `json:"score"`
    ContractFileID  *string   `json:"contract_file_id" gorm:"type:uuid"`
    Notes           string    `json:"notes"`
    CreatedByID     string    `json:"created_by_id" gorm:"type:uuid;not null"`
    CreatedAt       time.Time `json:"created_at"`
    UpdatedAt       time.Time `json:"updated_at"`
}
```

**用途**: 管理项目的对外委托信息，包括委托类型（个人/单位）、委托方名称、评分等  
**关系**: 与 Project 多对一，与 File 一对一（可选）

#### 5. Discipline (专业字典)

**002 中新增，001 中不存在**

```go
type Discipline struct {
    ID          string    `json:"id" gorm:"type:uuid;primaryKey"`
    Name        string    `json:"name" gorm:"uniqueIndex;not null"`
    Code        string    `json:"code" gorm:"uniqueIndex"`
    Description string    `json:"description"`
    IsGlobal    bool      `json:"is_global" gorm:"default:true"`
    ProjectID   *string   `json:"project_id" gorm:"type:uuid"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}
```

**用途**: 管理专业字典，支持全局专业和项目级专业  
**关系**: 与 Project 多对一（可选，项目级专业），与 ProjectMember 一对多

### 2.2 字段差异（002 有但 001 没有）

已在上述实体对比中详细列出，主要包括：
- UUID 类型的 ID
- 软删除标记（`IsDeleted`）
- 更细化的角色定义
- 财务实体的统一化字段
- 文件关联方式（通过 File 实体而非直接路径）

---

## 三、详细实体对比表

| 实体名称 | 001 | 002 | 状态 | 说明 |
|---------|-----|-----|------|------|
| User | ✅ | ✅ | 修改 | ID 类型变更，角色定义更细化，新增 HasAccount |
| Project | ✅ | ✅ | 修改 | ID 类型变更，移除 ManagerID，新增 BusinessManagerID/ProductionManagerID，新增 IsDeleted |
| Client | ✅ | ✅ | 修改 | ID 类型变更 |
| Contract | ✅ | ✅ | 修改 | ID 类型变更，文件关联方式变更，补充协议支持金额明细 |
| ContractAmendment | ✅ | ✅ | 修改 | ID 类型变更，新增金额明细字段 |
| ProjectMember | ✅ | ✅ | 修改 | ID 类型变更，新增 DisciplineID，角色枚举调整 |
| File | ✅ | ✅ | 修改 | ID 类型变更，Category 枚举调整，新增 IsDeleted |
| FinancialRecord | ✅ | ✅ | 重大修改 | 完全重构，统一所有财务业务 |
| ExpertFeePayment | ✅ | ❌ | 移除 | 整合到 FinancialRecord |
| Bonus | ✅ | ❌ | 移除 | 整合到 FinancialRecord |
| CompanyConfig | ✅ | ❌ | 移除 | 未在 002 中定义 |
| BiddingInfo | ❌ | ✅ | 新增 | 招投标信息管理 |
| ProductionApproval | ❌ | ✅ | 新增 | 批复审计信息管理 |
| ProductionFile | ❌ | ✅ | 新增 | 生产阶段文件管理 |
| ExternalCommission | ❌ | ✅ | 新增 | 对外委托管理 |
| Discipline | ❌ | ✅ | 新增 | 专业字典管理 |

---

## 四、ID 类型变更影响

### 4.1 变更范围

所有实体的 ID 字段从 `uint` 变更为 `string (UUID v4)`，包括：
- User.ID
- Project.ID
- Client.ID
- Contract.ID
- ContractAmendment.ID
- ProjectMember.ID
- File.ID
- FinancialRecord.ID
- 以及所有新增实体

### 4.2 外键关联影响

所有外键字段也需要相应变更：
- `Project.ClientID`: `uint` → `*string (UUID)`
- `Project.BusinessManagerID`: 新增 `*string (UUID)`
- `Project.ProductionManagerID`: 新增 `*string (UUID)`
- `Contract.ProjectID`: `uint` → `string (UUID)`
- `FinancialRecord.ProjectID`: `uint` → `string (UUID)`
- 等等

---

## 五、财务实体统一化分析

### 5.1 001 的财务模型

001 使用多个独立实体管理财务：
- `FinancialRecord`: 应收、开票、支付记录（按费用类型分别记录）
- `Bonus`: 奖金记录
- `ExpertFeePayment`: 专家费支付记录

### 5.2 002 的财务模型

002 统一使用 `FinancialRecord` 实体，通过 `FinancialType` 区分不同业务：
- `bonus`: 奖金
- `cost`: 成本（打车、住宿、公共交通）
- `client_payment`: 甲方支付
- `our_invoice`: 我方开票
- `expert_fee`: 专家费
- `commission_payment`: 委托支付
- `vendor_invoice`: 对方开票

### 5.3 迁移映射关系

| 001 实体 | 002 FinancialRecord 映射 |
|---------|-------------------------|
| `Bonus` | `financial_type=bonus, direction=expense, bonus_category={bonus_type}` |
| `ExpertFeePayment` | `financial_type=expert_fee, direction=expense, payment_method={payment_method}, expert_name={expert_name}` |
| `FinancialRecord (receivable)` | `financial_type=client_payment, direction=income` |
| `FinancialRecord (invoice)` | `financial_type=our_invoice, direction=income` |
| `FinancialRecord (payment)` | `financial_type=client_payment, direction=income` |

---

## 六、迁移建议

### 6.1 数据迁移策略

1. **ID 迁移**
   - 为所有现有记录生成新的 UUID
   - 建立旧 ID 到新 UUID 的映射表
   - 更新所有外键关联

2. **财务数据迁移**
   - 将 `Bonus` 记录迁移到 `FinancialRecord` (financial_type=bonus)
   - 将 `ExpertFeePayment` 记录迁移到 `FinancialRecord` (financial_type=expert_fee)
   - 将原有的 `FinancialRecord` 记录根据 `RecordType` 映射到新的 `FinancialType`

3. **文件关联迁移**
   - 将 `Contract.FilePath` 和 `ContractAmendment.FilePath` 转换为 File 实体关联
   - 创建对应的 File 记录并更新关联

4. **配置数据迁移**
   - `CompanyConfig` 数据需要评估是否保留，如需要可通过其他方式管理（环境变量、配置文件等）

### 6.2 代码迁移注意事项

1. **类型变更**: 所有 ID 相关的类型定义需要从 `uint` 变更为 `string`
2. **查询变更**: 数据库查询中的 ID 比较需要适配 UUID 格式
3. **API 变更**: 所有 API 路径参数和请求/响应中的 ID 字段类型需要变更
4. **验证变更**: ID 格式验证从数字验证变更为 UUID 格式验证

---

## 七、总结

### 7.1 主要变化

1. **架构升级**: ID 类型从 `uint` 升级为 `UUID`，提高系统可扩展性和分布式支持
2. **业务扩展**: 新增招投标、生产管理、对外委托等业务实体
3. **财务统一**: 统一财务实体，简化财务业务管理
4. **文件管理**: 统一文件管理方式，通过 File 实体关联而非直接路径

### 7.2 001 相比 002 的优势

- **简单直接**: 001 的财务模型更直观，每个业务类型有独立实体
- **配置管理**: 001 有 `CompanyConfig` 实体，便于系统配置管理

### 7.3 002 相比 001 的优势

- **统一性**: 财务实体统一，便于财务数据统计和分析
- **扩展性**: UUID 类型支持更好的分布式系统架构
- **完整性**: 新增的业务实体覆盖了更完整的业务流程
- **灵活性**: 专业字典支持全局和项目级，更灵活

---

**报告结束**

