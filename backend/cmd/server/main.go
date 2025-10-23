package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"

	"project-oa-backend/internal/config"
	"project-oa-backend/pkg/database"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Connect to database
	if err := database.Connect(cfg); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer database.Close()

	// Run database migrations
	if err := database.Migrate(); err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	// Setup Gin router
	router := gin.Default()

	// Add CORS middleware
	router.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", cfg.CORSAllowedOrigins)
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization")
		c.Header("Access-Control-Allow-Credentials", "true")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	})

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"message": "Project OA System is running",
		})
	})

	// API routes
	api := router.Group("/api/v1")
	{
		// Placeholder routes - will be implemented in user story tasks
		api.GET("/projects", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"data": []interface{}{},
				"total": 0,
				"page": 1,
				"size": 10,
			})
		})

		api.GET("/clients", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"data": []interface{}{},
				"total": 0,
				"page": 1,
				"size": 10,
			})
		})
	}

	// Start server
	addr := fmt.Sprintf("%s:%d", cfg.ServerHost, cfg.ServerPort)
	log.Printf("Server starting on %s", addr)
	
	if err := router.Run(addr); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
