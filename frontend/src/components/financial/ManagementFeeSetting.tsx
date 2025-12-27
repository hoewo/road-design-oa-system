import { Form, InputNumber, Button, Space, message, Card } from 'antd'
import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { companyConfigService } from '@/services/company_config'

interface ManagementFeeSettingProps {
  onSuccess?: () => void
}

/**
 * 管理费设置组件
 * T261: 创建前端管理费设置组件
 */
export const ManagementFeeSetting = ({ onSuccess }: ManagementFeeSettingProps) => {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  // Fetch current default management fee ratio
  const { data: currentRatio, isLoading } = useQuery({
    queryKey: ['defaultManagementFeeRatio'],
    queryFn: async () => {
      const ratio = await companyConfigService.getDefaultManagementFeeRatio()
      // 后端返回的是小数（0-1），转换为百分比（0-100）
      return ratio * 100
    },
  })

  // Update form when data loads
  useEffect(() => {
    if (currentRatio !== undefined) {
      form.setFieldsValue({
        ratio: currentRatio,
      })
    }
  }, [currentRatio, form])

  const updateMutation = useMutation({
    mutationFn: async (data: { ratio: number; description?: string }) => {
      // 前端输入的是百分比（0-100），需要转换为小数（0-1）
      const ratioDecimal = data.ratio / 100
      return companyConfigService.updateDefaultManagementFeeRatio(ratioDecimal, data.description)
    },
    onSuccess: () => {
      message.success('管理费比例设置成功')
      queryClient.invalidateQueries({
        queryKey: ['defaultManagementFeeRatio'],
      })
      onSuccess?.()
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || '设置失败'
      message.error(errorMessage)
    },
  })

  const handleSubmit = (values: { ratio: number; description?: string }) => {
    updateMutation.mutate(values)
  }

  const handleReset = () => {
    form.setFieldsValue({ ratio: currentRatio || 0 })
  }

  return (
    <Card title="管理费设置" loading={isLoading}>
      <Form
        form={form}
        layout="inline"
        onFinish={handleSubmit}
        initialValues={{
          ratio: currentRatio || 0,
        }}
        style={{ alignItems: 'flex-end' }}
      >
        <Form.Item
          label="管理费比例"
          name="ratio"
          rules={[
            { required: true, message: '请输入管理费比例' },
            {
              type: 'number',
              min: 0,
              max: 100,
              message: '管理费比例必须在 0 到 100 之间',
            },
          ]}
        >
          <InputNumber
            min={0}
            max={100}
            step={0.1}
            precision={1}
            style={{ width: 150 }}
            placeholder="例如：10"
            addonAfter="%"
          />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={updateMutation.isPending}
            >
              保存设置
            </Button>
            <Button onClick={handleReset}>
              重置
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}

