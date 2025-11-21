import {
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Space,
  message,
  DatePicker,
  Row,
  Col,
} from 'antd'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { businessService } from '@/services/business'
import type {
  CreateFinancialRecordRequest,
  FinancialType,
  FeeType,
} from '@/types'
import dayjs from 'dayjs'

const { Option } = Select
const { TextArea } = Input

interface FinancialFormProps {
  projectId: number
  onSuccess?: () => void
  onCancel?: () => void
}

export const FinancialForm = ({
  projectId,
  onSuccess,
  onCancel,
}: FinancialFormProps) => {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (data: CreateFinancialRecordRequest) =>
      businessService.createFinancialRecord(projectId, data),
    onSuccess: () => {
      message.success('财务记录创建成功')
      queryClient.invalidateQueries({
        queryKey: ['projectFinancial', projectId],
      })
      form.resetFields()
      onSuccess?.()
    },
    onError: (error: any) => {
      message.error(error.message || '创建失败')
    },
  })

  const handleSubmit = async (values: any) => {
    const data: CreateFinancialRecordRequest = {
      record_type: values.record_type,
      fee_type: values.fee_type,
      receivable_amount: values.receivable_amount,
      invoice_number: values.invoice_number,
      invoice_date: values.invoice_date
        ? values.invoice_date.format('YYYY-MM-DD')
        : undefined,
      invoice_amount: values.invoice_amount || 0,
      payment_date: values.payment_date
        ? values.payment_date.format('YYYY-MM-DD')
        : undefined,
      payment_amount: values.payment_amount || 0,
      description: values.description,
    }

    createMutation.mutate(data)
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        record_type: 'receivable',
        invoice_amount: 0,
        payment_amount: 0,
      }}
    >
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="record_type"
            label="记录类型"
            rules={[{ required: true, message: '请选择记录类型' }]}
          >
            <Select>
              <Option value="receivable">应收</Option>
              <Option value="invoice">开票</Option>
              <Option value="payment">支付</Option>
              <Option value="expense">支出</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="fee_type"
            label="费用类型"
            rules={[{ required: true, message: '请选择费用类型' }]}
          >
            <Select>
              <Option value="design_fee">设计费</Option>
              <Option value="survey_fee">勘察费</Option>
              <Option value="consultation_fee">咨询费</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        name="receivable_amount"
        label="应收金额"
        rules={[
          { required: true, message: '请输入应收金额' },
          { type: 'number', min: 0.01, message: '应收金额必须大于0' },
        ]}
      >
        <InputNumber
          style={{ width: '100%' }}
          prefix="¥"
          precision={2}
          placeholder="请输入应收金额"
        />
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="invoice_number" label="发票号">
            <Input placeholder="请输入发票号" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="invoice_date" label="开票时间">
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        name="invoice_amount"
        label="开票金额"
        rules={[{ type: 'number', min: 0, message: '开票金额不能小于0' }]}
      >
        <InputNumber
          style={{ width: '100%' }}
          prefix="¥"
          precision={2}
          placeholder="请输入开票金额"
        />
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="payment_date" label="支付时间">
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="payment_amount"
            label="支付金额"
            rules={[{ type: 'number', min: 0, message: '支付金额不能小于0' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              prefix="¥"
              precision={2}
              placeholder="请输入支付金额"
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="description" label="备注">
        <TextArea rows={3} placeholder="请输入备注信息" />
      </Form.Item>

      <Form.Item>
        <Space>
          <Button
            type="primary"
            htmlType="submit"
            loading={createMutation.isPending}
          >
            提交
          </Button>
          <Button onClick={onCancel}>取消</Button>
        </Space>
      </Form.Item>
    </Form>
  )
}
