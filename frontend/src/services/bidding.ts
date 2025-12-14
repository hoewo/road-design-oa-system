import { get, post } from './api'
import type { BiddingInfo, FinancialRecord } from '@/types'

export interface CreateOrUpdateBiddingInfoRequest {
  tender_file_id?: string
  bid_file_id?: string
  award_notice_file_id?: string
}

export interface CreateExpertFeePaymentRequest {
  expert_name: string
  amount: number
  occurred_at: string
  payment_method: 'cash' | 'transfer'
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
    return post<BiddingInfo>(`/user/projects/${projectId}/bidding`, data)
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
}

