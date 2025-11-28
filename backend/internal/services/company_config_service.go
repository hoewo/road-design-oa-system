package services

import (
	"errors"
	"strconv"

	"gorm.io/gorm"

	"project-oa-backend/internal/models"
	"project-oa-backend/pkg/database"
)

// CompanyConfigService handles company configuration operations
type CompanyConfigService struct {
	db *gorm.DB
}

// NewCompanyConfigService creates a new company config service
func NewCompanyConfigService() *CompanyConfigService {
	return &CompanyConfigService{
		db: database.DB,
	}
}

// GetConfig retrieves a configuration value by key
func (s *CompanyConfigService) GetConfig(key string) (*models.CompanyConfig, error) {
	var config models.CompanyConfig
	if err := s.db.Where("config_key = ?", key).First(&config).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // Config not found, return nil
		}
		return nil, err
	}
	return &config, nil
}

// GetDefaultManagementFeeRatio retrieves the default management fee ratio
// Returns the ratio as a float64 (0-1 range, e.g., 0.15 for 15%)
// Returns 0.0 if not set
func (s *CompanyConfigService) GetDefaultManagementFeeRatio() (float64, error) {
	config, err := s.GetConfig(models.ConfigKeyDefaultManagementFeeRatio)
	if err != nil {
		return 0.0, err
	}
	if config == nil {
		return 0.0, nil // Default to 0 if not configured
	}

	// Parse the config value as float64
	ratio, err := strconv.ParseFloat(config.ConfigValue, 64)
	if err != nil {
		return 0.0, errors.New("invalid management fee ratio format")
	}

	// Validate range (0-1)
	if ratio < 0 || ratio > 1 {
		return 0.0, errors.New("management fee ratio must be between 0 and 1")
	}

	return ratio, nil
}

// SetConfig creates or updates a configuration value
func (s *CompanyConfigService) SetConfig(key, value, description string, createdByID uint) (*models.CompanyConfig, error) {
	// Validate key
	if key == "" {
		return nil, errors.New("config key cannot be empty")
	}

	// Validate value
	if value == "" {
		return nil, errors.New("config value cannot be empty")
	}

	// For management fee ratio, validate the value
	if key == models.ConfigKeyDefaultManagementFeeRatio {
		ratio, err := strconv.ParseFloat(value, 64)
		if err != nil {
			return nil, errors.New("invalid management fee ratio format")
		}
		if ratio < 0 || ratio > 1 {
			return nil, errors.New("management fee ratio must be between 0 and 1")
		}
	}

	var config models.CompanyConfig
	err := s.db.Where("config_key = ?", key).First(&config).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		// Create new config
		config = models.CompanyConfig{
			ConfigKey:   key,
			ConfigValue: value,
			Description: description,
			CreatedByID: createdByID,
		}
		if err := s.db.Create(&config).Error; err != nil {
			return nil, err
		}
	} else if err != nil {
		return nil, err
	} else {
		// Update existing config
		config.ConfigValue = value
		if description != "" {
			config.Description = description
		}
		if err := s.db.Save(&config).Error; err != nil {
			return nil, err
		}
	}

	// Load the created_by relationship
	if err := s.db.Preload("CreatedBy").First(&config, config.ID).Error; err != nil {
		return nil, err
	}

	return &config, nil
}

// SetDefaultManagementFeeRatio sets the default management fee ratio
// ratio should be between 0 and 1 (e.g., 0.15 for 15%)
func (s *CompanyConfigService) SetDefaultManagementFeeRatio(ratio float64, description string, createdByID uint) (*models.CompanyConfig, error) {
	// Validate ratio
	if ratio < 0 || ratio > 1 {
		return nil, errors.New("management fee ratio must be between 0 and 1")
	}

	value := strconv.FormatFloat(ratio, 'f', -1, 64)
	if description == "" {
		description = "默认管理费比例"
	}

	return s.SetConfig(models.ConfigKeyDefaultManagementFeeRatio, value, description, createdByID)
}

// GetAllConfigs retrieves all configuration entries
func (s *CompanyConfigService) GetAllConfigs() ([]models.CompanyConfig, error) {
	var configs []models.CompanyConfig
	if err := s.db.Preload("CreatedBy").Find(&configs).Error; err != nil {
		return nil, err
	}
	return configs, nil
}
