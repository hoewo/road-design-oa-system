import { Card, Statistic, Row, Col } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { productionService } from '@/services/production'

interface ExternalCommissionSummaryProps {
  projectId: string | number
}

export const ExternalCommissionSummary = ({
  projectId,
}: ExternalCommissionSummaryProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ['externalCommissionSummary', projectId],
    queryFn: () => productionService.getCommissionSummary(projectId),
    enabled: !!projectId,
  })

  if (isLoading) {
    return <Card loading={isLoading} />
  }

  return (
    <Card style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col span={8}>
          <Statistic
            title="委托总数"
            value={data?.total_count || 0}
            valueStyle={{ color: '#1890ff' }}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="总金额"
            value={data?.total_amount || 0}
            precision={2}
            prefix="¥"
            valueStyle={{ color: '#3f8600' }}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="平均评分"
            value={data?.average_score || 0}
            precision={1}
            suffix="分"
            valueStyle={{ color: '#ff9800' }}
          />
        </Col>
      </Row>
    </Card>
  )
}

