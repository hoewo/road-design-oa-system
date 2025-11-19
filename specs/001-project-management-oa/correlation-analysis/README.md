# 实体 JSON 文件结构

**Feature**: 001-project-management-oa  
**Date**: 2025-01-27  
**Purpose**: 所有实体以 JSON 格式存储，按类型分类，每个实体一个文件

---

## 目录结构

```
entities/
├── Feature/              # 功能特性
│   └── 001.json
├── User_Story/           # 用户故事
│   ├── US1.json
│   ├── US2.json
│   ├── US3.json
│   ├── US4.json
│   └── US5.json
├── Functional_Requirement/  # 功能需求
│   ├── FR-001.json
│   ├── FR-001a.json
│   ├── FR-001b.json
│   ├── ...
│   └── FR-012.json
├── Success_Criteria/     # 成功标准
│   ├── SC-001.json
│   ├── SC-002.json
│   └── ...
├── Key_Entity/           # 关键实体（概念层面）
│   ├── 项目.json
│   ├── 甲方.json
│   ├── 合同.json
│   ├── 人员.json
│   ├── 文件.json
│   └── 财务记录.json
├── Data_Entity/          # 数据实体（技术实现）
│   ├── User.json
│   ├── Project.json
│   ├── Client.json
│   ├── Contract.json
│   ├── ProjectMember.json
│   ├── File.json
│   ├── FinancialRecord.json
│   └── Bonus.json
├── API_Endpoint/         # API 端点
│   ├── auth_login.json
│   ├── auth_logout.json
│   ├── projects_list.json
│   ├── projects_create.json
│   └── ...
├── Phase/                # 任务执行阶段
│   ├── Phase-1.json
│   ├── Phase-2.json
│   └── ...
├── Task/                 # 可执行任务
│   ├── T001.json
│   ├── T002.json
│   ├── ...
│   └── T108.json
├── Edge_Case/            # 边界情况
│   ├── EC-001.json
│   ├── EC-002.json
│   └── ...
├── Research_Decision/    # 研究决策
│   ├── RD-001.json
│   ├── RD-002.json
│   └── ...
└── Technical_Context/    # 技术上下文
    └── TC-001.json
```

---

## 实体统计

- **Feature**: 1个
- **User_Story**: 5个
- **Functional_Requirement**: 23个（FR-001 到 FR-012，包括子需求 FR-001a 到 FR-001k）
- **Success_Criteria**: 8个（SC-001 到 SC-008）
- **Key_Entity**: 6个（项目、甲方、合同、人员、文件、财务记录）
- **Data_Entity**: 8个（User, Project, Client, Contract, ProjectMember, File, FinancialRecord, Bonus）
- **API_Endpoint**: 20个（主要 API 端点）
- **Phase**: 8个（Phase-1 到 Phase-8）
- **Task**: 131个（T001 到 T108，包括子任务如 T029a, T029b 等）
- **Edge_Case**: 9个（EC-001 到 EC-009）
- **Research_Decision**: 5个（RD-001 到 RD-005）
- **Technical_Context**: 1个（TC-001）

**总计**: 225 个实体文件，12 种实体类型

---

## 文件命名规则

- 每个 JSON 文件使用实体的 `id` 作为文件名
- 文件名格式：`{id}.json`
- 例如：`US1.json`, `FR-001.json`, `项目.json`

---

## JSON 文件格式

每个 JSON 文件包含：
- `id`: 实体唯一标识符
- `type`: 实体类型
- 其他实体特定字段

示例（User_Story/US1.json）：
```json
{
  "id": "US1",
  "type": "User_Story",
  "title": "项目信息录入与管理",
  "priority": "P1",
  ...
}
```

---

## 扩展说明

### 添加新实体

1. 在对应的类型文件夹中创建新的 JSON 文件
2. 文件名使用实体的 `id`
3. 确保 JSON 格式正确，包含 `id` 和 `type` 字段

### 实体完整性

所有实体已完整提取：
- ✅ 所有131个任务已提取
- ✅ 所有8个阶段已提取（包含详细信息）
- ✅ 所有9个边界情况已提取
- ✅ 所有实体类型已覆盖

---

## 使用场景

- **实体查询**: 直接读取 JSON 文件获取实体信息
- **关联分析**: 通过 `related_user_stories`, `related_functional_requirements` 等字段建立关联
- **代码生成**: 基于实体 JSON 生成代码、文档等
- **数据验证**: 验证实体完整性和一致性

---

**最后更新**: 2025-01-27
