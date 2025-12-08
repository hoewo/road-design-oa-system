package storage

import (
	"fmt"
	"log"

	"project-oa-backend/internal/config"
)

// SetGlobalStorage 设置全局存储实例（用于向后兼容）
func SetGlobalStorage(s Storage) {
	globalStorage = s
	// 如果是MinIO存储，同时设置MinioClient
	if minioStorage, ok := s.(*MinIOStorage); ok {
		MinioClient = minioStorage.client
	}
}

// InitStorage 根据配置初始化存储（MinIO或OSS）
func InitStorage(cfg *config.Config) (Storage, error) {
	switch cfg.StorageType {
	case "minio":
		log.Println("Initializing MinIO storage...")
		return NewMinIOStorage(cfg)
	case "oss":
		log.Println("Initializing OSS storage...")
		return NewOSSStorage(cfg)
	default:
		return nil, fmt.Errorf("unsupported storage type: %s (supported: minio, oss)", cfg.StorageType)
	}
}
