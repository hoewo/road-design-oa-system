import { useEffect, useState } from 'react'
import {
  Form,
  Input,
  InputNumber,
  DatePicker,
  Button,
  Space,
  message,
  Row,
  Col,
  Select,
  Upload,
} from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { businessService } from '@/services/business'
import { projectService } from '@/services/project'
import { fileService } from '@/services/file'
import { permissionService } from '@/services/permission'
import type { CreateFinancialRecordRequest, FinancialRecord, File } from '@/types'
import dayjs from 'dayjs'
import type { UploadFile } from 'antd'

const { TextArea } = Input

interface OurInvoiceFormProps {
  projectId: string
  recordId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

export const OurInvoiceForm = ({
  projectId,
  recordId,
  onSuccess,
  onCancel,
}: OurInvoiceFormProps) => {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [uploadedFileId, setUploadedFileId] = useState<string | undefined>()

  // Check permission
  const { data: canManage } = useQuery({
    queryKey: ['canManageBusinessInfo', projectId],
    queryFn: () => permissionService.canManageBusinessInfo(projectId),
    enabled: !!projectId,
  })

  // Load existing record data if editing
  const { data: existingRecord, isLoading: isLoadingRecord } = useQuery({
    queryKey: ['financialRecord', recordId],
    queryFn: async () => {
      if (!recordId) return null
      const financial = await businessService.getProjectFinancial(projectId)
      return (
        financial?.financial_records?.find((r) => r.id === recordId) || null
      )
    },
    enabled: !!recordId,
  })

  // Load clients for selection
  const { data: clientsResponse } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      return projectService.getClients({ page: 1, size: 100 })
    },
  })
  const clients = clientsResponse?.data || []

  // Load payment records for selection (for linking)
  const { data: financial } = useQuery({
    queryKey: ['projectFinancial', projectId],
    queryFn: () => businessService.getProjectFinancial(projectId),
    enabled: !!projectId,
  })

  const paymentRecords =
    financial?.financial_records?.filter(
      (r) => r.financial_type === 'client_payment'
    ) || []

  // Set form values when record data is loaded
  useEffect(() => {
    if (existingRecord) {
      form.setFieldsValue({
        client_id: existingRecord.client_id,
        amount: existingRecord.amount,
        occurred_at: existingRecord.occurred_at
          ? dayjs(existingRecord.occurred_at)
          : null,
        related_payment_id: existingRecord.related_payment_id,
        description: existingRecord.description,
      })
      if (existingRecord.invoice_file) {
        setFileList([
          {
            uid: existingRecord.invoice_file.id,
            name: existingRecord.invoice_file.original_name,
            status: 'done',
            url: `/user/files/${existingRecord.invoice_file.id}/download`,
          },
        ])
        setUploadedFileId(existingRecord.invoice_file.id)
      }
    }
  }, [existingRecord, form])

  const createMutation = useMutation({
    mutationFn: (data: CreateFinancialRecordRequest) =>
      businessService.createFinancialRecord(projectId, data),
    onSuccess: () => {
      message.success('开票记录创建成功')
      queryClient.invalidateQueries({ queryKey: ['projectFinancial', projectId] })
      form.resetFields()
      setFileList([])
      setUploadedFileId(undefined)
      onSuccess?.()
    },
    onError: (error: any) => {
      message.error(error.message || '创建失败')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateFinancialRecordRequest>) =>
      businessService.updateFinancialRecord(projectId, recordId!, data),
    onSuccess: () => {
      message.success('开票记录更新成功')
      queryClient.invalidateQueries({ queryKey: ['projectFinancial', projectId] })
      queryClient.invalidateQueries({ queryKey: ['financialRecord', recordId] })
      onSuccess?.()
    },
    onError: (error: any) => {
      message.error(error.message || '更新失败')
    },
  })

  const handleFileChange = (info: any) => {
    let newFileList = [...info.fileList]
    newFileList = newFileList.slice(-1) // Limit to 1 file
    setFileList(newFileList)

    // If file is removed, clear uploadedFileId
    if (newFileList.length === 0) {
      setUploadedFileId(undefined)
    }
  }

  const beforeUpload = (file: any) => {
    const isLt100M = (file as any).size / 1024 / 1024 < 100
    if (!isLt100M) {
      message.error('文件大小不能超过100MB')
      return false
    }
    return false // Prevent auto-upload, handle manually in form submit
  }

  const handleSubmit = async (values: any) => {
    if (!canManage && !recordId) {
      message.error('您没有权限创建开票记录')
      return
    }

    // 处理文件上传
    const currentFile = fileList[0]
    let fileId: string | undefined = undefined

    // 如果文件列表为空，fileId 为 undefined（用于清除发票文件关联）
    if (fileList.length === 0) {
      fileId = undefined
    }
    // 如果有新选择的文件但未上传，先上传文件
    else if (currentFile && currentFile.originFileObj && currentFile.status !== 'done') {
      try {
        message.loading({ content: '正在上传文件...', key: 'uploading' })
        const uploadedFile = await fileService.uploadFile(
          projectId,
          currentFile.originFileObj,
          'invoice',
          '发票文件'
        )
        fileId = uploadedFile.id
        setUploadedFileId(uploadedFile.id)
        // 更新文件列表状态
        setFileList([
          {
            ...currentFile,
            status: 'done',
            response: uploadedFile,
            url: `/user/files/${uploadedFile.id}/download`,
          },
        ])
        message.success({ content: '文件上传成功', key: 'uploading' })
      } catch (error: any) {
        message.error({ content: error.message || '文件上传失败', key: 'uploading' })
        return
      }
    }
    // 如果文件已上传（状态为 'done'），使用已上传的文件ID
    else if (currentFile && currentFile.status === 'done') {
      // 优先使用 uploadedFileId，如果没有则从 existingRecord 获取
      fileId = uploadedFileId || existingRecord?.invoice_file?.id
    }
    // 如果是编辑模式且没有新文件，使用已有文件的ID
    else if (recordId && !currentFile) {
      fileId = existingRecord?.invoice_file?.id
    }

    const occurredAt = values.occurred_at
      ? values.occurred_at.format('YYYY-MM-DD')
      : dayjs().format('YYYY-MM-DD')

    const data: CreateFinancialRecordRequest = {
      financial_type: 'our_invoice',
      direction: 'income',
      amount: values.amount,
      occurred_at: occurredAt,
      client_id: values.client_id,
      related_payment_id: values.related_payment_id,
      invoice_file_id: fileId,
      description: values.description,
    }

    if (recordId) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  const isLoading = isLoadingRecord
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  if (canManage === false && !recordId) {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: '#999' }}>
        您没有权限创建开票记录
      </div>
    )
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        occurred_at: dayjs(),
      }}
    >
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="甲方"
            name="client_id"
            rules={[{ required: true, message: '请选择甲方' }]}
          >
            <Select
              placeholder="请选择甲方"
              showSearch
              filterOption={(input, option) => {
                const children = option?.children;
                if (Array.isArray(children)) {
                  return children.some((child: any) => 
                    String(child).toLowerCase().includes(input.toLowerCase())
                  );
                }
                return String(children || '').toLowerCase().includes(input.toLowerCase());
              }}
              disabled={canManage === false}
            >
              {clients.map((client) => (
                <Select.Option key={client.id} value={client.id}>
                  {client.client_name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="开票时间"
            name="occurred_at"
            rules={[{ required: true, message: '请选择开票时间' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
              disabled={canManage === false}
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        label="开票金额"
        name="amount"
        rules={[
          { required: true, message: '请输入开票金额' },
          { type: 'number', min: 0.01, message: '开票金额必须大于0' },
        ]}
      >
        <InputNumber
          style={{ width: '100%' }}
          prefix="¥"
          precision={2}
          placeholder="请输入开票金额"
          disabled={canManage === false}
        />
      </Form.Item>

      <Form.Item
        label="关联支付记录"
        name="related_payment_id"
        tooltip="可选择关联的甲方支付记录"
      >
        <Select
          placeholder="请选择关联的支付记录（可选）"
          allowClear
        >
          {paymentRecords.map((payment) => (
            <Select.Option key={payment.id} value={payment.id}>
              {dayjs(payment.occurred_at).format('YYYY-MM-DD')} - ¥
              {payment.amount.toLocaleString()}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        label="发票文件"
        tooltip="可选，支持上传发票文件"
      >
        <Upload
          fileList={fileList}
          onChange={handleFileChange}
          beforeUpload={beforeUpload}
          maxCount={1}
          disabled={canManage === false}
        >
          <Button icon={<UploadOutlined />} disabled={canManage === false}>
            选择文件
          </Button>
        </Upload>
        <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
          支持上传发票文件，文件大小不超过100MB（可选）
        </div>
      </Form.Item>

      <Form.Item name="description" label="备注">
        <TextArea rows={3} placeholder="请输入备注信息（可选）" />
      </Form.Item>

      <Form.Item>
        <Space>
          <Button
            type="primary"
            htmlType="submit"
            loading={isSubmitting}
            disabled={isLoading}
          >
            {recordId ? '更新' : '提交'}
          </Button>
          {onCancel && <Button onClick={onCancel}>取消</Button>}
        </Space>
      </Form.Item>
    </Form>
  )
}

