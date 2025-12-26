import { useState } from 'react'
import { Table, Button, Modal, Space, Tag, Card, Empty, Spin, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productionService } from '@/services/production'
import { fileService } from '@/services/file'
import { permissionService } from '@/services/permission'
import { ProductionCostForm } from './ProductionCostForm'
import type { ProductionCostType, ProductionCost } from '@/types'
import dayjs from 'dayjs'

interface ProductionCostListProps {
  projectId: string | number
}

const COST_TYPE_LABELS: Record<ProductionCostType, string> = {
  vehicle: '用车',
  accommodation: '住宿',
  transport: '交通',
  other: '其他',
}

export const ProductionCostList = ({ projectId }: ProductionCostListProps) => {
  const [modalVisible, setModalVisible] = useState(false)
  const [editingCost, setEditingCost] = useState<ProductionCost | null>(null)
  const queryClient = useQueryClient()

  // 检查权限：是否可以管理项目生产信息
  const { data: canManage = false } = useQuery({
    queryKey: ['canManageProductionInfo', projectId],
    queryFn: () => permissionService.canManageProductionInfo(projectId),
    enabled: !!projectId,
  })

  // 获取生产成本列表
  const {
    data: costs,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['productionCosts', projectId],
    queryFn: () => productionService.listCosts(projectId),
    enabled: !!projectId,
  })

  // 获取生产成本统计
  const { data: statistics } = useQuery({
    queryKey: ['productionCostStatistics', projectId],
    queryFn: () => productionService.getCostStatistics(projectId),
    enabled: !!projectId,
  })

  const deleteMutation = useMutation({
    mutationFn: (costId: string) => productionService.deleteCost(projectId, costId),
    onSuccess: () => {
      message.success('删除成功')
      queryClient.invalidateQueries({
        queryKey: ['productionCosts', projectId],
      })
      queryClient.invalidateQueries({
        queryKey: ['productionCostStatistics', projectId],
      })
    },
    onError: (error: any) => {
      message.error(error?.message || '删除失败')
    },
  })

  const handleSuccess = () => {
    setModalVisible(false)
    setEditingCost(null)
    refetch()
  }

  const handleCancel = () => {
    setModalVisible(false)
    setEditingCost(null)
  }

  const handleAdd = () => {
    setEditingCost(null)
    setModalVisible(true)
  }

  const handleEdit = (cost: ProductionCost) => {
    setEditingCost(cost)
    setModalVisible(true)
  }

  const handleDelete = (cost: ProductionCost) => {
    Modal.confirm({
      title: '确认删除',
      content: (
        <div>
          <p>确定要删除这条生产成本记录吗？</p>
          <div style={{ background: '#f9f9f9', padding: 15, borderRadius: 4, marginTop: 15 }}>
            <div><strong>成本类型:</strong> {COST_TYPE_LABELS[cost.cost_type]}</div>
            <div><strong>金额:</strong> ¥{cost.amount.toLocaleString()}</div>
            <div><strong>发生时间:</strong> {cost.incurred_at ? dayjs(cost.incurred_at).format('YYYY-MM-DD') : '-'}</div>
          </div>
          <p style={{ color: '#999', fontSize: 14, marginTop: 15 }}>
            此操作不可恢复，请谨慎操作。
          </p>
        </div>
      ),
      onOk: () => {
        deleteMutation.mutate(cost.id)
      },
    })
  }

  const handleDownloadInvoice = async (fileId: string, fileName?: string) => {
    try {
      await fileService.downloadFile(fileId, fileName)
      message.success('下载成功')
    } catch (error: any) {
      message.error(error?.message || '下载失败')
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  // 加载状态
  if (isLoading) {
    return (
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>生产成本管理</span>
            {canManage && (
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                + 添加成本
              </Button>
            )}
          </div>
        }
      >
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 20, color: '#999' }}>正在加载生产成本数据...</div>
        </div>
      </Card>
    )
  }

  // 错误状态
  if (error) {
    return (
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>生产成本管理</span>
            {canManage && (
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                + 添加成本
              </Button>
            )}
          </div>
        }
      >
        <Empty
          image={<span style={{ fontSize: 48 }}>⚠️</span>}
          description={
            <div>
              <div style={{ fontSize: 18, marginBottom: 10, color: '#d32f2f' }}>加载失败</div>
              <div style={{ color: '#999', marginBottom: 20 }}>
                无法加载生产成本数据，请稍后重试
              </div>
              <Button type="primary" onClick={() => refetch()}>
                重新加载
              </Button>
            </div>
          }
        />
      </Card>
    )
  }

  const costList = costs || []
  const totalCost = statistics?.total_cost || costList.reduce((sum, cost) => sum + cost.amount, 0)
  const recordCount = statistics?.record_count || costList.length

  // 空状态
  if (costList.length === 0) {
    return (
      <>
        <Card
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>生产成本管理</span>
              {canManage && (
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={handleAdd}
                >
                  + 添加成本
                </Button>
              )}
            </div>
          }
        >
          <Empty
            image={<span style={{ fontSize: 48 }}>📋</span>}
            description={
              <div>
                <div style={{ fontSize: 18, marginBottom: 10 }}>暂无生产成本记录</div>
                <div style={{ color: '#999', marginBottom: 20 }}>
                  点击"添加成本"按钮开始记录生产成本
                </div>
                {canManage && (
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                    + 添加成本
                  </Button>
                )}
              </div>
            }
          />
        </Card>

        <Modal
          title={editingCost ? '编辑生产成本' : '添加生产成本'}
          open={modalVisible}
          onCancel={handleCancel}
          footer={null}
          width={600}
        >
          <ProductionCostForm
            projectId={projectId}
            initialData={editingCost || undefined}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </Modal>
      </>
    )
  }

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
      title: '发生时间',
      dataIndex: 'incurred_at',
      key: 'incurred_at',
      render: (date: string | undefined) =>
        date ? dayjs(date).format('YYYY-MM-DD') : '-',
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
      render: (text: string) => text || '-',
    },
    {
      title: '发票',
      key: 'invoice',
      render: (_: any, record: ProductionCost) => {
        if (record.invoice_file) {
          return (
            <Space>
              <Button
                type="link"
                size="small"
                icon={<DownloadOutlined />}
                onClick={() =>
                  handleDownloadInvoice(
                    record.invoice_file!.id,
                    record.invoice_file!.original_name || record.invoice_file!.file_name
                  )
                }
              >
                {record.invoice_file.original_name || record.invoice_file.file_name}
                {record.invoice_file.file_size
                  ? ` (${formatFileSize(record.invoice_file.file_size)})`
                  : ''}
              </Button>
            </Space>
          )
        }
        return '-'
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: ProductionCost) => {
        if (!canManage) return '-'
        return (
          <Space>
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
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            >
              删除
            </Button>
          </Space>
        )
      },
    },
  ]

  return (
    <>
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>生产成本管理</span>
            {canManage && (
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                + 添加成本
              </Button>
            )}
          </div>
        }
      >
        {/* 汇总信息 */}
        <div
          style={{
            background: '#f9f9f9',
            padding: 15,
            marginBottom: 20,
            border: '1px solid #ddd',
            borderRadius: 4,
          }}
        >
          <Space size="large">
            <div>
              <span style={{ color: '#666', marginRight: 8 }}>总成本:</span>
              <span style={{ fontWeight: 'bold', fontSize: 16 }}>
                ¥{totalCost.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span style={{ color: '#666', marginRight: 8 }}>记录数:</span>
              <span style={{ fontWeight: 'bold', fontSize: 16 }}>{recordCount}</span>
            </div>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={costList}
          rowKey="id"
          pagination={false}
        />
      </Card>

      <Modal
        title={editingCost ? '编辑生产成本' : '添加生产成本'}
        open={modalVisible}
        onCancel={handleCancel}
        footer={null}
        width={600}
      >
        <ProductionCostForm
          projectId={projectId}
          initialData={editingCost || undefined}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </Modal>
    </>
  )
}
