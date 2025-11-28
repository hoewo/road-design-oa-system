package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"golang.org/x/crypto/bcrypt"

	"project-oa-backend/internal/config"
	"project-oa-backend/internal/handlers"
	"project-oa-backend/internal/middleware"
	"project-oa-backend/internal/models"
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

	// Initialize test user if not exists
	if err := initTestUser(cfg, logger); err != nil {
		logger.Warn("Failed to initialize test user", zap.Error(err))
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

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(cfg, logger)
	projectHandler := handlers.NewProjectHandler(logger)
	clientHandler := handlers.NewClientHandler(logger)
	projectBusinessHandler := handlers.NewProjectBusinessHandler(logger)
	projectDisciplineHandler := handlers.NewProjectDisciplineHandler(logger)
	projectMemberHandler := handlers.NewProjectMemberHandler(logger)
	productionFileHandler := handlers.NewProductionFileHandler(cfg, logger)
	productionApprovalHandler := handlers.NewProductionApprovalHandler(logger)
	externalCommissionHandler := handlers.NewExternalCommissionHandler(logger)
	productionCostHandler := handlers.NewProductionCostHandler(logger)
	contractHandler := handlers.NewContractHandler(cfg, logger)
	contractAmendmentHandler := handlers.NewContractAmendmentHandler(logger)
	expertFeePaymentHandler := handlers.NewExpertFeePaymentHandler(logger)
	financialHandler := handlers.NewFinancialHandler(logger)
	bonusHandler := handlers.NewBonusHandler(logger)
	userHandler := handlers.NewUserHandler(logger)
	companyConfigHandler := handlers.NewCompanyConfigHandler(logger)

	// API routes
	api := router.Group("/api/v1")
	{
		// Public routes (no auth required)
		api.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"status": "ok",
			})
		})

		// Auth routes (public)
		auth := api.Group("/auth")
		{
			auth.POST("/login", authHandler.Login)
			auth.POST("/logout", middleware.AuthMiddleware(cfg), authHandler.Logout)
			auth.GET("/me", middleware.AuthMiddleware(cfg), authHandler.GetCurrentUser)
		}

		// Protected routes (auth required)
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware(cfg))
		{
			// Project routes
			projects := protected.Group("/projects")
			{
				projects.GET("", projectHandler.ListProjects)
				projects.GET("/:id", projectHandler.GetProject)
				projects.POST("", projectHandler.CreateProject)
				projects.PUT("/:id", projectHandler.UpdateProject)
				projects.DELETE("/:id", projectHandler.DeleteProject)

				// Project business information routes
				projects.GET("/:id/business", projectBusinessHandler.GetProjectBusiness)
				projects.PUT("/:id/business", projectBusinessHandler.UpdateProjectBusiness)

				// Project member routes
				projects.GET("/:id/members", projectMemberHandler.ListMembers)
				projects.POST("/:id/members", projectMemberHandler.CreateMember)

				// Production discipline assignments
				projects.GET("/:id/production/discipline-assignments", projectDisciplineHandler.ListAssignments)
				projects.PUT("/:id/production/discipline-assignments", projectDisciplineHandler.ReplaceAssignments)

				// Production file management
				projects.POST("/:id/production/files", productionFileHandler.UploadProductionFile)
				projects.GET("/:id/production/files", productionFileHandler.ListProductionFiles)
				projects.GET("/:id/production/files/:fileId/download", productionFileHandler.DownloadProductionFile)

				// Production approvals
				projects.GET("/:id/production/approvals", productionApprovalHandler.ListApprovals)
				projects.POST("/:id/production/approvals", productionApprovalHandler.CreateApproval)

				// External commissions
				projects.GET("/:id/production/external-commissions", externalCommissionHandler.ListCommissions)
				projects.POST("/:id/production/external-commissions", externalCommissionHandler.CreateCommission)

				// Production costs
				projects.GET("/:id/production/costs", productionCostHandler.ListCosts)
				projects.POST("/:id/production/costs", productionCostHandler.CreateCost)

				// Contract file search route (project-level) - must be before /:id/contracts to avoid route conflict
				projects.GET("/:id/contracts/files", contractHandler.SearchContractFiles)

				// Project contracts routes
				projects.GET("/:id/contracts", contractHandler.GetContractsByProject)
				projects.POST("/:id/contracts", contractHandler.CreateContract)

				// Expert fee payment routes
				projects.GET("/:id/expert-fee-payments", expertFeePaymentHandler.GetExpertFeePayments)
				projects.POST("/:id/expert-fee-payments", expertFeePaymentHandler.CreateExpertFeePayment)

				// Financial routes
				projects.GET("/:id/financial", financialHandler.GetProjectFinancial)
				projects.POST("/:id/financial", financialHandler.CreateFinancialRecord)

				// Bonus routes
				projects.GET("/:id/bonuses", bonusHandler.GetBonuses)
				projects.POST("/:id/bonuses", bonusHandler.CreateBonus)
			}

			// Contract routes
			contracts := protected.Group("/contracts")
			{
				contracts.GET("/:id", contractHandler.GetContract)
				contracts.PUT("/:id", contractHandler.UpdateContract)
				contracts.DELETE("/:id", contractHandler.DeleteContract)

				// Contract amendment routes
				contracts.GET("/:id/amendments", contractAmendmentHandler.GetContractAmendments)
				contracts.POST("/:id/amendments", contractAmendmentHandler.CreateContractAmendment)

				// Contract file routes
				contracts.POST("/:id/files", contractHandler.UploadContractFile)
				contracts.GET("/files/:fileId/download", contractHandler.DownloadContractFile)
			}

			// Contract amendment routes (standalone)
			contractAmendments := protected.Group("/contract-amendments")
			{
				contractAmendments.GET("/:id", contractAmendmentHandler.GetContractAmendment)
				contractAmendments.PUT("/:id", contractAmendmentHandler.UpdateContractAmendment)
				contractAmendments.DELETE("/:id", contractAmendmentHandler.DeleteContractAmendment)
			}

			// Expert fee payment routes (standalone)
			expertFeePayments := protected.Group("/expert-fee-payments")
			{
				expertFeePayments.GET("/:id", expertFeePaymentHandler.GetExpertFeePayment)
				expertFeePayments.PUT("/:id", expertFeePaymentHandler.UpdateExpertFeePayment)
				expertFeePayments.DELETE("/:id", expertFeePaymentHandler.DeleteExpertFeePayment)
			}

			// Financial record routes (standalone)
			financialRecords := protected.Group("/financial-records")
			{
				financialRecords.PUT("/:id", financialHandler.UpdateFinancialRecord)
				financialRecords.DELETE("/:id", financialHandler.DeleteFinancialRecord)
			}

			// Bonus routes (standalone)
			bonuses := protected.Group("/bonuses")
			{
				bonuses.PUT("/:id", bonusHandler.UpdateBonus)
				bonuses.DELETE("/:id", bonusHandler.DeleteBonus)
			}

			// Client routes
			clients := protected.Group("/clients")
			{
				clients.GET("", clientHandler.ListClients)
				clients.GET("/:id", clientHandler.GetClient)
				clients.POST("", clientHandler.CreateClient)
				clients.PUT("/:id", clientHandler.UpdateClient)
				clients.DELETE("/:id", clientHandler.DeleteClient)
			}

			// User routes
			users := protected.Group("/users")
			{
				users.GET("", userHandler.ListUsers)
				users.GET("/:id", userHandler.GetUser)
				users.POST("", userHandler.CreateUser)
				users.PUT("/:id", userHandler.UpdateUser)
			}

			// Company configuration routes
			companyConfig := protected.Group("/company-config")
			{
				companyConfig.GET("", companyConfigHandler.GetAllConfigs)
				companyConfig.GET("/:key", companyConfigHandler.GetConfig)
				companyConfig.PUT("/:key", companyConfigHandler.UpdateConfig)
				companyConfig.GET("/default-management-fee-ratio", companyConfigHandler.GetDefaultManagementFeeRatio)
				companyConfig.PUT("/default-management-fee-ratio", companyConfigHandler.UpdateDefaultManagementFeeRatio)
			}

			// Company revenue statistics route
			protected.GET("/company-revenue-statistics", financialHandler.GetCompanyRevenueStatistics)

			projectMembers := protected.Group("/project-members")
			{
				projectMembers.PUT("/:id", projectMemberHandler.UpdateMember)
				projectMembers.DELETE("/:id", projectMemberHandler.DeleteMember)
			}

			protected.GET("/production/files/:fileId/download", productionFileHandler.DownloadProductionFile)
		}
	}

	// Start server
	addr := fmt.Sprintf("%s:%d", cfg.ServerHost, cfg.ServerPort)
	logger.Info("Server starting", zap.String("address", addr))

	if err := router.Run(addr); err != nil {
		logger.Fatal("Failed to start server", zap.Error(err))
	}
}

// initTestUser creates a test user if it doesn't exist
func initTestUser(cfg *config.Config, logger *zap.Logger) error {
	var user models.User
	if err := database.DB.Where("username = ?", "admin").First(&user).Error; err == nil {
		// User already exists
		return nil
	}

	// Create test user
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	testUser := &models.User{
		Username: "admin",
		Email:    "admin@example.com",
		Password: string(hashedPassword),
		RealName: "系统管理员",
		Role:     models.RoleAdmin,
		IsActive: true,
	}

	if err := database.DB.Create(testUser).Error; err != nil {
		return err
	}

	logger.Info("Test user created",
		zap.String("username", "admin"),
		zap.String("password", "admin123"),
	)

	return nil
}
