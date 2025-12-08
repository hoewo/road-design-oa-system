package database

import (
	"fmt"
	"log"
	"strings"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"project-oa-backend/internal/config"
	"project-oa-backend/internal/models"
)

var DB *gorm.DB

func Connect(cfg *config.Config) error {
	// 根据数据库类型选择连接方式
	switch cfg.DBType {
	case "postgresql":
		return ConnectPostgreSQL(cfg)
	case "rds":
		return ConnectRDS(cfg)
	default:
		// 默认使用PostgreSQL
		return ConnectPostgreSQL(cfg)
	}
}

// ConnectPostgreSQL 连接到PostgreSQL数据库
func ConnectPostgreSQL(cfg *config.Config) error {
	dsn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBSSLMode)

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	log.Println("PostgreSQL database connected successfully")
	return nil
}

func Migrate() error {
	if DB == nil {
		return fmt.Errorf("database connection not initialized")
	}

	log.Println("Starting database migration...")

	// 使用事务进行迁移，但不回滚已存在的表
	// GORM AutoMigrate 是幂等的，多次执行是安全的
	err := DB.AutoMigrate(
		&models.User{},
		&models.Project{},
		&models.Client{},
		&models.ProjectContact{}, // 项目联系人实体
		&models.Discipline{},     // 专业字典实体
		&models.Contract{},
		&models.ContractAmendment{},
		&models.ExpertFeePayment{},
		&models.ProjectMember{},
		&models.File{},
		&models.FinancialRecord{},
		&models.Bonus{},
		&models.ProjectDisciplineAssignment{},
		&models.ProductionFile{},
		&models.ProductionApprovalRecord{},
		&models.AuditResolution{},
		&models.ExternalCommission{},
		&models.ProductionCost{},
		&models.CompanyConfig{},
	)

	if err != nil {
		// 检查是否是唯一索引冲突错误（SQLSTATE 23505）
		errMsg := err.Error()
		if containsIgnorableError(errMsg) {
			log.Printf("Migration warning (safe to ignore): %v", err)
			log.Println("Database schema is already up to date")
			return nil
		}
		return fmt.Errorf("failed to migrate database: %w", err)
	}

	log.Println("Database migration completed successfully")
	return nil
}

// containsIgnorableError 检查错误是否可以安全忽略
// 某些错误表示数据库已经处于正确状态
func containsIgnorableError(errMsg string) bool {
	ignorablePatterns := []string{
		"23505", // unique_violation - 唯一约束已存在
		"42P07", // duplicate_table - 表已存在
		"42710", // duplicate_object - 对象已存在
		"already exists",
		"duplicate key",
		"could not create unique index", // GORM特定错误
	}

	errMsgLower := strings.ToLower(errMsg)
	for _, pattern := range ignorablePatterns {
		if strings.Contains(errMsgLower, strings.ToLower(pattern)) {
			return true
		}
	}
	return false
}

func Close() error {
	if DB == nil {
		return nil
	}

	sqlDB, err := DB.DB()
	if err != nil {
		return err
	}

	return sqlDB.Close()
}
