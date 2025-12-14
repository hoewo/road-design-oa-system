import { Form, Input, Button, Space, message, Row, Col, Switch, Select } from 'antd'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { userService } from '@/services/user'
import type { UpdateNebulaAuthUserRequest } from '@/services/user'
import type { UserRole, User } from '@/types'
import { useEffect } from 'react'

interface EditUserFormProps {
  user: User
  onSuccess?: (user?: User) => void
  onCancel?: () => void
}

const EditUserForm = ({ user, onSuccess, onCancel }: EditUserFormProps) => {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  // 初始化表单值
  useEffect(() => {
    form.setFieldsValue({
      username: user.username,
      email: user.email,
      phone: user.phone || undefined,
      real_name: user.real_name || undefined,
      role: user.role || undefined,
      department: user.department || undefined,
      is_active: user.is_active ?? true,
    })
  }, [user, form])

  // Update NebulaAuth user mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateNebulaAuthUserRequest) =>
      userService.updateNebulaAuthUser(user.id, data),
    onSuccess: (updatedUser) => {
      message.success('用户信息更新成功')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onSuccess?.(updatedUser)
    },
    onError: (error: any) => {
      message.error(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.message ||
          '用户信息更新失败'
      )
    },
  })

  const handleSubmit = async (values: any) => {
    const updateData: UpdateNebulaAuthUserRequest = {
      username: values.username,
      email: values.email,
      phone: values.phone || undefined,
      is_active: values.is_active ?? true,
      real_name: values.real_name || undefined,
      role: values.role || undefined,
      department: values.department || undefined,
    }
    updateMutation.mutate(updateData)
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
            tooltip="OA系统中的真实姓名（可选）"
          >
            <Input placeholder="请输入真实姓名（可选）" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="role"
            label="角色"
            tooltip="OA系统中的角色（如果NebulaAuth用户是管理员则会被覆盖为系统管理员）"
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
            loading={updateMutation.isPending}
          >
            保存修改
          </Button>
          <Button onClick={onCancel}>取消</Button>
        </Space>
      </Form.Item>
    </Form>
  )
}

export default EditUserForm

