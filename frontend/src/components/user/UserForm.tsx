import { useEffect } from 'react'
import {
  Form,
  Input,
  Select,
  Button,
  Space,
  message,
  Row,
  Col,
  Switch,
} from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { userService } from '@/services/user'
import type { User, UserRole } from '@/types'
import type { CreateUserRequest, UpdateUserRequest } from '@/services/user'

const { Option } = Select

interface UserFormProps {
  userId?: number | string
  onSuccess?: (user?: User) => void
  onCancel?: () => void
}

const UserForm = ({ userId, onSuccess, onCancel }: UserFormProps) => {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  // Load user data if editing
  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => userService.getUser(String(userId!)),
    enabled: !!userId,
  })

  // Set form values when user is loaded
  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        email: user.email,
        real_name: user.real_name,
        role: user.role,
        department: user.department,
        phone: user.phone,
        is_active: user.is_active,
      })
    }
  }, [user, form])

  // Create user mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateUserRequest) => userService.createUser(data),
    onSuccess: (newUser) => {
      message.success('用户创建成功')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      form.resetFields()
      onSuccess?.(newUser)
    },
    onError: (error: any) => {
      // Handle 409 Conflict (duplicate username or email)
      if (error?.response?.status === 409) {
        message.error('用户名或邮箱已存在')
        if (error?.response?.data?.message?.includes('username')) {
          form.setFields([{ name: 'username', errors: ['用户名已存在'] }])
        } else {
          form.setFields([{ name: 'email', errors: ['邮箱已存在'] }])
        }
      } else {
        message.error(
          error?.response?.data?.message || error?.message || '用户创建失败'
        )
      }
    },
  })

  // Update user mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UpdateUserRequest }) =>
      userService.updateUser(String(id), data),
    onSuccess: (updatedUser) => {
      message.success('用户更新成功')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
      onSuccess?.(updatedUser)
    },
    onError: (error: any) => {
      // Handle 409 Conflict (duplicate email)
      if (error?.response?.status === 409) {
        message.error('邮箱已存在')
        form.setFields([{ name: 'email', errors: ['邮箱已存在'] }])
      } else {
        message.error(
          error?.response?.data?.message || error?.message || '用户更新失败'
        )
      }
    },
  })

  const handleSubmit = async (values: any) => {
    if (userId) {
      // Update existing user
      const updateData: UpdateUserRequest = {
        email: values.email,
        real_name: values.real_name,
        role: values.role,
        department: values.department,
        phone: values.phone,
        is_active: values.is_active,
      }
      updateMutation.mutate({ id: userId, data: updateData })
    } else {
      // Create new user
      const createData: CreateUserRequest = {
        username: values.username,
        email: values.email,
        password: values.password,
        real_name: values.real_name,
        role: values.role,
        department: values.department,
        phone: values.phone,
      }
      createMutation.mutate(createData)
    }
  }

  const roleOptions: { value: UserRole; label: string }[] = [
    { value: 'admin', label: '系统管理员' },
    { value: 'project_manager', label: '项目管理员' },
    { value: 'business_manager', label: '经营负责人' },
    { value: 'production_manager', label: '生产负责人' },
    { value: 'finance', label: '财务人员' },
    { value: 'member', label: '普通成员' },
  ]

  if (loadingUser) {
    return <div>加载中...</div>
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        is_active: true,
        role: 'manager',
      }}
    >
      {!userId && (
        <>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="username"
                label="用户名"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 3, message: '用户名至少3个字符' },
                  { max: 50, message: '用户名最多50个字符' },
                ]}
              >
                <Input placeholder="请输入用户名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="password"
                label="密码"
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 8, message: '密码至少8个字符' },
                ]}
              >
                <Input.Password placeholder="请输入密码" />
              </Form.Item>
            </Col>
          </Row>
        </>
      )}

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="real_name"
            label="真实姓名"
            rules={[{ required: true, message: '请输入真实姓名' }]}
          >
            <Input placeholder="请输入真实姓名" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="请选择角色">
              {roleOptions.map((option) => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="department" label="部门">
            <Input placeholder="请输入部门" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="phone" label="电话">
            <Input placeholder="请输入电话" />
          </Form.Item>
        </Col>
        {userId && (
          <Col span={12}>
            <Form.Item name="is_active" label="状态" valuePropName="checked">
              <Switch checkedChildren="启用" unCheckedChildren="禁用" />
            </Form.Item>
          </Col>
        )}
      </Row>

      <Form.Item>
        <Space>
          <Button
            type="primary"
            htmlType="submit"
            loading={createMutation.isPending || updateMutation.isPending}
          >
            {userId ? '更新' : '创建'}
          </Button>
          <Button onClick={onCancel || (() => form.resetFields())}>取消</Button>
        </Space>
      </Form.Item>
    </Form>
  )
}

export default UserForm
