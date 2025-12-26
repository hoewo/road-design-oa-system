package services

import (
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"

	"project-oa-backend/internal/models"
	"project-oa-backend/pkg/database"
)

type ProductionFileService struct {
	db                *gorm.DB
	permissionService *PermissionService
}

func NewProductionFileService() *ProductionFileService {
	return &ProductionFileService{
		db:                database.DB,
		permissionService: NewPermissionService(),
	}
}

type CreateProductionFileRequest struct {
	ProjectID              string                    // UUID string
	FileID                 string                    // UUID string
	FileType               models.ProductionFileType  // 文件类型（保留用于兼容）
	Stage                  models.ProductionStage     // 生产阶段：scheme/preliminary/construction/change/completion
	Description            string
	ReviewSheetFileID      *string  // UUID string
	Score                  *float64 // 评分：0-100
	DefaultAmountReference string
	CreatedByID            string // UUID string
}

func (s *ProductionFileService) CreateProductionFile(req *CreateProductionFileRequest) (*models.ProductionFile, error) {
	if req == nil {
		return nil, errors.New("request cannot be nil")
	}
	if req.ProjectID == "" || req.FileID == "" {
		return nil, errors.New("project_id and file_id are required")
	}

	// 权限检查：只有生产负责人和项目管理员可以管理生产信息
	canManage, err := s.permissionService.CanManageProductionInfo(req.CreatedByID, req.ProjectID)
	if err != nil {
		return nil, fmt.Errorf("权限检查失败: %w", err)
	}
	if !canManage {
		return nil, errors.New("无权限管理项目生产信息")
	}

	if err := s.ensureProjectExists(req.ProjectID); err != nil {
		return nil, err
	}

	if err := s.ensureFileBelongsToProject(req.FileID, req.ProjectID); err != nil {
		return nil, err
	}

	if req.ReviewSheetFileID != nil {
		if err := s.ensureFileBelongsToProject(*req.ReviewSheetFileID, req.ProjectID); err != nil {
			return nil, fmt.Errorf("校审单文件无效: %w", err)
		}
	}

	// 验证生产阶段：如果创建的是主文件记录（ReviewSheetFileID == nil），
	// 需要检查该阶段是否已有校审单记录；如果已有，则允许不提供校审单
	if err := s.validateProductionStage(req.ProjectID, req.Stage, req.Score, req.ReviewSheetFileID); err != nil {
		return nil, err
	}

	file := &models.ProductionFile{
		ProjectID:              req.ProjectID,
		FileID:                 req.FileID,
		FileType:               req.FileType,
		Stage:                  req.Stage,
		Description:            req.Description,
		ReviewSheetFileID:      req.ReviewSheetFileID,
		Score:                  req.Score,
		DefaultAmountReference: req.DefaultAmountReference,
		CreatedByID:            req.CreatedByID,
	}

	if err := s.db.Create(file).Error; err != nil {
		return nil, err
	}

	s.db.Preload("File").Preload("ReviewSheetFile").Preload("CreatedBy").First(file, "id = ?", file.ID)
	return file, nil
}

type ListProductionFilesParams struct {
	FileType *models.ProductionFileType
	Stage    *models.ProductionStage // 按阶段筛选
	Start    *time.Time
	End      *time.Time
	Keyword  string
	Page     int
	Size     int
}

