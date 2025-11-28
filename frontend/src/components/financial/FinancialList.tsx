import { useState } from 'react'
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Select,
  Card,
  Statistic,
  Row,
  Col,
  Popconfirm,
  message,
  Form,
  InputNumber,
  Switch,
  Typography,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { businessService } from '@/services/business'
import { projectService } from '@/services/project'
import { companyConfigService } from '@/services/company_config'
import { FinancialForm } from './FinancialForm'
import type { FeeType, FinancialRecord } from '@/types'
import dayjs from 'dayjs'

const { Text } = Typography

interface FinancialListProps {
  projectId: number
}

export const FinancialList = ({ projectId }: FinancialListProps) => {
  const [modalVisible, setModalVisible] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(
    null
  )
  const [feeTypeFilter, setFeeTypeFilter] = useState<FeeType | 'all'>('all')
  const [managementFeeModalVisible, setManagementFeeModalVisible] =
    useState(false)
  const [managementFeeForm] = Form.useForm()
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

  const { data: financial, isLoading } = useQuery({
    queryKey: ['projectFinancial', projectId],
    queryFn: () => businessService.getProjectFinancial(projectId),
    enabled: !!projectId,
  })

  const deleteMutation = useMutation({
    mutationFn: (recordId: number) =>
      businessService.deleteFinancialRecord(recordId),
    onSuccess: () => {
      message.success('财务记录删除成功')
      queryClient.invalidateQueries({
        queryKey: ['projectFinancial', projectId],
      })
    },
    onError: (error: any) => {
      message.error(error.message || '删除失败')
    },
  })

  const handleCreate = () => {
    setEditingRecord(null)
    setModalVisible(true)
  }

  const handleEdit = (record: FinancialRecord) => {
    setEditingRecord(record)
    setEditModalVisible(true)
  }

  const handleDelete = (recordId: number) => {
    deleteMutation.mutate(recordId)
  }

  const handleModalClose = () => {
    setModalVisible(false)
    setEditingRecord(null)
  }

  const handleEditModalClose = () => {
    setEditModalVisible(false)
    setEditingRecord(null)
  }

  const handleSuccess = () => {
    setModalVisible(false)
    queryClient.invalidateQueries({ queryKey: ['projectFinancial', projectId] })
  }

  const handleEditSuccess = () => {
    setEditModalVisible(false)
    setEditingRecord(null)
    queryClient.invalidateQueries({ queryKey: ['projectFinancial', projectId] })
  }

  // Management fee ratio update mutation
  const updateManagementFeeRatioMutation = useMutation({
    mutationFn: (data: { management_fee_ratio: number | null }) =>
      projectService.updateProject(projectId, data),
    onSuccess: () => {
      message.success('管理费比例更新成功')
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      queryClient.invalidateQueries({
        queryKey: ['projectFinancial', projectId],
      })
      setManagementFeeModalVisible(false)
      managementFeeForm.resetFields()
    },
    onError: (error: any) => {
      message.error(error.message || '更新失败')
    },
  })

  const handleManagementFeeSetting = () => {
    const currentRatio = project?.management_fee_ratio
    const useCompanyDefault =
      currentRatio === null || currentRatio === undefined
    managementFeeForm.setFieldsValue({
      useCompanyDefault,
      ratio: useCompanyDefault ? companyDefaultRatio || 0 : currentRatio || 0,
    })
    setManagementFeeModalVisible(true)
  }

  const handleManagementFeeSubmit = (values: {
    useCompanyDefault: boolean
    ratio?: number
  }) => {
    updateManagementFeeRatioMutation.mutate({
      management_fee_ratio: values.useCompanyDefault ? null : values.ratio || 0,
    })
  }

  const feeTypeMap: Record<FeeType, { text: string; color: string }> = {
    design_fee: { text: '设计费', color: 'blue' },
    survey_fee: { text: '勘察费', color: 'green' },
    consultation_fee: { text: '咨询费', color: 'orange' },
  }

  const recordTypeMap: Record<string, { text: string; color: string }> = {
    receivable: { text: '应收', color: 'blue' },
    invoice: { text: '开票', color: 'green' },
    payment: { text: '支付', color: 'orange' },
    expense: { text: '支出', color: 'red' },
  }

  // Filter records by fee type
  const filteredRecords =
    feeTypeFilter === 'all'
      ? financial?.financial_records || []
      : financial?.financial_records.filter(
          (r) => r.fee_type === feeTypeFilter
        ) || []

  const columns = [
    {
      title: '费用类型',
      dataIndex: 'fee_type',
      key: 'fee_type',
      render: (type: FeeType) => {
        const typeInfo = feeTypeMap[type] || { text: type, color: 'default' }
        return <Tag color={typeInfo.color}>{typeInfo.text}</Tag>
      },
    },
    {
      title: '记录类型',
      dataIndex: 'record_type',
      key: 'record_type',
      render: (type: string) => {
        const typeInfo = recordTypeMap[type] || { text: type, color: 'default' }
        return <Tag color={typeInfo.color}>{typeInfo.text}</Tag>
      },
    },
    {
      title: '应收金额',
      dataIndex: 'receivable_amount',
      key: 'receivable_amount',
      render: (amount: number) => `¥${amount.toLocaleString()}`,
    },
    {
      title: '开票金额',
      dataIndex: 'invoice_amount',
      key: 'invoice_amount',
      render: (amount: number) => `¥${amount.toLocaleString()}`,
    },
    {
      title: '支付金额',
      dataIndex: 'payment_amount',
      key: 'payment_amount',
      render: (amount: number) => `¥${amount.toLocaleString()}`,
    },
    {
      title: '未收金额',
      dataIndex: 'unpaid_amount',
      key: 'unpaid_amount',
      render: (amount: number) => (
        <span style={{ color: amount > 0 ? '#ff4d4f' : '#52c41a' }}>
          ¥{amount.toLocaleString()}
        </span>
      ),
    },
    {
      title: '开票时间',
      dataIndex: 'invoice_date',
      key: 'invoice_date',
      render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
    },
    {
      title: '支付时间',
      dataIndex: 'payment_date',
      key: 'payment_date',
      render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: FinancialRecord) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这条财务记录吗？"
            description="删除后统计数据将自动重新计算"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={5}>
            <Statistic
              title="总应收金额"
              value={financial?.total_receivable || 0}
              prefix="¥"
              precision={2}
            />
          </Col>
          <Col span={5}>
            <Statistic
              title="总开票金额"
              value={financial?.total_invoiced || 0}
              prefix="¥"
              precision={2}
            />
          </Col>
          <Col span={5}>
            <Statistic
              title="总支付金额"
              value={financial?.total_paid || 0}
              prefix="¥"
              precision={2}
            />
          </Col>
          <Col span={5}>
            <Statistic
              title="总未收金额"
              value={financial?.total_outstanding || 0}
              prefix="¥"
              precision={2}
              valueStyle={{
                color:
                  (financial?.total_outstanding || 0) > 0
                    ? '#ff4d4f'
                    : '#52c41a',
              }}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="管理费"
              value={financial?.management_fee_amount || 0}
              prefix="¥"
              precision={2}
              suffix={
                <Button
                  type="link"
                  size="small"
                  icon={<SettingOutlined />}
                  onClick={handleManagementFeeSetting}
                  style={{ padding: 0, marginLeft: 4 }}
                />
              }
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              比例: {(financial?.management_fee_ratio || 0) * 100}%
            </Text>
          </Col>
        </Row>
      </Card>

      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新建财务记录
        </Button>
        <Select
          style={{ width: 150 }}
          value={feeTypeFilter}
          onChange={setFeeTypeFilter}
          options={[
            { label: '全部费用类型', value: 'all' },
            { label: '设计费', value: 'design_fee' },
            { label: '勘察费', value: 'survey_fee' },
            { label: '咨询费', value: 'consultation_fee' },
          ]}
        />
      </Space>

      <Table
        columns={columns}
        dataSource={filteredRecords}
        loading={isLoading}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />

      <Modal
        title="新建财务记录"
        open={modalVisible}
        onCancel={handleModalClose}
        footer={null}
        width={800}
        destroyOnClose
      >
        <FinancialForm
          projectId={projectId}
          onSuccess={handleSuccess}
          onCancel={handleModalClose}
        />
      </Modal>

      <Modal
        title="编辑财务记录"
        open={editModalVisible}
        onCancel={handleEditModalClose}
        footer={null}
        width={800}
        destroyOnClose
      >
        {editingRecord && (
          <FinancialForm
            projectId={projectId}
            recordId={editingRecord.id}
            onSuccess={handleEditSuccess}
            onCancel={handleEditModalClose}
          />
        )}
      </Modal>

      <Modal
        title="设置管理费比例"
        open={managementFeeModalVisible}
        onCancel={() => {
          setManagementFeeModalVisible(false)
          managementFeeForm.resetFields()
        }}
        onOk={() => managementFeeForm.submit()}
        confirmLoading={updateManagementFeeRatioMutation.isPending}
        width={500}
      >
        <Form
          form={managementFeeForm}
          layout="vertical"
          onFinish={handleManagementFeeSubmit}
        >
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
