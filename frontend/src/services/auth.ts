import axios from 'axios'
import { get, post } from './api'
import { apiConfig } from '@/config/api'
import type {
  LoginResponse,
  VerificationCodeLoginRequest,
  SendVerificationRequest,
  RefreshTokenRequest,
  User,
} from '@/types'

export const authService = {
  /**
   * 发送验证码
   * 调用NebulaAuth网关接口发送验证码到邮箱或手机号
   */
  sendVerification: async (
    target: string,
    codeType: 'email' | 'sms'
  ): Promise<void> => {
    try {
      const request: SendVerificationRequest = {
        code_type: codeType,
        target,
        purpose: 'login',
      }

      const response = await axios.post(
        `${apiConfig.nebulaAuthURL}/auth-server/v1/public/send_verification`,
        request,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.data.success) {
        throw new Error(response.data.error || '验证码发送失败')
      }
    } catch (error: any) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error)
      }
      if (error.message) {
        throw error
      }
      throw new Error('验证码发送失败，请检查网络连接')
    }
  },

  /**
   * 用户登录（验证码登录）
   * 调用NebulaAuth网关接口进行登录，获取access_token和refresh_token
   */
  login: async (
    credentials: VerificationCodeLoginRequest
  ): Promise<LoginResponse> => {
    try {
      const response = await axios.post(
        `${apiConfig.nebulaAuthURL}/auth-server/v1/public/login`,
        credentials,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      // 处理响应格式：{success: true, data: {tokens: {access_token, refresh_token}, user: {...}}}
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || '登录失败')
      }

      const loginData: LoginResponse = response.data.data

      // 存储Token到localStorage
      if (loginData.tokens?.access_token) {
        localStorage.setItem('access_token', loginData.tokens.access_token)
      } else {
        throw new Error('登录失败：未收到访问令牌')
      }
      
      if (loginData.tokens?.refresh_token) {
        localStorage.setItem('refresh_token', loginData.tokens.refresh_token)
      }

      // 保存用户信息到localStorage（包括is_admin和roles）
      if (loginData.user) {
        localStorage.setItem('user_info', JSON.stringify({
          id: loginData.user.id,
          username: loginData.user.username,
          email: loginData.user.email,
          real_name: loginData.user.real_name,
          roles: loginData.user.roles,
          role: loginData.user.role, // 向后兼容
          is_admin: loginData.user.is_admin || false,
        }))
      }

      // 触发自定义事件，通知认证状态已改变
      window.dispatchEvent(new Event('auth-state-change'))

      return loginData
    } catch (error: any) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error)
      }
      if (error.message) {
        throw error
      }
      throw new Error('登录失败，请检查网络连接')
    }
  },

  /**
   * 刷新Token
   * 当access_token过期时，使用refresh_token刷新获取新的tokens
   */
  refreshToken: async (): Promise<{ access_token: string; refresh_token: string }> => {
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    try {
      const request: RefreshTokenRequest = {
        refresh_token: refreshToken,
      }

      const response = await axios.post(
        `${apiConfig.nebulaAuthURL}/auth-server/v1/public/refresh_token`,
        request,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      // 根据API文档，响应格式为：{success: true, data: {access_token, refresh_token, ...}}
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Token刷新失败')
      }

      const tokenData = response.data.data

      // 检查是否有access_token和refresh_token
      if (!tokenData.access_token || !tokenData.refresh_token) {
        throw new Error('Token刷新失败：响应中缺少token')
      }

      // 更新localStorage中的tokens
      localStorage.setItem('access_token', tokenData.access_token)
      localStorage.setItem('refresh_token', tokenData.refresh_token)

      // 触发自定义事件，通知认证状态已改变
      window.dispatchEvent(new Event('auth-state-change'))

      return {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
      }
    } catch (error: any) {
      // 刷新失败，清除所有token
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('token') // 清除旧的token（如果存在）
        
        // 触发自定义事件，通知认证状态已改变
        window.dispatchEvent(new Event('auth-state-change'))

      if (error.response?.data?.error) {
        throw new Error(error.response.data.error)
      }
      if (error.message) {
        throw error
      }
      throw new Error('Token刷新失败')
    }
  },

  // Logout user
  // Note: In gateway mode, logout is handled by NebulaAuth gateway
  logout: async (): Promise<void> => {
    try {
      // Use user auth endpoint: /project-oa/v1/user/auth/logout
      await post('/user/auth/logout')
    } finally {
      // 清除所有token
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('token') // 清除旧的token（如果存在）
      
      // 触发自定义事件，通知认证状态已改变
      window.dispatchEvent(new Event('auth-state-change'))
    }
  },

  // Get current user
  // Note: In gateway mode, user info comes from headers (X-User-ID, etc.)
  // In self_validate mode, this endpoint validates token and returns user info
  getCurrentUser: async (): Promise<User> => {
    // Use user auth endpoint: /project-oa/v1/user/auth/me
    const user = await get<User>('/user/auth/me')
    
    // 更新localStorage中的用户信息（包括is_admin和roles）
    if (user) {
      localStorage.setItem('user_info', JSON.stringify({
        id: user.id,
        username: user.username,
        email: user.email,
        real_name: user.real_name,
        roles: user.roles,
        role: user.role, // 向后兼容
        is_admin: user.is_admin || false,
      }))
    }
    
    return user
  },

  // Check if user is authenticated
  // Note: 检查access_token是否存在
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('access_token')
  },

  // Get access token
  // Note: 从localStorage读取access_token（替换旧的token）
  getToken: (): string | null => {
    return localStorage.getItem('access_token')
  },

  /**
   * 初始化认证状态
   * 页面加载时调用，先刷新Token（如果Refresh Token存在），再返回认证状态
   * 解决超过2小时后重新打开网页错误跳转登录页的问题
   */
  initializeAuth: async (): Promise<boolean> => {
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      // 没有Refresh Token，清除所有Token
      localStorage.removeItem('access_token')
      return false
    }

    try {
      // 关键：页面加载时主动刷新Token，确保Access Token有效
      // 这样即使Access Token已过期（超过2小时），也能通过Refresh Token获取新的Token
      await authService.refreshToken()
      console.log('[Auth Init] Token refreshed successfully')
      return true
    } catch (error) {
      // 刷新失败，清除所有Token（Refresh Token可能已过期）
      console.error('[Auth Init] Token refresh failed:', error)
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      return false
    }
  },
}
