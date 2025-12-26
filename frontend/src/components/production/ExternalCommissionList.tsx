import { useState, useMemo } from 'react'
import {
  Table,
  Button,
  Modal,
  Space,
  Tag,
  Empty,
  Alert,
  message,
  Popconfirm,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productionService } from '@/services/production'
import { businessService } from '@/services/business'
import { permissionService } from '@/services/permission'
import { ExternalCommissionForm } from './ExternalCommissionForm'
import { ExternalCommissionSummary } from './ExternalCommissionSummary'
import { ExternalCommissionDeleteConfirm } from './ExternalCommissionDeleteConfirm'
import type { ExternalCommission, FinancialRecord } from '@/types'
import dayjs from 'dayjs'

interface ExternalCommissionListProps {
  projectId: string | number
  canManage?: boolean
}

export const ExternalCommissionList = ({
  projectId,
  canManage: canManageProp,
}: ExternalCommissionListProps) => {
  const [modalVisible, setModalVisible] = useState(false)
  const [editingCommission, setEditingCommission] =
    useState<ExternalCommission | null>(null)
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false)
  const [deletingCommission, setDeletingCommission] =
    useState<ExternalCommission | null>(null)
  const queryClient = useQueryClient()

  // 检查权限：是否可以管理项目生产信息
  const { data: canManagePermission = false } = useQuery({
    queryKey: ['canManageProductionInfo', projectId],
    queryFn: () => permissionService.canManageProductionInfo(projectId),
    enabled: !!projectId && canManageProp === undefined,
  })

  // 如果外部传入了canManage，使用外部值；否则使用权限检查结果
  const canManage = canManageProp !== undefined ? canManageProp : canManagePermission

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['externalCommissions', projectId],
    queryFn: () => productionService.listCommissions(projectId),
    enabled: !!projectId,
  })

  // 获取财务记录（用于获取支付信息）
  const { data: financialData } = useQuery({
    queryKey: ['projectFinancial', projectId],
    queryFn: () => businessService.getProjectFinancial(projectId),
    enabled: !!projectId,
  })

  // 创建支付信息映射（vendor_name -> payment record）
  const paymentInfoMap = useMemo(() => {
    const map = new Map<string, FinancialRecord>()
    if (financialData?.financial_records) {
      financialData.financial_records
        .filter(
          (r) =>
            r.financial_type === 'commission_payment' && r.vendor_name
        )
        .forEach((record) => {
          if (record.vendor_name) {
            map.set(record.vendor_name, record)
          }
        })
    }
    return map
  }, [financialData])

  const deleteMutation = useMutation({
    mutationFn: (commissionId: string) =>
      productionService.deleteCommission(projectId, commissionId),
    onSuccess: () => {
      message.success('删除成功')
      setDeleteConfirmVisible(false)
      setDeletingCommission(null)
      queryClient.invalidateQueries({
        queryKey: ['externalCommissions', projectId],
      })
      queryClient.invalidateQueries({
        queryKey: ['externalCommissionSummary', projectId],
      })
    },
    onError: (error: any) => {
      message.error(error.message || '删除失败')
    },
  })

  const downloadMutation = useMutation({
    mutationFn: (commissionId: string) =>
      productionService.downloadContractFile(projectId, commissionId),
    onSuccess: () => {
      message.success('下载成功')
    },
    onError: (error: any) => {
      message.error(error.message || '下载失败')
    },
  })

  const handleAdd = () => {
    setEditingCommission(null)
    setModalVisible(true)
  }

  const handleEdit = (commission: ExternalCommission) => {
    setEditingCommission(commission)
    setModalVisible(true)
  }

  const handleDelete = (commission: ExternalCommission) => {
    setDeletingCommission(commission)
    setDeleteConfirmVisible(true)
  }

  const handleDeleteConfirm = () => {
    if (deletingCommission) {
      deleteMutation.mutate(deletingCommission.id)
    }
  }

  const handleDownload = (commission: ExternalCommission) => {
    if (!commission.contract_file_id) {
      message.warning('委托合同文件不存在')
      return
    }
    downloadMutation.mutate(commission.id)
  }

  const handleSuccess = () => {
    setModalVisible(false)
    setEditingCommission(null)
    refetch()
  }

  const handleCancel = () => {
    setModalVisible(false)
    setEditingCommission(null)
  }

  const columns = [
    {
      title: '委托类型',
      dataIndex: 'vendor_type',
      key: 'vendor_type',
      width: 100,
      render: (type: string) => (
        <Tag color={type === 'company' ? 'blue' : 'green'}>
          {type === 'company' ? '单位' : '个人'}
        </Tag>
      ),
    },
    {
      title: '委托方',
      dataIndex: 'vendor_name',
      key: 'vendor_name',
    },
    {
      title: '评分',
      dataIndex: 'score',
      key: 'score',
      width: 100,
      render: (score: number | undefined) =>
        score ? (
          <Tag color="orange">{score}分</Tag>
        ) : (
          <span style={{ color: '#999' }}>-</span>
        ),
    },
    {
      title: '委托合同',
      key: 'contract_file',
      width: 200,
      render: (_: any, record: ExternalCommission) => {
        if (record.contract_file) {
          return (
            <Space>
              <Button
                type="link"
                size="small"
                onClick={() => handleDownload(record)}
                loading={downloadMutation.isPending}
              >
                {record.contract_file.original_name}
              </Button>
              <span style={{ color: '#999', fontSize: 12 }}>
                ({(record.contract_file.file_size / 1024 / 1024).toFixed(2)}MB)
              </span>
            </Space>
          )
        }
        return <span style={{ color: '#999' }}>-</span>
      },
    },
    {
      title: '支付信息',
      key: 'payment_info',
      width: 200,
      render: (_: any, record: ExternalCommission) => {
        const paymentRecord = paymentInfoMap.get(record.vendor_name)
        if (paymentRecord) {
          return (
            <div>
              <div>金额: ¥{paymentRecord.amount.toLocaleString()}</div>
              <div style={{ color: '#999', fontSize: 12 }}>
                时间: {dayjs(paymentRecord.occurred_at).format('YYYY-MM-DD')}
              </div>
            </div>
          )
        }
        return <span style={{ color: '#999' }}>-</span>
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: ExternalCommission) => {
        if (!canManage) return null
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

  // 加载状态
  if (isLoading) {
    return (
      <>
        {canManage && (
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              添加委托
            </Button>
          </div>
        )}
        <ExternalCommissionSummary projectId={projectId} />
        <Table
          columns={columns}
          dataSource={[]}
          loading={true}
          rowKey="id"
        />
      </>
    )
  }

  // 错误状态
  if (error) {
    return (
      <>
        {canManage && (
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              添加委托
            </Button>
          </div>
        )}
        <ExternalCommissionSummary projectId={projectId} />
        <Alert
          message="加载失败"
          description="无法加载对外委托数据，请稍后重试"
          type="error"
          showIcon
          action={
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => refetch()}
            >
              重新加载
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      </>
    )
  }

  const commissions = data?.data || []
  const isEmpty = commissions.length === 0

  return (
    <>
      {canManage && (
        <div style={{ marginBottom: 16, textAlign: 'right' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            添加委托
          </Button>
        </div>
      )}

      <ExternalCommissionSummary projectId={projectId} />

      {isEmpty ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div>
              <div style={{ fontSize: 18, marginBottom: 10 }}>
                暂无对外委托记录
              </div>
              <div style={{ color: '#999' }}>
                {canManage
                  ? '点击右上角"添加委托"按钮开始记录对外委托信息'
                  : '暂无对外委托记录'}
              </div>
            </div>
          }
        />
      ) : (
        <Table
          columns={columns}
          dataSource={commissions}
          rowKey="id"
          pagination={{
            total: data?.total || 0,
            showTotal: (total) => `共 ${total} 条`,
            pageSize: 20,
          }}
        />
      )}

      <Modal
        title={editingCommission ? '编辑对外委托' : '添加对外委托'}
        open={modalVisible}
        onCancel={handleCancel}
        footer={null}
        width={700}
        destroyOnClose
      >
        <ExternalCommissionForm
          projectId={projectId}
          initialData={editingCommission || undefined}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </Modal>

      <ExternalCommissionDeleteConfirm
        visible={deleteConfirmVisible}
        commission={deletingCommission}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteConfirmVisible(false)
          setDeletingCommission(null)
        }}
        loading={deleteMutation.isPending}
      />
    </>
  )
}
