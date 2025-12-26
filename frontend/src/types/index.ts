// User types
export interface User {
  id: string // UUID string
  username: string
  email: string
  real_name: string
  roles: UserRole[] // 支持多选角色
  role?: UserRole // 向后兼容字段（已废弃，使用roles）
  department?: string
  phone?: string
  is_active: boolean
  has_account?: boolean // 是否有账号
  is_admin?: boolean // NebulaAuth管理员标识
  created_at: string
  updated_at: string
}

export type UserRole =
  | 'admin'
  | 'project_manager'
  | 'business_manager'
  | 'production_manager'
  | 'finance'
  | 'member'

// Project types
export interface Project {
  id: string // UUID string
  project_name: string
  project_number: string
  start_date?: string
  project_overview?: string
  drawing_unit?: string
  status: ProjectStatus
  client_id?: string // UUID string (optional)
  manager_id?: string // UUID string (optional) // 保留向后兼容
  business_manager_id?: string // UUID string (optional) // 经营负责人ID
  production_manager_id?: string // UUID string (optional) // 生产负责人ID
  business_manager?: User // 经营负责人信息
  production_manager?: User // 生产负责人信息
  management_fee_ratio?: number | null // 管理费比例（可选，null表示使用公司默认值）
  created_at: string
  updated_at: string
}

export type ProjectStatus =
  | 'planning'
  | 'bidding'
  | 'contract'
  | 'production'
  | 'completed'
  | 'cancelled'

// Client types
export interface Client {
  id: string // UUID string
  client_name: string
  email?: string
  address?: string
  tax_number?: string
  bank_account?: string
  bank_name?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Project Contact types
export interface ProjectContact {
  id: string // UUID string
  project_id: string // UUID string
  client_id?: string // UUID string (optional)
  client?: Client // 关联的甲方信息
  contact_name: string
  contact_phone?: string
  created_at: string
  updated_at: string
}

// API Response types
export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  size: number
}

// Form types
// Note: client_id is NOT included in CreateProjectRequest as client information is managed separately in project business information module
export interface CreateProjectRequest {
  project_name: string
  project_number: string
  start_date?: string | Date
  project_overview?: string
  drawing_unit?: string
  manager_id?: number
}

export interface UpdateProjectRequest {
  project_name?: string
  start_date?: string
  project_overview?: string
  drawing_unit?: string
  status?: ProjectStatus
  management_fee_ratio?: number | null // 管理费比例（可选，null表示使用公司默认值）
  business_manager_id?: string | null // 经营负责人ID（可选，null表示清除）
  production_manager_id?: string | null // 生产负责人ID（可选，null表示清除）
}

export interface CreateClientRequest {
  client_name: string
  email?: string
  address?: string
  tax_number?: string
  bank_account?: string
  bank_name?: string
}

// Auth types
// 旧的登录请求类型（已废弃，保留用于向后兼容）
export interface LoginRequest {
  username?: string
  password?: string
  // 新的验证码登录字段
  email?: string
  phone?: string
  code?: string
  code_type?: 'email' | 'sms'
  purpose?: 'login' | 'register'
}

// 新的验证码登录请求类型
export interface VerificationCodeLoginRequest {
  email?: string
  phone?: string
  code: string
  code_type: 'email' | 'sms'
  purpose: 'login'
}

// 发送验证码请求类型
export interface SendVerificationRequest {
  code_type: 'email' | 'sms'
  target: string // 邮箱或手机号
  purpose: 'login' | 'register'
}

// 刷新Token请求类型
export interface RefreshTokenRequest {
  refresh_token: string
}

// Token信息
export interface TokenInfo {
  access_token: string
  refresh_token: string
}

// 登录响应类型（基于NebulaAuth）
export interface LoginResponse {
  tokens: TokenInfo
  user: User
}

// 旧的登录响应类型（已废弃，保留用于向后兼容）
export interface LegacyLoginResponse {
  token: string
  user: User
}

// Contract types
export interface Contract {
  id: string // UUID string
  contract_number: string
  sign_date: string
  contract_rate?: number
  contract_amount: number
  design_fee?: number
  survey_fee?: number
  consultation_fee?: number
  file_path?: string
  contract_file_id?: string // UUID string
  contract_file?: File // 合同文件关联
  project_id: string // UUID string
  amendments?: ContractAmendment[]
  created_at: string
  updated_at: string
}

