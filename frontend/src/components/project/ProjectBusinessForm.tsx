import { useState, useEffect } from 'react'
import {
  Form,
  Input,
  Select,
  Button,
  Space,
  message,
  Row,
  Col,
  Card,
  Divider,
  Modal,
} from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { businessService } from '@/services/business'
import { projectService } from '@/services/project'
import ClientForm from '@/components/client/ClientForm'
import type {
  ProjectBusiness,
  UpdateProjectBusinessRequest,
  Client,
} from '@/types'

const { Option } = Select

interface ProjectBusinessFormProps {
  projectId: number
  onSuccess?: () => void
}

export const ProjectBusinessForm = ({
  projectId,
  onSuccess,
}: ProjectBusinessFormProps) => {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [clientSearchValue, setClientSearchValue] = useState('')
  const [createClientModalVisible, setCreateClientModalVisible] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  // Load project business data
  const { data: businessData, isLoading } = useQuery({
    queryKey: ['projectBusiness', projectId],
    queryFn: () => businessService.getProjectBusiness(projectId),
    enabled: !!projectId,
  })

  const handleClientLoadError = async () => {
    if (retryCount < 3) {
      setRetryCount((prev) => prev + 1)
      message.warning(`加载失败，正在重试 (${retryCount + 1}/3)`)
      try {
        const response = await projectService.getClients({
          page: 1,
          size: 100,
        })
        setClients(response.data || [])
        setRetryCount(0)
        message.success('重试成功')
      } catch (error) {
        if (retryCount >= 2) {
          message.error('加载失败，请刷新页面重试')
        }
      }
    }
  }

  // Load clients - sorted by created_at DESC, max 100
  useEffect(() => {
    const loadClients = async () => {
      setLoadingClients(true)
      try {
        const response = await projectService.getClients({
          page: 1,
          size: 100,
        })
        // Sort by created_at DESC (backend should already do this, but ensure it)
        const sortedClients = (response.data || []).sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        setClients(sortedClients)
      } catch (error) {
        console.error('Failed to load clients:', error)
        handleClientLoadError()
      } finally {
        setLoadingClients(false)
      }
    }
    loadClients()
  }, [retryCount])

  // Set form values when business data is loaded
  useEffect(() => {
    if (businessData) {
      form.setFieldsValue({
        client_id: businessData.client_id || undefined,
        contact_name: businessData.contact_name,
        contact_phone: businessData.contact_phone,
        business_manager_ids: businessData.business_manager_ids || [],
        business_personnel_ids: businessData.business_personnel_ids || [],
      })
    }
  }, [businessData, form])

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateProjectBusinessRequest) =>
      businessService.updateProjectBusiness(projectId, data),
    onSuccess: () => {
      message.success('项目经营信息更新成功')
      queryClient.invalidateQueries({ queryKey: ['projectBusiness', projectId] })
      onSuccess?.()
    },
    onError: (error: any) => {
      message.error(error.message || '更新失败')
    },
  })

  const handleSubmit = async (values: any) => {
    const data: UpdateProjectBusinessRequest = {
      client_id: values.client_id || null,
      contact_name: values.contact_name,
      contact_phone: values.contact_phone,
      business_manager_ids: values.business_manager_ids || [],
      business_personnel_ids: values.business_personnel_ids || [],
    }
    updateMutation.mutate(data)
  }

  const handleCreateClient = () => {
    setCreateClientModalVisible(true)
  }

  const handleClientCreated = async (newClient: Client) => {
    // Add new client to the list
    setClients((prev) => [newClient, ...prev])
    // Select the new client
    form.setFieldsValue({ client_id: newClient.id })
    setCreateClientModalVisible(false)
    message.success('甲方创建成功，已自动选择')
  }

  if (isLoading) {
    return <div>加载中...</div>
  }

  return (
    <Card title="项目经营信息">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          business_manager_ids: [],
          business_personnel_ids: [],
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="甲方"
              name="client_id"
              tooltip="选择项目关联的甲方，或创建新甲方"
            >
              <Select
                showSearch
                placeholder="选择或搜索甲方"
                allowClear
                loading={loadingClients}
                onSearch={setClientSearchValue}
                filterOption={(input, option) =>
                  (option?.children as string)
                    ?.toLowerCase()
                    .includes(input.toLowerCase())
                }
                notFoundContent={
                  loadingClients ? (
                    <div style={{ padding: '8px', textAlign: 'center' }}>
                      加载中...
                    </div>
                  ) : clients.length === 0 ? (
                    <div style={{ padding: '8px', textAlign: 'center' }}>
                      暂无甲方数据
                    </div>
                  ) : null
                }
                popupRender={(menu) => (
                  <>
                    {menu}
                    <Divider style={{ margin: '8px 0' }} />
                    <Button
                      type="link"
                      block
                      onClick={handleCreateClient}
                    >
                      + 创建新甲方
                    </Button>
                  </>
                )}
              >
                {clients
                  .filter((client) =>
                    clientSearchValue
                      ? client.client_name
                          .toLowerCase()
                          .includes(clientSearchValue.toLowerCase())
                      : true
                  )
                  .map((client) => (
                    <Option key={client.id} value={client.id}>
                      {client.client_name}
                    </Option>
                  ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="联系人姓名" name="contact_name">
              <Input placeholder="请输入联系人姓名" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="联系人电话" name="contact_phone">
              <Input placeholder="请输入联系人电话" />
            </Form.Item>
          </Col>
        </Row>

        <Divider>人员配置</Divider>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="经营负责人"
              name="business_manager_ids"
              tooltip="可以选择多个经营负责人"
            >
              <Select
                mode="multiple"
                placeholder="选择经营负责人"
                allowClear
              >
                {/* TODO: Load users and populate options */}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="经营人员"
              name="business_personnel_ids"
              tooltip="可以选择多个经营人员"
            >
              <Select
                mode="multiple"
                placeholder="选择经营人员"
                allowClear
              >
                {/* TODO: Load users and populate options */}
              </Select>
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
              保存
            </Button>
            <Button onClick={() => form.resetFields()}>重置</Button>
          </Space>
        </Form.Item>
      </Form>

      <Modal
        title="创建新甲方"
        open={createClientModalVisible}
        onCancel={() => setCreateClientModalVisible(false)}
        footer={null}
        width={600}
        destroyOnHidden
      >
        <ClientForm
          onSuccess={() => {
            // Reload clients after creation
            projectService
              .getClients({ page: 1, size: 100 })
              .then((response) => {
                const sortedClients = (response.data || []).sort(
                  (a, b) =>
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime()
                )
                setClients(sortedClients)
                // Get the newly created client (first in list)
                if (sortedClients.length > 0) {
                  handleClientCreated(sortedClients[0])
                }
              })
              .catch(() => {
                message.error('刷新甲方列表失败')
              })
          }}
          onCancel={() => setCreateClientModalVisible(false)}
        />
      </Modal>
    </Card>
  )
}
