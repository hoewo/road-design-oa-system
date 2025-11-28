import { useState, useEffect } from 'react'
import { Table, Button, Select, Space, message, Input, Popconfirm } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { productionService } from '@/services/production'
import { userService } from '@/services/user'
import type { ReplaceDisciplineAssignmentsRequest, User } from '@/types'

interface DisciplineAssignmentFormProps {
  projectId: number
}

// 常见专业列表
const COMMON_DISCIPLINES = [
  '道路工程',
  '桥梁工程',
  '隧道工程',
  '给排水工程',
  '电气工程',
  '通信工程',
  '绿化工程',
  '交通工程',
  '其他',
]

interface DisciplineRow {
  key: string
  discipline: string
  designer_id?: number
  participant_id?: number
  reviewer_id?: number
}

export const DisciplineAssignmentForm = ({
  projectId,
}: DisciplineAssignmentFormProps) => {
  const [dataSource, setDataSource] = useState<DisciplineRow[]>([])
  const queryClient = useQueryClient()

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['disciplineAssignments', projectId],
    queryFn: () => productionService.getDisciplineAssignments(projectId),
    enabled: !!projectId,
  })

  const { data: usersData } = useQuery({
    queryKey: ['users', { is_active: true }],
    queryFn: () => userService.listUsers({ is_active: true, size: 1000 }),
  })

  const replaceMutation = useMutation({
    mutationFn: (data: ReplaceDisciplineAssignmentsRequest) =>
      productionService.replaceDisciplineAssignments(projectId, data),
    onSuccess: () => {
      message.success('专业分配保存成功')
      queryClient.invalidateQueries({
        queryKey: ['disciplineAssignments', projectId],
      })
    },
    onError: (error: any) => {
      message.error(error.message || '保存失败')
    },
  })

  useEffect(() => {
    if (assignments) {
      const rows: DisciplineRow[] = assignments.map((assignment, index) => ({
        key: `existing-${index}`,
        discipline: assignment.discipline,
        designer_id: assignment.designer?.id,
        participant_id: assignment.participant?.id,
        reviewer_id: assignment.reviewer?.id,
      }))
      setDataSource(rows)
    }
  }, [assignments])

  const handleAdd = () => {
    const newRow: DisciplineRow = {
      key: `new-${Date.now()}`,
      discipline: '',
      designer_id: undefined,
      participant_id: undefined,
      reviewer_id: undefined,
    }
    setDataSource([...dataSource, newRow])
  }

  const handleDelete = (key: string) => {
    setDataSource(dataSource.filter((item) => item.key !== key))
  }

  const handleSave = () => {
    const assignments: ReplaceDisciplineAssignmentsRequest['assignments'] = []

    for (const row of dataSource) {
      if (!row.discipline) {
        message.warning('请填写专业名称')
        return
      }
      if (!row.designer_id) {
        message.warning(`专业"${row.discipline}"必须指定设计人`)
        return
      }
      if (!row.participant_id) {
        message.warning(`专业"${row.discipline}"必须指定参与人`)
        return
      }
      if (!row.reviewer_id) {
        message.warning(`专业"${row.discipline}"必须指定复核人`)
        return
      }

      assignments.push({
        discipline: row.discipline,
        designer_id: row.designer_id,
        participant_id: row.participant_id,
        reviewer_id: row.reviewer_id,
      })
    }

    replaceMutation.mutate({ assignments })
  }

  const handleCellChange = (
    key: string,
    field: keyof DisciplineRow,
    value: any
  ) => {
    setDataSource(
      dataSource.map((item) =>
        item.key === key ? { ...item, [field]: value } : item
      )
    )
  }

  const users = usersData?.data || []

  const columns = [
    {
      title: '专业',
      dataIndex: 'discipline',
      key: 'discipline',
      width: 200,
      render: (text: string, record: DisciplineRow) => (
        <Select
          value={text}
          onChange={(value) =>
            handleCellChange(record.key, 'discipline', value)
          }
          placeholder="选择或输入专业"
          showSearch
          allowClear
          style={{ width: '100%' }}
          dropdownRender={(menu) => (
            <>
              {menu}
              <div style={{ padding: '8px', borderTop: '1px solid #f0f0f0' }}>
                <Input
                  placeholder="输入新专业名称"
                  onPressEnter={(e) => {
                    const value = (e.target as HTMLInputElement).value
                    if (value) {
                      handleCellChange(record.key, 'discipline', value)
                    }
                  }}
                />
              </div>
            </>
          )}
        >
          {COMMON_DISCIPLINES.map((d) => (
            <Select.Option key={d} value={d}>
              {d}
            </Select.Option>
          ))}
        </Select>
      ),
    },
    {
      title: '设计人',
      dataIndex: 'designer_id',
      key: 'designer_id',
      width: 200,
      render: (value: number | undefined, record: DisciplineRow) => (
        <Select
          value={value}
          onChange={(val) => handleCellChange(record.key, 'designer_id', val)}
          placeholder="选择设计人"
          style={{ width: '100%' }}
          allowClear
        >
          {users.map((user: User) => (
            <Select.Option key={user.id} value={user.id}>
              {user.real_name} ({user.username})
            </Select.Option>
          ))}
        </Select>
      ),
    },
    {
      title: '参与人',
      dataIndex: 'participant_id',
      key: 'participant_id',
      width: 200,
      render: (value: number | undefined, record: DisciplineRow) => (
        <Select
          value={value}
          onChange={(val) =>
            handleCellChange(record.key, 'participant_id', val)
          }
          placeholder="选择参与人"
          style={{ width: '100%' }}
          allowClear
        >
          {users.map((user: User) => (
            <Select.Option key={user.id} value={user.id}>
              {user.real_name} ({user.username})
            </Select.Option>
          ))}
        </Select>
      ),
    },
    {
      title: '复核人',
      dataIndex: 'reviewer_id',
      key: 'reviewer_id',
      width: 200,
      render: (value: number | undefined, record: DisciplineRow) => (
        <Select
          value={value}
          onChange={(val) => handleCellChange(record.key, 'reviewer_id', val)}
          placeholder="选择复核人"
          style={{ width: '100%' }}
          allowClear
        >
          {users.map((user: User) => (
            <Select.Option key={user.id} value={user.id}>
              {user.real_name} ({user.username})
            </Select.Option>
          ))}
        </Select>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: DisciplineRow) => (
        <Popconfirm
          title="确定删除这一行吗？"
          onConfirm={() => handleDelete(record.key)}
        >
          <Button type="link" danger icon={<DeleteOutlined />} size="small">
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ]

  if (isLoading) {
    return <div>加载中...</div>
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加专业
        </Button>
        <Button
          type="primary"
          onClick={handleSave}
          loading={replaceMutation.isPending}
        >
          保存
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={dataSource}
        rowKey="key"
        pagination={false}
        bordered
      />
    </div>
  )
}
