import {
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Button,
  message,
  Space,
} from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { productionService } from '@/services/production'
import { businessService } from '@/services/business'
import { userService } from '@/services/user'
import type { CreateProductionApprovalRequest, User } from '@/types'
import dayjs from 'dayjs'

interface ProductionAuditFormProps {
  projectId: number
  onSuccess?: () => void
}

export const ProductionAuditForm = ({
  projectId,
  onSuccess,
}: ProductionAuditFormProps) => {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const { data: usersData } = useQuery({
    queryKey: ['users', { is_active: true }],
    queryFn: () => userService.listUsers({ is_active: true, size: 1000 }),
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateProductionApprovalRequest) =>
      productionService.createApproval(projectId, data),
    onSuccess: () => {
      message.success('审核/审定记录创建成功')
      form.resetFields()
      queryClient.invalidateQueries({
        queryKey: ['productionApprovals', projectId],
      })
      onSuccess?.()
    },
    onError: (error: any) => {
      message.error(error.message || '创建失败')
    },
  })

  const handleGetContractAmount = async () => {
    try {
      const contracts = await businessService.getContracts(projectId)
      if (contracts.length === 0) {
        message.warning('该项目暂无合同信息')
        return
      }
      const total = contracts.reduce(
        (acc: any, contract: any) => ({
          design_fee: acc.design_fee + (contract.design_fee || 0),
          survey_fee: acc.survey_fee + (contract.survey_fee || 0),
          consultation_fee:
            acc.consultation_fee + (contract.consultation_fee || 0),
        }),
        { design_fee: 0, survey_fee: 0, consultation_fee: 0 }
      )
      form.setFieldsValue({
        amount_design: total.design_fee,
        amount_survey: total.survey_fee,
        amount_consultation: total.consultation_fee,
        default_amount_reference: `设计费: ${total.design_fee}, 勘察费: ${total.survey_fee}, 咨询费: ${total.consultation_fee}`,
      })
      message.success('已引用合同金额')
    } catch (error: any) {
      message.error(error.message || '获取合同金额失败')
    }
  }

  const handleFinish = (values: any) => {
    const data: CreateProductionApprovalRequest = {
      record_type: values.record_type,
      approver_id: values.approver_id,
      status: values.status,
      signed_at: values.signed_at
        ? dayjs(values.signed_at).toISOString()
        : undefined,
      attachment_file_id: values.attachment_file_id,
      remarks: values.remarks,
      report_type: values.report_type,
      report_file_id: values.report_file_id,
      amount_design: values.amount_design || 0,
      amount_survey: values.amount_survey || 0,
      amount_consultation: values.amount_consultation || 0,
      source_contract_id: values.source_contract_id,
      default_amount_reference: values.default_amount_reference,
      override_reason: values.override_reason,
    }
    createMutation.mutate(data)
  }

  const users = usersData?.data || []

  return (
    <Form form={form} layout="vertical" onFinish={handleFinish}>
      <Form.Item
        name="record_type"
        label="记录类型"
        rules={[{ required: true, message: '请选择记录类型' }]}
      >
        <Select>
          <Select.Option value="review">审核</Select.Option>
          <Select.Option value="approval">审定</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item
        name="approver_id"
        label="审核/审定人"
        rules={[{ required: true, message: '请选择审核/审定人' }]}
      >
        <Select placeholder="请选择审核/审定人">
          {users.map((user: User) => (
            <Select.Option key={user.id} value={user.id}>
              {user.real_name} ({user.username})
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="status"
        label="状态"
        rules={[{ required: true, message: '请选择状态' }]}
      >
        <Select>
          <Select.Option value="pending">待处理</Select.Option>
          <Select.Option value="in_progress">进行中</Select.Option>
          <Select.Option value="completed">已完成</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item name="signed_at" label="签署时间">
        <DatePicker style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item name="remarks" label="备注">
        <Input.TextArea rows={3} />
      </Form.Item>

      <Form.Item
        name="report_type"
        label="报告类型"
        rules={[{ required: true, message: '请选择报告类型' }]}
      >
        <Select>
          <Select.Option value="approval">批复</Select.Option>
          <Select.Option value="audit">审计</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item label="金额信息">
        <Space.Compact style={{ width: '100%' }}>
          <Button onClick={handleGetContractAmount}>引用合同金额</Button>
        </Space.Compact>
      </Form.Item>

      <Form.Item name="amount_design" label="设计费">
        <InputNumber style={{ width: '100%' }} min={0} />
      </Form.Item>

      <Form.Item name="amount_survey" label="勘察费">
        <InputNumber style={{ width: '100%' }} min={0} />
      </Form.Item>

      <Form.Item name="amount_consultation" label="咨询费">
        <InputNumber style={{ width: '100%' }} min={0} />
      </Form.Item>

      <Form.Item name="override_reason" label="覆盖原因">
        <Input.TextArea
          rows={2}
          placeholder="如果金额与合同不一致，请说明原因"
        />
      </Form.Item>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={createMutation.isPending}
        >
          提交
        </Button>
      </Form.Item>
    </Form>
  )
}
