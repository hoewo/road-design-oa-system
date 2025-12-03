# 001 vs 002 OpenAPI 对比分析报告

**生成时间**: 2025-01-28  
**对比范围**: `001-project-management-oa` vs `002-project-management-oa`  
**对比文件**: `contracts/openapi.yaml`

## 概述

本报告对比分析了 001 和 002 两个版本的 OpenAPI 规范差异，重点关注 **001 相比 002 多了哪些、少了哪些**。

### 主要变化总结

- **路由格式变更**: 001 使用传统 RESTful 路径，002 使用统一路由格式 `/{service}/{version}/{auth_level}/{path}`
- **认证方式变更**: 001 使用 JWT Bearer Token，002 使用网关 Header 注入（X-User-ID 等）
- **ID 类型变更**: 001 使用 `integer`，002 使用 `UUID (string)`
- **路径参数变更**: 所有路径参数从 `{id}` (integer) 变更为 `{id}` (UUID)
- **新增业务端点**: 002 新增了招投标、生产管理、对外委托、专业字典等端点
- **移除独立端点**: 001 中的专家费支付、奖金管理独立端点，在 002 中整合到财务记录端点

---

## 一、001 相比 002 多出的内容

### 1.1 认证相关端点

#### 1. POST /auth/login

**001 中存在，002 中移除**

```yaml
# 001 中的定义
/auth/login:
  post:
    tags: [认证]
    summary: 用户登录
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [username, password]
            properties:
              username: { type: string }
              password: { type: string }
    responses:
      '200':
        description: 登录成功
        content:
          application/json:
            schema:
              type: object
              properties:
                token: { type: string }
                user: { $ref: '#/components/schemas/User' }
```

**说明**: 002 中认证由网关处理，后端不再提供登录接口，从 Header 中读取用户信息（X-User-ID, X-User-Username 等）

#### 2. POST /auth/logout

**001 中存在，002 中移除**

```yaml
# 001 中的定义
/auth/logout:
  post:
    tags: [认证]
    summary: 用户登出
    responses:
      '200':
        description: 登出成功
```

**说明**: 002 中登出由网关处理，后端不再提供登出接口

### 1.2 专家费支付管理端点

#### GET /projects/{id}/expert-fee-payments

**001 中存在，002 中移除**

```yaml
# 001 中的定义
/projects/{id}/expert-fee-payments:
  get:
    tags: [项目经营信息]
    summary: 获取项目专家费支付列表
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: integer
    responses:
      '200':
        description: 专家费支付列表
        content:
          application/json:
            schema:
              type: array
              items:
                $ref: '#/components/schemas/ExpertFeePayment'
```

**在 002 中的对应**: 通过 `/user/projects/{id}/financial-records?financial_type=expert_fee` 查询

#### POST /projects/{id}/expert-fee-payments

**001 中存在，002 中移除**

```yaml
# 001 中的定义
/projects/{id}/expert-fee-payments:
  post:
    tags: [项目经营信息]
    summary: 添加专家费支付记录
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: integer
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/CreateExpertFeePaymentRequest'
    responses:
      '201':
        description: 添加成功
```

**在 002 中的对应**: 通过 `POST /user/projects/{id}/financial-records` 创建，设置 `financial_type=expert_fee`

### 1.3 奖金管理端点

#### GET /projects/{id}/bonuses

**001 中存在，002 中移除**

```yaml
# 001 中的定义
/projects/{id}/bonuses:
  get:
    tags: [奖金管理]
    summary: 获取项目奖金列表
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: integer
    responses:
      '200':
        description: 奖金列表
        content:
          application/json:
            schema:
              type: array
              items:
                $ref: '#/components/schemas/Bonus'
```

**在 002 中的对应**: 通过 `/user/projects/{id}/financial-records?financial_type=bonus` 查询

#### POST /projects/{id}/bonuses

**001 中存在，002 中移除**

```yaml
# 001 中的定义
/projects/{id}/bonuses:
  post:
    tags: [奖金管理]
    summary: 添加奖金记录
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: integer
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/CreateBonusRequest'
    responses:
      '201':
        description: 添加成功
```

**在 002 中的对应**: 通过 `POST /user/projects/{id}/financial-records` 创建，设置 `financial_type=bonus`

#### PUT /bonuses/{id}

**001 中存在，002 中移除**

```yaml
# 001 中的定义
/bonuses/{id}:
  put:
    tags: [奖金管理]
    summary: 更新奖金记录
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: integer
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/UpdateBonusRequest'
    responses:
      '200':
        description: 更新成功
```

**在 002 中的对应**: 通过 `PUT /user/projects/{id}/financial-records/{recordId}` 更新

#### DELETE /bonuses/{id}

