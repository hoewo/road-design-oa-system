import { useState } from 'react'
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Select,
  Popconfirm,
  message,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { businessService } from '@/services/business'
import { BonusForm } from './BonusForm'
import type { BonusType, Bonus } from '@/types'
import dayjs from 'dayjs'

interface BonusListProps {
  projectId: string | number
  bonusType?: BonusType
}

export const BonusList = ({ projectId, bonusType }: BonusListProps) => {
  const [modalVisible, setModalVisible] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editingBonus, setEditingBonus] = useState<Bonus | null>(null)
  const [typeFilter, setTypeFilter] = useState<BonusType | 'all'>(
    bonusType || 'all'
  )
  const queryClient = useQueryClient()

  const { data: bonuses, isLoading } = useQuery({
    queryKey: ['bonuses', projectId],
    queryFn: () => businessService.getBonuses(projectId),
    enabled: !!projectId,
  })

  const deleteMutation = useMutation({
    mutationFn: (bonusId: number) => businessService.deleteBonus(bonusId),
    onSuccess: () => {
      message.success('奖金记录删除成功')
      queryClient.invalidateQueries({ queryKey: ['bonuses', projectId] })
    },
    onError: (error: any) => {
      message.error(error.message || '删除失败')
    },
  })

  const handleCreate = () => {
    setEditingBonus(null)
    setModalVisible(true)
  }

  const handleEdit = (bonus: Bonus) => {
    setEditingBonus(bonus)
    setEditModalVisible(true)
  }

  const handleDelete = (bonusId: number) => {
    deleteMutation.mutate(bonusId)
  }

  const handleModalClose = () => {
    setModalVisible(false)
    setEditingBonus(null)
  }

  const handleEditModalClose = () => {
    setEditModalVisible(false)
    setEditingBonus(null)
  }

  const handleSuccess = () => {
    setModalVisible(false)
    queryClient.invalidateQueries({ queryKey: ['bonuses', projectId] })
  }

  const handleEditSuccess = () => {
    setEditModalVisible(false)
    setEditingBonus(null)
    queryClient.invalidateQueries({ queryKey: ['bonuses', projectId] })
  }

  const bonusTypeMap: Record<BonusType, { text: string; color: string }> = {
    business: { text: '经营奖金', color: 'blue' },
    production: { text: '生产奖金', color: 'green' },
  }

  // Filter bonuses by type
  const filteredBonuses =
    typeFilter === 'all'
      ? bonuses || []
      : bonuses?.filter((b) => b.bonus_type === typeFilter) || []

  const columns = [
    {
      title: '奖金类型',
      dataIndex: 'bonus_type',
      key: 'bonus_type',
      render: (type: BonusType) => {
        const typeInfo = bonusTypeMap[type] || { text: type, color: 'default' }
        return <Tag color={typeInfo.color}>{typeInfo.text}</Tag>
      },
    },
    {
      title: '人员',
      dataIndex: 'user',
      key: 'user',
      render: (user: any) => user?.real_name || `用户ID: ${user?.id || ''}`,
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
      width: 120,
      render: (_: any, record: Bonus) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这条奖金记录吗？"
            description="删除后统计数据将自动更新"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新建奖金记录
        </Button>
        <Select
          style={{ width: 150 }}
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { label: '全部类型', value: 'all' },
            { label: '经营奖金', value: 'business' },
            { label: '生产奖金', value: 'production' },
          ]}
        />
      </Space>

      <Table
        columns={columns}
        dataSource={filteredBonuses}
        loading={isLoading}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />

      <Modal
        title="新建奖金记录"
        open={modalVisible}
        onCancel={handleModalClose}
        footer={null}
        width={600}
        destroyOnHidden
      >
        <BonusForm
          projectId={projectId}
          onSuccess={handleSuccess}
          onCancel={handleModalClose}
        />
      </Modal>

      <Modal
        title="编辑奖金记录"
        open={editModalVisible}
        onCancel={handleEditModalClose}
        footer={null}
        width={600}
        destroyOnHidden
      >
        {editingBonus && (
          <BonusForm
            projectId={projectId}
            bonusId={editingBonus.id}
            onSuccess={handleEditSuccess}
            onCancel={handleEditModalClose}
          />
        )}
      </Modal>
    </>
  )
}
