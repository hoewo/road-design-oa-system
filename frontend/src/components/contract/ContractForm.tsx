import { useState, useEffect } from 'react'
import {
  Form,
  Input,
  DatePicker,
  InputNumber,
  Button,
  Space,
  message,
  Row,
  Col,
  Card,
  Divider,
  Upload,
} from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { businessService } from '@/services/business'
import { permissionService } from '@/services/permission'
import { fileService } from '@/services/file'
import type { CreateContractRequest } from '@/types'
import dayjs from 'dayjs'
import type { UploadFile } from 'antd'

interface ContractFormProps {
  projectId: string
  contractId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

export const ContractForm = ({
  projectId,
  contractId,
  onSuccess,
  onCancel,
}: ContractFormProps) => {
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

  // Load existing contract data if editing
  const { data: existingContract, isLoading: isLoadingContract } = useQuery({
    queryKey: ['contract', contractId],
    queryFn: () => businessService.getContract(contractId!),
    enabled: !!contractId,
  })

  // Set form values when contract data is loaded
  useEffect(() => {
    if (existingContract) {
      form.setFieldsValue({
        contract_number: existingContract.contract_number,
        sign_date: existingContract.sign_date
          ? dayjs(existingContract.sign_date)
          : null,
        contract_rate: existingContract.contract_rate ? existingContract.contract_rate * 100 : undefined,
        design_fee: existingContract.design_fee || 0,
        survey_fee: existingContract.survey_fee || 0,
        consultation_fee: existingContract.consultation_fee || 0,
      })
      // Load existing contract file if available
      if (existingContract.contract_file) {
        setFileList([
          {
            uid: existingContract.contract_file.id,
            name: existingContract.contract_file.original_name,
            status: 'done',
            url: `/user/files/${existingContract.contract_file.id}/download`,
          },
        ])
        setUploadedFileId(existingContract.contract_file.id)
      }
    }
  }, [existingContract, form])

  // 文件上传现在在表单提交时处理，不再需要单独的 mutation

  const createMutation = useMutation({
    mutationFn: (data: CreateContractRequest) =>
      businessService.createContract(projectId, data),
    onSuccess: () => {
      message.success('合同创建成功')
      queryClient.invalidateQueries({ queryKey: ['contracts', projectId] })
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
    mutationFn: (data: CreateContractRequest) =>
      businessService.updateContract(contractId!, data),
    onSuccess: () => {
      message.success('合同更新成功')
      queryClient.invalidateQueries({ queryKey: ['contracts', projectId] })
      queryClient.invalidateQueries({ queryKey: ['contract', contractId] })
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

    // 如果文件被删除，清空 uploadedFileId
    // 这样在提交时，如果 fileList 为空，fileId 会是 undefined，可以清除合同文件关联
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
    if (!canManage && !contractId) {
      message.error('您没有权限创建合同')
      return
    }

    // 处理文件上传
    const currentFile = fileList[0]
    let fileId: string | undefined = undefined

    // 如果文件列表为空，fileId 为 undefined（用于清除合同文件关联）
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
          'contract_main',
          '合同文件'
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
      // 优先使用 uploadedFileId，如果没有则从 existingContract 获取
      fileId = uploadedFileId || existingContract?.contract_file?.id
    }
    // 如果是编辑模式且没有新文件，使用已有文件的ID
    else if (contractId && !currentFile) {
      fileId = existingContract?.contract_file?.id
    }

    // Calculate contract amount from fee breakdown
    const designFee = values.design_fee || 0
    const surveyFee = values.survey_fee || 0
    const consultationFee = values.consultation_fee || 0
    const contractAmount = designFee + surveyFee + consultationFee

    // Format date as ISO 8601 string (YYYY-MM-DDTHH:mm:ssZ)
    // Go's time.Time can parse this format
    const signDate = values.sign_date
      ? values.sign_date.format('YYYY-MM-DDTHH:mm:ssZ')
      : null

    const data: CreateContractRequest = {
      contract_number: values.contract_number,
      sign_date: signDate || '',
      contract_rate: values.contract_rate ? values.contract_rate / 100 : undefined,
      contract_amount: contractAmount,
      design_fee: designFee > 0 ? designFee : undefined,
      survey_fee: surveyFee > 0 ? surveyFee : undefined,
      consultation_fee: consultationFee > 0 ? consultationFee : undefined,
      contract_file_id: fileId,
    }

    if (contractId) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  // Watch fee fields to auto-calculate contract amount
  const designFee = Form.useWatch('design_fee', form) || 0
  const surveyFee = Form.useWatch('survey_fee', form) || 0
  const consultationFee = Form.useWatch('consultation_fee', form) || 0
  const totalAmount = designFee + surveyFee + consultationFee

  const isLoading = isLoadingContract
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <Card title={contractId ? '编辑合同' : '新建合同'} loading={isLoading}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          contract_rate: 0,
          design_fee: 0,
          survey_fee: 0,
          consultation_fee: 0,
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="合同编号"
              name="contract_number"
              rules={[{ required: true, message: '请输入合同编号' }]}
            >
              <Input placeholder="HT-YYYY-XXX" disabled={canManage === false} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="签订日期"
              name="sign_date"
              rules={[{ required: true, message: '请选择签订日期' }]}
            >
              <DatePicker style={{ width: '100%' }} disabled={canManage === false} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="合同费率(%)" name="contract_rate">
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

        <Divider>费用明细</Divider>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="设计费" name="design_fee">
              <InputNumber
                min={0}
                precision={2}
                style={{ width: '100%' }}
                placeholder="0.00"
                disabled={canManage === false}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="勘察费" name="survey_fee">
              <InputNumber
                min={0}
                precision={2}
                style={{ width: '100%' }}
                placeholder="0.00"
                disabled={canManage === false}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="咨询费" name="consultation_fee">
              <InputNumber
                min={0}
                precision={2}
                style={{ width: '100%' }}
                placeholder="0.00"
                disabled={canManage === false}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="合同金额（自动计算）">
              <InputNumber
                value={totalAmount}
                precision={2}
                style={{ width: '100%' }}
                disabled
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider>合同文件</Divider>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item label="合同文件">
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
                支持上传合同文件，文件大小不超过100MB
              </div>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item>
          <Space>
            {canManage && (
            <Button type="primary" htmlType="submit" loading={isSubmitting}>
                {contractId ? '更新' : '保存'}
            </Button>
            )}
            {onCancel && <Button onClick={onCancel}>取消</Button>}
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}
