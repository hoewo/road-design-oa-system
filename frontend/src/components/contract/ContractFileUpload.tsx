import { useState } from 'react'
import { Upload, Button, Input, message, Form } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { businessService } from '@/services/business'
import type { UploadFile } from 'antd'
import type { File as FileType } from '@/types'

interface ContractFileUploadProps {
  contractId: number
  onSuccess?: () => void
}

export const ContractFileUpload = ({
  contractId,
  onSuccess,
}: ContractFileUploadProps) => {
  const [form] = Form.useForm()
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const queryClient = useQueryClient()

  const uploadMutation = useMutation({
    mutationFn: async (values: {
      file: globalThis.File
      description?: string
    }): Promise<FileType> => {
      return businessService.uploadContractFile(
        contractId,
        values.file,
        values.description
      )
    },
    onSuccess: () => {
      message.success('文件上传成功')
      form.resetFields()
      setFileList([])
      queryClient.invalidateQueries({ queryKey: ['contractFiles'] })
      onSuccess?.()
    },
    onError: (error) => {
      message.error(error.message || '文件上传失败')
    },
  })

  const handleChange = (info: any) => {
    let newFileList = [...info.fileList]

    // Limit to 1 file
    newFileList = newFileList.slice(-1)

    // Read from response and show file link
    newFileList = newFileList.map((file) => {
      if (file.response) {
        // Component will show file.url as link
        file.url = file.response.url
      }
      return file
    })

    setFileList(newFileList)
  }

  const beforeUpload = (file: File) => {
    const isLt100M = file.size / 1024 / 1024 < 100
    if (!isLt100M) {
      message.error('文件大小不能超过100MB')
      return false
    }
    // Return false to prevent auto-upload, we handle upload manually via button click
    return false
  }

  const handleFormFinish = async (values: any) => {
    try {
      if (fileList.length === 0) {
        message.warning('请选择要上传的文件')
        return
      }

      const file = fileList[0].originFileObj
      if (!file) {
        message.warning('文件无效')
        return
      }

      uploadMutation.mutate({
        file,
        description: values.description,
      })
    } catch (error) {
      // Error handling is done in onError callback
    }
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFormFinish}
    >
      <Form.Item label="选择文件" required>
        <Upload
          fileList={fileList}
          onChange={handleChange}
          beforeUpload={beforeUpload}
          maxCount={1}
        >
          <Button icon={<UploadOutlined />}>选择文件</Button>
        </Upload>
      </Form.Item>

      <Form.Item name="description" label="文件描述">
        <Input.TextArea
          rows={3}
          placeholder="请输入文件描述（可选）"
          maxLength={500}
          showCount
        />
      </Form.Item>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={uploadMutation.isPending}
        >
          上传文件
        </Button>
      </Form.Item>
    </Form>
  )
}
