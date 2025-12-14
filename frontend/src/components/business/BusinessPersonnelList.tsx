import { useState } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  message,
  Modal,
  Select,
  Popconfirm,
  Form,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectMemberService } from '@/services/projectMember'
import { userService } from '@/services/user'
import type { User, ProjectMember } from '@/types'

const { Option } = Select

interface BusinessPersonnelListProps {
  projectId: string
}

export const BusinessPersonnelList = ({
  projectId,
}: BusinessPersonnelListProps) => {
  const [addModalVisible, setAddModalVisible] = useState(false)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  // 获取项目成员（经营参与人）
  const { data: projectMembers } = useQuery({
    queryKey: ['projectMembers', projectId],
    queryFn: () => projectMemberService.list(projectId),
    enabled: !!projectId,
  })

  // 获取所有用户
  const { data: usersData } = useQuery({
    queryKey: ['activeUsers'],
    queryFn: async () => {
      const response = await userService.listUsers({
        page: 1,
        size: 100,
        is_active: true,
      })
      return response.data || []
    },
  })

  // 添加参与人（只允许添加business_personnel角色）
  const addMutation = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      // Check if member already exists
      const existingMember = projectMembers?.find(
        (m) => m.user_id === userId && m.role === 'business_personnel' && m.is_active
      )
      if (existingMember) {
          throw new Error('该人员已在参与人列表中')
        }

      // Create new project member with business_personnel role only
      await projectMemberService.create(projectId, {
        user_id: userId,
        role: 'business_personnel', // 固定使用business_personnel角色
        join_date: new Date().toISOString().split('T')[0],
        is_active: true,
      })
    },
    onSuccess: () => {
      message.success('添加参与人成功')
      queryClient.invalidateQueries({
        queryKey: ['projectMembers', projectId],
      })
      setAddModalVisible(false)
      form.resetFields()
    },
    onError: (error: any) => {
      message.error(error.message || '添加失败')
    },
  })

  // 删除参与人
  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await projectMemberService.remove(memberId)
    },
    onSuccess: () => {
      message.success('删除参与人成功')
      queryClient.invalidateQueries({
        queryKey: ['projectMembers', projectId],
      })
    },
    onError: (error: any) => {
      message.error(error.message || '删除失败')
    },
  })

  const handleAdd = async () => {
    try {
      const values = await form.validateFields()
      if (!values.user_id) {
        message.warning('请选择要添加的人员')
        return
      }
      // 不再需要选择角色，固定使用business_personnel
      addMutation.mutate({
        userId: values.user_id,
      })
    } catch (error) {
      // 表单验证错误
    }
  }

  const handleRemove = (memberId: string) => {
    removeMutation.mutate(memberId)
  }

  // 只获取经营参与人信息（不包含负责人，负责人应在基本信息中显示）
  const businessPersonnel = projectMembers?.filter(
    (m) => m.role === 'business_personnel' && m.is_active
  ) || []
  const users = usersData || []

  // 构建表格数据（只显示经营参与人）
  const tableData = businessPersonnel.map((member) => {
    return {
      id: member.id,
      name:
        member.user?.real_name ||
        member.user?.username ||
        `用户ID: ${member.user_id}`,
      role: '经营参与人',
      memberId: member.id,
      userId: member.user_id,
    }
  })

  // 获取可添加的用户列表（排除已在列表中的人员）
  const existingUserIds = businessPersonnel.map((m) => m.user_id)
  const availableUsers = users.filter((user) => !existingUserIds.includes(user.id))

  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
            <Popconfirm
              title="确定要删除该参与人吗？"
            onConfirm={() => handleRemove(record.memberId)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <Card
        title="经营参与人"
        extra={
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setAddModalVisible(true)}
          >
            添加参与人
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={tableData}
          rowKey="id"
          pagination={false}
        />
      </Card>

      <Modal
        title="添加经营参与人"
        open={addModalVisible}
        onOk={handleAdd}
        onCancel={() => {
          setAddModalVisible(false)
          form.resetFields()
        }}
        confirmLoading={addMutation.isPending}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="人员"
            name="user_id"
            rules={[{ required: true, message: '请选择要添加的人员' }]}
            tooltip="只能添加经营参与人，经营负责人请在项目基本信息中配置"
          >
            <Select
              placeholder="请选择要添加的人员"
              showSearch
              filterOption={(input, option) =>
                (option?.children as string)
                  ?.toLowerCase()
                  .includes(input.toLowerCase())
              }
            >
              {availableUsers.map((user) => (
                <Option key={user.id} value={user.id}>
                  {user.real_name || user.username}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
