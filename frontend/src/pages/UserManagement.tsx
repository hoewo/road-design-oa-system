import { useState } from 'react'
import {
  Table,
  Button,
  Space,
  Input,
  Select,
  Card,
  Modal,
  message,
  Tag,
  Switch,
} from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userService } from '@/services/user'
import { useAuth } from '@/contexts/AuthContext'
import CreateUserForm from '@/components/admin/CreateUserForm'
import type { User } from '@/types'
import type { CreateNebulaAuthUserRequest, NebulaAuthUser } from '@/services/user'

const { Option } = Select

const UserManagement = () => {
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(
    undefined
  )
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()

  // Check if current user is admin (same logic as BasicInfoTab)
  // Only system admin (role: 'admin') can access user management
  const isAdmin = currentUser?.role === 'admin'

  // Fetch users list
  const {
    data: usersData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['users', page, pageSize, searchKeyword, roleFilter, isActiveFilter],
    queryFn: () =>
      userService.listUsers({
        page,
        size: pageSize,
        keyword: searchKeyword || undefined,
        role: roleFilter || undefined,
        is_active: isActiveFilter,
      }),
    enabled: isAdmin, // Only fetch if user is admin
  })

  // Handle create user success
  const handleCreateSuccess = (user?: NebulaAuthUser) => {
    setCreateModalVisible(false)
    refetch()
    message.success(`用户 ${user?.username || user?.email} 创建成功`)
  }

  // Columns definition
  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '真实姓名',
      dataIndex: 'real_name',
      key: 'real_name',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string) => phone || '-',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const roleMap: Record<string, string> = {
          admin: '系统管理员',
          project_manager: '项目管理员',
          business_manager: '经营负责人',
          production_manager: '生产负责人',
          finance: '财务人员',
          member: '普通成员',
        }
        return <Tag>{roleMap[role] || role}</Tag>
      },
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => {
        if (!date) return '-'
        return new Date(date).toLocaleString('zh-CN')
      },
    },
  ]

  // If not admin, show message
  if (!isAdmin) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <h2>权限不足</h2>
          <p>您没有权限访问用户管理功能，请联系系统管理员。</p>
        </div>
      </Card>
    )
  }

  return (
    <div>
      <Card
        title="用户管理"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            创建用户
          </Button>
        }
      >
        {/* Search and Filter */}
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder="搜索用户名、真实姓名或邮箱"
            prefix={<SearchOutlined />}
            value={searchKeyword}
            onChange={(e) => {
              setSearchKeyword(e.target.value)
              setPage(1) // Reset to first page when searching
            }}
            style={{ width: 300 }}
            allowClear
          />
          <Select
            placeholder="选择角色"
            value={roleFilter}
            onChange={(value) => {
              setRoleFilter(value)
              setPage(1)
            }}
            style={{ width: 150 }}
            allowClear
          >
            <Option value="admin">系统管理员</Option>
            <Option value="project_manager">项目管理员</Option>
            <Option value="business_manager">经营负责人</Option>
            <Option value="production_manager">生产负责人</Option>
            <Option value="finance">财务人员</Option>
            <Option value="member">普通成员</Option>
          </Select>
          <Select
            placeholder="选择状态"
            value={isActiveFilter}
            onChange={(value) => {
              setIsActiveFilter(value)
              setPage(1)
            }}
            style={{ width: 120 }}
            allowClear
          >
            <Option value={true}>启用</Option>
            <Option value={false}>禁用</Option>
          </Select>
        </Space>

        {/* Users Table */}
        <Table
          columns={columns}
          dataSource={usersData?.data || []}
          loading={isLoading}
          rowKey="id"
          pagination={{
            current: page,
            pageSize: pageSize,
            total: usersData?.total || 0,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (newPage, newPageSize) => {
              setPage(newPage)
              setPageSize(newPageSize)
            },
          }}
        />
      </Card>

      {/* Create User Modal */}
      <Modal
        title="创建用户（NebulaAuth）"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={600}
      >
        <CreateUserForm
          onSuccess={handleCreateSuccess}
          onCancel={() => setCreateModalVisible(false)}
        />
      </Modal>
    </div>
  )
}

export default UserManagement

