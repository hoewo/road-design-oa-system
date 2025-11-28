import {
  Form,
  Input,
  InputNumber,
  Button,
  Space,
  message,
  Card,
  Typography,
  Alert,
} from 'antd'
import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { companyConfigService } from '@/services/company_config'

const { Title, Text } = Typography

interface CompanyConfigFormProps {
  onSuccess?: () => void
}

export const CompanyConfigForm = ({ onSuccess }: CompanyConfigFormProps) => {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  // Fetch current default management fee ratio
  const { data: currentRatio } = useQuery({
    queryKey: ['defaultManagementFeeRatio'],
    queryFn: () => companyConfigService.getDefaultManagementFeeRatio(),
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
    mutationFn: (data: { ratio: number; description?: string }) =>
      companyConfigService.updateDefaultManagementFeeRatio(
        data.ratio,
        data.description
      ),
    onSuccess: () => {
      message.success('默认管理费比例更新成功')
      queryClient.invalidateQueries({
        queryKey: ['defaultManagementFeeRatio'],
      })
      queryClient.invalidateQueries({
        queryKey: ['companyConfig'],
      })
      onSuccess?.()
    },
    onError: (error: any) => {
      message.error(error.message || '更新失败')
    },
  })

  const handleSubmit = (values: { ratio: number; description?: string }) => {
    updateMutation.mutate(values)
  }

  return (
    <Card>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={4}>默认管理费比例设置</Title>
          <Text type="secondary">
            设置公司级别的默认管理费比例。如果项目未设置特定的管理费比例，将使用此默认值。
          </Text>
        </div>

        <Alert
          message="说明"
          description="管理费比例范围：0-1（例如：0.15 表示 15%）。管理费计算公式：管理费 = 项目总应收金额 × 管理费比例。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            ratio: currentRatio || 0,
          }}
        >
          <Form.Item
            label="默认管理费比例"
            name="ratio"
            rules={[
              { required: true, message: '请输入管理费比例' },
              {
                type: 'number',
                min: 0,
                max: 1,
                message: '管理费比例必须在 0 到 1 之间',
              },
            ]}
            tooltip="输入 0-1 之间的数值，例如 0.15 表示 15%"
          >
            <InputNumber
              min={0}
              max={1}
              step={0.01}
              precision={4}
              style={{ width: '100%' }}
              placeholder="例如：0.15 (15%)"
              formatter={(value) => {
                if (!value) return ''
                const num = parseFloat(value.toString())
                return `${(num * 100).toFixed(2)}%`
              }}
              parser={(value) => {
                if (!value) return 0
                const num = parseFloat(value.replace('%', ''))
                const result = num / 100
                return (isNaN(result) ? 0 : result) as any
              }}
            />
          </Form.Item>

          <Form.Item
            label="说明"
            name="description"
            tooltip="可选：添加配置说明"
          >
            <Input.TextArea
              rows={3}
              placeholder="例如：公司统一管理费比例标准"
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={updateMutation.isPending}
              >
                保存
              </Button>
              <Button
                onClick={() => {
                  form.setFieldsValue({ ratio: currentRatio || 0 })
                }}
              >
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>

        {currentRatio !== undefined && (
          <div>
            <Text strong>当前默认值：</Text>
            <Text> {(currentRatio * 100).toFixed(2)}%</Text>
          </div>
        )}
      </Space>
    </Card>
  )
}
