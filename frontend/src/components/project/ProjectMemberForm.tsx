import { useMemo } from 'react'
import { Form, Select, DatePicker, Switch, Button, Card, message } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'

import { userService } from '@/services/user'
import { projectMemberService } from '@/services/projectMember'
import type { MemberRole, User } from '@/types'

const ROLE_OPTIONS: { label: string; value: MemberRole }[] = [
  { label: '专业设计人', value: 'designer' },
  { label: '专业参与人', value: 'participant' },
  { label: '专业复核人', value: 'reviewer' },
  { label: '审核人', value: 'auditor' },
  { label: '审定人', value: 'approver' },
  { label: '经营参与人', value: 'business_personnel' },
]

interface ProjectMemberFormProps {
  projectId: number
  onSuccess?: () => void
}

export const ProjectMemberForm = ({
  projectId,
  onSuccess,
}: ProjectMemberFormProps) => {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const { data: users = [] } = useQuery({
    queryKey: ['activeUsers'],
    queryFn: async () => {
      const response = await userService.listUsers({ page: 1, size: 100 })
      return response.data || []
    },
  })

  const createMutation = useMutation({
    mutationFn: (values: any) =>
      projectMemberService.create(projectId, {
        user_id: values.user_id,
        role: values.role,
        join_date: values.join_date.format('YYYY-MM-DD'),
        leave_date: values.leave_date
          ? values.leave_date.format('YYYY-MM-DD')
          : undefined,
        is_active: values.is_active,
      }),
    onSuccess: () => {
      message.success('成员已添加')
      form.resetFields()
      queryClient.invalidateQueries({ queryKey: ['projectMembers', projectId] })
      onSuccess?.()
    },
    onError: (error: any) => {
      message.error(error?.message || '添加成员失败')
    },
  })

  const userOptions = useMemo(
    () =>
      users.map((user: User) => ({
        label: `${user.real_name} (${user.username})`,
        value: user.id,
      })),
    [users]
  )

  return (
    <Card title="新增成员" size="small" style={{ marginBottom: 16 }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => createMutation.mutate(values)}
        initialValues={{
          is_active: true,
          join_date: dayjs(),
        }}
      >
        <Form.Item
          label="成员"
          name="user_id"
          rules={[{ required: true, message: '请选择成员' }]}
        >
          <Select
            options={userOptions}
            placeholder="选择系统用户"
            showSearch
            filterOption={(input, option) =>
              (option?.label as string)
                ?.toLowerCase()
                .includes(input.toLowerCase())
            }
          />
        </Form.Item>

        <Form.Item
          label="角色"
          name="role"
          rules={[{ required: true, message: '请选择角色' }]}
        >
          <Select options={ROLE_OPTIONS} placeholder="选择角色" />
        </Form.Item>

        <Form.Item
          label="加入时间"
          name="join_date"
          rules={[{ required: true, message: '请选择加入时间' }]}
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label="离开时间" name="leave_date">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          label="状态"
          name="is_active"
          valuePropName="checked"
          tooltip="可以先添加成员，后续再激活"
        >
          <Switch checkedChildren="在岗" unCheckedChildren="离岗" />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={createMutation.isPending}
          >
            添加成员
          </Button>
        </Form.Item>
      </Form>
    </Card>
  )
}
