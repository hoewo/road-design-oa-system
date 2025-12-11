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
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 刷新认证状态
  const refreshAuth = useCallback(() => {
    const auth = authService.isAuthenticated()
    
    setIsAuthenticated(auth)
    
    // 如果已认证，尝试获取用户信息（异步，不阻塞认证状态更新）
    if (auth) {
      // 防止重复调用：如果正在获取用户信息，跳过
      if (isFetchingUserRef.current) {
        return
      }
      
      setLoading(true)
      isFetchingUserRef.current = true
      
      authService
        .getCurrentUser()
        .then((userInfo) => {
          setUser(userInfo)
          setLoading(false)
          isFetchingUserRef.current = false
        })
        .catch((error) => {
          console.error('[AuthContext] Failed to fetch user info:', error)
          
          // 检查 token 是否仍然存在（可能被 API 拦截器清除了）
          const tokenStillExists = authService.isAuthenticated()
          
          // 如果获取用户信息失败，可能是 token 无效，清除认证状态
          if (error.response?.status === 401) {
            // 再次检查 token，因为 API 拦截器可能在刷新失败后清除了 token
            if (!tokenStillExists) {
              setIsAuthenticated(false)
              setUser(null)
            }
            // 如果 token 仍然存在，保持认证状态（可能是临时问题，token 刚设置还没生效）
          } else {
            // 即使获取用户信息失败，也不影响认证状态（token 存在就认为已认证）
            if (!tokenStillExists) {
              setIsAuthenticated(false)
              setUser(null)
            }
          }
          setLoading(false)
          isFetchingUserRef.current = false
        })
    } else {
      setUser(null)
      setLoading(false)
      isFetchingUserRef.current = false
    }
  }, [])

  // 公共的延迟刷新用户信息函数
  const scheduleUserInfoRefresh = useCallback(() => {
    // 清除之前的延迟调用，防止重复
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
      refreshTimeoutRef.current = null
    }

    refreshTimeoutRef.current = setTimeout(() => {
      const tokenStillExists = authService.isAuthenticated()
      if (tokenStillExists && !isFetchingUserRef.current) {
        refreshAuth()
      }
      refreshTimeoutRef.current = null
    }, 1000) // 降低延迟到1秒，确保 token 已生效
  }, [refreshAuth])

  // 登录成功后的回调
  // 如果提供了用户信息，直接使用，避免立即调用 getCurrentUser() 导致 401
  const login = useCallback((userInfo?: User) => {
    // 立即同步更新认证状态
    const auth = authService.isAuthenticated()
    setIsAuthenticated(auth)
    
    // 如果提供了用户信息，直接使用，延迟获取最新用户信息
    if (userInfo) {
      setUser(userInfo)
      setLoading(false)
      // 延迟获取用户信息，确保 token 已经生效
      scheduleUserInfoRefresh()
    } else {
      // 如果没有提供用户信息，延迟获取
      scheduleUserInfoRefresh()
    }
  }, [scheduleUserInfoRefresh])

  // 登出
  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsAuthenticated(false)
      setUser(null)
    }
  }, [])

  // 初始化时检查认证状态
  useEffect(() => {
    refreshAuth()
  }, [refreshAuth])

  // 监听 localStorage 变化（跨标签页）
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'access_token' || e.key === 'refresh_token') {
        refreshAuth()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [refreshAuth])

  // 监听自定义认证状态变化事件（同标签页）
  useEffect(() => {
    const handleAuthStateChange = () => {
      // 立即同步检查并更新状态
      const auth = authService.isAuthenticated()
      setIsAuthenticated(auth)
      
      // 如果有有效 token，延迟获取用户信息
      // 重要：刚登录时不要立即获取用户信息，因为 token 可能还没生效
      if (auth) {
        scheduleUserInfoRefresh()
      } else {
        refreshAuth()
      }
    }

    window.addEventListener('auth-state-change', handleAuthStateChange)
    return () => {
      window.removeEventListener('auth-state-change', handleAuthStateChange)
      // 清理时清除延迟调用
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
        refreshTimeoutRef.current = null
      }
    }
  }, [refreshAuth, scheduleUserInfoRefresh])

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

