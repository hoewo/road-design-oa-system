package models

import (
	"time"

	"gorm.io/gorm"
)

type ProjectStatus string

const (
	StatusPlanning   ProjectStatus = "planning"   // 规划中
	StatusBidding    ProjectStatus = "bidding"    // 招投标
	StatusContract   ProjectStatus = "contract"   // 合同签订
	StatusProduction ProjectStatus = "production" // 生产中
	StatusCompleted  ProjectStatus = "completed"  // 已完成
	StatusCancelled  ProjectStatus = "cancelled"  // 已取消
)

type Project struct {
	ID              uint          `json:"id" gorm:"primaryKey"`
	ProjectName     string        `json:"project_name" gorm:"not null"`
	ProjectNumber   string        `json:"project_number" gorm:"uniqueIndex;not null"`
	StartDate       *time.Time    `json:"start_date"`
	ProjectOverview string        `json:"project_overview" gorm:"type:text"`
	DrawingUnit     string        `json:"drawing_unit"`
	Status          ProjectStatus `json:"status" gorm:"default:'planning'"`

	// 关联关系
	ClientID *uint   `json:"client_id"`
	Client   *Client `json:"client,omitempty" gorm:"foreignKey:ClientID"`

	ManagerID *uint `json:"manager_id"`
	Manager   *User `json:"manager,omitempty" gorm:"foreignKey:ManagerID"`

	// 关联数据
	Contracts         []Contract         `json:"contracts" gorm:"foreignKey:ProjectID"`
	Members           []ProjectMember    `json:"members" gorm:"foreignKey:ProjectID"`
	Files             []File             `json:"files" gorm:"foreignKey:ProjectID"`
	FinancialRecords  []FinancialRecord  `json:"financial_records" gorm:"foreignKey:ProjectID"`
	Bonuses           []Bonus            `json:"bonuses" gorm:"foreignKey:ProjectID"`
	ExpertFeePayments []ExpertFeePayment `json:"expert_fee_payments" gorm:"foreignKey:ProjectID"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName returns the table name for the Project model
func (Project) TableName() string {
	return "projects"
}

// BeforeCreate hook to set default values
func (p *Project) BeforeCreate(tx *gorm.DB) error {
	if p.Status == "" {
		p.Status = StatusPlanning
	}
	return nil
}
