package models

import (
	"time"
)

// FinancialType 财务类型
type FinancialType string

const (
	FinancialTypeBonus             FinancialType = "bonus"              // 奖金
	FinancialTypeCost              FinancialType = "cost"               // 成本
	FinancialTypeClientPayment     FinancialType = "client_payment"     // 甲方支付
	FinancialTypeOurInvoice        FinancialType = "our_invoice"        // 我方开票
	FinancialTypeExpertFee         FinancialType = "expert_fee"         // 专家费
	FinancialTypeCommissionPayment FinancialType = "commission_payment" // 委托支付
	FinancialTypeVendorInvoice     FinancialType = "vendor_invoice"     // 对方开票
)

// FinancialDirection 财务方向
type FinancialDirection string

const (
	FinancialDirectionIncome  FinancialDirection = "income"  // 收入
	FinancialDirectionExpense FinancialDirection = "expense" // 支出
)

// BonusCategory 奖金类别
type BonusCategory string

const (
	BonusCategoryBusiness   BonusCategory = "business"   // 经营奖金
	BonusCategoryProduction BonusCategory = "production" // 生产奖金
)

// CostCategory 成本类别
type CostCategory string

const (
	CostCategoryTaxi            CostCategory = "taxi"             // 打车
	CostCategoryAccommodation   CostCategory = "accommodation"    // 住宿
	CostCategoryPublicTransport CostCategory = "public_transport" // 公共交通
)

type FinancialRecord struct {
	ID        string  `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	ProjectID string  `json:"project_id" gorm:"type:uuid;not null"`
	Project   Project `json:"project" gorm:"foreignKey:ProjectID"`

	FinancialType FinancialType      `json:"financial_type" gorm:"not null"` // 财务类型
	Direction     FinancialDirection `json:"direction" gorm:"not null"`      // 方向：收入/支出
	Amount        float64            `json:"amount" gorm:"not null"`         // 金额
	OccurredAt    time.Time          `json:"occurred_at" gorm:"not null"`    // 发生时间

	// 类型特定字段（根据FinancialType使用不同字段）
	// 奖金类型
	BonusCategory *BonusCategory `json:"bonus_category"`                // 奖金类别：经营奖金/生产奖金
	RecipientID   *string        `json:"recipient_id" gorm:"type:uuid"` // 发放人员ID（奖金类型必填）
	Recipient     *User          `json:"recipient,omitempty" gorm:"foreignKey:RecipientID"`

	// 成本类型
	CostCategory *CostCategory `json:"cost_category"` // 成本类别：打车/住宿/公共交通
	Mileage      *float64      `json:"mileage"`       // 里程（仅打车类型）

	// 甲方支付/我方开票类型
	ClientID         *string          `json:"client_id" gorm:"type:uuid"` // 甲方ID
	Client           *Client          `json:"client,omitempty" gorm:"foreignKey:ClientID"`
	RelatedPaymentID *string          `json:"related_payment_id" gorm:"type:uuid"` // 关联的甲方支付记录ID（我方开票时使用）
	RelatedPayment   *FinancialRecord `json:"related_payment,omitempty" gorm:"foreignKey:RelatedPaymentID"`

	// 专家费类型
	PaymentMethod *string `json:"payment_method"` // 支付方式：cash/transfer
	ExpertName    string  `json:"expert_name"`    // 专家姓名

	// 委托支付/对方开票类型
	CommissionType      *string          `json:"commission_type"`                        // 委托类型：person/company
	VendorName          string           `json:"vendor_name"`                            // 委托方名称
	VendorScore         *float64         `json:"vendor_score"`                           // 委托方评分
	RelatedCommissionID *string          `json:"related_commission_id" gorm:"type:uuid"` // 关联的委托支付记录ID（对方开票时使用）
	RelatedCommission   *FinancialRecord `json:"related_commission,omitempty" gorm:"foreignKey:RelatedCommissionID"`

	// 文件关联（发票文件等）
	InvoiceFileID *string `json:"invoice_file_id" gorm:"type:uuid"`
	InvoiceFile   *File   `json:"invoice_file,omitempty" gorm:"foreignKey:InvoiceFileID"`

	Description string `json:"description" gorm:"type:text"`

	CreatedByID string  `json:"created_by_id" gorm:"type:uuid;not null"`
	CreatedBy   User    `json:"created_by" gorm:"foreignKey:CreatedByID"`
	UpdatedByID *string `json:"updated_by_id" gorm:"type:uuid"`
	UpdatedBy   *User   `json:"updated_by,omitempty" gorm:"foreignKey:UpdatedByID"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName returns the table name for the FinancialRecord model
func (FinancialRecord) TableName() string {
	return "financial_records"
}
