package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"project-oa-backend/internal/config"
)

// ServiceRegistry 服务注册服务
type ServiceRegistry struct {
	config *config.Config
	client *http.Client
}

// NewServiceRegistry 创建服务注册服务
func NewServiceRegistry(cfg *config.Config) *ServiceRegistry {
	return &ServiceRegistry{
		config: cfg,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// RegisterServiceRequest 服务注册请求
type RegisterServiceRequest struct {
	ServiceName string `json:"service_name"`
	ServiceURL  string `json:"service_url"`
	Description string `json:"description"`
	Version     string `json:"version"`
}

// RegisterService 注册服务到NebulaAuth网关
func (s *ServiceRegistry) RegisterService(adminToken string) error {
	if s.config.NebulaAuthURL == "" {
		return fmt.Errorf("NEBULA_AUTH_URL is not configured")
	}

	serviceURL := fmt.Sprintf("http://%s:%d", s.config.ServiceHost, s.config.ServicePort)
	if s.config.ServiceHost == "" {
		serviceURL = fmt.Sprintf("http://localhost:%d", s.config.ServicePort)
	}

	reqBody := RegisterServiceRequest{
		ServiceName: s.config.ServiceName,
		ServiceURL:  serviceURL,
		Description: "道路设计公司项目管理系统",
		Version:     "v1",
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	url := s.config.NebulaAuthURL + "/service-registry/v1/admin/services"
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+adminToken)

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to call service registry API: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		// 如果服务已存在，尝试更新
		if resp.StatusCode == http.StatusConflict {
			return s.UpdateService(adminToken)
		}
		return fmt.Errorf("service registry API returned status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}

// UpdateService 更新服务信息
func (s *ServiceRegistry) UpdateService(adminToken string) error {
	if s.config.NebulaAuthURL == "" {
		return fmt.Errorf("NEBULA_AUTH_URL is not configured")
	}

	serviceURL := fmt.Sprintf("http://%s:%d", s.config.ServiceHost, s.config.ServicePort)
	if s.config.ServiceHost == "" {
		serviceURL = fmt.Sprintf("http://localhost:%d", s.config.ServicePort)
	}

	reqBody := RegisterServiceRequest{
		ServiceName: s.config.ServiceName,
		ServiceURL:  serviceURL,
		Description: "道路设计公司项目管理系统",
		Version:     "v1",
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	url := fmt.Sprintf("%s/service-registry/v1/admin/services/%s", s.config.NebulaAuthURL, s.config.ServiceName)
	req, err := http.NewRequest("PUT", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+adminToken)

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to call service registry API: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("service registry API returned status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}
