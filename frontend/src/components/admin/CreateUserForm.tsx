import { Form, Input, Button, Space, message, Row, Col, Switch, Select } from 'antd'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { userService } from '@/services/user'
import type { CreateNebulaAuthUserRequest, NebulaAuthUser } from '@/services/user'
import type { UserRole } from '@/types'

interface CreateUserFormProps {
  onSuccess?: (user?: NebulaAuthUser) => void
  onCancel?: () => void
}

const CreateUserForm = ({ onSuccess, onCancel }: CreateUserFormProps) => {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  // Create NebulaAuth user mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateNebulaAuthUserRequest) =>
      userService.createNebulaAuthUser(data),
    onSuccess: (newUser) => {
      message.success('用户创建成功')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      form.resetFields()
      onSuccess?.(newUser)
    },
    onError: (error: any) => {
      // Handle 409 Conflict (duplicate email or username)
      if (error?.response?.status === 409) {
        message.error('用户已存在（邮箱或用户名已被使用）')
        if (error?.response?.data?.message?.includes('email')) {
          form.setFields([{ name: 'email', errors: ['邮箱已被使用'] }])
        } else if (error?.response?.data?.message?.includes('username')) {
          form.setFields([{ name: 'username', errors: ['用户名已被使用'] }])
        }
      } else {
        message.error(
          error?.response?.data?.error ||
            error?.response?.data?.message ||
            error?.message ||
            '用户创建失败'
        )
      }
    },
  })

  const handleSubmit = async (values: any) => {
    const createData: CreateNebulaAuthUserRequest = {
      email: values.email,
      phone: values.phone || undefined,
      username: values.username,
      is_verified: values.is_verified ?? false,
      is_active: values.is_active ?? true,
      real_name: values.real_name || undefined,
      role: values.role || undefined,
      department: values.department || undefined,
    }
    createMutation.mutate(createData)
  }

  // 角色选项
  const roleOptions: { label: string; value: UserRole }[] = [
    { label: '普通成员', value: 'member' },
    { label: '项目管理员', value: 'project_manager' },
    { label: '经营负责人', value: 'business_manager' },
    { label: '生产负责人', value: 'production_manager' },
    { label: '财务人员', value: 'finance' },
  ]

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        is_verified: false,
        is_active: true,
      }}
    >
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
            name="phone"
            label="手机号"
            rules={[
              {
                pattern: /^1[3-9]\d{9}$/,
                message: '请输入有效的手机号',
              },
            ]}
          >
            <Input placeholder="请输入手机号（可选）" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="is_verified"
            label="已验证"
            valuePropName="checked"
            tooltip="是否已验证邮箱或手机号"
          >
            <Switch checkedChildren="已验证" unCheckedChildren="未验证" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="is_active"
            label="状态"
            valuePropName="checked"
            tooltip="是否激活账号"
          >
            <Switch checkedChildren="激活" unCheckedChildren="禁用" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="real_name"
            label="真实姓名"
            tooltip="OA系统中的真实姓名（可选，如果为空则使用用户名）"
          >
            <Input placeholder="请输入真实姓名（可选）" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="role"
            label="角色"
            tooltip="OA系统中的角色（可选，如果NebulaAuth用户是管理员则会被覆盖为系统管理员）"
          >
            <Select placeholder="请选择角色（可选）" allowClear>
              {roleOptions.map((option) => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="department"
            label="部门"
            tooltip="OA系统中的部门（可选）"
          >
            <Input placeholder="请输入部门（可选）" />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item>
        <Space>
          <Button
            type="primary"
            htmlType="submit"
            loading={createMutation.isPending}
          >
            创建用户
          </Button>
          <Button onClick={onCancel || (() => form.resetFields())}>取消</Button>
        </Space>
      </Form.Item>
    </Form>
  )
}

export default CreateUserForm

