import { Table, Tag } from 'antd'
import { useQuery } from '@tanstack/react-query'
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
  // 获取专家费支付记录列表
  const { data: payments, isLoading } = useQuery({
    queryKey: ['expertFeePayments', projectId],
    queryFn: () => biddingService.getExpertFeePayments(projectId),
    enabled: !!projectId,
  })

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
  ]

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
  )
}

