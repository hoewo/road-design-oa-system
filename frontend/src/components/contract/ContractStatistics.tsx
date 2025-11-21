import { useQuery } from '@tanstack/react-query'
import { Card, Statistic, Row, Col, Table } from 'antd'
import { businessService } from '@/services/business'
import type { Contract } from '@/types'

interface ContractStatisticsProps {
  projectId: number
}

export const ContractStatistics = ({ projectId }: ContractStatisticsProps) => {
  const { data: contracts, isLoading } = useQuery({
    queryKey: ['contracts', projectId],
    queryFn: () => businessService.getContracts(projectId),
    enabled: !!projectId,
  })

  if (isLoading) {
    return <div>加载中...</div>
  }

  // Calculate statistics
  const totalAmount = contracts?.reduce((sum, c) => sum + c.contract_amount, 0) || 0
  const totalDesignFee = contracts?.reduce((sum, c) => sum + (c.design_fee || 0), 0) || 0
  const totalSurveyFee = contracts?.reduce((sum, c) => sum + (c.survey_fee || 0), 0) || 0
  const totalConsultationFee = contracts?.reduce((sum, c) => sum + (c.consultation_fee || 0), 0) || 0
  const contractCount = contracts?.length || 0

  const summaryData = [
    {
      key: 'total',
      type: '总计',
      contract_amount: totalAmount,
      design_fee: totalDesignFee,
      survey_fee: totalSurveyFee,
      consultation_fee: totalConsultationFee,
    },
  ]

  const summaryColumns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: '合同金额',
      dataIndex: 'contract_amount',
      key: 'contract_amount',
      render: (amount: number) => `¥${amount.toLocaleString()}`,
    },
    {
      title: '设计费',
      dataIndex: 'design_fee',
      key: 'design_fee',
      render: (amount: number) => `¥${amount.toLocaleString()}`,
    },
    {
      title: '勘察费',
      dataIndex: 'survey_fee',
      key: 'survey_fee',
      render: (amount: number) => `¥${amount.toLocaleString()}`,
    },
    {
      title: '咨询费',
      dataIndex: 'consultation_fee',
      key: 'consultation_fee',
      render: (amount: number) => `¥${amount.toLocaleString()}`,
    },
  ]

  return (
    <Card title="合同统计">
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Statistic
            title="合同数量"
            value={contractCount}
            suffix="个"
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="合同总金额"
            value={totalAmount}
            precision={2}
            prefix="¥"
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="设计费总额"
            value={totalDesignFee}
            precision={2}
            prefix="¥"
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="勘察费总额"
            value={totalSurveyFee}
            precision={2}
            prefix="¥"
          />
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Statistic
            title="咨询费总额"
            value={totalConsultationFee}
            precision={2}
            prefix="¥"
          />
        </Col>
      </Row>

      <Table
        columns={summaryColumns}
        dataSource={summaryData}
        pagination={false}
        bordered
      />
    </Card>
  )
}
