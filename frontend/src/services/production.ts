import { get, post, put, getPaginated, del } from './api'
import type {
  ProductionFile,
  StageFileInfo,
  DisciplineAssignmentResponse,
  ReplaceDisciplineAssignmentsRequest,
  ProductionApprovalRecord,
  CreateProductionApprovalRequest,
  CreateProductionApprovalRequestLegacy,
  UpdateProductionApprovalRequest,
  ProductionApproval,
  ExternalCommission,
  CreateExternalCommissionRequest,
  ProductionCost,
  ProductionCostType,
  CreateProductionCostRequest,
  ProductionCostStatistics,
  FinancialRecord,
  CreateFinancialRecordRequest,
  PaginatedResponse,
  File as FileType,
} from '@/types'

export const productionService = {
  // Production File operations
  uploadProductionFile: async (
    projectId: string | number,
    data: FormData
  ): Promise<ProductionFile> => {
    return post<ProductionFile>(`/user/projects/${projectId}/production/files`, data)
  },

  listProductionFiles: async (
    projectId: string | number,
    params?: {
      page?: number
      size?: number
      fileType?: string
      keyword?: string
      startDate?: string
      endDate?: string
    }
  ): Promise<PaginatedResponse<ProductionFile>> => {
    return getPaginated<ProductionFile>(
      `/user/projects/${projectId}/production/files`,
      params
    )
  },

  downloadProductionFile: async (
    projectId: string | number,
    fileId: string | number
  ): Promise<void> => {
    const token = localStorage.getItem('access_token')
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/project-oa/v1'}/user/projects/${projectId}/production/files/${fileId}/download`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
    if (!response.ok) {
      throw new Error('下载失败')
    }
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const contentDisposition = response.headers.get('Content-Disposition')
    let fileName = `file-${fileId}`
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
      if (fileNameMatch && fileNameMatch[1]) {
        fileName = fileNameMatch[1].replace(/['"]/g, '')
      }
    }
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  },

  // 按阶段获取生产文件信息
  getProductionFilesByStage: async (
    projectId: string | number,
    stage: 'scheme' | 'preliminary' | 'construction' | 'change' | 'completion'
  ): Promise<StageFileInfo> => {
    return get<StageFileInfo>(`/user/projects/${projectId}/production/files/stage/${stage}`)
  },

  // 更新生产文件
  updateProductionFile: async (
    projectId: string | number,
    fileId: string,
    data: {
      stage?: string
      file_id?: string
      description?: string
      review_sheet_file_id?: string
      score?: number
    }
  ): Promise<ProductionFile> => {
    return put<ProductionFile>(`/user/projects/${projectId}/production/files/${fileId}`, data)
  },

  // 删除生产文件
  deleteProductionFile: async (
    projectId: string | number,
    fileId: string
  ): Promise<void> => {
    return del<void>(`/user/projects/${projectId}/production/files/${fileId}`)
  },

  // 更新阶段评分
  updateStageScore: async (
    projectId: string | number,
    stage: 'scheme' | 'preliminary' | 'construction' | 'change' | 'completion',
    score: number
  ): Promise<void> => {
    return put<void>(`/user/projects/${projectId}/production/files/stage/${stage}/score`, { score })
  },

  // Discipline Assignment operations
  getDisciplineAssignments: async (
    projectId: string | number
  ): Promise<DisciplineAssignmentResponse[]> => {
    return get<DisciplineAssignmentResponse[]>(
      `/user/projects/${projectId}/production/discipline-assignments`
    )
  },

  replaceDisciplineAssignments: async (
    projectId: string | number,
    data: ReplaceDisciplineAssignmentsRequest
  ): Promise<DisciplineAssignmentResponse[]> => {
    return put<DisciplineAssignmentResponse[]>(
      `/user/projects/${projectId}/production/discipline-assignments`,
      data
    )
  },

  // Production Approval operations (新API，符合002规范)
  getApprovalAndAudit: async (
    projectId: string | number
  ): Promise<{ approval: ProductionApproval | null; audit: ProductionApproval | null }> => {
    const response = await get<{ approval: ProductionApproval | null; audit: ProductionApproval | null }>(
      `/user/projects/${projectId}/approval-audit`
    )
    return response || { approval: null, audit: null }
  },

  createProductionApproval: async (
    projectId: string | number,
    data: CreateProductionApprovalRequest
  ): Promise<ProductionApproval> => {
    return post<ProductionApproval>(
      `/user/projects/${projectId}/approval-audit`,
      data
    )
  },

  getProductionApproval: async (
    approvalId: string
  ): Promise<ProductionApproval> => {
    return get<ProductionApproval>(`/user/approval-audit/${approvalId}`)
  },

  updateProductionApproval: async (
    approvalId: string,
    data: UpdateProductionApprovalRequest
  ): Promise<ProductionApproval> => {
    return put<ProductionApproval>(`/user/approval-audit/${approvalId}`, data)
  },

  deleteProductionApproval: async (
    approvalId: string
  ): Promise<void> => {
    return del<void>(`/user/approval-audit/${approvalId}`)
  },

  // 获取合同金额（用于引用）
  getContractAmounts: async (
    projectId: string | number
  ): Promise<{ design_fee: number; survey_fee: number; consultation_fee: number; total: number }> => {
    return get<{ design_fee: number; survey_fee: number; consultation_fee: number; total: number }>(
      `/user/projects/${projectId}/contract-amounts`
    )
  },

  // 上传批复审计报告文件
  uploadReportFile: async (
    projectId: string | number,
    file: globalThis.File,
    approvalType: 'approval' | 'audit'
  ): Promise<FileType> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('approval_type', approvalType)
    return post<FileType>(`/user/projects/${projectId}/approval-audit/upload-report`, formData)
  },

  // 下载批复审计报告文件
  downloadReportFile: async (
    fileId: string
  ): Promise<void> => {
    const token = localStorage.getItem('access_token')
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/project-oa/v1'}/user/approval-audit/files/${fileId}/download`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
    if (!response.ok) {
      throw new Error('下载失败')
    }
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const contentDisposition = response.headers.get('Content-Disposition')
    let fileName = `file-${fileId}`
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
      if (fileNameMatch && fileNameMatch[1]) {
        fileName = fileNameMatch[1].replace(/['"]/g, '')
      }
    }
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  },

  // 删除批复审计报告文件
  deleteReportFile: async (
    fileId: string
  ): Promise<void> => {
    return del<void>(`/user/approval-audit/files/${fileId}`)
  },

  // 保留旧API以保持向后兼容（已废弃）
  listApprovals: async (
    projectId: string | number,
    params?: {
      page?: number
      size?: number
      recordType?: string
      status?: string
    }
  ): Promise<PaginatedResponse<ProductionApprovalRecord>> => {
    return getPaginated<ProductionApprovalRecord>(
      `/user/projects/${projectId}/production/approvals`,
      params
    )
  },

  createApproval: async (
    projectId: string | number,
    data: CreateProductionApprovalRequest | CreateProductionApprovalRequestLegacy
  ): Promise<ProductionApprovalRecord> => {
    return post<ProductionApprovalRecord>(
      `/user/projects/${projectId}/production/approvals`,
      data
    )
  },

  // External Commission operations
  listCommissions: async (
    projectId: string | number,
    params?: {
      page?: number
      size?: number
      keyword?: string
    }
  ): Promise<PaginatedResponse<ExternalCommission>> => {
    return getPaginated<ExternalCommission>(
      `/user/projects/${projectId}/production/external-commissions`,
      params
    )
  },

  createCommission: async (
    projectId: string | number,
    data: CreateExternalCommissionRequest
  ): Promise<ExternalCommission> => {
    return post<ExternalCommission>(
      `/user/projects/${projectId}/production/external-commissions`,
      data
    )
  },

  getCommission: async (
    projectId: string | number,
    commissionId: string
  ): Promise<ExternalCommission> => {
    return get<ExternalCommission>(
      `/user/projects/${projectId}/production/external-commissions/${commissionId}`
    )
  },

  updateCommission: async (
    projectId: string | number,
    commissionId: string,
    data: Partial<CreateExternalCommissionRequest>
  ): Promise<ExternalCommission> => {
    return put<ExternalCommission>(
      `/user/projects/${projectId}/production/external-commissions/${commissionId}`,
      data
    )
  },

  deleteCommission: async (
    projectId: string | number,
    commissionId: string
  ): Promise<void> => {
    return del(
      `/user/projects/${projectId}/production/external-commissions/${commissionId}`
    )
  },

  getCommissionSummary: async (
    projectId: string | number
  ): Promise<{
    total_count: number
    total_amount: number
    average_score: number | null
  }> => {
    return get<{
      total_count: number
      total_amount: number
      average_score: number | null
    }>(`/user/projects/${projectId}/production/external-commissions/summary`)
  },

  downloadContractFile: async (
    projectId: string | number,
    commissionId: string
  ): Promise<void> => {
    const token = localStorage.getItem('access_token')
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/project-oa/v1'}/user/projects/${projectId}/production/external-commissions/${commissionId}/contract/download`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
    if (!response.ok) {
      throw new Error('下载失败')
    }
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const contentDisposition = response.headers.get('Content-Disposition')
    let fileName = `contract-${commissionId}`
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
      if (fileNameMatch && fileNameMatch[1]) {
        fileName = fileNameMatch[1].replace(/['"]/g, '')
      }
    }
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  },

  deleteContractFile: async (
    projectId: string | number,
    commissionId: string
  ): Promise<void> => {
    return del(
      `/user/projects/${projectId}/production/external-commissions/${commissionId}/contract`
    )
  },

  // Production Cost operations (使用FinancialRecord API)
  listCosts: async (projectId: string | number): Promise<ProductionCost[]> => {
    // get函数已经返回了response.data.data，直接使用即可
    const records = await get<FinancialRecord[]>(
      `/user/projects/${projectId}/production-costs`
    )
    // 转换FinancialRecord为ProductionCost格式
    const costs = (records || []).map((record) => ({
      id: record.id,
      project_id: record.project_id,
      cost_type: (record.cost_category || 'other') as ProductionCostType,
      amount: record.amount,
      description: record.description,
      incurred_at: record.occurred_at,
      invoice_file_id: record.invoice_file_id,
      invoice_file: record.invoice_file,
      created_by_id: record.created_by_id,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
    }))
    return costs
  },

  getCostStatistics: async (
    projectId: string | number
  ): Promise<ProductionCostStatistics> => {
    // get函数已经返回了response.data.data，直接使用即可
    const stats = await get<ProductionCostStatistics>(
      `/user/projects/${projectId}/production-costs/statistics`
    )
    return stats || { total_cost: 0, record_count: 0 }
  },

  createCost: async (
    projectId: string | number,
    data: CreateProductionCostRequest
  ): Promise<ProductionCost> => {
    // 转换为FinancialRecord格式
    const financialRecordData: CreateFinancialRecordRequest = {
      financial_type: 'cost',
      direction: 'expense',
      amount: data.amount,
      occurred_at: data.incurred_at || new Date().toISOString(),
      cost_category: data.cost_type,
      description: data.description,
      invoice_file_id: data.invoice_file_id,
    }
    // post函数已经返回了response.data.data，直接使用即可
    const record = await post<FinancialRecord>(
      `/user/projects/${projectId}/financial`,
      financialRecordData
    )
    // 转换FinancialRecord为ProductionCost格式
    return {
      id: record.id,
      project_id: record.project_id,
      cost_type: (record.cost_category || 'other') as ProductionCostType,
      amount: record.amount,
      description: record.description,
      incurred_at: record.occurred_at,
      invoice_file_id: record.invoice_file_id,
      invoice_file: record.invoice_file,
      created_by_id: record.created_by_id,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
    }
  },

  updateCost: async (
    projectId: string | number,
    costId: string,
    data: Partial<CreateProductionCostRequest>
  ): Promise<ProductionCost> => {
    // 转换为FinancialRecord更新格式
    const updateData: Partial<CreateFinancialRecordRequest> = {}
    if (data.amount !== undefined) updateData.amount = data.amount
    if (data.cost_type !== undefined) updateData.cost_category = data.cost_type
    if (data.description !== undefined) updateData.description = data.description
    if (data.incurred_at !== undefined) updateData.occurred_at = data.incurred_at
    if (data.invoice_file_id !== undefined) updateData.invoice_file_id = data.invoice_file_id

    // put函数已经返回了response.data.data，直接使用即可
    const record = await put<FinancialRecord>(
      `/user/financial-records/${costId}`,
      updateData
    )
    // 转换FinancialRecord为ProductionCost格式
    return {
      id: record.id,
      project_id: record.project_id,
      cost_type: (record.cost_category || 'other') as ProductionCostType,
      amount: record.amount,
      description: record.description,
      incurred_at: record.occurred_at,
      invoice_file_id: record.invoice_file_id,
      invoice_file: record.invoice_file,
      created_by_id: record.created_by_id,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
    }
  },

  deleteCost: async (projectId: string | number, costId: string): Promise<void> => {
    return del<void>(`/user/financial-records/${costId}`)
  },
}
