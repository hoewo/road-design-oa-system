import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout, Button } from 'antd'
import { LogoutOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/services/auth'
import Login from './pages/Login'
import ProjectList from './pages/ProjectList'
import ProjectDetail from './pages/ProjectDetail'
import './App.css'

const { Header, Content } = Layout

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
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
            <Layout className="min-h-screen">
              <Header className="bg-white shadow-sm flex justify-between items-center">
                <div className="text-xl font-bold text-gray-800">
                  项目管理OA系统
                </div>
                <Button icon={<LogoutOutlined />} onClick={handleLogout}>
                  退出登录
                </Button>
              </Header>
              <Content className="p-6">
                <Routes>
                  <Route
                    path="/"
                    element={<Navigate to="/projects" replace />}
                  />
                  <Route path="/projects" element={<ProjectList />} />
                  <Route path="/projects/:id" element={<ProjectDetail />} />
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
