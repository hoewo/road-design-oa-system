package router

import (
	"github.com/gin-gonic/gin"

	"project-oa-backend/internal/config"
	"project-oa-backend/internal/handlers"
	"project-oa-backend/internal/middleware"
)

// Router 路由管理器
type Router struct {
	engine *gin.Engine
	config *config.Config
	logger interface{} // 使用interface{}避免循环依赖，实际使用时传入*zap.Logger
}

// NewRouter 创建新的路由管理器
func NewRouter(cfg *config.Config) *Router {
	engine := gin.New()
	return &Router{
		engine: engine,
		config: cfg,
	}
}

// SetupRoutes 设置所有路由
func (r *Router) SetupRoutes(
	logger interface{},
	authHandler *handlers.AuthHandler,
	projectHandler *handlers.ProjectHandler,
	clientHandler *handlers.ClientHandler,
	projectBusinessHandler *handlers.ProjectBusinessHandler,
	projectDisciplineHandler *handlers.ProjectDisciplineHandler,
	projectMemberHandler *handlers.ProjectMemberHandler,
	productionFileHandler *handlers.ProductionFileHandler,
	productionApprovalHandler *handlers.ProductionApprovalHandler,
	externalCommissionHandler *handlers.ExternalCommissionHandler,
	productionCostHandler *handlers.ProductionCostHandler,
	contractHandler *handlers.ContractHandler,
	contractAmendmentHandler *handlers.ContractAmendmentHandler,
	expertFeePaymentHandler *handlers.ExpertFeePaymentHandler,
	financialHandler *handlers.FinancialHandler,
	bonusHandler *handlers.BonusHandler,
	userHandler *handlers.UserHandler,
	companyConfigHandler *handlers.CompanyConfigHandler,
	projectContactHandler *handlers.ProjectContactHandler,
	disciplineHandler *handlers.DisciplineHandler,
	biddingHandler *handlers.BiddingHandler,
) {
	r.logger = logger

	// 服务名称和版本
	serviceName := r.config.ServiceName
	if serviceName == "" {
		serviceName = "project-oa"
	}
	version := "v1"

	// 基础路径：/{service}/{version}
	basePath := "/" + serviceName + "/" + version

	// 创建基础路由组
	api := r.engine.Group(basePath)

	// Public路由（无需认证）
	public := api.Group("/public")
	{
		// 健康检查
		public.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"status":  "ok",
				"message": "Project OA System is running",
			})
		})

		// 认证路由已移除 - 登录功能现在由NebulaAuth网关处理
		// 客户端直接调用NebulaAuth网关的登录接口，不通过业务服务
	}

	// User路由（需要JWT Token认证）
	user := api.Group("/user")
	user.Use(middleware.AuthMiddleware(r.config, middleware.AuthLevelUser))
	{
		// 认证相关（需要认证后才能访问）
		auth := user.Group("/auth")
		{
			auth.POST("/logout", authHandler.Logout)
			auth.GET("/me", authHandler.GetCurrentUser)
		}

		// 项目路由
		projects := user.Group("/projects")
		{
			projects.GET("", projectHandler.ListProjects)
			projects.GET("/:id", projectHandler.GetProject)
			projects.POST("", projectHandler.CreateProject)
			projects.PUT("/:id", projectHandler.UpdateProject)
			projects.DELETE("/:id", projectHandler.DeleteProject)

			// Project business information routes
			projects.GET("/:id/business", projectBusinessHandler.GetProjectBusiness)
			projects.PUT("/:id/business", projectBusinessHandler.UpdateProjectBusiness)

			// Project contact routes
			projects.GET("/:id/contact", projectContactHandler.GetProjectContact)
			projects.PUT("/:id/contact", projectContactHandler.CreateOrUpdateProjectContact)
			projects.DELETE("/:id/contact", projectContactHandler.DeleteProjectContact)

			// Bidding info routes
			projects.GET("/:id/bidding", biddingHandler.GetBiddingInfo)
			projects.PUT("/:id/bidding", biddingHandler.CreateOrUpdateBiddingInfo)
			projects.DELETE("/:id/bidding", biddingHandler.DeleteBiddingInfo)
			projects.POST("/:id/bidding/expert-fee", biddingHandler.CreateExpertFeePayment)

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

			// Contract file search route (project-level)
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
		contracts := user.Group("/contracts")
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
		contractAmendments := user.Group("/contract-amendments")
		{
			contractAmendments.GET("/:id", contractAmendmentHandler.GetContractAmendment)
			contractAmendments.PUT("/:id", contractAmendmentHandler.UpdateContractAmendment)
			contractAmendments.DELETE("/:id", contractAmendmentHandler.DeleteContractAmendment)
		}

		// Expert fee payment routes (standalone)
		expertFeePayments := user.Group("/expert-fee-payments")
		{
			expertFeePayments.GET("/:id", expertFeePaymentHandler.GetExpertFeePayment)
			expertFeePayments.PUT("/:id", expertFeePaymentHandler.UpdateExpertFeePayment)
			expertFeePayments.DELETE("/:id", expertFeePaymentHandler.DeleteExpertFeePayment)
		}

		// Financial record routes (standalone)
		financialRecords := user.Group("/financial-records")
		{
			financialRecords.PUT("/:id", financialHandler.UpdateFinancialRecord)
			financialRecords.DELETE("/:id", financialHandler.DeleteFinancialRecord)
		}

		// Bonus routes (standalone)
		bonuses := user.Group("/bonuses")
		{
			bonuses.PUT("/:id", bonusHandler.UpdateBonus)
			bonuses.DELETE("/:id", bonusHandler.DeleteBonus)
		}

		// Client routes
		clients := user.Group("/clients")
		{
			clients.GET("", clientHandler.ListClients)
			clients.GET("/:id", clientHandler.GetClient)
			clients.POST("", clientHandler.CreateClient)
			clients.PUT("/:id", clientHandler.UpdateClient)
			clients.DELETE("/:id", clientHandler.DeleteClient)
		}

		// User routes
		users := user.Group("/users")
		{
			users.GET("", userHandler.ListUsers)
			users.GET("/:id", userHandler.GetUser)
			users.POST("", userHandler.CreateUser)
			users.PUT("/:id", userHandler.UpdateUser)
		}

		// Company configuration routes
		companyConfig := user.Group("/company-config")
		{
			companyConfig.GET("", companyConfigHandler.GetAllConfigs)
			companyConfig.GET("/:key", companyConfigHandler.GetConfig)
			companyConfig.PUT("/:key", companyConfigHandler.UpdateConfig)
			companyConfig.GET("/default-management-fee-ratio", companyConfigHandler.GetDefaultManagementFeeRatio)
			companyConfig.PUT("/default-management-fee-ratio", companyConfigHandler.UpdateDefaultManagementFeeRatio)
		}

		// Discipline routes (专业字典)
		disciplines := user.Group("/disciplines")
		{
			disciplines.GET("", disciplineHandler.ListDisciplines)
			disciplines.GET("/:id", disciplineHandler.GetDiscipline)
			disciplines.POST("", disciplineHandler.CreateDiscipline)
			disciplines.PUT("/:id", disciplineHandler.UpdateDiscipline)
			disciplines.DELETE("/:id", disciplineHandler.DeleteDiscipline)
		}

		// Company revenue statistics route
		user.GET("/company-revenue-statistics", financialHandler.GetCompanyRevenueStatistics)

		// Project members routes
		projectMembers := user.Group("/project-members")
		{
			projectMembers.PUT("/:id", projectMemberHandler.UpdateMember)
			projectMembers.DELETE("/:id", projectMemberHandler.DeleteMember)
		}

		// Production files download route
		user.GET("/production/files/:fileId/download", productionFileHandler.DownloadProductionFile)
	}

	// Admin路由（需要管理员权限）
	admin := api.Group("/admin")
	admin.Use(middleware.AuthMiddleware(r.config, middleware.AuthLevelAdmin))
	{
		// 用户管理路由
		users := admin.Group("/users")
		{
			users.GET("", userHandler.ListUsers)
			users.GET("/:id", userHandler.GetUser)
			users.POST("", userHandler.CreateUser)
			users.PUT("/:id", userHandler.UpdateUserAdmin) // 管理员编辑用户（更新NebulaAuth并同步本地数据库）
			// TODO: 实现 DeleteUser 方法
			// users.DELETE("/:id", userHandler.DeleteUser)
		}

		// 公司收入管理路由
		revenue := admin.Group("/revenue")
		{
			revenue.GET("", financialHandler.GetCompanyRevenueStatistics)
			revenue.GET("/statistics", financialHandler.GetCompanyRevenueStatistics)
		}
	}
}

// GetEngine 获取Gin引擎（用于启动服务器）
func (r *Router) GetEngine() *gin.Engine {
	return r.engine
}
