package config

import (
	"os"
	"strconv"
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
	RegisterHost  string // 服务注册地址（告诉网关如何访问此服务，Docker同网络可用容器名）
	RegisterPort  int    // 服务注册端口（告诉网关如何访问此服务）
	APIBaseURL    string // 客户端访问地址（开发：localhost:8080，生产：网关地址）

	// Server
	ListenHost         string // 服务器监听地址（容器内绑定地址，通常为 0.0.0.0）
	ListenPort         int    // 服务器监听端口（容器内监听端口）
	CORSAllowedOrigins string

	// Log
	LogLevel  string
	LogFormat string
}

// StorageBucketName 返回当前存储类型对应的 bucket 名，避免 OSS 时误用 MinIO bucket
func (c *Config) StorageBucketName() string {
	if c.StorageType == "oss" {
		return c.OSSBucketName
	}
	return c.MinIOBucketName
}

// Load 从环境变量加载配置
// 配置来源：
//   - Docker 环境：通过 docker-compose.yml 的 environment 设置
//   - 本地开发：通过 shell 脚本（start.sh）设置环境变量
//   注意：代码不直接加载 .env 文件，由 shell 脚本负责加载
func Load() *Config {
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
		RegisterHost:  getEnv("SERVICE_HOST", ""), // Docker同网络可用容器名（如 backend），外部访问需设置服务器IP
		RegisterPort:  getEnvAsInt("SERVICE_PORT", 8082), // 通常与 SERVER_PORT 相同
		APIBaseURL:    getEnv("API_BASE_URL", "http://localhost:8080"), // 客户端访问地址

		// Server
		ListenHost:         getEnv("SERVER_HOST", "0.0.0.0"), // 容器内绑定地址
		ListenPort:         getEnvAsInt("SERVER_PORT", 8082), // 容器内监听端口
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
