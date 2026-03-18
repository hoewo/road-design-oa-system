// middleware/auth_test.go
// 认证中间件单元测试示例
package middleware

import (
    "net/http"
    "net/http/httptest"
    "testing"
    "github.com/gin-gonic/gin"
    "github.com/stretchr/testify/assert"
    "your-project/config"
)

func TestAuthMiddleware_GatewayMode(t *testing.T) {
    cfg := &config.Config{AuthMode: "gateway"}
    middleware := AuthMiddleware(cfg)
    
    w := httptest.NewRecorder()
    c, _ := gin.CreateTestContext(w)
    c.Request = httptest.NewRequest("GET", "/", nil)
    c.Request.Header.Set("X-User-ID", "test-user-id")
    c.Request.Header.Set("X-User-Username", "testuser")
    
    middleware(c)
    
    assert.Equal(t, "test-user-id", c.GetString("user_id"))
    assert.Equal(t, "testuser", c.GetString("username"))
}

func TestAuthMiddleware_MissingHeader(t *testing.T) {
    cfg := &config.Config{AuthMode: "gateway"}
    middleware := AuthMiddleware(cfg)
    
    w := httptest.NewRecorder()
    c, _ := gin.CreateTestContext(w)
    c.Request = httptest.NewRequest("GET", "/", nil)
    
    middleware(c)
    
    assert.Equal(t, http.StatusUnauthorized, w.Code)
}

