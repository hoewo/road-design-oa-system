package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"project-oa-backend/internal/config"
	"project-oa-backend/internal/middleware"
	"project-oa-backend/pkg/database"
	"project-oa-backend/pkg/storage"
	"project-oa-backend/pkg/utils"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Initialize logger
	logger, err := utils.InitLogger(cfg)
	if err != nil {
		log.Fatal("Failed to initialize logger:", err)
	}
	defer logger.Sync()

	logger.Info("Starting Project OA System",
		zap.String("version", "1.0.0"),
		zap.String("environment", cfg.LogLevel),
	)

	// Connect to database
	if err := database.Connect(cfg); err != nil {
		logger.Fatal("Failed to connect to database", zap.Error(err))
	}
	defer database.Close()

	// Run database migrations
	if err := database.Migrate(); err != nil {
		logger.Fatal("Failed to migrate database", zap.Error(err))
	}

	// Initialize MinIO storage
	if err := storage.InitMinIO(cfg); err != nil {
		logger.Warn("Failed to initialize MinIO storage", zap.Error(err))
		logger.Info("Continuing without file storage - file uploads will not work")
	}

	// Setup Gin router
	router := gin.New()

	// Add recovery middleware (must be first)
	router.Use(middleware.RecoveryMiddleware(logger))

	// Add request ID middleware
	router.Use(middleware.RequestIDMiddleware())

	// Add logging middleware
	router.Use(middleware.LoggerMiddleware(logger))

	// Add CORS middleware
	router.Use(middleware.CORSMiddleware(cfg))

	// Add error handler middleware (must be before routes)
	router.Use(middleware.ErrorHandlerMiddleware(logger))

	// Health check endpoint (no auth required)
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"message": "Project OA System is running",
		})
	})

	// API routes
	api := router.Group("/api/v1")
	{
		// Public routes (no auth required)
		api.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"status": "ok",
			})
		})

		// Protected routes (auth required)
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware(cfg))
		{
			// Placeholder routes - will be implemented in user story tasks
			protected.GET("/projects", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{
					"data":  []interface{}{},
					"total": 0,
					"page":  1,
					"size":  10,
				})
			})

			protected.GET("/clients", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{
					"data":  []interface{}{},
					"total": 0,
					"page":  1,
					"size":  10,
				})
			})
		}
	}

	// Start server
	addr := fmt.Sprintf("%s:%d", cfg.ServerHost, cfg.ServerPort)
	logger.Info("Server starting", zap.String("address", addr))

	if err := router.Run(addr); err != nil {
		logger.Fatal("Failed to start server", zap.Error(err))
	}
}
