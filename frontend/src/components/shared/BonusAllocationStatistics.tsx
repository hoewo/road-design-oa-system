import { Row, Col, Statistic } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { businessService } from '@/services/business'

interface BonusAllocationStatisticsProps {
  projectId: string
  bonusType: 'business' | 'production'
}

/**
 * 奖金分配统计组件
 * 横排显示总发放金额、发放次数、发放人数
 * T497: 创建可复用的奖金分配统计组件
 */
export const BonusAllocationStatistics = ({
  projectId,
  bonusType,
}: BonusAllocationStatisticsProps) => {
  // 根据奖金类型获取统计信息
  const { data: statistics, isLoading } = useQuery({
    queryKey: [bonusType === 'production' ? 'productionBonusStatistics' : 'businessBonusStatistics', projectId],
    queryFn: () => 
      bonusType === 'production'
        ? businessService.getProductionBonusStatistics(projectId)
        : businessService.getBusinessBonusStatistics(projectId),
    enabled: !!projectId,
  })

  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      <Col span={8}>
        <Statistic
          title="总发放金额"
          value={statistics?.total_amount || 0}
          precision={2}
          prefix="¥"
          loading={isLoading}
          valueStyle={{ color: '#1890ff' }}
        />
      </Col>
      <Col span={8}>
        <Statistic
          title="发放次数"
          value={statistics?.record_count || 0}
          suffix="次"
          loading={isLoading}
          valueStyle={{ color: '#52c41a' }}
        />
      </Col>
      <Col span={8}>
        <Statistic
          title="发放人数"
          value={statistics?.recipient_count || 0}
          suffix="人"
          loading={isLoading}
          valueStyle={{ color: '#722ed1' }}
        />
      </Col>
    </Row>
  )
}