**001 中存在，002 中移除**

```yaml
# 001 中的定义
/bonuses/{id}:
  delete:
    tags: [奖金管理]
    summary: 删除奖金记录
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: integer
    responses:
      '200':
        description: 删除成功
```

**在 002 中的对应**: 通过 `DELETE /user/projects/{id}/financial-records/{recordId}` 删除

### 1.4 文件下载端点

#### GET /files/{id}/download

**001 中存在，002 中路径变更**

```yaml
# 001 中的定义
/files/{id}/download:
  get:
    tags: [文件管理]
    summary: 下载文件
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: integer
    responses:
      '200':
        description: 文件下载
        content:
          application/octet-stream:
            schema:
              type: string
              format: binary
```

**在 002 中的对应**: `GET /user/projects/{id}/files/{fileId}`，路径更明确（包含项目ID）

### 1.5 Schema 差异

#### ExpertFeePayment Schema

**001 中存在，002 中移除**

```yaml
# 001 中的定义
ExpertFeePayment:
  type: object
  properties:
    id: { type: integer }
    payment_method: { type: string, enum: [cash, transfer] }
    amount: { type: number, format: float }
    expert_name: { type: string }
    expert_id: { type: integer, nullable: true }
    description: { type: string }
    project_id: { type: integer }
    created_by_id: { type: integer }
    created_at: { type: string, format: date-time }
    updated_at: { type: string, format: date-time }
```

**在 002 中的对应**: 通过 `FinancialRecord` Schema，设置 `financial_type=expert_fee`

#### CreateExpertFeePaymentRequest Schema

**001 中存在，002 中移除**

```yaml
# 001 中的定义
CreateExpertFeePaymentRequest:
  type: object
  required: [payment_method, amount, expert_name]
  properties:
    payment_method: { type: string, enum: [cash, transfer] }
    amount: { type: number, format: float }
    expert_name: { type: string }
    expert_id: { type: integer, nullable: true }
    description: { type: string }
```

**在 002 中的对应**: 使用 `CreateFinancialRecordRequest`，设置 `financial_type=expert_fee`

#### Bonus Schema

**001 中存在，002 中移除**

```yaml
# 001 中的定义
Bonus:
  type: object
  properties:
    id: { type: integer }
    bonus_type: { type: string, enum: [business, production] }
    amount: { type: number, format: float }
    description: { type: string }
    project_id: { type: integer }
    user_id: { type: integer }
    created_by_id: { type: integer }
    created_at: { type: string, format: date-time }
    updated_at: { type: string, format: date-time }
```

**在 002 中的对应**: 通过 `FinancialRecord` Schema，设置 `financial_type=bonus`

#### CreateBonusRequest / UpdateBonusRequest Schema

**001 中存在，002 中移除**

在 002 中使用 `CreateFinancialRecordRequest` / `UpdateFinancialRecordRequest` 替代

#### ProjectFinancial Schema

**001 中存在，002 中移除**

```yaml
# 001 中的定义
ProjectFinancial:
  type: object
  properties:
    total_contract_amount: { type: number, format: float }
    total_receivable: { type: number, format: float }
    total_invoiced: { type: number, format: float }
    total_paid: { type: number, format: float }
    total_outstanding: { type: number, format: float }
    management_fee_rate: { type: number, format: float }
    management_fee_amount: { type: number, format: float }
```

**说明**: 002 中可能通过其他方式提供财务统计，或整合到项目详情中

### 1.6 请求/响应模型差异

#### FinancialRecord Schema

**001 中的定义**:
```yaml
FinancialRecord:
  type: object
  properties:
    id: { type: integer }
    record_type: { type: string, enum: [receivable, invoice, payment, expense] }
    fee_type: { type: string, enum: [design_fee, survey_fee, consultation_fee] }
    receivable_amount: { type: number, format: float }
    invoice_number: { type: string }
    invoice_date: { type: string, format: date }
    invoice_amount: { type: number, format: float }
    payment_date: { type: string, format: date }
    payment_amount: { type: number, format: float }
    unpaid_amount: { type: number, format: float }
    description: { type: string }
    project_id: { type: integer }
    created_by_id: { type: integer }
    created_at: { type: string, format: date-time }
    updated_at: { type: string, format: date-time }
```

