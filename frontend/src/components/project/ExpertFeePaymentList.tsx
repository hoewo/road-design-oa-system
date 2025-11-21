import { useState } from 'react'
import { Table, Button, Space, message, Tag, Modal } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { businessService } from '@/services/business'
import { ExpertFeePaymentForm } from './ExpertFeePaymentForm'
import type { ExpertFeePayment } from '@/types'
import dayjs from 'dayjs'

interface ExpertFeePaymentListProps {
  projectId: number
}

export const ExpertFeePaymentList = ({
  projectId,
}: ExpertFeePaymentListProps) => {
  const [modalVisible, setModalVisible] = useState(false)
  const [editingPayment, setEditingPayment] = useState<ExpertFeePayment | null>(
    null
  )
  const queryClient = useQueryClient()

  const { data: payments, isLoading } = useQuery({
    queryKey: ['expertFeePayments', projectId],
    queryFn: () => businessService.getExpertFeePayments(projectId),
    enabled: !!projectId,
  })

  const deleteMutation = useMutation({
    mutationFn: (paymentId: number) =>
      businessService.deleteExpertFeePayment(paymentId),
    onSuccess: () => {
      message.success('专家费支付记录删除成功')
      queryClient.invalidateQueries({
        queryKey: ['expertFeePayments', projectId],
      })
    },
    onError: (error: any) => {
      message.error(error.message || '删除失败')
    },
  })

  const handleCreate = () => {
    setEditingPayment(null)
    setModalVisible(true)
  }

  const handleEdit = (payment: ExpertFeePayment) => {
    setEditingPayment(payment)
    setModalVisible(true)
  }

  const handleDelete = (payment: ExpertFeePayment) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除专家费支付记录吗？`,
      onOk: () => {
        deleteMutation.mutate(payment.id)
      },
    })
  }

  const handleModalClose = () => {
    setModalVisible(false)
    setEditingPayment(null)
  }

  const handleSuccess = () => {
    setModalVisible(false)
    setEditingPayment(null)
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
      title: '支付方式',
      dataIndex: 'payment_method',
      key: 'payment_method',
      render: (method: string) => {
        const methodInfo = paymentMethodMap[method] || {
          text: method,
          color: 'default',
        }
        return <Tag color={methodInfo.color}>{methodInfo.text}</Tag>
      },
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `¥${amount.toLocaleString()}`,
    },
    {
      title: '备注',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: ExpertFeePayment) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新建专家费支付
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={payments || []}
        loading={isLoading}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />

      <Modal
        title={editingPayment ? '编辑专家费支付' : '新建专家费支付'}
        open={modalVisible}
        onCancel={handleModalClose}
        footer={null}
        width={600}
        destroyOnHidden
      >
        <ExpertFeePaymentForm
          projectId={projectId}
          paymentId={editingPayment?.id}
          onSuccess={handleSuccess}
          onCancel={handleModalClose}
        />
      </Modal>
    </>
  )
}
