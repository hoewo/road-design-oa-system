import { useState, useEffect } from 'react'
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Space,
  message,
  Divider,
  Alert,
} from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { businessService } from '@/services/business'
import { projectService } from '@/services/project'
import { permissionService } from '@/services/permission'
import ClientForm from '@/components/client/ClientForm'
import type { Client, ProjectBusiness } from '@/types'

const { Option } = Select

interface ClientSelectModalProps {
  projectId: string | number
  open: boolean
  onCancel: () => void
  onSuccess?: () => void
}

export const ClientSelectModal = ({
  projectId,
  open,
  onCancel,
  onSuccess,
}: ClientSelectModalProps) => {
  const [form] = Form.useForm()
  const [createClientModalVisible, setCreateClientModalVisible] =
    useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [clientSearchValue, setClientSearchValue] = useState('')
  const queryClient = useQueryClient()

  // 检查权限
  const { data: canManage, isLoading: checkingPermission } = useQuery({
    queryKey: ['canManageBusinessInfo', projectId],
    queryFn: () => permissionService.canManageBusinessInfo(projectId),
    enabled: !!projectId && open,
  })

  // 获取项目经营信息
  const { data: businessData } = useQuery({
    queryKey: ['projectBusiness', projectId],
    queryFn: () => businessService.getProjectBusiness(projectId),
    enabled: !!projectId && open && canManage === true,
  })

  // 加载甲方列表
  useEffect(() => {
    if (open) {
      const loadClients = async () => {
        setLoadingClients(true)
        try {
          const response = await projectService.getClients({
            page: 1,
            size: 100,
          })
          const sortedClients = (response.data || []).sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
          setClients(sortedClients)
        } catch (error) {
          console.error('Failed to load clients:', error)
          message.error('加载甲方列表失败')
        } finally {
          setLoadingClients(false)
        }
      }
      loadClients()
    }
  }, [open])

  // 设置表单初始值
  useEffect(() => {
    if (businessData && open) {
      form.setFieldsValue({
        client_id: businessData.client_id || undefined,
        contact_name: businessData.contact_name,
        contact_phone: businessData.contact_phone,
      })
    }
  }, [businessData, form, open])

  // 更新经营信息
  const updateMutation = useMutation({
    mutationFn: (data: {
      client_id?: number | null
      contact_name?: string
      contact_phone?: string
    }) => businessService.updateProjectBusiness(projectId, data),
    onSuccess: () => {
      message.success('甲方信息更新成功')
      queryClient.invalidateQueries({
        queryKey: ['projectBusiness', projectId],
      })
      onSuccess?.()
      onCancel()
    },
    onError: (error: any) => {
      message.error(error.message || '更新失败')
    },
  })

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      await updateMutation.mutateAsync({
        client_id: values.client_id || null,
        contact_name: values.contact_name,
        contact_phone: values.contact_phone,
      })
    } catch (error) {
      // 表单验证错误
    }
  }

  const handleCreateClient = () => {
    setCreateClientModalVisible(true)
  }

  // 如果正在检查权限，显示加载状态
  if (checkingPermission) {
    return (
      <Modal
        title="选择/创建甲方"
        open={open}
        onCancel={onCancel}
        footer={null}
        width={600}
        destroyOnHidden
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>检查权限中...</div>
      </Modal>
    )
  }

  // 如果没有权限，显示提示信息
  if (canManage === false) {
    return (
      <Modal
        title="选择/创建甲方"
        open={open}
        onCancel={onCancel}
        footer={null}
        width={600}
        destroyOnHidden
      >
        <Alert
          message="无权限"
          description="您没有权限管理此项目的经营信息。只有项目管理员、系统管理员或该项目的经营负责人可以管理甲方信息。"
          type="warning"
          showIcon
        />
      </Modal>
    )
  }

  return (
    <>
      <Modal
        title="选择/创建甲方"
        open={open}
        onCancel={onCancel}
        onOk={handleSubmit}
        confirmLoading={updateMutation.isPending}
        width={600}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
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

          <Form.Item label="联系人姓名" name="contact_name">
            <Input placeholder="请输入联系人姓名" />
          </Form.Item>

          <Form.Item label="联系人电话" name="contact_phone">
            <Input placeholder="请输入联系人电话" />
          </Form.Item>
        </Form>
      </Modal>

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
            // 重新加载甲方列表
            projectService
              .getClients({ page: 1, size: 100 })
              .then((response) => {
                const sortedClients = (response.data || []).sort(
                  (a, b) =>
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime()
                )
                setClients(sortedClients)
                // 获取新创建的甲方（列表第一个）并自动选择
                if (sortedClients.length > 0) {
                  const newClient = sortedClients[0]
                  form.setFieldsValue({ client_id: newClient.id })
                  setCreateClientModalVisible(false)
                  message.success('甲方创建成功，已自动选择')
                }
              })
              .catch(() => {
                message.error('刷新甲方列表失败')
              })
          }}
          onCancel={() => setCreateClientModalVisible(false)}
        />
      </Modal>
    </>
  )
}