**002 中的定义**:
```yaml
FinancialRecord:
  type: object
  properties:
    id: { $ref: '#/components/schemas/UUID' }
    project_id: { $ref: '#/components/schemas/UUID' }
    financial_type: { type: string, enum: [bonus, cost, client_payment, our_invoice, expert_fee, commission_payment, vendor_invoice] }
    direction: { type: string, enum: [income, expense] }
    amount: { type: number, format: float }
    occurred_at: { $ref: '#/components/schemas/DateTime' }
    bonus_category: { type: string, enum: [business, production] }
    recipient_id: { $ref: '#/components/schemas/UUID' }
    cost_category: { type: string, enum: [taxi, accommodation, public_transport] }
    mileage: { type: number, format: float }
    client_id: { $ref: '#/components/schemas/UUID' }
    related_payment_id: { $ref: '#/components/schemas/UUID' }
    payment_method: { type: string, enum: [cash, transfer] }
    expert_name: { type: string }
    commission_type: { type: string, enum: [person, company] }
    vendor_name: { type: string }
    vendor_score: { type: number, format: float }
    related_commission_id: { $ref: '#/components/schemas/UUID' }
    description: { type: string }
    created_at: { $ref: '#/components/schemas/DateTime' }
    updated_at: { $ref: '#/components/schemas/DateTime' }
```

**主要差异**:
- ID 类型: `integer` → `UUID`
- 财务类型: `record_type` (receivable/invoice/payment/expense) → `financial_type` (bonus/cost/client_payment/our_invoice/expert_fee/commission_payment/vendor_invoice)
- 新增 `direction` 字段（income/expense）
- 移除 `fee_type`、`receivable_amount`、`invoice_number`、`invoice_date`、`invoice_amount`、`payment_date`、`payment_amount`、`unpaid_amount`
- 新增多种类型特定字段（bonus_category、cost_category、payment_method、expert_name 等）

---

## 二、001 相比 002 缺少的内容

### 2.1 新增业务端点

#### 1. 招投标信息管理

**002 中新增，001 中不存在**

```yaml
# 002 中的定义
/user/projects/{id}/bidding:
  get:
    tags: [招投标管理]
    summary: 获取项目招投标信息
  put:
    tags: [招投标管理]
    summary: 更新项目招投标信息
```

**功能**: 管理项目的招投标信息，包括招标文件、投标文件、中标通知书等

#### 2. 生产阶段文件管理

**002 中新增，001 中不存在**

```yaml
# 002 中的定义
/user/projects/{id}/production/files:
  get:
    tags: [生产文件管理]
    summary: 获取项目生产阶段文件列表
  post:
    tags: [生产文件管理]
    summary: 上传生产阶段文件

/user/projects/{id}/production/files/{fileId}:
  get:
    tags: [生产文件管理]
    summary: 获取生产阶段文件详情
  delete:
    tags: [生产文件管理]
    summary: 删除生产阶段文件
```

**功能**: 管理项目生产阶段的文件，包括方案、初步设计、施工图设计、变更洽商、竣工验收等阶段

#### 3. 批复审计信息管理

**002 中新增，001 中不存在**

```yaml
# 002 中的定义
/user/projects/{id}/production/approvals:
  get:
    tags: [批复审计管理]
    summary: 获取项目批复审计信息列表
  post:
    tags: [批复审计管理]
    summary: 创建批复审计信息

/user/projects/{id}/production/approvals/{approvalId}:
  get:
    tags: [批复审计管理]
    summary: 获取批复审计信息详情
  put:
    tags: [批复审计管理]
    summary: 更新批复审计信息
```

**功能**: 管理项目的批复和审计信息，包括批复/审计金额（按设计费、勘察费、咨询费拆分）

#### 4. 对外委托管理

**002 中新增，001 中不存在**

```yaml
# 002 中的定义
/user/projects/{id}/external-commissions:
  get:
    tags: [对外委托管理]
    summary: 获取项目对外委托列表
  post:
    tags: [对外委托管理]
    summary: 创建对外委托

/user/projects/{id}/external-commissions/{commissionId}:
  get:
    tags: [对外委托管理]
    summary: 获取对外委托详情
  put:
    tags: [对外委托管理]
    summary: 更新对外委托
  delete:
    tags: [对外委托管理]
    summary: 删除对外委托
```

**功能**: 管理项目的对外委托信息，包括委托类型（个人/单位）、委托方名称、评分等

#### 5. 专业字典管理

**002 中新增，001 中不存在**

```yaml
# 002 中的定义
/user/disciplines:
  get:
    tags: [专业字典管理]
    summary: 获取专业字典列表
  post:
    tags: [专业字典管理]
    summary: 创建专业

/user/disciplines/{id}:
  put:
    tags: [专业字典管理]
    summary: 更新专业
  delete:
    tags: [专业字典管理]
    summary: 删除专业
```

**功能**: 管理专业字典，支持全局专业和项目级专业

#### 6. 项目生产信息

**002 中新增，001 中不存在**

```yaml
# 002 中的定义
/user/projects/{id}/production:
  get:
    tags: [项目生产]
    summary: 获取项目生产信息
```

