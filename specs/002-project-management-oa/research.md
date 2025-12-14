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

### 9. 基于NebulaAuth实现登录功能

**Task**: 研究如何基于NebulaAuth实现登录功能，包括客户端登录流程、Token管理、不同环境下的实现差异

**Decision**: 客户端直接调用NebulaAuth网关的登录接口，获取Token后存储到localStorage，所有业务接口请求携带Token

**Rationale**:
- NebulaAuth作为统一认证网关，所有登录认证由网关处理
- 客户端无需实现自己的登录逻辑，只需调用网关接口
- Token由网关统一管理，业务服务无需处理Token生成和验证
- 支持开发和生产环境的不同配置，通过API_BASE_URL切换

**客户端登录流程**:

1. **发送验证码**：
   ```javascript
   POST /auth-server/v1/public/send_verification
   {
     "code_type": "email",  // 或 "sms"
     "target": "user@example.com",  // 邮箱或手机号
     "purpose": "login"
   }
   ```

2. **用户登录**：
   ```javascript
   POST /auth-server/v1/public/login
   {
     "email": "user@example.com",  // 或 "phone": "13800138000"
     "code": "123456",  // 验证码
     "code_type": "email",  // 或 "sms"
     "purpose": "login"
   }
   // 响应：
   {
     "success": true,
     "data": {
       "tokens": {
         "access_token": "eyJhbGc...",
         "refresh_token": "eyJhbGc..."
       },
       "user": {
         "user_id": "uuid",
         "username": "string",
         "email": "string"
       }
     }
   }
   ```

3. **刷新Token**（Token过期时）：
   ```javascript
   POST /auth-server/v1/public/refresh_token
   {
     "refresh_token": "eyJhbGc..."
   }
   ```

**前端实现要点**:

1. **API配置**：
   ```javascript
   // config/api.js
   const config = {
     development: {
       apiBaseURL: 'http://localhost:8080',  // 本地业务服务器
       nebulaAuthURL: 'http://your-aliyun-ip:8080',  // NebulaAuth网关地址
     },
     production: {
       apiBaseURL: 'http://your-aliyun-ip:8080',  // 网关地址（所有请求通过网关）
       nebulaAuthURL: 'http://your-aliyun-ip:8080',  // 网关地址
     }
   };
   ```

2. **登录服务实现**：
   ```javascript
   // services/auth.ts
   export const authService = {
     // 发送验证码
     sendVerification: async (target: string, codeType: 'email' | 'sms') => {
       const response = await axios.post(
         `${config.nebulaAuthURL}/auth-server/v1/public/send_verification`,
         { code_type: codeType, target, purpose: 'login' }
       );
       return response.data;
     },
     
     // 登录
     login: async (credentials: LoginRequest) => {
       const response = await axios.post(
         `${config.nebulaAuthURL}/auth-server/v1/public/login`,
         credentials
       );
       
       if (response.data.success && response.data.data.tokens) {
         // 存储Token
         localStorage.setItem('access_token', response.data.data.tokens.access_token);
         localStorage.setItem('refresh_token', response.data.data.tokens.refresh_token);
         return response.data.data;
       }
       throw new Error('Login failed');
     },
     
     // 刷新Token
     refreshToken: async () => {
       const refreshToken = localStorage.getItem('refresh_token');
       if (!refreshToken) throw new Error('No refresh token');
       
       const response = await axios.post(
         `${config.nebulaAuthURL}/auth-server/v1/public/refresh_token`,
         { refresh_token: refreshToken }
       );
       
       if (response.data.success && response.data.data.tokens) {
         localStorage.setItem('access_token', response.data.data.tokens.access_token);
         localStorage.setItem('refresh_token', response.data.data.tokens.refresh_token);
         return response.data.data.tokens;
       }
       throw new Error('Token refresh failed');
     }
   };
   ```

3. **请求拦截器（自动添加Token）**：
   ```javascript
   // services/api.ts
   axios.interceptors.request.use((config) => {
     const token = localStorage.getItem('access_token');
     if (token) {
       config.headers.Authorization = `Bearer ${token}`;
     }
     return config;
   });
   
   // Token过期自动刷新
   axios.interceptors.response.use(
     (response) => response,
     async (error) => {
       if (error.response?.status === 401) {
         try {
           await authService.refreshToken();
           // 重试原请求
           return axios.request(error.config);
         } catch (refreshError) {
           // 刷新失败，跳转登录页
           window.location.href = '/login';
         }
       }
       return Promise.reject(error);
     }
   );
   ```

**环境差异**:

