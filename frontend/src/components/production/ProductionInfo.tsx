import { useState } from 'react'
import {
  Card,
  Button,
  Select,
  Table,
  Space,
  message,
  Modal,
  Row,
  Col,
  Tag,
  Upload,
  InputNumber,
} from 'antd'
import {
  PlusOutlined,
  UploadOutlined,
  DownloadOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productionService } from '@/services/production'
import { userService } from '@/services/user'
import { ProductionPersonnelManager } from './ProductionPersonnelManager'
import { ProductionFileUpload } from './ProductionFileUpload'
import { ProductionCostList } from './ProductionCostList'
import { ExternalCommissionList } from './ExternalCommissionList'
import { BonusList } from '@/components/financial/BonusList'
import { BonusForm } from '@/components/financial/BonusForm'
import { ProductionAuditForm } from './ProductionAuditForm'
import type {
  ProductionFile,
  ProductionFileType,
  ProductionApprovalRecord,
  User,
} from '@/types'
import dayjs from 'dayjs'

interface ProductionInfoProps {
  projectId: string | number
  onGetContractAmount?: () => Promise<{
    design_fee?: number
    survey_fee?: number
    consultation_fee?: number
  }>
}

const FILE_TYPE_LABELS: Record<ProductionFileType, string> = {
  scheme_ppt: '方案PPT',
  preliminary_design: '初步设计',
  construction_drawing: '施工图设计',
  variation_order: '变更洽商',
  completion_report: '竣工验收',
  audit_report: '审计报告',
  other: '其他',
}

const STAGE_FILE_TYPES: Record<string, ProductionFileType[]> = {
  scheme: ['scheme_ppt'],
  preliminary: ['preliminary_design'],
  construction: ['construction_drawing'],
  variation: ['variation_order'],
  completion: ['completion_report'],
}