func (s *ProductionFileService) ListProductionFiles(projectID string, params *ListProductionFilesParams) ([]models.ProductionFile, int64, error) {
	query := s.db.Model(&models.ProductionFile{}).Where("project_id = ?", projectID)

	if params != nil {
		if params.FileType != nil {
			query = query.Where("file_type = ?", *params.FileType)
		}
		if params.Stage != nil {
			query = query.Where("stage = ?", *params.Stage)
		}
		if params.Start != nil {
			query = query.Where("created_at >= ?", params.Start)
		}
		if params.End != nil {
			query = query.Where("created_at <= ?", params.End)
		}
		if params.Keyword != "" {
			keyword := fmt.Sprintf("%%%s%%", params.Keyword)
			query = query.Where("description ILIKE ? OR default_amount_reference ILIKE ?", keyword, keyword)
		}
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	page := 1
	size := 20
	if params != nil {
		if params.Page > 0 {
			page = params.Page
		}
		if params.Size > 0 && params.Size <= 100 {
			size = params.Size
		}
	}

	var files []models.ProductionFile
	if err := query.
		Preload("File").
		Preload("ReviewSheetFile").
		Preload("CreatedBy").
		Order("created_at DESC").
		Offset((page - 1) * size).
		Limit(size).
		Find(&files).Error; err != nil {
		return nil, 0, err
	}

	return files, total, nil
}

// validateProductionStage 验证生产阶段：方案、初步设计、施工图设计阶段必须提供校审单和评分
// 如果创建的是主文件记录（reviewSheetID == nil），且该阶段已有校审单记录，则允许不提供校审单
func (s *ProductionFileService) validateProductionStage(projectID string, stage models.ProductionStage, score *float64, reviewSheetID *string) error {
	mandatoryStages := map[models.ProductionStage]struct{}{
		models.StageScheme:       {},
		models.StagePreliminary:   {},
		models.StageConstruction:  {},
	}

	if _, ok := mandatoryStages[stage]; ok {
		// 如果创建的是主文件记录（reviewSheetID == nil），检查该阶段是否已有校审单记录
		if reviewSheetID == nil {
			var existingReviewSheet models.ProductionFile
			err := s.db.Where("project_id = ? AND stage = ? AND review_sheet_file_id IS NOT NULL", projectID, stage).
				First(&existingReviewSheet).Error
			if err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					// 该阶段没有校审单记录，必须提供校审单
			return errors.New("该阶段必须提供校审单")
				}
				return fmt.Errorf("检查校审单记录失败: %w", err)
			}
			// 该阶段已有校审单记录，允许创建主文件记录时不提供校审单
		}
		
		// 评分验证：如果创建的是校审单记录（reviewSheetID != nil），必须提供评分
		// 如果创建的是主文件记录，评分是可选的（评分通常在校审单记录中）
		if reviewSheetID != nil {
		if score == nil {
			return errors.New("该阶段必须填写评分")
		}
		if *score < 0 || *score > 100 {
			return errors.New("评分必须在0-100之间")
			}
		} else if score != nil {
			// 主文件记录也可以有评分，如果提供了则验证范围
			if *score < 0 || *score > 100 {
				return errors.New("评分必须在0-100之间")
			}
		}
	}
	return nil
}

// GetProductionFilesByStage 按阶段获取生产文件
func (s *ProductionFileService) GetProductionFilesByStage(projectID string, stage models.ProductionStage) ([]models.ProductionFile, error) {
	var files []models.ProductionFile
	if err := s.db.Where("project_id = ? AND stage = ?", projectID, stage).
		Preload("File").
		Preload("ReviewSheetFile").
		Preload("CreatedBy").
		Order("created_at DESC").
		Find(&files).Error; err != nil {
		return nil, err
	}
	return files, nil
}

// GetProductionFileStageInfo 获取指定阶段的信息（包含所有文件、校审单、评分）
func (s *ProductionFileService) GetProductionFileStageInfo(projectID string, stage models.ProductionStage) (*StageFileInfo, error) {
	files, err := s.GetProductionFilesByStage(projectID, stage)
	if err != nil {
		return nil, err
	}

	// 分离主文件和校审单
	mainFiles := make([]models.ProductionFile, 0) // 初始化为空数组，避免返回 null
	var reviewSheetFile *models.ProductionFile
	var score *float64

	for i := range files {
		if files[i].ReviewSheetFileID != nil {
			// 这是校审单文件
			reviewSheetFile = &files[i]
			if files[i].Score != nil {
				score = files[i].Score
			}
		} else {
			// 这是主文件
			mainFiles = append(mainFiles, files[i])
			// 如果主文件有评分，也记录（通常评分应该在校审单记录中）
			if files[i].Score != nil && score == nil {
				score = files[i].Score
			}
		}
	}

	return &StageFileInfo{
		Stage:          stage,
		MainFiles:      mainFiles,
		ReviewSheet:    reviewSheetFile,
		Score:          score,
	}, nil
}

// StageFileInfo 阶段文件信息
type StageFileInfo struct {
	Stage       models.ProductionStage `json:"stage"`
	MainFiles   []models.ProductionFile `json:"main_files"`
	ReviewSheet *models.ProductionFile `json:"review_sheet"`
	Score       *float64 `json:"score"`
}

