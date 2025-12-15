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

	// 先执行用户角色迁移（从单个role字段迁移到roles数组）
	if err := migrateUserRoles(); err != nil {
		return fmt.Errorf("failed to migrate user roles: %w", err)
	}

	// 删除旧的role列（如果存在）
	if err := dropOldRoleColumn(); err != nil {
		return fmt.Errorf("failed to drop old role column: %w", err)
	}

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

// migrateUserRoles 迁移用户角色从单个role字段到roles数组
func migrateUserRoles() error {
	// 检查roles列是否已存在
	var exists bool
	err := DB.Raw(`
		SELECT EXISTS (
			SELECT 1 
			FROM information_schema.columns 
			WHERE table_schema = CURRENT_SCHEMA() 
			AND table_name = 'users' 
			AND column_name = 'roles'
		)
	`).Scan(&exists).Error

	if err != nil {
		return fmt.Errorf("failed to check roles column: %w", err)
	}

	// 如果roles列已存在，跳过迁移
	if exists {
		log.Println("Roles column already exists, skipping migration")
		return nil
	}

	// 检查role列是否存在
	var roleExists bool
	err = DB.Raw(`
		SELECT EXISTS (
			SELECT 1 
			FROM information_schema.columns 
			WHERE table_schema = CURRENT_SCHEMA() 
			AND table_name = 'users' 
			AND column_name = 'role'
		)
	`).Scan(&roleExists).Error

	if err != nil {
		return fmt.Errorf("failed to check role column: %w", err)
	}

	log.Println("Migrating user roles from single role to roles array...")

	// Step 1: 添加roles列（允许NULL）
	if err := DB.Exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS roles text[]`).Error; err != nil {
		return fmt.Errorf("failed to add roles column: %w", err)
	}

	// Step 2: 迁移现有role数据到roles数组
	if roleExists {
		if err := DB.Exec(`
			UPDATE users 
			SET roles = ARRAY[role]::text[]
			WHERE roles IS NULL AND role IS NOT NULL
		`).Error; err != nil {
			return fmt.Errorf("failed to migrate role data: %w", err)
		}
	}

	// Step 3: 为剩余的NULL值设置默认值
	if err := DB.Exec(`
		UPDATE users 
		SET roles = ARRAY['member']::text[]
		WHERE roles IS NULL
	`).Error; err != nil {
		return fmt.Errorf("failed to set default roles: %w", err)
	}

	// Step 4: 设置NOT NULL约束
	if err := DB.Exec(`ALTER TABLE users ALTER COLUMN roles SET NOT NULL`).Error; err != nil {
		return fmt.Errorf("failed to set NOT NULL constraint: %w", err)
	}

	// Step 5: 设置默认值
	if err := DB.Exec(`ALTER TABLE users ALTER COLUMN roles SET DEFAULT ARRAY['member']::text[]`).Error; err != nil {
		return fmt.Errorf("failed to set default value: %w", err)
	}

	log.Println("User roles migration completed successfully")
	return nil
}

// dropOldRoleColumn 删除旧的role列（如果存在）
func dropOldRoleColumn() error {
	// 检查role列是否存在
	var roleExists bool
	err := DB.Raw(`
		SELECT EXISTS (
			SELECT 1 
			FROM information_schema.columns 
			WHERE table_schema = CURRENT_SCHEMA() 
			AND table_name = 'users' 
			AND column_name = 'role'
		)
	`).Scan(&roleExists).Error

	if err != nil {
		return fmt.Errorf("failed to check role column: %w", err)
	}

	// 如果role列不存在，跳过
	if !roleExists {
		log.Println("Old role column does not exist, skipping drop")
		return nil
	}

	// 确保所有用户都有roles值（防止删除role列后出现问题）
	if err := DB.Exec(`
		UPDATE users 
		SET roles = ARRAY['member']::text[]
		WHERE roles IS NULL
	`).Error; err != nil {
		return fmt.Errorf("failed to ensure all users have roles: %w", err)
	}

	// 删除旧的role列
	if err := DB.Exec(`ALTER TABLE users DROP COLUMN IF EXISTS role`).Error; err != nil {
		return fmt.Errorf("failed to drop old role column: %w", err)
	}

	log.Println("Old role column dropped successfully")
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
