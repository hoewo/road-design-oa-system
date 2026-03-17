# 存储方案技术方案

**领域**: project-management  
**状态**: ✅ 已采用  
**最后更新**: 2026-03-17

## 概述

研究如何设计统一的存储接口，同时支持 MinIO（本地开发）和阿里云 OSS（生产环境），以及统一的文件存储路径设计。

## 存储抽象层设计（MinIO/OSS 兼容）

**决策**: 定义统一的 Storage 接口，实现 MinIO 和 OSS 两个适配器

**理由**:
- 接口抽象层隐藏具体实现，业务代码不感知底层存储
- 通过配置切换存储方案，无需修改业务代码
- 支持本地开发和生产环境使用不同存储方案
- 便于测试和迁移

**接口定义**:

```go
// pkg/storage/interface.go
type Storage interface {
    UploadFile(ctx context.Context, bucket, objectName string, file io.Reader, size int64) error
    GetFile(ctx context.Context, bucket, objectName string) (io.Reader, error)
    DeleteFile(ctx context.Context, bucket, objectName string) error
    GetFileURL(ctx context.Context, bucket, objectName string) (string, error)
    ListFiles(ctx context.Context, bucket, prefix string) ([]FileInfo, error)
}

// pkg/storage/minio.go - MinIO实现
// pkg/storage/oss.go - 阿里云OSS实现
```

**配置**:
- 通过配置文件或环境变量指定存储类型
- 支持运行时切换（通过配置热更新）

**备选方案**:
- 直接使用 MinIO SDK：无法支持 OSS，需要修改代码切换
- 使用第三方抽象库：增加依赖，可能不符合项目需求
- 分别实现两套代码：代码重复，维护成本高

## 文件存储路径设计

**决策**: 使用统一的路径格式：`projects/{project_id}/{category}/{file_id}/{filename}`

**理由**:
- 路径结构清晰，便于管理和查找
- 支持按项目、类别组织文件
- 兼容 MinIO 和 OSS 的路径规范
- 便于权限控制和备份

**路径规范**:
- 路径格式：`projects/{project_id}/{category}/{file_id}/{filename}`
- category 枚举：`contract`、`production`、`invoice`、`bidding` 等
- 文件 ID 使用 UUID，保证唯一性
- 支持文件版本管理（通过路径或元数据）

**备选方案**:
- 扁平结构：难以管理和查找
- 按日期组织：不利于项目关联
- 使用数据库存储路径：增加数据库负担
