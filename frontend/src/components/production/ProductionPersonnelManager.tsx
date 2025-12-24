import { useState } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  message,
  Popconfirm,
  Empty,
  Row,
  Col,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectMemberService } from '@/services/projectMember'
import { projectService } from '@/services/project'
import { permissionService } from '@/services/permission'
import { useAuth } from '@/contexts/AuthContext'
import { DisciplinePersonnelModal } from './DisciplinePersonnelModal'
import { ReviewerModal } from './ReviewerModal'
import type { ProjectMember, MemberRole } from '@/types'

interface ProductionPersonnelManagerProps {
  projectId: string
}

const PRODUCTION_ROLES: MemberRole[] = ['designer', 'participant', 'reviewer']
const REVIEWER_ROLES: MemberRole[] = ['auditor', 'approver']

const ROLE_LABELS: Record<MemberRole, string> = {
  designer: '设计人',
  participant: '参与人',
  reviewer: '复核人',
  auditor: '审核人',
  approver: '审定人',
  business_personnel: '经营参与人',
}

export const ProductionPersonnelManager = ({
  projectId,
}: ProductionPersonnelManagerProps) => {
  const [personnelModalVisible, setPersonnelModalVisible] = useState(false)
  const [reviewerModalVisible, setReviewerModalVisible] = useState(false)
  const [editingMember, setEditingMember] = useState<ProjectMember | null>(null)
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<string | undefined>()
  const [selectedRole, setSelectedRole] = useState<MemberRole | undefined>()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  // 获取项目信息（用于权限检查）
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.getProject(projectId),
    enabled: !!projectId,
  })

  // 检查权限：是否可以管理项目生产人员
  // 注意：实际权限检查在服务端进行，前端只用于控制UI显示
  const canManage = user
    ? permissionService.utils.canManageProjectMembers(
        user,
        project?.business_manager_id,
        project?.production_manager_id
      )
    : false

  // 获取项目成员（生产人员）- 所有用户都可以查看
  const { data: projectMembers = [] } = useQuery({
    queryKey: ['projectMembers', projectId],
    queryFn: () => projectMemberService.list(projectId),
    enabled: !!projectId,
  })

  // 删除成员
  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await projectMemberService.remove(memberId)
    },
    onSuccess: () => {
      message.success('删除成功')
      queryClient.invalidateQueries({
        queryKey: ['projectMembers', projectId],
      })
    },
    onError: (error: any) => {
      message.error(error.message || '删除失败')
    },
  })

  // 过滤生产人员（按专业）
  const productionMembers = projectMembers.filter((m) =>
    PRODUCTION_ROLES.includes(m.role as MemberRole)
  )

  // 获取审核人和审定人
  const auditor = projectMembers.find((m) => m.role === 'auditor')
  const approver = projectMembers.find((m) => m.role === 'approver')

  // 按专业分组生产人员
  const membersByDiscipline = productionMembers.reduce((acc, member) => {
    const disciplineId = member.discipline_id || 'unknown'
    if (!acc[disciplineId]) {
      acc[disciplineId] = {
        disciplineId,
        disciplineName: member.discipline?.name || '未知专业',
        members: [],
      }
    }
    acc[disciplineId].members.push(member)
    return acc
  }, {} as Record<string, { disciplineId: string; disciplineName: string; members: ProjectMember[] }>)

  const handleAddPersonnel = (disciplineId?: string, role?: MemberRole) => {
    setEditingMember(null)
    setSelectedDisciplineId(disciplineId)
    setSelectedRole(role)
    setPersonnelModalVisible(true)
  }

  const handleEditPersonnel = (member: ProjectMember) => {
    setEditingMember(member)
    setSelectedDisciplineId(member.discipline_id)
    setSelectedRole(member.role as MemberRole)
    setPersonnelModalVisible(true)
  }

  const handleDeletePersonnel = (memberId: string) => {
    removeMutation.mutate(memberId)
  }

  const handlePersonnelSuccess = () => {
    queryClient.invalidateQueries({
      queryKey: ['projectMembers', projectId],
    })
    setPersonnelModalVisible(false)
    setEditingMember(null)
    setSelectedDisciplineId(undefined)
    setSelectedRole(undefined)
  }

  const handleReviewerSuccess = () => {
    queryClient.invalidateQueries({
      queryKey: ['projectMembers', projectId],
    })
    setReviewerModalVisible(false)
  }

  // 构建生产人员表格数据（按专业分组，每行一个专业）
  const personnelTableData = Object.values(membersByDiscipline).map((group) => {
    const designers = group.members.filter((m) => m.role === 'designer')
    const participants = group.members.filter((m) => m.role === 'participant')
    const reviewers = group.members.filter((m) => m.role === 'reviewer')

    const formatNames = (members: ProjectMember[]) => {
      return members
        .map((m) => m.user?.real_name || m.user?.username || `用户ID: ${m.user_id}`)
        .join('、')
    }

    return {
      key: group.disciplineId,
      disciplineId: group.disciplineId,
      disciplineName: group.disciplineName,
      designer: formatNames(designers) || '-',
      participant: formatNames(participants) || '-',
      reviewer: formatNames(reviewers) || '-',
      allMembers: group.members, // 保存该专业下的所有成员，用于编辑和删除
    }
  })

  // 生产人员表格列
  const personnelColumns = [
    {
      title: '专业',
      dataIndex: 'disciplineName',
      key: 'disciplineName',
    },
    {
      title: '设计人',
      dataIndex: 'designer',
      key: 'designer',
    },
    {
      title: '参与人',
      dataIndex: 'participant',
      key: 'participant',
    },
    {
      title: '复核人',
      dataIndex: 'reviewer',
      key: 'reviewer',
    },
    ...(canManage
      ? [
          {
            title: '操作',
            key: 'action',
            render: (_: any, record: any) => (
              <Space>
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => {
                    // 编辑该专业下的人员，打开弹出框
                    // 这里可以打开一个显示该专业所有人员的列表，或者直接打开添加人员的弹出框
                    handleAddPersonnel(record.disciplineId)
                  }}
                >
                  编辑
                </Button>
                <Popconfirm
                  title="确定要删除该专业下的所有人员吗？"
                  onConfirm={() => {
                    // 删除该专业下的所有人员
                    record.allMembers.forEach((member: ProjectMember) => {
                      handleDeletePersonnel(member.id)
                    })
                  }}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]
      : []),
  ]

  return (
    <>
      {/* 生产人员配置 */}
      <Card
        title="生产人员配置"
        extra={
          canManage && (
            <Space>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => setReviewerModalVisible(true)}
              >
                {auditor || approver ? '编辑审核人/审定人' : '设置审核人/审定人'}
              </Button>
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => handleAddPersonnel()}
              >
                添加人员
              </Button>
            </Space>
          )
        }
        style={{ marginBottom: 24 }}
      >
        {/* 审核人和审定人单行展示 */}
        <Row gutter={16} style={{ marginBottom: 20 }}>
          <Col span={12}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                审核人
              </label>
              <div style={{ padding: '8px 0' }}>
                {auditor ? (
                  <span>
                    {auditor.user?.real_name || auditor.user?.username || `用户ID: ${auditor.user_id}`}
                  </span>
                ) : (
                  <span style={{ color: '#999' }}>未设置</span>
                )}
              </div>
            </div>
          </Col>
          <Col span={12}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                审定人
              </label>
              <div style={{ padding: '8px 0' }}>
                {approver ? (
                  <span>
                    {approver.user?.real_name || approver.user?.username || `用户ID: ${approver.user_id}`}
                  </span>
                ) : (
                  <span style={{ color: '#999' }}>未设置</span>
                )}
              </div>
            </div>
          </Col>
        </Row>

        {/* 生产人员表格（按专业） */}
        <div style={{ marginTop: 20 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
            生产人员（按专业）
          </label>
          {personnelTableData.length > 0 ? (
            <Table
              columns={personnelColumns}
              dataSource={personnelTableData}
              rowKey="key"
              pagination={false}
            />
          ) : (
            <Empty description="暂无生产人员" />
          )}
        </div>
      </Card>

      {/* 生产人员编辑弹出框 */}
      <DisciplinePersonnelModal
        visible={personnelModalVisible}
        projectId={projectId}
        member={editingMember}
        disciplineId={selectedDisciplineId}
        role={selectedRole}
        onCancel={() => {
          setPersonnelModalVisible(false)
          setEditingMember(null)
          setSelectedDisciplineId(undefined)
          setSelectedRole(undefined)
        }}
        onSuccess={handlePersonnelSuccess}
      />

      {/* 审核人和审定人统一编辑弹出框 */}
      <ReviewerModal
        visible={reviewerModalVisible}
        projectId={projectId}
        auditor={auditor || null}
        approver={approver || null}
        onCancel={() => setReviewerModalVisible(false)}
        onSuccess={handleReviewerSuccess}
      />
    </>
  )
}

