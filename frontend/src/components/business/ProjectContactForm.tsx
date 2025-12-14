import { useState, useEffect } from 'react'
import { Modal, Form, Input, Select, Button, message } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { projectContactService } from '@/services/projectContact'
import { projectService } from '@/services/project'
import type { ProjectContact, Client } from '@/types'

const { Option } = Select

interface ProjectContactFormProps {
  projectId: string
  open: boolean
  onCancel: () => void
  onSuccess?: () => void
  initialData?: ProjectContact | null
}

export const ProjectContactForm = ({
  projectId,
  open,
  onCancel,
  onSuccess,
  initialData,
}: ProjectContactFormProps) => {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(false)

  // Load clients
  useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      setLoadingClients(true)
      try {
        const response = await projectService.getClients({
          page: 1,
          size: 100,
        })
        setClients(response.data || [])
        return response.data || []
      } finally {
        setLoadingClients(false)
      }
    },
    enabled: open,
  })

  // Set form initial values
  useEffect(() => {
    if (initialData && open) {
      form.setFieldsValue({
        client_id: initialData.client_id,
        contact_name: initialData.contact_name,
        contact_phone: initialData.contact_phone,
      })
    } else if (open) {
      form.resetFields()
    }
  }, [initialData, open, form])

  const createOrUpdateMutation = useMutation({
    mutationFn: (data: {
      client_id: string
      contact_name: string
      contact_phone?: string
    }) => projectContactService.createOrUpdateProjectContact(projectId, data),
    onSuccess: () => {
      message.success('项目联系人保存成功')
      queryClient.invalidateQueries({
        queryKey: ['projectContact', projectId],
      })
      queryClient.invalidateQueries({
        queryKey: ['projectBusiness', projectId],
      })
      onSuccess?.()
      onCancel()
    },
    onError: (error: any) => {
      message.error(error.message || '保存失败')
    },
  })

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      await createOrUpdateMutation.mutateAsync({
        client_id: values.client_id,
        contact_name: values.contact_name,
        contact_phone: values.contact_phone,
      })
    } catch (error) {
      // Form validation errors are handled by Ant Design Form
    }
  }

  return (
    <Modal
      title={initialData ? '编辑项目联系人' : '创建项目联系人'}
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={createOrUpdateMutation.isPending}
      width={600}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="甲方"
          name="client_id"
          rules={[{ required: true, message: '请选择甲方' }]}
        >
          <Select
            placeholder="请选择甲方"
            loading={loadingClients}
            showSearch
            filterOption={(input, option) =>
              (option?.children as string)
                ?.toLowerCase()
                .includes(input.toLowerCase())
            }
          >
            {clients.map((client) => (
              <Option key={client.id} value={client.id}>
                {client.client_name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label="联系人姓名"
          name="contact_name"
          rules={[{ required: true, message: '请输入联系人姓名' }]}
        >
          <Input placeholder="请输入联系人姓名" />
        </Form.Item>

        <Form.Item label="联系人电话" name="contact_phone">
          <Input placeholder="请输入联系人电话" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

