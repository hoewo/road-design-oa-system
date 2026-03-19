package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/golang-migrate/migrate/v4"
	migratepostgres "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/lib/pq"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"project-oa-backend/internal/config"
	"project-oa-backend/internal/models"
)

var DB *gorm.DB

// tableExists 检查表是否存在
func tableExists(tableName string) (bool, error) {
	var exists bool
	err := DB.Raw(`
		SELECT EXISTS (
			SELECT 1 
			FROM information_schema.tables 
			WHERE table_schema = CURRENT_SCHEMA() 
			AND table_name = $1
		)
	`, tableName).Scan(&exists).Error
	if err != nil {
		return false, fmt.Errorf("failed to check if table %s exists: %w", tableName, err)
	}
	return exists, nil
}

// columnExists 检查列是否存在
func columnExists(tableName, columnName string) (bool, error) {
	var exists bool
	err := DB.Raw(`
		SELECT EXISTS (
			SELECT 1 
			FROM information_schema.columns 
			WHERE table_schema = CURRENT_SCHEMA() 
			AND table_name = $1 
			AND column_name = $2
		)
	`, tableName, columnName).Scan(&exists).Error
	if err != nil {
		// 如果表不存在，返回 false 而不是错误（首次部署时表可能不存在）
		if strings.Contains(err.Error(), "does not exist") {
			return false, nil
		}
		return false, fmt.Errorf("failed to check if column %s.%s exists: %w", tableName, columnName, err)
	}
	return exists, nil
}

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

	// 启用UUID扩展
	if err := DB.Exec(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`).Error; err != nil {
		log.Printf("Warning: Failed to create uuid-ossp extension (may already exist): %v", err)
	}

	// ============================================
	// 阶段1: 表结构迁移（在AutoMigrate之前执行）
	// 这些迁移会改变表结构，需要在AutoMigrate之前完成
	// ============================================

	// 1.1 用户角色迁移（从单个role字段迁移到roles数组）
	if err := migrateUserRoles(); err != nil {
		return fmt.Errorf("failed to migrate user roles: %w", err)
	}

	// 1.2 删除旧的role列（如果存在）
	if err := dropOldRoleColumn(); err != nil {
		return fmt.Errorf("failed to drop old role column: %w", err)
	}

	// 1.3 招投标信息表结构迁移（从单文件字段到数组字段）
	// 注意：必须在AutoMigrate之前执行，因为AutoMigrate会根据模型创建数组字段
	// 如果表已存在且是旧结构，需要先迁移表结构
	if err := migrateBiddingInfoToArray(); err != nil {
		return fmt.Errorf("failed to migrate bidding info to array: %w", err)
	}

	// 1.4 移除合同表中的contract_type列（002规范中已移除该字段）
	if err := dropContractTypeColumn(); err != nil {
		return fmt.Errorf("failed to drop contract_type column: %w", err)
	}

	// ============================================
	// 阶段2: 表结构创建/更新（使用GORM AutoMigrate）
	// AutoMigrate 会根据模型定义创建/更新表结构
	// 注意：AutoMigrate 只会添加字段，不会删除字段
	// ============================================
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
		&models.ProductionFileVersion{},
		&models.ProductionApproval{},      // 新的批复审计信息实体（符合002规范）
		&models.ProductionApprovalRecord{}, // 保留旧模型以保持向后兼容
		&models.AuditResolution{},
		&models.ExternalCommission{},
		&models.CompanyConfig{},
		&models.BiddingInfo{},   // 招投标信息实体（如果表不存在，会创建数组字段）
		&models.MultipartUpload{}, &models.MultipartUploadPart{},
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

	// ============================================
	// 阶段3: 数据迁移（在表结构创建后执行）
	// 这些迁移会移动或转换数据，需要在表结构就绪后执行
	// ============================================

	// 3.1 迁移联系人数据（从clients表到project_contacts表）
	if err := migrateContactData(); err != nil {
		return fmt.Errorf("failed to migrate contact data: %w", err)
	}

	// 3.2 迁移财务记录数据（从Bonus、ExpertFeePayment、ProductionCost到FinancialRecord）
	if err := migrateFinancialRecords(); err != nil {
		return fmt.Errorf("failed to migrate financial records: %w", err)
	}

	// ============================================
	// 阶段4: 初始化默认数据
	// 在表结构创建后，初始化必要的默认数据
	// ============================================

	// 4.1 初始化专业字典默认数据
	if err := initializeDisciplines(); err != nil {
		return fmt.Errorf("failed to initialize disciplines: %w", err)
	}

	log.Println("Database migration completed successfully")
	return nil
}

// migrateUserRoles 迁移用户角色从单个role字段到roles数组
func migrateUserRoles() error {
	// 首次部署时，如果users表不存在，跳过迁移（AutoMigrate会创建表）
	exists, err := tableExists("users")
	if err != nil {
		return fmt.Errorf("failed to check if users table exists: %w", err)
	}
	if !exists {
		log.Println("Users table does not exist yet, skipping user roles migration (will be handled by AutoMigrate)")
		return nil
	}

	// 检查roles列是否已存在
	rolesExists, err := columnExists("users", "roles")
	if err != nil {
		return fmt.Errorf("failed to check roles column: %w", err)
	}

	// 如果roles列已存在，跳过迁移
	if rolesExists {
		log.Println("Roles column already exists, skipping migration")
		return nil
	}

	// 检查role列是否存在
	roleExists, err := columnExists("users", "role")
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

	// Step 3: 为剩余的NULL值设置默认值（如果role列不存在，也需要设置默认值）
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
	// 首次部署时，如果users表不存在，跳过迁移
	exists, err := tableExists("users")
	if err != nil {
		return fmt.Errorf("failed to check if users table exists: %w", err)
	}
	if !exists {
		log.Println("Users table does not exist yet, skipping old role column drop")
		return nil
	}

	// 检查role列是否存在
	roleExists, err := columnExists("users", "role")
	if err != nil {
		return fmt.Errorf("failed to check role column: %w", err)
	}

	// 如果role列不存在，跳过删除操作
	if !roleExists {
		log.Println("Old role column does not exist, skipping drop")
		return nil
	}

	// 注意：roles默认值已在migrateUserRoles()中设置，这里不需要重复设置
	// 但为了确保数据完整性，再次检查并设置（幂等操作）
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

// migrateContactData 迁移联系人数据从clients表到project_contacts表
func migrateContactData() error {
	// 首次部署时，如果相关表不存在，跳过迁移
	clientsExists, err := tableExists("clients")
	if err != nil {
		return fmt.Errorf("failed to check if clients table exists: %w", err)
	}
	if !clientsExists {
		log.Println("Clients table does not exist yet, skipping contact data migration")
		return nil
	}

	projectsExists, err := tableExists("projects")
	if err != nil {
		return fmt.Errorf("failed to check if projects table exists: %w", err)
	}
	if !projectsExists {
		log.Println("Projects table does not exist yet, skipping contact data migration")
		return nil
	}

	projectContactsExists, err := tableExists("project_contacts")
	if err != nil {
		return fmt.Errorf("failed to check if project_contacts table exists: %w", err)
	}
	if !projectContactsExists {
		log.Println("Project_contacts table does not exist yet, skipping contact data migration")
		return nil
	}

	// 检查clients表是否有contact_name或contact_phone列
	hasContactName, err := columnExists("clients", "contact_name")
	if err != nil {
		return fmt.Errorf("failed to check contact_name column: %w", err)
	}

	hasContactPhone, err := columnExists("clients", "contact_phone")
	if err != nil {
		return fmt.Errorf("failed to check contact_phone column: %w", err)
	}

	// 如果clients表没有这些列，说明已经迁移过了，跳过
	if !hasContactName && !hasContactPhone {
		log.Println("Contact data already migrated, skipping")
		return nil
	}

	log.Println("Migrating contact data from clients to project_contacts...")

	// 迁移联系人数据
	if err := DB.Exec(`
		INSERT INTO project_contacts (project_id, client_id, contact_name, contact_phone, created_at, updated_at)
		SELECT
			p.id AS project_id,
			p.client_id,
			COALESCE(c.contact_name, '') AS contact_name,
			COALESCE(c.contact_phone, '') AS contact_phone,
			CURRENT_TIMESTAMP AS created_at,
			CURRENT_TIMESTAMP AS updated_at
		FROM projects p
		INNER JOIN clients c ON p.client_id = c.id
		WHERE p.client_id IS NOT NULL
		  AND (c.contact_name IS NOT NULL OR c.contact_phone IS NOT NULL)
		ON CONFLICT (project_id) DO NOTHING
	`).Error; err != nil {
		return fmt.Errorf("failed to migrate contact data: %w", err)
	}

	log.Println("Contact data migration completed")
	return nil
}

// migrateFinancialRecords 迁移财务记录数据（从Bonus、ExpertFeePayment、ProductionCost到FinancialRecord）
func migrateFinancialRecords() error {
	// 检查financial_records表是否存在（应该在AutoMigrate之后，但为了安全起见还是检查）
	exists, err := tableExists("financial_records")
	if err != nil {
		return fmt.Errorf("failed to check if financial_records table exists: %w", err)
	}
	if !exists {
		log.Println("Financial_records table does not exist yet, skipping financial records migration")
		return nil
	}

	log.Println("Migrating financial records...")

	// 迁移Bonus数据
	bonusesExists, _ := tableExists("bonuses")
	if bonusesExists {
	if err := DB.Exec(`
		INSERT INTO financial_records (
			id, project_id, financial_type, direction, amount, occurred_at,
			bonus_category, recipient_id, description, created_by_id, created_at, updated_at
		)
		SELECT
			id, project_id, 'bonus'::text, 'expense'::text, amount,
			COALESCE(created_at, NOW()),
			CASE
				WHEN bonus_type = 'business' THEN 'business'::text
				WHEN bonus_type = 'production' THEN 'production'::text
				ELSE NULL
			END,
			user_id, description, created_by_id, created_at, updated_at
		FROM bonuses
		WHERE NOT EXISTS (
			SELECT 1 FROM financial_records WHERE financial_records.id = bonuses.id
		)
	`).Error; err != nil {
			log.Printf("Warning: Failed to migrate bonus data: %v", err)
		}
	}

	// 迁移ExpertFeePayment数据
	expertFeePaymentsExists, _ := tableExists("expert_fee_payments")
	if expertFeePaymentsExists {
	if err := DB.Exec(`
		INSERT INTO financial_records (
			id, project_id, financial_type, direction, amount, occurred_at,
			payment_method, expert_name, description, created_by_id, created_at, updated_at
		)
		SELECT
			id, project_id, 'expert_fee'::text, 'expense'::text, amount,
			COALESCE(created_at, NOW()),
			payment_method::text, expert_name, description, created_by_id, created_at, updated_at
		FROM expert_fee_payments
		WHERE NOT EXISTS (
			SELECT 1 FROM financial_records WHERE financial_records.id = expert_fee_payments.id
		)
	`).Error; err != nil {
			log.Printf("Warning: Failed to migrate expert fee payment data: %v", err)
		}
	}

	// 迁移ProductionCost数据
	productionCostsExists, _ := tableExists("production_costs")
	if productionCostsExists {
	if err := DB.Exec(`
		INSERT INTO financial_records (
			id, project_id, financial_type, direction, amount, occurred_at,
			cost_category, description, created_by_id, created_at, updated_at
		)
		SELECT
			id, project_id, 'cost'::text, 'expense'::text, amount,
			COALESCE(incurred_at, created_at, NOW()),
			CASE
				WHEN cost_type = 'travel' THEN 'taxi'::text
				WHEN cost_type = 'accommodation' THEN 'accommodation'::text
				WHEN cost_type = 'vehicle' THEN 'taxi'::text
				WHEN cost_type = 'labor' THEN 'other'::text
				WHEN cost_type = 'material' THEN 'other'::text
				WHEN cost_type = 'other' THEN 'other'::text
				ELSE 'other'::text
			END,
			description, created_by_id, created_at, updated_at
		FROM production_costs
		WHERE NOT EXISTS (
			SELECT 1 FROM financial_records WHERE financial_records.id = production_costs.id
		)
	`).Error; err != nil {
			log.Printf("Warning: Failed to migrate production cost data: %v", err)
		}
	}

	log.Println("Financial records migration completed")
	return nil
}

// initializeDisciplines 初始化专业字典默认数据
func initializeDisciplines() error {
	// 检查disciplines表是否存在（应该在AutoMigrate之后，但为了安全起见还是检查）
	exists, err := tableExists("disciplines")
	if err != nil {
		return fmt.Errorf("failed to check if disciplines table exists: %w", err)
	}
	if !exists {
		log.Println("Disciplines table does not exist yet, skipping initialization")
		return nil
	}

	log.Println("Initializing default disciplines...")

	defaultDisciplines := []struct {
		name        string
		description string
	}{
		{"道路工程", "道路工程设计专业"},
		{"桥梁工程", "桥梁工程设计专业"},
		{"隧道工程", "隧道工程设计专业"},
		{"交通工程", "交通工程设计专业"},
		{"给排水工程", "给排水工程设计专业"},
		{"电气工程", "电气工程设计专业"},
		{"景观工程", "景观工程设计专业"},
		{"岩土工程", "岩土工程设计专业"},
		{"工程经济", "工程经济专业"},
		{"工程测量", "工程测量专业"},
	}

	for _, d := range defaultDisciplines {
		// GORM会自动将?占位符转换为PostgreSQL的$1, $2格式
		if err := DB.Exec(`
			INSERT INTO disciplines (name, description, is_active, created_at, updated_at)
			VALUES ($1, $2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
			ON CONFLICT (name) DO NOTHING
		`, d.name, d.description).Error; err != nil {
			log.Printf("Warning: Failed to insert discipline %s: %v", d.name, err)
		}
	}

	log.Println("Default disciplines initialized")
	return nil
}

// migrateBiddingInfoToArray 迁移bidding_info表从单文件字段到数组字段
func migrateBiddingInfoToArray() error {
	// 首次部署时，如果bidding_info表不存在，跳过迁移（AutoMigrate会创建表）
	exists, err := tableExists("bidding_info")
	if err != nil {
		return fmt.Errorf("failed to check if bidding_info table exists: %w", err)
	}
	if !exists {
		log.Println("Bidding_info table does not exist yet, skipping migration (will be handled by AutoMigrate)")
		return nil
	}

	// 检查数组字段是否已存在
	hasArrayFields, err := columnExists("bidding_info", "tender_file_ids")
	if err != nil {
		return fmt.Errorf("failed to check bidding_info array fields: %w", err)
	}

	// 如果数组字段已存在，跳过迁移
	if hasArrayFields {
		log.Println("Bidding info array fields already exist, skipping migration")
		return nil
	}

	// 检查单文件字段是否存在
	hasSingleFields, err := columnExists("bidding_info", "tender_file_id")
	if err != nil {
		return fmt.Errorf("failed to check bidding_info single fields: %w", err)
	}

	// 如果单文件字段不存在，说明表还没有创建或已经迁移过，跳过
	if !hasSingleFields {
		log.Println("Bidding info single fields do not exist, skipping migration")
		return nil
	}

	log.Println("Migrating bidding_info from single file fields to array fields...")

	// Step 1: 添加新的数组列
	if err := DB.Exec(`
		ALTER TABLE bidding_info 
		ADD COLUMN IF NOT EXISTS tender_file_ids TEXT[],
		ADD COLUMN IF NOT EXISTS bid_file_ids TEXT[],
		ADD COLUMN IF NOT EXISTS award_notice_file_ids TEXT[]
	`).Error; err != nil {
		return fmt.Errorf("failed to add array columns: %w", err)
	}

	// Step 2: 迁移现有数据
	if err := DB.Exec(`
		UPDATE bidding_info 
		SET tender_file_ids = CASE 
			WHEN tender_file_id IS NOT NULL THEN ARRAY[tender_file_id::TEXT]
			ELSE ARRAY[]::TEXT[]
		END,
		bid_file_ids = CASE 
			WHEN bid_file_id IS NOT NULL THEN ARRAY[bid_file_id::TEXT]
			ELSE ARRAY[]::TEXT[]
		END,
		award_notice_file_ids = CASE 
			WHEN award_notice_file_id IS NOT NULL THEN ARRAY[award_notice_file_id::TEXT]
			ELSE ARRAY[]::TEXT[]
		END
		WHERE tender_file_ids IS NULL OR bid_file_ids IS NULL OR award_notice_file_ids IS NULL
	`).Error; err != nil {
		return fmt.Errorf("failed to migrate data: %w", err)
	}

	// Step 3: 删除旧的外键约束
	DB.Exec(`ALTER TABLE bidding_info DROP CONSTRAINT IF EXISTS fk_bidding_info_tender_file`)
	DB.Exec(`ALTER TABLE bidding_info DROP CONSTRAINT IF EXISTS fk_bidding_info_bid_file`)
	DB.Exec(`ALTER TABLE bidding_info DROP CONSTRAINT IF EXISTS fk_bidding_info_award_notice_file`)

	// Step 4: 删除旧的索引
	DB.Exec(`DROP INDEX IF EXISTS idx_bidding_info_tender_file_id`)
	DB.Exec(`DROP INDEX IF EXISTS idx_bidding_info_bid_file_id`)
	DB.Exec(`DROP INDEX IF EXISTS idx_bidding_info_award_notice_file_id`)

	// Step 5: 删除旧的列
	if err := DB.Exec(`
		ALTER TABLE bidding_info 
		DROP COLUMN IF EXISTS tender_file_id,
		DROP COLUMN IF EXISTS bid_file_id,
		DROP COLUMN IF EXISTS award_notice_file_id
	`).Error; err != nil {
		return fmt.Errorf("failed to drop old columns: %w", err)
	}

	// Step 6: 添加注释
	DB.Exec(`COMMENT ON COLUMN bidding_info.tender_file_ids IS '招标文件ID数组，支持多个文件'`)
	DB.Exec(`COMMENT ON COLUMN bidding_info.bid_file_ids IS '投标文件ID数组，支持多个文件'`)
	DB.Exec(`COMMENT ON COLUMN bidding_info.award_notice_file_ids IS '中标通知书文件ID数组，支持多个文件'`)

	log.Println("Bidding info array migration completed")
	return nil
}

// dropContractTypeColumn 移除合同表中的contract_type列（002规范中已移除该字段）
func dropContractTypeColumn() error {
	// 首次部署时，如果contracts表不存在，跳过迁移
	exists, err := tableExists("contracts")
	if err != nil {
		return fmt.Errorf("failed to check if contracts table exists: %w", err)
	}
	if !exists {
		log.Println("Contracts table does not exist yet, skipping contract_type column drop")
		return nil
	}

	// 检查contract_type列是否存在
	columnExists, err := columnExists("contracts", "contract_type")
	if err != nil {
		return fmt.Errorf("failed to check contract_type column: %w", err)
	}

	// 如果contract_type列不存在，跳过删除操作
	if !columnExists {
		log.Println("contract_type column does not exist, skipping drop")
		return nil
	}

	// Step 1: 移除NOT NULL约束（如果存在）
	// 先检查是否有NOT NULL约束
	var hasNotNull bool
	err = DB.Raw(`
		SELECT EXISTS (
			SELECT 1 
			FROM information_schema.columns 
			WHERE table_schema = CURRENT_SCHEMA() 
			AND table_name = 'contracts' 
			AND column_name = 'contract_type'
			AND is_nullable = 'NO'
		)
	`).Scan(&hasNotNull).Error

	if err != nil {
		log.Printf("Warning: Failed to check NOT NULL constraint: %v", err)
	} else if hasNotNull {
		// 移除NOT NULL约束
		if err := DB.Exec(`ALTER TABLE contracts ALTER COLUMN contract_type DROP NOT NULL`).Error; err != nil {
			log.Printf("Warning: Failed to drop NOT NULL constraint (may not exist): %v", err)
		}
	}

	// Step 2: 删除contract_type列
	if err := DB.Exec(`ALTER TABLE contracts DROP COLUMN IF EXISTS contract_type`).Error; err != nil {
		return fmt.Errorf("failed to drop contract_type column: %w", err)
	}

	log.Println("contract_type column dropped successfully")
	return nil
}

// RunVersionedMigrations 执行版本化 SQL 迁移（golang-migrate），应在 Migrate() 之后调用。
// 迁移文件位于 migrations/ 目录，命名 000001_xxx.up.sql / .down.sql，支持回滚。
// 使用独立连接执行迁移，避免 m.Close() 关闭全局 DB 导致后续请求报 "database is closed"。
func RunVersionedMigrations(dsn string) error {
	if dsn == "" {
		return fmt.Errorf("DSN required for versioned migrations")
	}
	migrateDB, err := sql.Open("postgres", dsn)
	if err != nil {
		return fmt.Errorf("open migration connection: %w", err)
	}
	defer migrateDB.Close()
	driver, err := migratepostgres.WithInstance(migrateDB, &migratepostgres.Config{})
	if err != nil {
		return fmt.Errorf("create postgres driver: %w", err)
	}
	// 优先使用配置的绝对路径，避免依赖进程 cwd（systemd/Docker 等场景）
	dir := os.Getenv("MIGRATIONS_PATH")
	if dir == "" {
		cwd, _ := filepath.Abs(".")
		dir = filepath.Join(cwd, "migrations")
		if _, err := os.Stat(dir); err != nil {
			dir = filepath.Join(cwd, "backend", "migrations")
		}
	} else {
		dir = filepath.Clean(dir)
	}
	migrationPath := "file://" + dir
	m, err := migrate.NewWithDatabaseInstance(migrationPath, "postgres", driver)
	if err != nil {
		return fmt.Errorf("new migrate instance: %w", err)
	}
	defer m.Close()
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("migrate up: %w", err)
	}
	log.Println("Versioned migrations applied")
	return nil
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
