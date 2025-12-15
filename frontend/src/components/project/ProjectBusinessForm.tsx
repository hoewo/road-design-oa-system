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
import { userService } from '@/services/user'
import { permissionService } from '@/services/permission'
import ClientForm from '@/components/client/ClientForm'
import UserForm from '@/components/user/UserForm'
import type {
  ProjectBusiness,
  UpdateProjectBusinessRequest,
  Client,
  User,
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
  const [createClientModalVisible, setCreateClientModalVisible] =
    useState(false)
  const [retryCount, setRetryCount] = useState(0)

  // User management state
  const [managerSearchValue, setManagerSearchValue] = useState('')
  const [personnelSearchValue, setPersonnelSearchValue] = useState('')
  const [createUserModalVisible, setCreateUserModalVisible] = useState(false)
  const [editUserModalVisible, setEditUserModalVisible] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [userDropdownType, setUserDropdownType] = useState<
    'manager' | 'personnel' | null
  >(null)

  // 获取可用于配置经营负责人的用户列表（根据权限过滤）
  const { data: businessManagerOptions = [], isLoading: loadingBusinessManagers } = useQuery({
    queryKey: ['availableUsersForManager', 'business'],
    queryFn: () => permissionService.getAvailableUsersForManager('business'),
  })

  // 获取可用于配置项目成员的用户列表（根据权限过滤）
  const { data: memberOptions = [], isLoading: loadingMembers } = useQuery({
    queryKey: ['availableUsersForMember'],
    queryFn: () => permissionService.getAvailableUsersForMember(),
  })

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
        const sortedClients = (response.data || []).sort(
          (a, b) =>
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

  // 注意：用户列表现在通过权限服务获取，不再需要手动加载

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
      queryClient.invalidateQueries({
        queryKey: ['projectBusiness', projectId],
      })
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

  const handleCreateUser = (type: 'manager' | 'personnel') => {
    setUserDropdownType(type)
    setEditingUser(null)
    setCreateUserModalVisible(true)
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setCreateUserModalVisible(false)
    setEditUserModalVisible(true)
  }

  const handleUserCreated = (newUser?: User) => {
    if (newUser) {
      // Select the new user in the appropriate dropdown
      if (userDropdownType === 'manager') {
        const currentManagerIds =
          form.getFieldValue('business_manager_ids') || []
        form.setFieldsValue({
          business_manager_ids: [...currentManagerIds, newUser.id],
        })
      } else if (userDropdownType === 'personnel') {
        const currentPersonnelIds =
          form.getFieldValue('business_personnel_ids') || []
        form.setFieldsValue({
          business_personnel_ids: [...currentPersonnelIds, newUser.id],
        })
      }
      message.success('用户创建成功，已自动选择')
      // 刷新用户列表（通过权限服务）
      queryClient.invalidateQueries({ queryKey: ['availableUsersForManager', 'business'] })
      queryClient.invalidateQueries({ queryKey: ['availableUsersForMember'] })
    }
    setCreateUserModalVisible(false)
    setUserDropdownType(null)
  }

  const handleUserUpdated = () => {
    // 刷新用户列表（通过权限服务）
    queryClient.invalidateQueries({ queryKey: ['availableUsersForManager', 'business'] })
    queryClient.invalidateQueries({ queryKey: ['availableUsersForMember'] })
    setEditUserModalVisible(false)
    setEditingUser(null)
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
                    <Button type="link" block onClick={handleCreateClient}>
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
                showSearch
                loading={loadingBusinessManagers}
                onSearch={setManagerSearchValue}
                filterOption={(input, option) =>
                  (option?.children as string)
                    ?.toLowerCase()
                    .includes(input.toLowerCase())
                }
                notFoundContent={
                  loadingBusinessManagers ? (
                    <div style={{ padding: '8px', textAlign: 'center' }}>
                      加载中...
                    </div>
                  ) : businessManagerOptions.length === 0 ? (
                    <div style={{ padding: '8px', textAlign: 'center' }}>
                      暂无可用用户（仅显示有经营负责人角色的用户）
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
                      onClick={() => handleCreateUser('manager')}
                    >
                      + 新建人员
                    </Button>
                  </>
                )}
              >
                {businessManagerOptions
                  .filter((user) =>
                    managerSearchValue
                      ? user.real_name
                          .toLowerCase()
                          .includes(managerSearchValue.toLowerCase()) ||
                        user.username
                          .toLowerCase()
                          .includes(managerSearchValue.toLowerCase())
                      : true
                  )
                  .map((user) => (
                    <Option key={user.id} value={user.id}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span>
                          {user.real_name} ({user.username})
                        </span>
                        <Button
                          type="link"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditUser(user)
                          }}
                          style={{ padding: 0, marginLeft: 8 }}
                        >
                          编辑
                        </Button>
                      </div>
                    </Option>
                  ))}
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
                showSearch
                loading={loadingMembers}
                onSearch={setPersonnelSearchValue}
                filterOption={(input, option) =>
                  (option?.children as string)
                    ?.toLowerCase()
                    .includes(input.toLowerCase())
                }
                notFoundContent={
                  loadingMembers ? (
                    <div style={{ padding: '8px', textAlign: 'center' }}>
                      加载中...
                    </div>
                  ) : memberOptions.length === 0 ? (
                    <div style={{ padding: '8px', textAlign: 'center' }}>
                      暂无可用用户
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
                      onClick={() => handleCreateUser('personnel')}
                    >
                      + 新建人员
                    </Button>
                  </>
                )}
              >
                {memberOptions
                  .filter((user) =>
                    personnelSearchValue
                      ? user.real_name
                          .toLowerCase()
                          .includes(personnelSearchValue.toLowerCase()) ||
                        user.username
                          .toLowerCase()
                          .includes(personnelSearchValue.toLowerCase())
                      : true
                  )
                  .map((user) => (
                    <Option key={user.id} value={user.id}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span>
                          {user.real_name} ({user.username})
                        </span>
                        <Button
                          type="link"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditUser(user)
                          }}
                          style={{ padding: 0, marginLeft: 8 }}
                        >
                          编辑
                        </Button>
                      </div>
                    </Option>
                  ))}
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
          projectId={projectId}
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

      <Modal
        title="新建人员"
        open={createUserModalVisible}
        onCancel={() => {
          setCreateUserModalVisible(false)
          setUserDropdownType(null)
        }}
        footer={null}
        width={600}
        destroyOnHidden
      >
        <UserForm
          onSuccess={handleUserCreated}
          onCancel={() => {
            setCreateUserModalVisible(false)
            setUserDropdownType(null)
          }}
        />
      </Modal>

      <Modal
        title="编辑人员"
        open={editUserModalVisible}
        onCancel={() => {
          setEditUserModalVisible(false)
          setEditingUser(null)
        }}
        footer={null}
        width={600}
        destroyOnHidden
      >
        {editingUser && (
          <UserForm
            userId={editingUser.id}
            onSuccess={handleUserUpdated}
            onCancel={() => {
              setEditUserModalVisible(false)
              setEditingUser(null)
            }}
          />
        )}
      </Modal>
    </Card>
  )
}
