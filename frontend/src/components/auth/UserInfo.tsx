import { useEffect, useState } from 'react'
import { Avatar, Dropdown, Menu, message } from 'antd'
import { UserOutlined, LogoutOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/services/auth'
import type { User } from '@/types'

const UserInfo = () => {
  const [user, setUser] = useState<User | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const userInfo = await authService.getCurrentUser()
        setUser(userInfo)
      } catch (error) {
        console.error('Failed to fetch user info:', error)
      }
    }
    fetchUserInfo()
  }, [])

  const handleLogout = async () => {
    try {
      await authService.logout()
      message.success('已退出登录')
      navigate('/login')
    } catch (error) {
      message.error('退出登录失败')
    }
  }

  const menu = (
    <Menu>
      <Menu.Item key="user-info" disabled>
        {user?.real_name || user?.username || '用户'}
      </Menu.Item>
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
        退出登录
      </Menu.Item>
    </Menu>
  )

  return (
    <Dropdown overlay={menu} placement="bottomRight">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          gap: '8px',
        }}
      >
        <Avatar icon={<UserOutlined />} src={null} />
        <span>{user?.real_name || user?.username || '用户'}</span>
      </div>
    </Dropdown>
  )
}

export default UserInfo
