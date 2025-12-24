import { useState } from 'react'
import {
  Card,
  Button,
  Space,
  message,
  Popconfirm,
  Empty,
  Row,
  Col,
  Typography,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productionService } from '@/services/production'
import { permissionService } from '@/services/permission'
import { fileService } from '@/services/file'
import { ApprovalAuditModal } from './ApprovalAuditModal'
import type { ProductionApproval } from '@/types'
import dayjs from 'dayjs'

const { Title, Text } = Typography

interface ApprovalAuditViewProps {
  projectId: string | number
}

export const ApprovalAuditView = ({ projectId }: ApprovalAuditViewProps) => {
  const [modalVisible, setModalVisible] = useState(false)
  const [editingApproval, setEditingApproval] = useState<ProductionApproval | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const queryClient = useQueryClient()

  // 检查权限：是否可以管理项目生产信息
  const { data: canManage = false } = useQuery({
    queryKey: ['canManageProductionInfo', projectId],
    queryFn: () => permissionService.canManageProductionInfo(projectId),
    enabled: !!projectId,
  })

  // 获取批复和审计信息
  const { data: approvalAndAudit, isLoading, refetch } = useQuery({
    queryKey: ['approvalAndAudit', projectId],
    queryFn: () => productionService.getApprovalAndAudit(projectId),
    enabled: !!projectId,
  })

  const approval = approvalAndAudit?.approval || null
  const audit = approvalAndAudit?.audit || null
  const hasData = approval !== null || audit !== null

  // 删除批复审计信息
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await productionService.deleteProductionApproval(id)
    },
    onSuccess: () => {
      message.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['approvalAndAudit', projectId] })
    },
    onError: (error: any) => {
      message.error(error?.message || '删除失败')
    },
  })

  // 下载报告文件
  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      await productionService.downloadReportFile(fileId)
      message.success('下载成功')
    } catch (error: any) {
      message.error(error?.message || '下载失败')
    }
  }

  // 删除报告文件
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      await productionService.deleteReportFile(fileId)
    },
    onSuccess: () => {
      message.success('删除文件成功')
      queryClient.invalidateQueries({ queryKey: ['approvalAndAudit', projectId] })
    },
    onError: (error: any) => {
      message.error(error?.message || '删除文件失败')
    },
  })

  // 处理新建/编辑
  const handleCreateOrEdit = () => {
    if (hasData) {
      // 编辑模式：传递完整的批复和审计数据
      // 注意：这里传递 null，让 Modal 内部从 API 获取完整数据
      setEditingApproval(null)
      setIsEditMode(true)
      setModalVisible(true)
    } else {
      // 新建模式
      setEditingApproval(null)
      setIsEditMode(false)
      setModalVisible(true)
    }
  }

  // 格式化金额
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // 渲染金额明细
  const renderAmountDetails = (approval: ProductionApproval | null, title: string) => {
    if (!approval) {
      return (
        <div style={{ padding: '15px', border: '2px solid #e0e0e0', background: '#f9f9f9', minHeight: '100px' }}>
          <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      )
    }

    return (
      <div style={{ padding: '15px', border: '2px solid #e0e0e0', background: '#f9f9f9' }}>
        <div style={{ marginBottom: '8px' }}>设计费: {formatAmount(approval.amount_design)}</div>
        <div style={{ marginBottom: '8px' }}>勘察费: {formatAmount(approval.amount_survey)}</div>
        <div style={{ marginBottom: '8px' }}>咨询费: {formatAmount(approval.amount_consulting)}</div>
        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #ddd', fontWeight: 'bold' }}>
          合计: {formatAmount(approval.total_amount)}
        </div>
      </div>
    )
  }

  // 渲染报告文件
  const renderReportFile = (approval: ProductionApproval | null, type: 'approval' | 'audit') => {
    if (!approval || !approval.report_file) {
      return (
        <div style={{ padding: '10px', border: '2px solid #e0e0e0', background: '#f9f9f9', minHeight: '60px' }}>
          <Empty description="暂无文件" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      )
    }

    const file = approval.report_file
    const fileSize = (file.file_size / 1024 / 1024).toFixed(2) // MB
    const uploadTime = dayjs(file.created_at).format('YYYY-MM-DD')

    return (
      <div style={{ padding: '10px', border: '2px solid #e0e0e0', background: '#f9f9f9' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <a
              onClick={() => handleDownload(file.id, file.original_name)}
              style={{ cursor: 'pointer', color: '#1890ff' }}
            >
              {file.original_name}
            </a>
            <Text type="secondary" style={{ marginLeft: '8px' }}>
              ({fileSize}MB) - {uploadTime}
            </Text>
          </div>
          <Space>
            <Button
              type="link"
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => handleDownload(file.id, file.original_name)}
            >
              下载
            </Button>
            {canManage && (
              <Popconfirm
                title="确定要删除这个文件吗？"
                onConfirm={() => deleteFileMutation.mutate(file.id)}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                >
                  删除
                </Button>
              </Popconfirm>
            )}
          </Space>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return <Card loading>正在加载批复审计信息...</Card>
  }

  return (
    <>
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>批复审计信息</span>
            {canManage && (
              <Button
                type="primary"
                size="small"
                icon={hasData ? <EditOutlined /> : <PlusOutlined />}
                onClick={handleCreateOrEdit}
              >
                {hasData ? '编辑' : '新建'}
              </Button>
            )}
          </div>
        }
      >
        {!hasData ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>📄</div>
            <div style={{ fontSize: '16px', marginBottom: '10px' }}>暂无批复审计信息</div>
            <div style={{ color: '#666', marginBottom: '20px' }}>
              请点击右上角"新建"按钮创建第一条批复审计记录
            </div>
          </div>
        ) : (
          <Row gutter={20}>
            {/* 批复列 */}
            <Col span={12}>
              <Card
                size="small"
                title="批复"
                style={{ background: '#fafafa' }}
              >
                {/* 批复报告 */}
                <div style={{ marginBottom: '20px' }}>
                  <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                    批复报告
                  </Text>
                  {renderReportFile(approval, 'approval')}
                </div>

                {/* 批复金额 */}
                <div>
                  <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                    批复金额
                  </Text>
                  {renderAmountDetails(approval, '批复')}
                </div>
              </Card>
            </Col>

            {/* 审计列 */}
            <Col span={12}>
              <Card
                size="small"
                title="审计"
                style={{ background: '#fafafa' }}
              >
                {/* 审计报告 */}
                <div style={{ marginBottom: '20px' }}>
                  <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                    审计报告
                  </Text>
                  {renderReportFile(audit, 'audit')}
                </div>

                {/* 审计金额 */}
                <div>
                  <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                    审计金额
                  </Text>
                  {renderAmountDetails(audit, '审计')}
                </div>
              </Card>
            </Col>
          </Row>
        )}
      </Card>

      {/* 编辑/新建弹窗 */}
      {modalVisible && (
        <ApprovalAuditModal
          projectId={projectId}
          visible={modalVisible}
          approval={editingApproval}
          isEditMode={isEditMode}
          onCancel={() => {
            setModalVisible(false)
            setEditingApproval(null)
            setIsEditMode(false)
          }}
          onSuccess={() => {
            setModalVisible(false)
            setEditingApproval(null)
            setIsEditMode(false)
            refetch()
          }}
        />
      )}
    </>
  )
}

