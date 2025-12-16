import { get, post, put, getPaginated, del } from './api'
import api from './api'
import type {
  ProjectBusiness,
  UpdateProjectBusinessRequest,
  Contract,
  CreateContractRequest,
  ContractAmendment,
  CreateContractAmendmentRequest,
  ApiResponse,
  File,
  SearchFilesParams,
  SearchFilesResponse,
  FinancialRecord,
  CreateFinancialRecordRequest,
  ProjectFinancial,
  Bonus,
  CreateBonusRequest,
  CompanyRevenueStatistics,
} from '@/types'

export const businessService = {
  // Project Business Information
  getProjectBusiness: async (
    projectId: string | number
  ): Promise<ProjectBusiness> => {
    const response = await get<ProjectBusiness>(
      `/user/projects/${projectId}/business`
    )
    return response || ({} as ProjectBusiness)
  },

  updateProjectBusiness: async (
    projectId: string | number,
    data: UpdateProjectBusinessRequest
  ): Promise<ProjectBusiness> => {
    const response = await put<ProjectBusiness>(
      `/user/projects/${projectId}/business`,
      data
    )
    return response || ({} as ProjectBusiness)
  },

  // Contracts
  getContracts: async (
    projectId: string | number
  ): Promise<Contract[]> => {
    const response = await get<Contract[]>(`/user/projects/${projectId}/contracts`)
    return response || []
  },

  createContract: async (
    projectId: string | number,
    data: CreateContractRequest
  ): Promise<Contract> => {
    const response = await post<Contract>(
      `/user/projects/${projectId}/contracts`,
      data
    )
    return response
  },

  getContract: async (contractId: number): Promise<Contract> => {
    const response = await get<Contract>(`/user/contracts/${contractId}`)
    return response
  },

  updateContract: async (
    contractId: number,
    data: Partial<CreateContractRequest>
  ): Promise<Contract> => {
    const response = await put<Contract>(`/user/contracts/${contractId}`, data)
    return response
  },

  deleteContract: async (contractId: number): Promise<void> => {
    await del<void>(`/user/contracts/${contractId}`)
  },

  // Contract Amendments
  getContractAmendments: async (
    projectId: number,
    contractId: number
  ): Promise<ContractAmendment[]> => {
    const response = await get<ContractAmendment[]>(
      `/user/projects/${projectId}/contracts/${contractId}/amendments`
    )
    return response || []
  },

  createContractAmendment: async (
    projectId: number,
    contractId: number,
    data: CreateContractAmendmentRequest
  ): Promise<ContractAmendment> => {
    const response = await post<ContractAmendment>(
      `/user/projects/${projectId}/contracts/${contractId}/amendments`,
      data
    )
    return response
  },

  getContractAmendment: async (
    projectId: number,
    contractId: number,
    amendmentId: number
  ): Promise<ContractAmendment> => {
    const response = await get<ContractAmendment>(
      `/user/projects/${projectId}/contracts/${contractId}/amendments/${amendmentId}`
    )
    return response
  },

  updateContractAmendment: async (
    projectId: number,
    contractId: number,
    amendmentId: number,
    data: Partial<CreateContractAmendmentRequest>
  ): Promise<ContractAmendment> => {
    const response = await put<ContractAmendment>(
      `/user/projects/${projectId}/contracts/${contractId}/amendments/${amendmentId}`,
      data
    )
    return response
  },

  deleteContractAmendment: async (
    projectId: number,
    contractId: number,
    amendmentId: number
  ): Promise<void> => {
    await del<void>(
      `/user/projects/${projectId}/contracts/${contractId}/amendments/${amendmentId}`
    )
  },

  // Contract Files
  uploadContractFile: async (
    contractId: number,
    file: globalThis.File,
    description?: string
  ): Promise<File> => {
    const formData = new FormData()
    formData.append('file', file)
    if (description) {
      formData.append('description', description)
    }

    // Don't set Content-Type header - let browser set it automatically with boundary
    const response = await api.post<ApiResponse<File>>(
      `/user/contracts/${contractId}/files`,
      formData
    )

    if (response.data.success !== undefined) {
      return response.data.data
    }
    return response.data.data || response.data
  },

  downloadContractFile: async (fileId: number): Promise<void> => {
    const token = localStorage.getItem('access_token')
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/project-oa/v1'}/user/contracts/files/${fileId}/download`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error('Failed to download file')
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `file-${fileId}`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  },

  searchContractFiles: async (
    projectId: number,
    params?: SearchFilesParams
  ): Promise<SearchFilesResponse> => {
    const queryParams: any = {
      ...params,
      projectId: undefined, // Remove projectId from params as it's in the path
    }
    const response = await getPaginated<File>(
      `/user/projects/${projectId}/contracts/files`,
      queryParams
    )
    return {
      data: response.data || [],
      total: response.total || 0,
      page: response.page || 1,
      size: response.size || 20,
    }
  },

  // Financial Records
  getProjectFinancial: async (
    projectId: string | number
  ): Promise<ProjectFinancial> => {
    const response = await get<ProjectFinancial>(
      `/user/projects/${projectId}/financial`
    )
    return response || ({} as ProjectFinancial)
  },

  createFinancialRecord: async (
    projectId: string | number,
    data: CreateFinancialRecordRequest
  ): Promise<FinancialRecord> => {
    const response = await post<FinancialRecord>(
      `/user/projects/${projectId}/financial`,
      data
    )
    return response
  },

  updateFinancialRecord: async (
    projectId: number,
    recordId: number,
    data: Partial<CreateFinancialRecordRequest>
  ): Promise<FinancialRecord> => {
    const response = await put<FinancialRecord>(
      `/user/projects/${projectId}/financial-records/${recordId}`,
      data
    )
    return response
  },

  deleteFinancialRecord: async (
    projectId: number,
    recordId: number
  ): Promise<void> => {
    await del(`/user/projects/${projectId}/financial-records/${recordId}`)
  },

  // Bonuses
  getBonuses: async (projectId: string | number): Promise<Bonus[]> => {
    const response = await get<Bonus[]>(`/user/projects/${projectId}/bonuses`)
    return response || []
  },

  createBonus: async (
    projectId: string | number,
    data: CreateBonusRequest
  ): Promise<Bonus> => {
    const response = await post<Bonus>(`/user/projects/${projectId}/bonuses`, data)
    return response
  },

  updateBonus: async (
    bonusId: number,
    data: Partial<CreateBonusRequest>
  ): Promise<Bonus> => {
    const response = await put<Bonus>(`/user/bonuses/${bonusId}`, data)
    return response
  },

  deleteBonus: async (bonusId: number): Promise<void> => {
    await del(`/user/bonuses/${bonusId}`)
  },

  // Company revenue statistics
  getCompanyRevenueStatistics: async (): Promise<CompanyRevenueStatistics> => {
    const response = await get<CompanyRevenueStatistics>(
      '/user/company/revenue'
    )
    return response
  },
}
