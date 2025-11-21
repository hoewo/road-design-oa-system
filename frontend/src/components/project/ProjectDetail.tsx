import { Card, Descriptions, Tag, Space, Button } from 'antd'
import { EditOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { Project, ProjectStatus } from '@/types'

interface ProjectDetailProps {
  project: Project
  loading?: boolean
  onEdit?: () => void
}

const ProjectDetail = ({
  project,
  loading = false,
  onEdit,
}: ProjectDetailProps) => {
  const navigate = useNavigate()

  const statusMap: Record<ProjectStatus, { text: string; color: string }> = {
    planning: { text: '规划中', color: 'blue' },
    bidding: { text: '招投标', color: 'orange' },
    contract: { text: '合同签订', color: 'green' },
    production: { text: '生产中', color: 'purple' },
    completed: { text: '已完成', color: 'default' },
    cancelled: { text: '已取消', color: 'red' },
  }

  const statusInfo = statusMap[project.status]

  return (
    <Card
      title="项目详情"
      loading={loading}
      extra={
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/projects')}
          >
            返回列表
          </Button>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => {
              if (onEdit) {
                onEdit()
              } else {
                navigate(`/projects/${project.id}/edit`)
              }
            }}
          >
            编辑项目
          </Button>
        </Space>
      }
    >
      <Descriptions column={2} bordered>
        <Descriptions.Item label="项目编号">
          {project.project_number}
        </Descriptions.Item>
        <Descriptions.Item label="项目名称">
          {project.project_name}
        </Descriptions.Item>
        <Descriptions.Item label="承接日期">
          {new Date(project.start_date).toLocaleDateString('zh-CN')}
        </Descriptions.Item>
        <Descriptions.Item label="项目状态">
          <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="出图单位">
          {project.drawing_unit || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="创建时间">
          {new Date(project.created_at).toLocaleString('zh-CN')}
        </Descriptions.Item>
        <Descriptions.Item label="更新时间">
          {new Date(project.updated_at).toLocaleString('zh-CN')}
        </Descriptions.Item>
      </Descriptions>
      {project.project_overview && (
        <Descriptions column={1} bordered style={{ marginTop: 16 }}>
          <Descriptions.Item label="项目概况">
            {project.project_overview}
          </Descriptions.Item>
        </Descriptions>
      )}
    </Card>
  )
}

export default ProjectDetail
