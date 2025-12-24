package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"project-oa-backend/internal/config"
	"project-oa-backend/internal/handlers"
	"project-oa-backend/internal/middleware"
	"project-oa-backend/internal/router"
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

	// Initialize storage (MinIO or OSS)
	storageInstance, err := storage.InitStorage(cfg)
	if err != nil {
		logger.Warn("Failed to initialize storage", zap.Error(err))
		logger.Info("Continuing without file storage - file uploads will not work")
	} else {
		// 设置全局存储实例（用于向后兼容）
		storage.SetGlobalStorage(storageInstance)
		logger.Info("Storage initialized successfully", zap.String("type", cfg.StorageType))
	}

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(cfg, logger)
	projectHandler := handlers.NewProjectHandler(logger)
	clientHandler := handlers.NewClientHandler(logger)
	projectBusinessHandler := handlers.NewProjectBusinessHandler(logger)
	projectDisciplineHandler := handlers.NewProjectDisciplineHandler(logger)
	projectMemberHandler := handlers.NewProjectMemberHandler(logger)
	productionFileHandler := handlers.NewProductionFileHandler(cfg, logger)
	productionApprovalHandler := handlers.NewProductionApprovalHandler(cfg, logger)
	externalCommissionHandler := handlers.NewExternalCommissionHandler(logger)
	productionCostHandler := handlers.NewProductionCostHandler(logger)
	contractHandler := handlers.NewContractHandler(cfg, logger)
	contractAmendmentHandler := handlers.NewContractAmendmentHandler(cfg, logger)
	financialHandler := handlers.NewFinancialHandler(logger)
	bonusHandler := handlers.NewBonusHandler(logger)
	userHandler := handlers.NewUserHandlerWithConfig(cfg, logger)
	companyConfigHandler := handlers.NewCompanyConfigHandler(logger)
	projectContactHandler := handlers.NewProjectContactHandler(logger)
	disciplineHandler := handlers.NewDisciplineHandler(logger)
	biddingHandler := handlers.NewBiddingHandler(logger)
	permissionHandler := handlers.NewPermissionHandler(logger)
	fileHandler := handlers.NewFileHandler(cfg, logger)

	// Setup router with new routing format
	routerManager := router.NewRouter(cfg)
	routerEngine := routerManager.GetEngine()

	// Add recovery middleware (must be first)
	routerEngine.Use(middleware.RecoveryMiddleware(logger))

	// Add request ID middleware
	routerEngine.Use(middleware.RequestIDMiddleware())

	// Add logging middleware
	routerEngine.Use(middleware.LoggerMiddleware(logger))

	// Add CORS middleware
	// Gateway模式：网关处理CORS，后端不设置CORS头
	// Self_validate模式：直接访问后端，后端需要设置CORS头
	if cfg.AuthMode == "gateway" {
		logger.Info("CORS middleware disabled (gateway mode - gateway handles CORS)")
	} else {
		routerEngine.Use(middleware.CORSMiddleware(cfg))
		logger.Info("CORS middleware enabled (self_validate mode - direct backend access)")
	}

	// Add error handler middleware (must be before routes)
	routerEngine.Use(middleware.ErrorHandlerMiddleware(logger))

	// Health check endpoint (符合规范: /{service_name}/health)
	healthPath := "/" + cfg.ServiceName + "/health"
	routerEngine.GET(healthPath, func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "ok",
			"service":   cfg.ServiceName,
			"auth_mode": cfg.AuthMode,
			"timestamp": time.Now().Unix(),
		})
	})

	// Legacy health check endpoint (backward compatibility)
	routerEngine.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"message": "Project OA System is running",
		})
	})

	// Setup routes with new format: /{service}/v1/{auth_level}/{path}
	routerManager.SetupRoutes(
		logger,
		authHandler,
		projectHandler,
		clientHandler,
		projectBusinessHandler,
		projectDisciplineHandler,
		projectMemberHandler,
		productionFileHandler,
		productionApprovalHandler,
		externalCommissionHandler,
		productionCostHandler,
		contractHandler,
		contractAmendmentHandler,
		financialHandler,
		bonusHandler,
		userHandler,
		companyConfigHandler,
		projectContactHandler,
		disciplineHandler,
		biddingHandler,
		permissionHandler,
		fileHandler,
	)

	// Start server
	addr := fmt.Sprintf("%s:%d", cfg.ListenHost, cfg.ListenPort)
	logger.Info("Server starting", zap.String("address", addr))

	if err := routerEngine.Run(addr); err != nil {
		logger.Fatal("Failed to start server", zap.Error(err))
	}
}

