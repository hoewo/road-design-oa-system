// main.go
// 增强的健康检查实现（包含依赖检查）
package main

import (
    "github.com/gin-gonic/gin"
    "time"
)

func main() {
    r := gin.Default()
    
    r.GET("/your-service/health", func(c *gin.Context) {
        health := gin.H{
            "status":    "ok",
            "service":   "your-service",
            "timestamp": time.Now().Unix(),
        }
        
        // 检查数据库连接
        if err := db.Ping(); err != nil {
            health["status"] = "degraded"
            health["database"] = "unavailable"
        } else {
            health["database"] = "ok"
        }
        
        // 检查 Redis 连接
        if err := redis.Ping(); err != nil {
            health["status"] = "degraded"
            health["cache"] = "unavailable"
        } else {
            health["cache"] = "ok"
        }
        
        statusCode := 200
        if health["status"] == "degraded" {
            statusCode = 503
        }
        
        c.JSON(statusCode, health)
    })
    
    r.Run(":port")
}