| 环境 | API_BASE_URL | 登录接口调用 | 业务接口调用 |
|------|-------------|------------|------------|
| **开发环境** | `http://localhost:8080` | 直接调用NebulaAuth网关 | 直接调用本地业务服务器 |
| **生产环境** | `http://your-aliyun-ip:8080` | 调用NebulaAuth网关 | 通过网关调用业务服务 |

**关键要点**:
- 开发环境：登录接口调用网关，业务接口直接调用本地服务器
- 生产环境：所有接口都通过网关，网关负责路由到业务服务
- Token存储在localStorage，所有请求自动携带
- Token过期时自动刷新，刷新失败跳转登录页

**错误处理**:
- 验证码发送失败：提示用户检查邮箱/手机号
- 登录失败：提示验证码错误或账号不存在
- Token过期：自动刷新，刷新失败跳转登录
- 网络错误：提示用户检查网络连接

**安全性考虑**:
- Token存储在localStorage（前端），注意XSS攻击防护
- 生产环境所有请求通过网关，网关已验证Token
- 业务服务无需处理Token验证（gateway模式）或调用网关API验证（self_validate模式）

**Alternatives considered**:
- 业务服务自己实现登录：增加复杂度，不符合统一认证架构
- 使用Session：无状态设计，不适合分布式部署
- Token存储在Cookie：需要处理CSRF防护，增加复杂度

**参考文档**: `specs/002-project-management-oa/guides/ai-quick-reference.md` 和 `developer-guide.md`

### 10. Token刷新机制实现（2小时有效期，保持长期有效）

**Task**: 研究如何实现Token自动刷新机制，确保用户在2小时Access Token过期后能够自动刷新，保持长期有效（30天免登录）

**Decision**: 实现前端主动刷新和被动刷新两种机制，结合Refresh Token（30天有效期）实现长期免登录

**Rationale**:
- Access Token有效期2小时，Refresh Token有效期30天
- 通过自动刷新机制，用户无需频繁登录
- 页面加载时主动刷新，API请求时被动刷新，确保Token始终有效
- Refresh Token刷新时会返回新的Token对，需要同时更新

**当前实现状态**:
- ✅ 前端已实现被动刷新（API拦截器检测401错误自动刷新）
- ✅ 前端已实现Refresh Token刷新逻辑
- ❌ **问题**：页面加载时，如果Access Token已过期（超过2小时），`getCurrentUser()` 会先返回401，然后才触发刷新，导致被误判为未认证，错误跳转到登录页

**问题分析**:
- 用户超过2小时后重新打开网页，Access Token已过期，但Refresh Token仍然有效（30天内）
- `AuthContext` 初始化时调用 `refreshAuth()` → `getCurrentUser()`
- `getCurrentUser()` 使用过期的 Access Token，返回401
- API拦截器检测到401后尝试刷新，但此时 `AuthContext` 可能已经认为认证失败
- 如果刷新过程中有任何问题，用户会被错误地跳转到登录页

**解决方案**: 在页面加载时，**先主动刷新Token，再获取用户信息**

**实现方案**:

1. **被动刷新（已实现）**：
   ```javascript
   // services/api.ts - 响应拦截器
   axios.interceptors.response.use(
     (response) => response,
     async (error) => {
       if (error.response?.status === 401 && !originalRequest._retry) {
         originalRequest._retry = true
         try {
           await authService.refreshToken()
           // 重试原请求
           return axios.request(error.config)
         } catch (refreshError) {
           // 刷新失败，跳转登录页
           window.location.href = '/login'
         }
       }
       return Promise.reject(error)
     }
   )
   ```

2. **主动刷新（关键修复）**：在页面加载时，先刷新Token，再获取用户信息
   ```javascript
   // services/auth.ts - 添加初始化函数
   export const authService = {
     // ... 其他方法
     
     /**
      * 初始化认证状态
      * 页面加载时调用，先刷新Token（如果Refresh Token存在），再返回认证状态
      */
     initializeAuth: async (): Promise<boolean> => {
       const refreshToken = localStorage.getItem('refresh_token')
       if (!refreshToken) {
         // 没有Refresh Token，清除所有Token
         localStorage.removeItem('access_token')
         return false
       }
       
       try {
         // 关键：页面加载时主动刷新Token，确保Access Token有效
         // 这样即使Access Token已过期，也能通过Refresh Token获取新的Token
         await authService.refreshToken()
         console.log('[Auth Init] Token refreshed successfully')
         return true
       } catch (error) {
         // 刷新失败，清除所有Token（Refresh Token可能已过期）
         console.error('[Auth Init] Token refresh failed:', error)
         localStorage.removeItem('access_token')
         localStorage.removeItem('refresh_token')
         return false
       }
     },
   }
   ```

