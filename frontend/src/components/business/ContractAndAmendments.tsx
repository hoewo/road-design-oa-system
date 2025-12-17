import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Table, Button, Space, message, Modal, Popconfirm } from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  DownloadOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { businessService } from '@/services/business'
import { fileService } from '@/services/file'
import { permissionService } from '@/services/permission'
import { ContractForm } from '@/components/contract/ContractForm'
import { ContractAmendmentForm } from '@/components/contract/ContractAmendmentForm'
import type { Contract, ContractAmendment } from '@/types'
import dayjs from 'dayjs'

interface ContractAndAmendmentsProps {
  projectId: string
}

export const ContractAndAmendments = ({
  projectId,
}: ContractAndAmendmentsProps) => {
  const navigate = useNavigate()
  const [contractModalVisible, setContractModalVisible] = useState(false)
  const [amendmentModalVisible, setAmendmentModalVisible] = useState(false)
  const [editingContract, setEditingContract] = useState<Contract | null>(null)
  const [editingAmendment, setEditingAmendment] =
    useState<ContractAmendment | null>(null)
  const [contractId, setContractId] = useState<string | undefined>()
  const queryClient = useQueryClient()

  // 检查权限：是否可以管理项目经营信息（包括合同信息）
  const { data: canManage } = useQuery({
    queryKey: ['canManageBusinessInfo', projectId],
    queryFn: () => permissionService.canManageBusinessInfo(projectId),
    enabled: !!projectId,
  })

  // 获取项目所有合同
  const { data: contracts, isLoading: contractsLoading } = useQuery({
    queryKey: ['contracts', projectId],
    queryFn: () => businessService.getContracts(projectId),
    enabled: !!projectId,
  })

  // 获取所有补充协议
  const { data: allAmendments, isLoading: amendmentsLoading } = useQuery({
    queryKey: ['projectAmendments', projectId],
    queryFn: async () => {
      if (!contracts || contracts.length === 0) return []
      const amendments: (ContractAmendment & { contract_id: string })[] = []
      for (const contract of contracts) {
        try {
          const contractAmendments =
            await businessService.getContractAmendments(projectId, contract.id)
          amendments.push(
            ...contractAmendments.map((a) => ({
              ...a,
              contract_id: contract.id,
            }))
          )
        } catch (error) {
          console.error(
            `Failed to load amendments for contract ${contract.id}:`,
            error
          )
        }
      }
      return amendments
    },
    enabled: !!projectId && !!contracts && contracts.length > 0,
  })

  // 删除合同
  const deleteContractMutation = useMutation({
    mutationFn: (contractId: string) =>
      businessService.deleteContract(contractId),
    onSuccess: () => {
      message.success('合同删除成功')
      queryClient.invalidateQueries({ queryKey: ['contracts', projectId] })
      queryClient.invalidateQueries({
        queryKey: ['projectAmendments', projectId],
      })
    },
    onError: (error: any) => {
      message.error(error.message || '删除失败')
    },
  })

  // 删除补充协议
  const deleteAmendmentMutation = useMutation({
    mutationFn: ({
      projectId,
      contractId,
      amendmentId,
    }: {
      projectId: string
      contractId: string
      amendmentId: string
    }) =>
      businessService.deleteContractAmendment(projectId, contractId, amendmentId),
    onSuccess: () => {
      message.success('补充协议删除成功')
      queryClient.invalidateQueries({
        queryKey: ['projectAmendments', projectId],
      })
      queryClient.invalidateQueries({
        queryKey: ['contractAmendments'],
      })
    },
    onError: (error: any) => {
      message.error(error.message || '删除失败')
    },
  })

  const handleCreateContract = () => {
    setEditingContract(null)
    setContractModalVisible(true)
  }

  const handleViewContract = (contract: Contract) => {
    navigate(`/contracts/${contract.id}`)
  }

  const handleEditContract = (contract: Contract) => {
    setEditingContract(contract)
    setContractModalVisible(true)
  }

  const handleDeleteContract = (contract: Contract) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除合同 ${contract.contract_number} 吗？`,
      onOk: () => {
        deleteContractMutation.mutate(contract.id)
      },
    })
  }

  const handleAddAmendment = (contract: Contract) => {
    setEditingAmendment(null)
    setContractId(contract.id)
    setAmendmentModalVisible(true)
  }

  const handleEditAmendment = (
    amendment: ContractAmendment & { contract_id: string }
  ) => {
    setEditingAmendment(amendment)
    setContractId(amendment.contract_id)
    setAmendmentModalVisible(true)
  }

  const handleDeleteAmendment = (amendment: ContractAmendment & { contract_id: string }) => {
    deleteAmendmentMutation.mutate({
      projectId,
      contractId: amendment.contract_id,
      amendmentId: amendment.id,
    })
  }

  const handleContractModalClose = () => {
    setContractModalVisible(false)
    setEditingContract(null)
  }

  const handleAmendmentModalClose = () => {
    setAmendmentModalVisible(false)
    setEditingAmendment(null)
    setContractId(undefined)
  }

  const handleContractSuccess = () => {
    setContractModalVisible(false)
    setEditingContract(null)
  }

  const handleAmendmentSuccess = () => {
    setAmendmentModalVisible(false)
    setEditingAmendment(null)
    setContractId(undefined)
  }

  const handleDownloadFile = async (fileId: string, fileName: string) => {
    try {
      await fileService.downloadFile(fileId, fileName)
      message.success(`正在下载 ${fileName}`)
    } catch (error: any) {
      message.error(error.message || '下载失败')
    }
  }

  // 合同表格列
  const contractColumns = [
    {
      title: '签订时间',
      dataIndex: 'sign_date',
      key: 'sign_date',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '合同金额',
      key: 'contract_amount',
      render: (_: any, record: Contract) => (
        <Space direction="vertical" size="small">
          {record.design_fee && (
            <span>设计费: ¥{record.design_fee.toLocaleString()}</span>
          )}
          {record.survey_fee && (
            <span>勘察费: ¥{record.survey_fee.toLocaleString()}</span>
          )}
          {record.consultation_fee && (
            <span>咨询费: ¥{record.consultation_fee.toLocaleString()}</span>
          )}
        </Space>
      ),
    },
    {
      title: '合同费率',
      dataIndex: 'contract_rate',
      key: 'contract_rate',
      render: (rate: number) => (rate ? `${(rate * 100).toFixed(2)}%` : '-'),
    },
    {
      title: '合同文件',
      key: 'contract_file',
      render: (_: any, record: Contract) => {
        if (record.contract_file) {
          return (
            <Button
              type="link"
              icon={<DownloadOutlined />}
              onClick={() =>
                handleDownloadFile(
                  record.contract_file!.id,
                  record.contract_file!.original_name || '合同文件'
                )
              }
            >
              {record.contract_file.original_name || '下载文件'}
            </Button>
          )
        }
        return '-'
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Contract) => (
        <Space>
          {canManage && (
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditContract(record)}
          >
            编辑
          </Button>
          )}
          {canManage && (
          <Button type="link" onClick={() => handleAddAmendment(record)}>
            添加补充协议
          </Button>
          )}
          {canManage && (
            <Popconfirm
              title="确认删除"
              description={`确定要删除合同 ${record.contract_number} 吗？`}
              onConfirm={() => handleDeleteContract(record)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  // 补充协议表格列
  const amendmentColumns = [
    {
      title: '签订时间',
      dataIndex: 'sign_date',
      key: 'sign_date',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '补充协议金额',
      key: 'amendment_amount',
      render: (_: any, record: ContractAmendment) => {
        const amount = record.amendment_amount || 0
        return `¥${amount.toLocaleString()}`
      },
    },
    {
      title: '合同费率',
      key: 'rate',
      render: (_: any, record: ContractAmendment & { contract_id: string }) => {
        // 优先使用补充协议自己的费率，如果没有则使用合同的费率
        const rate = record.contract_rate ?? contracts?.find((c) => c.id === record.contract_id)?.contract_rate
        return rate ? `${(rate * 100).toFixed(2)}%` : '-'
      },
    },
    {
      title: '协议文件',
      key: 'amendment_file',
      render: (_: any, record: ContractAmendment & { contract_id: string }) => {
        if (record.amendment_file) {
          return (
            <Button
              type="link"
              icon={<DownloadOutlined />}
              onClick={() =>
                handleDownloadFile(
                  record.amendment_file!.id,
                  record.amendment_file!.original_name || '补充协议文件'
                )
              }
            >
              {record.amendment_file.original_name || '下载文件'}
            </Button>
          )
        }
        return '-'
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: ContractAmendment & { contract_id: string }) => (
        <Space>
          {canManage && (
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditAmendment(record)}
          >
            编辑
          </Button>
          )}
          {canManage && (
          <Popconfirm
            title="确定要删除该补充协议吗？"
            onConfirm={() => handleDeleteAmendment(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <Card
        title="合同信息"
        extra={
          canManage && (
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={handleCreateContract}
          >
            添加合同
          </Button>
          )
        }
        style={{ marginBottom: 24 }}
      >
        <div style={{ marginBottom: 32 }}>
          <Table
            columns={contractColumns}
            dataSource={contracts || []}
            loading={contractsLoading}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
          />
        </div>

        <div style={{ marginTop: 32 }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 'bold',
              marginBottom: 16,
              paddingBottom: 8,
              borderBottom: '1px solid #e8e8e8',
            }}
          >
            补充协议
          </div>
          <Table
            columns={amendmentColumns}
            dataSource={allAmendments || []}
            loading={amendmentsLoading}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
          />
        </div>
      </Card>

      {/* 合同编辑/创建模态框 */}
      <Modal
        title={editingContract ? '编辑合同' : '新建合同'}
        open={contractModalVisible}
        onCancel={handleContractModalClose}
        footer={null}
        width={800}
        destroyOnHidden
      >
        <ContractForm
          projectId={projectId}
          contractId={editingContract?.id}
          onSuccess={handleContractSuccess}
          onCancel={handleContractModalClose}
        />
      </Modal>

      {/* 补充协议编辑/创建模态框 */}
      <Modal
        title={editingAmendment ? '编辑补充协议' : '新建补充协议'}
        open={amendmentModalVisible}
        onCancel={handleAmendmentModalClose}
        footer={null}
        width={600}
        destroyOnHidden
      >
        {contractId && (
          <ContractAmendmentForm
            projectId={projectId}
            contractId={contractId}
            amendmentId={editingAmendment?.id}
            onSuccess={handleAmendmentSuccess}
            onCancel={handleAmendmentModalClose}
          />
        )}
      </Modal>
    </>
  )
}
