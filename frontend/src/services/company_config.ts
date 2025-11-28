import { get, put } from './api'
import type { CompanyConfig } from '@/types'

export const companyConfigService = {
  // Get all company configurations
  getAllConfigs: async (): Promise<CompanyConfig[]> => {
    const response = await get<CompanyConfig[]>('/company-config')
    return response || []
  },

  // Get a specific configuration by key
  getConfig: async (key: string): Promise<CompanyConfig | null> => {
    try {
      const response = await get<CompanyConfig>(`/company-config/${key}`)
      return response || null
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  },

  // Update a configuration value
  updateConfig: async (
    key: string,
    value: string,
    description?: string
  ): Promise<CompanyConfig> => {
    const response = await put<CompanyConfig>(`/company-config/${key}`, {
      value,
      description,
    })
    return response
  },

  // Get default management fee ratio
  getDefaultManagementFeeRatio: async (): Promise<number> => {
    const response = await get<{ ratio: number; key: string }>(
      '/company-config/default-management-fee-ratio'
    )
    return response?.ratio || 0
  },

  // Update default management fee ratio
  updateDefaultManagementFeeRatio: async (
    ratio: number,
    description?: string
  ): Promise<CompanyConfig> => {
    const response = await put<CompanyConfig>(
      '/company-config/default-management-fee-ratio',
      {
        ratio,
        description,
      }
    )
    return response
  },
}