3. **修改AuthContext，先刷新Token再获取用户信息**：
   ```javascript
   // contexts/AuthContext.tsx
   export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
     // ... 状态定义
     
     // 刷新认证状态（修改后的版本）
     const refreshAuth = useCallback(async () => {
       // 关键：先检查是否有Refresh Token，如果有则先刷新Token
       const refreshToken = localStorage.getItem('refresh_token')
       if (refreshToken) {
         try {
           // 先刷新Token，确保Access Token有效
           await authService.refreshToken()
           console.log('[AuthContext] Token refreshed before fetching user info')
         } catch (error) {
           // 刷新失败，清除Token
           console.error('[AuthContext] Token refresh failed:', error)
           localStorage.removeItem('access_token')
           localStorage.removeItem('refresh_token')
           setIsAuthenticated(false)
           setUser(null)
           setLoading(false)
           return
         }
       }
       
       // Token刷新成功后，检查认证状态
       const auth = authService.isAuthenticated()
       setIsAuthenticated(auth)
       
       // 如果已认证，获取用户信息
       if (auth) {
         if (isFetchingUserRef.current) {
           return
         }
         
         setLoading(true)
         isFetchingUserRef.current = true
         
         authService
           .getCurrentUser()
           .then((userInfo) => {
             setUser(userInfo)
             setLoading(false)
             isFetchingUserRef.current = false
           })
           .catch((error) => {
             console.error('[AuthContext] Failed to fetch user info:', error)
             // 如果获取用户信息失败，检查Token是否仍然存在
             const tokenStillExists = authService.isAuthenticated()
             if (!tokenStillExists) {
               setIsAuthenticated(false)
               setUser(null)
             }
             setLoading(false)
             isFetchingUserRef.current = false
           })
       } else {
         setUser(null)
         setLoading(false)
         isFetchingUserRef.current = false
       }
     }, [])
     
     // 初始化时检查认证状态
     useEffect(() => {
       refreshAuth()
     }, [refreshAuth])
     
     // ... 其他代码
   }
   ```

4. **或者，在应用入口处初始化**（替代方案）：
   ```javascript
   // main.tsx 或 App.tsx
   import { authService } from '@/services/auth'
   
   // 应用启动时先初始化认证
   async function initApp() {
     try {
       // 先刷新Token（如果Refresh Token存在）
       const isAuthenticated = await authService.initializeAuth()
       if (!isAuthenticated) {
         // 没有有效Token，可能需要跳转到登录页
         // 但这里不跳转，让路由守卫处理
       }
     } catch (error) {
       console.error('[App Init] Failed to initialize auth:', error)
     }
   }
   
   // 在渲染应用前初始化
   initApp().then(() => {
     ReactDOM.createRoot(document.getElementById('root')!).render(
       <React.StrictMode>
         <App />
       </React.StrictMode>
     )
   })
   ```

3. **定时刷新（可选增强）**：
   ```javascript
   // 在Token过期前5分钟自动刷新
   export function setupTokenRefresh() {
     const REFRESH_INTERVAL = 2 * 60 * 60 * 1000 - 5 * 60 * 1000 // 1小时55分钟
     
     setInterval(async () => {
       const refreshToken = localStorage.getItem('refresh_token')
       if (refreshToken) {
         try {
           await authService.refreshToken()
           console.log('[Token Refresh] Token refreshed proactively')
         } catch (error) {
           console.error('[Token Refresh] Failed:', error)
         }
       }
     }, REFRESH_INTERVAL)
   }
   ```

**Token有效期说明**:
- **Access Token**: 2小时（7200秒）
- **Refresh Token**: 30天（2592000秒）
- **刷新机制**: 每次刷新Refresh Token时，会返回新的Token对，Refresh Token有效期重新计算为30天

**关键要点**:
- ✅ **解决核心问题**：页面加载时，**先刷新Token，再获取用户信息**，避免使用过期的Access Token导致401错误
- ✅ **刷新顺序**：检查Refresh Token存在 → 主动刷新Token → 刷新成功后获取用户信息
- ✅ **刷新时机**：页面加载时（`AuthContext` 初始化或应用入口）主动刷新，API请求时被动刷新
- ✅ **刷新逻辑**：刷新时必须同时更新 `access_token` 和 `refresh_token`
- ✅ **失败处理**：刷新失败时清除所有Token，但不立即跳转登录页（让路由守卫处理）
- ⚠️ **重要**：不要在刷新Token之前调用任何需要认证的API，否则会触发401错误

**问题解决确认**:
- ✅ **问题**：超过2小时后重新打开网页，会错误回到登录页面
- ✅ **原因**：页面加载时使用过期的Access Token调用 `getCurrentUser()`，返回401后被误判为未认证
- ✅ **解决方案**：在页面加载时，先检查Refresh Token，如果存在则主动刷新Token，刷新成功后再获取用户信息
- ✅ **效果**：即使用户超过2小时后重新打开网页，只要Refresh Token有效（30天内），就能自动刷新Token，无需重新登录

