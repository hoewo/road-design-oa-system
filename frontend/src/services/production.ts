import { get, post, put, getPaginated, del } from './api'
import type {
  ProductionFile,
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
  CreateProductionCostRequest,
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
  ): Promise<Blob> => {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/project-oa/v1'}/user/projects/${projectId}/production/files/${fileId}/download`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      }
    )
    if (!response.ok) {
      throw new Error('下载失败')
    }
    return response.blob()
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

  // Production Cost operations
  listCosts: async (projectId: string | number): Promise<ProductionCost[]> => {
    return get<ProductionCost[]>(`/user/projects/${projectId}/production/costs`)
  },

  createCost: async (
    projectId: string | number,
    data: CreateProductionCostRequest
  ): Promise<ProductionCost> => {
    return post<ProductionCost>(`/user/projects/${projectId}/production/costs`, data)
  },
}
