import { get, post } from './api'
import type { LoginRequest, LoginResponse, User } from '@/types'

export const authService = {
  // Login user
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    try {
      // Direct API call to handle response format properly
      const api = (await import('./api')).default
      const response = await api.post('/auth/login', credentials)

      // Handle response format: {success: true, data: {token, user}}
      let loginData: LoginResponse
      if (response.data.success && response.data.data) {
        loginData = response.data.data
      } else if (response.data.token) {
        loginData = response.data
      } else {
        throw new Error('Invalid login response format')
      }

      localStorage.setItem('token', loginData.token)
      return loginData
    } catch (error: any) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error)
      }
      throw error
    }
  },

  // Logout user
  logout: async (): Promise<void> => {
    try {
      await post('/auth/logout')
    } finally {
      localStorage.removeItem('token')
    }
  },

  // Get current user
  getCurrentUser: async (): Promise<User> => {
    return get<User>('/auth/me')
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('token')
  },

  // Get token
  getToken: (): string | null => {
    return localStorage.getItem('token')
  },
}
