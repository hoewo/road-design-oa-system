import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Card, Tabs, Breadcrumb, message } from 'antd'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { projectService } from '@/services/project'
import { businessService } from '@/services/business'
import { userService } from '@/services/user'
import { projectMemberService } from '@/services/projectMember'
import { BasicInfoTab } from '@/components/project/BasicInfoTab'
import { BusinessInfoTab } from '@/components/project/BusinessInfoTab'
import { ProductionInfo } from '@/components/production/ProductionInfo'

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<string>(
    searchParams.get('tab') || 'basic'
  )

  // Sync activeTab with URL params on mount and when searchParams change
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || 'basic'
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl)
    }
  }, [searchParams])

  const projectId = Number(id)

  const {
    data: project,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.getProject(projectId),
    enabled: !!projectId,
  })

  // Load users for manager selection
  const { data: usersData } = useQuery({
    queryKey: ['activeUsers'],
    queryFn: async () => {
      const response = await userService.listUsers({
        page: 1,
        size: 100,
        is_active: true,
      })
      return response.data || []
    },
  })

  // Load project members for manager display
  const { data: projectMembers } = useQuery({
    queryKey: ['projectMembers', projectId],
    queryFn: () => projectMemberService.list(projectId),
    enabled: !!projectId,
  })

  // Load financial data for statistics
  const { data: financialData } = useQuery({
    queryKey: ['projectFinancial', projectId],
    queryFn: () => businessService.getProjectFinancial(projectId),
    enabled: !!projectId && activeTab === 'business',
  })

  // Load project business data for display
  const { data: businessData } = useQuery({
    queryKey: ['projectBusiness', projectId],
    queryFn: () => businessService.getProjectBusiness(projectId),
    enabled: !!projectId && activeTab === 'business',
  })

  useEffect(() => {
    if (error) {
      message.error('加载项目详情失败')
    }
  }, [error])

  // Update URL when tab changes
  const handleTabChange = (key: string) => {
    setActiveTab(key)
    setSearchParams({ tab: key })
  }

  const handleBack = () => {
    navigate('/projects')
  }

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

  if (isLoading) {
    return <div>加载中...</div>
  }

  if (!project) {
    return <div>项目不存在</div>
  }

  const users = usersData || []

  const tabItems = [
    {
      key: 'basic',
      label: '基本信息',
      children: (
        <BasicInfoTab
          projectId={projectId}
          project={project}
          projectMembers={projectMembers}
          users={users}
          queryClient={queryClient}
          onRefetch={refetch}
        />
      ),
    },
    {
      key: 'business',
      label: '经营信息',
      children: (
        <BusinessInfoTab
          projectId={projectId}
          financialData={financialData}
          businessData={businessData}
        />
      ),
    },
    {
      key: 'production',
      label: '生产信息',
      children: (
        <ProductionInfo
          projectId={projectId}
          onGetContractAmount={handleGetContractAmount}
        />
      ),
    },
  ]

  return (
    <>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          {
            title: (
              <a onClick={handleBack} style={{ cursor: 'pointer' }}>
                项目列表
              </a>
            ),
          },
          {
            title: project.project_name,
          },
        ]}
      />

      <Card>
        <Tabs
          activeKey={activeTab}
          items={tabItems}
          onChange={handleTabChange}
        />
      </Card>
    </>
  )
}

export default ProjectDetail
