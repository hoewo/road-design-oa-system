import { useState } from 'react'
import { Table, Tag, Button, Modal, Form, Input, InputNumber, Select, DatePicker, message, Space } from 'antd'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { biddingService } from '@/services/bidding'
import type { FinancialRecord } from '@/types'
import dayjs from 'dayjs'

interface ExpertFeePaymentListProps {
  projectId: string
  canManage?: boolean // 是否可以管理（编辑/删除）
}

export const ExpertFeePaymentList = ({
  projectId,
  canManage = false,
}: ExpertFeePaymentListProps) => {
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(null)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  // 获取专家费支付记录列表
  const { data: payments, isLoading } = useQuery({
    queryKey: ['expertFeePayments', projectId],
    queryFn: () => biddingService.getExpertFeePayments(projectId),
    enabled: !!projectId,
  })

  // 更新专家费支付记录
  const updateMutation = useMutation({
    mutationFn: async (data: {
      recordId: string
      expertName?: string
      amount?: number
      occurredAt?: string
      paymentMethod?: 'cash' | 'transfer'
      description?: string
    }) => {
      return biddingService.updateExpertFeePayment(projectId, data.recordId, {
        expert_name: data.expertName,
        amount: data.amount,
        occurred_at: data.occurredAt,
        payment_method: data.paymentMethod,
        description: data.description,
      })
    },
    onSuccess: () => {
      message.success('更新成功')
      queryClient.invalidateQueries({ queryKey: ['expertFeePayments', projectId] })
      setEditModalVisible(false)
      form.resetFields()
      setEditingRecord(null)
    },
    onError: (error: any) => {
      message.error(error.message || '更新失败')
    },
  })

  // 删除专家费支付记录
  const deleteMutation = useMutation({
    mutationFn: async (recordId: string) => {
      return biddingService.deleteExpertFeePayment(projectId, recordId)
    },
    onSuccess: () => {
      message.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['expertFeePayments', projectId] })
    },
    onError: (error: any) => {
      message.error(error.message || '删除失败')
    },
  })

  const handleEdit = (record: FinancialRecord) => {
    setEditingRecord(record)
    form.setFieldsValue({
      expert_name: record.expert_name,
      amount: record.amount,
      occurred_at: record.occurred_at ? dayjs(record.occurred_at) : undefined,
      payment_method: record.payment_method,
      description: record.description,
    })
    setEditModalVisible(true)
  }

  const handleDelete = (record: FinancialRecord) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除专家"${record.expert_name}"的支付记录吗？`,
      onOk: () => {
        deleteMutation.mutate(record.id)
      },
    })
  }

  const handleEditSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (!editingRecord) return

      updateMutation.mutate({
        recordId: editingRecord.id,
        expertName: values.expert_name,
        amount: values.amount,
        occurredAt: values.occurred_at ? values.occurred_at.format('YYYY-MM-DD') : undefined,
        paymentMethod: values.payment_method,
        description: values.description,
      })
    } catch (error) {
      // Form validation failed
    }
  }

  const paymentMethodMap: Record<string, { text: string; color: string }> = {
    cash: { text: '现金', color: 'green' },
    transfer: { text: '转账', color: 'blue' },
  }

  const columns = [
    {
      title: '专家姓名',
      dataIndex: 'expert_name',
      key: 'expert_name',
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
    {
      title: '支付方式',
      dataIndex: 'payment_method',
      key: 'payment_method',
      render: (method: string) => {
        const methodInfo = paymentMethodMap[method] || {
          text: method || '-',
          color: 'default',
        }
        return <Tag color={methodInfo.color}>{methodInfo.text}</Tag>
      },
    },
    {
      title: '支付日期',
      dataIndex: 'occurred_at',
      key: 'occurred_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '备注',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
  ] as any[]

  // 如果有管理权限，添加操作列
  if (canManage) {
    columns.push({
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: FinancialRecord) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      ),
    })
  }

  if (!payments || payments.length === 0) {
    return (
      <div
        style={{
          padding: '20px',
          textAlign: 'center',
          color: '#999',
          border: '1px dashed #d9d9d9',
          borderRadius: '4px',
        }}
      >
        暂无专家费支付记录
      </div>
    )
  }

  return (
    <>
      <Table
        columns={columns}
        dataSource={payments}
        loading={isLoading}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        size="small"
      />

      {/* 编辑表单 Modal */}
      <Modal
        title="编辑专家费支付记录"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false)
          form.resetFields()
          setEditingRecord(null)
        }}
        onOk={handleEditSubmit}
        confirmLoading={updateMutation.isPending}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="专家姓名"
            name="expert_name"
            rules={[{ required: true, message: '请输入专家姓名' }]}
          >
            <Input placeholder="请输入专家姓名" />
          </Form.Item>
          <Form.Item
            label="金额"
            name="amount"
            rules={[
              { required: true, message: '请输入金额' },
              {
                validator: (_: any, value: number) => {
                  if (value === undefined || value === null) {
                    return Promise.reject(new Error('请输入金额'))
                  }
                  if (typeof value !== 'number' || value <= 0) {
                    return Promise.reject(new Error('金额必须大于0'))
                  }
                  return Promise.resolve()
                },
              },
            ]}
          >
            <InputNumber
              min={0.01}
              precision={2}
              style={{ width: '100%' }}
              placeholder="请输入金额"
            />
          </Form.Item>
          <Form.Item
            label="支付方式"
            name="payment_method"
            rules={[{ required: true, message: '请选择支付方式' }]}
          >
            <Select placeholder="请选择支付方式">
              <Select.Option value="cash">现金</Select.Option>
              <Select.Option value="transfer">转账</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            label="支付日期"
            name="occurred_at"
            rules={[{ required: true, message: '请选择支付日期' }]}
          >
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item label="备注" name="description">
            <Input.TextArea rows={3} placeholder="请输入备注信息（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

