// main.go
// 完整的业务服务示例（包含所有认证级别）
package main

import (
    "encoding/json"
    "github.com/gin-gonic/gin"
    "net/http"
    "time"
    "your-project/config"
    "your-project/middleware"
)

func main() {
    cfg := config.LoadConfig()
    r := gin.Default()
    
    // 健康检查（必须实现）
    r.GET("/"+cfg.ServiceName+"/health", func(c *gin.Context) {
        c.JSON(200, gin.H{
            "status":    "ok",
            "service":   cfg.ServiceName,
            "auth_mode": cfg.AuthMode,
            "timestamp": time.Now().Unix(),
        })
    })
    
    // 公开接口
    r.GET("/"+cfg.ServiceName+"/v1/public/info", func(c *gin.Context) {
        c.JSON(200, gin.H{"message": "公开接口"})
    })
    
    // 用户接口（需要JWT认证）
    userGroup := r.Group("/" + cfg.ServiceName + "/v1/user")
    userGroup.Use(middleware.AuthMiddleware(cfg))
    {
        userGroup.GET("/profile", func(c *gin.Context) {
            userID := c.GetString("user_id")
            username := c.GetString("username")
            isAdmin := c.GetBool("is_admin")
            
            if userID == "" {
                c.JSON(401, gin.H{"error": "未认证"})
                return
            }
            
            c.JSON(200, gin.H{
                "user_id":   userID,
                "username":  username,
                "is_admin":  isAdmin,
                "message":   "用户信息获取成功",
            })
        })
    }
    
    // API密钥接口
    apikeyGroup := r.Group("/" + cfg.ServiceName + "/v1/apikey")
    apikeyGroup.Use(middleware.AuthMiddleware(cfg))
    {
        apikeyGroup.GET("/data", func(c *gin.Context) {
            permissionsJSON := c.GetHeader("X-User-Permissions")
            var permissions []string
            if permissionsJSON != "" {
                json.Unmarshal([]byte(permissionsJSON), &permissions)
            }
            c.JSON(200, gin.H{"permissions": permissions})
        })
    }
    
    // 管理员接口
    adminGroup := r.Group("/" + cfg.ServiceName + "/v1/admin")
    adminGroup.Use(middleware.AuthMiddleware(cfg))
    {
        adminGroup.GET("/stats", func(c *gin.Context) {
            c.JSON(200, gin.H{"message": "管理员接口"})
        })
    }
    
    r.Run(":" + cfg.ServicePort)
}

