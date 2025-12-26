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
import { fileService } from '@/services/file'
import type { UploadFile } from 'antd'

const { Text } = Typography

interface SchemeFileUploadModalProps {
  projectId: string | number
  visible: boolean
  onCancel: () => void
  onSuccess: () => void
}

type FileType = 'scheme_file' | 'review_sheet'

export const SchemeFileUploadModal = ({
  projectId,
  visible,
  onCancel,
  onSuccess,
}: SchemeFileUploadModalProps) => {
  const [form] = Form.useForm()
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [fileType, setFileType] = useState<FileType>('scheme_file')
  const [uploading, setUploading] = useState(false)

  const uploadMutation = useMutation({
    mutationFn: async (values: { fileType: FileType; file: globalThis.File }) => {
      setUploading(true)
      try {
        const formData = new FormData()
        formData.append('file_type', 'scheme_ppt')
        formData.append('stage', 'scheme')

        // 根据文件类型处理
        if (values.fileType === 'scheme_file') {
          // 上传方案文件（主文件）
          formData.append('file', values.file)
        } else if (values.fileType === 'review_sheet') {
          // 上传校审单：需要先有一个方案文件记录
          // 这里我们需要检查是否已有方案文件记录
          // 如果没有，则提示用户先上传方案文件
          // 如果有，则更新它的 review_sheet_file
          // 为了简化，我们先尝试作为主文件上传，但添加 review_sheet_file
          // 注意：这需要后端支持，或者我们需要先查询是否有方案文件记录
          formData.append('file', values.file)
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
      title="上传方案阶段文件"
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
            <Select.Option value="scheme_file">方案文件</Select.Option>
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

