import { useEffect, useMemo } from 'react'
import { Modal, Form, Select, message } from 'antd'
import { useMutation, useQuery } from '@tanstack/react-query'
import { projectMemberService } from '@/services/projectMember'
import { userService } from '@/services/user'
import { DisciplineSelector } from './DisciplineSelector'
import type { ProjectMember, User } from '@/types'

const { Option } = Select

interface DisciplinePersonnelModalProps {
  visible: boolean
  projectId: string
  disciplineId?: string // 专业ID（编辑时传入）
  existingMembers?: ProjectMember[] // 该专业下已有的成员（编辑时传入）
  onCancel: () => void
  onSuccess: () => void
}

export const DisciplinePersonnelModal = ({
  visible,
  projectId,
  disciplineId: initialDisciplineId,
  existingMembers = [],
  onCancel,
  onSuccess,
}: DisciplinePersonnelModalProps) => {
  const [form] = Form.useForm()
  const isEdit = !!initialDisciplineId

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

  // 从已有成员中提取各角色的人员ID
  const existingPersonnel = useMemo(() => {
    const designer = existingMembers.find((m) => m.role === 'designer')
    const participants = existingMembers.filter((m) => m.role === 'participant')
    const reviewer = existingMembers.find((m) => m.role === 'reviewer')

    return {
      designer_id: designer?.user_id || undefined,
      participant_ids: participants.map((m) => m.user_id),
      reviewer_id: reviewer?.user_id || undefined,
    }
  }, [existingMembers])

  useEffect(() => {
    if (visible) {
      if (isEdit) {
        // 编辑模式：填充已有数据
        form.setFieldsValue({
          discipline_id: initialDisciplineId,
          designer_id: existingPersonnel.designer_id,
          participant_ids: existingPersonnel.participant_ids,
          reviewer_id: existingPersonnel.reviewer_id,
        })
      } else {
        // 新增模式：重置表单
        form.setFieldsValue({
          discipline_id: undefined,
          designer_id: undefined,
          participant_ids: [],
          reviewer_id: undefined,
        })
      }
    }
  }, [visible, isEdit, initialDisciplineId, existingPersonnel, form])

  const saveMutation = useMutation({
    mutationFn: async (data: {
      discipline_id: string
      designer_id?: string
      participant_ids?: string[]
      reviewer_id?: string
    }) => {
      const today = new Date().toISOString().split('T')[0]
      const promises: Promise<any>[] = []

      // 收集需要删除的成员ID（已存在但不在新数据中的）
      const membersToDelete: string[] = []

      // 如果专业变更，需要删除旧专业下的所有成员
      const oldDisciplineId = initialDisciplineId
      const newDisciplineId = data.discipline_id
      const disciplineChanged = isEdit && oldDisciplineId && oldDisciplineId !== newDisciplineId

      if (disciplineChanged) {
        // 专业变更，删除旧专业下的所有成员
        existingMembers.forEach((member) => {
          membersToDelete.push(member.id)
        })
        // 清空 existingMembers，因为专业已变更，旧成员不再相关
        // 注意：这里不直接修改 existingMembers，而是在后续逻辑中处理
      }

      // 处理设计人
      if (data.designer_id) {
        if (disciplineChanged) {
          // 专业变更，直接创建新的
          promises.push(
            projectMemberService.create(projectId, {
              user_id: data.designer_id,
              role: 'designer',
              discipline_id: data.discipline_id,
              join_date: today,
              is_active: true,
            })
          )
        } else {
          const existingDesigner = existingMembers.find((m) => m.role === 'designer')
          if (existingDesigner) {
            if (existingDesigner.user_id !== data.designer_id) {
              // 用户变更，删除旧的
              membersToDelete.push(existingDesigner.id)
              // 创建新的
              promises.push(
                projectMemberService.create(projectId, {
                  user_id: data.designer_id,
                  role: 'designer',
                  discipline_id: data.discipline_id,
                  join_date: today,
                  is_active: true,
                })
              )
            }
            // 如果用户未变更，不需要操作
          } else {
            // 不存在，创建新的
            promises.push(
              projectMemberService.create(projectId, {
                user_id: data.designer_id,
                role: 'designer',
                discipline_id: data.discipline_id,
                join_date: today,
                is_active: true,
              })
            )
          }
        }
      } else if (!disciplineChanged) {
        // 清空了设计人，删除现有的（专业未变更时）
        const existingDesigner = existingMembers.find((m) => m.role === 'designer')
        if (existingDesigner) {
          membersToDelete.push(existingDesigner.id)
        }
      }

      // 处理参与人（可能有多个）
      const newParticipantIds = data.participant_ids || []
      if (disciplineChanged) {
        // 专业变更，直接创建新的
        newParticipantIds.forEach((userId) => {
          promises.push(
            projectMemberService.create(projectId, {
              user_id: userId,
              role: 'participant',
              discipline_id: data.discipline_id,
              join_date: today,
              is_active: true,
            })
          )
        })
      } else {
        const existingParticipants = existingMembers.filter((m) => m.role === 'participant')
        const existingParticipantIds = existingParticipants.map((m) => m.user_id)

        // 找出需要删除的参与人（在新数据中不存在的）
        existingParticipants.forEach((member) => {
          if (!newParticipantIds.includes(member.user_id)) {
            membersToDelete.push(member.id)
          }
        })

        // 找出需要创建的参与人（在现有数据中不存在的）
        newParticipantIds.forEach((userId) => {
          if (!existingParticipantIds.includes(userId)) {
            promises.push(
              projectMemberService.create(projectId, {
                user_id: userId,
                role: 'participant',
                discipline_id: data.discipline_id,
                join_date: today,
                is_active: true,
              })
            )
          }
        })
      }

      // 处理复核人
      if (data.reviewer_id) {
        if (disciplineChanged) {
          // 专业变更，直接创建新的
          promises.push(
            projectMemberService.create(projectId, {
              user_id: data.reviewer_id,
              role: 'reviewer',
              discipline_id: data.discipline_id,
              join_date: today,
              is_active: true,
            })
          )
        } else {
          const existingReviewer = existingMembers.find((m) => m.role === 'reviewer')
          if (existingReviewer) {
            if (existingReviewer.user_id !== data.reviewer_id) {
              // 用户变更，删除旧的
              membersToDelete.push(existingReviewer.id)
              // 创建新的
              promises.push(
                projectMemberService.create(projectId, {
                  user_id: data.reviewer_id,
                  role: 'reviewer',
                  discipline_id: data.discipline_id,
                  join_date: today,
                  is_active: true,
                })
              )
            }
            // 如果用户未变更，不需要操作
          } else {
            // 不存在，创建新的
            promises.push(
              projectMemberService.create(projectId, {
                user_id: data.reviewer_id,
                role: 'reviewer',
                discipline_id: data.discipline_id,
                join_date: today,
                is_active: true,
              })
            )
          }
        }
      } else if (!disciplineChanged) {
        // 清空了复核人，删除现有的（专业未变更时）
        const existingReviewer = existingMembers.find((m) => m.role === 'reviewer')
        if (existingReviewer) {
          membersToDelete.push(existingReviewer.id)
        }
      }

      // 先删除所有需要删除的成员
      if (membersToDelete.length > 0) {
        await Promise.all(membersToDelete.map((id) => projectMemberService.remove(id)))
      }

      // 再创建所有需要创建的成员
      if (promises.length > 0) {
        await Promise.all(promises)
      }
    },
    onSuccess: () => {
      message.success(isEdit ? '更新生产人员成功' : '添加生产人员成功')
      onSuccess()
    },
    onError: (error: any) => {
      message.error(error.message || (isEdit ? '更新生产人员失败' : '添加生产人员失败'))
    },
  })

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      await saveMutation.mutateAsync({
        discipline_id: values.discipline_id,
        designer_id: values.designer_id,
        participant_ids: values.participant_ids || [],
        reviewer_id: values.reviewer_id,
      })
    } catch (error) {
      // Form validation error, ignore
    }
  }

  return (
    <Modal
      title={isEdit ? '编辑生产人员' : '添加生产人员'}
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
          designer_id: undefined,
          participant_ids: [],
          reviewer_id: undefined,
        }}
      >
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

        <Form.Item
          name="designer_id"
          label="设计人"
          rules={[]}
        >
          <Select
            placeholder="请选择设计人（可选）"
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
          name="participant_ids"
          label="参与人"
          rules={[]}
        >
          <Select
            mode="multiple"
            placeholder="请选择参与人（可多选，可选）"
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

        <Form.Item
          name="reviewer_id"
          label="复核人"
          rules={[]}
        >
          <Select
            placeholder="请选择复核人（可选）"
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

