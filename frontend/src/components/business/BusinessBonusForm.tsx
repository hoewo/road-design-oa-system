import { useEffect } from 'react'
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
} from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { businessService } from '@/services/business'
import { permissionService } from '@/services/permission'
import type { CreateFinancialRecordRequest, FinancialRecord } from '@/types'
import dayjs from 'dayjs'

const { TextArea } = Input

interface BusinessBonusFormProps {
  projectId: string
  recordId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

export const BusinessBonusForm = ({
  projectId,
  recordId,
  onSuccess,
  onCancel,
}: BusinessBonusFormProps) => {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

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

  // Load available users for recipient selection
  const { data: availableUsers = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['availableUsersForMember'],
    queryFn: () => permissionService.getAvailableUsersForMember(),
  })

  // Set form values when record data is loaded
  useEffect(() => {
    if (existingRecord) {
      form.setFieldsValue({
        recipient_id: existingRecord.recipient_id,
        amount: existingRecord.amount,
        occurred_at: existingRecord.occurred_at
          ? dayjs(existingRecord.occurred_at)
          : null,
        description: existingRecord.description,
      })
    }
  }, [existingRecord, form])

  const createMutation = useMutation({
    mutationFn: (data: CreateFinancialRecordRequest) =>
      businessService.createFinancialRecord(projectId, data),
    onSuccess: () => {
      message.success('经营奖金记录创建成功')
      queryClient.invalidateQueries({ queryKey: ['projectFinancial', projectId] })
      form.resetFields()
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
      message.success('经营奖金记录更新成功')
      queryClient.invalidateQueries({ queryKey: ['projectFinancial', projectId] })
      queryClient.invalidateQueries({ queryKey: ['financialRecord', recordId] })
      onSuccess?.()
    },
    onError: (error: any) => {
      message.error(error.message || '更新失败')
    },
  })

  const handleSubmit = async (values: any) => {
    if (!canManage) {
      message.error('您没有权限管理经营信息')
      return
    }

    const occurredAt = values.occurred_at
      ? values.occurred_at.format('YYYY-MM-DD')
      : dayjs().format('YYYY-MM-DD')

    const data: CreateFinancialRecordRequest = {
      financial_type: 'bonus',
      direction: 'expense',
      amount: values.amount,
      occurred_at: occurredAt,
      bonus_category: 'business',
      recipient_id: values.recipient_id,
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
        您没有权限创建经营奖金记录
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
            label="发放人员"
            name="recipient_id"
            rules={[{ required: true, message: '请选择发放人员' }]}
          >
            <Select
              placeholder={isLoadingUsers ? '加载中...' : availableUsers.length === 0 ? '暂无可用用户' : '请选择发放人员'}
              showSearch
              loading={isLoadingUsers}
              filterOption={(input, option) =>
                (option?.children as string)
                  ?.toLowerCase()
                  .includes(input.toLowerCase())
              }
              disabled={canManage === false || isLoadingUsers}
              notFoundContent={isLoadingUsers ? '加载中...' : availableUsers.length === 0 ? '暂无可用用户' : undefined}
            >
              {availableUsers.map((user) => (
                <Select.Option key={user.id} value={user.id}>
                  {user.real_name ? `${user.real_name} (${user.username})` : user.username}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="发放时间"
            name="occurred_at"
            rules={[{ required: true, message: '请选择发放时间' }]}
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
        label="奖金金额"
        name="amount"
        rules={[
          { required: true, message: '请输入奖金金额' },
          { type: 'number', min: 0.01, message: '奖金金额必须大于0' },
        ]}
      >
        <InputNumber
          style={{ width: '100%' }}
          prefix="¥"
          precision={2}
          placeholder="请输入奖金金额"
          disabled={canManage === false}
        />
      </Form.Item>

      <Form.Item name="description" label="备注">
        <TextArea
          rows={3}
          placeholder="请输入备注信息（可选）"
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
              {recordId ? '更新' : '提交'}
            </Button>
          )}
          {onCancel && <Button onClick={onCancel}>取消</Button>}
        </Space>
      </Form.Item>
    </Form>
  )
}

