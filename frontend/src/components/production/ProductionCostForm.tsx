import {
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Button,
  message,
} from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { productionService } from '@/services/production'
import type { CreateProductionCostRequest, ProductionCostType } from '@/types'
import dayjs from 'dayjs'

interface ProductionCostFormProps {
  projectId: number
  onSuccess?: () => void
}

const COST_TYPE_LABELS: Record<ProductionCostType, string> = {
  vehicle: '用车',
  accommodation: '住宿',
  transport: '交通',
  other: '其他',
}

export const ProductionCostForm = ({
  projectId,
  onSuccess,
}: ProductionCostFormProps) => {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const { data: commissionsData } = useQuery({
    queryKey: ['externalCommissions', projectId],
    queryFn: () => productionService.listCommissions(projectId),
    enabled: !!projectId,
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateProductionCostRequest) =>
      productionService.createCost(projectId, data),
    onSuccess: () => {
      message.success('生产成本创建成功')
      form.resetFields()
      queryClient.invalidateQueries({
        queryKey: ['productionCosts', projectId],
      })
      onSuccess?.()
    },
    onError: (error: any) => {
      message.error(error.message || '创建失败')
    },
  })

  const handleFinish = (values: any) => {
    const data: CreateProductionCostRequest = {
      cost_type: values.cost_type,
      amount: values.amount,
      description: values.description,
      incurred_at: values.incurred_at
        ? dayjs(values.incurred_at).format('YYYY-MM-DD')
        : undefined,
      commission_id: values.commission_id,
    }
    createMutation.mutate(data)
  }

  const commissions = commissionsData?.data || []

  return (
    <Form form={form} layout="vertical" onFinish={handleFinish}>
      <Form.Item
        name="cost_type"
        label="成本类型"
        rules={[{ required: true, message: '请选择成本类型' }]}
      >
        <Select placeholder="请选择成本类型">
          {Object.entries(COST_TYPE_LABELS).map(([value, label]) => (
            <Select.Option key={value} value={value}>
              {label}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="amount"
        label="金额"
        rules={[{ required: true, message: '请输入金额' }]}
      >
        <InputNumber
          placeholder="请输入金额"
          min={0}
          style={{ width: '100%' }}
          precision={2}
        />
      </Form.Item>

      <Form.Item name="description" label="描述">
        <Input.TextArea rows={3} />
      </Form.Item>

      <Form.Item name="incurred_at" label="发生时间">
        <DatePicker style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item name="commission_id" label="关联外委（可选）">
        <Select placeholder="选择关联的外委记录" allowClear>
          {commissions.map((commission) => (
            <Select.Option key={commission.id} value={commission.id}>
              {commission.vendor_name} - ¥{commission.payment_amount}
            </Select.Option>
          ))}
        </Select>
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
