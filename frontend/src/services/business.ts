import { get, post, put, getPaginated } from './api'
import api from './api'
import type {
  ProjectBusiness,
  UpdateProjectBusinessRequest,
  Contract,
  CreateContractRequest,
  ContractAmendment,
  CreateContractAmendmentRequest,
  ExpertFeePayment,
  CreateExpertFeePaymentRequest,
  ApiResponse,
  File,
  SearchFilesParams,
  SearchFilesResponse,
  FinancialRecord,
  CreateFinancialRecordRequest,
  ProjectFinancial,
  Bonus,
  CreateBonusRequest,
} from '@/types'

export const businessService = {
  // Project Business Information
  getProjectBusiness: async (projectId: number): Promise<ProjectBusiness> => {
    const response = await get<ProjectBusiness>(
      `/projects/${projectId}/business`
    )
    return response || ({} as ProjectBusiness)
  },

  updateProjectBusiness: async (
    projectId: number,
    data: UpdateProjectBusinessRequest
  ): Promise<ProjectBusiness> => {
    const response = await put<ProjectBusiness>(
      `/projects/${projectId}/business`,
      data
    )
    return response || ({} as ProjectBusiness)
  },

  // Contracts
  getContracts: async (projectId: number): Promise<Contract[]> => {
    const response = await get<Contract[]>(`/projects/${projectId}/contracts`)
    return response || []
  },

  createContract: async (
    projectId: number,
    data: CreateContractRequest
  ): Promise<Contract> => {
    const response = await post<Contract>(
      `/projects/${projectId}/contracts`,
      data
    )
    return response
  },

  getContract: async (contractId: number): Promise<Contract> => {
    const response = await get<Contract>(`/contracts/${contractId}`)
    return response
  },

  updateContract: async (
    contractId: number,
    data: Partial<CreateContractRequest>
  ): Promise<Contract> => {
    const response = await put<Contract>(`/contracts/${contractId}`, data)
    return response
  },

  deleteContract: async (contractId: number): Promise<void> => {
    await fetch(`/api/v1/contracts/${contractId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    })
  },

  // Contract Amendments
  getContractAmendments: async (
    contractId: number
  ): Promise<ContractAmendment[]> => {
    const response = await get<ContractAmendment[]>(
      `/contracts/${contractId}/amendments`
    )
    return response || []
  },

  createContractAmendment: async (
    contractId: number,
    data: CreateContractAmendmentRequest
  ): Promise<ContractAmendment> => {
    const response = await post<ContractAmendment>(
      `/contracts/${contractId}/amendments`,
      data
    )
    return response
  },

  getContractAmendment: async (
    amendmentId: number
  ): Promise<ContractAmendment> => {
    const response = await get<ContractAmendment>(
      `/contract-amendments/${amendmentId}`
    )
    return response
  },

  updateContractAmendment: async (
    amendmentId: number,
    data: Partial<CreateContractAmendmentRequest>
  ): Promise<ContractAmendment> => {
    const response = await put<ContractAmendment>(
      `/contract-amendments/${amendmentId}`,
      data
    )
    return response
  },

  deleteContractAmendment: async (amendmentId: number): Promise<void> => {
    await fetch(`/api/v1/contract-amendments/${amendmentId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    })
  },

  // Expert Fee Payments
  getExpertFeePayments: async (
    projectId: number
  ): Promise<ExpertFeePayment[]> => {
    const response = await get<ExpertFeePayment[]>(
      `/projects/${projectId}/expert-fee-payments`
    )
    return response || []
  },

  createExpertFeePayment: async (
    projectId: number,
    data: CreateExpertFeePaymentRequest
  ): Promise<ExpertFeePayment> => {
    const response = await post<ExpertFeePayment>(
      `/projects/${projectId}/expert-fee-payments`,
      data
    )
    return response
  },

  getExpertFeePayment: async (paymentId: number): Promise<ExpertFeePayment> => {
    const response = await get<ExpertFeePayment>(
      `/expert-fee-payments/${paymentId}`
    )
    return response
  },

  updateExpertFeePayment: async (
    paymentId: number,
    data: Partial<CreateExpertFeePaymentRequest>
  ): Promise<ExpertFeePayment> => {
    const response = await put<ExpertFeePayment>(
      `/expert-fee-payments/${paymentId}`,
      data
    )
    return response
  },

  deleteExpertFeePayment: async (paymentId: number): Promise<void> => {
    await fetch(`/api/v1/expert-fee-payments/${paymentId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    })
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
      `/contracts/${contractId}/files`,
      formData
    )

    if (response.data.success !== undefined) {
      return response.data.data
    }
    return response.data.data || response.data
  },

  downloadContractFile: async (fileId: number): Promise<void> => {
    const token = localStorage.getItem('token')
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'}/contracts/files/${fileId}/download`,
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
      `/projects/${projectId}/contracts/files`,
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
  getProjectFinancial: async (projectId: number): Promise<ProjectFinancial> => {
    const response = await get<ProjectFinancial>(
      `/projects/${projectId}/financial`
    )
    return response || ({} as ProjectFinancial)
  },

  createFinancialRecord: async (
    projectId: number,
    data: CreateFinancialRecordRequest
  ): Promise<FinancialRecord> => {
    const response = await post<FinancialRecord>(
      `/projects/${projectId}/financial`,
      data
    )
    return response
  },

  // Bonuses
  getBonuses: async (projectId: number): Promise<Bonus[]> => {
    const response = await get<Bonus[]>(`/projects/${projectId}/bonuses`)
    return response || []
  },

  createBonus: async (
    projectId: number,
    data: CreateBonusRequest
  ): Promise<Bonus> => {
    const response = await post<Bonus>(`/projects/${projectId}/bonuses`, data)
    return response
  },
}
