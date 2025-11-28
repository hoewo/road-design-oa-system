import { useState } from 'react'
import {
  Upload,
  Button,
  Input,
  InputNumber,
  message,
  Form,
  Select,
  Space,
} from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { productionService } from '@/services/production'
import type { UploadFile } from 'antd'
import type { ProductionFileType } from '@/types'

const { TextArea } = Input

interface ProductionFileUploadProps {
  projectId: number
  onSuccess?: () => void
  onGetContractAmount?: () => Promise<{
    design_fee?: number
    survey_fee?: number
    consultation_fee?: number
  }>
}

const MANDATORY_FILE_TYPES: ProductionFileType[] = [
  'scheme_ppt',
  'preliminary_design',
  'construction_drawing',
]

const FILE_TYPE_LABELS: Record<ProductionFileType, string> = {
  scheme_ppt: '方案PPT',
  preliminary_design: '初步设计',
  construction_drawing: '施工图设计',
  variation_order: '变更洽商',
  completion_report: '竣工验收',
  audit_report: '审计报告',
  other: '其他',
}

export const ProductionFileUpload = ({
  projectId,
  onSuccess,
  onGetContractAmount,
}: ProductionFileUploadProps) => {
  const [form] = Form.useForm()
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [reviewSheetFileList, setReviewSheetFileList] = useState<UploadFile[]>(
    []
  )
  const queryClient = useQueryClient()

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData): Promise<any> => {
      return productionService.uploadProductionFile(projectId, formData)
    },
    onSuccess: () => {
      message.success('生产文件上传成功')
      form.resetFields()
      setFileList([])
      setReviewSheetFileList([])
      queryClient.invalidateQueries({
        queryKey: ['productionFiles', projectId],
      })
      onSuccess?.()
    },
    onError: (error: any) => {
      message.error(error.message || '文件上传失败')
    },
  })

  const handleFileChange = (info: any) => {
    let newFileList = [...info.fileList]
    newFileList = newFileList.slice(-1)
    setFileList(newFileList)
  }

  const handleReviewSheetChange = (info: any) => {
    let newFileList = [...info.fileList]
    newFileList = newFileList.slice(-1)
    setReviewSheetFileList(newFileList)
  }

  const beforeUpload = (file: File) => {
    const isLt100M = file.size / 1024 / 1024 < 100
    if (!isLt100M) {
      message.error('文件大小不能超过100MB')
      return false
    }
    return false
  }

  const handleGetContractAmount = async () => {
    if (!onGetContractAmount) {
      message.warning('未配置合同金额获取功能')
      return
    }
    try {
      const amounts = await onGetContractAmount()
      const total =
        (amounts.design_fee || 0) +
        (amounts.survey_fee || 0) +
        (amounts.consultation_fee || 0)
      form.setFieldsValue({
        default_amount_reference: `设计费: ${amounts.design_fee || 0}, 勘察费: ${amounts.survey_fee || 0}, 咨询费: ${amounts.consultation_fee || 0}, 合计: ${total}`,
      })
      message.success('已引用合同金额')
    } catch (error: any) {
      message.error(error.message || '获取合同金额失败')
    }
  }

  const handleFormFinish = async (values: any) => {
    try {
      if (fileList.length === 0) {
        message.warning('请选择要上传的主文件')
        return
      }

      const file = fileList[0].originFileObj
      if (!file) {
        message.warning('主文件无效')
        return
      }

      const selectedFileType = values.file_type as ProductionFileType
      const isMandatory = MANDATORY_FILE_TYPES.includes(selectedFileType)

      if (isMandatory) {
        if (reviewSheetFileList.length === 0) {
          message.warning('该文件类型必须上传校审单')
          return
        }
        if (!values.score) {
          message.warning('该文件类型必须填写评分')
          return
        }
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('file_type', selectedFileType)
      if (values.description) {
        formData.append('description', values.description)
      }
      if (reviewSheetFileList.length > 0) {
        const reviewFile = reviewSheetFileList[0].originFileObj
        if (reviewFile) {
          formData.append('review_sheet_file', reviewFile)
        }
      }
      if (values.score !== undefined && values.score !== null) {
        formData.append('score', String(values.score))
      }
      if (values.default_amount_reference) {
        formData.append(
          'default_amount_reference',
          values.default_amount_reference
        )
      }

      uploadMutation.mutate(formData)
    } catch (error) {
      // Error handling is done in onError callback
    }
  }

  const selectedFileType = form.getFieldValue('file_type') as
    | ProductionFileType
    | undefined
  const isMandatory =
    selectedFileType && MANDATORY_FILE_TYPES.includes(selectedFileType)

  return (
    <Form form={form} layout="vertical" onFinish={handleFormFinish}>
      <Form.Item
        name="file_type"
        label="文件类型"
        rules={[{ required: true, message: '请选择文件类型' }]}
      >
        <Select
          placeholder="请选择文件类型"
          onChange={(value) => {
            form.setFieldsValue({
              score: undefined,
              default_amount_reference: undefined,
            })
          }}
        >
          {Object.entries(FILE_TYPE_LABELS).map(([value, label]) => (
            <Select.Option key={value} value={value}>
              {label}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item label="主文件" required>
        <Upload
          fileList={fileList}
          onChange={handleFileChange}
          beforeUpload={beforeUpload}
          maxCount={1}
        >
          <Button icon={<UploadOutlined />}>选择文件</Button>
        </Upload>
      </Form.Item>

      {isMandatory && (
        <>
          <Form.Item label="校审单" required tooltip="该文件类型必须上传校审单">
            <Upload
              fileList={reviewSheetFileList}
              onChange={handleReviewSheetChange}
              beforeUpload={beforeUpload}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>选择校审单文件</Button>
            </Upload>
          </Form.Item>

          <Form.Item
            name="score"
            label="评分"
            required
            tooltip="该文件类型必须填写评分"
            rules={[
              { required: true, message: '请填写评分' },
              { type: 'number', min: 0, max: 100, message: '评分范围：0-100' },
            ]}
          >
            <InputNumber
              placeholder="请输入评分 (0-100)"
              min={0}
              max={100}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </>
      )}

      {!isMandatory && (
        <>
          <Form.Item label="校审单（可选）">
            <Upload
              fileList={reviewSheetFileList}
              onChange={handleReviewSheetChange}
              beforeUpload={beforeUpload}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>选择校审单文件</Button>
            </Upload>
          </Form.Item>

          <Form.Item
            name="score"
            label="评分（可选）"
            rules={[
              { type: 'number', min: 0, max: 100, message: '评分范围：0-100' },
            ]}
          >
            <InputNumber
              placeholder="请输入评分 (0-100)"
              min={0}
              max={100}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </>
      )}

      <Form.Item name="description" label="文件描述">
        <TextArea
          rows={3}
          placeholder="请输入文件描述（可选）"
          maxLength={500}
          showCount
        />
      </Form.Item>

      <Form.Item name="default_amount_reference" label="金额引用">
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder="引用合同金额（可选）"
            value={form.getFieldValue('default_amount_reference')}
            readOnly
          />
          {onGetContractAmount && (
            <Button onClick={handleGetContractAmount}>引用合同金额</Button>
          )}
        </Space.Compact>
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