export interface ContractAmendment {
  id: string // UUID string
  amendment_number: string
  sign_date: string
  description?: string
  // 金额明细
  design_fee: number
  survey_fee: number
  consultation_fee: number
  amendment_amount: number // 补充协议总金额
  contract_rate?: number
  // 文件关联
  amendment_file_id?: string // UUID string
  amendment_file?: File
  // 关联关系
  contract_id: string // UUID string
  created_at: string
  updated_at: string
  // 向后兼容字段
  file_path?: string
}

export interface CreateContractRequest {
  // Note: file_path field removed - contract files managed separately through file management functionality
  contract_number: string
  sign_date: string
  contract_rate?: number
  contract_amount: number
  design_fee?: number
  survey_fee?: number
  consultation_fee?: number
  contract_file_id?: string // 合同文件ID
}

export interface CreateContractAmendmentRequest {
  amendment_number: string
  sign_date: string
  // 金额明细
  design_fee?: number
  survey_fee?: number
  consultation_fee?: number
  contract_rate?: number
  // 文件关联
  amendment_file_id?: string // UUID string
  description?: string
  // 向后兼容字段
  file_path?: string
}

// Expert Fee Payment types
export type PaymentMethod = 'cash' | 'transfer'

export interface ExpertFeePayment {
  id: number
  payment_method: PaymentMethod
  amount: number
  expert_name: string
  expert_id?: number
  description?: string
  project_id: number
  created_by_id: number
  created_at: string
  updated_at: string
}

export interface CreateExpertFeePaymentRequest {
  // Note: expert_id field removed - only record expert name
  payment_method: PaymentMethod
  amount: number
  expert_name: string
  description?: string
}

// Project Business types
export interface ProjectBusiness {
  project_id: string // UUID string
  client_id?: string // UUID string
  client?: Client
  project_contact?: ProjectContact // 项目联系人信息
  business_manager_ids: string[] // UUID strings
  business_personnel_ids: string[] // UUID strings
}

// Bidding Info types
export interface BiddingInfo {
  id: string // UUID string
  project_id: string // UUID string
  tender_file_ids?: string[] // UUID string数组，支持多个文件
  tender_files?: File[] // 关联查询的文件详情
  bid_file_ids?: string[] // UUID string数组，支持多个文件
  bid_files?: File[] // 关联查询的文件详情
  award_notice_file_ids?: string[] // UUID string数组，支持多个文件
  award_notice_files?: File[] // 关联查询的文件详情
  created_at: string
  updated_at: string
}

export interface UpdateProjectBusinessRequest {
  client_id?: number | null
  contact_name?: string
  contact_phone?: string
  business_manager_ids?: number[]
  business_personnel_ids?: number[]
}

// Project Member types
export type MemberRole =
  | 'designer'
  | 'participant'
  | 'reviewer'
  | 'auditor'
  | 'approver'
  | 'business_personnel'
  | 'business_personnel'

export interface ProjectMemberUserSummary {
  id: string // UUID string
  username: string
  real_name: string
  role: string
}

export interface DisciplineBrief {
  id: string // UUID string
  name: string // Discipline name
}

export interface ProjectMember {
  id: string // UUID string
  project_id: string // UUID string
  user_id: string // UUID string
  role: MemberRole
  discipline_id?: string // UUID string, for production roles
  discipline?: DisciplineBrief // Discipline info, for production roles
  join_date: string
  leave_date?: string
  is_active: boolean
  created_at: string
  updated_at: string
  user?: ProjectMemberUserSummary
}

export interface CreateProjectMemberRequest {
  user_id: string // UUID string
  role: MemberRole
  discipline_id?: string // UUID string, required for production roles
  join_date: string
  leave_date?: string
  is_active?: boolean
}

export interface UpdateProjectMemberRequest {
  role?: MemberRole
  discipline_id?: string // UUID string, required for production roles
  join_date?: string
  leave_date?: string
  is_active?: boolean
}

// File types
export type FileCategory =
  | 'contract'
  | 'bidding'
  | 'design'
  | 'audit'
  | 'production'
  | 'other'

