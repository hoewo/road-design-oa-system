import { useState } from 'react'
import { Table, Button, Modal, Space, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { productionService } from '@/services/production'
import { ExternalCommissionForm } from './ExternalCommissionForm'
import dayjs from 'dayjs'

interface ExternalCommissionListProps {
  projectId: string | number
}

export const ExternalCommissionList = ({
  projectId,
}: ExternalCommissionListProps) => {
  const [modalVisible, setModalVisible] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['externalCommissions', projectId],
    queryFn: () => productionService.listCommissions(projectId),
    enabled: !!projectId,
  })

  const handleSuccess = () => {
    setModalVisible(false)
    refetch()
  }

  const columns = [
    {
      title: '委托方名称',
      dataIndex: 'vendor_name',
      key: 'vendor_name',
    },
    {
      title: '类型',
      dataIndex: 'vendor_type',
      key: 'vendor_type',
      render: (type: string) => (
        <Tag color={type === 'company' ? 'blue' : 'green'}>
          {type === 'company' ? '公司' : '个人'}
        </Tag>
      ),
    },
    {
      title: '评分',
      dataIndex: 'score',
      key: 'score',
      render: (score: number | undefined) =>
        score !== undefined ? <Tag color="orange">{score}</Tag> : '-',
    },
    {
      title: '支付金额',
      dataIndex: 'payment_amount',
      key: 'payment_amount',
      render: (amount: number) => `¥${amount.toLocaleString()}`,
    },
    {
      title: '支付日期',
      dataIndex: 'payment_date',
      key: 'payment_date',
      render: (date: string | undefined) =>
        date ? dayjs(date).format('YYYY-MM-DD') : '-',
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
          新建对外委托
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={data?.data || []}
        loading={isLoading}
        rowKey="id"
        pagination={{
          total: data?.total || 0,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />

      <Modal
        title="新建对外委托"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        <ExternalCommissionForm
          projectId={projectId}
          onSuccess={handleSuccess}
        />
      </Modal>
    </>
  )
}
