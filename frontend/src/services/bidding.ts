import { get, post, put, del } from './api'
import type { BiddingInfo, FinancialRecord } from '@/types'

export interface CreateOrUpdateBiddingInfoRequest {
  tender_file_ids?: string[]  // 招标文件ID数组，支持多个文件
  bid_file_ids?: string[]     // 投标文件ID数组，支持多个文件
  award_notice_file_ids?: string[]  // 中标通知书文件ID数组，支持多个文件
}

export interface CreateExpertFeePaymentRequest {
  expert_name: string
  amount: number
  occurred_at: string
  payment_method: 'cash' | 'transfer'
  description?: string
}

export interface UpdateExpertFeePaymentRequest {
  expert_name?: string
  amount?: number
  occurred_at?: string
  payment_method?: 'cash' | 'transfer'
  description?: string
}

export const biddingService = {
  // Get bidding info for a project
  getBiddingInfo: async (projectId: string): Promise<BiddingInfo | null> => {
    try {
      const response = await get<BiddingInfo>(
        `/user/projects/${projectId}/bidding`
      )
      return response
    } catch (error: any) {
      // If not found, return null instead of throwing
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  },

  // Create or update bidding info
  createOrUpdateBiddingInfo: async (
    projectId: string,
    data: CreateOrUpdateBiddingInfoRequest
  ): Promise<BiddingInfo> => {
    return put<BiddingInfo>(`/user/projects/${projectId}/bidding`, data)
  },

  // Get expert fee payments for a project
  getExpertFeePayments: async (
    projectId: string
  ): Promise<FinancialRecord[]> => {
    const response = await get<FinancialRecord[]>(
      `/user/projects/${projectId}/bidding/expert-fee`
    )
    return response || []
  },

  // Create expert fee payment
  createExpertFeePayment: async (
    projectId: string,
    data: CreateExpertFeePaymentRequest
  ): Promise<FinancialRecord> => {
    return post<FinancialRecord>(
      `/user/projects/${projectId}/bidding/expert-fee`,
      data
    )
  },

  // Update expert fee payment
  updateExpertFeePayment: async (
    projectId: string,
    recordId: string,
    data: UpdateExpertFeePaymentRequest
  ): Promise<FinancialRecord> => {
    return put<FinancialRecord>(
      `/user/projects/${projectId}/bidding/expert-fee/${recordId}`,
      data
    )
  },

  // Delete expert fee payment
  deleteExpertFeePayment: async (
    projectId: string,
    recordId: string
  ): Promise<void> => {
    return del<void>(
      `/user/projects/${projectId}/bidding/expert-fee/${recordId}`
    )
  },
}

