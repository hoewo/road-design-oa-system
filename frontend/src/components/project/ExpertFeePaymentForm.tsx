import { useEffect } from 'react'
import { Form, Input, InputNumber, Select, Button, Space, message, Row, Col, Card } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { businessService } from '@/services/business'
import type { CreateExpertFeePaymentRequest } from '@/types'

const { Option } = Select
const { TextArea } = Input

interface ExpertFeePaymentFormProps {
  projectId: number
  paymentId?: number
  onSuccess?: () => void
  onCancel?: () => void
}

export const ExpertFeePaymentForm = ({
  projectId,
  paymentId,
  onSuccess,
  onCancel,
}: ExpertFeePaymentFormProps) => {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  // Load existing payment data if editing
  const { data: existingPayment, isLoading: isLoadingPayment } = useQuery({
    queryKey: ['expertFeePayment', paymentId],
    queryFn: () => businessService.getExpertFeePayment(paymentId!),
    enabled: !!paymentId,
  })

  // Set form values when payment data is loaded
  useEffect(() => {
    if (existingPayment) {
      form.setFieldsValue({
        payment_method: existingPayment.payment_method,
        amount: existingPayment.amount,
        expert_name: existingPayment.expert_name,
        expert_id: existingPayment.expert_id || undefined,
        description: existingPayment.description || '',
      })
    }
  }, [existingPayment, form])

  const createMutation = useMutation({
    mutationFn: (data: CreateExpertFeePaymentRequest) =>
      businessService.createExpertFeePayment(projectId, data),
    onSuccess: () => {
      message.success('专家费支付记录创建成功')
      queryClient.invalidateQueries({ queryKey: ['expertFeePayments', projectId] })
      form.resetFields()
      onSuccess?.()
    },
    onError: (error: any) => {
      message.error(error.message || '创建失败')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: CreateExpertFeePaymentRequest) =>
      businessService.updateExpertFeePayment(paymentId!, data),
    onSuccess: () => {
      message.success('专家费支付记录更新成功')
      queryClient.invalidateQueries({ queryKey: ['expertFeePayments', projectId] })
      queryClient.invalidateQueries({ queryKey: ['expertFeePayment', paymentId] })
      onSuccess?.()
    },
    onError: (error: any) => {
      message.error(error.message || '更新失败')
    },
  })

  const handleSubmit = async (values: any) => {
    const data: CreateExpertFeePaymentRequest = {
      payment_method: values.payment_method,
      amount: values.amount,
      expert_name: values.expert_name,
      expert_id: values.expert_id,
      description: values.description,
    }

    if (paymentId) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  const isLoading = isLoadingPayment
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <Card title={paymentId ? '编辑专家费支付' : '新建专家费支付'} loading={isLoading}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="支付方式"
              name="payment_method"
              rules={[{ required: true, message: '请选择支付方式' }]}
            >
              <Select placeholder="选择支付方式">
                <Option value="cash">现金</Option>
                <Option value="transfer">转账</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="金额"
              name="amount"
              rules={[
                { required: true, message: '请输入金额' },
                { type: 'number', min: 0.01, message: '金额必须大于0' },
              ]}
            >
              <InputNumber
                min={0.01}
                precision={2}
                style={{ width: '100%' }}
                placeholder="0.00"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="专家姓名"
              name="expert_name"
              rules={[
                { required: true, message: '请输入专家姓名' },
                { min: 2, message: '专家姓名至少2个字符' },
                { max: 50, message: '专家姓名最多50个字符' },
              ]}
            >
              <Input placeholder="请输入专家姓名" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="专家ID（系统内用户）" name="expert_id">
              <InputNumber
                min={1}
                style={{ width: '100%' }}
                placeholder="可选，如果是系统内用户"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="备注" name="description">
          <TextArea rows={4} placeholder="请输入备注信息" />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={isSubmitting}
            >
              保存
            </Button>
            {onCancel && <Button onClick={onCancel}>取消</Button>}
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}
