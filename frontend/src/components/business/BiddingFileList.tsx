import { useState } from 'react'
import {
  Card,
  Button,
  Space,
  message,
  Upload,
  Modal,
  Form,
  Input,
  Select,
} from 'antd'
import {
  UploadOutlined,
  DownloadOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { businessService } from '@/services/business'
import type { File, FileCategory } from '@/types'
import dayjs from 'dayjs'
import api from '@/services/api'

const { TextArea } = Input

interface BiddingFileListProps {
  projectId: number
}

type BiddingFileType = 'tender' | 'bid' | 'award'

const FILE_TYPE_LABELS: Record<BiddingFileType, string> = {
  tender: '招标文件',
  bid: '投标文件',
  award: '中标通知书',
}

export const BiddingFileList = ({ projectId }: BiddingFileListProps) => {
  const [uploadModalVisible, setUploadModalVisible] = useState(false)
  const [fileType, setFileType] = useState<BiddingFileType>('tender')
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  // 获取招投标文件列表
  const { data: filesData, isLoading } = useQuery({
    queryKey: ['biddingFiles', projectId],
    queryFn: async () => {
      const response = await businessService.searchContractFiles(projectId, {
        category: 'bidding' as FileCategory,
        page: 1,
        size: 100,
      })
      return response.data || []
    },
    enabled: !!projectId,
  })

  // 上传文件 - 使用合同文件接口，但标记为招投标文件
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // 先获取第一个合同，如果没有则提示
      const contracts = await businessService.getContracts(projectId)
      if (contracts.length === 0) {
        throw new Error('请先创建合同后再上传招投标文件')
      }
      const contractId = contracts[0].id
      const file = formData.get('file') as File
      const description = formData.get('description') as string
      return await businessService.uploadContractFile(
        contractId,
        file,
        description
      )
    },
    onSuccess: () => {
      message.success('文件上传成功')
      queryClient.invalidateQueries({ queryKey: ['biddingFiles', projectId] })
      setUploadModalVisible(false)
      form.resetFields()
    },
    onError: (error: any) => {
      message.error(error.message || '文件上传失败')
    },
  })

  // 删除文件 - 注意：后端可能没有通用的文件删除接口，这里需要根据实际情况调整
  const deleteMutation = useMutation({
    mutationFn: async (fileId: number) => {
      // 使用合同文件的删除接口，或者需要创建通用的文件删除接口
      await api.delete(`/contracts/files/${fileId}`)
    },
    onSuccess: () => {
      message.success('文件删除成功')
      queryClient.invalidateQueries({ queryKey: ['biddingFiles', projectId] })
    },
    onError: (error: any) => {
      message.error(error.message || '文件删除失败')
    },
  })

  const handleUpload = async (values: any) => {
    const formData = new FormData()
    if (values.file && values.file.file) {
      formData.append('file', values.file.file)
    }
    formData.append('category', 'bidding')
    formData.append(
      'description',
      `${FILE_TYPE_LABELS[fileType]}: ${values.description || ''}`
    )
    uploadMutation.mutate(formData)
  }

  const handleDownload = async (file: File) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'}/contracts/files/${file.id}/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      if (!response.ok) {
        throw new Error('下载失败')
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.original_name || file.file_name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      message.success(`正在下载 ${file.original_name || file.file_name}`)
    } catch (error: any) {
      message.error(error.message || '下载失败')
    }
  }

  const handleDelete = (file: File) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除文件 ${file.original_name || file.file_name} 吗？`,
      onOk: () => {
        deleteMutation.mutate(file.id)
      },
    })
  }

  // 按文件类型分组
  const filesByType = {
    tender: filesData?.filter((f) => f.description?.includes('招标文件')) || [],
    bid: filesData?.filter((f) => f.description?.includes('投标文件')) || [],
    award:
      filesData?.filter((f) => f.description?.includes('中标通知书')) || [],
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  return (
    <>
      <Card
        title="招投标信息"
        extra={
          <Button
            type="primary"
            size="small"
            icon={<UploadOutlined />}
            onClick={() => setUploadModalVisible(true)}
          >
            上传文件
          </Button>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: 8 }}>招标文件</div>
            {filesByType.tender.length > 0 ? (
              filesByType.tender.map((file) => (
                <div
                  key={file.id}
                  style={{
                    padding: '10px',
                    border: '2px solid #e0e0e0',
                    background: '#f9f9f9',
                    borderRadius: '4px',
                    marginBottom: 8,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <a
                      onClick={() => handleDownload(file)}
                      style={{ cursor: 'pointer', color: '#1890ff' }}
                    >
                      {file.original_name || file.file_name}
                    </a>
                    <span style={{ marginLeft: 8, color: '#666' }}>
                      ({formatFileSize(file.file_size)}) -{' '}
                      {dayjs(file.created_at).format('YYYY-MM-DD')}
                    </span>
                  </div>
                  <Button
                    type="link"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(file)}
                  >
                    删除
                  </Button>
                </div>
              ))
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
                暂无文件
              </div>
            )}
          </div>

          <div>
            <div style={{ fontWeight: 'bold', marginBottom: 8 }}>投标文件</div>
            {filesByType.bid.length > 0 ? (
              filesByType.bid.map((file) => (
                <div
                  key={file.id}
                  style={{
                    padding: '10px',
                    border: '2px solid #e0e0e0',
                    background: '#f9f9f9',
                    borderRadius: '4px',
                    marginBottom: 8,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <a
                      onClick={() => handleDownload(file)}
                      style={{ cursor: 'pointer', color: '#1890ff' }}
                    >
                      {file.original_name || file.file_name}
                    </a>
                    <span style={{ marginLeft: 8, color: '#666' }}>
                      ({formatFileSize(file.file_size)}) -{' '}
                      {dayjs(file.created_at).format('YYYY-MM-DD')}
                    </span>
                  </div>
                  <Button
                    type="link"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(file)}
                  >
                    删除
                  </Button>
                </div>
              ))
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
                暂无文件
              </div>
            )}
          </div>

          <div>
            <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
              中标通知书
            </div>
            {filesByType.award.length > 0 ? (
              filesByType.award.map((file) => (
                <div
                  key={file.id}
                  style={{
                    padding: '10px',
                    border: '2px solid #e0e0e0',
                    background: '#f9f9f9',
                    borderRadius: '4px',
                    marginBottom: 8,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <a
                      onClick={() => handleDownload(file)}
                      style={{ cursor: 'pointer', color: '#1890ff' }}
                    >
                      {file.original_name || file.file_name}
                    </a>
                    <span style={{ marginLeft: 8, color: '#666' }}>
                      ({formatFileSize(file.file_size)}) -{' '}
                      {dayjs(file.created_at).format('YYYY-MM-DD')}
                    </span>
                  </div>
                  <Button
                    type="link"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(file)}
                  >
                    删除
                  </Button>
                </div>
              ))
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
                暂无文件
              </div>
            )}
          </div>
        </Space>
      </Card>

      <Modal
        title="上传招投标文件"
        open={uploadModalVisible}
        onCancel={() => {
          setUploadModalVisible(false)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        confirmLoading={uploadMutation.isPending}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleUpload}>
          <Form.Item
            label="文件类型"
            name="fileType"
            rules={[{ required: true, message: '请选择文件类型' }]}
            initialValue="tender"
          >
            <Select
              onChange={(value) => setFileType(value)}
              options={[
                { label: '招标文件', value: 'tender' },
                { label: '投标文件', value: 'bid' },
                { label: '中标通知书', value: 'award' },
              ]}
            />
          </Form.Item>
          <Form.Item
            label="文件"
            name="file"
            rules={[{ required: true, message: '请选择要上传的文件' }]}
          >
            <Upload
              beforeUpload={() => false}
              maxCount={1}
              accept=".pdf,.doc,.docx"
            >
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
          </Form.Item>
          <Form.Item label="备注" name="description">
            <TextArea rows={3} placeholder="请输入备注信息（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
