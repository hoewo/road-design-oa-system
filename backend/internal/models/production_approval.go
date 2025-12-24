package models

import "time"

// ApprovalType 批复审计类型
type ApprovalType string

const (
	ApprovalTypeApproval ApprovalType = "approval" // 批复
	ApprovalTypeAudit    ApprovalType = "audit"    // 审计
)

// ApprovalStatus 批复审计状态
type ApprovalStatus string

const (
	ApprovalStatusPending  ApprovalStatus = "pending"  // 待审核
	ApprovalStatusApproved ApprovalStatus = "approved" // 已审核
)

// ProductionApproval 批复审计信息实体（符合002规范）
type ProductionApproval struct {
	ID              string         `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	ProjectID       string         `json:"project_id" gorm:"type:uuid;not null;index"`
	Project         Project        `json:"project" gorm:"foreignKey:ProjectID"`

	ApprovalType ApprovalType   `json:"approval_type" gorm:"not null"` // 类型：批复/审计
	ApproverID   *string        `json:"approver_id" gorm:"type:uuid"` // 责任人ID
	Approver     *User          `json:"approver,omitempty" gorm:"foreignKey:ApproverID"`
	Status       ApprovalStatus `json:"status" gorm:"default:'pending'"` // 状态：待审核/已审核
	SignedAt     *time.Time     `json:"signed_at"`                      // 签字/确认时间

	// 批复/审计报告文件
	ReportFileID *string `json:"report_file_id" gorm:"type:uuid"`
	ReportFile   *File   `json:"report_file,omitempty" gorm:"foreignKey:ReportFileID"`

	// 批复/审计金额（按设计费、勘察费、咨询费拆分）
	AmountDesign    float64 `json:"amount_design" gorm:"not null;default:0"`    // 设计费（元）
	AmountSurvey    float64 `json:"amount_survey" gorm:"not null;default:0"`    // 勘察费（元）
	AmountConsulting float64 `json:"amount_consulting" gorm:"not null;default:0"` // 咨询费（元）
	TotalAmount     float64 `json:"total_amount" gorm:"not null"`              // 总金额

	// 金额来源（默认引用合同金额，可覆盖）
	SourceContractID *string   `json:"source_contract_id" gorm:"type:uuid"` // 关联的合同ID
	SourceContract   *Contract `json:"source_contract,omitempty" gorm:"foreignKey:SourceContractID"`
	OverrideReason   string    `json:"override_reason" gorm:"type:text"` // 覆盖原因说明

	Remarks string `json:"remarks" gorm:"type:text"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName 返回表名
func (ProductionApproval) TableName() string {
	return "production_approvals"
}

// 保留旧模型以保持向后兼容（标记为废弃）
// Deprecated: 使用 ProductionApproval 替代
type ProductionApprovalType string

const (
	ProductionApprovalReview   ProductionApprovalType = "review"
	ProductionApprovalApproval ProductionApprovalType = "approval"
)

// ProductionApprovalRecord represents review/approval timeline entries.
// Deprecated: 使用 ProductionApproval 替代
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
// Deprecated: 使用 ProductionApproval 替代
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
