import { useEffect } from 'react'
import { Modal, Form, Select, DatePicker, message, Switch } from 'antd'
import { useMutation, useQuery } from '@tanstack/react-query'
import { projectMemberService } from '@/services/projectMember'
import { userService } from '@/services/user'
import { DisciplineSelector } from './DisciplineSelector'
import type { ProjectMember, MemberRole, User } from '@/types'
import dayjs from 'dayjs'

const { Option } = Select

interface DisciplinePersonnelModalProps {
  visible: boolean
  projectId: string
  member?: ProjectMember | null
  disciplineId?: string
  role?: MemberRole
  onCancel: () => void
  onSuccess: () => void
}

const PRODUCTION_ROLES: MemberRole[] = ['designer', 'participant', 'reviewer']

export const DisciplinePersonnelModal = ({
  visible,
  projectId,
  member,
  disciplineId: initialDisciplineId,
  role: initialRole,
  onCancel,
  onSuccess,
}: DisciplinePersonnelModalProps) => {
  const [form] = Form.useForm()
  const isEdit = !!member

  useEffect(() => {
    if (visible) {
      if (member) {
        form.setFieldsValue({
          user_id: member.user_id,
          role: member.role,
          discipline_id: member.discipline_id,
          join_date: member.join_date ? dayjs(member.join_date) : dayjs(),
          leave_date: member.leave_date ? dayjs(member.leave_date) : undefined,
          is_active: member.is_active,
        })
      } else {
        form.setFieldsValue({
          role: initialRole || 'designer',
          discipline_id: initialDisciplineId,
          join_date: dayjs(),
          is_active: true,
        })
      }
    }
  }, [visible, member, initialDisciplineId, initialRole, form])

  // 获取所有用户
  const { data: usersData } = useQuery({
    queryKey: ['activeUsers'],
    queryFn: async () => {
      const response = await userService.listUsers({
        page: 1,
        size: 1000,
        is_active: true,
      })
      return response.data || []
    },
  })

  const users = usersData || []

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return projectMemberService.create(projectId, {
        user_id: data.user_id,
        role: data.role,
        discipline_id: data.discipline_id,
        join_date: data.join_date.format('YYYY-MM-DD'),
        leave_date: data.leave_date ? data.leave_date.format('YYYY-MM-DD') : undefined,
        is_active: data.is_active !== false,
      })
    },
    onSuccess: () => {
      message.success('添加生产人员成功')
      onSuccess()
    },
    onError: (error: any) => {
      message.error(error.message || '添加生产人员失败')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!member) throw new Error('成员ID不存在')
      return projectMemberService.update(member.id, {
        role: data.role,
        discipline_id: data.discipline_id,
        join_date: data.join_date.format('YYYY-MM-DD'),
        leave_date: data.leave_date ? data.leave_date.format('YYYY-MM-DD') : undefined,
        is_active: data.is_active !== false,
      })
    },
    onSuccess: () => {
      message.success('更新生产人员成功')
      onSuccess()
    },
    onError: (error: any) => {
      message.error(error.message || '更新生产人员失败')
    },
  })

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (isEdit) {
        await updateMutation.mutateAsync(values)
      } else {
        await createMutation.mutateAsync(values)
      }
    } catch (error) {
      // Form validation error, ignore
    }
  }

  const selectedRole = Form.useWatch('role', form)
  const isProductionRole = selectedRole && PRODUCTION_ROLES.includes(selectedRole as MemberRole)

  return (
    <Modal
      title={isEdit ? '编辑生产人员' : '添加生产人员'}
      open={visible}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={createMutation.isPending || updateMutation.isPending}
      width={600}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          role: 'designer',
          is_active: true,
        }}
      >
        {!isEdit && (
          <Form.Item
            name="user_id"
            label="选择人员"
            rules={[{ required: true, message: '请选择人员' }]}
          >
            <Select 
              placeholder="请选择人员" 
              showSearch 
              filterOption={(input, option) => {
                const label = typeof option?.label === 'string' ? option.label : String(option?.label ?? '')
                return label.toLowerCase().includes(input.toLowerCase())
              }}
            >
              {users.map((user: User) => (
                <Option key={user.id} value={user.id} label={user.real_name || user.username}>
                  {user.real_name || user.username}
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}

        <Form.Item
          name="role"
          label="角色"
          rules={[{ required: true, message: '请选择角色' }]}
        >
          <Select placeholder="请选择角色">
            <Option value="designer">设计人</Option>
            <Option value="participant">参与人</Option>
            <Option value="reviewer">复核人</Option>
          </Select>
        </Form.Item>

        {isProductionRole && (
          <Form.Item
            name="discipline_id"
            label="专业"
            rules={[{ required: true, message: '请选择专业' }]}
          >
            <DisciplineSelector
              placeholder="请选择专业"
              allowManage={true}
            />
          </Form.Item>
        )}

        <Form.Item
          name="join_date"
          label="加入日期"
          rules={[{ required: true, message: '请选择加入日期' }]}
        >
          <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
        </Form.Item>

        <Form.Item name="leave_date" label="离开日期">
          <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
        </Form.Item>

        <Form.Item name="is_active" label="状态" valuePropName="checked">
          <Switch checkedChildren="启用" unCheckedChildren="禁用" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

