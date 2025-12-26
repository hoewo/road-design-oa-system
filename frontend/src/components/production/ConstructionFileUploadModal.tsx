import { useState } from 'react'
import {
  Modal,
  Form,
  Select,
  Upload,
  Button,
  message,
  Typography,
} from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import { useMutation } from '@tanstack/react-query'
import { productionService } from '@/services/production'
import type { UploadFile } from 'antd'

const { Text } = Typography

interface ConstructionFileUploadModalProps {
  projectId: string | number
  visible: boolean
  onCancel: () => void
  onSuccess: () => void
}

type FileType = 'construction_file' | 'review_sheet'

export const ConstructionFileUploadModal = ({
  projectId,
  visible,
  onCancel,
  onSuccess,
}: ConstructionFileUploadModalProps) => {
  const [form] = Form.useForm()
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [fileType, setFileType] = useState<FileType>('construction_file')
  const [uploading, setUploading] = useState(false)

  const uploadMutation = useMutation({
    mutationFn: async (values: { fileType: FileType; file: globalThis.File }) => {
      setUploading(true)
      try {
        // 创建生产文件记录
        const formData = new FormData()
        formData.append('file', values.file)
        formData.append('file_type', 'construction_drawing')
        formData.append('stage', 'construction')

        // 如果是校审单，需要特殊处理
        if (values.fileType === 'review_sheet') {
          formData.append('review_sheet_file', values.file)
        }

        await productionService.uploadProductionFile(projectId, formData)
      } finally {
        setUploading(false)
      }
    },
    onSuccess: () => {
      message.success('上传成功')
      form.resetFields()
      setFileList([])
      onSuccess()
    },
    onError: (error: any) => {
      message.error(error?.message || '上传失败')
    },
  })

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (fileList.length === 0) {
        message.error('请选择要上传的文件')
        return
      }

      const file = fileList[0].originFileObj
      if (!file) {
        message.error('文件无效')
        return
      }

      await uploadMutation.mutateAsync({
        fileType: values.fileType,
        file,
      })
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    setFileList([])
    onCancel()
  }

  return (
    <Modal
      title="上传施工图设计阶段文件"
      open={visible}
      onCancel={handleCancel}
      onOk={handleSubmit}
      confirmLoading={uploading}
      width={600}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="fileType"
          label="文件类型"
          rules={[{ required: true, message: '请选择文件类型' }]}
        >
          <Select
            placeholder="请选择"
            onChange={(value) => setFileType(value)}
          >
            <Select.Option value="construction_file">施工图设计文件</Select.Option>
            <Select.Option value="review_sheet">校审单</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="file"
          label="上传文件"
          rules={[{ required: true, message: '请上传文件' }]}
        >
          <Upload.Dragger
            fileList={fileList}
            onChange={({ fileList: newFileList }) => {
              setFileList(newFileList)
            }}
            beforeUpload={() => false}
            maxCount={1}
            accept=".pdf,.doc,.docx"
          >
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此处上传</p>
            <p className="ant-upload-hint">
              支持 PDF、DOC、DOCX 格式，最大 50MB
            </p>
          </Upload.Dragger>
        </Form.Item>
      </Form>
    </Modal>
  )
}

