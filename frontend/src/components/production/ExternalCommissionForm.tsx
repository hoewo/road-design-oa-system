import {
  Form,
  Input,
  Select,
  Button,
  message,
  Upload,
  DatePicker,
  InputNumber,
} from 'antd'
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { productionService } from '@/services/production'
import { businessService } from '@/services/business'
import { fileService } from '@/services/file'
import type {
  CreateExternalCommissionRequest,
  ExternalCommission,
  CreateFinancialRecordRequest,
} from '@/types'
import { useState, useEffect } from 'react'
import type { UploadFile } from 'antd/es/upload/interface'
import dayjs from 'dayjs'

interface ExternalCommissionFormProps {
  projectId: string | number
  initialData?: ExternalCommission
  onSuccess?: () => void
  onCancel?: () => void
}

export const ExternalCommissionForm = ({
  projectId,
  initialData,
  onSuccess,
  onCancel,
}: ExternalCommissionFormProps) => {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [uploading, setUploading] = useState(false)

  const isEditMode = !!initialData

  useEffect(() => {
    if (initialData) {
      form.setFieldsValue({
        vendor_name: initialData.vendor_name,
        vendor_type: initialData.vendor_type,
        score: initialData.score,
        notes: initialData.notes,
      })
      if (initialData.contract_file) {
        setFileList([
          {
            uid: initialData.contract_file.id,
            name: initialData.contract_file.original_name,
            status: 'done',
            url: undefined,
          },
        ])
      }
    }
  }, [initialData, form])

  const createMutation = useMutation({
    mutationFn: (data: CreateExternalCommissionRequest) =>
      productionService.createCommission(projectId, data),
    onSuccess: () => {
      message.success('对外委托创建成功')
      form.resetFields()
      setFileList([])
      queryClient.invalidateQueries({
        queryKey: ['externalCommissions', projectId],
      })
      queryClient.invalidateQueries({
        queryKey: ['externalCommissionSummary', projectId],
      })
      onSuccess?.()
    },
    onError: (error: any) => {
      message.error(error.message || '创建失败')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateExternalCommissionRequest>) =>
      productionService.updateCommission(projectId, initialData!.id, data),
    onSuccess: () => {
      message.success('对外委托更新成功')
      queryClient.invalidateQueries({
        queryKey: ['externalCommissions', projectId],
      })
      queryClient.invalidateQueries({
        queryKey: ['externalCommissionSummary', projectId],
      })
      onSuccess?.()
    },
    onError: (error: any) => {
      message.error(error.message || '更新失败')
    },
  })

  const handleFileChange = (info: any) => {
    let newFileList = [...info.fileList]
    // 只保留最后一个文件
    if (newFileList.length > 1) {
      newFileList = [newFileList[newFileList.length - 1]]
    }
    setFileList(newFileList)
  }

  const beforeUpload = (file: File) => {
    const isLt100M = file.size / 1024 / 1024 < 100
    if (!isLt100M) {
      message.error('文件大小不能超过100MB')
      return false
    }
    return false // 阻止自动上传
  }

  const handleRemoveFile = () => {
    setFileList([])
    form.setFieldsValue({ contract_file_id: undefined })
  }

  const handleFinish = async (values: any) => {
    try {
      setUploading(true)
      let contractFileId = initialData?.contract_file_id

      // 如果有新上传的文件，先上传文件
      if (fileList.length > 0 && fileList[0].originFileObj) {
        const file = fileList[0].originFileObj
        const uploadedFile = await fileService.uploadFile(
          String(projectId),
          file,
          'contract_external',
          '委托合同'
        )
        contractFileId = uploadedFile.id
      }

      const data: CreateExternalCommissionRequest = {
        vendor_name: values.vendor_name,
        vendor_type: values.vendor_type,
        score: values.score,
        contract_file_id: contractFileId,
        notes: values.notes,
      }

      let commission: ExternalCommission
      if (isEditMode) {
        commission = await productionService.updateCommission(
          projectId,
          initialData!.id,
          data
        )
      } else {
        commission = await productionService.createCommission(projectId, data)
      }

      // 如果有支付信息，创建支付记录
      if (values.payment_amount && values.payment_amount > 0) {
        const paymentDate = values.payment_date
          ? dayjs(values.payment_date).format('YYYY-MM-DD')
          : dayjs().format('YYYY-MM-DD')

        const commissionType =
          values.vendor_type === 'company' ? 'company' : 'person'

        const paymentData: CreateFinancialRecordRequest = {
          financial_type: 'commission_payment',
          direction: 'expense',
          amount: values.payment_amount,
          occurred_at: paymentDate,
          commission_type: commissionType,
          vendor_name: values.vendor_name,
          vendor_score: values.score,
          description: `对外委托支付：${values.vendor_name}`,
        }

        await businessService.createFinancialRecord(projectId, paymentData)
      }

      // 触发成功回调
      if (isEditMode) {
        message.success('对外委托更新成功')
      } else {
        message.success('对外委托创建成功')
      }

      form.resetFields()
      setFileList([])
      queryClient.invalidateQueries({
        queryKey: ['externalCommissions', projectId],
      })
      queryClient.invalidateQueries({
        queryKey: ['externalCommissionSummary', projectId],
      })
      queryClient.invalidateQueries({
        queryKey: ['projectFinancial', projectId],
      })
      onSuccess?.()
    } catch (error: any) {
      message.error(error.message || '操作失败')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={{
        score: initialData?.score,
      }}
    >
      <Form.Item
        name="vendor_name"
        label="委托方"
        rules={[{ required: true, message: '请输入委托方名称' }]}
      >
        <Input placeholder="请输入委托方名称" />
      </Form.Item>

      <Form.Item
        name="vendor_type"
        label="委托类型"
        rules={[{ required: true, message: '请选择委托类型' }]}
      >
        <Select placeholder="请选择委托类型">
          <Select.Option value="company">单位</Select.Option>
          <Select.Option value="person">个人</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item
        name="score"
        label="评分"
        rules={[
          { type: 'number', min: 1, max: 5, message: '评分范围为1-5分' },
        ]}
        extra="请根据委托方的工作质量进行评分（1-5分）"
      >
        <Select placeholder="请选择评分">
          <Select.Option value={1}>1分</Select.Option>
          <Select.Option value={2}>2分</Select.Option>
          <Select.Option value={3}>3分</Select.Option>
          <Select.Option value={4}>4分</Select.Option>
          <Select.Option value={5}>5分</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item
        name="contract_file"
        label="委托合同"
        rules={[{ required: true, message: '请上传委托合同' }]}
        extra="支持 PDF、Word、图片格式，最大 10MB"
      >
        <Upload
          fileList={fileList}
          onChange={handleFileChange}
          beforeUpload={beforeUpload}
          onRemove={handleRemoveFile}
          maxCount={1}
        >
          <Button icon={<UploadOutlined />}>点击上传</Button>
        </Upload>
        {initialData?.contract_file && !fileList.length && (
          <div style={{ marginTop: 8 }}>
            <span>{initialData.contract_file.original_name}</span>
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              onClick={handleRemoveFile}
            >
              删除
            </Button>
          </div>
        )}
      </Form.Item>

      <Form.Item
        name="payment_amount"
        label="支付金额"
        rules={[{ type: 'number', min: 0, message: '支付金额必须大于0' }]}
      >
        <InputNumber
          placeholder="请输入支付金额"
          min={0}
          precision={2}
          style={{ width: '100%' }}
        />
      </Form.Item>

      <Form.Item name="payment_date" label="支付时间">
        <DatePicker style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item name="notes" label="备注">
        <Input.TextArea rows={3} placeholder="请输入备注信息（可选）" />
      </Form.Item>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={uploading || createMutation.isPending || updateMutation.isPending}
          style={{ marginRight: 8 }}
        >
          {isEditMode ? '保存' : '提交'}
        </Button>
        {onCancel && (
          <Button onClick={onCancel}>取消</Button>
        )}
      </Form.Item>
    </Form>
  )
}
