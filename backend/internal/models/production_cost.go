package models

import "time"

type ProductionCostType string

const (
	ProductionCostTravel        ProductionCostType = "travel"
	ProductionCostAccommodation ProductionCostType = "accommodation"
	ProductionCostVehicle       ProductionCostType = "vehicle"
	ProductionCostLabor         ProductionCostType = "labor"
	ProductionCostMaterial      ProductionCostType = "material"
	ProductionCostOther         ProductionCostType = "other"
)

type ProductionCost struct {
	ID           uint                `json:"id" gorm:"primaryKey"`
	ProjectID    uint                `json:"project_id" gorm:"not null;index"`
	CostType     ProductionCostType  `json:"cost_type" gorm:"size:32;not null"`
	Amount       float64             `json:"amount" gorm:"not null"`
	Description  string              `json:"description" gorm:"type:text"`
	IncurredAt   *time.Time          `json:"incurred_at"`
	CommissionID *uint               `json:"commission_id"`
	Commission   *ExternalCommission `json:"commission" gorm:"foreignKey:CommissionID"`
	CreatedByID  uint                `json:"created_by_id" gorm:"not null"`
	CreatedBy    User                `json:"created_by" gorm:"foreignKey:CreatedByID"`
	CreatedAt    time.Time           `json:"created_at"`
	UpdatedAt    time.Time           `json:"updated_at"`
}
