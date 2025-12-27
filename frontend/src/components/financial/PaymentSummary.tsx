import { useState } from 'react'
import {
  Card,
  Table,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  message,
  Pagination,
  Row,
  Col,
} from 'antd'
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { financialService, type PaymentFilterParams } from '@/services/financial'
import type { PaymentInfo } from '@/services/financial'
import dayjs, { type Dayjs } from 'dayjs'

const { RangePicker } = DatePicker

/**
 * 支付信息列表组件
 * T265: 实现支付信息列表展示
 * T515: 实现支付信息搜索过滤组件（项目名称、费用类型、支付时间范围）
 * T516: 实现支付信息分页组件（页码导航、每页条数选择、总记录数显示）
 * T518: 实现支付信息导出功能（调用导出接口，支持Excel/CSV格式下载）
 */
export const PaymentSummary = () => {
  const [filters, setFilters] = useState<PaymentFilterParams>({
    page: 1,
    page_size: 20,
  })
  const [projectName, setProjectName] = useState('')
  const [feeType, setFeeType] = useState<string>('')
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)

  // 构建查询参数
  const queryParams: PaymentFilterParams = {
    ...filters,
  }
  if (projectName) queryParams.project_name = projectName
  if (feeType) queryParams.fee_type = feeType as any
  if (dateRange?.[0]) queryParams.start_date = dateRange[0].format('YYYY-MM-DD')
  if (dateRange?.[1]) queryParams.end_date = dateRange[1].format('YYYY-MM-DD')

  const { data: paymentData, isLoading, refetch } = useQuery({
    queryKey: ['paymentInfoList', queryParams],
    queryFn: () => financialService.getPaymentInfoList(queryParams),
  })

  const handleSearch = () => {
    setFilters((prev) => ({
      ...prev,
      page: 1, // 重置到第一页
    }))
    refetch()
  }

  const handleReset = () => {
    setProjectName('')
    setFeeType('')
    setDateRange(null)
    setFilters({
      page: 1,
      page_size: 20,
    })
    setTimeout(() => {
      refetch()
    }, 100)
  }

  const handlePageChange = (page: number, pageSize?: number) => {
    setFilters((prev) => ({
      ...prev,
      page,
      page_size: pageSize || prev.page_size || 20,
    }))
  }

  const handlePageSizeChange = (current: number, size: number) => {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      page_size: size,
    }))
  }

  const handleExport = async (format: 'excel' | 'csv' = 'excel') => {
    try {
      const blob = await financialService.exportPayments(queryParams, format)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `支付信息_${dayjs().format('YYYY-MM-DD')}.${format === 'excel' ? 'xlsx' : 'csv'}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      message.success('导出成功')
    } catch (error: any) {
      message.error(error?.message || '导出失败')
    }
  }

  const formatCurrency = (value: number) => {
    return `¥${(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const getFeeTypeLabel = (feeType: string) => {
    switch (feeType) {
      case 'design_fee':
        return '设计费'
      case 'survey_fee':
        return '勘察费'
      case 'consultation_fee':
        return '咨询费'
      default:
        return feeType || '-'
    }
  }

  const columns = [
    {
      title: '项目名称',
      dataIndex: 'project_name',
      key: 'project_name',
    },
    {
      title: '费用类型',
      dataIndex: 'fee_type',
      key: 'fee_type',
      render: (feeType: string) => getFeeTypeLabel(feeType),
    },
    {
      title: '支付时间',
      dataIndex: 'payment_date',
      key: 'payment_date',
      render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
    },
    {
      title: '支付金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => formatCurrency(amount),
      align: 'right' as const,
    },
  ]

  return (
    <Card
      title="所有支付信息"
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            刷新
          </Button>
          <Button.Group>
            <Button icon={<DownloadOutlined />} onClick={() => handleExport('excel')}>
              导出Excel
            </Button>
            <Button icon={<DownloadOutlined />} onClick={() => handleExport('csv')}>
              导出CSV
            </Button>
          </Button.Group>
        </Space>
      }
    >
      {/* 搜索过滤栏 */}
      <Card size="small" style={{ marginBottom: 16, background: '#f9f9f9' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="输入项目名称搜索"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="费用类型"
              value={feeType || undefined}
              onChange={(value) => setFeeType(value || '')}
              allowClear
              style={{ width: '100%' }}
            >
              <Select.Option value="design_fee">设计费</Select.Option>
              <Select.Option value="survey_fee">勘察费</Select.Option>
              <Select.Option value="consultation_fee">咨询费</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
              format="YYYY-MM-DD"
              placeholder={['支付时间（起）', '支付时间（止）']}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Space>
              <Button type="primary" onClick={handleSearch}>
                搜索
              </Button>
              <Button onClick={handleReset}>
                重置
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 表格 */}
      <Table
        columns={columns}
        dataSource={paymentData?.items || []}
        loading={isLoading}
        rowKey="id"
        pagination={false}
      />

      {/* 分页 */}
      {paymentData && paymentData.total > 0 && (
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            共 {paymentData.total} 条记录，每页显示
            <Select
              value={filters.page_size || 20}
              onChange={(value) => handlePageSizeChange(1, value)}
              style={{ width: 80, margin: '0 8px' }}
            >
              <Select.Option value={10}>10</Select.Option>
              <Select.Option value={20}>20</Select.Option>
              <Select.Option value={50}>50</Select.Option>
              <Select.Option value={100}>100</Select.Option>
            </Select>
            条
          </div>
          <Pagination
            current={paymentData.page}
            total={paymentData.total}
            pageSize={paymentData.page_size}
            showSizeChanger={false}
            showQuickJumper
            showTotal={(total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`}
            onChange={handlePageChange}
            onShowSizeChange={handlePageSizeChange}
          />
        </div>
      )}

      {!paymentData && !isLoading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
          暂无数据
        </div>
      )}
    </Card>
  )
}

