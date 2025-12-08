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
	ID                 string        `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	ProjectName        string        `json:"project_name" gorm:"not null"`
	ProjectNumber      string        `json:"project_number" gorm:"uniqueIndex;not null"`
	StartDate          *time.Time    `json:"start_date"`
	ProjectOverview    string        `json:"project_overview" gorm:"type:text"`
	DrawingUnit        string        `json:"drawing_unit"`
	Status             ProjectStatus `json:"status" gorm:"default:'planning'"`
	ManagementFeeRatio *float64      `json:"management_fee_ratio"` // 管理费比例（可选，NULL表示使用公司默认值）

	// 负责人字段
	BusinessManagerID   *string `json:"business_manager_id"` // 经营负责人ID
	BusinessManager     *User   `json:"business_manager,omitempty" gorm:"foreignKey:BusinessManagerID"`
	ProductionManagerID *string `json:"production_manager_id"` // 生产负责人ID
	ProductionManager   *User   `json:"production_manager,omitempty" gorm:"foreignKey:ProductionManagerID"`

	// 关联关系
	ClientID *string `json:"client_id"`
	Client   *Client `json:"client,omitempty" gorm:"foreignKey:ClientID"`

	ManagerID *string `json:"manager_id"` // 保留向后兼容
	Manager   *User   `json:"manager,omitempty" gorm:"foreignKey:ManagerID"`

	// 关联数据
	ProjectContact    *ProjectContact    `json:"project_contact,omitempty" gorm:"foreignKey:ProjectID"` // 项目联系人（一对一）
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
