package models

import "time"

type ProductionFileType string

const (
	ProductionFileScheme       ProductionFileType = "scheme_ppt"
	ProductionFilePreliminary  ProductionFileType = "preliminary_design"
	ProductionFileConstruction ProductionFileType = "construction_drawing"
	ProductionFileVariation    ProductionFileType = "variation_order"
	ProductionFileCompletion   ProductionFileType = "completion_report"
	ProductionFileAudit        ProductionFileType = "audit_report"
	ProductionFileOther        ProductionFileType = "other"
)

// ProductionFile stores metadata for production stage files while the actual blob lives in FileService.
type ProductionFile struct {
	ID                     uint               `json:"id" gorm:"primaryKey"`
	ProjectID              uint               `json:"project_id" gorm:"not null;index"`
	FileID                 uint               `json:"file_id" gorm:"not null"`
	File                   File               `json:"file" gorm:"foreignKey:FileID"`
	FileType               ProductionFileType `json:"file_type" gorm:"size:64;not null"`
	Description            string             `json:"description" gorm:"type:text"`
	ReviewSheetFileID      *uint              `json:"review_sheet_file_id"`
	ReviewSheetFile        *File              `json:"review_sheet_file" gorm:"foreignKey:ReviewSheetFileID"`
	Score                  *int               `json:"score"`
	DefaultAmountReference string             `json:"default_amount_reference"`
	CreatedByID            uint               `json:"created_by_id" gorm:"not null"`
	CreatedBy              User               `json:"created_by" gorm:"foreignKey:CreatedByID"`
	CreatedAt              time.Time          `json:"created_at"`
	UpdatedAt              time.Time          `json:"updated_at"`
}
