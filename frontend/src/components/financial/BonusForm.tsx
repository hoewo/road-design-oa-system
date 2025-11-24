import { useEffect } from 'react'
import { Form, Input, InputNumber, Select, Button, Space, message } from 'antd'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { businessService } from '@/services/business'
import type { CreateBonusRequest, Bonus } from '@/types'

const { Option } = Select
const { TextArea } = Input

interface BonusFormProps {
  projectId: number
  bonusId?: number
  onSuccess?: () => void
  onCancel?: () => void
}

export const BonusForm = ({
  projectId,
  bonusId,
  onSuccess,
  onCancel,
}: BonusFormProps) => {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const isEdit = !!bonusId

  const { data: existingBonus } = useQuery({
    queryKey: ['bonus', bonusId],
    queryFn: () => {
      if (!bonusId) return null
      return (
        queryClient
          .getQueryData<Bonus[]>(['bonuses', projectId])
          ?.find((b) => b.id === bonusId) || null
      )
    },
    enabled: !!bonusId,
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateBonusRequest) =>
      businessService.createBonus(projectId, data),
    onSuccess: () => {
      message.success('奖金记录创建成功')
      queryClient.invalidateQueries({ queryKey: ['bonuses', projectId] })
      form.resetFields()
      onSuccess?.()
    },
    onError: (error: any) => {
      message.error(error.message || '创建失败')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateBonusRequest>) =>
      businessService.updateBonus(bonusId!, data),
    onSuccess: () => {
      message.success('奖金记录更新成功')
      queryClient.invalidateQueries({ queryKey: ['bonuses', projectId] })
      onSuccess?.()
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '更新失败')
    },
  })

  // Load existing bonus data when editing
  useEffect(() => {
    if (existingBonus && isEdit) {
      form.setFieldsValue({
        user_id: existingBonus.user_id,
        bonus_type: existingBonus.bonus_type,
        amount: existingBonus.amount,
        description: existingBonus.description,
      })
    }
  }, [existingBonus, isEdit, form])

  const handleSubmit = async (values: any) => {
    const data: Partial<CreateBonusRequest> = {
      user_id: values.user_id,
      bonus_type: values.bonus_type,
      amount: values.amount,
      description: values.description,
    }

    if (isEdit) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data as CreateBonusRequest)
    }
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        bonus_type: 'business',
      }}
    >
      <Form.Item
        name="bonus_type"
        label="奖金类型"
        rules={[{ required: true, message: '请选择奖金类型' }]}
      >
        <Select>
          <Option value="business">经营奖金</Option>
          <Option value="production">生产奖金</Option>
        </Select>
      </Form.Item>

      <Form.Item
        name="user_id"
        label="人员ID"
        rules={[
          { required: true, message: '请输入人员ID' },
          { type: 'number', min: 1, message: '人员ID必须大于0' },
        ]}
      >
        <InputNumber style={{ width: '100%' }} placeholder="请输入人员ID" />
      </Form.Item>

      <Form.Item
        name="amount"
        label="金额"
        rules={[
          { required: true, message: '请输入金额' },
          { type: 'number', min: 0, message: '金额不能小于0' },
        ]}
      >
        <InputNumber
          style={{ width: '100%' }}
          prefix="¥"
          precision={2}
          placeholder="请输入金额"
        />
      </Form.Item>

      <Form.Item name="description" label="备注">
        <TextArea rows={3} placeholder="请输入备注信息" />
      </Form.Item>

      <Form.Item>
        <Space>
          <Button
            type="primary"
            htmlType="submit"
            loading={
              isEdit ? updateMutation.isPending : createMutation.isPending
            }
          >
            {isEdit ? '更新' : '提交'}
          </Button>
          <Button onClick={onCancel}>取消</Button>
        </Space>
      </Form.Item>
    </Form>
  )
}
