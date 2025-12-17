import { useState } from 'react'
import { Card, Statistic, Row, Col, DatePicker, Space, Button, message } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { businessService } from '@/services/business'
import { permissionService } from '@/services/permission'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'

interface BusinessStatisticsProps {
  projectId: string
}

interface BusinessStatisticsData {
  total_receivable: number
  total_paid: number
  total_unpaid: number
}

export const BusinessStatistics = ({ projectId }: BusinessStatisticsProps) => {
  const [startDate, setStartDate] = useState<Dayjs | null>(null)
  const [endDate, setEndDate] = useState<Dayjs | null>(null)

  // Check permission (all users can view statistics, but export might require permission)
  const { data: canManage } = useQuery({
    queryKey: ['canManageBusinessInfo', projectId],
    queryFn: () => permissionService.canManageBusinessInfo(projectId),
    enabled: !!projectId,
  })

  const { data: statistics, isLoading } = useQuery<BusinessStatisticsData>({
    queryKey: ['businessStatistics', projectId, startDate?.format('YYYY-MM-DD'), endDate?.format('YYYY-MM-DD')],
    queryFn: async () => {
      const params: { start_date?: string; end_date?: string } = {}
      if (startDate) {
        params.start_date = startDate.format('YYYY-MM-DD')
      }
      if (endDate) {
        params.end_date = endDate.format('YYYY-MM-DD')
      }
      
      return businessService.getBusinessStatistics(projectId, params)
    },
    enabled: !!projectId,
  })

  const handleReset = () => {
    setStartDate(null)
    setEndDate(null)
  }

  const formatCurrency = (value: number) => {
    return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // All users can view statistics, but date filtering might require permission
  // For now, allow all users to view and filter statistics
  return (
    <Card
      title="经营信息统计"
      extra={
        <Space>
          <DatePicker
            placeholder="开始日期"
            value={startDate}
            onChange={(date) => setStartDate(date)}
            format="YYYY-MM-DD"
          />
          <DatePicker
            placeholder="结束日期"
            value={endDate}
            onChange={(date) => setEndDate(date)}
            format="YYYY-MM-DD"
          />
          <Button onClick={handleReset}>重置</Button>
        </Space>
      }
    >
      <Row gutter={16}>
        <Col span={8}>
          <Statistic
            title="总应收金额"
            value={statistics?.total_receivable || 0}
            formatter={(value) => formatCurrency(Number(value))}
            loading={isLoading}
            valueStyle={{ color: '#1890ff' }}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="已收金额"
            value={statistics?.total_paid || 0}
            formatter={(value) => formatCurrency(Number(value))}
            loading={isLoading}
            valueStyle={{ color: '#52c41a' }}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="未收金额"
            value={statistics?.total_unpaid || 0}
            formatter={(value) => formatCurrency(Number(value))}
            loading={isLoading}
            valueStyle={{ color: '#ff4d4f' }}
          />
        </Col>
      </Row>
      {startDate || endDate ? (
        <div style={{ marginTop: 16, color: '#666', fontSize: 12 }}>
          统计时间范围：
          {startDate ? `从 ${startDate.format('YYYY-MM-DD')}` : '从最早'}
          {' '}到{' '}
          {endDate ? endDate.format('YYYY-MM-DD') : '现在'}
        </div>
      ) : (
        <div style={{ marginTop: 16, color: '#666', fontSize: 12 }}>
          显示全部时间范围的统计数据
        </div>
      )}
    </Card>
  )
}

