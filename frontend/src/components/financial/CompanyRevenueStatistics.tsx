import { Card, Statistic, Row, Col, DatePicker, Button, Space, message } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { financialService } from '@/services/financial'
import { useState } from 'react'
import dayjs, { type Dayjs } from 'dayjs'

const { RangePicker } = DatePicker

interface CompanyRevenueStatisticsProps {
  onRefresh?: () => void
}

/**
 * 公司收入统计组件
 * T262: 创建前端公司收入统计组件
 * T263: 实现总应收金额展示（按设计费、勘察费、咨询费分类）
 * T519: 实现已收金额统计展示（在统计卡片中显示）
 */
export const CompanyRevenueStatistics = ({ onRefresh }: CompanyRevenueStatisticsProps) => {
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)

  // 构建查询参数
  const startDate = dateRange?.[0] ? dateRange[0].format('YYYY-MM-DD') : undefined
  const endDate = dateRange?.[1] ? dateRange[1].format('YYYY-MM-DD') : undefined

  const { data: summary, isLoading, refetch } = useQuery({
    queryKey: ['companyRevenueSummary', startDate, endDate],
    queryFn: () => financialService.getCompanyRevenueSummary(startDate, endDate),
  })

  const handleQuery = () => {
    refetch()
  }

  const handleReset = () => {
    setDateRange(null)
    // 重置后需要重新查询
    setTimeout(() => {
      refetch()
    }, 100)
  }

  const formatCurrency = (value: number) => {
    return `¥${(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <Card
      title="公司收入统计"
      extra={
        <Space>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
            format="YYYY-MM-DD"
            placeholder={['开始日期', '结束日期']}
          />
          <Button type="primary" onClick={handleQuery}>
            查询
          </Button>
          <Button onClick={handleReset}>
            重置
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            刷新
          </Button>
        </Space>
      }
      loading={isLoading}
    >
      {summary && (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Card>
              <Statistic
                title="总应收金额（设计费）"
                value={summary.total_receivable_by_fee_type.design_fee}
                formatter={(value) => formatCurrency(Number(value))}
                precision={2}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Card>
              <Statistic
                title="总应收金额（勘察费）"
                value={summary.total_receivable_by_fee_type.survey_fee}
                formatter={(value) => formatCurrency(Number(value))}
                precision={2}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Card>
              <Statistic
                title="总应收金额（咨询费）"
                value={summary.total_receivable_by_fee_type.consultation_fee}
                formatter={(value) => formatCurrency(Number(value))}
                precision={2}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Card>
              <Statistic
                title="已收金额"
                value={summary.total_paid}
                formatter={(value) => formatCurrency(Number(value))}
                precision={2}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Card>
              <Statistic
                title="未收金额"
                value={summary.total_outstanding}
                formatter={(value) => formatCurrency(Number(value))}
                precision={2}
                valueStyle={{ color: '#cf1322' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Card>
              <Statistic
                title="总应收金额（合计）"
                value={summary.total_receivable_by_fee_type.total}
                formatter={(value) => formatCurrency(Number(value))}
                precision={2}
              />
            </Card>
          </Col>
        </Row>
      )}
      {!summary && !isLoading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
          暂无数据
        </div>
      )}
    </Card>
  )
}