**功能**: 获取项目的完整生产信息，包括成员、生产文件、批复审计、对外委托等

#### 7. 公司收入管理

**002 中新增，001 中不存在**

```yaml
# 002 中的定义
/user/company/revenue:
  get:
    tags: [公司收入管理]
    summary: 获取公司收入统计
    description: 需要财务人员权限
```

**功能**: 获取公司级别的收入统计信息

### 2.2 合同管理端点增强

#### GET /user/projects/{id}/contracts/{contractId}

**002 中新增，001 中不存在**

```yaml
# 002 中的定义
/user/projects/{id}/contracts/{contractId}:
  get:
    tags: [合同管理]
    summary: 获取合同详情
  put:
    tags: [合同管理]
    summary: 更新合同
```

**说明**: 001 中只有合同列表和创建，002 新增了单个合同的查询和更新

### 2.3 补充协议管理端点增强

**002 中路径更明确，支持单个补充协议的查询和更新**

```yaml
# 002 中的定义
/user/projects/{id}/contracts/{contractId}/amendments/{amendmentId}:
  get:
    tags: [合同管理]
    summary: 获取补充协议详情
  put:
    tags: [合同管理]
    summary: 更新补充协议
  delete:
    tags: [合同管理]
    summary: 删除补充协议
```

**说明**: 001 中补充协议只有列表和创建，002 新增了单个补充协议的查询、更新和删除

### 2.4 文件管理端点增强

#### DELETE /user/projects/{id}/files/{fileId}

**002 中新增，001 中不存在**

```yaml
# 002 中的定义
/user/projects/{id}/files/{fileId}:
  delete:
    tags: [文件管理]
    summary: 删除文件（软删除）
```

**说明**: 002 支持文件的软删除

### 2.5 项目成员管理端点增强

#### PUT /user/projects/{id}/members/{memberId}

**002 中新增，001 中不存在**

```yaml
# 002 中的定义
/user/projects/{id}/members/{memberId}:
  put:
    tags: [项目成员管理]
    summary: 更新项目成员
  delete:
    tags: [项目成员管理]
    summary: 删除项目成员
```

**说明**: 001 中项目成员只有列表和添加，002 新增了更新和删除

### 2.6 财务记录端点增强

#### 查询参数增强

**002 中新增查询参数**:
```yaml
# 002 中的定义
/user/projects/{id}/financial-records:
  get:
    parameters:
      - name: financial_type
        in: query
        schema:
          type: string
          enum: [bonus, cost, client_payment, our_invoice, expert_fee, commission_payment, vendor_invoice]
      - name: direction
        in: query
        schema:
          type: string
          enum: [income, expense]
```

**说明**: 002 支持按财务类型和方向筛选财务记录

#### 路径参数变更

**002 中财务记录的更新和删除需要项目ID和记录ID**:
```yaml
# 002 中的定义
/user/projects/{id}/financial-records/{recordId}:
  put:
    summary: 更新财务记录
  delete:
    summary: 删除财务记录
```

**001 中的定义**:
```yaml
# 001 中的定义
/financial-records/{id}:
  put:
    summary: 更新财务记录
  delete:
    summary: 删除财务记录
```

**说明**: 002 的路径更明确，包含项目ID

### 2.7 新增 Schema

#### BiddingInfo Schema

**002 中新增，001 中不存在**

```yaml
BiddingInfo:
  type: object
  properties:
    id: { $ref: '#/components/schemas/UUID' }
    project_id: { $ref: '#/components/schemas/UUID' }
    tender_file_id: { $ref: '#/components/schemas/UUID' }
    bid_file_id: { $ref: '#/components/schemas/UUID' }
    award_notice_file_id: { $ref: '#/components/schemas/UUID' }
    created_at: { $ref: '#/components/schemas/DateTime' }
    updated_at: { $ref: '#/components/schemas/DateTime' }
```

#### ProductionFile Schema

**002 中新增，001 中不存在**

```yaml
ProductionFile:
  type: object
  properties:
    id: { $ref: '#/components/schemas/UUID' }
    project_id: { $ref: '#/components/schemas/UUID' }
    stage: { type: string, enum: [scheme, preliminary, construction, change, completion] }
    file_id: { $ref: '#/components/schemas/UUID' }
    review_sheet_file_id: { $ref: '#/components/schemas/UUID' }
    score: { type: number, format: float }
    description: { type: string }
    created_at: { $ref: '#/components/schemas/DateTime' }
    updated_at: { $ref: '#/components/schemas/DateTime' }
```

#### ProductionApproval Schema

**002 中新增，001 中不存在**

