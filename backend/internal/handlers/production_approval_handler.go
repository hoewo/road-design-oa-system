package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"project-oa-backend/internal/middleware"
	"project-oa-backend/internal/models"
	"project-oa-backend/internal/services"
	"project-oa-backend/pkg/utils"
)

type ProductionApprovalHandler struct {
	service *services.ProductionApprovalService
	logger  *zap.Logger
}

func NewProductionApprovalHandler(logger *zap.Logger) *ProductionApprovalHandler {
	return &ProductionApprovalHandler{
		service: services.NewProductionApprovalService(),
		logger:  logger,
	}
}

func (h *ProductionApprovalHandler) ListApprovals(c *gin.Context) {
	projectID, err := utils.ParseUintParam(c.Param("id"))
	if err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid project ID", err)
		return
	}

	params := &services.ListApprovalsParams{
		Status: c.Query("status"),
		Page:   parseQueryInt(c, "page", 1),
		Size:   parseQueryInt(c, "size", 20),
	}
	if recordType := c.Query("recordType"); recordType != "" {
		t := models.ProductionApprovalType(recordType)
		params.Type = &t
	}

	records, total, err := h.service.ListApprovals(projectID, params)
	if err != nil {
		utils.HandleError(c, http.StatusInternalServerError, "获取审批记录失败", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    records,
		"total":   total,
		"page":    params.Page,
		"size":    params.Size,
	})
}

func (h *ProductionApprovalHandler) CreateApproval(c *gin.Context) {
	projectID, err := utils.ParseUintParam(c.Param("id"))
	if err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid project ID", err)
		return
	}

	var payload struct {
		RecordType             string  `json:"record_type" binding:"required"`
		ApproverID             uint    `json:"approver_id" binding:"required"`
		Status                 string  `json:"status" binding:"required"`
		SignedAt               *string `json:"signed_at"`
		AttachmentFileID       *uint   `json:"attachment_file_id"`
		Remarks                string  `json:"remarks"`
		ReportType             string  `json:"report_type" binding:"required"`
		ReportFileID           *uint   `json:"report_file_id"`
		AmountDesign           float64 `json:"amount_design"`
		AmountSurvey           float64 `json:"amount_survey"`
		AmountConsultation     float64 `json:"amount_consultation"`
		SourceContractID       *uint   `json:"source_contract_id"`
		DefaultAmountReference string  `json:"default_amount_reference"`
		OverrideReason         string  `json:"override_reason"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	userID, ok := c.Get(string(middleware.UserIDKey))
	if !ok {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}
	creator := userID.(uint)

	var signedAt *time.Time
	if payload.SignedAt != nil && *payload.SignedAt != "" {
		if parsed, err := time.Parse(time.RFC3339, *payload.SignedAt); err == nil {
			signedAt = &parsed
		}
	}

	record, err := h.service.CreateApproval(&services.CreateProductionApprovalRequest{
		ProjectID:              projectID,
		RecordType:             models.ProductionApprovalType(payload.RecordType),
		ApproverID:             payload.ApproverID,
		Status:                 payload.Status,
		SignedAt:               signedAt,
		AttachmentFileID:       payload.AttachmentFileID,
		Remarks:                payload.Remarks,
		ReportType:             models.AuditReportType(payload.ReportType),
		ReportFileID:           payload.ReportFileID,
		AmountDesign:           payload.AmountDesign,
		AmountSurvey:           payload.AmountSurvey,
		AmountConsultation:     payload.AmountConsultation,
		SourceContractID:       payload.SourceContractID,
		DefaultAmountReference: payload.DefaultAmountReference,
		OverrideReason:         payload.OverrideReason,
		CreatedByID:            creator,
	})
	if err != nil {
		utils.HandleError(c, http.StatusBadRequest, "创建审批记录失败", err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    record,
	})
}