export interface File {
  id: string // UUID string
  file_name: string
  original_name: string
  file_path: string
  file_size: number
  file_type: string
  mime_type: string
  category: FileCategory
  description?: string
  project_id: string // UUID string
  uploader_id: string // UUID string
  uploader?: User
  created_at: string
  updated_at: string
}

export interface SearchFilesParams {
  projectId?: number
  category?: FileCategory
  fileType?: string
  keyword?: string
  startDate?: string
  endDate?: string
  page?: number
  size?: number
}

export interface SearchFilesResponse {
  data: File[]
  total: number
  page: number
  size: number
}

// Financial Record types
export type FinancialType = 
  | 'receivable' 
  | 'invoice' 
  | 'payment' 
  | 'expense'
  | 'bonus'
  | 'cost'
  | 'client_payment'
  | 'our_invoice'
  | 'expert_fee'
  | 'commission_payment'
  | 'vendor_invoice'
export type FeeType = 'design_fee' | 'survey_fee' | 'consultation_fee'
export type FinancialDirection = 'income' | 'expense'

export interface FinancialRecord {
  id: string // UUID string
  project_id: string // UUID string
  financial_type: FinancialType
  direction: FinancialDirection
  amount: number
  occurred_at: string // ISO date string
  // 奖金类型字段
  bonus_category?: 'business' | 'production'
  recipient_id?: string // UUID string
  recipient?: User
  // 成本类型字段
  cost_category?: 'taxi' | 'accommodation' | 'public_transport'
  mileage?: number
  // 甲方支付/我方开票类型字段
  client_id?: string // UUID string
  client?: Client
  related_payment_id?: string // UUID string
  // 专家费类型字段
  payment_method?: 'cash' | 'transfer'
  expert_name?: string
  // 委托支付/对方开票类型字段
  commission_type?: 'person' | 'company'
  vendor_name?: string
  vendor_score?: number
  related_commission_id?: string // UUID string
  // 文件关联
  invoice_file_id?: string // UUID string
  invoice_file?: File
  // 通用字段
  description?: string
  created_by_id: string // UUID string
  created_by?: User
  updated_by_id?: string // UUID string
  updated_by?: User
  created_at: string
  updated_at: string
  // 向后兼容的旧字段（保留用于兼容）
  record_type?: FinancialType
  fee_type?: FeeType
  receivable_amount?: number
  invoice_number?: string
  invoice_date?: string
  invoice_amount?: number
  payment_date?: string
  payment_amount?: number
  unpaid_amount?: number
}

export interface CreateFinancialRecordRequest {
  financial_type: FinancialType
  direction: FinancialDirection
  amount: number
  occurred_at: string // ISO 8601 date string
  // 奖金类型字段
  bonus_category?: 'business' | 'production'
  recipient_id?: string // UUID string
  // 成本类型字段
  cost_category?: 'taxi' | 'accommodation' | 'public_transport'
  mileage?: number
  // 甲方支付/我方开票类型字段
  client_id?: string // UUID string
  related_payment_id?: string // UUID string (我方开票时关联的支付记录)
  // 专家费类型字段
  payment_method?: 'cash' | 'transfer'
  expert_name?: string
  // 委托支付/对方开票类型字段
  commission_type?: 'person' | 'company'
  vendor_name?: string
  vendor_score?: number
  related_commission_id?: string // UUID string
  // 文件关联
  invoice_file_id?: string // UUID string
  // 通用字段
  description?: string
  // 向后兼容的旧字段（保留用于兼容）
  record_type?: FinancialType
  fee_type?: FeeType
  receivable_amount?: number
  invoice_number?: string
  invoice_date?: string
  invoice_amount?: number
  payment_date?: string
  payment_amount?: number
}

export interface FeeTypeFinancial {
  fee_type: string
  receivable: number
  invoiced: number
  paid: number
  outstanding: number
}

export interface ProjectFinancial {
  total_contract_amount: number
  total_receivable: number
  total_invoiced: number
  total_paid: number
  total_outstanding: number
  management_fee_ratio: number
  management_fee_amount: number
  financial_records: FinancialRecord[]
  fee_type_breakdown: Record<string, FeeTypeFinancial>
}

// Bonus types
export type BonusType = 'business' | 'production'

