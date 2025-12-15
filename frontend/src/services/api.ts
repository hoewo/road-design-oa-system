import axios from 'axios'
import type { PaginatedResponse } from '@/types'
import { apiConfig } from '@/config/api'
import { authService } from './auth'

const API_BASE_URL = apiConfig.apiBaseURL

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
    // 从localStorage读取access_token（替换旧的token）
    const token = localStorage.getItem('access_token')
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

// Response interceptor to handle errors and token refresh
api.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // Token过期（401错误）时自动刷新
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // 尝试刷新Token
        await authService.refreshToken()

        // 刷新成功，使用新的token重试原请求
        const newToken = localStorage.getItem('access_token')
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
        }
        return api(originalRequest)
      } catch (refreshError) {
        // 刷新失败，清除所有token并跳转登录页
        console.error('[API Interceptor] Token refresh failed:', refreshError)
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('token') // 清除旧的token（如果存在）
        
        // 触发自定义事件，通知认证状态已改变
        window.dispatchEvent(new Event('auth-state-change'))
        
        // 跳转到登录页
        window.location.href = '/login'
        
        return Promise.reject(refreshError)
      }
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

export const post = async <T>(url: string, data?: any, params?: any): Promise<T> => {
  const response = await api.post<any>(url, data, { params })
  // Handle both {success: true, data: ...} and {data: ...} formats
  if (response.data.success !== undefined) {
    return response.data.data
  }
  return response.data.data || response.data
}

export const put = async <T>(url: string, data?: any, params?: any): Promise<T> => {
  const response = await api.put<any>(url, data, { params })
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