**Alternatives considered**:
- 延长Access Token有效期：安全性降低，不符合最佳实践
- 使用Session：无状态设计，不适合分布式部署
- 仅依赖被动刷新：用户可能在Token过期后首次操作时遇到延迟

**参考文档**: `specs/002-project-management-oa/guides/06-frontend-integration.md#token管理`

### 11. 判断用户是否是星云Auth管理员

**Task**: 研究如何在业务系统中判断当前登录用户是否是NebulaAuth系统的管理员

**Decision**: 结合登录响应和API查询两种方式，优先使用本地存储，必要时调用API更新

**Rationale**:
- NebulaAuth登录接口返回完整的用户信息，包括 `is_admin` 字段
- 前端需要快速判断管理员权限（UI显示、路由控制）
- 后端在gateway模式下不会收到 `X-User-IsAdmin` header（出于安全考虑）
- 需要调用NebulaAuth API或业务服务API获取管理员状态

**当前实现状态**:
- ✅ 前端登录时已保存 `is_admin` 到localStorage
- ✅ 前端已有 `isAdmin()` 检查函数
- ⚠️ 后端需要增强：在self_validate模式下从NebulaAuth API获取，在gateway模式下需要其他方式

**实现方案**:

1. **前端判断（已实现）**：
   ```javascript
   // services/auth.ts
   // 登录时保存用户信息
   export async function login(email, code, codeType = 'email') {
     const response = await fetch(`${apiConfig.nebulaAuthURL}/auth-server/v1/public/login`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ email, code, code_type: codeType, purpose: 'login' })
     })
     
     const data = await response.json()
     if (data.success) {
       // 保存Token
       localStorage.setItem('access_token', data.data.tokens.access_token)
       localStorage.setItem('refresh_token', data.data.tokens.refresh_token)
       
       // 保存用户信息（包括 is_admin）
       if (data.data.user) {
         localStorage.setItem('user_info', JSON.stringify({
           userID: data.data.user.id,
           username: data.data.user.username,
           isAdmin: data.data.user.is_admin, // ✅ 包含管理员标识
         }))
       }
       return data.data
     }
     throw new Error(data.error || '登录失败')
   }
   
   // 检查是否是管理员
   export async function isAdmin() {
     // 优先从本地存储读取（快速）
     const userInfoStr = localStorage.getItem('user_info')
     if (userInfoStr) {
       const userInfo = JSON.parse(userInfoStr)
       if (userInfo.isAdmin !== undefined) {
         return userInfo.isAdmin
       }
     }
     
     // 如果本地存储中没有，调用API获取
     try {
       await updateUserInfo()
       const userInfoStr = localStorage.getItem('user_info')
       if (userInfoStr) {
         const userInfo = JSON.parse(userInfoStr)
         return userInfo.isAdmin || false
       }
     } catch (error) {
       console.error('获取管理员权限失败:', error)
     }
     
     return false
   }
   ```

2. **后端判断（需要增强）**：

   **方案A：调用NebulaAuth User Service API（推荐）**：
   ```go
   // internal/services/auth_service.go
   func (s *AuthService) IsNebulaAuthAdmin(userID string) (bool, error) {
     // 调用NebulaAuth User Service API
     // GET /user-service/v1/admin/users/{id}
     // 或 GET /user-service/v1/user/profile（当前用户）
     
     url := fmt.Sprintf("%s/user-service/v1/user/profile", s.nebulaAuthURL)
     req, err := http.NewRequest("GET", url, nil)
     if err != nil {
       return false, err
     }
     
     // 使用当前请求的Token（从Context获取）
     token := s.getTokenFromContext(c)
     req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))
     
     resp, err := http.DefaultClient.Do(req)
     if err != nil {
       return false, err
     }
     defer resp.Body.Close()
     
     var result struct {
       Success bool `json:"success"`
       Data    struct {
         IsAdmin bool `json:"is_admin"`
       } `json:"data"`
     }
     
     if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
       return false, err
     }
     
     return result.Data.IsAdmin, nil
   }
   ```

   **方案B：在self_validate模式下从Token验证响应获取**：
   ```go
   // internal/middleware/auth.go
   // 在self_validate模式下，Token验证API返回 is_admin
   type ValidateTokenResponse struct {
     Success bool `json:"success"`
     Data    struct {
       Valid    bool   `json:"valid"`
       UserID   string `json:"user_id"`
       Username string `json:"username"`
       IsAdmin  bool   `json:"is_admin"` // ✅ 包含管理员标识
       AppID    string `json:"app_id"`
       SessionID string `json:"session_id"`
     } `json:"data"`
   }
   
   // 在认证中间件中设置 is_admin
   c.Set("is_admin", result.Data.IsAdmin)
   ```

   **方案C：在gateway模式下调用User Service API**：
   ```go
   // gateway模式下，虽然不会收到 X-User-IsAdmin header
   // 但可以通过调用User Service API获取
   func (s *AuthService) IsNebulaAuthAdmin(c *gin.Context) (bool, error) {
     userID := c.GetString("user_id")
     if userID == "" {
       return false, errors.New("user_id not found")
     }
     
     // 调用User Service API（通过网关）
     // 使用当前请求的Token
     token := s.extractTokenFromRequest(c)
     return s.checkAdminFromUserService(userID, token)
   }
   ```

