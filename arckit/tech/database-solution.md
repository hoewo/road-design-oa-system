# 数据库与迁移技术方案

**领域**: project-management  
**状态**: ✅ 已采用  
**最后更新**: 2026-03-17

## 概述

研究如何同时支持本地 PostgreSQL 和阿里云 RDS（PostgreSQL 兼容），以及如何设计数据库迁移策略。

## 数据库兼容性设计（PostgreSQL/RDS）

**决策**: 使用 GORM ORM，通过数据库连接字符串切换

**理由**:
- GORM 支持 PostgreSQL，兼容性好
- 阿里云 RDS PostgreSQL 完全兼容 PostgreSQL 协议
- 通过连接字符串即可切换，无需修改代码
- 数据库迁移工具（golang-migrate）支持 PostgreSQL

**实现**:
- 使用 GORM 作为 ORM 框架
- 数据库连接字符串通过配置管理
- 数据库迁移使用 golang-migrate 工具
- 支持本地 PostgreSQL 和阿里云 RDS PostgreSQL

**配置示例**:
```yaml
# 本地开发
database:
  type: postgresql
  dsn: "host=localhost user=postgres password=postgres dbname=project_oa port=5432 sslmode=disable"

# 生产环境（阿里云RDS）
database:
  type: rds
  dsn: "host=<rds-endpoint> user=<username> password=<password> dbname=project_oa port=5432 sslmode=require"
```

**备选方案**:
- 使用原生 SQL：开发效率低，维护成本高
- 使用其他 ORM：生态不如 GORM 成熟
- 使用数据库代理：增加复杂度，不必要

## 数据库迁移策略

**决策**: 启动时先执行 GORM AutoMigrate + 手写 SQL（`Migrate()`），再执行版本化 SQL 迁移（golang-migrate）

**理由**:
- 生产环境需要可追溯、可回滚的 schema 变更，版本化迁移满足该需求
- 现有 GORM + 手写 SQL 保留以兼容已有部署，新版变更放入 `migrations/` 目录
- 同一套流程同时适配本地 PostgreSQL 和阿里云 RDS

**实现**:
- 应用启动时依次执行 `database.Migrate()`、`database.RunVersionedMigrations()`
- `Migrate()`：UUID 扩展、用户角色/招投标等历史数据迁移、AutoMigrate 全表、初始化专业字典
- `RunVersionedMigrations()`：对迁移目录执行 migrate up，支持回滚（migrate down）。迁移目录优先取环境变量 `MIGRATIONS_PATH`（绝对路径），未设置时再按进程 cwd 试 `migrations`、`backend/migrations`，避免 systemd/Docker 下 cwd 不确定导致找不到文件
- 后续所有 schema 变更以新编号迁移文件形式添加（如 `000002_xxx.up.sql`），禁止再在 `Migrate()` 内写死

**备选方案**:
- 纯手写 SQL：可控性高，维护成本更高
- 仅 AutoMigrate：无版本与回滚能力
