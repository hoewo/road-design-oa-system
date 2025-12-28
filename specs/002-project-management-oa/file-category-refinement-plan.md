# 文件类型细分优化计划（彻底修改版）

## 目标
**彻底统一文件分类体系，完全移除通用类型，所有文件类型细分，确保文件管理页面和项目详情页完全一致。**

## 问题分析

### 1. 当前问题总结

#### 1.1 招投标文件
- **文件管理页面**：只有 `bidding`（通用类型）
- **项目详情页**：需要 `tender`、`bid`、`award_notice` 三种细分
- **问题**：文件管理页面上传的文件无法在项目详情页正确分类

#### 1.2 合同文件
- **文件管理页面**：只有 `contract`（通用类型）
- **项目详情页**：实际分为：
  - 主合同：`Contract.ContractFileID`
  - 补充协议：`ContractAmendment.AmendmentFileID`
  - 外委合同：`ExternalCommission.ContractFileID`
- **问题**：无法区分文件用途

#### 1.3 设计文件
- **文件管理页面**：有 `design`（通用类型）
- **实际情况**：设计文件已经在生产文件中细分（`preliminary_design`、`construction_drawing`等）
- **问题**：`design` 类型可能冗余，需要确认是否还需要

#### 1.4 审计文件
- **文件管理页面**：有 `audit` 和 `audit_report`
- **实际情况**：
  - `audit_report` 用于批复审计报告（`ProductionApproval`）
  - `audit` 可能是通用审计文件
- **问题**：需要确认 `audit` 是否还需要，或者合并到 `audit_report`

### 2. 影响范围

#### 2.1 代码影响范围
- **后端**：
  - `backend/internal/models/file.go` - FileCategory 枚举
  - `backend/internal/services/file_service.go` - 验证逻辑
  - `backend/internal/handlers/file_handler.go` - 验证列表
  - `backend/internal/handlers/production_file_handler.go` - 生产文件上传
  - `backend/internal/handlers/contract_handler.go` - 合同文件上传
  - `backend/internal/handlers/contract_amendment_handler.go` - 补充协议文件上传
  - `backend/internal/handlers/external_commission_handler.go` - 外委合同文件上传（如果直接上传）
  - `backend/internal/handlers/production_approval_handler.go` - 批复审计文件上传
  - `backend/internal/models/production_file.go` - ToFileCategory 方法
  - 所有使用 FileCategory 的地方

- **前端**：
  - `frontend/src/types/index.ts` - FileCategory 类型定义
  - `frontend/src/components/file/FileUpload.tsx` - 上传选项
  - `frontend/src/components/file/FileList.tsx` - 列表标签
  - `frontend/src/components/file/FileSearch.tsx` - 搜索选项
  - `frontend/src/components/contract/ContractFileList.tsx` - 合同文件列表
  - `frontend/src/components/business/BiddingFileList.tsx` - 招投标文件列表
  - `frontend/src/components/production/*.tsx` - 生产相关组件
  - 所有使用 FileCategory 的地方

## 彻底修改方案

### 原则
1. **完全移除通用类型**：`bidding`、`contract`、`design`、`audit` 全部移除
2. **所有类型细分**：每个文件类型都有明确的业务含义
3. **统一命名规范**：使用下划线命名，与现有规范一致
4. **完整覆盖**：确保所有使用场景都更新

### 最终文件类型列表

#### 合同相关（3个）
- `contract_main` - 主合同文件
- `contract_amendment` - 补充协议文件
- `contract_external` - 外委合同文件

#### 招投标相关（3个）
- `tender` - 招标文件
- `bid` - 投标文件
- `award_notice` - 中标通知书

#### 生产相关（6个，已存在）
- `scheme_ppt` - 方案PPT
- `preliminary_design` - 初步设计
- `construction_drawing` - 施工图设计
- `variation_order` - 变更洽商
- `completion_report` - 竣工验收
- `audit_report` - 审计报告（用于生产阶段的校审单和批复审计）

#### 其他（1个）
- `invoice` - 发票文件

**总计：13个文件类型**

**移除的类型**：
- `bidding` - 替换为 `tender`、`bid`、`award_notice`
- `contract` - 替换为 `contract_main`、`contract_amendment`、`contract_external`
- `design` - 移除（设计文件已在生产文件中细分）
- `audit` - 移除（统一使用 `audit_report`）

## 详细修改计划

### 第一阶段：后端模型和验证逻辑

#### 1.1 更新 FileCategory 枚举
**文件**：`backend/internal/models/file.go`

