// User types
export interface User {
  id: number
  username: string
  email: string
  real_name: string
  role: UserRole
  department?: string
  phone?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type UserRole =
  | 'admin'
  | 'manager'
  | 'business'
  | 'designer'
  | 'reviewer'
  | 'finance'

// Project types
export interface Project {
  id: number
  project_name: string
  project_number: string
  start_date: string
  project_overview?: string
  drawing_unit?: string
  status: ProjectStatus
  client_id: number
  manager_id: number
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
  id: number
  client_name: string
  contact_name?: string
  contact_phone?: string
  email?: string
  address?: string
  tax_number?: string
  bank_account?: string
  bank_name?: string
  is_active: boolean
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
}

export interface CreateClientRequest {
  client_name: string
  contact_name?: string
  contact_phone?: string
  email?: string
  address?: string
  tax_number?: string
  bank_account?: string
  bank_name?: string
}

// Auth types
export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
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
  project_id: number
  client_id?: number
  client?: Client
  contact_name: string
  contact_phone: string
  business_manager_ids: number[]
  business_personnel_ids: number[]
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
  | 'manager'
  | 'designer'
  | 'participant'
  | 'reviewer'
  | 'auditor'
  | 'business_manager'
  | 'business_personnel'

export interface ProjectMember {
  id: number
  project_id: number
  user_id: number
  role: MemberRole
  join_date: string
  leave_date?: string
  is_active: boolean
  created_at: string
  updated_at: string
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
  id: number
  file_name: string
  original_name: string
  file_path: string
  file_size: number
  file_type: string
  mime_type: string
  category: FileCategory
  description?: string
  project_id: number
  uploader_id: number
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
