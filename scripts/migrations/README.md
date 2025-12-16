# 数据库迁移说明

## 概述

所有数据库迁移逻辑已经整合到 `backend/pkg/database/database.go` 的 `Migrate()` 函数中。

数据库初始化时会自动执行所有必要的迁移操作，包括：
- 用户角色迁移（从单个role字段到roles数组）
- 联系人数据迁移（从clients表到project_contacts表）
- 财务记录数据迁移（从Bonus、ExpertFeePayment、ProductionCost到FinancialRecord）
- 专业字典默认数据初始化
- 招投标信息表结构迁移（从单文件字段到数组字段）

## 迁移特点

- **幂等性**: 所有迁移操作都是幂等的，可以安全地多次执行
- **自动执行**: 应用启动时自动执行，无需手动运行脚本
- **错误处理**: 迁移过程中会检查表/列是否存在，避免重复操作
- **向后兼容**: 支持从旧版本数据库自动升级到新版本

## 迁移逻辑位置

所有迁移逻辑位于：`backend/pkg/database/database.go`

主要迁移函数：
- `migrateUserRoles()`: 用户角色迁移
- `migrateContactData()`: 联系人数据迁移
- `migrateFinancialRecords()`: 财务记录数据迁移
- `initializeDisciplines()`: 专业字典初始化
- `migrateBiddingInfoToArray()`: 招投标信息数组字段迁移

## 注意事项

- 数据库迁移在应用启动时自动执行
- 如果数据库已经是新版本结构，迁移会自动跳过
- 建议在生产环境部署前，在测试环境充分测试迁移逻辑
