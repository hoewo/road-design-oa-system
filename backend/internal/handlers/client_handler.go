package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"project-oa-backend/internal/services"
	"project-oa-backend/pkg/utils"
)

// ClientHandler handles client-related HTTP requests
type ClientHandler struct {
	clientService *services.ClientService
	logger        *zap.Logger
}

// NewClientHandler creates a new client handler
func NewClientHandler(logger *zap.Logger) *ClientHandler {
	return &ClientHandler{
		clientService: services.NewClientService(),
		logger:        logger,
	}
}

// CreateClient handles client creation
// @Summary Create a new client
// @Description Create a new client with the provided information
// @Tags 甲方管理
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param request body services.CreateClientRequest true "Client information"
// @Success 201 {object} models.Client
// @Failure 400 {object} utils.ErrorResponse
// @Router /clients [post]
func (h *ClientHandler) CreateClient(c *gin.Context) {
	var req services.CreateClientRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	client, err := h.clientService.CreateClient(&req)
	if err != nil {
		h.logger.Error("Failed to create client",
			zap.Error(err),
			zap.String("client_name", req.ClientName),
		)
		// Check if error is due to duplicate client name
		if err.Error() == "甲方名称已存在，请使用已存在的甲方" {
			utils.HandleError(c, http.StatusConflict, "甲方名称已存在，请使用已存在的甲方", err)
			return
		}
		utils.HandleError(c, http.StatusBadRequest, "Failed to create client", err)
		return
	}

	h.logger.Info("Client created successfully",
		zap.String("client_id", client.ID),
		zap.String("client_name", client.ClientName),
	)

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    client,
	})
}

// GetClient handles retrieving a single client
// @Summary Get client by ID
// @Description Get detailed information about a specific client
// @Tags 甲方管理
// @Security BearerAuth
// @Produce json
// @Param id path string true "Client ID (UUID)"
// @Success 200 {object} models.Client
// @Failure 404 {object} utils.ErrorResponse
// @Router /clients/{id} [get]
func (h *ClientHandler) GetClient(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Client ID is required", nil)
		return
	}

	client, err := h.clientService.GetClient(id)
	if err != nil {
		utils.HandleError(c, http.StatusNotFound, "Client not found", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    client,
	})
}

// ListClients handles listing clients with pagination
// @Summary List clients
// @Description Get a paginated list of clients with optional filters
// @Tags 甲方管理
// @Security BearerAuth
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param size query int false "Page size" default(20)
// @Param keyword query string false "Search keyword"
// @Success 200 {object} map[string]interface{}
// @Router /clients [get]
func (h *ClientHandler) ListClients(c *gin.Context) {
	params := &services.ListClientsParams{
		Page:    1,
		Size:    20,
		Keyword: c.Query("keyword"),
	}

	// Parse pagination parameters
	if pageStr := c.Query("page"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil && page > 0 {
			params.Page = page
		}
	}

	if sizeStr := c.Query("size"); sizeStr != "" {
		if size, err := strconv.Atoi(sizeStr); err == nil && size > 0 && size <= 100 {
			params.Size = size
		}
	}

	clients, total, err := h.clientService.ListClients(params)
	if err != nil {
		h.logger.Error("Failed to list clients", zap.Error(err))
		utils.HandleError(c, http.StatusInternalServerError, "Failed to list clients", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    clients,
		"total":   total,
		"page":    params.Page,
		"size":    params.Size,
	})
}

// UpdateClient handles client updates
// @Summary Update client
// @Description Update an existing client
// @Tags 甲方管理
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param id path string true "Client ID (UUID)"
// @Param request body services.UpdateClientRequest true "Client update information"
// @Success 200 {object} models.Client
// @Failure 400 {object} utils.ErrorResponse
// @Failure 404 {object} utils.ErrorResponse
// @Router /clients/{id} [put]
func (h *ClientHandler) UpdateClient(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Client ID is required", nil)
		return
	}

	var req services.UpdateClientRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	client, err := h.clientService.UpdateClient(id, &req)
	if err != nil {
		h.logger.Error("Failed to update client",
			zap.Error(err),
			zap.String("client_id", id),
		)
		// Check if error is due to duplicate client name
		if err.Error() == "甲方名称已存在，请使用已存在的甲方" {
			utils.HandleError(c, http.StatusConflict, "甲方名称已存在，请使用已存在的甲方", err)
			return
		}
		utils.HandleError(c, http.StatusBadRequest, "Failed to update client", err)
		return
	}

	h.logger.Info("Client updated successfully",
		zap.String("client_id", client.ID),
	)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    client,
	})
}

// DeleteClient handles client deletion
// @Summary Delete client
// @Description Delete a client
// @Tags 甲方管理
// @Security BearerAuth
// @Produce json
// @Param id path string true "Client ID (UUID)"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} utils.ErrorResponse
// @Failure 404 {object} utils.ErrorResponse
// @Router /clients/{id} [delete]
func (h *ClientHandler) DeleteClient(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.HandleError(c, http.StatusBadRequest, "Client ID is required", nil)
		return
	}

	if err := h.clientService.DeleteClient(id); err != nil {
		h.logger.Error("Failed to delete client",
			zap.Error(err),
			zap.String("client_id", id),
		)
		utils.HandleError(c, http.StatusBadRequest, "Failed to delete client", err)
		return
	}

	h.logger.Info("Client deleted successfully",
		zap.String("client_id", id),
	)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Client deleted successfully",
	})
}
