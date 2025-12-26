package handlers

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"project-oa-backend/internal/config"
	"project-oa-backend/internal/middleware"
	"project-oa-backend/internal/models"
	"project-oa-backend/internal/services"
	"project-oa-backend/pkg/utils"
)

type ProductionFileHandler struct {
	productionFileService *services.ProductionFileService
	fileService           *services.FileService
	logger                *zap.Logger
}

func NewProductionFileHandler(cfg *config.Config, logger *zap.Logger) *ProductionFileHandler {
	return &ProductionFileHandler{
		productionFileService: services.NewProductionFileService(),
		fileService:           services.NewFileService(cfg),
		logger:                logger,
	}
}

func (h *ProductionFileHandler) UploadProductionFile(c *gin.Context) {
	projectID := c.Param("id")
	if projectID == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		utils.HandleError(c, http.StatusBadRequest, "主文件缺失", err)
		return
	}

	fileType := models.ProductionFileType(c.PostForm("file_type"))
	if fileType == "" {
		utils.HandleError(c, http.StatusBadRequest, "file_type 必填", nil)
		return
	}

	description := c.PostForm("description")
	defaultAmountReference := c.PostForm("default_amount_reference")

	stageStr := c.PostForm("stage")
	if stageStr == "" {
		utils.HandleError(c, http.StatusBadRequest, "stage 必填", nil)
		return
	}
	stage := models.ProductionStage(stageStr)

	scoreValue, scoreProvided := c.GetPostForm("score")
	var score *float64
	if scoreProvided {
		parsed, err := strconv.ParseFloat(scoreValue, 64)
		if err != nil {
			utils.HandleError(c, http.StatusBadRequest, "score 必须为数字", err)
			return
		}
		score = &parsed
	}

	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		utils.HandleError(c, http.StatusBadRequest, "无法读取上传文件", err)
		return
	}
	defer file.Close()

	ctx := context.Background()
	uploadedFile, err := h.fileService.UploadFile(ctx, &services.UploadFileRequest{
		ProjectID:   projectID,
		Category:    models.FileCategoryProduction,
		Description: description,
		FileName:    fileHeader.Filename,
		FileSize:    fileHeader.Size,
		FileType:    fileHeader.Filename,
		MimeType:    fileHeader.Header.Get("Content-Type"),
		Reader:      file,
	}, userID)
	if err != nil {
		utils.HandleError(c, http.StatusInternalServerError, "上传生产文件失败", err)
		return
	}

	var reviewSheetFileID *string
	// 优先检查是否通过 review_sheet_file_id 引用已存在的校审单文件
	if reviewSheetFileIDStr := c.PostForm("review_sheet_file_id"); reviewSheetFileIDStr != "" {
		reviewSheetFileID = &reviewSheetFileIDStr
	} else if reviewHeader, err := c.FormFile("review_sheet_file"); err == nil {
		// 如果没有提供 review_sheet_file_id，则上传新的校审单文件
		reviewFile, err := reviewHeader.Open()
		if err != nil {
			utils.HandleError(c, http.StatusBadRequest, "无法读取校审单文件", err)
			return
		}
		defer reviewFile.Close()

		reviewUpload, err := h.fileService.UploadFile(ctx, &services.UploadFileRequest{
			ProjectID: projectID,
			Category:  models.FileCategoryProduction,
			FileName:  reviewHeader.Filename,
			FileSize:  reviewHeader.Size,
			FileType:  reviewHeader.Filename,
			MimeType:  reviewHeader.Header.Get("Content-Type"),
			Reader:    reviewFile,
		}, userID)
		if err != nil {
			utils.HandleError(c, http.StatusInternalServerError, "上传校审单失败", err)
			return
		}
		reviewSheetFileID = &reviewUpload.ID
	}

	record, err := h.productionFileService.CreateProductionFile(&services.CreateProductionFileRequest{
		ProjectID:              projectID,
		FileID:                 uploadedFile.ID,
		FileType:               fileType,
		Stage:                  stage,
		Description:            description,
		ReviewSheetFileID:      reviewSheetFileID,
		Score:                  score,
		DefaultAmountReference: defaultAmountReference,
		CreatedByID:            userID,
	})
	if err != nil {
		utils.HandleError(c, http.StatusBadRequest, "生产文件记录失败", err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    record,
	})
}

func (h *ProductionFileHandler) ListProductionFiles(c *gin.Context) {
	projectID := c.Param("id")
	if projectID == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	params := &services.ListProductionFilesParams{
		Keyword: c.Query("keyword"),
		Page:    parseQueryInt(c, "page", 1),
		Size:    parseQueryInt(c, "size", 20),
	}

	if fileType := c.Query("fileType"); fileType != "" {
		ft := models.ProductionFileType(fileType)
		params.FileType = &ft
	}
	if stageStr := c.Query("stage"); stageStr != "" {
		stage := models.ProductionStage(stageStr)
		params.Stage = &stage
	}

	if start := c.Query("startDate"); start != "" {
		if parsed, err := time.Parse("2006-01-02", start); err == nil {
			params.Start = &parsed
		}
	}
	if end := c.Query("endDate"); end != "" {
		if parsed, err := time.Parse("2006-01-02", end); err == nil {
			params.End = &parsed
		}
	}

	files, total, err := h.productionFileService.ListProductionFiles(projectID, params)
	if err != nil {
		utils.HandleError(c, http.StatusInternalServerError, "查询生产文件失败", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    files,
		"total":   total,
		"page":    params.Page,
		"size":    params.Size,
	})
}

