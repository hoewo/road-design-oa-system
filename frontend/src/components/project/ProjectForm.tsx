import { useState, useEffect } from 'react'
import {
  Form,
  Input,
  DatePicker,
  Select,
  Button,
  Space,
  message,
  Row,
  Col,
  Modal,
} from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { projectService } from '@/services/project'
import type {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectStatus,
} from '@/types'
import dayjs from 'dayjs'
import ClientForm from '@/components/client/ClientForm'

const { TextArea } = Input
const { Option } = Select

interface ProjectFormProps {
  projectId?: number
  onSuccess?: () => void
  onCancel?: () => void
}

const ProjectForm = ({ projectId, onSuccess, onCancel }: ProjectFormProps) => {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const [clients, setClients] = useState<any[]>([])
  const [managers, setManagers] = useState<any[]>([])
  const [clientModalVisible, setClientModalVisible] = useState(false)
  const [clientSearchValue, setClientSearchValue] = useState('')
  const [clientFilter, setClientFilter] = useState<'all' | 'recent'>('all')
  const [recentClientIds, setRecentClientIds] = useState<number[]>([])

  // Load project data if editing
  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.getProject(projectId!),
    enabled: !!projectId,
  })

  // Load clients for selection
  const {
    data: clientsData,
    refetch: refetchClients,
    isError: clientsError,
    isLoading: clientsLoading,
  } = useQuery({
    queryKey: ['clients'],
    queryFn: () => projectService.getClients({ page: 1, size: 100 }),
    retry: 2, // Retry 2 times on failure
  })

  // Update clients state when data is loaded
  useEffect(() => {
    if (clientsData) {
      setClients(clientsData.data || [])
      // Load recent client IDs from localStorage
      const recent = localStorage.getItem('recentClientIds')
      if (recent) {
        try {
          setRecentClientIds(JSON.parse(recent))
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }, [clientsData])

  // Show error message if clients loading fails
  useEffect(() => {
    if (clientsError) {
      message.error('加载甲方列表失败，请点击重试按钮重试')
    }
  }, [clientsError])

  // Filter clients based on search and filter
  const filteredClients = clients.filter((client) => {
    // Apply search filter
    if (clientSearchValue) {
      const searchLower = clientSearchValue.toLowerCase()
      const matchesSearch =
        client.client_name?.toLowerCase().includes(searchLower) ||
        client.contact_name?.toLowerCase().includes(searchLower) ||
        client.contact_phone?.includes(clientSearchValue) ||
        client.email?.toLowerCase().includes(searchLower)
      if (!matchesSearch) return false
    }

    // Apply filter (all or recent)
    if (clientFilter === 'recent') {
      return recentClientIds.includes(client.id)
    }

    return true
  })

  // Set form values when project is loaded
  useEffect(() => {
    if (project) {
      form.setFieldsValue({
        project_name: project.project_name,
        project_number: project.project_number,
        start_date: dayjs(project.start_date),
        project_overview: project.project_overview,
        drawing_unit: project.drawing_unit,
        client_id: project.client_id,
        manager_id: project.manager_id,
        status: project.status,
      })
    }
  }, [project, form])

  // Create project mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateProjectRequest) =>
      projectService.createProject(data),
    onSuccess: () => {
      message.success('项目创建成功')
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      form.resetFields()
      onSuccess?.()
    },
    onError: (error: any) => {
      message.error(error?.message || '项目创建失败')
    },
  })

  // Update project mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProjectRequest }) =>
      projectService.updateProject(id, data),
    onSuccess: () => {
      message.success('项目更新成功')
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      onSuccess?.()
    },
    onError: (error: any) => {
      message.error(error?.message || '项目更新失败')
    },
  })

  // Handle client selection - track recent usage
  const handleClientChange = (clientId: number) => {
    if (clientId) {
      // Add to recent clients
      const recent = [...recentClientIds]
      const index = recent.indexOf(clientId)
      if (index > -1) {
        recent.splice(index, 1)
      }
      recent.unshift(clientId)
      // Keep only last 10
      const updated = recent.slice(0, 10)
      setRecentClientIds(updated)
      localStorage.setItem('recentClientIds', JSON.stringify(updated))
    }
  }

  // Handle client editing when editing project
  const handleClientEdit = async (clientId: number, clientData: any) => {
    try {
      await projectService.updateClient(clientId, clientData)
      message.success('甲方信息更新成功')
      refetchClients()
    } catch (error: any) {
      message.error(error?.message || '甲方信息更新失败')
    }
  }

  const handleSubmit = async (values: any) => {
    if (projectId) {
      // Update existing project
      const updateData: UpdateProjectRequest = {
        project_name: values.project_name,
        project_overview: values.project_overview,
        drawing_unit: values.drawing_unit,
        status: values.status,
      }
      if (values.start_date) {
        updateData.start_date = values.start_date.format('YYYY-MM-DD')
      }

      // If client information is being edited, update client separately
      if (values.client_id && values.client_info) {
        await handleClientEdit(values.client_id, values.client_info)
      }

      updateMutation.mutate({ id: projectId, data: updateData })
    } else {
      // Create new project
      const createData: CreateProjectRequest = {
        project_name: values.project_name,
        project_number: values.project_number,
      }
      // Add optional fields only if they have values
      if (values.project_overview) {
        createData.project_overview = values.project_overview
      }
      if (values.drawing_unit) {
        createData.drawing_unit = values.drawing_unit
      }
      if (values.start_date) {
        createData.start_date = values.start_date.format('YYYY-MM-DD')
      }
      if (values.client_id) {
        createData.client_id = values.client_id
      }
      if (values.manager_id) {
        createData.manager_id = values.manager_id
      }
      createMutation.mutate(createData)
    }
  }

  if (loadingProject) {
    return <div>加载中...</div>
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        status: 'planning',
      }}
    >
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="project_name"
            label="项目名称"
            rules={[{ required: true, message: '请输入项目名称' }]}
          >
            <Input placeholder="请输入项目名称" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="project_number"
            label="项目编号"
            rules={[{ required: !projectId, message: '请输入项目编号' }]}
          >
            <Input placeholder="请输入项目编号" disabled={!!projectId} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="start_date" label="承接日期">
            <DatePicker
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
              placeholder="请选择承接日期（可选）"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="status" label="项目状态">
            <Select placeholder="请选择项目状态（可选）">
              <Option value="planning">规划中</Option>
              <Option value="bidding">招投标</Option>
              <Option value="contract">合同签订</Option>
              <Option value="production">生产中</Option>
              <Option value="completed">已完成</Option>
              <Option value="cancelled">已取消</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="client_id" label="甲方">
            <Select
              placeholder={
                clientsLoading
                  ? '加载中...'
                  : clientsError
                    ? '加载失败，请重试'
                    : '请选择甲方（可选）'
              }
              disabled={!!projectId || clientsLoading}
              loading={clientsLoading}
              showSearch
              searchValue={clientSearchValue}
              onSearch={setClientSearchValue}
              onChange={handleClientChange}
              filterOption={false}
              notFoundContent={
                clientsError ? (
                  <div style={{ padding: '8px', textAlign: 'center' }}>
                    <div style={{ marginBottom: '8px' }}>加载失败</div>
                    <Button
                      type="link"
                      size="small"
                      onClick={() => refetchClients()}
                    >
                      重试
                    </Button>
                  </div>
                ) : filteredClients.length === 0 ? (
                  '暂无数据'
                ) : null
              }
              dropdownRender={(menu) => (
                <>
                  {clients.length > 0 && !clientsError && (
                    <div
                      style={{
                        padding: '8px',
                        borderBottom: '1px solid #f0f0f0',
                      }}
                    >
                      <Space>
                        <Button
                          type={clientFilter === 'all' ? 'primary' : 'default'}
                          size="small"
                          onClick={() => setClientFilter('all')}
                        >
                          全部
                        </Button>
                        <Button
                          type={
                            clientFilter === 'recent' ? 'primary' : 'default'
                          }
                          size="small"
                          onClick={() => setClientFilter('recent')}
                        >
                          最近使用
                        </Button>
                      </Space>
                    </div>
                  )}
                  {menu}
                  {!projectId && (
                    <div
                      style={{ padding: '8px', borderTop: '1px solid #f0f0f0' }}
                    >
                      <Button
                        type="link"
                        block
                        onClick={() => setClientModalVisible(true)}
                      >
                        + 新建甲方
                      </Button>
                    </div>
                  )}
                </>
              )}
            >
              {filteredClients.map((client) => (
                <Option key={client.id} value={client.id}>
                  {client.client_name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          {projectId && project?.client_id && (
            <Form.Item label="编辑甲方信息">
              <Button
                type="link"
                onClick={() => {
                  // Open client edit modal
                  setClientModalVisible(true)
                }}
              >
                编辑关联的甲方信息
              </Button>
            </Form.Item>
          )}
        </Col>
        <Col span={12}>
          <Form.Item name="drawing_unit" label="出图单位">
            <Input placeholder="请输入出图单位（可选）" />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="project_overview" label="项目概况">
        <TextArea
          rows={4}
          placeholder="请输入项目概况（可选）"
          maxLength={1000}
          showCount
        />
      </Form.Item>

      <Form.Item>
        <Space>
          <Button
            type="primary"
            htmlType="submit"
            loading={createMutation.isPending || updateMutation.isPending}
          >
            {projectId ? '更新' : '创建'}
          </Button>
          <Button onClick={onCancel || (() => form.resetFields())}>取消</Button>
        </Space>
      </Form.Item>

      {/* Quick Client Creation/Edit Modal */}
      <Modal
        title={projectId && project?.client_id ? '编辑甲方信息' : '新建甲方'}
        open={clientModalVisible}
        onCancel={() => setClientModalVisible(false)}
        footer={null}
        destroyOnClose
        width={600}
      >
        <ClientForm
          clientId={
            projectId && project?.client_id ? project.client_id : undefined
          }
          onSuccess={() => {
            // ClientForm already shows success message and invalidates queries
            // We just need to refresh the clients list and close the modal
            refetchClients().then((result) => {
              if (result.data?.data && result.data.data.length > 0) {
                if (projectId && project?.client_id) {
                  // Editing existing client - no need to change selection
                } else {
                  // Creating new client - find the most recently created client
                  const sortedClients = [...result.data.data].sort(
                    (a, b) =>
                      new Date(b.created_at).getTime() -
                      new Date(a.created_at).getTime()
                  )
                  if (sortedClients.length > 0) {
                    form.setFieldsValue({ client_id: sortedClients[0].id })
                    handleClientChange(sortedClients[0].id)
                  }
                }
              }
              setClientModalVisible(false)
            })
          }}
          onCancel={() => setClientModalVisible(false)}
        />
      </Modal>
    </Form>
  )
}

export default ProjectForm
