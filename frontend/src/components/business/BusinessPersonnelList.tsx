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
  Radio,
  Form,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { businessService } from '@/services/business'
import { userService } from '@/services/user'
import type { User } from '@/types'

const { Option } = Select

interface BusinessPersonnelListProps {
  projectId: number
}

export const BusinessPersonnelList = ({
  projectId,
}: BusinessPersonnelListProps) => {
  const [addModalVisible, setAddModalVisible] = useState(false)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  // 获取项目经营信息
  const { data: businessData } = useQuery({
    queryKey: ['projectBusiness', projectId],
    queryFn: () => businessService.getProjectBusiness(projectId),
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

  // 添加参与人
  const addMutation = useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: number
      role: 'business_manager' | 'business_personnel'
    }) => {
      const currentManagerIds = businessData?.business_manager_ids || []
      const currentPersonnelIds = businessData?.business_personnel_ids || []

      if (role === 'business_manager') {
        if (currentManagerIds.includes(userId)) {
          throw new Error('该人员已是经营负责人')
        }
        await businessService.updateProjectBusiness(projectId, {
          business_manager_ids: [...currentManagerIds, userId],
        })
      } else {
        if (currentPersonnelIds.includes(userId)) {
          throw new Error('该人员已在参与人列表中')
        }
        await businessService.updateProjectBusiness(projectId, {
          business_personnel_ids: [...currentPersonnelIds, userId],
        })
      }
    },
    onSuccess: () => {
      message.success('添加参与人成功')
      queryClient.invalidateQueries({
        queryKey: ['projectBusiness', projectId],
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
    mutationFn: async (userId: number) => {
      const currentPersonnelIds = businessData?.business_personnel_ids || []
      await businessService.updateProjectBusiness(projectId, {
        business_personnel_ids: currentPersonnelIds.filter(
          (id) => id !== userId
        ),
      })
    },
    onSuccess: () => {
      message.success('删除参与人成功')
      queryClient.invalidateQueries({
        queryKey: ['projectBusiness', projectId],
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
      if (!values.role) {
        message.warning('请选择角色')
        return
      }
      addMutation.mutate({
        userId: values.user_id,
        role: values.role,
      })
    } catch (error) {
      // 表单验证错误
    }
  }

  const handleRemove = (userId: number) => {
    removeMutation.mutate(userId)
  }

  // 获取经营负责人和参与人信息
  const managerIds = businessData?.business_manager_ids || []
  const personnelIds = businessData?.business_personnel_ids || []
  const allPersonnelIds = [...managerIds, ...personnelIds]
  const users = usersData || []

  // 构建表格数据
  const tableData = allPersonnelIds.map((userId) => {
    const user = users.find((u) => u.id === userId)
    const isManager = managerIds.includes(userId)
    return {
      id: userId,
      name: user?.real_name || user?.username || `用户ID: ${userId}`,
      role: isManager ? '经营负责人' : '经营参与人',
      userId,
      isManager,
    }
  })

  // 获取可添加的用户列表（排除已在列表中的人员）
  const availableUsers = users.filter(
    (user) => !allPersonnelIds.includes(user.id)
  )

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
          {!record.isManager ? (
            <Popconfirm
              title="确定要删除该参与人吗？"
              onConfirm={() => handleRemove(record.userId)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          ) : (
            <span style={{ color: '#999' }}>-</span>
          )}
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
            label="角色"
            name="role"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Radio.Group>
              <Radio value="business_manager">经营负责人</Radio>
              <Radio value="business_personnel">经营参与人</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            label="人员"
            name="user_id"
            rules={[{ required: true, message: '请选择要添加的人员' }]}
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
