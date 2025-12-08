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
	ID                     string             `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	ProjectID              string             `json:"project_id" gorm:"type:uuid;not null;index"`
	FileID                 string             `json:"file_id" gorm:"type:uuid;not null"`
	File                   File               `json:"file" gorm:"foreignKey:FileID"`
	FileType               ProductionFileType `json:"file_type" gorm:"size:64;not null"`
	Stage                  string             `json:"stage" gorm:"size:64"` // 阶段：scheme/preliminary/construction/change/completion
	Description            string             `json:"description" gorm:"type:text"`
	ReviewSheetFileID      *string            `json:"review_sheet_file_id" gorm:"type:uuid"`
	ReviewSheetFile        *File              `json:"review_sheet_file" gorm:"foreignKey:ReviewSheetFileID"`
	Score                  *int               `json:"score"`
	DefaultAmountReference string             `json:"default_amount_reference"`
	CreatedByID            string             `json:"created_by_id" gorm:"type:uuid;not null"`
	CreatedBy              User               `json:"created_by" gorm:"foreignKey:CreatedByID"`
	CreatedAt              time.Time          `json:"created_at"`
	UpdatedAt              time.Time          `json:"updated_at"`
}