export interface Bonus {
  id: number
  bonus_type: BonusType
  amount: number
  description?: string
  project_id: number
  user_id: number
  user?: User
  created_by_id: number
  created_by?: User
  created_at: string
  updated_at: string
}

export interface CreateBonusRequest {
  user_id: number
  bonus_type: BonusType
  amount: number
  description?: string
}

// Company Config types
export interface CompanyConfig {
  id: number
  config_key: string
  config_value: string
  description?: string
  created_by_id: number
  created_by?: User
  created_at: string
  updated_at: string
}

export interface UpdateConfigRequest {
  value: string
  description?: string
}

export interface UpdateManagementFeeRatioRequest {
  ratio: number // Between 0 and 1 (e.g., 0.15 for 15%)
  description?: string
}

// Company Revenue Statistics types
export interface ProjectRevenueSummary {
  project_id: number
  project_name: string
  project_number: string
  total_receivable: number
  total_invoiced: number
  total_paid: number
  total_outstanding: number
  management_fee_ratio: number
  management_fee_amount: number
}

export interface CompanyRevenueStatistics {
  total_projects: number
  total_receivable: number
  total_invoiced: number
  total_paid: number
  total_outstanding: number
  total_management_fee: number
  fee_type_breakdown: Record<string, FeeTypeFinancial>
  project_breakdown: ProjectRevenueSummary[]
}

// Production types
export type ProductionFileType =
  | 'scheme_ppt'
  | 'preliminary_design'
  | 'construction_drawing'
  | 'variation_order'
  | 'completion_report'
  | 'audit_report'
  | 'other'

export type ProductionStage = 'scheme' | 'preliminary' | 'construction' | 'change' | 'completion'

export interface ProductionFile {
  id: string
  project_id: string
  file_id: string
  file?: File
  file_type: ProductionFileType
  stage: ProductionStage
  description?: string
  review_sheet_file_id?: string
  review_sheet_file?: File
  score?: number
  default_amount_reference?: string
  created_by_id: string
  created_by?: User
  created_at: string
  updated_at: string
}

export interface StageFileInfo {
  stage: ProductionStage
  main_files: ProductionFile[]
  review_sheet?: ProductionFile
  score?: number
}

export interface CreateProductionFileRequest {
  file: File
  file_type: ProductionFileType
  description?: string
  review_sheet_file?: File
  score?: number
  default_amount_reference?: string
}

export interface Discipline {
  id: string // UUID string
  name: string // Discipline name
  description?: string // Discipline description
  is_active: boolean // Whether the discipline is active
  created_at: string
  updated_at: string
}

export interface CreateDisciplineRequest {
  name: string
  description?: string
}

export interface UpdateDisciplineRequest {
  name?: string
  description?: string
  is_active?: boolean
}

export type DisciplineRole = 'designer' | 'participant' | 'reviewer'

export interface DisciplineAssignmentResponse {
  discipline: string
  designer?: User
  participant?: User
  reviewer?: User
}

export interface ProjectDisciplineAssignment {
  id: number
  project_id: number
  discipline: string
  role: DisciplineRole
  user_id: number
  user?: User
  created_at: string
  updated_at: string
}

export interface ReplaceDisciplineAssignmentsRequest {
  assignments: {
    discipline: string
    designer_id?: number
    participant_id?: number
    reviewer_id?: number
  }[]
}

// 保留旧类型以保持向后兼容
export type ProductionApprovalType = 'review' | 'approval'
export type AuditReportType = 'approval' | 'audit'

// 新的批复审计类型（符合002规范）
export type ApprovalType = 'approval' | 'audit' // 批复/审计
export type ApprovalStatus = 'pending' | 'approved' // 待审核/已审核

// ProductionApproval 批复审计信息实体（符合002规范）
export interface ProductionApproval {
  id: string // UUID string
  project_id: string // UUID string
  approval_type: ApprovalType // 类型：批复/审计
  approver_id?: string // UUID string (可选)
  approver?: User
  status: ApprovalStatus // 状态：待审核/已审核
  signed_at?: string // 签字/确认时间
  report_file_id?: string // UUID string (可选)
  report_file?: File // 批复/审计报告文件
  amount_design: number // 设计费（元）
  amount_survey: number // 勘察费（元）
  amount_consulting: number // 咨询费（元）
  total_amount: number // 总金额
  source_contract_id?: string // UUID string (可选) // 关联的合同ID
  source_contract?: Contract // 关联的合同
  override_reason?: string // 覆盖原因说明
  remarks?: string // 备注
  created_at: string
  updated_at: string
}

