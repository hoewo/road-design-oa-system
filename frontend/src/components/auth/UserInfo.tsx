import { Avatar, Dropdown, message } from 'antd'
import { UserOutlined, LogoutOutlined, TeamOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const UserInfo = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // Check if current user is admin (same logic as BasicInfoTab)
  // Only system admin (role: 'admin') can access user management
  const isAdmin = user?.role === 'admin'

  const handleLogout = async () => {
    try {
      await logout()
      message.success('已退出登录')
      navigate('/login')
    } catch (error) {
      message.error('退出登录失败')
    }
  }

  const menuItems = [
    {
      key: 'user-info',
      disabled: true,
      label: user?.real_name || user?.username || '用户',
    },
    ...(isAdmin
      ? [
          {
            key: 'user-management',
            icon: <TeamOutlined />,
            label: '用户管理',
            onClick: () => navigate('/users'),
          },
        ]
      : []),
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ]

  return (
    <Dropdown menu={{ items: menuItems }} placement="bottomRight">
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
