# Research Document: 道路设计公司项目管理系统

**Feature**: 002-project-management-oa  
**Date**: 2025-01-28  
**Purpose**: 解决技术选择和研究最佳实践

## Research Tasks & Findings

### 1. 存储方案抽象层设计（MinIO/OSS兼容）

**Task**: 研究如何设计统一的存储接口，同时支持MinIO（本地）和阿里云OSS（生产环境）

**Decision**: 定义统一的Storage接口，实现MinIO和OSS两个适配器

**Rationale**:
- 接口抽象层隐藏具体实现，业务代码不感知底层存储
- 通过配置切换存储方案，无需修改业务代码
- 支持本地开发和生产环境使用不同存储方案
- 便于测试和迁移

**Implementation**:
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

**Alternatives considered**:
- 直接使用MinIO SDK：无法支持OSS，需要修改代码切换
- 使用第三方抽象库：增加依赖，可能不符合项目需求
- 分别实现两套代码：代码重复，维护成本高

**Configuration**:
- 通过配置文件或环境变量指定存储类型
- 支持运行时切换（通过配置热更新）

### 2. 数据库兼容性设计（PostgreSQL/RDS）

**Task**: 研究如何同时支持本地PostgreSQL和阿里云RDS（PostgreSQL兼容）

**Decision**: 使用GORM ORM，通过数据库连接字符串切换

**Rationale**:
- GORM支持PostgreSQL，兼容性好
- 阿里云RDS PostgreSQL完全兼容PostgreSQL协议
- 通过连接字符串即可切换，无需修改代码
- 数据库迁移工具（golang-migrate）支持PostgreSQL

**Implementation**:
- 使用GORM作为ORM框架
- 数据库连接字符串通过配置管理
- 数据库迁移使用golang-migrate工具
- 支持本地PostgreSQL和阿里云RDS PostgreSQL

**Alternatives considered**:
- 使用原生SQL：开发效率低，维护成本高
- 使用其他ORM：生态不如GORM成熟
- 使用数据库代理：增加复杂度，不必要

**Configuration**:
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

### 3. 路由与认证中间件实现（Header读取）

**Task**: 研究如何实现统一的路由格式和从Header中读取用户信息

**Decision**: 实现自定义路由中间件，从Header中提取用户信息并注入到Context

**Rationale**:
- 遵循统一的路由格式：`/{service}/{version}/{auth_level}/{path}`
- 网关已验证JWT Token，后端只需从Header读取用户信息
- 通过中间件统一处理，避免在每个handler中重复代码
- 用户信息注入到Context，便于后续使用

**Implementation**:
```go
// internal/middleware/auth.go
func AuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // 从Header中读取用户信息
        userID := c.GetHeader("X-User-ID")
        username := c.GetHeader("X-User-Username")
        appID := c.GetHeader("X-User-AppID")
        sessionID := c.GetHeader("X-User-SessionID")
        
        // 验证Header完整性
        if userID == "" || username == "" {
            c.JSON(401, gin.H{"error": "Unauthorized"})
            c.Abort()
            return
        }
        
        // 注入到Context
        c.Set("user_id", userID)
        c.Set("username", username)
        c.Set("app_id", appID)
        c.Set("session_id", sessionID)
        
        c.Next()
    }
}

// 路由配置
router.GET("/project-oa/v1/public/health", healthHandler)
router.Group("/project-oa/v1/user").Use(AuthMiddleware())
```

**Alternatives considered**:
- 在每个handler中读取Header：代码重复，维护困难
- 使用JWT解析：网关已验证，后端无需重复验证
- 使用Session：无状态设计，不适合分布式部署

**Routing Structure**:
- 使用Gin的路由组功能组织路由
- 按auth_level分组（public/user）
- 支持路径参数和查询参数

### 4. 财务记录统一实体设计

**Task**: 研究如何统一所有财务相关实体为单一的财务记录实体

**Decision**: 使用统一的FinancialRecord实体，通过财务类型（financial_type）和方向（direction）区分不同业务场景

**Rationale**:
- 简化数据模型，从7个实体统一为1个实体
- 统一财务统计逻辑，便于计算和报表
- 支持支付和开票的关联，跟踪完整业务流程
- 便于扩展新的财务类型

**Implementation**:
- 财务类型枚举：奖金、成本、甲方支付、我方开票、专家费、委托支付、对方开票
- 方向枚举：收入、支出
- 类型特定字段：通过JSON字段或可选字段存储
- 关联字段：支持支付和开票的关联

**Alternatives considered**:
- 保持独立实体：实体数量多，统计逻辑复杂
- 使用继承：Go不支持继承，实现复杂
- 使用组合：代码复杂，查询性能差

**Detailed Design**: 见 `research/financial-entity-unification.md`

### 5. 专业字典设计方案

**Task**: 研究如何设计专业字典，支持全局专业列表和项目内自定义专业

**Decision**: 创建Discipline实体，支持全局专业字典和项目级专业扩展

