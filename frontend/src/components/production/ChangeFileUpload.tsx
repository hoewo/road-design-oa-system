import { useState } from 'react'
import {
  Modal,
  Form,
  Upload,
  Button,
  message,
  Space,
} from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { productionService } from '@/services/production'
import type { UploadFile } from 'antd'

interface ChangeFileUploadProps {
  projectId: string | number
  visible: boolean
  onCancel: () => void
  onSuccess?: () => void
}

export const ChangeFileUpload = ({
  projectId,
  visible,
  onCancel,
  onSuccess,
}: ChangeFileUploadProps) => {
  const [form] = Form.useForm()
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [uploading, setUploading] = useState(false)
  const queryClient = useQueryClient()

  const handleFileChange = (info: any) => {
    let newFileList = [...info.fileList]
    // 支持多文件上传
    setFileList(newFileList)
  }

  const beforeUpload = (file: File) => {
    const isLt100M = file.size / 1024 / 1024 < 100
    if (!isLt100M) {
      message.error('文件大小不能超过100MB')
      return false
    }
    return false
  }

  const handleFormFinish = async (values: any) => {
    if (fileList.length === 0) {
      message.warning('请选择要上传的文件')
      return
    }

    setUploading(true)
    try {
      // 支持多文件上传，逐个上传
      const uploadPromises = fileList.map(async (fileItem) => {
        const file = fileItem.originFileObj
        if (!file) {
          throw new Error(`文件 ${fileItem.name} 无效`)
        }

        const formData = new FormData()
        formData.append('file', file)
        formData.append('file_type', 'variation_order')
        formData.append('stage', 'change')

        return productionService.uploadProductionFile(projectId, formData)
      })

      await Promise.all(uploadPromises)
      message.success(`成功上传 ${fileList.length} 个文件`)
      form.resetFields()
      setFileList([])
      queryClient.invalidateQueries({
        queryKey: ['productionFilesByStage', projectId, 'change'],
      })
      onSuccess?.()
    } catch (error: any) {
      message.error(error?.message || '文件上传失败')
    } finally {
      setUploading(false)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    setFileList([])
    onCancel()
  }

  return (
    <Modal
      title="上传变更洽商文件"
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={700}
    >
      <Form form={form} layout="vertical" onFinish={handleFormFinish}>
        <Form.Item label="文件" required>
          <Upload
            fileList={fileList}
            onChange={handleFileChange}
            beforeUpload={beforeUpload}
            multiple
          >
            <Button icon={<UploadOutlined />}>点击或拖拽文件到此处上传</Button>
          </Upload>
          <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
            支持 PDF、DOC、DOCX、XLS、XLSX 等格式，最大 100MB，可上传多个文件
          </div>
        </Form.Item>

        {/* 已选择的文件列表预览 */}
        {fileList.length > 0 && (
          <Form.Item label="已选择文件">
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {fileList.map((fileItem, index) => (
                <div
                  key={index}
                  style={{
                    padding: '8px',
                    marginBottom: '8px',
                    border: '1px solid #e0e0e0',
                    background: '#f9f9f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>{fileItem.name}</span>
                  <Button
                    type="link"
                    danger
                    size="small"
                    onClick={() => {
                      const newFileList = fileList.filter((_, i) => i !== index)
                      setFileList(newFileList)
                    }}
                  >
                    移除
                  </Button>
                </div>
              ))}
            </div>
          </Form.Item>
        )}

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={uploading}
            >
              确认上传
            </Button>
            <Button onClick={handleCancel}>取消</Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  )
}

