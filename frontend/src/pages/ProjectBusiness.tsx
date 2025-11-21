import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, Space, Tabs } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { ProjectBusinessForm } from '@/components/project/ProjectBusinessForm'
import { ContractList } from '@/components/contract/ContractList'
import { ExpertFeePaymentList } from '@/components/project/ExpertFeePaymentList'
import { ContractStatistics } from '@/components/contract/ContractStatistics'
import { FinancialList } from '@/components/financial/FinancialList'
import { BonusList } from '@/components/financial/BonusList'

const ProjectBusiness = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const projectId = Number(id)

  const handleBack = () => {
    navigate(`/projects/${projectId}`)
  }

  const tabItems = [
    {
      key: 'business',
      label: '经营信息',
      children: <ProjectBusinessForm projectId={projectId} />,
    },
    {
      key: 'contracts',
      label: '合同管理',
      children: <ContractList projectId={projectId} />,
    },
    {
      key: 'expert-payments',
      label: '专家费支付',
      children: <ExpertFeePaymentList projectId={projectId} />,
    },
    {
      key: 'financial',
      label: '支付信息',
      children: <FinancialList projectId={projectId} />,
    },
    {
      key: 'bonuses',
      label: '奖金管理',
      children: <BonusList projectId={projectId} />,
    },
    {
      key: 'statistics',
      label: '合同统计',
      children: <ContractStatistics projectId={projectId} />,
    },
  ]

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
          返回项目详情
        </Button>
      </Space>

      <Card title="项目经营信息管理">
        <Tabs items={tabItems} defaultActiveKey="business" />
      </Card>
    </>
  )
}

export default ProjectBusiness
