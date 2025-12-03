import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { Layout, Button } from 'antd'
import { LogoutOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { authService } from '@/services/auth'
import Login from './pages/Login'
import ProjectList from './pages/ProjectList'
import ProjectDetail from './pages/ProjectDetail'
import ProjectRevenue from './pages/ProjectRevenue'
import CompanyConfig from './pages/CompanyConfig'
import CompanyRevenue from './pages/CompanyRevenue'
import ContractDetail from './components/contract/ContractDetail'
import './App.css'

const { Header, Content } = Layout

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
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

function App() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await authService.logout()
    navigate('/login')
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout style={{ minHeight: '100vh' }}>
              <Header
                style={{
                  background: '#fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0 24px',
                }}
              >
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#262626',
                  }}
                >
                  项目管理OA系统
                </div>
                <Button icon={<LogoutOutlined />} onClick={handleLogout}>
                  退出登录
                </Button>
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
                  <Route path="/company-config" element={<CompanyConfig />} />
                  <Route path="/company-revenue" element={<CompanyRevenue />} />
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

export default App