func (h *ProductionFileHandler) DownloadProductionFile(c *gin.Context) {
	fileID := c.Param("fileId")
	if fileID == "" {
		utils.HandleError(c, http.StatusBadRequest, "File ID is required", nil)
		return
	}

	ctx := context.Background()
	reader, file, err := h.fileService.GetFileContent(ctx, fileID)
	if err != nil {
		utils.HandleError(c, http.StatusNotFound, "文件不存在", err)
		return
	}
	defer reader.Close()

	c.Header("Content-Disposition", "attachment; filename="+file.OriginalName)
	c.Header("Content-Type", file.MimeType)
	c.Header("Content-Length", strconv.FormatInt(file.FileSize, 10))
	c.DataFromReader(http.StatusOK, file.FileSize, file.MimeType, reader, nil)
}

// GetProductionFilesByStage 按阶段获取生产文件
func (h *ProductionFileHandler) GetProductionFilesByStage(c *gin.Context) {
	projectID := c.Param("id")
	if projectID == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	stageStr := c.Param("stage")
	if stageStr == "" {
		utils.HandleError(c, http.StatusBadRequest, "Stage is required", nil)
		return
	}

	stage := models.ProductionStage(stageStr)
	if !isValidStage(stage) {
		utils.HandleError(c, http.StatusBadRequest, "Invalid stage", nil)
		return
	}

	info, err := h.productionFileService.GetProductionFileStageInfo(projectID, stage)
	if err != nil {
		utils.HandleError(c, http.StatusInternalServerError, "查询阶段文件失败", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    info,
	})
}

// UpdateProductionFile 更新生产文件
func (h *ProductionFileHandler) UpdateProductionFile(c *gin.Context) {
	fileID := c.Param("fileId")
	if fileID == "" {
		utils.HandleError(c, http.StatusBadRequest, "File ID is required", nil)
		return
	}

	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	var req struct {
		Stage             *string  `json:"stage"`
		FileID            *string  `json:"file_id"`
		Description       *string  `json:"description"`
		ReviewSheetFileID *string  `json:"review_sheet_file_id"`
		Score             *float64 `json:"score"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request", err)
		return
	}

	updateReq := &services.UpdateProductionFileRequest{}
	if req.Stage != nil {
		stage := models.ProductionStage(*req.Stage)
		if !isValidStage(stage) {
			utils.HandleError(c, http.StatusBadRequest, "Invalid stage", nil)
			return
		}
		updateReq.Stage = &stage
	}
	if req.FileID != nil {
		updateReq.FileID = req.FileID
	}
	if req.Description != nil {
		updateReq.Description = req.Description
	}
	if req.ReviewSheetFileID != nil {
		updateReq.ReviewSheetFileID = req.ReviewSheetFileID
	}
	if req.Score != nil {
		updateReq.Score = req.Score
	}

	file, err := h.productionFileService.UpdateProductionFile(fileID, userID, updateReq)
	if err != nil {
		utils.HandleError(c, http.StatusBadRequest, "更新生产文件失败", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    file,
	})
}

// DeleteProductionFile 删除生产文件
func (h *ProductionFileHandler) DeleteProductionFile(c *gin.Context) {
	fileID := c.Param("fileId")
	if fileID == "" {
		utils.HandleError(c, http.StatusBadRequest, "File ID is required", nil)
		return
	}

	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	if err := h.productionFileService.DeleteProductionFile(fileID, userID); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "删除生产文件失败", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "删除成功",
	})
}

// UpdateStageScore 更新阶段评分
func (h *ProductionFileHandler) UpdateStageScore(c *gin.Context) {
	projectID := c.Param("id")
	if projectID == "" {
		utils.HandleError(c, http.StatusBadRequest, "Project ID is required", nil)
		return
	}

	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.HandleError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	stageStr := c.Param("stage")
	if stageStr == "" {
		utils.HandleError(c, http.StatusBadRequest, "Stage is required", nil)
		return
	}

	stage := models.ProductionStage(stageStr)
	if !isValidStage(stage) {
		utils.HandleError(c, http.StatusBadRequest, "Invalid stage", nil)
		return
	}

	var req struct {
		Score float64 `json:"score" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "Invalid request", err)
		return
	}

	if err := h.productionFileService.UpdateStageScore(projectID, userID, stage, req.Score); err != nil {
		utils.HandleError(c, http.StatusBadRequest, "更新评分失败", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "更新评分成功",
	})
}

func isValidStage(stage models.ProductionStage) bool {
	validStages := []models.ProductionStage{
		models.StageScheme,
		models.StagePreliminary,
		models.StageConstruction,
		models.StageChange,
		models.StageCompletion,
	}
	for _, s := range validStages {
		if s == stage {
			return true
		}
	}
	return false
}

func parseQueryInt(c *gin.Context, key string, defaultValue int) int {
	valueStr := c.Query(key)
	if valueStr == "" {
		return defaultValue
	}
	value, err := strconv.Atoi(valueStr)
	if err != nil || value <= 0 {
		return defaultValue
	}
	return value
}
