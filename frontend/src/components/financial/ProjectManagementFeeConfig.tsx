import { useState } from 'react'
import {
  Card,
  Form,
  InputNumber,
  Switch,
  Button,
  Space,
  message,
  Modal,
  Typography,
  Alert,
} from 'antd'
import { SettingOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectService } from '@/services/project'
import { companyConfigService } from '@/services/company_config'

const { Title, Text } = Typography

interface ProjectManagementFeeConfigProps {
  projectId: number
}

export const ProjectManagementFeeConfig = ({
  projectId,
}: ProjectManagementFeeConfigProps) => {
  const [form] = Form.useForm()
  const [modalVisible, setModalVisible] = useState(false)
  const queryClient = useQueryClient()

  // Get project data to check current management fee ratio
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.getProject(projectId),
    enabled: !!projectId,
  })

  // Get company default management fee ratio
  const { data: companyDefaultRatio } = useQuery({
    queryKey: ['defaultManagementFeeRatio'],
    queryFn: () => companyConfigService.getDefaultManagementFeeRatio(),
  })

  // Management fee ratio update mutation
  const updateMutation = useMutation({
    mutationFn: (data: { management_fee_ratio: number | null }) =>
      projectService.updateProject(projectId, data),
    onSuccess: () => {
      message.success('管理费比例更新成功')
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      queryClient.invalidateQueries({
        queryKey: ['projectFinancial', projectId],
      })
      setModalVisible(false)
      form.resetFields()
    },
    onError: (error: any) => {
      message.error(error.message || '更新失败')
    },
  })

  const handleOpenModal = () => {
    const currentRatio = project?.management_fee_ratio
    const useCompanyDefault =
      currentRatio === null || currentRatio === undefined
    form.setFieldsValue({
      useCompanyDefault,
      ratio: useCompanyDefault ? companyDefaultRatio || 0 : currentRatio || 0,
    })
    setModalVisible(true)
  }

  const handleSubmit = (values: {
    useCompanyDefault: boolean
    ratio?: number
  }) => {
    updateMutation.mutate({
      management_fee_ratio: values.useCompanyDefault ? null : values.ratio || 0,
    })
  }

  const currentRatio = project?.management_fee_ratio
  const effectiveRatio =
    currentRatio !== null && currentRatio !== undefined
      ? currentRatio
      : companyDefaultRatio || 0
  const isUsingCompanyDefault =
    currentRatio === null || currentRatio === undefined

  return (
    <>
      <Card
        title="管理费比例配置"
        extra={
          <Button
            type="primary"
            icon={<SettingOutlined />}
            onClick={handleOpenModal}
          >
            配置管理费比例
          </Button>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>当前管理费比例：</Text>
            <Text style={{ fontSize: 18, marginLeft: 8 }}>
              {(effectiveRatio * 100).toFixed(2)}%
            </Text>
          </div>
          {isUsingCompanyDefault ? (
            <Alert
              message="使用公司默认值"
              description={`当前使用公司默认管理费比例：${((companyDefaultRatio || 0) * 100).toFixed(2)}%`}
              type="info"
              showIcon
            />
          ) : (
            <Alert
              message="使用项目自定义值"
              description="此项目使用自定义的管理费比例，不会随公司默认值变化"
              type="success"
              showIcon
            />
          )}
        </Space>
      </Card>

      <Modal
        title="配置项目管理费比例"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        confirmLoading={updateMutation.isPending}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="useCompanyDefault"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch
              checkedChildren="使用公司默认"
              unCheckedChildren="项目自定义"
            />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.useCompanyDefault !== currentValues.useCompanyDefault
            }
          >
            {({ getFieldValue }) => {
              const useCompanyDefault = getFieldValue('useCompanyDefault')
              if (useCompanyDefault) {
                return (
                  <div style={{ marginTop: 16 }}>
                    <Text type="secondary">
                      当前使用公司默认值：
                      {companyDefaultRatio !== undefined
                        ? `${(companyDefaultRatio * 100).toFixed(2)}%`
                        : '未设置'}
                    </Text>
                  </div>
                )
              }
              return (
                <Form.Item
                  label="项目管理费比例"
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
              )
            }}
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
