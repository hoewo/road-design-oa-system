import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App.tsx'
import { authService } from './services/auth'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// 应用启动时先初始化认证（刷新Token）
// 解决超过2小时后重新打开网页错误跳转登录页的问题
async function initApp() {
  try {
    // 先刷新Token（如果Refresh Token存在），确保进入应用时Token有效
    await authService.initializeAuth()
  } catch (error) {
    console.error('[App Init] Failed to initialize auth:', error)
  }
}

// 在渲染应用前初始化认证
initApp().then(() => {
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider locale={zhCN}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ConfigProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
})
