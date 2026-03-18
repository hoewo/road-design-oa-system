-- Baseline: versioned migrations 从本文件开始生效，此前 schema 由应用启动时 GORM Migrate() 维护。
-- 后续所有 schema 变更请新增 000002_xxx.up.sql / .down.sql，保证可回滚。
SELECT 1;
