import { useState } from 'react'
import { Table, Button, Modal, Space, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { productionService } from '@/services/production'
import { ProductionCostForm } from './ProductionCostForm'
import type { ProductionCostType } from '@/types'
import dayjs from 'dayjs'

interface ProductionCostListProps {
  projectId: number
}

const COST_TYPE_LABELS: Record<ProductionCostType, string> = {
  vehicle: '用车',
  accommodation: '住宿',
  transport: '交通',
  other: '其他',
}

export const ProductionCostList = ({ projectId }: ProductionCostListProps) => {
  const [modalVisible, setModalVisible] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['productionCosts', projectId],
    queryFn: () => productionService.listCosts(projectId),
    enabled: !!projectId,
  })

  const handleSuccess = () => {
    setModalVisible(false)
    refetch()
  }

  const costs = data || []
  const total = costs.reduce((sum, cost) => sum + cost.amount, 0)

  const columns = [
    {
      title: '成本类型',
      dataIndex: 'cost_type',
      key: 'cost_type',
      render: (type: ProductionCostType) => (
        <Tag color="blue">{COST_TYPE_LABELS[type] || type}</Tag>
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `¥${amount.toLocaleString()}`,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '发生时间',
      dataIndex: 'incurred_at',
      key: 'incurred_at',
      render: (date: string | undefined) =>
        date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '关联外委',
      dataIndex: ['commission', 'vendor_name'],
      key: 'commission',
      render: (name: string | undefined) => name || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
  ]

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalVisible(true)}
        >
          新建生产成本
        </Button>
        <span style={{ marginLeft: 16, fontWeight: 'bold' }}>
          总成本: ¥{total.toLocaleString()}
        </span>
      </Space>

      <Table
        columns={columns}
        dataSource={costs}
        loading={isLoading}
        rowKey="id"
        pagination={false}
      />

      <Modal
        title="新建生产成本"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <ProductionCostForm projectId={projectId} onSuccess={handleSuccess} />
      </Modal>
    </>
  )
}
