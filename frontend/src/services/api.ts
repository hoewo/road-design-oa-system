import axios from 'axios'
import type { ApiResponse, PaginatedResponse } from '@/types'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // Don't set Content-Type for FormData - let browser set it automatically with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

// Generic API functions
export const get = async <T>(url: string): Promise<T> => {
  const response = await api.get<any>(url)
  // Handle both {success: true, data: ...} and {data: ...} formats
  if (response.data.success !== undefined) {
    return response.data.data
  }
  return response.data.data || response.data
}

export const post = async <T>(url: string, data?: any): Promise<T> => {
  const response = await api.post<any>(url, data)
  // Handle both {success: true, data: ...} and {data: ...} formats
  if (response.data.success !== undefined) {
    return response.data.data
  }
  return response.data.data || response.data
}

export const put = async <T>(url: string, data?: any): Promise<T> => {
  const response = await api.put<any>(url, data)
  // Handle both {success: true, data: ...} and {data: ...} formats
  if (response.data.success !== undefined) {
    return response.data.data
  }
  return response.data.data || response.data
}

export const del = async <T>(url: string): Promise<T> => {
  const response = await api.delete<any>(url)
  // Handle both {success: true, data: ...} and {data: ...} formats
  if (response.data.success !== undefined) {
    return response.data.data
  }
  return response.data.data || response.data
}

export const getPaginated = async <T>(
  url: string,
  params?: any
): Promise<PaginatedResponse<T>> => {
  const response = await api.get<any>(url, { params })
  // Handle both {success: true, data: ..., total: ...} and {data: ..., total: ...} formats
  if (response.data.success !== undefined) {
    return {
      data: response.data.data || [],
      total: response.data.total || 0,
      page: response.data.page || 1,
      size: response.data.size || 20,
    }
  }
  return response.data
}
