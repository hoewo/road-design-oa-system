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
  Divider,
} from 'antd'
import {
  UploadOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { biddingService } from '@/services/bidding'
import { fileService } from '@/services/file'
import { permissionService } from '@/services/permission'
import { ExpertFeeForm } from '@/components/business/ExpertFeeForm'
import { ExpertFeePaymentList } from '@/components/business/ExpertFeePaymentList'
import type { File } from '@/types'
import dayjs from 'dayjs'

const { TextArea } = Input

interface BiddingFileListProps {
  projectId: string
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

  // 检查权限：是否可以管理项目经营信息（包括招投标信息）
  const { data: canManage } = useQuery({
    queryKey: ['canManageBusinessInfo', projectId],
    queryFn: () => permissionService.canManageBusinessInfo(projectId),
    enabled: !!projectId,
  })

  // 获取招投标信息 - 所有用户都可以查看
  const { data: biddingInfo } = useQuery({
    queryKey: ['biddingInfo', projectId],
    queryFn: () => biddingService.getBiddingInfo(projectId),
    enabled: !!projectId,
  })

  // 上传文件并更新招投标信息
  const uploadMutation = useMutation({
    mutationFn: async ({
      fileType,
      file,
      description,
    }: {
      fileType: BiddingFileType
      file: globalThis.File
      description?: string
    }) => {
      // First upload the file
      const uploadedFile = await fileService.uploadFile(
        projectId,
        file,
        'bidding',
        description
      )

      // Then update bidding info with file ID
      const updateData: any = {}
      if (fileType === 'tender') {
        updateData.tender_file_id = uploadedFile.id
      } else if (fileType === 'bid') {
        updateData.bid_file_id = uploadedFile.id
      } else if (fileType === 'award') {
        updateData.award_notice_file_id = uploadedFile.id
      }
      return await biddingService.createOrUpdateBiddingInfo(projectId, updateData)
    },
    onSuccess: () => {
      message.success('文件上传成功')
      queryClient.invalidateQueries({ queryKey: ['biddingInfo', projectId] })
      setUploadModalVisible(false)
      form.resetFields()
    },
    onError: (error: any) => {
      message.error(error.message || '文件上传失败')
    },
  })

  const handleUpload = async (values: any) => {
    if (!values.file || !values.file.file) {
      message.warning('请选择要上传的文件')
      return
    }
    await uploadMutation.mutateAsync({
      fileType,
      file: values.file.file,
      description: values.description,
    })
  }

  const handleDownload = async (file: File) => {
    try {
      await fileService.downloadFile(file.id)
      message.success(`正在下载 ${file.original_name || file.file_name}`)
    } catch (error: any) {
      message.error(error.message || '下载失败')
    }
  }

  const handleDelete = (fileType: BiddingFileType) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除${FILE_TYPE_LABELS[fileType]}吗？`,
      onOk: async () => {
        try {
          const updateData: any = {}
          if (fileType === 'tender') {
            updateData.tender_file_id = null
          } else if (fileType === 'bid') {
            updateData.bid_file_id = null
          } else if (fileType === 'award') {
            updateData.award_notice_file_id = null
          }
          await biddingService.createOrUpdateBiddingInfo(projectId, updateData)
          message.success('文件删除成功')
          queryClient.invalidateQueries({ queryKey: ['biddingInfo', projectId] })
        } catch (error: any) {
          message.error(error.message || '文件删除失败')
        }
      },
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const renderFileSection = (
    type: BiddingFileType,
    file: File | undefined,
    fileId: string | undefined
  ) => {
    if (!file && !fileId) {
  return (
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
      )
    }

    if (!file) {
      return (
        <div
          style={{
            padding: '10px',
            border: '2px solid #e0e0e0',
            background: '#f9f9f9',
            borderRadius: '4px',
            color: '#999',
          }}
        >
          文件ID: {fileId} (文件信息未加载)
          </div>
      )
    }

    return (
                <div
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
                  {canManage === true && (
                  <Button
                    type="link"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
          onClick={() => handleDelete(type)}
                  >
                    删除
                  </Button>
                  )}
                </div>
    )
  }

  return (
    <>
      <Card
        title="招投标信息"
        extra={
          canManage === true && (
          <Button
            type="primary"
            size="small"
            icon={<UploadOutlined />}
            onClick={() => setUploadModalVisible(true)}
          >
            上传文件
          </Button>
          )
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: 8 }}>招标文件</div>
            {renderFileSection(
              'tender',
              biddingInfo?.tender_file,
              biddingInfo?.tender_file_id
            )}
              </div>

          <div>
            <div style={{ fontWeight: 'bold', marginBottom: 8 }}>投标文件</div>
            {renderFileSection(
              'bid',
              biddingInfo?.bid_file,
              biddingInfo?.bid_file_id
            )}
          </div>

          <div>
            <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
              中标通知书
            </div>
            {renderFileSection(
              'award',
              biddingInfo?.award_notice_file,
              biddingInfo?.award_notice_file_id
            )}
          </div>

          <Divider />

          {/* 专家费支付 */}
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>专家费支付</span>
              <ExpertFeeForm projectId={projectId} canManage={canManage === true} />
            </div>
            <div style={{ marginTop: 16 }}>
              <ExpertFeePaymentList projectId={projectId} canManage={canManage === true} />
            </div>
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
