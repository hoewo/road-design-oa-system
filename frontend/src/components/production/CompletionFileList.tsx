import { useState } from 'react'
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
  DeleteOutlined,
  DownloadOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productionService } from '@/services/production'
import { permissionService } from '@/services/permission'
import { CompletionFileUpload } from './CompletionFileUpload'
import type { StageFileInfo, ProductionFile } from '@/types'
import dayjs from 'dayjs'

const { Text } = Typography

interface CompletionFileListProps {
  projectId: string | number
}

export const CompletionFileList = ({ projectId }: CompletionFileListProps) => {
  const [uploadModalVisible, setUploadModalVisible] = useState(false)
  const queryClient = useQueryClient()

  // 检查权限：是否可以管理项目生产信息
  const { data: canManage = false } = useQuery({
    queryKey: ['canManageProductionInfo', projectId],
    queryFn: () => permissionService.canManageProductionInfo(projectId),
    enabled: !!projectId,
  })

  // 获取竣工验收阶段文件信息
  const {
    data: stageInfo,
    isLoading,
    error,
    refetch,
  } = useQuery<StageFileInfo>({
    queryKey: ['productionFilesByStage', projectId, 'completion'],
    queryFn: async () => {
      const data = await productionService.getProductionFilesByStage(projectId, 'completion')
      return data
    },
    enabled: !!projectId,
  })

  // 删除文件
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      await productionService.deleteProductionFile(projectId, fileId)
    },
    onSuccess: () => {
      message.success('删除成功')
      queryClient.invalidateQueries({
        queryKey: ['productionFilesByStage', projectId, 'completion'],
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
  const renderFileList = (files: ProductionFile[]) => {
    if (files.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
          <Empty description="暂无文件，请上传竣工验收文件" image={Empty.PRESENTED_IMAGE_SIMPLE} />
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
      <Card
        title="竣工验收"
        extra={
          canManage && (
            <Button
              type="link"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => setUploadModalVisible(true)}
            >
              + 上传文件
            </Button>
          )
        }
      >
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
      <Card
        title="竣工验收"
        extra={
          canManage && (
            <Button
              type="link"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => setUploadModalVisible(true)}
            >
              + 上传文件
            </Button>
          )
        }
      >
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
  const isEmpty = mainFiles.length === 0

  return (
    <>
      <Card
        title="竣工验收"
        extra={
          canManage && (
            <Button
              type="link"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => setUploadModalVisible(true)}
            >
              + 上传文件
            </Button>
          )
        }
        style={{ marginBottom: 24 }}
      >
        {isEmpty ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>📄</div>
            <div style={{ fontSize: '16px', marginBottom: '10px' }}>暂无文件</div>
            <div style={{ color: '#666', marginBottom: '20px' }}>
              {canManage ? '请点击右上角"+ 上传文件"按钮上传竣工验收文件' : '暂无竣工验收文件'}
            </div>
          </div>
        ) : (
          renderFileList(mainFiles)
        )}
      </Card>

      {/* 上传弹窗 */}
      {canManage && (
        <CompletionFileUpload
          projectId={projectId}
          visible={uploadModalVisible}
          onCancel={() => setUploadModalVisible(false)}
          onSuccess={async () => {
            setUploadModalVisible(false)
            await queryClient.invalidateQueries({
              queryKey: ['productionFilesByStage', projectId, 'completion'],
            })
            await refetch()
          }}
        />
      )}
    </>
  )
}

