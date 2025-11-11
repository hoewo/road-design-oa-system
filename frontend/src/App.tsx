import { Routes, Route } from 'react-router-dom'
import { Layout } from 'antd'
import ProjectList from './pages/ProjectList'
import ProjectDetail from './pages/ProjectDetail'
import './App.css'

const { Header, Content } = Layout

function App() {
  return (
    <Layout className="min-h-screen">
      <Header className="bg-white shadow-sm">
        <div className="text-xl font-bold text-gray-800">项目管理OA系统</div>
      </Header>
      <Content className="p-6">
        <Routes>
          <Route path="/" element={<ProjectList />} />
          <Route path="/projects" element={<ProjectList />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
        </Routes>
      </Content>
    </Layout>
  )
}

export default App
