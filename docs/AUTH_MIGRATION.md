# 认证系统迁移指南

本文档说明如何将当前的 Mock 认证系统切换到真实的认证服务器。

## 当前实现

当前系统使用 `MockAuthService` 进行认证，位于 `backend/internal/middleware/auth.go`。

### Mock 认证特点

- 使用 JWT token 进行认证
- Token 验证使用配置的 JWT secret
- 从 token claims 中提取用户信息
- 如果 token 中没有用户信息，使用默认的 mock 用户数据

## 迁移步骤

### 1. 创建认证服务接口

在 `backend/internal/services/auth_service.go` 中定义认证服务接口：

```go
package services

type AuthService interface {
    ValidateToken(tokenString string) (jwt.MapClaims, error)
    GetUserFromToken(claims jwt.MapClaims) (userID uint, username string, role string, err error)
    // 添加其他需要的方法，如：
    // Login(username, password string) (*AuthResponse, error)
    // RefreshToken(refreshToken string) (*AuthResponse, error)
}
```

### 2. 实现真实认证服务

创建 `backend/internal/services/real_auth_service.go`：

```go
package services

import (
    "github.com/golang-jwt/jwt/v5"
    // 添加你的认证服务器客户端库
)

type RealAuthService struct {
    authServerURL string
    httpClient    *http.Client
    // 其他必要的配置
}

func NewRealAuthService(authServerURL string) *RealAuthService {
    return &RealAuthService{
        authServerURL: authServerURL,
        httpClient:    &http.Client{},
    }
}

func (s *RealAuthService) ValidateToken(tokenString string) (jwt.MapClaims, error) {
    // 调用认证服务器验证 token
    // 例如：POST /auth/validate
    // 或者直接验证 JWT（如果认证服务器使用相同的 secret）
}

func (s *RealAuthService) GetUserFromToken(claims jwt.MapClaims) (userID uint, username string, role string, err error) {
    // 从认证服务器获取用户信息
    // 或者从 token claims 中提取（如果认证服务器在 token 中包含用户信息）
}
```

### 3. 更新中间件使用真实服务

修改 `backend/internal/middleware/auth.go`：

```go
// 添加配置选项
type AuthConfig struct {
    UseMockAuth bool
    AuthServiceURL string
    // 其他配置
}

func AuthMiddleware(cfg *config.Config, authConfig *AuthConfig) gin.HandlerFunc {
    var authService services.AuthService
    
    if authConfig.UseMockAuth {
        authService = NewMockAuthService(cfg)
    } else {
        authService = services.NewRealAuthService(authConfig.AuthServiceURL)
    }
    
    // 其余代码保持不变
}
```

### 4. 更新配置

在 `backend/internal/config/config.go` 中添加认证服务器配置：

```go
type Config struct {
    // ... 现有配置
    
    // Auth Server
    AuthServerURL string
    UseMockAuth   bool
}
```

在 `.env` 文件中添加：

```env
AUTH_SERVER_URL=http://your-auth-server:8080
USE_MOCK_AUTH=false
```

### 5. 更新 main.go

修改 `backend/cmd/server/main.go`：

```go
authConfig := &middleware.AuthConfig{
    UseMockAuth: cfg.UseMockAuth,
    AuthServiceURL: cfg.AuthServerURL,
}

protected.Use(middleware.AuthMiddleware(cfg, authConfig))
```

## 注意事项

1. **Token 格式兼容性**：确保真实认证服务器生成的 JWT token 格式与当前实现兼容
2. **用户信息提取**：确认真实认证服务器在 token claims 中包含的用户信息字段名称
3. **错误处理**：真实认证服务器可能返回不同的错误格式，需要相应调整错误处理
4. **性能考虑**：如果每次请求都调用认证服务器验证 token，考虑添加缓存
5. **向后兼容**：在迁移期间，可以通过配置开关在 mock 和真实认证之间切换

## 测试建议

1. 在开发环境使用 mock 认证进行测试
2. 在测试环境配置真实认证服务器进行集成测试
3. 确保所有 API 端点在两种认证模式下都能正常工作
4. 测试 token 过期、无效 token 等错误场景

## 回滚方案

如果迁移过程中出现问题，可以通过设置 `USE_MOCK_AUTH=true` 快速回滚到 mock 认证。

