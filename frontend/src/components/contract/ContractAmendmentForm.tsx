import {
  Form,
  Input,
  DatePicker,
  Button,
  Space,
  message,
  Row,
  Col,
  Card,
} from 'antd'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { businessService } from '@/services/business'
import type { CreateContractAmendmentRequest } from '@/types'
import dayjs from 'dayjs'

const { TextArea } = Input

interface ContractAmendmentFormProps {
  projectId: number
  contractId: number
  amendmentId?: number
  onSuccess?: () => void
  onCancel?: () => void
}

export const ContractAmendmentForm = ({
  projectId,
  contractId,
  amendmentId,
  onSuccess,
  onCancel,
}: ContractAmendmentFormProps) => {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (data: CreateContractAmendmentRequest) =>
      businessService.createContractAmendment(projectId, contractId, data),
    onSuccess: () => {
      message.success('补充协议创建成功')
      queryClient.invalidateQueries({
        queryKey: ['contractAmendments', projectId, contractId],
      })
      form.resetFields()
      onSuccess?.()
    },
    onError: (error: any) => {
      message.error(error.message || '创建失败')
    },
  })

  const handleSubmit = async (values: any) => {
    const data: CreateContractAmendmentRequest = {
      amendment_number: values.amendment_number,
      sign_date: values.sign_date.format('YYYY-MM-DD'),
      file_path: values.file_path,
      description: values.description,
    }

    createMutation.mutate(data)
  }

  return (
    <Card title={amendmentId ? '编辑补充协议' : '新建补充协议'}>
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="补充协议编号"
              name="amendment_number"
              rules={[{ required: true, message: '请输入补充协议编号' }]}
            >
              <Input placeholder="XIE-YYYY-XXX" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="签订日期"
              name="sign_date"
              rules={[{ required: true, message: '请选择签订日期' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              label="文件路径"
              name="file_path"
              rules={[{ required: true, message: '请输入文件路径' }]}
            >
              <Input placeholder="补充协议文件路径" />
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
              loading={createMutation.isPending}
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