// 批复审计信息响应（分别返回批复和审计）
export interface ApprovalAndAuditResponse {
  approval: ProductionApproval | null // 批复信息
  audit: ProductionApproval | null // 审计信息
}

// 创建批复审计信息请求
export interface CreateProductionApprovalRequest {
  approval_type: ApprovalType // 类型：批复/审计
  approver_id?: string // UUID string (可选)
  status?: ApprovalStatus // 状态（可选，默认pending）
  signed_at?: string // 签字时间（可选）
  report_file_id?: string // UUID string (可选) // 报告文件ID
  amount_design?: number // 设计费（元）
  amount_survey?: number // 勘察费（元）
  amount_consulting?: number // 咨询费（元）
  source_contract_id?: string // UUID string (可选) // 关联的合同ID
  use_contract_amount?: boolean // 是否引用合同金额
  override_reason?: string // 覆盖原因说明
  remarks?: string // 备注
}

// 更新批复审计信息请求
export interface UpdateProductionApprovalRequest {
  approval_type?: ApprovalType
  approver_id?: string // UUID string (可选)
  status?: ApprovalStatus
  signed_at?: string
  report_file_id?: string // UUID string (可选)
  amount_design?: number
  amount_survey?: number
  amount_consulting?: number
  source_contract_id?: string // UUID string (可选)
  use_contract_amount?: boolean
  override_reason?: string
  remarks?: string
}

// 合同金额响应（用于引用）
export interface ContractAmountsResponse {
  design_fee: number
  survey_fee: number
  consultation_fee: number
  total: number
}

// 保留旧类型以保持向后兼容（已废弃）
export interface CreateProductionApprovalRequestLegacy {
  record_type: ProductionApprovalType
  approver_id: number
  status: string
  signed_at?: string
  attachment_file_id?: number
  remarks?: string
  report_type: AuditReportType
  report_file_id?: number
  amount_design?: number
  amount_survey?: number
  amount_consultation?: number
  source_contract_id?: number
  default_amount_reference?: string
  override_reason?: string
}

export interface ProductionApprovalRecord {
  id: number
  project_id: number
  record_type: ProductionApprovalType
  approver_id: number
  approver?: User
  status: string
  signed_at?: string
  attachment_file_id?: number
  attachment_file?: File
  remarks?: string
  created_by_id: number
  created_by?: User
  created_at: string
  updated_at: string
  audit_resolution?: AuditResolution
}

export interface AuditResolution {
  id: number
  project_id: number
  approval_record_id: number
  report_type: AuditReportType
  report_file_id?: number
  report_file?: File
  amount_design: number
  amount_survey: number
  amount_consultation: number
  source_contract_id?: number
  default_amount_reference?: string
  override_reason?: string
  created_by_id: number
  created_by?: User
  created_at: string
  updated_at: string
}

export type ExternalVendorType = 'company' | 'person'

export interface ExternalCommission {
  id: number
  project_id: number
  vendor_name: string
  vendor_type: ExternalVendorType
  score?: number
  contract_file_id?: number
  contract_file?: File
  invoice_file_id?: number
  invoice_file?: File
  payment_amount: number
  payment_date?: string
  notes?: string
  created_by_id: number
  created_by?: User
  created_at: string
  updated_at: string
}

export interface CreateExternalCommissionRequest {
  vendor_name: string
  vendor_type: ExternalVendorType
  score?: number
  contract_file_id?: number
  invoice_file_id?: number
  payment_amount: number
  payment_date?: string
  notes?: string
}

export type ProductionCostType =
  | 'vehicle'
  | 'accommodation'
  | 'transport'
  | 'other'

export interface ProductionCost {
  id: number
  project_id: number
  cost_type: ProductionCostType
  amount: number
  description?: string
  incurred_at?: string
  commission_id?: number
  commission?: ExternalCommission
  created_by_id: number
  created_by?: User
  created_at: string
  updated_at: string
}

export interface CreateProductionCostRequest {
  cost_type: ProductionCostType
  amount: number
  description?: string
  incurred_at?: string
  commission_id?: number
}
