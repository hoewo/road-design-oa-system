package database

import (
	"fmt"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"project-oa-backend/internal/config"
)

// ConnectRDS 连接到阿里云RDS（PostgreSQL）
func ConnectRDS(cfg *config.Config) error {
	// RDS使用PostgreSQL驱动，连接字符串格式相同
	dsn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBSSLMode)

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return fmt.Errorf("failed to connect to RDS: %w", err)
	}

	log.Println("RDS (PostgreSQL) connected successfully")
	return nil
}
