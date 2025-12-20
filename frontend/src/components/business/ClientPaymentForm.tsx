import { useEffect } from 'react'
import {
  Form,
  Input,
  InputNumber,
  DatePicker,
  Button,
  Space,
  message,
  Row,
  Col,
  Select,
} from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { businessService } from '@/services/business'
import { projectService } from '@/services/project'
import { permissionService } from '@/services/permission'
import type { CreateFinancialRecordRequest, FinancialRecord } from '@/types'
import dayjs from 'dayjs'

const { TextArea } = Input

interface ClientPaymentFormProps {
  projectId: string
  recordId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

export const ClientPaymentForm = ({
  projectId,
  recordId,
  onSuccess,
  onCancel,
}: ClientPaymentFormProps) => {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  // Check permission
  const { data: canManage } = useQuery({
    queryKey: ['canManageBusinessInfo', projectId],
    queryFn: () => permissionService.canManageBusinessInfo(projectId),
    enabled: !!projectId,
  })

  // Load existing record data if editing
  const { data: existingRecord, isLoading: isLoadingRecord } = useQuery({
    queryKey: ['financialRecord', recordId],
    queryFn: async () => {
      if (!recordId) return null
      const financial = await businessService.getProjectFinancial(projectId)
      return (
        financial?.financial_records?.find((r) => r.id === recordId) || null
      )
    },
    enabled: !!recordId,
  })

  // Load clients for selection
  const { data: clientsResponse } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      return projectService.getClients({ page: 1, size: 100 })
    },
  })
  const clients = clientsResponse?.data || []

  // Set form values when record data is loaded
  useEffect(() => {
    if (existingRecord) {
      form.setFieldsValue({
        client_id: existingRecord.client_id,
        amount: existingRecord.amount,
        occurred_at: existingRecord.occurred_at
          ? dayjs(existingRecord.occurred_at)
          : null,
        description: existingRecord.description,
      })
    }
  }, [existingRecord, form])

  const createMutation = useMutation({
    mutationFn: (data: CreateFinancialRecordRequest) =>
      businessService.createFinancialRecord(projectId, data),
    onSuccess: () => {
      message.success('支付记录创建成功')
      queryClient.invalidateQueries({ queryKey: ['projectFinancial', projectId] })
      form.resetFields()
      onSuccess?.()
    },
    onError: (error: any) => {
      message.error(error.message || '创建失败')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateFinancialRecordRequest>) =>
      businessService.updateFinancialRecord(projectId, recordId!, data),
    onSuccess: () => {
      message.success('支付记录更新成功')
      queryClient.invalidateQueries({ queryKey: ['projectFinancial', projectId] })
      queryClient.invalidateQueries({ queryKey: ['financialRecord', recordId] })
      onSuccess?.()
    },
    onError: (error: any) => {
      message.error(error.message || '更新失败')
    },
  })

  const handleSubmit = async (values: any) => {
    if (!canManage && !recordId) {
      message.error('您没有权限创建支付记录')
      return
    }

    const occurredAt = values.occurred_at
      ? values.occurred_at.format('YYYY-MM-DD')
      : dayjs().format('YYYY-MM-DD')

    const data: CreateFinancialRecordRequest = {
      financial_type: 'client_payment',
      direction: 'income',
      amount: values.amount,
      occurred_at: occurredAt,
      client_id: values.client_id,
      description: values.description,
    }

    if (recordId) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  const isLoading = isLoadingRecord
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  if (canManage === false && !recordId) {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: '#999' }}>
        您没有权限创建支付记录
      </div>
    )
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        occurred_at: dayjs(),
      }}
    >
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="甲方"
            name="client_id"
            rules={[{ required: true, message: '请选择甲方' }]}
          >
            <Select
              placeholder="请选择甲方"
              showSearch
              filterOption={(input, option) => {
                const children = option?.children;
                if (Array.isArray(children)) {
                  return children.some((child: any) => 
                    String(child).toLowerCase().includes(input.toLowerCase())
                  );
                }
                return String(children || '').toLowerCase().includes(input.toLowerCase());
              }}
              disabled={canManage === false}
            >
              {clients.map((client) => (
                <Select.Option key={client.id} value={client.id}>
                  {client.client_name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="支付时间"
            name="occurred_at"
            rules={[{ required: true, message: '请选择支付时间' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
              disabled={canManage === false}
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        label="支付金额"
        name="amount"
        rules={[
          { required: true, message: '请输入支付金额' },
          { type: 'number', min: 0.01, message: '支付金额必须大于0' },
        ]}
      >
        <InputNumber
          style={{ width: '100%' }}
          prefix="¥"
          precision={2}
          placeholder="请输入支付金额"
          disabled={canManage === false}
        />
      </Form.Item>

      <Form.Item name="description" label="备注">
        <TextArea
          rows={3}
          placeholder="请输入备注信息（可选）"
          disabled={canManage === false}
        />
      </Form.Item>

      <Form.Item>
        <Space>
          {canManage && (
            <Button
              type="primary"
              htmlType="submit"
              loading={isSubmitting}
              disabled={isLoading}
            >
              {recordId ? '更新' : '提交'}
            </Button>
          )}
          {onCancel && <Button onClick={onCancel}>取消</Button>}
        </Space>
      </Form.Item>
    </Form>
  )
}

