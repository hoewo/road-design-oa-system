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
	db *gorm.DB
}

func NewProductionFileService() *ProductionFileService {
	return &ProductionFileService{db: database.DB}
}

type CreateProductionFileRequest struct {
	ProjectID              uint
	FileID                 uint
	FileType               models.ProductionFileType
	Description            string
	ReviewSheetFileID      *uint
	Score                  *int
	DefaultAmountReference string
	CreatedByID            uint
}

func (s *ProductionFileService) CreateProductionFile(req *CreateProductionFileRequest) (*models.ProductionFile, error) {
	if req == nil {
		return nil, errors.New("request cannot be nil")
	}
	if req.ProjectID == 0 || req.FileID == 0 {
		return nil, errors.New("project_id and file_id are required")
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

	if err := s.validateProductionFileType(req.FileType, req.Score, req.ReviewSheetFileID); err != nil {
		return nil, err
	}

	file := &models.ProductionFile{
		ProjectID:              req.ProjectID,
		FileID:                 req.FileID,
		FileType:               req.FileType,
		Description:            req.Description,
		ReviewSheetFileID:      req.ReviewSheetFileID,
		Score:                  req.Score,
		DefaultAmountReference: req.DefaultAmountReference,
		CreatedByID:            req.CreatedByID,
	}

	if err := s.db.Create(file).Error; err != nil {
		return nil, err
	}

	s.db.Preload("File").Preload("ReviewSheetFile").Preload("CreatedBy").First(file, file.ID)
	return file, nil
}

type ListProductionFilesParams struct {
	FileType *models.ProductionFileType
	Start    *time.Time
	End      *time.Time
	Keyword  string
	Page     int
	Size     int
}

func (s *ProductionFileService) ListProductionFiles(projectID uint, params *ListProductionFilesParams) ([]models.ProductionFile, int64, error) {
	query := s.db.Model(&models.ProductionFile{}).Where("project_id = ?", projectID)

	if params != nil {
		if params.FileType != nil {
			query = query.Where("file_type = ?", *params.FileType)
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

func (s *ProductionFileService) validateProductionFileType(fileType models.ProductionFileType, score *int, reviewSheetID *uint) error {
	mandatoryTypes := map[models.ProductionFileType]struct{}{
		models.ProductionFileScheme:       {},
		models.ProductionFilePreliminary:  {},
		models.ProductionFileConstruction: {},
	}

	if _, ok := mandatoryTypes[fileType]; ok {
		if reviewSheetID == nil {
			return errors.New("该文件类型必须提供校审单")
		}
		if score == nil {
			return errors.New("该文件类型必须填写评分")
		}
	}
	return nil
}

func (s *ProductionFileService) ensureProjectExists(projectID uint) error {
	var project models.Project
	if err := s.db.Select("id").First(&project, projectID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("project not found")
		}
		return err
	}
	return nil
}

func (s *ProductionFileService) ensureFileBelongsToProject(fileID uint, projectID uint) error {
	var file models.File
	if err := s.db.First(&file, fileID).Error; err != nil {
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
