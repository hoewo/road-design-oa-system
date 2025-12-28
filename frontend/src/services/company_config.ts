import { get, put } from './api'
import type { CompanyConfig } from '@/types'

/**
 * 公司配置服务（仅保留管理费比例相关功能）
 * 注意：通用配置管理功能已移除，统一由公司收入统计页面维护
 */
export const companyConfigService = {
  // Get default management fee ratio
  getDefaultManagementFeeRatio: async (): Promise<number> => {
    const response = await get<{ ratio: number; key: string }>(
      '/user/company-config/default-management-fee-ratio'
    )
    return response?.ratio || 0
  },

  // Update default management fee ratio
  updateDefaultManagementFeeRatio: async (
    ratio: number,
    description?: string
  ): Promise<CompanyConfig> => {
    const response = await put<CompanyConfig>(
      '/user/company-config/default-management-fee-ratio',
      {
        ratio,
        description,
      }
    )
    return response
  },
}
