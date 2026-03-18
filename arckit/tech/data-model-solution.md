# 数据模型设计技术方案

**领域**: project-management  
**状态**: ✅ 已采用  
**最后更新**: 2026-03-17

## 概述

研究如何统一所有财务相关实体为单一的财务记录实体，以及如何设计专业字典，支持全局专业列表和项目内自定义专业。

## 财务记录统一实体设计

**决策**: 使用统一的 FinancialRecord 实体，通过财务类型（financial_type）和方向（direction）区分不同业务场景

**理由**:
- 简化数据模型，从 7 个实体统一为 1 个实体
- 统一财务统计逻辑，便于计算和报表
- 支持支付和开票的关联，跟踪完整业务流程
- 便于扩展新的财务类型

**财务类型枚举**:
- 奖金（经营奖金、生产奖金）
- 成本（打车、住宿、公共交通）
- 甲方支付
- 我方开票
- 专家费
- 委托支付
- 对方开票

**方向枚举**: 收入（in）、支出（out）

**实现要点**:
- 类型特定字段：通过 JSON 字段或可选字段存储
- 关联字段：支持支付和开票的关联
- 奖金发放人员关联到项目中的用户

**备选方案**:
- 保持独立实体：实体数量多，统计逻辑复杂
- 使用继承：Go 不支持继承，实现复杂
- 使用组合：代码复杂，查询性能差

**详细设计参考**: `_shared/models/FinancialRecord.yaml`

## 专业字典设计方案

**决策**: 创建 Discipline 实体，支持全局专业字典和项目级专业扩展

**理由**:
- 全局专业字典保证跨项目一致性
- 项目内可临时新增专业，并同步回字典
- 支持专业的自定义扩展
- 便于专业管理和统计

**实体定义**:
```go
type Discipline struct {
    ID          uint      `json:"id" gorm:"primaryKey"`
    Name        string    `json:"name" gorm:"uniqueIndex;not null"`
    Code        string    `json:"code" gorm:"uniqueIndex"`
    Description string    `json:"description"`
    IsGlobal    bool      `json:"is_global" gorm:"default:true"`
    ProjectID   *uint     `json:"project_id"` // 项目级专业关联项目ID
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}
```

**业务规则**:
- 全局专业：所有项目可用，由管理员维护
- 项目级专业：仅在特定项目中使用，可同步回全局字典
- 专业名称唯一性：全局专业名称唯一，项目级专业在项目内唯一

**备选方案**:
- 仅全局专业：无法满足项目特定需求
- 仅项目级专业：跨项目不一致，难以管理
- 使用枚举：无法支持自定义扩展
