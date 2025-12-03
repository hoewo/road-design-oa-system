import { useState, useEffect } from 'react'
import {
  Card,
  Button,
  Space,
  message,
  Form,
  Input,
  DatePicker,
  Select,
  Row,
  Col,
} from 'antd'
import { EditOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient, QueryClient } from '@tanstack/react-query'
import { projectService } from '@/services/project'
import { projectMemberService } from '@/services/projectMember'
import type {
  Project,
  ProjectMember,
  User,
  UpdateProjectRequest,
} from '@/types'
import dayjs from 'dayjs'

const { TextArea } = Input
const { Option } = Select

interface BasicInfoTabProps {
  projectId: number
  project: Project | undefined
  projectMembers: ProjectMember[] | undefined
  users: User[]
  queryClient: QueryClient
  onRefetch: () => void
}

export const BasicInfoTab = ({
  projectId,
  project,
  projectMembers,
  users,
  queryClient,
  onRefetch,
}: BasicInfoTabProps) => {
  const [form] = Form.useForm()
  const [isEditing, setIsEditing] = useState(false)

  // Get current managers for form initialization
  const getCurrentBusinessManager = () => {
    const manager = projectMembers
      ?.filter((m) => m.role === 'business_manager' && m.is_active)
      .find(() => true)
    return manager?.user_id || undefined
  }

  const getCurrentProductionManager = () => {
    const manager = projectMembers
      ?.filter((m) => m.role === 'manager' && m.is_active)
      .find(() => true)
    return manager?.user_id || undefined
  }

  // Set form values when project is loaded
  useEffect(() => {
    if (project && !isEditing) {
      form.setFieldsValue({
        project_name: project.project_name,
        project_number: project.project_number,
        start_date: project.start_date ? dayjs(project.start_date) : null,
        project_overview: project.project_overview,
        drawing_unit: project.drawing_unit,
        business_manager_id: getCurrentBusinessManager(),
        production_manager_id: getCurrentProductionManager(),
      })
    }
  }, [project, form, isEditing, projectMembers])

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProjectRequest }) =>
      projectService.updateProject(id, data),
    onError: (error: any) => {
      message.error(error?.message || '项目更新失败')
    },
  })

  const handleEdit = () => {
    // Set form values including managers when entering edit mode
    if (project) {
      form.setFieldsValue({
        project_name: project.project_name,
        project_number: project.project_number,
        start_date: project.start_date ? dayjs(project.start_date) : null,
        project_overview: project.project_overview,
        drawing_unit: project.drawing_unit,
        business_manager_id: getCurrentBusinessManager(),
        production_manager_id: getCurrentProductionManager(),
      })
    }
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    // Reset form to original values
    if (project) {
      form.setFieldsValue({
        project_name: project.project_name,
        project_number: project.project_number,
        start_date: project.start_date ? dayjs(project.start_date) : null,
        project_overview: project.project_overview,
        drawing_unit: project.drawing_unit,
        business_manager_id: getCurrentBusinessManager(),
        production_manager_id: getCurrentProductionManager(),
      })
    }
  }

  // Mutation for updating project members
  const updateManagerMutation = useMutation({
    mutationFn: async ({
      role,
      userId,
    }: {
      role: 'business_manager' | 'manager'
      userId?: number
    }) => {
      // Get current active members with this role
      const currentMembers =
        projectMembers?.filter((m) => m.role === role && m.is_active) || []

      // Deactivate all current members with this role
      for (const member of currentMembers) {
        await projectMemberService.update(member.id, { is_active: false })
      }

      // If a new user is selected, create or activate the member
      if (userId) {
        // Check if member already exists (even if inactive)
        const existingMember = projectMembers?.find(
          (m) => m.user_id === userId && m.role === role
        )

        if (existingMember) {
          // Reactivate existing member
          await projectMemberService.update(existingMember.id, {
            is_active: true,
            join_date: new Date().toISOString().split('T')[0],
          })
        } else {
          // Create new member
          await projectMemberService.create(projectId, {
            user_id: userId,
            role,
            join_date: new Date().toISOString().split('T')[0],
            is_active: true,
          })
        }
      }
    },
  })

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const updateData: UpdateProjectRequest = {
        project_name: values.project_name,
        project_overview: values.project_overview,
        drawing_unit: values.drawing_unit,
      }
      if (values.start_date) {
        updateData.start_date = values.start_date.format('YYYY-MM-DD')
      }

      // Update project basic info
      await updateMutation.mutateAsync({ id: projectId, data: updateData })

      // Update managers
      await Promise.all([
        updateManagerMutation.mutateAsync({
          role: 'business_manager',
          userId: values.business_manager_id,
        }),
        updateManagerMutation.mutateAsync({
          role: 'manager',
          userId: values.production_manager_id,
        }),
      ])

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['projectMembers', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })

      message.success('项目更新成功')
      setIsEditing(false)
      onRefetch()
    } catch (error) {
      console.error('Validation or save failed:', error)
      // Form validation errors are handled by Ant Design Form
      // Only show error message for API errors
      if (error && typeof error === 'object' && 'message' in error) {
        message.error((error as any).message || '保存失败')
      }
    }
  }

  if (isEditing) {
    return (
      <Form form={form} layout="vertical">
        <Card title="基本信息" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="project_name"
                label={
                  <>
                    项目名称 <span style={{ color: 'red' }}>*</span>
                  </>
                }
                rules={[{ required: true, message: '请输入项目名称' }]}
              >
                <Input placeholder="请输入项目名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="project_number"
                label={
                  <>
                    项目编号 <span style={{ color: 'red' }}>*</span>
                  </>
                }
                rules={[{ required: true, message: '项目编号不能为空' }]}
              >
                <Input placeholder="项目编号" disabled />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="start_date" label="承接日期">
                <DatePicker
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                  placeholder="请选择承接日期"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="drawing_unit" label="出图单位">
                <Input placeholder="请输入出图单位" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="project_overview" label="项目概况">
            <TextArea
              rows={4}
              placeholder="请输入项目概况"
              maxLength={1000}
              showCount
            />
          </Form.Item>
        </Card>

        <Card title="负责人配置">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="business_manager_id" label="经营负责人">
                <Select
                  placeholder="请选择经营负责人"
                  allowClear
                  showSearch
                  filterOption={(input, option) => {
                    const label = option?.label || option?.children
                    return String(label || '')
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }}
                >
                  {users.map((user) => (
                    <Option key={user.id} value={user.id}>
                      {user.real_name || user.username}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="production_manager_id" label="生产负责人">
                <Select
                  placeholder="请选择生产负责人"
                  allowClear
                  showSearch
                  filterOption={(input, option) => {
                    const label = option?.label || option?.children
                    return String(label || '')
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }}
                >
                  {users.map((user) => (
                    <Option key={user.id} value={user.id}>
                      {user.real_name || user.username}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <div style={{ marginTop: 24, textAlign: 'right' }}>
          <Space>
            <Button icon={<CloseOutlined />} onClick={handleCancel}>
              取消
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={
                updateMutation.isPending || updateManagerMutation.isPending
              }
            >
              保存
            </Button>
          </Space>
        </div>
      </Form>
    )
  }

  // View mode
  return (
    <>
      <Card
        title="基本信息"
        extra={
          <Button type="primary" icon={<EditOutlined />} onClick={handleEdit}>
            编辑
          </Button>
        }
        style={{ marginBottom: 24 }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
                项目名称
              </div>
              <div
                style={{
                  padding: '10px',
                  border: '2px solid #e0e0e0',
                  background: '#f9f9f9',
                  borderRadius: '4px',
                }}
              >
                {project?.project_name}
              </div>
            </div>
          </Col>
          <Col span={12}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
                项目编号
              </div>
              <div
                style={{
                  padding: '10px',
                  border: '2px solid #e0e0e0',
                  background: '#f9f9f9',
                  borderRadius: '4px',
                }}
              >
                {project?.project_number}
              </div>
            </div>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
                承接日期
              </div>
              <div
                style={{
                  padding: '10px',
                  border: '2px solid #e0e0e0',
                  background: '#f9f9f9',
                  borderRadius: '4px',
                }}
              >
                {project?.start_date
                  ? new Date(project.start_date).toLocaleDateString('zh-CN')
                  : '-'}
              </div>
            </div>
          </Col>
          <Col span={12}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
                出图单位
              </div>
              <div
                style={{
                  padding: '10px',
                  border: '2px solid #e0e0e0',
                  background: '#f9f9f9',
                  borderRadius: '4px',
                }}
              >
                {project?.drawing_unit || '-'}
              </div>
            </div>
          </Col>
        </Row>

        {project?.project_overview && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 'bold', marginBottom: 8 }}>项目概况</div>
            <div
              style={{
                padding: '10px',
                border: '2px solid #e0e0e0',
                background: '#f9f9f9',
                borderRadius: '4px',
                minHeight: '100px',
              }}
            >
              {project.project_overview}
            </div>
          </div>
        )}
      </Card>

      <Card title="负责人配置">
        <Row gutter={16}>
          <Col span={12}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
                经营负责人
              </div>
              <div
                style={{
                  padding: '10px',
                  border: '2px solid #e0e0e0',
                  background: '#f9f9f9',
                  borderRadius: '4px',
                }}
              >
                {projectMembers
                  ?.filter((m) => m.role === 'business_manager' && m.is_active)
                  .map((m) => m.user?.real_name || m.user?.username)
                  .join('、') || '-'}
              </div>
            </div>
          </Col>
          <Col span={12}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
                生产负责人
              </div>
              <div
                style={{
                  padding: '10px',
                  border: '2px solid #e0e0e0',
                  background: '#f9f9f9',
                  borderRadius: '4px',
                }}
              >
                {projectMembers
                  ?.filter((m) => m.role === 'manager' && m.is_active)
                  .map((m) => m.user?.real_name || m.user?.username)
                  .join('、') || '-'}
              </div>
            </div>
          </Col>
        </Row>
      </Card>
    </>
  )
}
