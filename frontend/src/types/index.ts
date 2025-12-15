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
  id: number
  contract_number: string
  contract_type: string
  sign_date: string
  contract_rate?: number
  contract_amount: number
  design_fee?: number
  survey_fee?: number
  consultation_fee?: number
  file_path?: string
  project_id: number
  amendments?: ContractAmendment[]
  created_at: string
  updated_at: string
}

export interface ContractAmendment {
  id: number
  amendment_number: string
  sign_date: string
  file_path: string
  description?: string
  contract_id: number
  created_at: string
  updated_at: string
}

export interface CreateContractRequest {
  // Note: file_path field removed - contract files managed separately through file management functionality
  contract_number: string
  contract_type: string
  sign_date: string
  contract_rate?: number
  contract_amount: number
  design_fee?: number
  survey_fee?: number
  consultation_fee?: number
}

export interface CreateContractAmendmentRequest {
  amendment_number: string
  sign_date: string
  file_path: string
  description?: string
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
  tender_file_id?: string // UUID string
  tender_file?: File
  bid_file_id?: string // UUID string
  bid_file?: File
  award_notice_file_id?: string // UUID string
  award_notice_file?: File
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

export interface ProjectMember {
  id: string // UUID string
  project_id: string // UUID string
  user_id: string // UUID string
  role: MemberRole
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
  join_date: string
  leave_date?: string
  is_active?: boolean
}

export interface UpdateProjectMemberRequest {
  role?: MemberRole
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
export type FinancialType = 'receivable' | 'invoice' | 'payment' | 'expense'
export type FeeType = 'design_fee' | 'survey_fee' | 'consultation_fee'

export interface FinancialRecord {
  id: number
  record_type: FinancialType
  fee_type: FeeType
  receivable_amount: number
  invoice_number?: string
  invoice_date?: string
  invoice_amount: number
  payment_date?: string
  payment_amount: number
  unpaid_amount: number
  description?: string
  project_id: number
  created_by_id: number
  created_by?: User
  created_at: string
  updated_at: string
}

export interface CreateFinancialRecordRequest {
  record_type: FinancialType
  fee_type: FeeType
  receivable_amount: number
  invoice_number?: string
  invoice_date?: string
  invoice_amount?: number
  payment_date?: string
  payment_amount?: number
  description?: string
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

export interface ProductionFile {
  id: number
  project_id: number
  file_id: number
  file?: File
  file_type: ProductionFileType
  description?: string
  review_sheet_file_id?: number
  review_sheet_file?: File
  score?: number
  default_amount_reference?: string
  created_by_id: number
  created_by?: User
  created_at: string
  updated_at: string
}

export interface CreateProductionFileRequest {
  file: File
  file_type: ProductionFileType
  description?: string
  review_sheet_file?: File
  score?: number
  default_amount_reference?: string
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

export type ProductionApprovalType = 'review' | 'approval'
export type AuditReportType = 'approval' | 'audit'

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

export interface CreateProductionApprovalRequest {
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