**关键要点**:
- 前端：登录时保存 `is_admin`，页面加载时更新，提供统一检查函数
- 后端：self_validate模式下从Token验证响应获取，gateway模式下调用User Service API
- 业务服务需要返回 `is_admin` 字段（在用户信息接口中）
- 前端判断仅用于UI显示和路由控制，真正的权限验证在服务端

**注意事项**:
- ⚠️ **gateway模式下，外部服务不会收到 `X-User-IsAdmin` header**（出于安全考虑）
- ✅ **self_validate模式下，Token验证API返回 `is_admin` 字段**
- ✅ **可以通过调用User Service API获取管理员状态**

**Alternatives considered**:
- 仅依赖前端判断：安全性不足，容易被绕过
- 仅依赖后端判断：前端无法快速响应，用户体验差
- 使用独立的权限服务：增加架构复杂度，不必要

**参考文档**: 
- `specs/002-project-management-oa/guides/06-frontend-integration.md#判断当前用户是否是管理员`
- `specs/002-project-management-oa/guides/03-auth-middleware.md#header处理`
- `specs/002-project-management-oa/guides/api/user-service.md`

### 12. 管理员预设（新建）用户能力

**Task**: 研究如何在项目管理系统中实现管理员预设（新建）用户的功能，采用"先查询后创建"的优化流程

**Decision**: 业务服务提供管理员创建用户接口，采用优化的查询流程：先查询OA本地数据库，再查询NebulaAuth服务器，最后创建用户并同步

**Rationale**:
- 用户账号统一由NebulaAuth管理，业务服务不应直接操作用户数据库
- 管理员需要在项目管理系统中预设用户，然后用户才能登录
- 通过调用NebulaAuth User Service API，确保用户数据一致性
- 支持设置用户的基本信息（邮箱、手机号、用户名等）和验证状态
- **优化流程**：先查询后创建，避免重复创建，提高性能和数据一致性

**当前实现状态**:
- ✅ NebulaAuth User Service提供 `POST /admin/users` 接口
- ✅ NebulaAuth User Service提供 `GET /public/user/email/{email}` 接口（公开接口，通过邮箱查询）
- ✅ NebulaAuth User Service提供 `GET /admin/users/phone/{phone}` 接口（管理员接口，通过手机号查询）
- ✅ 业务服务已实现查询和创建逻辑
- ✅ 需要管理员权限验证

**完整业务流程**:

#### 流程概览

```
OA前端 → OA后端 → [查询OA本地数据库] → [查询NebulaAuth] → [创建NebulaAuth用户（如不存在）] → [同步到OA本地数据库] → OA前端
```

#### 详细交互步骤

**步骤 1：OA前端 → OA后端**
- 接口：`POST /project-oa/v1/admin/users`
- 请求体：
```json
{
  "email": "user@example.com",  // 邮箱（可选，与手机号二选一）
  "phone": "13800138000",       // 手机号（可选，与邮箱二选一）
  "username": "newuser",        // 用户名（必填）
  "is_verified": false,
  "is_active": true,
  "real_name": "新用户",        // OA业务字段
  "role": "member",             // OA业务字段（可选，默认member）
  "department": "设计部"        // OA业务字段（可选）
}
```
- **注意**：邮箱和手机号二选一即可，但至少需要提供其中一个

**步骤 2：OA后端内部处理 - 查询OA本地数据库**
- 操作：通过邮箱或用户名查询OA本地数据库
- 查询条件：`WHERE email = ? OR username = ?`
- **如果已存在**：
  - 直接同步更新OA业务字段（real_name, role, department）
  - 返回更新后的完整用户信息
  - **流程结束**（无需调用NebulaAuth API）