export const ProductionInfo = ({
  projectId,
  onGetContractAmount,
}: ProductionInfoProps) => {
  const queryClient = useQueryClient()
  const [uploadModalVisible, setUploadModalVisible] = useState(false)
  const [uploadStage, setUploadStage] = useState<string | null>(null)
  const [auditModalVisible, setAuditModalVisible] = useState(false)
  const [bonusModalVisible, setBonusModalVisible] = useState(false)

  // 获取用户列表
  const { data: usersData } = useQuery({
    queryKey: ['users', { is_active: true }],
    queryFn: () => userService.listUsers({ is_active: true, size: 1000 }),
  })

  // 获取审核/审定记录
  const { data: approvalsData, refetch: refetchApprovals } = useQuery({
    queryKey: ['productionApprovals', projectId],
    queryFn: () => productionService.listApprovals(projectId),
    enabled: !!projectId,
  })

  // 获取生产文件
  const { data: filesData, refetch: refetchFiles } = useQuery({
    queryKey: ['productionFiles', projectId],
    queryFn: () =>
      productionService.listProductionFiles(projectId, { size: 1000 }),
    enabled: !!projectId,
  })

  const users = usersData?.data || []
  const approvals = approvalsData?.data || []
  const files = filesData?.data || []

  // 获取审核人和审定人
  const reviewerRecord = approvals.find(
    (a: ProductionApprovalRecord) => a.record_type === 'review'
  )
  const approverRecord = approvals.find(
    (a: ProductionApprovalRecord) => a.record_type === 'approval'
  )

  // 获取批复和审计记录
  const approvalResolution = approverRecord?.audit_resolution
  const auditResolution = approvals.find(
    (a: ProductionApprovalRecord) => a.audit_resolution?.report_type === 'audit'
  )?.audit_resolution

  // 按阶段组织文件
  const getFilesByStage = (stage: string) => {
    const fileTypes = STAGE_FILE_TYPES[stage] || []
    return files.filter((f: ProductionFile) => fileTypes.includes(f.file_type))
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const handleDownload = async (fileId: string | number, fileName: string) => {
    try {
      const blob = await productionService.downloadProductionFile(
        projectId,
        fileId
      )
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      message.success(`正在下载 ${fileName}`)
    } catch (error: any) {
      message.error(error.message || '下载失败')
    }
  }

  const handleUploadSuccess = () => {
    setUploadModalVisible(false)
    setUploadStage(null)
    refetchFiles()
  }

  const handleAuditSuccess = () => {
    setAuditModalVisible(false)
    refetchApprovals()
  }

  // 生产人员配置表格列
  const personnelColumns = [
    {
      title: '专业',
      dataIndex: 'discipline',
      key: 'discipline',
    },
    {
      title: '设计人',
      dataIndex: ['designer', 'real_name'],
      key: 'designer',
    },
    {
      title: '参与人',
      dataIndex: ['participant', 'real_name'],
      key: 'participant',
    },
    {
      title: '复核人',
      dataIndex: ['reviewer', 'real_name'],
      key: 'reviewer',
    },
  ]

  // 生产成本表格列（已由 ProductionCostList 组件处理，这里不需要定义）

  // 表格列定义已由各个列表组件处理，这里不需要定义

  // 渲染阶段文件部分
  const renderStageSection = (
    title: string,
    stage: string,
    fileTypes: ProductionFileType[]
  ) => {
    const stageFiles = files.filter((f: ProductionFile) =>
      fileTypes.includes(f.file_type)
    )

    const mainFile = stageFiles.find(
      (f: ProductionFile) => f.file_type === fileTypes[0]
    )
    const reviewSheet = mainFile // 校审单是主文件的 review_sheet_file

    return (
      <Card
        title={title}
        extra={
          <Button
            type="link"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => {
              setUploadStage(stage)
              setUploadModalVisible(true)
            }}
          >
            上传文件
          </Button>
        }
        style={{ marginBottom: 24 }}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
            {title === '方案阶段'
              ? '方案文件'
              : title === '初步设计阶段'
                ? '初步设计文件'
                : '施工图设计文件'}
          </div>
          {mainFile ? (
            <div
              style={{
                padding: '10px',
                border: '1px solid #ccc',
                background: '#f9f9f9',
                marginBottom: 8,
              }}
            >
              <a
                onClick={() =>
                  handleDownload(
                    mainFile.file_id,
                    mainFile.file?.original_name || 'file'
                  )
                }
                style={{ marginRight: 8 }}
              >
                {mainFile.file?.original_name}
              </a>
              <span style={{ color: '#999' }}>
                ({formatFileSize(mainFile.file?.file_size || 0)}) -{' '}
                {dayjs(mainFile.created_at).format('YYYY-MM-DD')}
              </span>
            </div>
          ) : (
            <div style={{ color: '#999', padding: '10px' }}>暂无文件</div>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
            校审单 <span style={{ color: 'red' }}>*</span>
          </div>
          {reviewSheet?.review_sheet_file ? (
            <div
              style={{
                padding: '10px',
                border: '1px solid #ccc',
                background: '#f9f9f9',
                marginBottom: 8,
              }}
            >
              <a
                onClick={() =>
                  handleDownload(
                    reviewSheet.review_sheet_file_id!,
                    reviewSheet.review_sheet_file!.original_name
                  )
                }
                style={{ marginRight: 8 }}
              >
                {reviewSheet.review_sheet_file.original_name}
              </a>
              <span style={{ color: '#999' }}>
                ({formatFileSize(reviewSheet.review_sheet_file.file_size)}) -{' '}
                {dayjs(reviewSheet.created_at).format('YYYY-MM-DD')}
              </span>
            </div>
          ) : (
            <div style={{ color: '#999', padding: '10px' }}>未上传</div>
          )}
        </div>

        <div>
          <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
            评分 <span style={{ color: 'red' }}>*</span>
          </div>
          {mainFile?.score !== undefined ? (
            <div
              style={{
                padding: '10px',
                border: '2px solid #e0e0e0',
                background: '#f9f9f9',
              }}
            >
              {mainFile.score}分
            </div>
          ) : (
            <div style={{ color: '#999', padding: '10px' }}>未评分</div>
          )}
        </div>
      </Card>
    )
  }

  return (
    <div>
      {/* 生产人员配置 */}
      <ProductionPersonnelManager projectId={String(projectId)} />

      {/* 批复审计信息 */}
      <Card
        title="批复审计信息"
        extra={
          <Button
            type="link"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setAuditModalVisible(true)}
          >
            上传报告
          </Button>
        }
        style={{ marginBottom: 24 }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
                批复报告
              </div>
              {approvalResolution?.report_file ? (
                <div
                  style={{
                    padding: '10px',
                    border: '2px solid #e0e0e0',
                    background: '#f9f9f9',
                    borderRadius: '4px',
                  }}
                >
                  <a
                    onClick={() =>
                      handleDownload(
                        approvalResolution.report_file!.id,
                        approvalResolution.report_file!.original_name
                      )
                    }
                  >
                    {approvalResolution.report_file.original_name}
                  </a>
                  <span style={{ color: '#999', marginLeft: 8 }}>
                    ({formatFileSize(approvalResolution.report_file.file_size)})
                    -{' '}
                    {dayjs(approvalResolution.created_at).format('YYYY-MM-DD')}
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    padding: '10px',
                    border: '2px solid #e0e0e0',
                    background: '#f9f9f9',
                    borderRadius: '4px',
                    color: '#999',
                  }}
                >
                  未上传
                </div>
              )}
            </div>
          </Col>
          <Col span={12}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
                审计报告
              </div>
              {auditResolution?.report_file ? (
                <div
                  style={{
                    padding: '10px',
                    border: '2px solid #e0e0e0',
                    background: '#f9f9f9',
                    borderRadius: '4px',
                  }}
                >
                  <a
                    onClick={() =>
                      handleDownload(
                        auditResolution.report_file!.id,
                        auditResolution.report_file!.original_name
                      )
                    }
                  >
                    {auditResolution.report_file.original_name}
                  </a>
                  <span style={{ color: '#999', marginLeft: 8 }}>
                    ({formatFileSize(auditResolution.report_file.file_size)}) -{' '}
                    {dayjs(auditResolution.created_at).format('YYYY-MM-DD')}
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    padding: '10px',
                    border: '2px solid #e0e0e0',
                    background: '#f9f9f9',
                    borderRadius: '4px',
                    color: '#999',
                  }}
                >
                  未上传
                </div>
              )}
            </div>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
                批复金额
              </div>
              <div
                style={{
                  padding: '10px',
                  border: '2px solid #e0e0e0',
                  background: '#f9f9f9',
                  borderRadius: '4px',
                }}
              >
                设计费: ¥
                {approvalResolution?.amount_design?.toLocaleString() || 0}
                <br />
                勘察费: ¥
                {approvalResolution?.amount_survey?.toLocaleString() || 0}
                <br />
                咨询费: ¥
                {approvalResolution?.amount_consultation?.toLocaleString() || 0}
              </div>
            </div>
          </Col>
          <Col span={12}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
                审计金额
              </div>
              <div
                style={{
                  padding: '10px',
                  border: '2px solid #e0e0e0',
                  background: '#f9f9f9',
                  borderRadius: '4px',
                }}
              >
                设计费: ¥{auditResolution?.amount_design?.toLocaleString() || 0}
                <br />
                勘察费: ¥{auditResolution?.amount_survey?.toLocaleString() || 0}
                <br />
                咨询费: ¥
                {auditResolution?.amount_consultation?.toLocaleString() || 0}
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 方案阶段 */}
      {renderStageSection('方案阶段', 'scheme', ['scheme_ppt'])}

      {/* 初步设计阶段 */}
      {renderStageSection('初步设计阶段', 'preliminary', [
        'preliminary_design',
      ])}

      {/* 施工图设计阶段 */}
      {renderStageSection('施工图设计阶段', 'construction', [
        'construction_drawing',
      ])}

      {/* 变更洽商 */}
      <Card
        title="变更洽商"
        extra={
          <Button
            type="link"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => {
              setUploadStage('variation')
              setUploadModalVisible(true)
            }}
          >
            上传文件
          </Button>
        }
        style={{ marginBottom: 24 }}
      >
        {getFilesByStage('variation').length > 0 ? (
          getFilesByStage('variation').map((file: ProductionFile) => (
            <div
              key={file.id}
              style={{
                marginBottom: 10,
                padding: '10px',
                border: '1px solid #ccc',
                background: 'white',
              }}
            >
              <a
                onClick={() =>
                  handleDownload(
                    file.file_id,
                    file.file?.original_name || 'file'
                  )
                }
                style={{ marginRight: 8 }}
              >
                {file.file?.original_name}
              </a>
              <span style={{ color: '#999' }}>
                ({formatFileSize(file.file?.file_size || 0)}) -{' '}
                {dayjs(file.created_at).format('YYYY-MM-DD')}
              </span>
            </div>
          ))
        ) : (
          <div style={{ color: '#999', padding: '10px' }}>暂无文件</div>
        )}
      </Card>

      {/* 竣工验收 */}
      <Card
        title="竣工验收"
        extra={
          <Button
            type="link"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => {
              setUploadStage('completion')
              setUploadModalVisible(true)
            }}
          >
            上传文件
          </Button>
        }
        style={{ marginBottom: 24 }}
      >
        {getFilesByStage('completion').length > 0 ? (
          getFilesByStage('completion').map((file: ProductionFile) => (
            <div
              key={file.id}
              style={{
                marginBottom: 10,
                padding: '10px',
                border: '1px solid #ccc',
                background: 'white',
              }}
            >
              <a
                onClick={() =>
                  handleDownload(
                    file.file_id,
                    file.file?.original_name || 'file'
                  )
                }
                style={{ marginRight: 8 }}
              >
                {file.file?.original_name}
              </a>
              <span style={{ color: '#999' }}>
                ({formatFileSize(file.file?.file_size || 0)}) -{' '}
                {dayjs(file.created_at).format('YYYY-MM-DD')}
              </span>
            </div>
          ))
        ) : (
          <div style={{ color: '#999', padding: '10px' }}>暂无文件</div>
        )}
      </Card>

      {/* 生产成本 */}
      <Card
        title="生产成本"
        extra={
          <Button
            type="link"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => message.info('请使用下方的生产成本列表添加成本')}
          >
            添加成本
          </Button>
        }
        style={{ marginBottom: 24 }}
      >
        <ProductionCostList projectId={projectId} />
      </Card>

      {/* 对外委托 */}
      <Card
        title="对外委托"
        extra={
          <Button
            type="link"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => message.info('请使用下方的对外委托列表添加委托')}
          >
            添加委托
          </Button>
        }
        style={{ marginBottom: 24 }}
      >
        <ExternalCommissionList projectId={projectId} />
      </Card>

      {/* 生产奖金分配 */}
      <Card
        title="生产奖金分配"
        extra={
          <Button
            type="link"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setBonusModalVisible(true)}
          >
            分配奖金
          </Button>
        }
        style={{ marginBottom: 24 }}
      >
        <BonusList projectId={projectId} bonusType="production" />
      </Card>

      {/* 上传文件模态框 */}
      <Modal
        title="上传文件"
        open={uploadModalVisible}
        onCancel={() => {
          setUploadModalVisible(false)
          setUploadStage(null)
        }}
        footer={null}
        width={800}
        destroyOnHidden
      >
        <ProductionFileUpload
          projectId={projectId}
          onSuccess={handleUploadSuccess}
          onGetContractAmount={onGetContractAmount}
        />
      </Modal>

      {/* 审核/审定记录模态框 */}
      <Modal
        title="新建审核/审定记录"
        open={auditModalVisible}
        onCancel={() => setAuditModalVisible(false)}
        footer={null}
        width={800}
        destroyOnHidden
      >
        <ProductionAuditForm
          projectId={projectId}
          onSuccess={handleAuditSuccess}
        />
      </Modal>

      {/* 生产奖金模态框 */}
      <Modal
        title="新建生产奖金"
        open={bonusModalVisible}
        onCancel={() => setBonusModalVisible(false)}
        footer={null}
        width={600}
        destroyOnHidden
      >
        <BonusForm
          projectId={projectId}
          defaultBonusType="production"
          onSuccess={() => {
            setBonusModalVisible(false)
            message.success('生产奖金创建成功')
          }}
        />
      </Modal>
    </div>
  )
}