**Rationale**:
- 全局专业字典保证跨项目一致性
- 项目内可临时新增专业，并同步回字典
- 支持专业的自定义扩展
- 便于专业管理和统计

**Implementation**:
```go
type Discipline struct {
    ID          uint      `json:"id" gorm:"primaryKey"`
    Name        string    `json:"name" gorm:"uniqueIndex;not null"`
    Code        string    `json:"code" gorm:"uniqueIndex"`
    Description string    `json:"description"`
    IsGlobal    bool      `json:"is_global" gorm:"default:true"` // 是否全局专业
    ProjectID   *uint     `json:"project_id"` // 项目级专业关联项目ID
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}
```

**Business Rules**:
- 全局专业：所有项目可用，由管理员维护
- 项目级专业：仅在特定项目中使用，可同步回全局字典
- 专业名称唯一性：全局专业名称唯一，项目级专业在项目内唯一

**Alternatives considered**:
- 仅全局专业：无法满足项目特定需求
- 仅项目级专业：跨项目不一致，难以管理
- 使用枚举：无法支持自定义扩展

### 6. 路由格式实现方案

**Task**: 研究如何在Gin框架中实现统一的路由格式：`/{service}/{version}/{auth_level}/{path}`

**Decision**: 使用Gin的路由组功能，按service、version、auth_level组织路由

**Rationale**:
- Gin支持路由组，便于组织复杂路由结构
- 通过中间件统一处理认证级别
- 支持路径参数和查询参数
- 代码结构清晰，易于维护

**Implementation**:
```go
// internal/router/router.go
func SetupRouter() *gin.Engine {
    router := gin.Default()
    
    // Public routes
    public := router.Group("/project-oa/v1/public")
    {
        public.GET("/health", healthHandler)
    }
    
    // User routes (需要认证)
    user := router.Group("/project-oa/v1/user")
    user.Use(AuthMiddleware())
    {
        // 项目相关
        user.GET("/projects", projectHandler.List)
        user.POST("/projects", projectHandler.Create)
        user.GET("/projects/:id", projectHandler.Get)
        user.PUT("/projects/:id", projectHandler.Update)
        user.DELETE("/projects/:id", projectHandler.Delete)
        
        // 财务相关
        user.GET("/projects/:id/financial-records", financialHandler.List)
        user.POST("/projects/:id/financial-records", financialHandler.Create)
        // ...
    }
    
    return router
}
```

**Alternatives considered**:
- 扁平路由结构：不符合统一路由格式要求
- 使用路由重写：增加复杂度，不必要
- 使用反向代理：增加架构复杂度

### 7. 文件存储路径设计

**Task**: 研究如何设计文件存储路径，支持MinIO和OSS的路径规范

**Decision**: 使用统一的路径格式：`{project_id}/{category}/{file_id}/{filename}`

**Rationale**:
- 路径结构清晰，便于管理和查找
- 支持按项目、类别组织文件
- 兼容MinIO和OSS的路径规范
- 便于权限控制和备份

**Implementation**:
- 路径格式：`projects/{project_id}/{category}/{file_id}/{filename}`
- category: contract, production, invoice, bidding等
- 文件ID使用UUID，保证唯一性
- 支持文件版本管理（通过路径或元数据）

**Alternatives considered**:
- 扁平结构：难以管理和查找
- 按日期组织：不利于项目关联
- 使用数据库存储路径：增加数据库负担

### 8. 数据库迁移策略

**Task**: 研究如何设计数据库迁移，支持本地PostgreSQL和阿里云RDS

**Decision**: 使用golang-migrate工具，支持PostgreSQL迁移

**Rationale**:
- golang-migrate是Go生态最流行的迁移工具
- 支持PostgreSQL，兼容阿里云RDS
- 支持版本管理和回滚
- 支持SQL和Go代码混合迁移

**Implementation**:
- 使用golang-migrate的CLI工具
- 迁移文件存储在 `backend/migrations/` 目录
- 支持up和down迁移
- 部署时自动执行迁移

**Alternatives considered**:
- 手动SQL脚本：容易出错，难以管理
- GORM AutoMigrate：不适合生产环境，无法回滚
- 其他迁移工具：生态不如golang-migrate成熟

## Summary

所有研究任务已完成，关键技术决策已确定：

1. ✅ **存储抽象层**：统一的Storage接口，支持MinIO和OSS
2. ✅ **数据库兼容**：使用GORM，通过连接字符串切换PostgreSQL/RDS
3. ✅ **路由与认证**：自定义中间件，从Header读取用户信息
4. ✅ **财务记录统一**：单一实体，通过类型和方向区分
5. ✅ **专业字典**：支持全局和项目级专业
6. ✅ **路由格式**：使用Gin路由组实现统一格式
7. ✅ **文件路径**：统一的路径格式，兼容两种存储
8. ✅ **数据库迁移**：使用golang-migrate工具

所有技术方案已明确，可以进入Phase 1设计阶段。

