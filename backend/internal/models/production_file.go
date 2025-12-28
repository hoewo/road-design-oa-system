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

// ToFileCategory converts ProductionFileType to FileCategory
func (pft ProductionFileType) ToFileCategory() FileCategory {
	switch pft {
	case ProductionFileScheme:
		return FileCategorySchemePPT
	case ProductionFilePreliminary:
		return FileCategoryPreliminary
	case ProductionFileConstruction:
		return FileCategoryConstruction
	case ProductionFileVariation:
		return FileCategoryVariation
	case ProductionFileCompletion:
		return FileCategoryCompletion
	case ProductionFileAudit:
		return FileCategoryAuditReport
	default:
		// For "other" or unknown types, use audit_report as default
		return FileCategoryAuditReport
	}
}

// ProductionStage 生产阶段枚举
type ProductionStage string

const (
	StageScheme        ProductionStage = "scheme"         // 方案
	StagePreliminary   ProductionStage = "preliminary"    // 初步设计
	StageConstruction  ProductionStage = "construction"   // 施工图设计
	StageChange        ProductionStage = "change"         // 变更洽商
	StageCompletion    ProductionStage = "completion"     // 竣工验收
)

// ProductionFile stores metadata for production stage files while the actual blob lives in FileService.
type ProductionFile struct {
	ID                     string             `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	ProjectID              string             `json:"project_id" gorm:"type:uuid;not null;index"`
	FileID                 string             `json:"file_id" gorm:"type:uuid;not null"`
	File                   File               `json:"file" gorm:"foreignKey:FileID"`
	FileType               ProductionFileType `json:"file_type" gorm:"size:64;not null"`
	Stage                  ProductionStage    `json:"stage" gorm:"size:64;not null"` // 阶段：scheme/preliminary/construction/change/completion
	Description            string             `json:"description" gorm:"type:text"`
	ReviewSheetFileID      *string            `json:"review_sheet_file_id" gorm:"type:uuid"`
	ReviewSheetFile        *File              `json:"review_sheet_file" gorm:"foreignKey:ReviewSheetFileID"`
	Score                  *float64           `json:"score"` // 评分：0-100
	DefaultAmountReference string             `json:"default_amount_reference"`
	CreatedByID            string             `json:"created_by_id" gorm:"type:uuid;not null"`
	CreatedBy              User               `json:"created_by" gorm:"foreignKey:CreatedByID"`
	CreatedAt              time.Time          `json:"created_at"`
	UpdatedAt              time.Time          `json:"updated_at"`
}
