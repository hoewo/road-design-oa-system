import { Card, Statistic, Row, Col, Table, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { businessService } from '@/services/business'
import type { CompanyRevenueStatistics } from '@/types'

const { Title } = Typography

interface FinancialStatisticsProps {
  projectId?: number // Optional: if provided, shows project-level stats; otherwise shows company-level
}

export const FinancialStatistics = ({
  projectId,
}: FinancialStatisticsProps) => {
  // If projectId is provided, get project financial data
  const { data: projectFinancial, isLoading: projectLoading } = useQuery({
    queryKey: ['projectFinancial', projectId],
    queryFn: () => businessService.getProjectFinancial(projectId!),
    enabled: !!projectId,
  })

  // Get company-level revenue statistics
  const { data: companyStats, isLoading: companyLoading } =
    useQuery<CompanyRevenueStatistics>({
      queryKey: ['companyRevenueStatistics'],
      queryFn: () => businessService.getCompanyRevenueStatistics(),
      enabled: !projectId,
    })

  const isLoading = projectId ? projectLoading : companyLoading

  // Project-level statistics
  if (projectId && projectFinancial) {
    const feeTypeBreakdown = projectFinancial.fee_type_breakdown || {}
    const feeTypeData = Object.entries(feeTypeBreakdown).map(
      ([feeType, data]) => ({
        key: feeType,
        feeType:
          feeType === 'design_fee'
            ? '设计费'
            : feeType === 'survey_fee'
              ? '勘察费'
              : '咨询费',
        ...data,
      })
    )

    return (
      <Card>
        <Title level={4}>项目财务统计</Title>
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Statistic
              title="总应收金额"
              value={projectFinancial.total_receivable || 0}
              prefix="¥"
              precision={2}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="总开票金额"
              value={projectFinancial.total_invoiced || 0}
              prefix="¥"
              precision={2}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="总支付金额"
              value={projectFinancial.total_paid || 0}
              prefix="¥"
              precision={2}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="管理费"
              value={projectFinancial.management_fee_amount || 0}
              prefix="¥"
              precision={2}
              suffix={
                <span style={{ fontSize: 12, color: '#999' }}>
                  ({(projectFinancial.management_fee_ratio || 0) * 100}%)
                </span>
              }
            />
          </Col>
        </Row>

        <Table
          dataSource={feeTypeData}
          columns={[
            {
              title: '费用类型',
              dataIndex: 'feeType',
              key: 'feeType',
            },
            {
              title: '应收金额',
              dataIndex: 'receivable',
              key: 'receivable',
              render: (val: number) => `¥${val.toLocaleString()}`,
            },
            {
              title: '开票金额',
              dataIndex: 'invoiced',
              key: 'invoiced',
              render: (val: number) => `¥${val.toLocaleString()}`,
            },
            {
              title: '支付金额',
              dataIndex: 'paid',
              key: 'paid',
              render: (val: number) => `¥${val.toLocaleString()}`,
            },
            {
              title: '未收金额',
              dataIndex: 'outstanding',
              key: 'outstanding',
              render: (val: number) => (
                <span style={{ color: val > 0 ? '#ff4d4f' : '#52c41a' }}>
                  ¥{val.toLocaleString()}
                </span>
              ),
            },
          ]}
          pagination={false}
          loading={isLoading}
        />
      </Card>
    )
  }

  // Company-level statistics
  if (!projectId && companyStats) {
    const feeTypeBreakdown = companyStats.fee_type_breakdown || {}
    const feeTypeData = Object.entries(feeTypeBreakdown).map(
      ([feeType, data]) => ({
        key: feeType,
        feeType:
          feeType === 'design_fee'
            ? '设计费'
            : feeType === 'survey_fee'
              ? '勘察费'
              : '咨询费',
        ...data,
      })
    )

    return (
      <Card>
        <Title level={4}>公司收入统计</Title>
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={5}>
            <Statistic
              title="项目总数"
              value={companyStats.total_projects || 0}
            />
          </Col>
          <Col span={5}>
            <Statistic
              title="总应收金额"
              value={companyStats.total_receivable || 0}
              prefix="¥"
              precision={2}
            />
          </Col>
          <Col span={5}>
            <Statistic
              title="总开票金额"
              value={companyStats.total_invoiced || 0}
              prefix="¥"
              precision={2}
            />
          </Col>
          <Col span={5}>
            <Statistic
              title="总支付金额"
              value={companyStats.total_paid || 0}
              prefix="¥"
              precision={2}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="总管理费"
              value={companyStats.total_management_fee || 0}
              prefix="¥"
              precision={2}
            />
          </Col>
        </Row>

        <Table
          dataSource={feeTypeData}
          columns={[
            {
              title: '费用类型',
              dataIndex: 'feeType',
              key: 'feeType',
            },
            {
              title: '应收金额',
              dataIndex: 'receivable',
              key: 'receivable',
              render: (val: number) => `¥${val.toLocaleString()}`,
            },
            {
              title: '开票金额',
              dataIndex: 'invoiced',
              key: 'invoiced',
              render: (val: number) => `¥${val.toLocaleString()}`,
            },
            {
              title: '支付金额',
              dataIndex: 'paid',
              key: 'paid',
              render: (val: number) => `¥${val.toLocaleString()}`,
            },
            {
              title: '未收金额',
              dataIndex: 'outstanding',
              key: 'outstanding',
              render: (val: number) => (
                <span style={{ color: val > 0 ? '#ff4d4f' : '#52c41a' }}>
                  ¥{val.toLocaleString()}
                </span>
              ),
            },
          ]}
          pagination={false}
          loading={isLoading}
        />
      </Card>
    )
  }

  return <Card loading={isLoading}>加载中...</Card>
}
