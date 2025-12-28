import { useState, useEffect } from 'react'
import {
  Form,
  Input,
  DatePicker,
  Button,
  Space,
  message,
  Row,
  Col,
  Card,
  InputNumber,
  Upload,
} from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { businessService } from '@/services/business'
import { permissionService } from '@/services/permission'
import { fileService } from '@/services/file'
import type { CreateContractAmendmentRequest } from '@/types'
import dayjs from 'dayjs'
import type { UploadFile } from 'antd'

const { TextArea } = Input

interface ContractAmendmentFormProps {
  projectId: string
  contractId: string
  amendmentId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

export const ContractAmendmentForm = ({
  projectId,
  contractId,
  amendmentId,
  onSuccess,
  onCancel,
}: ContractAmendmentFormProps) => {
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

  // Load existing amendment data if editing
  const { data: existingAmendment, isLoading: isLoadingAmendment } = useQuery({
    queryKey: ['contractAmendment', amendmentId],
    queryFn: async () => {
      if (!amendmentId) return null
      const amendments = await businessService.getContractAmendments(projectId, contractId)
      return amendments.find((a) => a.id === amendmentId) || null
    },
    enabled: !!amendmentId,
  })

  // Set form values when amendment data is loaded
  useEffect(() => {
    if (existingAmendment) {
      form.setFieldsValue({
        amendment_number: existingAmendment.amendment_number,
        sign_date: existingAmendment.sign_date ? dayjs(existingAmendment.sign_date) : null,
        design_fee: existingAmendment.design_fee,
        survey_fee: existingAmendment.survey_fee,
        consultation_fee: existingAmendment.consultation_fee,
        contract_rate: existingAmendment.contract_rate ? existingAmendment.contract_rate * 100 : undefined,
        description: existingAmendment.description,
      })
      if (existingAmendment.amendment_file) {
        setFileList([
          {
            uid: existingAmendment.amendment_file.id,
            name: existingAmendment.amendment_file.original_name,
            status: 'done',
            url: `/user/files/${existingAmendment.amendment_file.id}/download`,
          },
        ])
        setUploadedFileId(existingAmendment.amendment_file.id)
      }
    }
  }, [existingAmendment, form])

  const createMutation = useMutation({
    mutationFn: (data: CreateContractAmendmentRequest) =>
      businessService.createContractAmendment(projectId, contractId, data),
    onSuccess: () => {
      message.success('补充协议创建成功')
      queryClient.invalidateQueries({
        queryKey: ['contractAmendments', projectId, contractId],
      })
      queryClient.invalidateQueries({
        queryKey: ['projectAmendments', projectId],
      })
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
    mutationFn: (data: Partial<CreateContractAmendmentRequest>) =>
      businessService.updateContractAmendment(projectId, contractId, amendmentId!, data),
    onSuccess: () => {
      message.success('补充协议更新成功')
      queryClient.invalidateQueries({
        queryKey: ['contractAmendments', projectId, contractId],
      })
      queryClient.invalidateQueries({
        queryKey: ['projectAmendments', projectId],
      })
      queryClient.invalidateQueries({
        queryKey: ['contractAmendment', amendmentId],
      })
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

  const beforeUpload = (file: File) => {
    const isLt100M = file.size / 1024 / 1024 < 100
    if (!isLt100M) {
      message.error('文件大小不能超过100MB')
      return false
    }
    return false // Prevent auto-upload, handle manually in form submit
  }

  const handleSubmit = async (values: any) => {
    if (!canManage && !amendmentId) {
      message.error('您没有权限创建补充协议')
      return
    }

    // 处理文件上传
    const currentFile = fileList[0]
    let fileId: string | undefined = undefined

    // 如果文件列表为空，fileId 为 undefined（用于清除补充协议文件关联）
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
          'contract_amendment',
          '补充协议文件'
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
      // 优先使用 uploadedFileId，如果没有则从 existingAmendment 获取
      fileId = uploadedFileId || existingAmendment?.amendment_file?.id
    }
    // 如果是编辑模式且没有新文件，使用已有文件的ID
    else if (amendmentId && !currentFile) {
      fileId = existingAmendment?.amendment_file?.id
    }

    // Format date as ISO 8601 string (YYYY-MM-DDTHH:mm:ssZ)
    // Go's time.Time can parse this format
    const signDate = values.sign_date
      ? values.sign_date.format('YYYY-MM-DDTHH:mm:ssZ')
      : null

    const data: CreateContractAmendmentRequest = {
      amendment_number: values.amendment_number,
      sign_date: signDate || '',
      design_fee: values.design_fee || 0,
      survey_fee: values.survey_fee || 0,
      consultation_fee: values.consultation_fee || 0,
      contract_rate: values.contract_rate ? values.contract_rate / 100 : undefined,
      amendment_file_id: fileId,
      description: values.description,
    }

    if (amendmentId) {
      updateMutation.mutate(data)
    } else {
    createMutation.mutate(data)
    }
  }

  const isLoading = isLoadingAmendment
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  if (canManage === false && !amendmentId) {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: '#999' }}>
        您没有权限创建补充协议
      </div>
    )
  }

  return (
    <Card title={amendmentId ? '编辑补充协议' : '新建补充协议'}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          design_fee: 0,
          survey_fee: 0,
          consultation_fee: 0,
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="补充协议编号"
              name="amendment_number"
              rules={[{ required: true, message: '请输入补充协议编号' }]}
            >
              <Input placeholder="XIE-YYYY-XXX" disabled={canManage === false} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="签订日期"
              name="sign_date"
              rules={[{ required: true, message: '请选择签订日期' }]}
            >
              <DatePicker
                style={{ width: '100%' }}
                format="YYYY-MM-DD"
                disabled={canManage === false}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="设计费"
              name="design_fee"
              rules={[{ type: 'number', min: 0, message: '设计费不能小于0' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                prefix="¥"
                precision={2}
                placeholder="请输入设计费"
                disabled={canManage === false}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="勘察费"
              name="survey_fee"
              rules={[{ type: 'number', min: 0, message: '勘察费不能小于0' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                prefix="¥"
                precision={2}
                placeholder="请输入勘察费"
                disabled={canManage === false}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="咨询费"
              name="consultation_fee"
              rules={[{ type: 'number', min: 0, message: '咨询费不能小于0' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                prefix="¥"
                precision={2}
                placeholder="请输入咨询费"
                disabled={canManage === false}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="合同费率(%)"
              name="contract_rate"
              rules={[{ type: 'number', min: 0, max: 100, message: '合同费率应在0-100之间' }]}
            >
              <InputNumber
                min={0}
                max={100}
                precision={2}
                step={0.01}
                style={{ width: '100%' }}
                placeholder="例如：15.5 (表示15.5%)"
                disabled={canManage === false}
                addonAfter="%"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="补充协议文件"
          tooltip="可选，支持上传补充协议文件"
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
            支持上传补充协议文件，文件大小不超过100MB（可选）
          </div>
        </Form.Item>

        <Form.Item label="备注" name="description">
          <TextArea
            rows={4}
            placeholder="请输入备注信息"
            disabled={canManage === false}
          />
        </Form.Item>

        <Form.Item>
          <Space>
            {canManage && (
            <Button
              type="primary"
              htmlType="submit"
                loading={isSubmitting}
                disabled={isLoading}
            >
                {amendmentId ? '更新' : '保存'}
            </Button>
            )}
            {onCancel && <Button onClick={onCancel}>取消</Button>}
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}
