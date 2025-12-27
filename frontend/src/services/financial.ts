import { get, put, getPaginated } from './api'
import type { PaginatedResponse } from '@/types'

// Company Revenue Types
export interface CompanyRevenueSummary {
  total_receivable_by_fee_type: {
    design_fee: number
    survey_fee: number
    consultation_fee: number
    total: number
  }
  total_paid: number
  total_outstanding: number
}

export interface CompanyRevenueStatistics {
  total_receivable: number
  total_invoiced: number
  total_paid: number
  total_outstanding: number
  management_fee_ratio: number
  management_fee_amount: number
  project_breakdown: ProjectRevenueSummary[]
  fee_type_breakdown: {
    design_fee: FeeTypeFinancial
    survey_fee: FeeTypeFinancial
    consultation_fee: FeeTypeFinancial
  }
}

export interface ProjectRevenueSummary {
  project_id: string
  project_name: string
  project_number: string
  total_receivable: number
  total_invoiced: number
  total_paid: number
  total_outstanding: number
  management_fee_ratio: number
  management_fee_amount: number
}

export interface FeeTypeFinancial {
  total_receivable: number
  total_invoiced: number
  total_paid: number
  total_outstanding: number
}

export interface InvoiceInfo {
  id: string
  project_id: string
  project_name: string
  fee_type: 'design_fee' | 'survey_fee' | 'consultation_fee' | ''
  invoice_date: string
  amount: number
  invoice_file?: {
    id: string
    original_name: string
    file_path: string
  }
}

export interface PaymentInfo {
  id: string
  project_id: string
  project_name: string
  fee_type: 'design_fee' | 'survey_fee' | 'consultation_fee' | ''
  payment_date: string
  amount: number
}

export interface CompanyConfig {
  id: string
  config_key: string
  config_value: string
  description: string
  created_by_id: string
  created_at: string
  updated_at: string
}

export interface InvoiceFilterParams {
  project_name?: string
  fee_type?: 'design_fee' | 'survey_fee' | 'consultation_fee' | ''
  start_date?: string
  end_date?: string
  page?: number
  page_size?: number
}

export interface PaymentFilterParams {
  project_name?: string
  fee_type?: 'design_fee' | 'survey_fee' | 'consultation_fee' | ''
  start_date?: string
  end_date?: string
  page?: number
  page_size?: number
}

export interface InvoiceListResponse {
  items: InvoiceInfo[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface PaymentListResponse {
  items: PaymentInfo[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export const financialService = {
  /**
   * 获取默认管理费比例
   */
  getDefaultManagementFeeRatio: async (): Promise<number> => {
    try {
      const config = await get<CompanyConfig>('/user/company-config/default-management-fee-ratio')
      if (config && config.config_value) {
        return parseFloat(config.config_value) * 100 // 转换为百分比
      }
      return 0
    } catch (error) {
      console.error('Failed to get default management fee ratio:', error)
      return 0
    }
  },

  /**
   * 更新默认管理费比例
   */
  updateDefaultManagementFeeRatio: async (ratio: number, description?: string): Promise<CompanyConfig> => {
    // ratio 是百分比（0-100），需要转换为小数（0-1）
    const ratioDecimal = ratio / 100
    return put<CompanyConfig>('/user/company-config/default-management-fee-ratio', {
      ratio: ratioDecimal,
      description,
    })
  },

  /**
   * 获取公司收入统计（详细统计）
   */
  getCompanyRevenueStatistics: async (): Promise<CompanyRevenueStatistics> => {
    return get<CompanyRevenueStatistics>('/user/company-revenue-statistics')
  },

  /**
   * 获取公司收入汇总（简化版，按费用类型分类）
   */
  getCompanyRevenueSummary: async (startDate?: string, endDate?: string): Promise<CompanyRevenueSummary> => {
    const queryParams = new URLSearchParams()
    if (startDate) queryParams.append('start_date', startDate)
    if (endDate) queryParams.append('end_date', endDate)
    const url = `/admin/revenue/summary${queryParams.toString() ? '?' + queryParams.toString() : ''}`
    return get<CompanyRevenueSummary>(url)
  },

  /**
   * 获取发票信息列表（带搜索、过滤、分页）
   */
  getInvoiceInfoList: async (params: InvoiceFilterParams): Promise<InvoiceListResponse> => {
    const queryParams = new URLSearchParams()
    if (params.project_name) queryParams.append('project_name', params.project_name)
    if (params.fee_type) queryParams.append('fee_type', params.fee_type)
    if (params.start_date) queryParams.append('start_date', params.start_date)
    if (params.end_date) queryParams.append('end_date', params.end_date)
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.page_size) queryParams.append('page_size', params.page_size.toString())

    const url = `/admin/revenue/invoices${queryParams.toString() ? '?' + queryParams.toString() : ''}`
    return get<InvoiceListResponse>(url)
  },

  /**
   * 获取支付信息列表（带搜索、过滤、分页）
   */
  getPaymentInfoList: async (params: PaymentFilterParams): Promise<PaymentListResponse> => {
    const queryParams = new URLSearchParams()
    if (params.project_name) queryParams.append('project_name', params.project_name)
    if (params.fee_type) queryParams.append('fee_type', params.fee_type)
    if (params.start_date) queryParams.append('start_date', params.start_date)
    if (params.end_date) queryParams.append('end_date', params.end_date)
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.page_size) queryParams.append('page_size', params.page_size.toString())

    const url = `/admin/revenue/payments${queryParams.toString() ? '?' + queryParams.toString() : ''}`
    return get<PaymentListResponse>(url)
  },

  /**
   * 导出发票信息
   */
  exportInvoices: async (params: InvoiceFilterParams, format: 'excel' | 'csv' = 'excel'): Promise<Blob> => {
    const queryParams = new URLSearchParams()
    queryParams.append('format', format)
    if (params.project_name) queryParams.append('project_name', params.project_name)
    if (params.fee_type) queryParams.append('fee_type', params.fee_type)
    if (params.start_date) queryParams.append('start_date', params.start_date)
    if (params.end_date) queryParams.append('end_date', params.end_date)

    const { apiConfig } = await import('@/config/api')
    const url = `${apiConfig.apiBaseURL}/admin/revenue/invoices/export?${queryParams.toString()}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
      },
    })
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || 'Failed to export invoices')
    }
    return response.blob()
  },

  /**
   * 导出支付信息
   */
  exportPayments: async (params: PaymentFilterParams, format: 'excel' | 'csv' = 'excel'): Promise<Blob> => {
    const queryParams = new URLSearchParams()
    queryParams.append('format', format)
    if (params.project_name) queryParams.append('project_name', params.project_name)
    if (params.fee_type) queryParams.append('fee_type', params.fee_type)
    if (params.start_date) queryParams.append('start_date', params.start_date)
    if (params.end_date) queryParams.append('end_date', params.end_date)

    const { apiConfig } = await import('@/config/api')
    const url = `${apiConfig.apiBaseURL}/admin/revenue/payments/export?${queryParams.toString()}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
      },
    })
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || 'Failed to export payments')
    }
    return response.blob()
  },
}

