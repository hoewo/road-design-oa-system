// admin-check.go
// 业务服务中判断管理员权限的示例

package main

import (
	"net/http"
	"github.com/gin-gonic/gin"
)

// ============================================
// 方式1：从 Header 读取（本地服务可用）
// ============================================

// checkAdminFromHeader 从 Header 读取管理员标识
// 注意：仅本地服务（Unix Socket）可以收到 X-User-IsAdmin header
func checkAdminFromHeader(c *gin.Context) bool {
	isAdminStr := c.GetHeader("X-User-IsAdmin")
	return isAdminStr == "true"
}

// ============================================
// 方式2：从上下文读取（推荐）
// ============================================

// checkAdminFromContext 从上下文读取管理员标识
// 这是推荐的方式，因为认证中间件已经解析并存储到上下文
func checkAdminFromContext(c *gin.Context) bool {
	isAdmin, exists := c.Get("is_admin")
	if !exists {
		return false
	}
	return isAdmin.(bool)
}

// ============================================
// 方式3：通过路由级别判断（外部服务）
// ============================================

// 对于外部服务，如果请求能到达 admin 路由，说明已经是管理员
// 网关已经验证过管理员权限

// ============================================
// 完整示例：管理员权限检查中间件
// ============================================

// AdminOnlyMiddleware 管理员权限检查中间件
func AdminOnlyMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 从上下文获取 is_admin（由认证中间件设置）
		isAdmin, exists := c.Get("is_admin")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "未认证",
				"code":  "UNAUTHORIZED",
			})
			c.Abort()
			return
		}

		// 检查是否是管理员
		if !isAdmin.(bool) {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "需要管理员权限",
				"code":  "ADMIN_PERMISSION_REQUIRED",
			})
			c.Abort()
			return
		}

		// 是管理员，继续执行
		c.Next()
	}
}

// ============================================
// 使用示例
// ============================================

func setupRoutes(r *gin.Engine) {
	// 应用认证中间件（先执行）
	r.Use(AuthMiddleware())

	// 用户接口
	userGroup := r.Group("/v1/user")
	{
		userGroup.GET("/profile", func(c *gin.Context) {
			userID := c.GetString("user_id")
			isAdmin := c.GetBool("is_admin")

			// 根据是否是管理员返回不同信息
			if isAdmin {
				c.JSON(200, gin.H{
					"user_id": userID,
					"role":    "admin",
					"message": "管理员用户",
				})
			} else {
				c.JSON(200, gin.H{
					"user_id": userID,
					"role":    "user",
					"message": "普通用户",
				})
			}
		})
	}

	// 管理员接口（需要额外应用 AdminOnlyMiddleware）
	adminGroup := r.Group("/v1/admin")
	adminGroup.Use(AdminOnlyMiddleware()) // 只有管理员可以通过
	{
		adminGroup.GET("/stats", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"message": "这是管理员接口",
			})
		})
	}
}