```yaml
ProductionApproval:
  type: object
  properties:
    id: { $ref: '#/components/schemas/UUID' }
    project_id: { $ref: '#/components/schemas/UUID' }
    approval_type: { type: string, enum: [approval, audit] }
    approver_id: { $ref: '#/components/schemas/UUID' }
    status: { type: string, enum: [pending, approved] }
    signed_at: { $ref: '#/components/schemas/DateTime' }
    report_file_id: { $ref: '#/components/schemas/UUID' }
    amount_design: { type: number, format: float }
    amount_survey: { type: number, format: float }
    amount_consulting: { type: number, format: float }
    total_amount: { type: number, format: float }
    source_contract_id: { $ref: '#/components/schemas/UUID' }
    override_reason: { type: string }
    remarks: { type: string }
    created_at: { $ref: '#/components/schemas/DateTime' }
    updated_at: { $ref: '#/components/schemas/DateTime' }
```

#### ExternalCommission Schema

**002 中新增，001 中不存在**

```yaml
ExternalCommission:
  type: object
  properties:
    id: { $ref: '#/components/schemas/UUID' }
    project_id: { $ref: '#/components/schemas/UUID' }
    vendor_type: { type: string, enum: [person, company] }
    vendor_name: { type: string }
    score: { type: number, format: float }
    contract_file_id: { $ref: '#/components/schemas/UUID' }
    notes: { type: string }
    created_at: { $ref: '#/components/schemas/DateTime' }
    updated_at: { $ref: '#/components/schemas/DateTime' }
```

#### Discipline Schema

**002 中新增，001 中不存在**

```yaml
Discipline:
  type: object
  properties:
    id: { $ref: '#/components/schemas/UUID' }
    name: { type: string }
    code: { type: string }
    description: { type: string }
    is_global: { type: boolean }
    project_id: { $ref: '#/components/schemas/UUID' }
    created_at: { $ref: '#/components/schemas/DateTime' }
    updated_at: { $ref: '#/components/schemas/DateTime' }
```

#### CompanyRevenue Schema

**002 中新增，001 中不存在**

```yaml
CompanyRevenue:
  type: object
  properties:
    total_receivable: { type: number, format: float }
    total_receivable_by_fee_type:
      type: object
      properties:
        design_fee: { type: number, format: float }
        survey_fee: { type: number, format: float }
        consultation_fee: { type: number, format: float }
    total_invoiced: { type: number, format: float }
    total_paid: { type: number, format: float }
    total_unpaid: { type: number, format: float }
    management_fee_ratio: { type: number, format: float }
    management_fee: { type: number, format: float }
    invoices: { type: array, items: { $ref: '#/components/schemas/FinancialRecord' } }
    payments: { type: array, items: { $ref: '#/components/schemas/FinancialRecord' } }
```

### 2.8 基础类型 Schema

#### UUID Schema

**002 中新增，001 中不存在**

```yaml
UUID:
  type: string
  format: uuid
  description: UUID v4格式的字符串
```

#### DateTime Schema

**002 中新增，001 中不存在**

```yaml
DateTime:
  type: string
  format: date-time
```

### 2.9 认证方式变更

#### 001 的认证方式

```yaml
security:
  - BearerAuth: []

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

#### 002 的认证方式

```yaml
security:
  - HeaderAuth: []

components:
  securitySchemes:
    HeaderAuth:
      type: apiKey
      in: header
      name: Authorization
      description: 网关验证JWT Token后注入用户信息到Header，后端从Header中读取用户信息（X-User-ID, X-User-Username等）
