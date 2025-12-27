package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"project-oa-backend/internal/middleware"
	"project-oa-backend/internal/models"
	"project-oa-backend/internal/services"
	"project-oa-backend/pkg/utils"
)

// CompanyConfigHandler handles company configuration HTTP requests
type CompanyConfigHandler struct {
	configService *services.CompanyConfigService
	logger        *zap.Logger
}

// NewCompanyConfigHandler creates a new company config handler
func NewCompanyConfigHandler(logger *zap.Logger) *CompanyConfigHandler {
	return &CompanyConfigHandler{
		configService: services.NewCompanyConfigService(),
		logger:        logger,
	}
}

// GetConfig handles retrieving a configuration value by key
// @Summary Get company configuration
// @Description Get a specific company configuration value by key
// @Tags 公司配置
// @Security BearerAuth
// @Produce json
// @Param key path string true "Configuration key"
// @Success 200 {object} models.CompanyConfig
// @Failure 404 {object} utils.ErrorResponse
// @Router /company-config/{key} [get]
func (h *CompanyConfigHandler) GetConfig(c *gin.Context) {
	key := c.Param("key")
	if key == "" {
		utils.HandleError(c, http.StatusBadRequest, "Configuration key is required", nil)
		return
	}

	config, err := h.configService.GetConfig(key)
	if err != nil {
		h.logger.Error("Failed to get configuration",
			zap.String("key", key),
			zap.Error(err))
		utils.HandleError(c, http.StatusInternalServerError, "Failed to get configuration", err)
		return
	}

	if config == nil {
		utils.HandleError(c, http.StatusNotFound, "Configuration not found", nil)
		return
	}

	c.JSON(http.StatusOK, config)
}

// GetAllConfigs handles retrieving all configuration entries
// @Summary Get all company configurations
// @Description Get all company configuration entries
// @Tags 公司配置
// @Security BearerAuth
// @Produce json
// @Success 200 {array} models.CompanyConfig
// @Router /company-config [get]
func (h *CompanyConfigHandler) GetAllConfigs(c *gin.Context) {
	configs, err := h.configService.GetAllConfigs()
	if err != nil {
		h.logger.Error("Failed to get all configurations", zap.Error(err))
		utils.HandleError(c, http.StatusInternalServerError, "Failed to get configurations", err)
		return
	}

	c.JSON(http.StatusOK, configs)
}

// UpdateConfigRequest represents the request to update a configuration
type UpdateConfigRequest struct {
	Value       string `json:"value" binding:"required"`
	Description string `json:"description"`
}

// UpdateConfig handles updating a configuration value
// @Summary Update company configuration
// @Description Update a company configuration value (finance/admin only)
// @Tags 公司配置
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param key path string true "Configuration key"
// @Param request body UpdateConfigRequest true "Update configuration request"
// @Success 200 {object} models.CompanyConfig
// @Failure 400 {object} utils.ErrorResponse
// @Failure 403 {object} utils.ErrorResponse
// @Router /company-config/{key} [put]
func (h *CompanyConfigHandler) UpdateConfig(c *gin.Context) {
	// Check if user has finance or admin role
	role, exists := middleware.GetUserRole(c)
	if !exists {
		utils.HandleError(c, http.StatusUnauthorized, "Authentication required", nil)
		return
	}

	if role != string(models.RoleFinance) && role != string(models.RoleAdmin) {
		utils.HandleError(c, http.StatusForbidden, "Only finance and admin users can update company configuration", nil)
		return
	}

	key := c.Param("key")
	if key == "" {
		utils.HandleError(c, http.StatusBadRequest, "Configuration key is required", nil)
		return
	}

	var req UpdateConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// Get user ID from context
	userID, exists := middleware.GetUserID(c)
	if !exists {
		utils.HandleError(c, http.StatusUnauthorized, "User ID not found in context", nil)
		return
	}

	// Update configuration
	config, err := h.configService.SetConfig(key, req.Value, req.Description, userID)
	if err != nil {
		h.logger.Error("Failed to update configuration",
			zap.String("key", key),
			zap.Error(err))
		utils.HandleError(c, http.StatusInternalServerError, "Failed to update configuration", err)
		return
	}

	c.JSON(http.StatusOK, config)
}

// GetDefaultManagementFeeRatio handles retrieving the default management fee ratio
// @Summary Get default management fee ratio
// @Description Get the company default management fee ratio
// @Tags 公司配置
// @Security BearerAuth
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /company-config/default-management-fee-ratio [get]
func (h *CompanyConfigHandler) GetDefaultManagementFeeRatio(c *gin.Context) {
	ratio, err := h.configService.GetDefaultManagementFeeRatio()
	if err != nil {
		h.logger.Error("Failed to get default management fee ratio", zap.Error(err))
		utils.HandleError(c, http.StatusInternalServerError, "Failed to get default management fee ratio", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"ratio": ratio,
		"key":   models.ConfigKeyDefaultManagementFeeRatio,
	})
}

// UpdateDefaultManagementFeeRatioRequest represents the request to update default management fee ratio
type UpdateDefaultManagementFeeRatioRequest struct {
	Ratio       float64 `json:"ratio" binding:"required"` // Ratio between 0 and 1 (e.g., 0.15 for 15%)
	Description string  `json:"description"`
}

// UpdateDefaultManagementFeeRatio handles updating the default management fee ratio
// @Summary Update default management fee ratio
// @Description Update the company default management fee ratio (finance/admin only)
// @Tags 公司配置
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param request body UpdateDefaultManagementFeeRatioRequest true "Update management fee ratio request"
// @Success 200 {object} models.CompanyConfig
// @Failure 400 {object} utils.ErrorResponse
// @Failure 403 {object} utils.ErrorResponse
// @Router /company-config/default-management-fee-ratio [put]
// T467: 使用权限服务检查权限
func (h *CompanyConfigHandler) UpdateDefaultManagementFeeRatio(c *gin.Context) {
	// Get user ID from context
	userID, exists := middleware.GetUserID(c)
	if !exists {
		utils.HandleError(c, http.StatusUnauthorized, "User ID not found in context", nil)
		return
	}

	// Permission check is now done in the service layer (T467)
	// The service will check CanManageCompanyRevenue permission

	var req UpdateDefaultManagementFeeRatioRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// Update default management fee ratio
	config, err := h.configService.SetDefaultManagementFeeRatio(req.Ratio, req.Description, userID)
	if err != nil {
		if err.Error() == "permission denied: you do not have permission to manage company revenue" {
			utils.HandleError(c, http.StatusForbidden, err.Error(), nil)
			return
		}
		h.logger.Error("Failed to update default management fee ratio", zap.Error(err))
		utils.HandleError(c, http.StatusInternalServerError, "Failed to update default management fee ratio", err)
		return
	}

	c.JSON(http.StatusOK, config)
}
