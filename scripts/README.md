# 数据库管理脚本

本目录包含数据库管理和维护脚本。

## 脚本说明

### 1. init-db.sh - 数据库初始化

**用途**: 首次设置时创建数据库和用户

**使用场景**:
- 首次运行项目
- 更换数据库
- 设置新的开发环境

**使用方法**:
```bash
# 使用默认配置
./scripts/init-db.sh

# 使用自定义配置
DB_NAME=mydb DB_USER=myuser DB_PASSWORD=mypass ./scripts/init-db.sh
```

**功能**:
- 创建数据库用户（如果不存在）
- 创建数据库（如果不存在）
- 设置权限
- 如果数据库已存在，可选择是否重建

**配置**:
脚本会从 `backend/.env` 读取以下配置：
- `DB_NAME` - 数据库名称（默认: project_oa）
- `DB_USER` - 数据库用户（默认: project_oa_user）
- `DB_PASSWORD` - 数据库密码（默认: project_oa_password）
- `DB_HOST` - 数据库主机（默认: localhost）
- `DB_PORT` - 数据库端口（默认: 5432）

### 2. reset-db.sh - 数据库重置

**用途**: 快速清空并重置数据库（开发环境使用）

**使用场景**:
- 遇到数据库迁移错误
- 需要清空所有数据重新开始
- 数据库结构出现问题

**使用方法**:
```bash
./scripts/reset-db.sh
```

**警告**: 
⚠️ 此操作会删除数据库中的所有数据，操作前会要求确认！

**功能**:
- 断开所有数据库连接
- 删除现有数据库
- 创建新的空数据库
- 下次启动时自动重建表结构

## 常见问题解决

### 问题 1: 唯一索引冲突错误

**错误信息**:
```
ERROR: could not create unique index "idx_clients_client_name" (SQLSTATE 23505)
```

**原因**: 数据库中存在重复数据或索引已存在

**解决方案**:
```bash
# 方法 1: 重置数据库（推荐）
./scripts/reset-db.sh

# 方法 2: 手动清理
psql -d project_oa -c "DELETE FROM clients WHERE client_name IN (
    SELECT client_name FROM clients 
    GROUP BY client_name HAVING COUNT(*) > 1
);"
```

### 问题 2: 数据库连接失败

**错误信息**:
```
failed to connect to database
```

**解决方案**:
```bash
# 1. 检查 PostgreSQL 是否运行
pg_isready -h localhost -p 5432

# 2. 启动 PostgreSQL
brew services start postgresql

# 3. 检查配置
cat backend/.env | grep DB_
```

### 问题 3: 权限不足

**错误信息**:
```
permission denied for database
```

**解决方案**:
```bash
# 重新运行初始化脚本
./scripts/init-db.sh

# 或手动授权
psql -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE project_oa TO project_oa_user;"
```

## 开发工作流

### 日常开发

1. **首次设置**:
   ```bash
   ./scripts/init-db.sh
   ./start.sh
   ```

2. **正常启动**:
   ```bash
   ./start.sh
   ```

3. **停止服务**:
   ```bash
   ./stop.sh
   ```

### 遇到数据库问题

1. **停止服务**:
   ```bash
   ./stop.sh
   ```

2. **重置数据库**:
   ```bash
   ./scripts/reset-db.sh
   ```

3. **重新启动**:
   ```bash
   ./start.sh
   ```

### 切换分支后

如果切换到不同的分支，数据库结构可能不同：

```bash
# 停止服务
./stop.sh

# 重置数据库
./scripts/reset-db.sh

# 重新启动（会自动迁移到新结构）
./start.sh
```

## 手动数据库操作

### 连接到数据库

```bash
psql -h localhost -p 5432 -U project_oa_user -d project_oa
```

### 查看表结构

```sql
-- 列出所有表
\dt

-- 查看表结构
\d clients

-- 查看索引
\di
```

### 备份和恢复

```bash
# 备份
pg_dump -h localhost -U project_oa_user project_oa > backup.sql

# 恢复
psql -h localhost -U project_oa_user project_oa < backup.sql
```

## 数据库维护

### 清理重复数据

```sql
-- 查找重复数据
SELECT client_name, COUNT(*) 
FROM clients 
GROUP BY client_name 
HAVING COUNT(*) > 1;

-- 保留最新的，删除旧的
DELETE FROM clients 
WHERE id NOT IN (
    SELECT MAX(id) 
    FROM clients 
    GROUP BY client_name
);
```

### 查看数据库大小

```sql
SELECT 
    pg_database.datname,
    pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
WHERE datname = 'project_oa';
```

### 查看表大小

```sql
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 注意事项

1. **开发环境专用**: 这些脚本设计用于开发环境，不适合生产环境
2. **数据安全**: 使用 `reset-db.sh` 前确保已备份重要数据
3. **权限配置**: 脚本使用 trust 认证，仅适合本地开发
4. **配置同步**: 修改 `.env` 后需要重启服务
5. **自动迁移**: GORM 会自动创建和更新表结构，但不会删除列

## 故障排查

### 检查服务状态

```bash
# PostgreSQL
pg_isready -h localhost -p 5432

# 查看进程
ps aux | grep postgres

# 查看日志
tail -f postgresql.log
```

### 重置整个环境

如果一切都出问题了：

```bash
# 1. 停止所有服务
./stop.sh

# 2. 清理数据
rm -rf .postgresql-data/
rm -rf .minio-data/
rm -f *.log

# 3. 重新开始
./start.sh
```

## 更多帮助

- PostgreSQL 文档: https://www.postgresql.org/docs/
- GORM 文档: https://gorm.io/docs/
- 项目文档: ../STARTUP_GUIDE.md

