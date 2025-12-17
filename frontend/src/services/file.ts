import { post } from './api'
import api from './api'
import type { File, ApiResponse } from '@/types'

export interface UploadFileRequest {
  file: globalThis.File
  project_id: string
  category: 'contract' | 'bidding' | 'design' | 'audit' | 'production' | 'other'
  description?: string
}

export const fileService = {
  // Upload file to project
  uploadFile: async (
    projectId: string,
    file: globalThis.File,
    category: 'contract' | 'bidding' | 'design' | 'audit' | 'production' | 'other',
    description?: string
  ): Promise<File> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('category', category)
    if (description) {
      formData.append('description', description)
    }

    const response = await api.post<ApiResponse<File>>(
      `/user/projects/${projectId}/files`,
      formData
    )

    if (response.data.success !== undefined) {
      return response.data.data
    }
    return response.data.data || response.data
  },

  // Download file
  downloadFile: async (fileId: string, fileName?: string): Promise<void> => {
    const token = localStorage.getItem('access_token')
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/project-oa/v1'}/user/files/${fileId}/download`,
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

    // Try to get filename from Content-Disposition header
    let downloadFileName = fileName || `file-${fileId}`
    const contentDisposition = response.headers.get('Content-Disposition')
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
      if (fileNameMatch && fileNameMatch[1]) {
        downloadFileName = fileNameMatch[1].replace(/['"]/g, '')
      }
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = downloadFileName
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  },
}