**修改内容**：
```go
const (
	// 合同相关
	FileCategoryContractMain       FileCategory = "contract_main"       // 主合同文件
	FileCategoryContractAmendment FileCategory = "contract_amendment"  // 补充协议文件
	FileCategoryContractExternal  FileCategory = "contract_external"   // 外委合同文件
	
	// 招投标相关
	FileCategoryTender    FileCategory = "tender"        // 招标文件
	FileCategoryBid       FileCategory = "bid"           // 投标文件
	FileCategoryAward     FileCategory = "award_notice"  // 中标通知书
	
	// 生产相关（已存在）
	FileCategorySchemePPT       FileCategory = "scheme_ppt"        // 方案PPT
	FileCategoryPreliminary     FileCategory = "preliminary_design" // 初步设计
	FileCategoryConstruction    FileCategory = "construction_drawing" // 施工图设计
	FileCategoryVariation       FileCategory = "variation_order"  // 变更洽商
	FileCategoryCompletion      FileCategory = "completion_report" // 竣工验收
	FileCategoryAuditReport     FileCategory = "audit_report"      // 审计报告
	
	// 其他
	FileCategoryInvoice         FileCategory = "invoice"           // 发票文件
)
```

#### 1.2 添加转换辅助函数
**文件**：`backend/internal/models/bidding_info.go`（新建或扩展）

**添加内容**：
```go
// BiddingFileTypeToCategory 将招投标文件类型转换为 FileCategory
func BiddingFileTypeToCategory(biddingType string) FileCategory {
	switch biddingType {
	case "tender":
		return FileCategoryTender
	case "bid":
		return FileCategoryBid
	case "award":
		return FileCategoryAward
	default:
		return FileCategoryTender // 默认值
	}
}
```

#### 1.3 更新文件验证逻辑
**文件**：`backend/internal/services/file_service.go`

**修改内容**：
- 更新 `validateFileType` 中的 `validCategories` 列表，包含所有13个类型

#### 1.4 更新文件处理器验证列表
**文件**：`backend/internal/handlers/file_handler.go`

**修改内容**：
- 更新 `validCategories` 列表，包含所有13个类型

### 第二阶段：后端文件上传处理器

#### 2.1 更新合同文件上传
**文件**：`backend/internal/handlers/contract_handler.go`

**修改内容**：
- `UploadContractFile` 方法：使用 `FileCategoryContractMain`

#### 2.2 更新补充协议文件上传
**文件**：`backend/internal/handlers/contract_amendment_handler.go`

**修改内容**：
- 文件上传时使用 `FileCategoryContractAmendment`

#### 2.3 更新外委合同文件上传
**文件**：`backend/internal/handlers/external_commission_handler.go`

**检查**：如果直接上传文件，使用 `FileCategoryContractExternal`

#### 2.4 更新招投标文件上传
**文件**：`frontend/src/components/business/BiddingFileList.tsx`（前端）

**修改内容**：
- 上传时根据选择的文件类型使用对应的 FileCategory：
  - `tender` -> `'tender'`
  - `bid` -> `'bid'`
  - `award` -> `'award_notice'`

**注意**：招投标文件上传在前端完成，需要更新前端代码

### 第三阶段：前端类型定义和组件

#### 3.1 更新文件类型定义
**文件**：`frontend/src/types/index.ts`

**修改内容**：
```typescript
export type FileCategory =
  // 合同相关
  | 'contract_main'
  | 'contract_amendment'
  | 'contract_external'
  // 招投标相关
  | 'tender'
  | 'bid'
  | 'award_notice'
  // 生产相关
  | 'scheme_ppt'
  | 'preliminary_design'
  | 'construction_drawing'
  | 'variation_order'
  | 'completion_report'
  | 'audit_report'
  // 其他
  | 'invoice'
```

#### 3.2 更新文件上传组件
**文件**：`frontend/src/components/file/FileUpload.tsx`

**修改内容**：
```typescript
const FILE_CATEGORY_OPTIONS = [
  // 合同相关
  { label: '主合同文件', value: 'contract_main' as FileCategory },
  { label: '补充协议文件', value: 'contract_amendment' as FileCategory },
  { label: '外委合同文件', value: 'contract_external' as FileCategory },
  // 招投标相关
  { label: '招标文件', value: 'tender' as FileCategory },
  { label: '投标文件', value: 'bid' as FileCategory },
  { label: '中标通知书', value: 'award_notice' as FileCategory },
  // 生产相关
  { label: '方案PPT', value: 'scheme_ppt' as FileCategory },
  { label: '初步设计', value: 'preliminary_design' as FileCategory },
  { label: '施工图设计', value: 'construction_drawing' as FileCategory },
  { label: '变更洽商', value: 'variation_order' as FileCategory },
  { label: '竣工验收', value: 'completion_report' as FileCategory },
  { label: '审计报告', value: 'audit_report' as FileCategory },
  // 其他
  { label: '发票文件', value: 'invoice' as FileCategory },
]
```

#### 3.3 更新文件列表组件
**文件**：`frontend/src/components/file/FileList.tsx`

**修改内容**：
- 更新 `FILE_CATEGORY_LABELS`，包含所有13个类型的标签

#### 3.4 更新文件搜索组件
**文件**：`frontend/src/components/file/FileSearch.tsx`

**修改内容**：
- 更新 `FILE_CATEGORY_OPTIONS`，包含所有13个类型

#### 3.5 更新合同文件列表组件
**文件**：`frontend/src/components/contract/ContractFileList.tsx`

**修改内容**：
- 更新 `categoryMap`，包含所有13个类型

