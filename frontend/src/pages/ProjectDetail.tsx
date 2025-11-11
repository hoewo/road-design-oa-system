import { useParams } from 'react-router-dom'
import { Card, Descriptions, Button, Space, message } from 'antd'
import { EditOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { projectService } from '@/services/project'

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const {
    data: project,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectService.getProject(Number(id)),
    enabled: !!id,
  })

  if (error) {
    message.error('加载项目详情失败')
  }

  const handleEdit = () => {
    navigate(`/projects/${id}/edit`)
  }

  const handleBack = () => {
    navigate('/projects')
  }

  if (isLoading) {
    return <div>加载中...</div>
  }

  if (!project) {
    return <div>项目不存在</div>
  }

  const statusMap = {
    planning: '规划中',
    bidding: '招投标',
    contract: '合同签订',
    production: '生产中',
    completed: '已完成',
    cancelled: '已取消',
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
          返回列表
        </Button>
        <Button type="primary" icon={<EditOutlined />} onClick={handleEdit}>
          编辑项目
        </Button>
      </Space>

      <Card title="项目详情">
        <Descriptions column={2} bordered>
          <Descriptions.Item label="项目编号">
            {project.project_number}
          </Descriptions.Item>
          <Descriptions.Item label="项目名称">
            {project.project_name}
          </Descriptions.Item>
          <Descriptions.Item label="承接日期">
            {project.start_date}
          </Descriptions.Item>
          <Descriptions.Item label="项目状态">
            {statusMap[project.status]}
          </Descriptions.Item>
          <Descriptions.Item label="出图单位">
            {project.drawing_unit || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {new Date(project.created_at).toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label="项目概况" span={2}>
            {project.project_overview || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  )
}

export default ProjectDetail