**步骤 3：OA后端 → NebulaAuth（查询用户）**
- **如果OA本地数据库不存在**，查询NebulaAuth服务器
- 查询方式（按优先级，都需要管理员Token认证，邮箱和手机号二选一）：
  1. **优先使用邮箱查询**（管理员接口，需要Token）：
     - 接口：`GET /user-service/v1/admin/users/email/{email}`
     - 如果邮箱不为空，使用此接口查询
     - 需要管理员Token认证（从当前请求的Authorization Header获取）
     - 如果返回200，用户存在；如果返回404，用户不存在
  2. **备用：使用手机号查询**（管理员接口，需要Token）：
     - 接口：`GET /user-service/v1/admin/users/phone/{phone}`
     - 如果邮箱为空或邮箱查询失败，且手机号不为空，使用此接口查询
     - 需要管理员Token认证（从当前请求的Authorization Header获取）
     - 如果返回200，用户存在；如果返回404，用户不存在
- **注意**：邮箱和手机号二选一即可，如果邮箱为空则直接使用手机号查询
- **如果NebulaAuth已存在**：
  - 获取用户信息（id, email, phone, username, is_admin, is_active, is_verified）
  - 跳转到步骤 5（同步到OA本地数据库）

**步骤 4：OA后端 → NebulaAuth（创建用户）**
- **如果NebulaAuth不存在**，创建新用户
- 接口：`POST /user-service/v1/admin/users`（通过 API Gateway）
- 请求体（只包含NebulaAuth字段，不包含OA业务字段，邮箱和手机号二选一）：
```json
{
  "email": "user@example.com",  // 邮箱（可选，与手机号二选一）
  "phone": "13800138000",       // 手机号（可选，与邮箱二选一）
  "username": "newuser",        // 用户名（必填）
  "is_verified": false,
  "is_active": true
}
```
- **注意**：邮箱和手机号二选一即可，但至少需要提供其中一个
- 响应：
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "uuid-123",
    "email": "user@example.com",
    "phone": "13800138000",
    "username": "newuser",
    "is_admin": false,
    "is_verified": false,
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

**步骤 5：OA后端内部处理 - 同步到OA本地数据库**
- 操作：将用户同步到OA本地数据库
- 同步逻辑：
  1. 使用NebulaAuth返回的用户信息（id, email, phone, username, is_admin, is_active, is_verified）
  2. 根据NebulaAuth的 `is_admin` 确定OA角色：
     - `is_admin = true` → `RoleAdmin`（覆盖前端传入的role）
     - `is_admin = false` → 使用前端传入的 `role`（如未传则默认 `RoleMember`）
  3. 使用前端传入的OA业务字段（real_name, department等）
  4. 执行 `INSERT` 或 `UPDATE`（如果已存在则更新）

