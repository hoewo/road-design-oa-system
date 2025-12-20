import { Table, Button, Space, Tag, message } from 'antd'
import { EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { projectService } from '@/services/project'
import type { Project, ProjectStatus } from '@/types'

interface ProjectListProps {
  projects: Project[]
  loading?: boolean
  onEdit?: (project: Project) => void
  onDelete?: (project: Project) => void
}

const ProjectList = ({
  projects,
  loading = false,
  onEdit,
  onDelete,
}: ProjectListProps) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => projectService.deleteProject(id),
    onSuccess: () => {
      message.success('项目删除成功')
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: () => {
      message.error('项目删除失败')
    },
  })

  const statusMap: Record<ProjectStatus, { text: string; color: string }> = {
    planning: { text: '规划中', color: 'blue' },
    bidding: { text: '招投标', color: 'orange' },
    contract: { text: '合同签订', color: 'green' },
    production: { text: '生产中', color: 'purple' },
    completed: { text: '已完成', color: 'default' },
    cancelled: { text: '已取消', color: 'red' },
  }

  const columns = [
    {
      title: '项目编号',
      dataIndex: 'project_number',
      key: 'project_number',
      width: 150,
    },
    {
      title: '项目名称',
      dataIndex: 'project_name',
      key: 'project_name',
      ellipsis: true,
    },
    {
      title: '承接日期',
      dataIndex: 'start_date',
      key: 'start_date',
      width: 120,
      render: (date: string) => {
        return new Date(date).toLocaleDateString('zh-CN')
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: ProjectStatus) => {
        const statusInfo = statusMap[status]
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right' as const,
      render: (_: any, record: Project) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/projects/${record.id}`)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              if (onEdit) {
                onEdit(record)
              } else {
                navigate(`/projects/${record.id}/edit`)
              }
            }}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            loading={deleteMutation.isPending}
            onClick={() => {
              if (window.confirm('确定要删除该项目吗？')) {
                if (onDelete) {
                  onDelete(record)
                } else {
                  deleteMutation.mutate(record.id)
                }
              }
            }}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <Table
      columns={columns}
      dataSource={projects}
      rowKey="id"
      loading={loading}
      scroll={{ x: 1000 }}
    />
  )
}

export default ProjectList