```

**说明**: 002 中认证由网关处理，后端从 Header 中读取用户信息，不再直接处理 JWT Token

### 2.10 路由格式变更

#### 001 的路由格式

```
/api/v1/projects
/api/v1/projects/{id}
/api/v1/projects/{id}/contracts
```

#### 002 的路由格式

```
/timejourney/v1/user/projects
/timejourney/v1/user/projects/{id}
/timejourney/v1/user/projects/{id}/contracts
/timejourney/v1/public/health
```

**说明**: 002 使用统一路由格式 `/{service}/{version}/{auth_level}/{path}`，其中：
- `service`: timejourney
- `version`: v1
- `auth_level`: public (无需认证) / user (需要认证)
- `path`: 具体业务路径

---

## 三、详细端点对比表

### 3.1 认证相关

| 端点 | 001 | 002 | 说明 |
|------|-----|-----|------|
| POST /auth/login | ✅ | ❌ | 002 由网关处理 |
| POST /auth/logout | ✅ | ❌ | 002 由网关处理 |
| GET /public/health | ❌ | ✅ | 002 新增健康检查 |

### 3.2 项目管理

| 端点 | 001 | 002 | 说明 |
|------|-----|-----|------|
| GET /projects | ✅ | ✅ | 路径变更：/user/projects |
| POST /projects | ✅ | ✅ | 路径变更：/user/projects |
| GET /projects/{id} | ✅ | ✅ | 路径变更，ID 类型变更 |
| PUT /projects/{id} | ✅ | ✅ | 路径变更，ID 类型变更 |
| DELETE /projects/{id} | ✅ | ✅ | 路径变更，ID 类型变更 |

### 3.3 项目经营信息

| 端点 | 001 | 002 | 说明 |
|------|-----|-----|------|
| GET /projects/{id}/business | ✅ | ✅ | 路径变更，ID 类型变更 |
| PUT /projects/{id}/business | ✅ | ✅ | 路径变更，ID 类型变更 |
| GET /projects/{id}/expert-fee-payments | ✅ | ❌ | 002 整合到财务记录 |
| POST /projects/{id}/expert-fee-payments | ✅ | ❌ | 002 整合到财务记录 |

### 3.4 合同管理

| 端点 | 001 | 002 | 说明 |
|------|-----|-----|------|
| GET /projects/{id}/contracts | ✅ | ✅ | 路径变更，ID 类型变更 |
| POST /projects/{id}/contracts | ✅ | ✅ | 路径变更，ID 类型变更 |
| GET /projects/{id}/contracts/{contractId} | ❌ | ✅ | 002 新增单个合同查询 |
| PUT /projects/{id}/contracts/{contractId} | ❌ | ✅ | 002 新增单个合同更新 |
| GET /contracts/{id}/amendments | ✅ | ✅ | 路径变更，ID 类型变更 |
| POST /contracts/{id}/amendments | ✅ | ✅ | 路径变更，ID 类型变更 |
| GET /projects/{id}/contracts/{contractId}/amendments/{amendmentId} | ❌ | ✅ | 002 新增单个补充协议查询 |
| PUT /projects/{id}/contracts/{contractId}/amendments/{amendmentId} | ❌ | ✅ | 002 新增单个补充协议更新 |
| DELETE /projects/{id}/contracts/{contractId}/amendments/{amendmentId} | ❌ | ✅ | 002 新增单个补充协议删除 |

### 3.5 财务管理

| 端点 | 001 | 002 | 说明 |
|------|-----|-----|------|
| GET /projects/{id}/financial | ✅ | ❌ | 002 移除，可能整合到项目详情 |
| POST /projects/{id}/financial | ✅ | ❌ | 002 使用 /financial-records |
| GET /projects/{id}/financial-records | ❌ | ✅ | 002 新增，支持查询参数 |
| POST /projects/{id}/financial-records | ❌ | ✅ | 002 新增 |
| PUT /financial-records/{id} | ✅ | ✅ | 路径变更，需要项目ID |
| DELETE /financial-records/{id} | ✅ | ✅ | 路径变更，需要项目ID |

### 3.6 奖金管理

| 端点 | 001 | 002 | 说明 |
|------|-----|-----|------|
| GET /projects/{id}/bonuses | ✅ | ❌ | 002 整合到财务记录 |
| POST /projects/{id}/bonuses | ✅ | ❌ | 002 整合到财务记录 |
| PUT /bonuses/{id} | ✅ | ❌ | 002 整合到财务记录 |
| DELETE /bonuses/{id} | ✅ | ❌ | 002 整合到财务记录 |

### 3.7 文件管理

| 端点 | 001 | 002 | 说明 |
|------|-----|-----|------|
| GET /projects/{id}/files | ✅ | ✅ | 路径变更，ID 类型变更 |
| POST /projects/{id}/files | ✅ | ✅ | 路径变更，ID 类型变更 |
| GET /files/{id}/download | ✅ | ✅ | 路径变更：/user/projects/{id}/files/{fileId} |
| DELETE /projects/{id}/files/{fileId} | ❌ | ✅ | 002 新增文件删除 |

### 3.8 项目成员管理

| 端点 | 001 | 002 | 说明 |
|------|-----|-----|------|
| GET /projects/{id}/members | ✅ | ✅ | 路径变更，ID 类型变更，支持查询参数 |
| POST /projects/{id}/members | ✅ | ✅ | 路径变更，ID 类型变更 |
| PUT /projects/{id}/members/{memberId} | ❌ | ✅ | 002 新增成员更新 |
| DELETE /projects/{id}/members/{memberId} | ❌ | ✅ | 002 新增成员删除 |

### 3.9 用户管理

| 端点 | 001 | 002 | 说明 |
|------|-----|-----|------|
| GET /users | ✅ | ✅ | 路径变更：/user/users，查询参数调整 |
| POST /users | ✅ | ✅ | 路径变更：/user/users |
| GET /users/{id} | ✅ | ✅ | 路径变更，ID 类型变更 |
| PUT /users/{id} | ✅ | ✅ | 路径变更，ID 类型变更 |

### 3.10 甲方管理

| 端点 | 001 | 002 | 说明 |
|------|-----|-----|------|
| GET /clients | ✅ | ✅ | 路径变更：/user/clients |
| POST /clients | ✅ | ✅ | 路径变更：/user/clients |
| GET /clients/{id} | ❌ | ✅ | 002 新增单个甲方查询 |
| PUT /clients/{id} | ❌ | ✅ | 002 新增单个甲方更新 |
| DELETE /clients/{id} | ❌ | ✅ | 002 新增单个甲方删除 |

### 3.11 新增业务端点

| 端点 | 001 | 002 | 说明 |
|------|-----|-----|------|
| GET /projects/{id}/bidding | ❌ | ✅ | 002 新增招投标信息查询 |
| PUT /projects/{id}/bidding | ❌ | ✅ | 002 新增招投标信息更新 |
| GET /projects/{id}/production | ❌ | ✅ | 002 新增项目生产信息查询 |
| GET /projects/{id}/production/files | ❌ | ✅ | 002 新增生产阶段文件列表 |
| POST /projects/{id}/production/files | ❌ | ✅ | 002 新增生产阶段文件上传 |
| GET /projects/{id}/production/files/{fileId} | ❌ | ✅ | 002 新增生产阶段文件详情 |
| DELETE /projects/{id}/production/files/{fileId} | ❌ | ✅ | 002 新增生产阶段文件删除 |
| GET /projects/{id}/production/approvals | ❌ | ✅ | 002 新增批复审计信息列表 |
| POST /projects/{id}/production/approvals | ❌ | ✅ | 002 新增批复审计信息创建 |
| GET /projects/{id}/production/approvals/{approvalId} | ❌ | ✅ | 002 新增批复审计信息详情 |
| PUT /projects/{id}/production/approvals/{approvalId} | ❌ | ✅ | 002 新增批复审计信息更新 |
| GET /projects/{id}/external-commissions | ❌ | ✅ | 002 新增对外委托列表 |
| POST /projects/{id}/external-commissions | ❌ | ✅ | 002 新增对外委托创建 |
| GET /projects/{id}/external-commissions/{commissionId} | ❌ | ✅ | 002 新增对外委托详情 |
| PUT /projects/{id}/external-commissions/{commissionId} | ❌ | ✅ | 002 新增对外委托更新 |
| DELETE /projects/{id}/external-commissions/{commissionId} | ❌ | ✅ | 002 新增对外委托删除 |
| GET /disciplines | ❌ | ✅ | 002 新增专业字典列表 |
| POST /disciplines | ❌ | ✅ | 002 新增专业创建 |
| PUT /disciplines/{id} | ❌ | ✅ | 002 新增专业更新 |
| DELETE /disciplines/{id} | ❌ | ✅ | 002 新增专业删除 |
| GET /company/revenue | ❌ | ✅ | 002 新增公司收入统计 |

---

## 四、路径格式对比

### 4.1 001 的路径格式

```
/api/v1/{resource}
/api/v1/{resource}/{id}
/api/v1/{resource}/{id}/{sub-resource}
```

**示例**:
- `/api/v1/projects`
- `/api/v1/projects/1`
- `/api/v1/projects/1/contracts`

### 4.2 002 的路径格式

```
/{service}/{version}/{auth_level}/{resource}
/{service}/{version}/{auth_level}/{resource}/{id}
/{service}/{version}/{auth_level}/{resource}/{id}/{sub-resource}
```

**示例**:
- `/timejourney/v1/user/projects`
- `/timejourney/v1/user/projects/{uuid}`
- `/timejourney/v1/user/projects/{uuid}/contracts`

**说明**:
- `service`: timejourney（服务名称）
- `version`: v1（API 版本）
- `auth_level`: public（无需认证）或 user（需要认证）
- `resource`: 业务资源路径

---

## 五、ID 类型变更影响

### 5.1 路径参数变更

所有路径参数从 `integer` 变更为 `UUID (string)`:

| 参数位置 | 001 | 002 |
|---------|-----|-----|
| 路径参数 `{id}` | `type: integer` | `type: string, format: uuid` |
| 路径参数 `{contractId}` | - | `type: string, format: uuid` |
| 路径参数 `{fileId}` | - | `type: string, format: uuid` |
| 路径参数 `{memberId}` | - | `type: string, format: uuid` |
| 路径参数 `{recordId}` | - | `type: string, format: uuid` |
| 路径参数 `{approvalId}` | - | `type: string, format: uuid` |
| 路径参数 `{commissionId}` | - | `type: string, format: uuid` |
| 路径参数 `{amendmentId}` | - | `type: string, format: uuid` |

### 5.2 Schema 中的 ID 字段变更

所有 Schema 中的 ID 字段从 `integer` 变更为 `UUID`:

| Schema | ID 字段 | 001 | 002 |
|--------|---------|-----|-----|
| User | id | `type: integer` | `$ref: '#/components/schemas/UUID'` |
| Project | id | `type: integer` | `$ref: '#/components/schemas/UUID'` |
| Client | id | `type: integer` | `$ref: '#/components/schemas/UUID'` |
| Contract | id | `type: integer` | `$ref: '#/components/schemas/UUID'` |
| ContractAmendment | id | `type: integer` | `$ref: '#/components/schemas/UUID'` |
| ProjectMember | id | `type: integer` | `$ref: '#/components/schemas/UUID'` |
| File | id | `type: integer` | `$ref: '#/components/schemas/UUID'` |
| FinancialRecord | id | `type: integer` | `$ref: '#/components/schemas/UUID'` |

---

## 六、迁移建议

### 6.1 API 路径迁移

1. **基础路径变更**
   - 001: `/api/v1/` → 002: `/timejourney/v1/user/` 或 `/timejourney/v1/public/`

2. **资源路径迁移**
   - 保持资源路径不变，但需要添加认证级别前缀
   - 示例: `/api/v1/projects` → `/timejourney/v1/user/projects`

3. **路径参数迁移**
   - 所有路径参数从整数 ID 变更为 UUID 字符串
   - 需要建立旧 ID 到新 UUID 的映射关系

### 6.2 请求/响应迁移

1. **ID 字段类型变更**
   - 所有请求和响应中的 ID 字段从 `integer` 变更为 `string (UUID)`
   - 需要更新客户端代码中的类型定义

2. **财务记录请求迁移**
   - 001 的 `CreateFinancialRecordRequest` 需要映射到 002 的 `CreateFinancialRecordRequest`
   - 001 的 `record_type` 需要映射到 002 的 `financial_type` 和 `direction`

3. **专家费支付迁移**
   - 001 的 `CreateExpertFeePaymentRequest` → 002 的 `CreateFinancialRecordRequest` (financial_type=expert_fee)

4. **奖金记录迁移**
   - 001 的 `CreateBonusRequest` → 002 的 `CreateFinancialRecordRequest` (financial_type=bonus)

### 6.3 认证迁移

1. **认证方式变更**
   - 001: 客户端发送 JWT Token 到后端，后端验证 Token
   - 002: 客户端发送 JWT Token 到网关，网关验证后注入 Header，后端从 Header 读取用户信息

2. **Header 变更**
   - 002 后端需要从以下 Header 读取用户信息：
     - `X-User-ID`: 用户ID（UUID格式）
     - `X-User-Username`: 用户名
     - `X-User-AppID`: 应用ID
     - `X-User-SessionID`: 会话ID（UUID格式）

### 6.4 客户端代码迁移

1. **API 客户端更新**
   - 更新所有 API 调用的基础 URL
   - 更新所有路径参数的类型（从 integer 到 UUID string）
   - 更新所有请求/响应模型中的 ID 字段类型

2. **认证逻辑更新**
   - 移除后端的登录/登出接口调用
   - 确保 Token 发送到网关而非后端
   - 后端不再需要处理 Token 验证

3. **错误处理更新**
   - 002 使用统一的错误响应格式
   - 更新错误码和错误消息的处理逻辑

---

## 七、总结

### 7.1 主要变化

1. **路由架构升级**: 从传统 RESTful 路径升级为统一路由格式，支持多服务和认证级别
2. **认证方式升级**: 从后端 JWT 验证升级为网关统一认证，提高安全性和可扩展性
3. **ID 类型升级**: 从 integer 升级为 UUID，支持更好的分布式系统架构
4. **业务功能扩展**: 新增招投标、生产管理、对外委托、专业字典等业务端点
5. **财务统一**: 统一财务端点，简化财务业务管理

### 7.2 001 相比 002 的优势

- **简单直接**: 001 的路径更简洁，易于理解
- **独立端点**: 专家费支付和奖金管理有独立端点，更直观
- **直接认证**: 后端直接处理认证，逻辑更集中

### 7.3 002 相比 001 的优势

- **统一性**: 财务端点统一，便于财务数据统计和分析
- **扩展性**: UUID 类型和统一路由格式支持更好的分布式系统架构
- **完整性**: 新增的业务端点覆盖了更完整的业务流程
- **安全性**: 网关统一认证，提高系统安全性
- **灵活性**: 支持多服务和认证级别，更灵活的路由配置

---

**报告结束**

