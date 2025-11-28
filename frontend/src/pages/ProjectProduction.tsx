import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, Space, Tabs, message } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { projectService } from '@/services/project'
import { businessService } from '@/services/business'
import { DisciplineAssignmentForm } from '@/components/production/DisciplineAssignmentForm'
import { ProductionFileList } from '@/components/production/ProductionFileList'
import { ProductionApprovalTimeline } from '@/components/production/ProductionApprovalTimeline'
import { ExternalCommissionList } from '@/components/production/ExternalCommissionList'
import { ProductionCostList } from '@/components/production/ProductionCostList'
import { BonusForm } from '@/components/financial/BonusForm'
import { BonusList } from '@/components/financial/BonusList'

const ProjectProduction = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const projectId = Number(id)

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.getProject(projectId),
    enabled: !!projectId,
  })

  const handleGetContractAmount = async () => {
    try {
      const contracts = await businessService.getContracts(projectId)
      if (contracts.length === 0) {
        message.warning('该项目暂无合同信息')
        return {
          design_fee: 0,
          survey_fee: 0,
          consultation_fee: 0,
        }
      }
      // 汇总所有合同金额
      const total = contracts.reduce(
        (acc: any, contract: any) => ({
          design_fee: acc.design_fee + (contract.design_fee || 0),
          survey_fee: acc.survey_fee + (contract.survey_fee || 0),
          consultation_fee:
            acc.consultation_fee + (contract.consultation_fee || 0),
        }),
        { design_fee: 0, survey_fee: 0, consultation_fee: 0 }
      )
      return total
    } catch (error: any) {
      message.error(error.message || '获取合同金额失败')
      return {
        design_fee: 0,
        survey_fee: 0,
        consultation_fee: 0,
      }
    }
  }

  const handleBack = () => {
    navigate(`/projects/${projectId}`)
  }

  const tabItems = [
    {
      key: 'discipline',
      label: '专业分配',
      children: <DisciplineAssignmentForm projectId={projectId} />,
    },
    {
      key: 'files',
      label: '生产文件',
      children: (
        <ProductionFileList
          projectId={projectId}
          onGetContractAmount={handleGetContractAmount}
        />
      ),
    },
    {
      key: 'approvals',
      label: '审核/审定',
      children: <ProductionApprovalTimeline projectId={projectId} />,
    },
    {
      key: 'commissions',
      label: '对外委托',
      children: <ExternalCommissionList projectId={projectId} />,
    },
    {
      key: 'costs',
      label: '生产成本',
      children: <ProductionCostList projectId={projectId} />,
    },
    {
      key: 'bonuses',
      label: '生产奖金',
      children: (
        <>
          <Card title="新建生产奖金" style={{ marginBottom: 16 }}>
            <BonusForm
              projectId={projectId}
              defaultBonusType="production"
              onSuccess={() => {
                message.success('生产奖金创建成功')
              }}
            />
          </Card>
          <Card title="生产奖金列表">
            <BonusList projectId={projectId} bonusType="production" />
          </Card>
        </>
      ),
    },
  ]

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
          返回项目详情
        </Button>
      </Space>

      <Card title={`项目生产信息管理 - ${project?.project_name || ''}`}>
        <Tabs items={tabItems} defaultActiveKey="discipline" />
      </Card>
    </>
  )
}

export default ProjectProduction
