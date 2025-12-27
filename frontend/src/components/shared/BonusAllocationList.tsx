import { Table, Button, Space, message, Popconfirm, Empty } from 'antd'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { businessService } from '@/services/business'
import { permissionService } from '@/services/permission'
import type { FinancialRecord } from '@/types'
import dayjs from 'dayjs'

interface BonusAllocationListProps {
  projectId: string
  bonusType: 'business' | 'production'
  canManage?: boolean
  onEdit?: (record: FinancialRecord) => void
}

/**
 * 可复用的奖金分配列表组件
 * 包含表格、加载状态、空状态、错误状态
 * T498: 创建可复用的奖金分配列表组件
 */
export const BonusAllocationList = ({
  projectId,
  bonusType,
  canManage = false,
  onEdit,
}: BonusAllocationListProps) => {
  const queryClient = useQueryClient()

  const { data: financial, isLoading, error } = useQuery({
    queryKey: ['projectFinancial', projectId],
    queryFn: () => businessService.getProjectFinancial(projectId),
    enabled: !!projectId,
  })

  // Filter bonus records by type
  const bonusRecords =
    financial?.financial_records?.filter(
      (r) =>
        r.financial_type === 'bonus' &&
        r.bonus_category === bonusType
    ) || []

  const deleteMutation = useMutation({
    mutationFn: (recordId: string) =>
      businessService.deleteFinancialRecord(projectId, recordId),
    onSuccess: () => {
      message.success('奖金记录删除成功')
      queryClient.invalidateQueries({
        queryKey: ['projectFinancial', projectId],
      })
      // Invalidate statistics query
      queryClient.invalidateQueries({
        queryKey: [bonusType === 'production' ? 'productionBonusStatistics' : 'businessBonusStatistics', projectId],
      })
    },
    onError: (error: any) => {
      message.error(error.message || '删除失败')
    },
  })

  const handleEdit = (record: FinancialRecord) => {
    onEdit?.(record)
  }

  const handleDelete = (recordId: string) => {
    deleteMutation.mutate(recordId)
  }

  const columns = [
    {
      title: '发放时间',
      dataIndex: 'occurred_at',
      key: 'occurred_at',
      render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
    },
    {
      title: '发放人员',
      key: 'recipient',
      render: (_: any, record: FinancialRecord) =>
        record.recipient
          ? record.recipient.real_name || record.recipient.username
          : '-',
    },
    {
      title: '奖金金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `¥${amount.toLocaleString()}`,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: FinancialRecord) => (
        <Space>
          {canManage && (
            <>
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              >
                编辑
              </Button>
              <Popconfirm
                title="确定要删除这条奖金记录吗？"
                onConfirm={() => handleDelete(record.id)}
                okText="确定"
                cancelText="取消"
              >
                <Button type="link" danger icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ]

  // Error state
  if (error) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: '#ff4d4f', marginBottom: 16 }}>
          加载失败，请稍后重试
        </p>
        <Button
          onClick={() => {
            queryClient.invalidateQueries({
              queryKey: ['projectFinancial', projectId],
            })
          }}
        >
          重试
        </Button>
      </div>
    )
  }

  // Empty state
  if (!isLoading && bonusRecords.length === 0) {
    return (
      <Empty
        description="暂无奖金分配记录"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    )
  }

  return (
    <Table
      columns={columns}
      dataSource={bonusRecords}
      loading={isLoading}
      rowKey="id"
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showTotal: (total) => `共 ${total} 条`,
      }}
    />
  )
}

