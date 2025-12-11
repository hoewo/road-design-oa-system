import { get, post, put, getPaginated } from './api'
import type {
  ProductionFile,
  DisciplineAssignmentResponse,
  ReplaceDisciplineAssignmentsRequest,
  ProductionApprovalRecord,
  CreateProductionApprovalRequest,
  ExternalCommission,
  CreateExternalCommissionRequest,
  ProductionCost,
  CreateProductionCostRequest,
  PaginatedResponse,
} from '@/types'

export const productionService = {
  // Production File operations
  uploadProductionFile: async (
    projectId: number,
    data: FormData
  ): Promise<ProductionFile> => {
    return post<ProductionFile>(`/user/projects/${projectId}/production/files`, data)
  },

  listProductionFiles: async (
    projectId: number,
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
    projectId: number,
    fileId: number
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
    projectId: number
  ): Promise<DisciplineAssignmentResponse[]> => {
    return get<DisciplineAssignmentResponse[]>(
      `/user/projects/${projectId}/production/discipline-assignments`
    )
  },

  replaceDisciplineAssignments: async (
    projectId: number,
    data: ReplaceDisciplineAssignmentsRequest
  ): Promise<DisciplineAssignmentResponse[]> => {
    return put<DisciplineAssignmentResponse[]>(
      `/user/projects/${projectId}/production/discipline-assignments`,
      data
    )
  },

  // Production Approval operations
  listApprovals: async (
    projectId: number,
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
    projectId: number,
    data: CreateProductionApprovalRequest
  ): Promise<ProductionApprovalRecord> => {
    return post<ProductionApprovalRecord>(
      `/user/projects/${projectId}/production/approvals`,
      data
    )
  },

  // External Commission operations
  listCommissions: async (
    projectId: number,
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
    projectId: number,
    data: CreateExternalCommissionRequest
  ): Promise<ExternalCommission> => {
    return post<ExternalCommission>(
      `/user/projects/${projectId}/production/external-commissions`,
      data
    )
  },

  // Production Cost operations
  listCosts: async (projectId: number): Promise<ProductionCost[]> => {
    return get<ProductionCost[]>(`/user/projects/${projectId}/production/costs`)
  },

  createCost: async (
    projectId: number,
    data: CreateProductionCostRequest
  ): Promise<ProductionCost> => {
    return post<ProductionCost>(`/user/projects/${projectId}/production/costs`, data)
  },
}
