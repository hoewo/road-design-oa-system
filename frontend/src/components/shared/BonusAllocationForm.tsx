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
import { projectMemberService } from '@/services/projectMember'
import type { CreateFinancialRecordRequest, FinancialRecord } from '@/types'
import dayjs from 'dayjs'

const { TextArea } = Input

interface BonusAllocationFormProps {
  projectId: string
  bonusType: 'business' | 'production'
  recordId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

/**
 * 可复用的奖金分配表单组件
 * 支持创建和编辑模式，统一经营奖金和生产奖金交互
 * T496: 创建可复用的奖金分配表单组件
 */
export const BonusAllocationForm = ({
  projectId,
  bonusType,
  recordId,
  onSuccess,
  onCancel,
}: BonusAllocationFormProps) => {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  // Check permission based on bonus type
  const permissionKey =
    bonusType === 'business' ? 'canManageBusinessInfo' : 'canManageProductionInfo'
  const permissionFn =
    bonusType === 'business'
      ? permissionService.canManageBusinessInfo
      : permissionService.canManageProductionInfo

  const { data: canManage } = useQuery({
    queryKey: [permissionKey, projectId],
    queryFn: () => permissionFn(projectId),
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
  // 经营奖金：所有可用用户
  // 生产奖金：项目生产人员列表（设计人、参与人、复核人等）
  const { data: availableUsers = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['availableUsersForBonus', projectId, bonusType],
    queryFn: async () => {
      if (bonusType === 'business') {
        // 经营奖金：获取所有可用用户（后端已去重，但前端也做一次去重确保）
        const users = await permissionService.getAvailableUsersForMember()
        // 按 user id 去重（虽然后端应该已经去重，但为了保险起见）
        const userMap = new Map<string, { id: string; username: string; real_name: string }>()
        users.forEach((user) => {
          if (user.id && !userMap.has(user.id)) {
            userMap.set(user.id, {
              id: user.id,
              username: user.username || '',
              real_name: user.real_name || '',
            })
          }
        })
        return Array.from(userMap.values())
      } else {
        // 生产奖金：获取项目生产人员
        const members = await projectMemberService.list(projectId, {
          role: undefined, // 获取所有角色
        })
        // 过滤生产人员角色：设计人、参与人、复核人、审核人、审定人
        // T502: 实现生产奖金发放人员选择逻辑（从项目生产人员列表中选择，包括设计人、参与人、复核人等）
        const productionRoles = ['designer', 'participant', 'reviewer', 'auditor', 'approver']
        // 先过滤角色，然后映射，最后按 user_id 去重（同一用户可能在不同专业或不同角色下出现多次）
        const userMap = new Map<string, { id: string; username: string; real_name: string }>()
        members
          .filter((m) => productionRoles.includes(m.role))
          .forEach((m) => {
            if (m.user_id && !userMap.has(m.user_id)) {
              userMap.set(m.user_id, {
                id: m.user_id,
                username: m.user?.username || '',
                real_name: m.user?.real_name || '',
              })
            }
          })
        return Array.from(userMap.values())
      }
    },
    enabled: !!projectId,
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
      message.success(
        bonusType === 'business' ? '经营奖金记录创建成功' : '生产奖金记录创建成功'
      )
      queryClient.invalidateQueries({ queryKey: ['projectFinancial', projectId] })
      // Invalidate statistics query
      queryClient.invalidateQueries({ 
        queryKey: [bonusType === 'production' ? 'productionBonusStatistics' : 'businessBonusStatistics', projectId] 
      })
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
      message.success(
        bonusType === 'business' ? '经营奖金记录更新成功' : '生产奖金记录更新成功'
      )
      queryClient.invalidateQueries({ queryKey: ['projectFinancial', projectId] })
      queryClient.invalidateQueries({ queryKey: ['financialRecord', recordId] })
      // Invalidate statistics query
      queryClient.invalidateQueries({ 
        queryKey: [bonusType === 'production' ? 'productionBonusStatistics' : 'businessBonusStatistics', projectId] 
      })
      onSuccess?.()
    },
    onError: (error: any) => {
      message.error(error.message || '更新失败')
    },
  })

  const handleSubmit = async (values: any) => {
    if (!canManage) {
      message.error(
        bonusType === 'business'
          ? '您没有权限管理经营信息'
          : '您没有权限管理生产信息'
      )
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
      bonus_category: bonusType,
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
        您没有权限创建{bonusType === 'business' ? '经营' : '生产'}奖金记录
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
              placeholder={
                isLoadingUsers
                  ? '加载中...'
                  : availableUsers.length === 0
                  ? '暂无可用用户'
                  : '请选择发放人员'
              }
              showSearch
              loading={isLoadingUsers}
              filterOption={(input, option) => {
                const children = option?.children
                if (Array.isArray(children)) {
                  return children.some((child: any) =>
                    String(child).toLowerCase().includes(input.toLowerCase())
                  )
                }
                return String(children || '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }}
              disabled={canManage === false || isLoadingUsers}
              notFoundContent={
                isLoadingUsers
                  ? '加载中...'
                  : availableUsers.length === 0
                  ? '暂无可用用户'
                  : undefined
              }
            >
              {availableUsers.map((user: any) => (
                <Select.Option key={user.id} value={user.id}>
                  {user.real_name
                    ? `${user.real_name} (${user.username})`
                    : user.username}
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

