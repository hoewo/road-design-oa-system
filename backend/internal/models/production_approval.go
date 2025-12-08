package models

import "time"

type ProductionApprovalType string

const (
	ProductionApprovalReview   ProductionApprovalType = "review"
	ProductionApprovalApproval ProductionApprovalType = "approval"
)

// ProductionApprovalRecord represents review/approval timeline entries.
type ProductionApprovalRecord struct {
	ID               string                 `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	ProjectID        string                 `json:"project_id" gorm:"type:uuid;not null;index"`
	RecordType       ProductionApprovalType `json:"record_type" gorm:"size:32;not null"`
	ApproverID       string                 `json:"approver_id" gorm:"type:uuid;not null"`
	Approver         User                   `json:"approver" gorm:"foreignKey:ApproverID"`
	Status           string                 `json:"status" gorm:"size:32;not null"`
	SignedAt         *time.Time             `json:"signed_at"`
	AttachmentFileID *string                `json:"attachment_file_id" gorm:"type:uuid"`
	AttachmentFile   *File                  `json:"attachment_file" gorm:"foreignKey:AttachmentFileID"`
	Remarks          string                 `json:"remarks" gorm:"type:text"`
	CreatedByID      string                 `json:"created_by_id" gorm:"type:uuid;not null"`
	CreatedBy        User                   `json:"created_by" gorm:"foreignKey:CreatedByID"`
	CreatedAt        time.Time              `json:"created_at"`
	UpdatedAt        time.Time              `json:"updated_at"`
	AuditResolution  *AuditResolution       `json:"audit_resolution,omitempty" gorm:"foreignKey:ApprovalRecordID"`
}

type AuditReportType string

const (
	AuditReportApproval AuditReportType = "approval"
	AuditReportAudit    AuditReportType = "audit"
)

// AuditResolution captures breakdown for approval/audit amounts.
type AuditResolution struct {
	ID                     string                    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	ProjectID              string                    `json:"project_id" gorm:"type:uuid;not null;index"`
	ApprovalRecordID       string                    `json:"approval_record_id" gorm:"type:uuid;not null;uniqueIndex"`
	ApprovalRecord         *ProductionApprovalRecord `json:"-" gorm:"foreignKey:ApprovalRecordID"`
	ReportType             AuditReportType           `json:"report_type" gorm:"size:32;not null"`
	ReportFileID           *string                   `json:"report_file_id" gorm:"type:uuid"`
	ReportFile             *File                     `json:"report_file" gorm:"foreignKey:ReportFileID"`
	AmountDesign           float64                   `json:"amount_design"`
	AmountSurvey           float64                   `json:"amount_survey"`
	AmountConsultation     float64                   `json:"amount_consultation"`
	SourceContractID       *string                   `json:"source_contract_id" gorm:"type:uuid"`
	DefaultAmountReference string                    `json:"default_amount_reference"`
	OverrideReason         string                    `json:"override_reason" gorm:"type:text"`
	CreatedByID            string                    `json:"created_by_id" gorm:"type:uuid;not null"`
	CreatedBy              User                      `json:"created_by" gorm:"foreignKey:CreatedByID"`
	CreatedAt              time.Time                 `json:"created_at"`
	UpdatedAt              time.Time                 `json:"updated_at"`
}
