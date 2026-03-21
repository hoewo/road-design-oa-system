import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { Layout, Spin, theme } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import ProjectList from './pages/ProjectList'
import ProjectDetail from './pages/ProjectDetail'
import ProjectRevenue from './pages/ProjectRevenue'
import CompanyRevenue from './pages/CompanyRevenue'
import UserManagement from './pages/UserManagement'
import FileManagement from './pages/FileManagement'
import ContractDetail from './components/contract/ContractDetail'
import UserInfo from './components/auth/UserInfo'
import {
  BRAND_LOGO_ALT,
  BRAND_LOGO_SRC,
  COMPANY_FULL_NAME,
} from '@/brand/constants'
import './App.css'

const { Header, Content } = Layout

// Protected Route Component
// 使用 AuthContext 管理认证状态，符合 React 最佳实践
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth()

  // 加载中显示加载状态
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  // 未认证则重定向到登录页
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// Login Route Component - 如果已登录则重定向到首页
const LoginRoute = () => {
  const { isAuthenticated, loading } = useAuth()
  const tokenCheck = !!localStorage.getItem('access_token')

  console.log('[LoginRoute] Render check:', {
    isAuthenticated,
    loading,
    tokenCheck,
    path: window.location.pathname,
  })

  // 加载中显示加载状态
  if (loading) {
    console.log('[LoginRoute] Loading state, showing spinner')
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  // 如果已登录，重定向到首页
  if (isAuthenticated) {
    return <Navigate to="/projects" replace />
  }

  return <Login />
}

// Redirect components for backward compatibility
const ProjectBusinessRedirect = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  useEffect(() => {
    navigate(`/projects/${id}?tab=business`, { replace: true })
  }, [id, navigate])
  return null
}

const ProjectProductionRedirect = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  useEffect(() => {
    navigate(`/projects/${id}?tab=production`, { replace: true })
  }, [id, navigate])
  return null
}

function AppContent() {
  const { token } = theme.useToken()

  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout style={{ minHeight: '100vh' }}>
              <Header
                style={{
                  background: token.colorBgContainer,
                  boxShadow: token.boxShadowSecondary,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: `0 ${token.paddingLG}px`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    flex: 1,
                    minWidth: 0,
                    gap: token.marginSM,
                    marginRight: token.margin,
                  }}
                >
                  <img
                    src={BRAND_LOGO_SRC}
                    alt={BRAND_LOGO_ALT}
                    style={{
                      height: token.controlHeight,
                      width: 'auto',
                      display: 'block',
                      objectFit: 'contain',
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: token.fontSizeLG,
                      fontWeight: token.fontWeightStrong,
                      color: token.colorTextHeading,
                      lineHeight: 1.3,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={COMPANY_FULL_NAME}
                  >
                    {COMPANY_FULL_NAME}
                  </span>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <UserInfo />
                </div>
              </Header>
              <Content style={{ padding: '24px' }}>
                <Routes>
                  <Route
                    path="/"
                    element={<Navigate to="/projects" replace />}
                  />
                  <Route path="/projects" element={<ProjectList />} />
                  <Route path="/projects/:id" element={<ProjectDetail />} />
                  <Route
                    path="/projects/:id/business"
                    element={<ProjectBusinessRedirect />}
                  />
                  <Route
                    path="/projects/:id/production"
                    element={<ProjectProductionRedirect />}
                  />
                  <Route
                    path="/projects/:id/revenue"
                    element={<ProjectRevenue />}
                  />
                  <Route path="/company-revenue" element={<CompanyRevenue />} />
                  <Route path="/users" element={<UserManagement />} />
                  <Route path="/files" element={<FileManagement />} />
                  <Route path="/contracts/:id" element={<ContractDetail />} />
                </Routes>
              </Content>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

function App() {
  // 在组件挂载时检查是否有保存的错误日志
  useEffect(() => {
    const lastError = sessionStorage.getItem('last_api_error')
    if (lastError) {
      try {
        const error = JSON.parse(lastError)
        console.log('[App] ========== Previous API Error Found ==========')
        console.log('[App] Error from sessionStorage:', error)
        console.log('[App] This error occurred before page refresh')
      } catch (e) {
        console.warn('[App] Failed to parse last_api_error:', e)
      }
    }
    
    const loginSuccessLog = sessionStorage.getItem('login_success_log')
    if (loginSuccessLog) {
      try {
        const log = JSON.parse(loginSuccessLog)
        console.log('[App] ========== Previous Login Success Found ==========')
        console.log('[App] Login success log from sessionStorage:', log)
      } catch (e) {
        console.warn('[App] Failed to parse login_success_log:', e)
      }
    }
  }, [])

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