#### 3.6 更新招投标文件列表组件
**文件**：`frontend/src/components/business/BiddingFileList.tsx`

**修改内容**：
- 上传文件时，根据选择的文件类型使用对应的 FileCategory：
  ```typescript
  const categoryMap = {
    'tender': 'tender',
    'bid': 'bid',
    'award': 'award_notice'
  }
  const uploadedFile = await fileService.uploadFile(
    projectId,
    file,
    categoryMap[fileType],
    description
  )
  ```

### 第四阶段：全面检查和测试

#### 4.1 代码检查清单
- [ ] 后端所有使用 FileCategory 的地方都已更新
- [ ] 前端所有使用 FileCategory 的地方都已更新
- [ ] 所有文件上传处理器都使用正确的细分类型
- [ ] 所有验证列表都包含所有13个类型
- [ ] 所有前端组件都包含所有类型的标签和选项

#### 4.2 测试场景
1. **文件管理页面上传测试**：
   - 上传每种类型的文件
   - 验证文件类型选择是否正确
   - 验证文件列表显示是否正确

2. **项目详情页显示测试**：
   - 在文件管理页面上传招投标文件（tender/bid/award_notice）
   - 在项目详情页验证文件是否正确分类显示
   - 在文件管理页面上传合同文件（contract_main/contract_amendment/contract_external）
   - 在项目详情页验证文件是否正确关联

3. **搜索和筛选测试**：
   - 测试按文件类型搜索
   - 测试按文件类型筛选

4. **向后兼容测试**：
   - 验证旧文件（如果有）是否仍能正常显示
   - 验证旧文件在文件管理页面的显示

## 实施步骤（详细）

### Step 1: 后端模型更新
1. 更新 `backend/internal/models/file.go` - FileCategory 枚举
2. 创建/更新 `backend/internal/models/bidding_info.go` - 添加转换函数
3. 更新 `backend/internal/services/file_service.go` - 验证逻辑
4. 更新 `backend/internal/handlers/file_handler.go` - 验证列表

### Step 2: 后端处理器更新
1. 更新 `backend/internal/handlers/contract_handler.go`
2. 更新 `backend/internal/handlers/contract_amendment_handler.go`
3. 检查 `backend/internal/handlers/external_commission_handler.go`
4. 验证 `backend/internal/handlers/production_file_handler.go`（应该已经正确）
5. 验证 `backend/internal/handlers/production_approval_handler.go`（应该已经正确）

### Step 3: 前端类型定义更新
1. 更新 `frontend/src/types/index.ts` - FileCategory 类型

### Step 4: 前端组件更新
1. 更新 `frontend/src/components/file/FileUpload.tsx`
2. 更新 `frontend/src/components/file/FileList.tsx`
3. 更新 `frontend/src/components/file/FileSearch.tsx`
4. 更新 `frontend/src/components/contract/ContractFileList.tsx`
5. 更新 `frontend/src/components/business/BiddingFileList.tsx`

### Step 5: 编译和测试
1. 后端编译测试
2. 前端编译测试
3. 功能测试

## 风险评估

### 高风险项
1. **遗漏更新**：某些使用 FileCategory 的地方可能被遗漏
   - **缓解措施**：使用 grep 全面搜索所有使用 FileCategory 的地方

2. **旧数据兼容**：数据库中可能已有旧类型的文件
   - **缓解措施**：在文件列表显示时，对旧类型进行映射显示（但新上传必须使用新类型）

### 中风险项
1. **前端组件遗漏**：某些前端组件可能直接使用字符串而不是类型
   - **缓解措施**：全面搜索 'bidding'、'contract'、'design'、'audit' 字符串

### 低风险项
1. **编译错误**：TypeScript/Go 类型检查会捕获大部分错误
2. **功能影响**：只影响新上传的文件，不影响现有数据

## 验证清单

### 后端验证
- [ ] 所有 FileCategory 常量已更新
- [ ] 所有验证列表包含所有13个类型
- [ ] 所有文件上传处理器使用正确的细分类型
- [ ] 编译通过，无错误

### 前端验证
- [ ] FileCategory 类型定义包含所有13个类型
- [ ] 所有文件上传组件包含所有类型选项
- [ ] 所有文件列表组件包含所有类型标签
- [ ] 所有搜索组件包含所有类型选项
- [ ] 编译通过，无错误

### 功能验证
- [ ] 文件管理页面可以上传所有13种类型的文件
- [ ] 文件管理页面可以正确显示所有类型的文件
- [ ] 文件管理页面可以按类型搜索和筛选
- [ ] 项目详情页可以正确显示从文件管理页面上传的文件
- [ ] 项目详情页的文件上传功能正常工作

## 完成标准

1. ✅ 所有通用类型（bidding、contract、design、audit）已完全移除
2. ✅ 所有文件类型已细分，共13个类型
3. ✅ 后端所有相关代码已更新
4. ✅ 前端所有相关代码已更新
5. ✅ 编译通过，无错误
6. ✅ 功能测试通过
7. ✅ 文件管理页面和项目详情页完全一致
