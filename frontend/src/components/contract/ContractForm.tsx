import { useEffect } from 'react'
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
} from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { businessService } from '@/services/business'
import type { CreateContractRequest } from '@/types'
import dayjs from 'dayjs'

const { TextArea } = Input

interface ContractFormProps {
  projectId: number
  contractId?: number
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
        contract_type: existingContract.contract_type,
        sign_date: existingContract.sign_date
          ? dayjs(existingContract.sign_date)
          : null,
        contract_rate: existingContract.contract_rate || 0,
        design_fee: existingContract.design_fee || 0,
        survey_fee: existingContract.survey_fee || 0,
        consultation_fee: existingContract.consultation_fee || 0,
        file_path: existingContract.file_path || '',
      })
    }
  }, [existingContract, form])

  const createMutation = useMutation({
    mutationFn: (data: CreateContractRequest) =>
      businessService.createContract(projectId, data),
    onSuccess: () => {
      message.success('合同创建成功')
      queryClient.invalidateQueries({ queryKey: ['contracts', projectId] })
      form.resetFields()
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

  const handleSubmit = async (values: any) => {
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
      contract_type: values.contract_type,
      sign_date: signDate || '',
      contract_rate: values.contract_rate || undefined,
      contract_amount: contractAmount,
      design_fee: designFee > 0 ? designFee : undefined,
      survey_fee: surveyFee > 0 ? surveyFee : undefined,
      consultation_fee: consultationFee > 0 ? consultationFee : undefined,
      file_path: values.file_path || undefined,
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
              <Input placeholder="HT-YYYY-XXX" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="合同类型"
              name="contract_type"
              rules={[{ required: true, message: '请选择合同类型' }]}
            >
              <Input placeholder="设计费、勘察费、咨询费" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="签订日期"
              name="sign_date"
              rules={[{ required: true, message: '请选择签订日期' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="合同费率(%)" name="contract_rate">
              <InputNumber
                min={0}
                max={100}
                style={{ width: '100%' }}
                placeholder="0-100"
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
          <Col span={12}>
            <Form.Item label="合同文件路径" name="file_path">
              <Input placeholder="文件路径" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={isSubmitting}>
              保存
            </Button>
            {onCancel && <Button onClick={onCancel}>取消</Button>}
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}