// UpdateProductionFile 更新生产文件
func (s *ProductionFileService) UpdateProductionFile(fileID string, userID string, req *UpdateProductionFileRequest) (*models.ProductionFile, error) {
	var file models.ProductionFile
	if err := s.db.First(&file, "id = ?", fileID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("production file not found")
		}
		return nil, err
	}

	// 权限检查：只有生产负责人和项目管理员可以管理生产信息
	canManage, err := s.permissionService.CanManageProductionInfo(userID, file.ProjectID)
	if err != nil {
		return nil, fmt.Errorf("权限检查失败: %w", err)
	}
	if !canManage {
		return nil, errors.New("无权限管理项目生产信息")
	}

	// 如果更新了阶段、评分或校审单，需要重新验证
	if req.Stage != nil || req.Score != nil || req.ReviewSheetFileID != nil {
		stage := file.Stage
		if req.Stage != nil {
			stage = *req.Stage
		}
		score := file.Score
		if req.Score != nil {
			score = req.Score
		}
		reviewSheetID := file.ReviewSheetFileID
		if req.ReviewSheetFileID != nil {
			reviewSheetID = req.ReviewSheetFileID
		}

		if err := s.validateProductionStage(file.ProjectID, stage, score, reviewSheetID); err != nil {
			return nil, err
		}
	}

	// 更新字段
	if req.Stage != nil {
		file.Stage = *req.Stage
	}
	if req.FileID != nil {
		file.FileID = *req.FileID
	}
	if req.Description != nil {
		file.Description = *req.Description
	}
	if req.ReviewSheetFileID != nil {
		file.ReviewSheetFileID = req.ReviewSheetFileID
	}
	if req.Score != nil {
		file.Score = req.Score
	}
	if req.DefaultAmountReference != nil {
		file.DefaultAmountReference = *req.DefaultAmountReference
	}

	if err := s.db.Save(&file).Error; err != nil {
		return nil, err
	}

	s.db.Preload("File").Preload("ReviewSheetFile").Preload("CreatedBy").First(&file, "id = ?", file.ID)
	return &file, nil
}

type UpdateProductionFileRequest struct {
	Stage                  *models.ProductionStage
	FileID                 *string
	Description            *string
	ReviewSheetFileID      *string
	Score                  *float64
	DefaultAmountReference *string
}

// UpdateStageScore 更新阶段评分
func (s *ProductionFileService) UpdateStageScore(projectID string, userID string, stage models.ProductionStage, score float64) error {
	// 权限检查：只有生产负责人和项目管理员可以管理生产信息
	canManage, err := s.permissionService.CanManageProductionInfo(userID, projectID)
	if err != nil {
		return fmt.Errorf("权限检查失败: %w", err)
	}
	if !canManage {
		return errors.New("无权限管理项目生产信息")
	}

	if score < 0 || score > 100 {
		return errors.New("评分必须在0-100之间")
	}

	// 查找该阶段的记录（通常评分存储在校审单记录中）
	var file models.ProductionFile
	if err := s.db.Where("project_id = ? AND stage = ? AND review_sheet_file_id IS NOT NULL", projectID, stage).
		First(&file).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("该阶段未找到校审单记录，请先上传校审单")
		}
		return err
	}

	file.Score = &score
	if err := s.db.Save(&file).Error; err != nil {
		return err
	}

	return nil
}

// DeleteProductionFile 删除生产文件
func (s *ProductionFileService) DeleteProductionFile(fileID string, userID string) error {
	var file models.ProductionFile
	if err := s.db.First(&file, "id = ?", fileID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("production file not found")
		}
		return err
	}

	// 权限检查：只有生产负责人和项目管理员可以管理生产信息
	canManage, err := s.permissionService.CanManageProductionInfo(userID, file.ProjectID)
	if err != nil {
		return fmt.Errorf("权限检查失败: %w", err)
	}
	if !canManage {
		return errors.New("无权限管理项目生产信息")
	}

	if err := s.db.Delete(&file).Error; err != nil {
		return err
	}

	return nil
}

func (s *ProductionFileService) ensureProjectExists(projectID string) error {
	var project models.Project
	if err := s.db.Select("id").First(&project, "id = ?", projectID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("project not found")
		}
		return err
	}
	return nil
}

func (s *ProductionFileService) ensureFileBelongsToProject(fileID string, projectID string) error {
	var file models.File
	if err := s.db.First(&file, "id = ?", fileID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("file not found")
		}
		return err
	}
	if file.ProjectID != projectID {
		return errors.New("file does not belong to project")
	}
	return nil
}
