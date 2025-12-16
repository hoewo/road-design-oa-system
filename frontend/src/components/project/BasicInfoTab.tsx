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
import { useMutation, QueryClient, useQuery } from '@tanstack/react-query'
import { projectService } from '@/services/project'
import { permissionService } from '@/services/permission'
import { useAuth } from '@/contexts/AuthContext'
import type {
  Project,
  ProjectMember,
  UpdateProjectRequest,
} from '@/types'
import dayjs from 'dayjs'

const { TextArea } = Input
const { Option } = Select

interface BasicInfoTabProps {
  projectId: string
  project: Project | undefined
  projectMembers: ProjectMember[] | undefined
  queryClient: QueryClient
  onRefetch: () => void
}

export const BasicInfoTab = ({
  projectId,
  project,
  projectMembers,
  queryClient,
  onRefetch,
}: BasicInfoTabProps) => {
  const [form] = Form.useForm()
  const [managerForm] = Form.useForm()
  const [isEditing, setIsEditing] = useState(false)
  const [isEditingManagers, setIsEditingManagers] = useState(false)
  const { user: currentUser } = useAuth()

  // 调试日志：Form 实例创建
  useEffect(() => {
    console.log('=== Form 实例创建 ===')
    console.log('form 实例:', form)
    console.log('managerForm 实例:', managerForm)
    console.log('managerForm 是否已连接:', managerForm && typeof managerForm.getFieldsValue === 'function')
  }, [])

  // Check if current user can manage project managers
  // Only project managers (role: 'project_manager') or admins (role: 'admin') can manage project managers
  // 使用权限服务工具函数进行权限检查
  const canManageManagers = permissionService.utils.canManageProjectManagers(currentUser)
  // 检查是否可以编辑项目基本信息（项目管理员或系统管理员）
  const canEditProject = permissionService.utils.canManageProjectManagers(currentUser)

  // 获取可用于配置经营负责人的用户列表（根据权限过滤）
  const { data: businessManagerOptions = [] } = useQuery({
    queryKey: ['availableUsersForManager', 'business'],
    queryFn: () => permissionService.getAvailableUsersForManager('business'),
    enabled: canManageManagers, // 只有有权限的用户才需要获取列表
  })

  // 获取可用于配置生产负责人的用户列表（根据权限过滤）
  const { data: productionManagerOptions = [] } = useQuery({
    queryKey: ['availableUsersForManager', 'production'],
    queryFn: () => permissionService.getAvailableUsersForManager('production'),
    enabled: canManageManagers, // 只有有权限的用户才需要获取列表
  })

  // 调试日志：检查用户权限和状态
  useEffect(() => {
    console.log('=== BasicInfoTab 调试信息 ===')
    console.log('1. currentUser:', currentUser)
    console.log('2. currentUser?.role:', currentUser?.role)
    console.log('3. canManageManagers:', canManageManagers)
    console.log('4. isEditing:', isEditing)
    console.log('5. isEditingManagers:', isEditingManagers)
    console.log('6. project:', project)
    console.log('7. project?.business_manager_id:', project?.business_manager_id)
    console.log('8. project?.production_manager_id:', project?.production_manager_id)
    console.log('==========================')
  }, [currentUser, canManageManagers, isEditing, isEditingManagers, project])

  // Get current managers from project model (preferred) or project members (fallback)
  const getCurrentBusinessManager = () => {
    // Get from project model (BusinessManagerID)
    if (project?.business_manager_id) {
      return project.business_manager_id
    }
    return undefined
  }

  const getCurrentProductionManager = () => {
    // Get from project model (ProductionManagerID)
    if (project?.production_manager_id) {
      return project.production_manager_id
    }
    return undefined
  }

  // Set form values when project is loaded
  useEffect(() => {
    if (project && !isEditing && !isEditingManagers) {
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
  }, [project, form, isEditing, isEditingManagers, projectMembers])

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: UpdateProjectRequest }) =>
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
    setIsEditingManagers(false)
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

  const handleEditManagers = () => {
    console.log('=== handleEditManagers 调用 ===')
    console.log('isEditingManagers (调用前):', isEditingManagers)
    console.log('managerForm 实例:', managerForm)
    
    // 先设置编辑状态，让 Form 元素渲染
    setIsEditingManagers(true)
    
    // 使用 setTimeout 确保 Form 已经渲染后再设置值
    setTimeout(() => {
      console.log('setTimeout 回调执行，准备设置表单值')
      if (project) {
        const businessManagerId = getCurrentBusinessManager()
        const productionManagerId = getCurrentProductionManager()
        console.log('准备设置的值:', { businessManagerId, productionManagerId })
        
        try {
          managerForm.setFieldsValue({
            business_manager_id: businessManagerId,
            production_manager_id: productionManagerId,
          })
          console.log('表单值设置成功')
        } catch (error) {
          console.error('设置表单值失败:', error)
        }
      }
    }, 0)
  }

  const handleCancelManagers = () => {
    console.log('=== handleCancelManagers 调用 ===')
    setIsEditingManagers(false)
    // 取消时不需要重置值，因为 Form 会被卸载
    console.log('已退出负责人编辑模式')
  }

  const handleSaveManagers = async () => {
    console.log('=== handleSaveManagers 调用 ===')
    console.log('isEditingManagers:', isEditingManagers)
    console.log('managerForm 实例:', managerForm)
    
    try {
      // Get form values (only manager fields are needed)
      console.log('准备获取表单值...')
      const values = managerForm.getFieldsValue(['business_manager_id', 'production_manager_id'])
      console.log('获取到的表单值:', values)
      const updateData: UpdateProjectRequest = {}

      // Only update managers
      if (values.business_manager_id !== undefined) {
        updateData.business_manager_id = values.business_manager_id || null
      }
      if (values.production_manager_id !== undefined) {
        updateData.production_manager_id = values.production_manager_id || null
      }

      console.log('准备更新的数据:', updateData)
      console.log('projectId:', projectId)

      // Update project (only managers)
      await updateMutation.mutateAsync({ id: projectId, data: updateData })
      console.log('更新成功')

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['projectMembers', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })

      message.success('负责人配置更新成功')
      setIsEditingManagers(false)
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

  // Note: Manager updates are now handled directly through project update API
  // No need for separate project member mutations for managers

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

      // Update managers directly through project update
      if (values.business_manager_id !== undefined) {
        updateData.business_manager_id = values.business_manager_id || null
      }
      if (values.production_manager_id !== undefined) {
        updateData.production_manager_id = values.production_manager_id || null
      }

      // Update project (including managers)
      await updateMutation.mutateAsync({ id: projectId, data: updateData })

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

        {canManageManagers && (
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
                  {businessManagerOptions.map((user) => (
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
                  {productionManagerOptions.map((user) => (
                    <Option key={user.id} value={user.id}>
                      {user.real_name || user.username}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>
        )}

        <div style={{ marginTop: 24, textAlign: 'right' }}>
          <Space>
            <Button icon={<CloseOutlined />} onClick={handleCancel}>
              取消
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={updateMutation.isPending}
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
          canEditProject && (
          <Button type="primary" icon={<EditOutlined />} onClick={handleEdit}>
            编辑
          </Button>
          )
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

        <Card
          title="负责人配置"
          extra={
          canManageManagers && !isEditingManagers && (
              <Button
                type="primary"
                size="small"
                icon={<EditOutlined />}
                onClick={handleEditManagers}
              >
                编辑
              </Button>
            )
          }
        style={{ marginBottom: 24 }}
        >
        {isEditingManagers && canManageManagers ? (
              <Form 
                form={managerForm} 
                layout="vertical"
                onValuesChange={(changedValues, allValues) => {
                  console.log('负责人表单值变化:', { changedValues, allValues })
                }}
              >
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
                      {businessManagerOptions.map((user) => (
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
                      {productionManagerOptions.map((user) => (
                        <Option key={user.id} value={user.id}>
                          {user.real_name || user.username}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <div style={{ marginTop: 16, textAlign: 'right' }}>
                <Space>
                  <Button icon={<CloseOutlined />} onClick={handleCancelManagers}>
                    取消
                  </Button>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSaveManagers}
                    loading={updateMutation.isPending}
                  >
                    保存
                  </Button>
                </Space>
              </div>
              </Form>
          ) : (
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
                    {project?.business_manager
                      ? project.business_manager.real_name ||
                        project.business_manager.username
                      : '-'}
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
                    {project?.production_manager
                      ? project.production_manager.real_name ||
                        project.production_manager.username
                      : '-'}
              </div>
            </div>
          </Col>
        </Row>
          )}
      </Card>
    </>
  )
}
