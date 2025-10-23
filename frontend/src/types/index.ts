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

export type UserRole = 'admin' | 'manager' | 'business' | 'designer' | 'reviewer' | 'finance'

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

export type ProjectStatus = 'planning' | 'bidding' | 'contract' | 'production' | 'completed' | 'cancelled'

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
export interface CreateProjectRequest {
  project_name: string
  project_number: string
  start_date: string
  project_overview?: string
  drawing_unit?: string
  client_id: number
  manager_id: number
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
