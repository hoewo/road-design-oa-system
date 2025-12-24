import { useEffect } from 'react'
import { Modal, Form, Select, message } from 'antd'
import { useMutation, useQuery } from '@tanstack/react-query'
import { projectMemberService } from '@/services/projectMember'
import { userService } from '@/services/user'
import type { ProjectMember, MemberRole, User } from '@/types'

const { Option } = Select

interface ReviewerModalProps {
  visible: boolean
  projectId: string
  auditor?: ProjectMember | null // 现有的审核人
  approver?: ProjectMember | null // 现有的审定人
  onCancel: () => void
  onSuccess: () => void
}

export const ReviewerModal = ({
  visible,
  projectId,
  auditor,
  approver,
  onCancel,
  onSuccess,
}: ReviewerModalProps) => {
  const [form] = Form.useForm()

  useEffect(() => {
    if (visible) {
      form.setFieldsValue({
        auditor_id: auditor?.user_id || undefined,
        approver_id: approver?.user_id || undefined,
      })
    }
  }, [visible, auditor, approver, form])

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

  const saveMutation = useMutation({
    mutationFn: async (data: { auditor_id?: string; approver_id?: string }) => {
      // 按顺序执行操作，避免并发问题
      // 先处理所有删除操作，再处理所有创建操作

      // 第一步：收集需要删除的成员ID
      const membersToDelete: string[] = []

      // 处理审核人删除
      if (data.auditor_id) {
        // 如果已存在审核人，且用户变更，需要删除旧的
        if (auditor && data.auditor_id !== auditor.user_id) {
          membersToDelete.push(auditor.id)
        }
      } else if (auditor) {
        // 如果清空了审核人，删除现有的
        membersToDelete.push(auditor.id)
      }

      // 处理审定人删除
      if (data.approver_id) {
        // 如果已存在审定人，且用户变更，需要删除旧的
        if (approver && data.approver_id !== approver.user_id) {
          membersToDelete.push(approver.id)
        }
      } else if (approver) {
        // 如果清空了审定人，删除现有的
        membersToDelete.push(approver.id)
      }

      // 第二步：执行所有删除操作（并行删除，因为它们互不影响）
      if (membersToDelete.length > 0) {
        await Promise.all(membersToDelete.map((id) => projectMemberService.remove(id)))
      }

      // 第三步：执行所有创建操作（按顺序执行，避免唯一性约束冲突）
      // 处理审核人创建
      if (data.auditor_id) {
        // 如果不存在审核人，或者用户已变更（已删除），创建新的
        if (!auditor || data.auditor_id !== auditor.user_id) {
          await projectMemberService.create(projectId, {
            user_id: data.auditor_id,
            role: 'auditor' as MemberRole,
            join_date: new Date().toISOString().split('T')[0],
            is_active: true,
          })
        }
        // 如果用户未变更，不需要更新
      }

      // 处理审定人创建
      if (data.approver_id) {
        // 如果不存在审定人，或者用户已变更（已删除），创建新的
        if (!approver || data.approver_id !== approver.user_id) {
          await projectMemberService.create(projectId, {
            user_id: data.approver_id,
            role: 'approver' as MemberRole,
            join_date: new Date().toISOString().split('T')[0],
            is_active: true,
          })
        }
        // 如果用户未变更，不需要更新
      }
    },
    onSuccess: () => {
      message.success('保存成功')
      onSuccess()
    },
    onError: (error: any) => {
      message.error(error.message || '保存失败')
    },
  })

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      await saveMutation.mutateAsync({
        auditor_id: values.auditor_id,
        approver_id: values.approver_id,
      })
    } catch (error) {
      // Form validation error, ignore
    }
  }

  return (
    <Modal
      title="编辑审核人和审定人"
      open={visible}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={saveMutation.isPending}
      width={600}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          auditor_id: undefined,
          approver_id: undefined,
        }}
      >
        <Form.Item
          name="auditor_id"
          label="审核人"
          rules={[]}
        >
          <Select
            placeholder="请选择审核人（可选）"
            showSearch
            allowClear
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

        <Form.Item
          name="approver_id"
          label="审定人"
          rules={[]}
        >
          <Select
            placeholder="请选择审定人（可选）"
            showSearch
            allowClear
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
      </Form>
    </Modal>
  )
}

