package models

import (
	"time"
)

type BonusType string

const (
	BonusTypeBusiness   BonusType = "business"   // 经营奖金
	BonusTypeProduction BonusType = "production" // 生产奖金
)

type Bonus struct {
	ID          string    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	BonusType   BonusType `json:"bonus_type" gorm:"not null"`
	Amount      float64   `json:"amount" gorm:"not null"`
	Description string    `json:"description"`

	// 关联关系
	ProjectID string  `json:"project_id" gorm:"type:uuid;not null"`
	Project   Project `json:"project" gorm:"foreignKey:ProjectID"`

	UserID string `json:"user_id" gorm:"type:uuid;not null"`
	User   User   `json:"user" gorm:"foreignKey:UserID"`

	CreatedByID string `json:"created_by_id" gorm:"type:uuid;not null"`
	CreatedBy   User   `json:"created_by" gorm:"foreignKey:CreatedByID"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName returns the table name for the Bonus model
func (Bonus) TableName() string {
	return "bonuses"
}
