import { post, get, del, getPaginated } from './api'
import api from './api'
import type { File, ApiResponse, FileCategory, PaginatedResponse } from '@/types'

export interface UploadFileRequest {
  file: globalThis.File
  project_id: string
  category: FileCategory
  description?: string
}

export interface SearchFilesParams {
  project_id?: string
  category?: FileCategory
  file_type?: string
  start_date?: string
  end_date?: string
  keyword?: string
  page?: number
  size?: number
}

export interface SearchFilesResponse {
  data: File[]
  total: number
  page: number
  size: number
}

export const fileService = {
  // Upload file to project
  uploadFile: async (
    projectId: string,
    file: globalThis.File,
    category: FileCategory,
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
      // EC-015: If permission denied (403), try to parse error response with file info
      if (response.status === 403) {
        try {
          const errorData = await response.json()
          if (errorData.file) {
            // Return file info but throw error to indicate permission denied
            const error = new Error('您没有权限下载此文件')
            ;(error as any).file = errorData.file
            throw error
          }
        } catch (e) {
          // If JSON parsing fails, continue with generic error
        }
      }
      throw new Error('文件下载失败')
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

  // Search files
  searchFiles: async (params?: SearchFilesParams): Promise<SearchFilesResponse> => {
    const queryParams: Record<string, string> = {}
    if (params?.project_id) queryParams.project_id = params.project_id
    if (params?.category) queryParams.category = params.category
    if (params?.file_type) queryParams.file_type = params.file_type
    if (params?.start_date) queryParams.start_date = params.start_date
    if (params?.end_date) queryParams.end_date = params.end_date
    if (params?.keyword) queryParams.keyword = params.keyword
    if (params?.page) queryParams.page = params.page.toString()
    if (params?.size) queryParams.size = params.size.toString()

    // Backend returns: {success: true, data: {files: [...], total, page, size}}
    // get() extracts response.data.data, so we get {files: [...], total, page, size}
    const response = await get<{ files: File[]; total: number; page: number; size: number }>('/user/files/search', queryParams)
    
    // Transform to SearchFilesResponse format: {data: [...], total, page, size}
    return {
      data: response.files || [],
      total: response.total || 0,
      page: response.page || 1,
      size: response.size || 20,
    }
  },

  // Delete file (soft delete)
  deleteFile: async (fileId: string): Promise<void> => {
    await del<void>(`/user/files/${fileId}`)
  },
}

