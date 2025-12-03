import { useState } from 'react'
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  Modal,
  Form,
  DatePicker,
  Select,
  Switch,
  Popconfirm,
  message,
} from 'antd'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'

import { projectMemberService } from '@/services/projectMember'
import type { MemberRole, ProjectMember } from '@/types'

const ROLE_LABELS: Record<MemberRole, string> = {
  manager: '项目负责人',
  designer: '专业设计人',
  participant: '专业参与人',
  reviewer: '专业复核人',
  auditor: '审核/审定',
  business_manager: '经营负责人',
  business_personnel: '经营人员',
}

interface ProjectMemberListProps {
  projectId: number
}

export const ProjectMemberList = ({ projectId }: ProjectMemberListProps) => {
  const queryClient = useQueryClient()
  const [editingMember, setEditingMember] = useState<ProjectMember | null>(null)
  const [form] = Form.useForm()

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['projectMembers', projectId],
    queryFn: () => projectMemberService.list(projectId),
  })

  const updateMutation = useMutation({
    mutationFn: (values: any) =>
      projectMemberService.update(editingMember!.id, {
        role: values.role,
        join_date: values.join_date
          ? values.join_date.format('YYYY-MM-DD')
          : undefined,
        leave_date: values.leave_date
          ? values.leave_date.format('YYYY-MM-DD')
          : undefined,
        is_active: values.is_active,
      }),
    onSuccess: () => {
      message.success('成员信息已更新')
      queryClient.invalidateQueries({ queryKey: ['projectMembers', projectId] })
      setEditingMember(null)
    },
    onError: (error: any) => {
      message.error(error?.message || '更新失败')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (memberId: number) => projectMemberService.remove(memberId),
    onSuccess: () => {
      message.success('成员已删除')
      queryClient.invalidateQueries({ queryKey: ['projectMembers', projectId] })
    },
    onError: () => message.error('删除成员失败'),
  })

  const openEditModal = (member: ProjectMember) => {
    setEditingMember(member)
    form.setFieldsValue({
      role: member.role,
      join_date: member.join_date ? dayjs(member.join_date) : null,
      leave_date: member.leave_date ? dayjs(member.leave_date) : null,
      is_active: member.is_active,
    })
  }

  const columns = [
    {
      title: '成员',
      dataIndex: 'user',
      render: (user: ProjectMember['user']) =>
        user ? `${user.real_name} (${user.username})` : '未关联',
    },
    {
      title: '角色',
      dataIndex: 'role',
      render: (role: MemberRole) => ROLE_LABELS[role] || role,
    },
    {
      title: '加入时间',
      dataIndex: 'join_date',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '离开时间',
      dataIndex: 'leave_date',
      render: (date?: string) =>
        date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'default'}>
          {active ? '在岗' : '离岗'}
        </Tag>
      ),
    },
    {
      title: '操作',
      render: (_: any, record: ProjectMember) => (
        <Space>
          <Button type="link" onClick={() => openEditModal(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除该成员？"
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Button type="link" danger loading={deleteMutation.isPending}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <Card title="项目成员" size="small">
        <Table
          rowKey="id"
          loading={isLoading}
          columns={columns}
          dataSource={members}
          pagination={false}
        />
      </Card>

      <Modal
        title="编辑成员"
        open={!!editingMember}
        onCancel={() => setEditingMember(null)}
        onOk={() => form.submit()}
        confirmLoading={updateMutation.isPending}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={updateMutation.mutate}>
          <Form.Item label="角色" name="role" rules={[{ required: true }]}>
            <Select
              options={Object.entries(ROLE_LABELS).map(([key, label]) => ({
                label,
                value: key,
              }))}
            />
          </Form.Item>
          <Form.Item label="加入时间" name="join_date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="离开时间" name="leave_date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="当前状态" name="is_active" valuePropName="checked">
            <Switch checkedChildren="在岗" unCheckedChildren="离岗" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
