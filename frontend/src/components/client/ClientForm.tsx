import { useState, useEffect } from 'react'
import { Form, Input, Button, Space, message, Row, Col, Switch } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { projectService } from '@/services/project'
import type { Client, CreateClientRequest } from '@/types'

interface ClientFormProps {
  clientId?: number
  onSuccess?: () => void
  onCancel?: () => void
}

const ClientForm = ({ clientId, onSuccess, onCancel }: ClientFormProps) => {
  const [form] = Form.useForm()

  // Load client data if editing
  const { data: client, isLoading: loadingClient } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => projectService.getClient(clientId!),
    enabled: !!clientId,
  })

  const queryClient = useQueryClient()

  // Set form values when client is loaded
  useEffect(() => {
    if (client) {
      form.setFieldsValue({
        client_name: client.client_name,
        contact_name: client.contact_name,
        contact_phone: client.contact_phone,
        email: client.email,
        address: client.address,
        tax_number: client.tax_number,
        bank_account: client.bank_account,
        bank_name: client.bank_name,
        is_active: client.is_active,
      })
    }
  }, [client, form])

  // Create client mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateClientRequest) =>
      projectService.createClient(data),
    onSuccess: () => {
      message.success('甲方创建成功')
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      form.resetFields()
      onSuccess?.()
    },
    onError: (error: any) => {
      message.error(error?.message || '甲方创建失败')
    },
  })

  // Update client mutation
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data: Partial<CreateClientRequest>
    }) => projectService.updateClient(id, data),
    onSuccess: () => {
      message.success('甲方更新成功')
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['client', clientId] })
      onSuccess?.()
    },
    onError: (error: any) => {
      message.error(error?.message || '甲方更新失败')
    },
  })

  const handleSubmit = async (values: any) => {
    if (clientId) {
      // Update existing client
      updateMutation.mutate({ id: clientId, data: values })
    } else {
      // Create new client
      createMutation.mutate(values)
    }
  }

  if (loadingClient) {
    return <div>加载中...</div>
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        is_active: true,
      }}
    >
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="client_name"
            label="甲方名称"
            rules={[{ required: true, message: '请输入甲方名称' }]}
          >
            <Input placeholder="请输入甲方名称" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="contact_name" label="联系人">
            <Input placeholder="请输入联系人" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="contact_phone" label="联系电话">
            <Input placeholder="请输入联系电话" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[{ type: 'email', message: '请输入有效的邮箱地址' }]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="address" label="地址">
        <Input placeholder="请输入地址" />
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="tax_number" label="统一社会信用代码">
            <Input placeholder="请输入统一社会信用代码" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="bank_name" label="开户银行">
            <Input placeholder="请输入开户银行" />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="bank_account" label="银行账号">
        <Input placeholder="请输入银行账号" />
      </Form.Item>

      {clientId && (
        <Form.Item name="is_active" label="状态" valuePropName="checked">
          <Switch checkedChildren="启用" unCheckedChildren="禁用" />
        </Form.Item>
      )}

      <Form.Item>
        <Space>
          <Button
            type="primary"
            htmlType="submit"
            loading={createMutation.isPending || updateMutation.isPending}
          >
            {clientId ? '更新' : '创建'}
          </Button>
          <Button onClick={onCancel || (() => form.resetFields())}>取消</Button>
        </Space>
      </Form.Item>
    </Form>
  )
}

export default ClientForm
