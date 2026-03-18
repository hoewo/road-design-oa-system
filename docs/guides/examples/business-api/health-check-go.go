// main.go
// 健康检查端点实现示例（必须实现）
package main

import (
    "github.com/gin-gonic/gin"
    "time"
    "your-project/config"
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
    
    r.Run(":" + cfg.ServicePort)
}

