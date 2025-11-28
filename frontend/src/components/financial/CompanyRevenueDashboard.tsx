import { Card, Statistic, Row, Col, Table, Tag, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { businessService } from '@/services/business'
import type { CompanyRevenueStatistics } from '@/types'

const { Title } = Typography

export const CompanyRevenueDashboard = () => {
  const { data: companyStats, isLoading } = useQuery<CompanyRevenueStatistics>({
    queryKey: ['companyRevenueStatistics'],
    queryFn: () => businessService.getCompanyRevenueStatistics(),
  })

  if (isLoading) {
    return <Card loading={isLoading}>加载中...</Card>
  }

  if (!companyStats) {
    return <Card>暂无数据</Card>
  }

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

  const projectColumns = [
    {
      title: '项目编号',
      dataIndex: 'project_number',
      key: 'project_number',
    },
    {
      title: '项目名称',
      dataIndex: 'project_name',
      key: 'project_name',
    },
    {
      title: '应收金额',
      dataIndex: 'total_receivable',
      key: 'total_receivable',
      render: (val: number) => `¥${val.toLocaleString()}`,
    },
    {
      title: '开票金额',
      dataIndex: 'total_invoiced',
      key: 'total_invoiced',
      render: (val: number) => `¥${val.toLocaleString()}`,
    },
    {
      title: '支付金额',
      dataIndex: 'total_paid',
      key: 'total_paid',
      render: (val: number) => `¥${val.toLocaleString()}`,
    },
    {
      title: '未收金额',
      dataIndex: 'total_outstanding',
      key: 'total_outstanding',
      render: (val: number) => (
        <span style={{ color: val > 0 ? '#ff4d4f' : '#52c41a' }}>
          ¥{val.toLocaleString()}
        </span>
      ),
    },
    {
      title: '管理费比例',
      dataIndex: 'management_fee_ratio',
      key: 'management_fee_ratio',
      render: (ratio: number) => (
        <Tag color="blue">{(ratio * 100).toFixed(2)}%</Tag>
      ),
    },
    {
      title: '管理费金额',
      dataIndex: 'management_fee_amount',
      key: 'management_fee_amount',
      render: (val: number) => `¥${val.toLocaleString()}`,
    },
  ]

  return (
    <div>
      <Title level={2}>公司收入统计</Title>

      {/* Overall Statistics */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16}>
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
      </Card>

      {/* Fee Type Breakdown */}
      <Card title="按费用类型统计" style={{ marginBottom: 24 }}>
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
        />
      </Card>

      {/* Project Breakdown */}
      <Card title="按项目统计">
        <Table
          dataSource={companyStats.project_breakdown || []}
          columns={projectColumns}
          rowKey="project_id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 个项目`,
          }}
        />
      </Card>
    </div>
  )
}
