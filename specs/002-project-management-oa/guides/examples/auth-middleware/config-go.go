// config/env.go
// 环境配置加载示例
package config

import "os"

type Config struct {
    NodeEnv       string
    AuthMode      string
    NebulaAuthURL string
    APIBaseURL    string
    ServiceName   string
    ServicePort   string
    ServiceHost   string
}

func LoadConfig() *Config {
    return &Config{
        NodeEnv:       getEnv("NODE_ENV", "development"),
        AuthMode:      getEnv("AUTH_MODE", "gateway"),
        NebulaAuthURL: getEnv("NEBULA_AUTH_URL", "http://nebula-auth-server:port"),
        APIBaseURL:    getEnv("API_BASE_URL", "http://business-server:port"),
        ServiceName:   getEnv("SERVICE_NAME", "your-service"),
        ServicePort:   getEnv("SERVICE_PORT", "port"),
        ServiceHost:   getEnv("SERVICE_HOST", "localhost"),
    }
}

func getEnv(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}

