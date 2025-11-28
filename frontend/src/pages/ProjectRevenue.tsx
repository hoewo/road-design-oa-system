import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, Space } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { FinancialStatistics } from '@/components/financial/FinancialStatistics'
import { ProjectManagementFeeConfig } from '@/components/financial/ProjectManagementFeeConfig'

const ProjectRevenue = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const projectId = Number(id)

  const handleBack = () => {
    navigate(`/projects/${projectId}`)
  }

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
          返回项目详情
        </Button>
      </Space>

      <Card title="项目收入信息" style={{ marginBottom: 16 }}>
        <ProjectManagementFeeConfig projectId={projectId} />
      </Card>

      <Card title="项目收入统计">
        <FinancialStatistics projectId={projectId} />
      </Card>
    </>
  )
}

export default ProjectRevenue
