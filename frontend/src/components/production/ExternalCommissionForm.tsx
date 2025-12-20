import {
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Button,
  message,
} from 'antd'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { productionService } from '@/services/production'
import type { CreateExternalCommissionRequest } from '@/types'
import dayjs from 'dayjs'

interface ExternalCommissionFormProps {
  projectId: string | number
  onSuccess?: () => void
}

export const ExternalCommissionForm = ({
  projectId,
  onSuccess,
}: ExternalCommissionFormProps) => {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (data: CreateExternalCommissionRequest) =>
      productionService.createCommission(projectId, data),
    onSuccess: () => {
      message.success('对外委托创建成功')
      form.resetFields()
      queryClient.invalidateQueries({
        queryKey: ['externalCommissions', projectId],
      })
      onSuccess?.()
    },
    onError: (error: any) => {
      message.error(error.message || '创建失败')
    },
  })

  const handleFinish = (values: any) => {
    const data: CreateExternalCommissionRequest = {
      vendor_name: values.vendor_name,
      vendor_type: values.vendor_type,
      score: values.score,
      payment_amount: values.payment_amount,
      payment_date: values.payment_date
        ? dayjs(values.payment_date).format('YYYY-MM-DD')
        : undefined,
      notes: values.notes,
    }
    createMutation.mutate(data)
  }

  return (
    <Form form={form} layout="vertical" onFinish={handleFinish}>
      <Form.Item
        name="vendor_name"
        label="委托方名称"
        rules={[{ required: true, message: '请输入委托方名称' }]}
      >
        <Input placeholder="请输入委托方名称" />
      </Form.Item>

      <Form.Item
        name="vendor_type"
        label="类型"
        rules={[{ required: true, message: '请选择类型' }]}
      >
        <Select>
          <Select.Option value="company">公司</Select.Option>
          <Select.Option value="person">个人</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item
        name="score"
        label="评分"
        rules={[{ type: 'number', min: 0, max: 100 }]}
      >
        <InputNumber
          placeholder="请输入评分 (0-100)"
          min={0}
          max={100}
          style={{ width: '100%' }}
        />
      </Form.Item>

      <Form.Item
        name="payment_amount"
        label="支付金额"
        rules={[{ required: true, message: '请输入支付金额' }]}
      >
        <InputNumber
          placeholder="请输入支付金额"
          min={0}
          style={{ width: '100%' }}
          precision={2}
        />
      </Form.Item>

      <Form.Item name="payment_date" label="支付日期">
        <DatePicker style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item name="notes" label="备注">
        <Input.TextArea rows={3} />
      </Form.Item>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={createMutation.isPending}
        >
          提交
        </Button>
      </Form.Item>
    </Form>
  )
}
