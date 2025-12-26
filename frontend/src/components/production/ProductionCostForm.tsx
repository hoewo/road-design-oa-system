import {
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Button,
  message,
  Upload,
} from 'antd'
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { productionService } from '@/services/production'
import { fileService } from '@/services/file'
import type { CreateProductionCostRequest, ProductionCostType } from '@/types'
import dayjs from 'dayjs'

interface ProductionCostFormProps {
  projectId: string | number
  initialData?: any // 编辑时的初始数据
  onSuccess?: () => void
  onCancel?: () => void
}

const COST_TYPE_LABELS: Record<ProductionCostType, string> = {
  vehicle: '用车',
  accommodation: '住宿',
  transport: '交通',
  other: '其他',
}

export const ProductionCostForm = ({
  projectId,
  initialData,
  onSuccess,
  onCancel,
}: ProductionCostFormProps) => {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (data: CreateProductionCostRequest) =>
      productionService.createCost(projectId, data),
    onSuccess: () => {
      message.success('生产成本创建成功')
      form.resetFields()
      queryClient.invalidateQueries({
        queryKey: ['productionCosts', projectId],
      })
      queryClient.invalidateQueries({
        queryKey: ['productionCostStatistics', projectId],
      })
      onSuccess?.()
    },
    onError: (error: any) => {
      message.error(error.message || '创建失败')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: CreateProductionCostRequest) =>
      productionService.updateCost(projectId, initialData?.id, data),
    onSuccess: () => {
      message.success('生产成本更新成功')
      queryClient.invalidateQueries({
        queryKey: ['productionCosts', projectId],
      })
      queryClient.invalidateQueries({
        queryKey: ['productionCostStatistics', projectId],
      })
      onSuccess?.()
    },
    onError: (error: any) => {
      message.error(error.message || '更新失败')
    },
  })

  const handleFinish = async (values: any) => {
    try {
      let invoiceFileId = values.invoice_file_id

      // 如果有新上传的发票文件，先上传文件
      if (values.invoice_file && values.invoice_file.fileList?.length > 0) {
        const file = values.invoice_file.fileList[0].originFileObj
        if (file) {
          const uploadedFile = await fileService.uploadFile(
            String(projectId),
            file,
            'production',
            '生产成本发票'
          )
          invoiceFileId = uploadedFile.id
        }
      }

      const data: CreateProductionCostRequest = {
        cost_type: values.cost_type,
        amount: values.amount,
        description: values.description,
        incurred_at: values.incurred_at
          ? dayjs(values.incurred_at).format('YYYY-MM-DD')
          : undefined,
        invoice_file_id: invoiceFileId,
      }

      if (initialData) {
        updateMutation.mutate(data)
      } else {
        createMutation.mutate(data)
      }
    } catch (error: any) {
      message.error(error.message || '操作失败')
    }
  }

  const handleRemoveInvoice = () => {
    form.setFieldsValue({ invoice_file_id: undefined, invoice_file: undefined })
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={
        initialData
          ? {
              cost_type: initialData.cost_type,
              amount: initialData.amount,
              description: initialData.description,
              incurred_at: initialData.incurred_at
                ? dayjs(initialData.incurred_at)
                : undefined,
              invoice_file_id: initialData.invoice_file_id,
            }
          : undefined
      }
    >
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
        <Input.TextArea rows={3} placeholder="请输入描述信息（可选）" />
      </Form.Item>

      <Form.Item name="incurred_at" label="发生时间">
        <DatePicker style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item name="invoice_file" label="上传发票（可选）">
        <Upload
          beforeUpload={() => false} // 阻止自动上传
          maxCount={1}
          accept=".pdf,.jpg,.jpeg,.png"
        >
          <Button icon={<UploadOutlined />}>点击上传</Button>
        </Upload>
        {initialData?.invoice_file && (
          <div style={{ marginTop: 8 }}>
            <span>{initialData.invoice_file.original_name || initialData.invoice_file.file_name}</span>
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              onClick={handleRemoveInvoice}
              style={{ marginLeft: 8 }}
            >
              删除
            </Button>
          </div>
        )}
      </Form.Item>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={createMutation.isPending || updateMutation.isPending}
          style={{ marginRight: 8 }}
        >
          {initialData ? '保存' : '提交'}
        </Button>
        {onCancel && (
          <Button onClick={onCancel}>取消</Button>
        )}
      </Form.Item>
    </Form>
  )
}
