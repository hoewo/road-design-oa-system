import { get, post } from './api'
import type { LoginRequest, LoginResponse, User } from '@/types'

export const authService = {
  // Login user
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await post<LoginResponse>('/auth/login', credentials)
    localStorage.setItem('token', response.token)
    return response
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
