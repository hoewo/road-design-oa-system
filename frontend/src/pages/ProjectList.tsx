import { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Space,
  Input,
  Select,
  Card,
  message,
  Modal,
  Tag,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  DollarOutlined,
  SettingOutlined,
  UserOutlined,
  FileOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { projectService } from '@/services/project'
import { permissionService } from '@/services/permission'
import { useAuth } from '@/contexts/AuthContext'
import ProjectForm from '@/components/project/ProjectForm'
import type { Project, ProjectStatus } from '@/types'

const { Search } = Input
const { Option } = Select

const ProjectList = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | undefined>()
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  })

  // Check if current user can create project (only project managers can create projects)
  const canCreateProject = permissionService.utils.canCreateProject(currentUser)
  // Check if current user can manage projects (edit/delete) - only project managers or admins
  const canManageProjects = permissionService.utils.canManageProjectManagers(currentUser)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: [
      'projects',
      pagination.current,
      pagination.pageSize,
      searchText,
      statusFilter,
    ],
    queryFn: () =>
      projectService.getProjects({
        page: pagination.current,
        size: pagination.pageSize,
        keyword: searchText,
        status: statusFilter,
      }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectService.deleteProject(id),
    onSuccess: () => {
      message.success('项目删除成功')
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: () => {
      message.error('项目删除失败')
    },
  })

  useEffect(() => {
    if (data) {
      setPagination((prev) => ({
        ...prev,
        total: data.total,
      }))
    }
  }, [data])

  useEffect(() => {
    if (error) {
      message.error('加载项目列表失败，请检查网络连接或重新登录')
    }
  }, [error])

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
      render: (date: string) => new Date(date).toLocaleDateString('zh-CN'),
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
      width: 240,
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
          {canManageProjects && (
            <>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingProject(record)
              setModalVisible(true)
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
              Modal.confirm({
                title: '确认删除',
                content: '确定要删除该项目吗？此操作不可恢复。',
                okText: '确定',
                cancelText: '取消',
                okType: 'danger',
                onOk: () => {
                  deleteMutation.mutate(record.id)
                },
              })
            }}
          >
            删除
          </Button>
            </>
          )}
        </Space>
      ),
    },
  ]

  const handleTableChange = (pagination: any) => {
    setPagination((prev) => ({
      ...prev,
      current: pagination.current,
      pageSize: pagination.pageSize,
    }))
  }

  const handleSearch = (value: string) => {
    setSearchText(value)
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  const handleStatusFilter = (value: ProjectStatus | undefined) => {
    setStatusFilter(value)
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  const handleCreate = () => {
    setEditingProject(null)
    setModalVisible(true)
  }

  const handleModalClose = () => {
    setModalVisible(false)
    setEditingProject(null)
  }

  const handleFormSuccess = () => {
    setModalVisible(false)
    setEditingProject(null)
    queryClient.invalidateQueries({ queryKey: ['projects'] })
  }

  return (
    <>
      <Card
        title="项目管理"
        extra={
          <Space>
            <Button
              icon={<FileOutlined />}
              onClick={() => navigate('/files')}
            >
              文件管理
            </Button>
            <Button
              icon={<DollarOutlined />}
              onClick={() => navigate('/company-revenue')}
            >
              公司收入统计
            </Button>
            <Button
              icon={<SettingOutlined />}
              onClick={() => navigate('/company-config')}
            >
              公司配置
            </Button>
            {permissionService.utils.isSystemAdmin(currentUser) && (
              <Button
                icon={<UserOutlined />}
                onClick={() => navigate('/users')}
              >
                用户管理
              </Button>
            )}
            {canCreateProject && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreate}
              >
                新建项目
              </Button>
            )}
          </Space>
        }
      >
        <Space style={{ marginBottom: 16 }}>
          <Search
            placeholder="搜索项目名称或编号"
            allowClear
            enterButton={<SearchOutlined />}
            size="middle"
            style={{ width: 300 }}
            onSearch={handleSearch}
          />
          <Select
            placeholder="选择状态"
            allowClear
            style={{ width: 120 }}
            onChange={handleStatusFilter}
            value={statusFilter}
          >
            <Option value="planning">规划中</Option>
            <Option value="bidding">招投标</Option>
            <Option value="contract">合同签订</Option>
            <Option value="production">生产中</Option>
            <Option value="completed">已完成</Option>
            <Option value="cancelled">已取消</Option>
          </Select>
        </Space>

        <Table
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      <Modal
        title={editingProject ? '编辑项目' : '新建项目'}
        open={modalVisible}
        onCancel={handleModalClose}
        footer={null}
        width={800}
        destroyOnHidden
      >
        <ProjectForm
          projectId={editingProject?.id}
          onSuccess={handleFormSuccess}
          onCancel={handleModalClose}
        />
      </Modal>
    </>
  )
}

export default ProjectList
