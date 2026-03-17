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

**决策**: 使用 golang-migrate 工具，支持 PostgreSQL 迁移

**理由**:
- golang-migrate 是 Go 生态最流行的迁移工具
- 支持 PostgreSQL，兼容阿里云 RDS
- 支持版本管理和回滚
- 支持 SQL 和 Go 代码混合迁移

**实现**:
- 使用 golang-migrate 的 CLI 工具
- 迁移文件存储在 `backend/migrations/` 目录
- 支持 up 和 down 迁移
- 部署时自动执行迁移

**备选方案**:
- 手动 SQL 脚本：容易出错，难以管理
- GORM AutoMigrate：不适合生产环境，无法回滚
- 其他迁移工具：生态不如 golang-migrate 成熟
