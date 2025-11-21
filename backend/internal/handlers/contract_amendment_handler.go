package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"project-oa-backend/internal/services"
	"project-oa-backend/pkg/utils"
)

// ContractAmendmentHandler handles contract amendment-related HTTP requests
type ContractAmendmentHandler struct {
	amendmentService *services.ContractAmendmentService
	logger           *zap.Logger
}

// NewContractAmendmentHandler creates a new contract amendment handler
func NewContractAmendmentHandler(logger *zap.Logger) *ContractAmendmentHandler {
	return &ContractAmendmentHandler{
		amendmentService: services.NewContractAmendmentService(),
		logger:           logger,
	}
}

// GetContractAmendments handles retrieving all amendments for a contract
// @Summary Get contract amendments
// @Description Get all amendments for a specific contract
// @Tags 合同管理
// @Security BearerAuth
// @Produce json
// @Param id path int true "Contract ID"
// @Success 200 {array} models.ContractAmendment
// @Failure 404 {object} utils.ErrorResponse
// @Router /contracts/{id}/amendments [get]
func (h *ContractAmendmentHandler) GetContractAmendments(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid contract ID", err)
		return
	}

	amendments, err := h.amendmentService.ListContractAmendments(uint(id))
	if err != nil {
		h.logger.Error("Failed to get contract amendments",
			zap.Error(err),
			zap.Uint("contract_id", uint(id)),
		)
		utils.HandleError(c, http.StatusInternalServerError, "Failed to get contract amendments", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    amendments,
	})
}

// CreateContractAmendment handles contract amendment creation
// @Summary Create a new contract amendment
// @Description Create a new amendment for a contract
// @Tags 合同管理
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param id path int true "Contract ID"
// @Param request body services.CreateContractAmendmentRequest true "Amendment information"
// @Success 201 {object} models.ContractAmendment
// @Failure 400 {object} utils.ErrorResponse
// @Failure 404 {object} utils.ErrorResponse
// @Router /contracts/{id}/amendments [post]
func (h *ContractAmendmentHandler) CreateContractAmendment(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid contract ID", err)
		return
	}

	var req services.CreateContractAmendmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	amendment, err := h.amendmentService.CreateContractAmendment(uint(id), &req)
	if err != nil {
		h.logger.Error("Failed to create contract amendment",
			zap.Error(err),
			zap.Uint("contract_id", uint(id)),
		)
		if err.Error() == "contract not found" {
			utils.HandleError(c, http.StatusNotFound, "Failed to create contract amendment", err)
		} else {
			utils.HandleError(c, http.StatusBadRequest, "Failed to create contract amendment", err)
		}
		return
	}

	h.logger.Info("Contract amendment created successfully",
		zap.Uint("amendment_id", amendment.ID),
		zap.Uint("contract_id", uint(id)),
	)

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    amendment,
	})
}

// GetContractAmendment handles retrieving a single contract amendment
// @Summary Get contract amendment by ID
// @Description Get detailed information about a specific contract amendment
// @Tags 合同管理
// @Security BearerAuth
// @Produce json
// @Param id path int true "Amendment ID"
// @Success 200 {object} models.ContractAmendment
// @Failure 404 {object} utils.ErrorResponse
// @Router /contract-amendments/{id} [get]
func (h *ContractAmendmentHandler) GetContractAmendment(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid amendment ID", err)
		return
	}

	amendment, err := h.amendmentService.GetContractAmendment(uint(id))
	if err != nil {
		h.logger.Error("Failed to get contract amendment",
			zap.Error(err),
			zap.Uint("amendment_id", uint(id)),
		)
		utils.HandleError(c, http.StatusNotFound, "Failed to get contract amendment", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    amendment,
	})
}

// UpdateContractAmendment handles contract amendment updates
// @Summary Update a contract amendment
// @Description Update an existing contract amendment
// @Tags 合同管理
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param id path int true "Amendment ID"
// @Param request body services.UpdateContractAmendmentRequest true "Amendment information"
// @Success 200 {object} models.ContractAmendment
// @Failure 400 {object} utils.ErrorResponse
// @Failure 404 {object} utils.ErrorResponse
// @Router /contract-amendments/{id} [put]
func (h *ContractAmendmentHandler) UpdateContractAmendment(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid amendment ID", err)
		return
	}

	var req services.UpdateContractAmendmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	amendment, err := h.amendmentService.UpdateContractAmendment(uint(id), &req)
	if err != nil {
		h.logger.Error("Failed to update contract amendment",
			zap.Error(err),
			zap.Uint("amendment_id", uint(id)),
		)
		if err.Error() == "contract amendment not found" {
			utils.HandleError(c, http.StatusNotFound, "Failed to update contract amendment", err)
		} else {
			utils.HandleError(c, http.StatusBadRequest, "Failed to update contract amendment", err)
		}
		return
	}

	h.logger.Info("Contract amendment updated successfully",
		zap.Uint("amendment_id", uint(id)),
	)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    amendment,
	})
}

// DeleteContractAmendment handles contract amendment deletion
// @Summary Delete a contract amendment
// @Description Delete an existing contract amendment
// @Tags 合同管理
// @Security BearerAuth
// @Param id path int true "Amendment ID"
// @Success 204 "No Content"
// @Failure 404 {object} utils.ErrorResponse
// @Router /contract-amendments/{id} [delete]
func (h *ContractAmendmentHandler) DeleteContractAmendment(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid amendment ID", err)
		return
	}

	if err := h.amendmentService.DeleteContractAmendment(uint(id)); err != nil {
		h.logger.Error("Failed to delete contract amendment",
			zap.Error(err),
			zap.Uint("amendment_id", uint(id)),
		)
		if err.Error() == "contract amendment not found" {
			utils.HandleError(c, http.StatusNotFound, "Failed to delete contract amendment", err)
		} else {
			utils.HandleError(c, http.StatusBadRequest, "Failed to delete contract amendment", err)
		}
		return
	}

	h.logger.Info("Contract amendment deleted successfully",
		zap.Uint("amendment_id", uint(id)),
	)

	c.Status(http.StatusNoContent)
}
