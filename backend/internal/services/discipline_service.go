package services

import (
	"errors"
	"gorm.io/gorm"

	"project-oa-backend/internal/models"
	"project-oa-backend/pkg/database"
)

// DisciplineService 专业字典服务
type DisciplineService struct {
	db *gorm.DB
}

// NewDisciplineService 创建专业字典服务
func NewDisciplineService() *DisciplineService {
	return &DisciplineService{
		db: database.DB,
	}
}

// ListDisciplines 获取专业列表
func (s *DisciplineService) ListDisciplines(includeInactive bool) ([]models.Discipline, error) {
	var disciplines []models.Discipline
	query := s.db.Model(&models.Discipline{})

	if !includeInactive {
		query = query.Where("is_active = ?", true)
	}

	if err := query.Order("name ASC").Find(&disciplines).Error; err != nil {
		return nil, err
	}
	return disciplines, nil
}

// GetDiscipline 获取专业详情
func (s *DisciplineService) GetDiscipline(id string) (*models.Discipline, error) {
	var discipline models.Discipline
	if err := s.db.First(&discipline, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("discipline not found")
		}
		return nil, err
	}
	return &discipline, nil
}

// CreateDiscipline 创建专业
func (s *DisciplineService) CreateDiscipline(name string, description string) (*models.Discipline, error) {
	// 检查名称是否已存在
	var existing models.Discipline
	if err := s.db.Where("name = ?", name).First(&existing).Error; err == nil {
		return nil, errors.New("discipline name already exists")
	}

	discipline := &models.Discipline{
		Name:        name,
		Description: description,
		IsActive:    true,
	}

	if err := s.db.Create(discipline).Error; err != nil {
		return nil, err
	}

	return discipline, nil
}

// UpdateDiscipline 更新专业
func (s *DisciplineService) UpdateDiscipline(id string, name *string, description *string, isActive *bool) (*models.Discipline, error) {
	var discipline models.Discipline
	if err := s.db.First(&discipline, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("discipline not found")
		}
		return nil, err
	}

	if name != nil {
		// 检查新名称是否已被其他专业使用
		var existing models.Discipline
		if err := s.db.Where("name = ? AND id != ?", *name, id).First(&existing).Error; err == nil {
			return nil, errors.New("discipline name already exists")
		}
		discipline.Name = *name
	}

	if description != nil {
		discipline.Description = *description
	}

	if isActive != nil {
		discipline.IsActive = *isActive
	}

	if err := s.db.Save(&discipline).Error; err != nil {
		return nil, err
	}

	return &discipline, nil
}

// DeleteDiscipline 删除专业（软删除，设置为非激活）
func (s *DisciplineService) DeleteDiscipline(id string) error {
	var discipline models.Discipline
	if err := s.db.First(&discipline, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("discipline not found")
		}
		return err
	}

	discipline.IsActive = false
	if err := s.db.Save(&discipline).Error; err != nil {
		return err
	}

	return nil
}
