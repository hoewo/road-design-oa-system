import { get, post } from './api'
import type { LoginRequest, LoginResponse, User } from '@/types'

export const authService = {
  // Login user
  // Note: In gateway mode, login is handled by NebulaAuth gateway
  // In self_validate mode, this endpoint is used for local development
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    try {
      // Direct API call to handle response format properly
      const api = (await import('./api')).default
      // Use public auth endpoint: /project-oa/v1/public/auth/login
      const response = await api.post('/public/auth/login', credentials)

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
  // Note: In gateway mode, logout is handled by NebulaAuth gateway
  logout: async (): Promise<void> => {
    try {
      // Use user auth endpoint: /project-oa/v1/user/auth/logout
      await post('/user/auth/logout')
    } finally {
      localStorage.removeItem('token')
    }
  },

  // Get current user
  // Note: In gateway mode, user info comes from headers (X-User-ID, etc.)
  // In self_validate mode, this endpoint validates token and returns user info
  getCurrentUser: async (): Promise<User> => {
    // Use user auth endpoint: /project-oa/v1/user/auth/me
    return get<User>('/user/auth/me')
  },

  // Check if user is authenticated
  // Note: In gateway mode, authentication is handled by gateway
  // This is mainly for self_validate mode (local development)
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('token')
  },

  // Get token
  // Note: In gateway mode, token is not used (gateway handles auth)
  // This is mainly for self_validate mode (local development)
  getToken: (): string | null => {
    return localStorage.getItem('token')
  },
}
