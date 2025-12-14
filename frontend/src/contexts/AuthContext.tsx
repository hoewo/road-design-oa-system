import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { authService } from '@/services/auth'
import type { User } from '@/types'

interface AuthContextType {
  isAuthenticated: boolean
  user: User | null
  loading: boolean
  login: (userInfo?: User) => void
  logout: () => void
  refreshAuth: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return authService.isAuthenticated()
  })
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  
  // 使用 ref 跟踪是否正在获取用户信息，防止重复调用
  const isFetchingUserRef = useRef<boolean>(false)

  /**
   * 获取用户信息（不刷新token）
   * 这是一个纯函数，只负责获取用户信息，不涉及token刷新
   */
  const fetchUserInfo = useCallback(async () => {
    // 防止重复调用
    if (isFetchingUserRef.current) {
      return
    }

    // 检查是否有token
    if (!authService.isAuthenticated()) {
      setIsAuthenticated(false)
      setUser(null)
      setLoading(false)
      isFetchingUserRef.current = false
      return
    }

    setLoading(true)
    isFetchingUserRef.current = true

    try {
      const userInfo = await authService.getCurrentUser()
      setUser(userInfo)
      setIsAuthenticated(true)
      setLoading(false)
    } catch (error) {
      console.error('[AuthContext] Failed to fetch user info:', error)
      
      // 获取用户信息失败，检查token是否仍然存在
      const tokenStillExists = authService.isAuthenticated()
      if (!tokenStillExists) {
        // Token已失效，清理状态
        setIsAuthenticated(false)
        setUser(null)
      } else {
        // Token存在但获取用户信息失败，保持认证状态但清空用户信息
        // 这种情况可能是网络问题或后端问题，不应该清除认证状态
        console.warn('[AuthContext] Token exists but failed to fetch user info')
      }
      setLoading(false)
    } finally {
      isFetchingUserRef.current = false
    }
  }, [])

  /**
   * 刷新认证状态（初始化时使用）
   * 检查token，如果access_token不存在但refresh_token存在，则刷新token
   * 刷新成功后获取用户信息
   */
  const refreshAuth = useCallback(async () => {
    const accessToken = localStorage.getItem('access_token')
    const refreshToken = localStorage.getItem('refresh_token')

    // 如果access_token存在，直接获取用户信息
    if (accessToken) {
      await fetchUserInfo()
      return
    }

    // 如果access_token不存在但refresh_token存在，尝试刷新
    if (refreshToken) {
      try {
        await authService.refreshToken()
        // refreshToken 成功后会触发 'auth-state-change' 事件
        // 事件处理器会调用 fetchUserInfo，这里不需要再次调用
        console.log('[AuthContext] Token refreshed, waiting for event handler')
      } catch (error) {
        // 刷新失败，清理状态
        console.error('[AuthContext] Token refresh failed:', error)
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        setIsAuthenticated(false)
        setUser(null)
        setLoading(false)
      }
    } else {
      // 没有token，清理状态
      setIsAuthenticated(false)
      setUser(null)
      setLoading(false)
    }
  }, [fetchUserInfo])

  /**
   * 登录成功后的回调
   */
  const login = useCallback((userInfo?: User) => {
    // 立即同步更新认证状态
    const auth = authService.isAuthenticated()
    setIsAuthenticated(auth)
    
    // 如果提供了用户信息，直接使用
    if (userInfo) {
      setUser(userInfo)
      setLoading(false)
    }
    
    // login() 已经触发了 'auth-state-change' 事件
    // 事件处理器会调用 fetchUserInfo 获取最新用户信息
    // 这里不需要再次调用
  }, [])

  /**
   * 登出
   */
  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // logout() 已经触发了 'auth-state-change' 事件并清理了token
      // 这里只需要同步状态
      setIsAuthenticated(false)
      setUser(null)
      setLoading(false)
    }
  }, [])

  /**
   * 响应认证状态变化事件
   * 这是事件驱动的核心：当token状态改变时，直接响应，不再触发刷新
   */
  useEffect(() => {
    const handleAuthStateChange = () => {
      // 事件触发时，localStorage已经更新（token已刷新或已清除）
      // 直接检查当前状态并响应
      const auth = authService.isAuthenticated()
      setIsAuthenticated(auth)
      
      if (auth) {
        // Token存在，直接获取用户信息（不刷新token）
        fetchUserInfo()
      } else {
        // Token不存在，清理状态
        setUser(null)
        setLoading(false)
      }
    }

    window.addEventListener('auth-state-change', handleAuthStateChange)
    return () => {
      window.removeEventListener('auth-state-change', handleAuthStateChange)
    }
  }, [fetchUserInfo])

  /**
   * 监听 localStorage 变化（跨标签页同步）
   */
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'access_token' || e.key === 'refresh_token') {
        // 跨标签页的token变化，直接响应
        const auth = authService.isAuthenticated()
        setIsAuthenticated(auth)
        
        if (auth) {
          fetchUserInfo()
        } else {
          setUser(null)
          setLoading(false)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [fetchUserInfo])

  /**
   * 初始化时检查认证状态
   */
  useEffect(() => {
    refreshAuth()
  }, [refreshAuth])

  const value: AuthContextType = {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
    refreshAuth,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
