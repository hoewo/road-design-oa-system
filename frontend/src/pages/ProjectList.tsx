import { useState, useEffect } from 'react'
import { Table, Button, Space, Input, Select, Card, message } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { projectService } from '@/services/project'
import type { ProjectStatus } from '@/types'

const { Search } = Input
const { Option } = Select

const ProjectList = () => {
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | undefined>()
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['projects', pagination.current, pagination.pageSize, searchText, statusFilter],
    queryFn: () => projectService.getProjects({
      page: pagination.current,
      size: pagination.pageSize,
      keyword: searchText,
      status: statusFilter,
    }),
  })

  useEffect(() => {
    if (data) {
      setPagination(prev => ({
        ...prev,
        total: data.total,
      }))
    }
  }, [data])

  const columns = [
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
      title: '承接日期',
      dataIndex: 'start_date',
      key: 'start_date',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: ProjectStatus) => {
        const statusMap = {
          planning: '规划中',
          bidding: '招投标',
          contract: '合同签订',
          production: '生产中',
          completed: '已完成',
          cancelled: '已取消',
        }
        return statusMap[status] || status
      },
    },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Space size="middle">
          <Button type="link" size="small">
            查看
          </Button>
          <Button type="link" size="small">
            编辑
          </Button>
          <Button type="link" size="small" danger>
            删除
          </Button>
        </Space>
      ),
    },
  ]

  const handleTableChange = (pagination: any) => {
    setPagination(prev => ({
      ...prev,
      current: pagination.current,
      pageSize: pagination.pageSize,
    }))
  }

  const handleSearch = (value: string) => {
    setSearchText(value)
    setPagination(prev => ({ ...prev, current: 1 }))
  }

  const handleStatusFilter = (value: ProjectStatus | undefined) => {
    setStatusFilter(value)
    setPagination(prev => ({ ...prev, current: 1 }))
  }

  if (error) {
    message.error('加载项目列表失败')
  }

  return (
    <Card title="项目管理" extra={
      <Button type="primary" icon={<PlusOutlined />}>
        新建项目
      </Button>
    }>
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
      />
    </Card>
  )
}

export default ProjectList
