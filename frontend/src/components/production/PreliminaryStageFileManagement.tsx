import { useState, useEffect } from 'react'
import {
  Card,
  Button,
  Space,
  message,
  Modal,
  Empty,
  Typography,
  Spin,
  Alert,
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
import { PreliminaryStageEditModal } from './PreliminaryStageEditModal'
import type { StageFileInfo, ProductionFile } from '@/types'
import dayjs from 'dayjs'

const { Text } = Typography

interface PreliminaryStageFileManagementProps {
  projectId: string | number
}

export const PreliminaryStageFileManagement = ({
  projectId,
}: PreliminaryStageFileManagementProps) => {
  const [editModalVisible, setEditModalVisible] = useState(false)
  const queryClient = useQueryClient()

  // 检查权限：是否可以管理项目生产信息
  const { data: canManage = false } = useQuery({
    queryKey: ['canManageProductionInfo', projectId],
    queryFn: () => permissionService.canManageProductionInfo(projectId),
    enabled: !!projectId,
  })

  // 获取初步设计阶段文件信息
  const {
    data: stageInfo,
    isLoading,
    error,
    refetch,
  } = useQuery<StageFileInfo>({
    queryKey: ['productionFilesByStage', projectId, 'preliminary'],
    queryFn: async () => {
      console.log('[PreliminaryStageFileManagement] 开始获取阶段文件信息, projectId:', projectId)
      const data = await productionService.getProductionFilesByStage(projectId, 'preliminary')
      console.log('[PreliminaryStageFileManagement] 获取到的数据:', data)
      return data
    },
    enabled: !!projectId,
  })

  // 日志：数据状态变化
  useEffect(() => {
    console.log('[PreliminaryStageFileManagement] 数据状态:', {
      projectId,
      isLoading,
      'stageInfo': stageInfo,
      'mainFiles count': stageInfo?.main_files?.length || 0,
      'reviewSheet exists': !!stageInfo?.review_sheet,
      'score': stageInfo?.score,
      error: error?.message,
    })
  }, [projectId, stageInfo, isLoading, error])

  // 删除文件
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      await productionService.deleteProductionFile(projectId, fileId)
    },
    onSuccess: () => {
      message.success('删除成功')
      queryClient.invalidateQueries({
        queryKey: ['productionFilesByStage', projectId, 'preliminary'],
      })
    },
    onError: (error: any) => {
      message.error(error?.message || '删除失败')
    },
  })

  // 下载文件
  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      await productionService.downloadProductionFile(projectId, fileId)
      message.success('下载成功')
    } catch (error: any) {
      message.error(error?.message || '下载失败')
    }
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  // 渲染文件列表
  const renderFileList = (files: ProductionFile[], title: string) => {
    if (files.length === 0) {
      return (
        <div style={{ padding: '10px', border: '2px solid #e0e0e0', background: '#f9f9f9', minHeight: '60px' }}>
          <Empty description={`暂无${title}，请上传${title}`} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      )
    }

    return (
      <div>
        {files.map((file) => {
          const fileData = file.file
          if (!fileData) return null

          const fileSize = formatFileSize(fileData.file_size)
          const uploadTime = dayjs(file.created_at).format('YYYY-MM-DD HH:mm')

          return (
            <div
              key={file.id}
              style={{
                margin: '10px 0',
                padding: '10px',
                border: '1px solid #ccc',
                background: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <a
                  onClick={() => handleDownload(fileData.id, fileData.original_name)}
                  style={{ cursor: 'pointer', color: '#1890ff' }}
                >
                  {fileData.original_name}
                </a>
                <Text type="secondary" style={{ marginLeft: '8px' }}>
                  ({fileSize}) - {uploadTime}
                </Text>
              </div>
              <Space>
                <Button
                  type="link"
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={() => handleDownload(fileData.id, fileData.original_name)}
                >
                  下载
                </Button>
                {canManage && (
                    <Button
                      type="link"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                    onClick={() => {
                      Modal.confirm({
                        title: '确认删除',
                        content: (
                          <div>
                            <p>您确定要删除文件"{fileData.original_name}"吗？</p>
                            <p style={{ marginTop: 10, color: '#666', fontSize: 14 }}>
                              删除后文件将无法恢复，此操作不可撤销。
                            </p>
                          </div>
                        ),
                        okText: '确认删除',
                        cancelText: '取消',
                        okButtonProps: { danger: true },
                        onOk: () => deleteFileMutation.mutate(file.id),
                      })
                    }}
                    >
                      删除
                    </Button>
                )}
              </Space>
            </div>
          )
        })}
      </div>
    )
  }

  // 加载中状态
  if (isLoading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>正在加载文件信息...</div>
        </div>
      </Card>
    )
  }

  // 错误状态
  if (error) {
    return (
      <Card>
        <Alert
          message="错误"
          description={error instanceof Error ? error.message : '加载文件信息失败'}
          type="error"
          showIcon
        />
      </Card>
    )
  }

  const mainFiles = stageInfo?.main_files || []
  const reviewSheet = stageInfo?.review_sheet
  const score = stageInfo?.score

  // 空状态
  const isEmpty = mainFiles.length === 0 && !reviewSheet && !score

  return (
    <>
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>初步设计阶段</span>
            {canManage && (
              <Button
                type="primary"
                size="small"
                icon={isEmpty ? <PlusOutlined /> : <EditOutlined />}
                onClick={() => setEditModalVisible(true)}
              >
                {isEmpty ? '+ 新建' : '编辑'}
              </Button>
            )}
          </div>
        }
      >
        {isEmpty ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>📄</div>
            <div style={{ fontSize: '16px', marginBottom: '10px' }}>暂无文件</div>
            <div style={{ color: '#666', marginBottom: '20px' }}>
              请点击右上角"+ 上传文件"按钮上传初步设计文件
            </div>
          </div>
        ) : (
          <>
            {/* 初步设计文件 */}
            <div style={{ margin: '20px 0', padding: '15px', border: '1px solid #ddd', background: '#f9f9f9' }}>
              <Text strong style={{ display: 'block', marginBottom: '10px' }}>
                初步设计文件
              </Text>
              {renderFileList(mainFiles, '初步设计文件')}
            </div>

            {/* 校审单 */}
            <div style={{ margin: '20px 0', padding: '15px', border: '1px solid #ddd', background: '#f9f9f9' }}>
              <Text strong style={{ display: 'block', marginBottom: '10px' }}>
                校审单 <Text type="danger">*</Text>
              </Text>
              {reviewSheet ? (
                renderFileList([reviewSheet], '校审单')
              ) : (
                <div style={{ padding: '10px', border: '2px solid #e0e0e0', background: '#f9f9f9', minHeight: '60px' }}>
                  <Empty description="暂无文件，请上传校审单" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                </div>
              )}
            </div>

            {/* 评分 */}
            <div style={{ margin: '20px 0', padding: '15px', border: '1px solid #ddd', background: '#f9f9f9' }}>
              <Text strong style={{ display: 'block', marginBottom: '10px' }}>
                评分 <Text type="danger">*</Text>
              </Text>
                <div
                  style={{
                    padding: '10px',
                    border: '2px solid #e0e0e0',
                    background: '#f9f9f9',
                    display: 'inline-block',
                    minWidth: '150px',
                  }}
                >
                  {score !== undefined && score !== null ? `${score}分` : '未录入'}
              </div>
            </div>
          </>
        )}
      </Card>

      {/* 编辑弹窗 */}
      <PreliminaryStageEditModal
          projectId={projectId}
        visible={editModalVisible}
        stageInfo={stageInfo}
        onCancel={() => setEditModalVisible(false)}
          onSuccess={async () => {
          console.log('[PreliminaryStageFileManagement] onSuccess 回调被调用')
          setEditModalVisible(false)
          // 刷新查询缓存，确保数据更新
          console.log('[PreliminaryStageFileManagement] 开始刷新查询缓存')
          await queryClient.invalidateQueries({
            queryKey: ['productionFilesByStage', projectId, 'preliminary'],
          })
          console.log('[PreliminaryStageFileManagement] 查询缓存已刷新，开始重新获取数据')
          const refreshedData = await refetch()
          console.log('[PreliminaryStageFileManagement] 重新获取到的数据:', refreshedData.data)
          }}
        />
    </>
  )
}

