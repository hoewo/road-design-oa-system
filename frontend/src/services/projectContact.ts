import { get, put, del } from './api'
import type { ProjectContact } from '@/types'

export interface CreateOrUpdateProjectContactRequest {
  client_id: string
  contact_name: string
  contact_phone?: string
}

export const projectContactService = {
  // Get project contact
  getProjectContact: async (
    projectId: string
  ): Promise<ProjectContact | null> => {
    try {
      const response = await get<ProjectContact>(
        `/user/projects/${projectId}/contact`
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

  // Create or update project contact
  createOrUpdateProjectContact: async (
    projectId: string,
    data: CreateOrUpdateProjectContactRequest
  ): Promise<ProjectContact> => {
    return put<ProjectContact>(`/user/projects/${projectId}/contact`, data)
  },

  // Delete project contact
  deleteProjectContact: async (projectId: string): Promise<void> => {
    return del<void>(`/user/projects/${projectId}/contact`)
  },
}

