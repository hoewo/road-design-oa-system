import { useState } from 'react'
import {
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Space,
  message,
  Row,
  Col,
  Card,
  DatePicker,
  Modal,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { biddingService } from '@/services/bidding'
import type { CreateExpertFeePaymentRequest } from '@/services/bidding'
import dayjs from 'dayjs'

const { Option } = Select
const { TextArea } = Input

interface ExpertFeeFormProps {
  projectId: string
  onSuccess?: () => void
  canManage?: boolean // 是否可以管理（编辑）
}

export const ExpertFeeForm = ({
  projectId,
  onSuccess,
  canManage = true,
}: ExpertFeeFormProps) => {
  const [form] = Form.useForm()
  const [modalVisible, setModalVisible] = useState(false)
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (data: CreateExpertFeePaymentRequest) =>
      biddingService.createExpertFeePayment(projectId, data),
    onSuccess: () => {
      message.success('专家费支付记录创建成功')
      queryClient.invalidateQueries({
        queryKey: ['biddingInfo', projectId],
      })
      queryClient.invalidateQueries({
        queryKey: ['projectFinancial', projectId],
      })
      queryClient.invalidateQueries({
        queryKey: ['expertFeePayments', projectId],
      })
      form.resetFields()
      setModalVisible(false)
      onSuccess?.()
    },
    onError: (error: any) => {
      message.error(error.message || '创建失败')
    },
  })

  const handleSubmit = async (values: any) => {
    const data: CreateExpertFeePaymentRequest = {
      expert_name: values.expert_name,
      amount: values.amount,
      occurred_at: values.occurred_at
        ? values.occurred_at.format('YYYY-MM-DD')
        : new Date().toISOString().split('T')[0],
      payment_method: values.payment_method,
      description: values.description,
    }

    createMutation.mutate(data)
  }

  // 如果没有权限，完全隐藏按钮
  if (canManage !== true) {
    return null
  }

  return (
    <>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => setModalVisible(true)}
      >
        记录专家费支付
      </Button>

      <Modal
        title="记录专家费支付"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            payment_method: 'transfer',
            occurred_at: dayjs(),
          }}
        >
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
          </Row>

          <Row gutter={16}>
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
            <Col span={12}>
              <Form.Item
                label="支付日期"
                name="occurred_at"
                rules={[{ required: true, message: '请选择支付日期' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                  placeholder="请选择支付日期"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="备注" name="description">
            <TextArea rows={4} placeholder="请输入备注信息（可选）" />
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
              <Button
                onClick={() => {
                  setModalVisible(false)
                  form.resetFields()
                }}
              >
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

