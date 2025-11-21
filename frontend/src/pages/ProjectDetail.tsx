import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Descriptions, Button, Space, message, Modal, Tag } from 'antd'
import {
  EditOutlined,
  ArrowLeftOutlined,
  ShopOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { projectService } from '@/services/project'
import ProjectForm from '@/components/project/ProjectForm'
import { ProjectBusinessForm } from '@/components/project/ProjectBusinessForm'
import type { ProjectStatus } from '@/types'

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [modalVisible, setModalVisible] = useState(false)

  const {
    data: project,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectService.getProject(Number(id)),
    enabled: !!id,
  })

  useEffect(() => {
    if (error) {
      message.error('加载项目详情失败')
    }
  }, [error])

  const handleEdit = () => {
    setModalVisible(true)
  }

  const handleBack = () => {
    navigate('/projects')
  }

  const handleModalClose = () => {
    setModalVisible(false)
  }

  const handleFormSuccess = () => {
    setModalVisible(false)
    refetch()
  }

  if (isLoading) {
    return <div>加载中...</div>
  }

  if (!project) {
    return <div>项目不存在</div>
  }

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
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
          返回列表
        </Button>
        <Button type="primary" icon={<EditOutlined />} onClick={handleEdit}>
          编辑项目
        </Button>
        <Button
          icon={<ShopOutlined />}
          onClick={() => navigate(`/projects/${project.id}/business`)}
        >
          经营信息管理
        </Button>
      </Space>

      <Card title="项目详情" loading={isLoading}>
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

      <Card title="项目经营信息" style={{ marginTop: 16 }}>
        <ProjectBusinessForm projectId={project.id} />
      </Card>

      <Modal
        title="编辑项目"
        open={modalVisible}
        onCancel={handleModalClose}
        footer={null}
        width={800}
        destroyOnHidden
      >
        <ProjectForm
          projectId={project.id}
          onSuccess={handleFormSuccess}
          onCancel={handleModalClose}
        />
      </Modal>
    </>
  )
}

export default ProjectDetail
