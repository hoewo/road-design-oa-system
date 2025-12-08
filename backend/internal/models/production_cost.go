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
	ID           string              `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	ProjectID    string              `json:"project_id" gorm:"type:uuid;not null;index"`
	CostType     ProductionCostType  `json:"cost_type" gorm:"size:32;not null"`
	Amount       float64             `json:"amount" gorm:"not null"`
	Description  string              `json:"description" gorm:"type:text"`
	IncurredAt   *time.Time          `json:"incurred_at"`
	CommissionID *string             `json:"commission_id" gorm:"type:uuid"`
	Commission   *ExternalCommission `json:"commission" gorm:"foreignKey:CommissionID"`
	CreatedByID  string              `json:"created_by_id" gorm:"type:uuid;not null"`
	CreatedBy    User                `json:"created_by" gorm:"foreignKey:CreatedByID"`
	CreatedAt    time.Time           `json:"created_at"`
	UpdatedAt    time.Time           `json:"updated_at"`
}
