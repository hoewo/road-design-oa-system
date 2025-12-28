import { useState } from 'react'
import { Upload, Form, Select, Input, message, Progress, Button, Space } from 'antd'
import { UploadOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { useMutation } from '@tanstack/react-query'
import { fileService } from '@/services/file'
import type { UploadFile, UploadProps } from 'antd'
import type { FileCategory } from '@/types'

const { TextArea } = Input

interface FileUploadProps {
  projectId?: string
  category?: FileCategory
  onSuccess?: () => void
  onCancel?: () => void
  projects?: Array<{ id: string; name: string }>
}

const FILE_CATEGORY_OPTIONS = [
  { label: '合同文件', value: 'contract' as FileCategory },
  { label: '招投标文件', value: 'bidding' as FileCategory },
  { label: '设计文件', value: 'design' as FileCategory },
  { label: '审计文件', value: 'audit' as FileCategory },
  { label: '生产文件', value: 'production' as FileCategory },
  { label: '发票文件', value: 'invoice' as FileCategory },
  { label: '其他', value: 'other' as FileCategory },
]

export const FileUpload = ({ projectId, category, onSuccess, onCancel, projects }: FileUploadProps) => {
  const [form] = Form.useForm()
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')

  const uploadMutation = useMutation({
    mutationFn: async (data: { file: File; category: FileCategory; description?: string; projectId: string }) => {
      return fileService.uploadFile(data.projectId, data.file, data.category, data.description)
    },
    onSuccess: () => {
      setUploadStatus('success')
      message.success('文件上传成功！')
      form.resetFields()
      setFileList([])
      setUploadProgress(0)
      onSuccess?.()
    },
    onError: (error: any) => {
      setUploadStatus('error')
      const errorMsg = error.message || '文件上传失败'
      setErrorMessage(errorMsg)
      
      // Handle specific error cases (EC-012, EC-013, EC-014)
      if (errorMsg.includes('文件大小超过限制')) {
        message.error('文件大小超过限制（最大100MB），请压缩文件或选择较小的文件')
      } else if (errorMsg.includes('不支持的文件类型')) {
        message.error('不支持的文件类型，请上传PDF、Word、Excel、图片等格式的文件')
      } else if (errorMsg.includes('网络')) {
        message.warning('文件上传失败，网络连接中断。系统支持断点续传，您可以重新连接后继续上传。')
      } else {
        message.error(errorMsg)
      }
    },
  })

  const handleFileChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    setFileList(newFileList)
    setUploadStatus('idle')
    setErrorMessage('')
  }

  const beforeUpload = (file: File): boolean => {
    // Validate file size (EC-012)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      message.error('文件大小超过限制（最大100MB），请压缩文件或选择较小的文件')
      return false
    }

    // Validate file type (EC-013) - only block dangerous types
    const dangerousExtensions = ['exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'sh', 'ps1', 'jar', 'app', 'dmg', 'deb', 'rpm', 'msi', 'apk', 'ipa', 'bin', 'run', 'out']
    const fileExt = file.name.split('.').pop()?.toLowerCase()
    if (fileExt && dangerousExtensions.includes(fileExt)) {
      message.error('不支持的文件类型，请上传PDF、Word、Excel、图片等格式的文件')
      return false
    }

    return false // Prevent auto upload
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const file = fileList[0]?.originFileObj
      
      if (!file) {
        message.error('请选择要上传的文件')
        return
      }

      if (!values.category) {
        message.error('请选择文件类型')
        return
      }

      const targetProjectId = values.project_id || projectId
      if (!targetProjectId) {
        message.error('请选择关联项目')
        return
      }

      setUploading(true)
      setUploadStatus('uploading')
      setUploadProgress(0)

      // Simulate upload progress (in real implementation, use XMLHttpRequest for progress tracking)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      await uploadMutation.mutateAsync({
        file,
        category: values.category,
        description: values.description,
        projectId: targetProjectId,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)
    } catch (error: any) {
      console.error('Upload error:', error)
    } finally {
      setUploading(false)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    setFileList([])
    setUploadStatus('idle')
    setUploadProgress(0)
    setErrorMessage('')
    onCancel?.()
  }

  const handleContinueUpload = () => {
    // EC-014: Resume upload after network failure
    setUploadStatus('idle')
    setErrorMessage('')
    handleSubmit()
  }

  return (
    <div>
      <Form form={form} layout="vertical" initialValues={{ category, project_id: projectId }}>
        {projects && (
          <Form.Item
          name="project_id"
          label="关联项目"
          rules={[{ required: true, message: '请选择项目' }]}
        >
          <Select placeholder="请选择项目" showSearch optionFilterProp="children">
            {projects.map((project) => (
              <Select.Option key={project.id} value={project.id}>
                {project.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        )}
        <Form.Item
          name="category"
          label="文件类型"
          rules={[{ required: true, message: '请选择文件类型' }]}
        >
          <Select placeholder="请选择文件类型" options={FILE_CATEGORY_OPTIONS} />
        </Form.Item>

        <Form.Item
          name="file"
          label="选择文件"
          rules={[{ required: true, message: '请选择文件' }]}
        >
          <Upload.Dragger
            fileList={fileList}
            onChange={handleFileChange}
            beforeUpload={beforeUpload}
            maxCount={1}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
            disabled={uploading || uploadStatus === 'success'}
          >
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此处上传</p>
            <p className="ant-upload-hint">
              支持 PDF、Word、Excel、图片等格式，单个文件最大 100MB
            </p>
          </Upload.Dragger>
        </Form.Item>

        <Form.Item name="description" label="文件描述">
          <TextArea rows={3} placeholder="请输入文件描述（可选）" />
        </Form.Item>

        {/* Upload Progress */}
        {uploadStatus === 'uploading' && (
          <div style={{ marginBottom: 16 }}>
            <Progress percent={uploadProgress} status="active" />
            <div style={{ marginTop: 8, textAlign: 'center', color: '#666' }}>
              正在上传：{fileList[0]?.name} ({uploadProgress}%)
            </div>
          </div>
        )}

        {/* Success Message */}
        {uploadStatus === 'success' && (
          <div style={{ 
            padding: 15, 
            background: '#d4edda', 
            border: '1px solid #c3e6cb', 
            borderRadius: 4,
            marginBottom: 16,
            color: '#155724'
          }}>
            <CheckCircleOutlined style={{ marginRight: 8 }} />
            文件上传成功！{fileList[0]?.name} 已保存
          </div>
        )}

        {/* Error Message */}
        {uploadStatus === 'error' && (
          <div style={{ 
            padding: 15, 
            background: '#f8d7da', 
            border: '1px solid #f5c6cb', 
            borderRadius: 4,
            marginBottom: 16,
            color: '#721c24'
          }}>
            <CloseCircleOutlined style={{ marginRight: 8 }} />
            {errorMessage}
            {errorMessage.includes('网络') && (
              <div style={{ marginTop: 8 }}>
                <Button type="primary" size="small" onClick={handleContinueUpload}>
                  继续上传
                </Button>
              </div>
            )}
          </div>
        )}

        <Form.Item>
          <Space>
            <Button onClick={handleCancel} disabled={uploading}>
              取消
            </Button>
            <Button 
              type="primary" 
              onClick={handleSubmit}
              loading={uploading}
              disabled={!fileList.length || !form.getFieldValue('category')}
            >
              上传
            </Button>
            {uploadStatus === 'success' && (
              <Button type="primary" onClick={handleCancel}>
                继续上传
              </Button>
            )}
          </Space>
        </Form.Item>
      </Form>
    </div>
  )
}

