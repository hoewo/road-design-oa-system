package models

import "time"

// ProductionFileVersion 生产阶段文件历史版本（仅变更洽商、竣工验收阶段更新时写入，用于审计与追溯）
type ProductionFileVersion struct {
	ID                     string             `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	ProductionFileID       string             `json:"production_file_id" gorm:"type:uuid;not null;index"`
	ProjectID              string             `json:"project_id" gorm:"type:uuid;not null;index"`
	FileID                 string             `json:"file_id" gorm:"type:uuid;not null"`
	Stage                  ProductionStage    `json:"stage" gorm:"size:64;not null"`
	Description            string             `json:"description" gorm:"type:text"`
	ReviewSheetFileID      *string            `json:"review_sheet_file_id" gorm:"type:uuid"`
	Score                  *float64            `json:"score"`
	DefaultAmountReference string             `json:"default_amount_reference"`
	SupersededAt           time.Time          `json:"superseded_at"`
	SupersededByID         string             `json:"superseded_by_id" gorm:"type:uuid;not null"`
	SupersededBy           User               `json:"superseded_by" gorm:"foreignKey:SupersededByID"`
}

func (ProductionFileVersion) TableName() string {
	return "production_file_versions"
}
