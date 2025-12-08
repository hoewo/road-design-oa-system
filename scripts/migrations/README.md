# 数据库迁移脚本

本目录包含数据库迁移脚本，用于将数据库结构从旧版本迁移到新版本。

## 迁移脚本列表

### 001_convert_ids_to_uuid.sql
- **目的**: 将所有表的ID字段从整数类型转换为UUID类型
- **状态**: 模板脚本（需要根据实际数据库结构定制）
- **警告**: 这是破坏性迁移，执行前请备份数据库

### 002_add_project_contacts.sql
- **目的**: 创建 `project_contacts` 表
- **状态**: 可用
- **说明**: 创建项目联系人表，支持项目特定的联系人信息

### 003_migrate_contact_data.sql
- **目的**: 将联系人数据从 `clients` 表迁移到 `project_contacts` 表
- **状态**: 可用（需要先执行002）
- **说明**: 迁移现有的联系人信息到新的项目联系人实体

### 007_add_disciplines.sql
- **目的**: 创建 `disciplines` 表
- **状态**: 可用
- **说明**: 创建专业字典表，包含默认的专业数据

## 使用说明

### 执行迁移

1. **备份数据库**
   ```bash
   pg_dump -U username -d database_name > backup.sql
   ```

2. **执行迁移脚本**
   ```bash
   psql -U username -d database_name -f scripts/migrations/002_add_project_contacts.sql
   ```

3. **验证迁移结果**
   - 检查表结构是否正确
   - 验证数据完整性
   - 测试应用程序功能

### 迁移顺序

1. 首先执行 `001_convert_ids_to_uuid.sql`（如果从旧版本迁移）
2. 然后执行 `002_add_project_contacts.sql`
3. 接着执行 `003_migrate_contact_data.sql`
4. 最后执行 `007_add_disciplines.sql`

## 注意事项

- 所有迁移脚本都使用 `CREATE IF NOT EXISTS` 和 `ON CONFLICT DO NOTHING` 来确保幂等性
- 在生产环境执行前，请在测试环境充分测试
- 建议在低峰期执行迁移，避免影响业务
- 执行迁移后，验证应用程序功能是否正常

## 待完成的迁移脚本

- `004_migrate_bonus_to_financial_record.sql`: 将Bonus数据迁移到FinancialRecord
- `005_migrate_expert_fee_to_financial_record.sql`: 将ExpertFeePayment数据迁移到FinancialRecord
- `006_migrate_production_cost_to_financial_record.sql`: 将ProductionCost数据迁移到FinancialRecord

