package models

import (
	"time"
)

// Discipline 专业字典实体
type Discipline struct {
	ID          string `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Name        string `json:"name" gorm:"uniqueIndex;not null"` // 专业名称
	Description string `json:"description" gorm:"type:text"`     // 专业描述
	IsActive    bool   `json:"is_active" gorm:"default:true"`    // 是否启用

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName returns the table name for the Discipline model
func (Discipline) TableName() string {
	return "disciplines"
}