**步骤 6：OA后端 → OA前端**
- 响应：
```json
{
  "success": true,
  "message": "用户创建成功",
  "data": {
    "id": "uuid-123",
    "username": "newuser",
    "email": "user@example.com",
    "phone": "13800138000",
    "real_name": "新用户",        // OA业务字段
    "role": "member",             // OA业务字段（根据is_admin或前端传入）
    "department": "设计部",       // OA业务字段
    "is_active": true,
    "has_account": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

#### 关键要点

1. **查询优先级**：
   - 先查询OA本地数据库（快速响应，避免不必要的API调用）
   - 再查询NebulaAuth服务器（确保数据一致性）
   - 最后创建NebulaAuth用户（如不存在）

2. **查询方式**：
   - **邮箱查询**：使用公开接口 `GET /public/user/email/{email}`（无需认证，优先使用）
   - **手机号查询**：使用管理员接口 `GET /admin/users/phone/{phone}`（需要Token，备用方案）

3. **数据来源**：
   - **NebulaAuth**：`id`, `email`, `phone`, `username`, `is_admin`, `is_active`, `is_verified`
   - **OA前端**：`real_name`, `role`（可选），`department`（可选）

4. **角色映射规则**：
   - NebulaAuth `is_admin = true` → OA `RoleAdmin`（强制覆盖）
   - NebulaAuth `is_admin = false` → 使用前端传入的 `role`（未传则默认 `RoleMember`）

5. **同步时机**：
   - OA本地数据库已存在：直接更新OA业务字段
   - NebulaAuth已存在但OA本地数据库不存在：同步创建
   - NebulaAuth不存在：创建后立即同步

**实现方案**:

1. **NebulaAuth User Service API**：
   ```http
   POST /user-service/v1/admin/users
   Content-Type: application/json
   Authorization: Bearer <admin_token>
   
   {
     "email": "user@example.com",      // 邮箱（可选，与手机号二选一）
     "phone": "13800138000",           // 手机号（可选，与邮箱二选一）
     "username": "username",            // 用户名（必填）
     "is_verified": true,               // 是否已验证（可选，默认false）
     "is_active": true                  // 是否激活（可选，默认true）
   }
   
   // 响应
   {
     "success": true,
     "message": "用户创建成功",
     "data": {
       "id": "uuid",
       "email": "user@example.com",
       "phone": "13800138000",
       "username": "username",
       "is_admin": false,
       "is_verified": true,
       "is_active": true,
       "avatar_url": null,
       "created_at": "2024-01-01T00:00:00Z",
       "updated_at": "2024-01-01T00:00:00Z"
     }
   }
   ```

2. **业务服务实现**：
   ```go
   // internal/services/user_service.go
   type CreateUserRequest struct {
     Email      string `json:"email"`      // 邮箱（可选，与手机号二选一）
     Phone      string `json:"phone"`      // 手机号（可选，与邮箱二选一）
     Username   string `json:"username" binding:"required"`  // 用户名（必填）
     IsVerified bool   `json:"is_verified"`
     IsActive   bool   `json:"is_active"`
   }
   // 注意：需要添加验证逻辑，确保邮箱和手机号至少提供一个
   
   func (s *UserService) CreateNebulaAuthUser(req *CreateUserRequest, adminToken string) (*NebulaAuthUser, error) {
     // 调用NebulaAuth User Service API
     url := fmt.Sprintf("%s/user-service/v1/admin/users", s.nebulaAuthURL)
     
     requestBody, err := json.Marshal(req)
     if err != nil {
       return nil, err
     }
     
     httpReq, err := http.NewRequest("POST", url, bytes.NewBuffer(requestBody))
     if err != nil {
       return nil, err
     }
     
     httpReq.Header.Set("Content-Type", "application/json")
     httpReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", adminToken))
     
     resp, err := http.DefaultClient.Do(httpReq)
     if err != nil {
       return nil, err
     }
     defer resp.Body.Close()
     
     if resp.StatusCode != http.StatusCreated {
       var errorResp struct {
         Success bool   `json:"success"`
         Error   string `json:"error"`
       }
       if err := json.NewDecoder(resp.Body).Decode(&errorResp); err == nil {
         return nil, errors.New(errorResp.Error)
       }
       return nil, fmt.Errorf("创建用户失败，状态码: %d", resp.StatusCode)
     }
     
     var result struct {
       Success bool            `json:"success"`
       Data    NebulaAuthUser  `json:"data"`
       Message string          `json:"message"`
     }
     
     if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
       return nil, err
     }
     
     if !result.Success {
       return nil, errors.New("创建用户失败")
     }
     
     return &result.Data, nil
   }
   ```

3. **业务服务Handler**：
   ```go
   // internal/handlers/user_handler.go
   func (h *UserHandler) CreateUser(c *gin.Context) {
     // 1. 验证管理员权限
     isAdmin, exists := c.Get("is_admin")
     if !exists || !isAdmin.(bool) {
       c.JSON(http.StatusForbidden, gin.H{
         "error": "权限不足",
         "code":  "FORBIDDEN",
       })
       return
     }
     
     // 2. 解析请求
     var req CreateUserRequest
     if err := c.ShouldBindJSON(&req); err != nil {
       c.JSON(http.StatusBadRequest, gin.H{
         "error": err.Error(),
         "code":  "VALIDATION_ERROR",
       })
       return
     }
     
     // 3. 获取管理员Token（从当前请求的Token或配置的管理员Token）
     adminToken := h.extractTokenFromRequest(c)
     
     // 4. 调用NebulaAuth User Service创建用户
     nebulaUser, err := h.userService.CreateNebulaAuthUser(&req, adminToken)
     if err != nil {
       c.JSON(http.StatusInternalServerError, gin.H{
         "error": err.Error(),
         "code":  "CREATE_USER_FAILED",
       })
       return
     }
     
     // 5. 同步用户到OA本地数据库（必须）
     // 使用NebulaAuth返回的用户信息和前端传入的OA业务字段
     localUser, err := h.userService.SyncUserToLocalDB(nebulaUser, req.RealName, req.Role, req.Department)
     if err != nil {
       // 记录错误但不失败（用户已在NebulaAuth创建成功）
       h.logger.Error("Failed to sync user to local database", zap.Error(err))
       // 可以选择返回警告或继续返回成功
     }
     
     // 6. 返回结果（返回同步后的完整用户信息）
     c.JSON(http.StatusCreated, gin.H{
       "success": true,
       "message": "用户创建成功",
       "data": nebulaUser,
     })
   }
   ```

4. **路由配置**：
   ```go
   // internal/router/router.go
   adminGroup := router.Group("/project-oa/v1/admin")
   adminGroup.Use(AuthMiddleware()) // 需要认证
   {
     // 管理员创建用户
     adminGroup.POST("/users", userHandler.CreateUser)
   }
   ```

**关键要点**:
- 必须验证管理员权限（通过 `is_admin` 检查）
- 使用管理员Token调用NebulaAuth User Service API
- 支持设置用户基本信息（邮箱、手机号、用户名）
- 支持设置验证状态和激活状态
- **必须**：在业务数据库中同步用户信息（创建后立即同步，确保用户管理列表可见）
- **优化流程**：先查询OA本地数据库，再查询NebulaAuth，最后创建并同步

**查询接口说明**:
- **邮箱查询接口**（管理员接口，需要Token）：
  - 接口：`GET /user-service/v1/admin/users/email/{email}`
  - 用途：通过邮箱查询用户是否存在
  - 要求：需要管理员Token认证（从当前请求的Authorization Header获取）
  - 响应：200（用户存在）或404（用户不存在）

- **手机号查询接口**（管理员接口，需要Token）：
  - 接口：`GET /user-service/v1/admin/users/phone/{phone}`
  - 用途：通过手机号查询用户是否存在
  - 要求：需要管理员Token认证（从当前请求的Authorization Header获取）
  - 响应：200（用户存在）或404（用户不存在）

**用户同步机制**:
- **问题**：管理员创建用户后，用户只在NebulaAuth中存在，OA系统的用户管理列表查询本地数据库，导致新创建的用户不可见
- **解决方案**：采用"先查询后创建"的优化流程，确保用户数据一致性
- **同步逻辑**：
  1. 先查询OA本地数据库（通过邮箱或用户名）
  2. 如果OA本地数据库已存在，直接更新OA业务字段并返回
  3. 如果OA本地数据库不存在，查询NebulaAuth服务器（通过邮箱或手机号）
  4. 如果NebulaAuth已存在，同步到OA本地数据库
  5. 如果NebulaAuth不存在，创建NebulaAuth用户后同步到OA本地数据库
  6. 使用NebulaAuth返回的用户信息（id, email, phone, username, is_admin, is_active, is_verified）
  7. 根据NebulaAuth的 `is_admin` 确定OA角色：
     - `is_admin = true` → `RoleAdmin`
     - `is_admin = false` → 使用前端传入的 `role`（如未传则默认 `RoleMember`）
  8. 使用前端传入的OA业务字段（real_name, department等）
  9. 执行 `INSERT` 或 `UPDATE`（如果已存在则更新）
- **数据来源**：
  - NebulaAuth：`id`, `email`, `phone`, `username`, `is_admin`, `is_active`, `is_verified`
  - OA前端：`real_name`, `role`（可选），`department`（可选）

**优化效果**:
- ✅ **避免重复创建**：先检查本地数据库和NebulaAuth，避免重复创建用户
- ✅ **提高性能**：本地数据库存在时直接更新，无需调用NebulaAuth API
- ✅ **数据一致性**：确保OA本地数据库和NebulaAuth服务器数据同步
- ✅ **处理已存在用户**：支持用户已在NebulaAuth存在但OA本地数据库不存在的情况

**管理员Token获取方式**:
1. **使用当前请求的Token**（如果当前用户是管理员）：
   ```go
   // 从请求Header中提取Token
   token := c.GetHeader("Authorization")
   token = strings.TrimPrefix(token, "Bearer ")
   ```

2. **使用配置的管理员Token**（服务间调用）：
   ```go
   // 从环境变量或配置文件读取
   adminToken := os.Getenv("NEBULA_AUTH_ADMIN_TOKEN")
   ```

**错误处理**:
- 权限不足：返回403 Forbidden
- 用户已存在：返回409 Conflict
- NebulaAuth服务不可用：返回500 Internal Server Error
- 参数验证失败：返回400 Bad Request

**Alternatives considered**:
- 直接操作NebulaAuth数据库：违反架构原则，数据不一致风险
- 使用NebulaAuth管理界面：用户体验差，需要在多个系统间切换
- 业务服务自己管理用户：不符合统一认证架构

**参考文档**: 
- `specs/002-project-management-oa/guides/api/user-service.md#post-adminusers`
- `specs/002-project-management-oa/guides/04-business-api-development.md`

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
9. ✅ **NebulaAuth登录**：客户端直接调用网关登录接口，Token存储在localStorage，支持自动刷新
10. ✅ **Token刷新机制**：实现主动刷新和被动刷新，结合Refresh Token（30天有效期）实现长期免登录
11. ✅ **管理员判断**：结合登录响应和API查询，前端快速判断，后端通过User Service API获取
12. ✅ **管理员预设用户**：业务服务调用NebulaAuth User Service API创建用户，确保数据一致性

所有技术方案已明确，可以进入Phase 1设计阶段。

