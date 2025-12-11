package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	// Database
	DBHost     string
	DBPort     int
	DBName     string
	DBUser     string
	DBPassword string
	DBSSLMode  string
	DBType     string // "postgresql" or "rds"

	// JWT
	JWTSecret      string
	JWTExpireHours int

	// Storage
	StorageType string // "minio" or "oss"

	// MinIO
	MinIOEndpoint   string
	MinIOAccessKey  string
	MinIOSecretKey  string
	MinIOBucketName string
	MinIOUseSSL     bool

	// OSS (Aliyun)
	OSSEndpoint        string
	OSSAccessKeyID     string
	OSSAccessKeySecret string
	OSSBucketName      string

	// Authentication
	AuthMode      string // "self_validate" or "gateway"
	NebulaAuthURL string // NebulaAuth服务地址（self_validate模式使用）
	ServiceName   string // 服务名称（project-oa）
	ServicePort   int    // 服务端口
	ServiceHost   string // 云端服务器IP（生产环境用于服务注册）
	APIBaseURL    string // 客户端访问地址（开发：localhost:8080，生产：网关地址）

	// Server
	ServerPort         int
	ServerHost         string
	CORSAllowedOrigins string

	// Log
	LogLevel  string
	LogFormat string
}

func Load() *Config {
	// 加载 .env 配置文件
	if err := godotenv.Load(".env"); err != nil {
		log.Printf("Warning: .env not found, using environment variables only")
	}

	config := &Config{
		// Database
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnvAsInt("DB_PORT", 5432),
		DBName:     getEnv("DB_NAME", "project_oa"),
		DBUser:     getEnv("DB_USER", "project_oa_user"),
		DBPassword: getEnv("DB_PASSWORD", "project_oa_password"),
		DBSSLMode:  getEnv("DB_SSL_MODE", "disable"),
		DBType:     getEnv("DB_TYPE", "postgresql"), // "postgresql" or "rds"

		// JWT
		JWTSecret:      getEnv("JWT_SECRET", "your_jwt_secret_key_here"),
		JWTExpireHours: getEnvAsInt("JWT_EXPIRE_HOURS", 24),

		// Storage
		StorageType: getEnv("STORAGE_TYPE", "minio"), // "minio" or "oss"

		// MinIO
		MinIOEndpoint:   getEnv("MINIO_ENDPOINT", "localhost:9000"),
		MinIOAccessKey:  getEnv("MINIO_ACCESS_KEY", "minioadmin"),
		MinIOSecretKey:  getEnv("MINIO_SECRET_KEY", "minioadmin"),
		MinIOBucketName: getEnv("MINIO_BUCKET_NAME", "project-files"),
		MinIOUseSSL:     getEnvAsBool("MINIO_USE_SSL", false),

		// OSS (Aliyun)
		OSSEndpoint:        getEnv("OSS_ENDPOINT", ""),
		OSSAccessKeyID:     getEnv("OSS_ACCESS_KEY_ID", ""),
		OSSAccessKeySecret: getEnv("OSS_ACCESS_KEY_SECRET", ""),
		OSSBucketName:      getEnv("OSS_BUCKET_NAME", ""),

		// Authentication
		AuthMode:      getEnv("AUTH_MODE", "self_validate"), // "self_validate" or "gateway"
		NebulaAuthURL: getEnv("NEBULA_AUTH_URL", "http://localhost:8080"),
		ServiceName:   getEnv("SERVICE_NAME", "project-oa"),
		ServicePort:   getEnvAsInt("SERVICE_PORT", 8080),
		ServiceHost:   getEnv("SERVICE_HOST", ""), // 生产环境需要设置
		APIBaseURL:    getEnv("API_BASE_URL", "http://localhost:8080"), // 客户端访问地址

		// Server
		ServerPort:         getEnvAsInt("SERVER_PORT", 8080),
		ServerHost:         getEnv("SERVER_HOST", "0.0.0.0"),
		CORSAllowedOrigins: getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000"),

		// Log
		LogLevel:  getEnv("LOG_LEVEL", "info"),
		LogFormat: getEnv("LOG_FORMAT", "json"),
	}

	return config
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getEnvAsBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultValue
}
