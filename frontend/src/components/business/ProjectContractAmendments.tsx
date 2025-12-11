import { useState } from 'react'
import { Card, Table, Button, Space, message, Modal, Popconfirm } from 'antd'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { businessService } from '@/services/business'
import { ContractAmendmentForm } from '@/components/contract/ContractAmendmentForm'
import type { Contract, ContractAmendment } from '@/types'
import dayjs from 'dayjs'

interface ProjectContractAmendmentsProps {
  projectId: number
}

export const ProjectContractAmendments = ({
  projectId,
}: ProjectContractAmendmentsProps) => {
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editingAmendment, setEditingAmendment] =
    useState<ContractAmendment | null>(null)
  const [contractId, setContractId] = useState<number | undefined>()
  const queryClient = useQueryClient()

  // 获取项目所有合同
  const { data: contracts } = useQuery({
    queryKey: ['contracts', projectId],
    queryFn: () => businessService.getContracts(projectId),
    enabled: !!projectId,
  })

  // 获取所有补充协议
  const { data: allAmendments, isLoading } = useQuery({
    queryKey: ['projectAmendments', projectId],
    queryFn: async () => {
      if (!contracts || contracts.length === 0) return []
      const amendments: (ContractAmendment & { contract_id: number })[] = []
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

  // 删除补充协议
  const deleteMutation = useMutation({
    mutationFn: ({
      projectId,
      contractId,
      amendmentId,
    }: {
      projectId: number
      contractId: number
      amendmentId: number
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

  const handleEdit = (
    amendment: ContractAmendment & { contract_id: number }
  ) => {
    setEditingAmendment(amendment)
    setContractId(amendment.contract_id)
    setEditModalVisible(true)
  }

  const handleDelete = (amendment: ContractAmendment & { contract_id: number }) => {
    deleteMutation.mutate({
      projectId,
      contractId: amendment.contract_id,
      amendmentId: amendment.id,
    })
  }

  const handleModalClose = () => {
    setEditModalVisible(false)
    setEditingAmendment(null)
    setContractId(undefined)
  }

  const handleSuccess = () => {
    setEditModalVisible(false)
    setEditingAmendment(null)
    setContractId(undefined)
    queryClient.invalidateQueries({
      queryKey: ['projectAmendments', projectId],
    })
  }

  // 获取合同信息用于显示
  const getContractInfo = (contractId: number) => {
    const contract = contracts?.find((c) => c.id === contractId)
    return contract
      ? `${contract.contract_number} (${contract.contract_type})`
      : `合同ID: ${contractId}`
  }

  const columns = [
    {
      title: '签订时间',
      dataIndex: 'sign_date',
      key: 'sign_date',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '补充协议金额',
      key: 'amount',
      render: (_: any, record: ContractAmendment) => {
        // 补充协议金额需要从合同信息中获取，这里先显示占位符
        return '-'
      },
    },
    {
      title: '合同费率',
      key: 'rate',
      render: (_: any, record: ContractAmendment & { contract_id: number }) => {
        const contract = contracts?.find((c) => c.id === record.contract_id)
        return contract?.contract_rate
          ? `${(contract.contract_rate * 100).toFixed(0)}%`
          : '-'
      },
    },
    {
      title: '协议文件',
      dataIndex: 'file_path',
      key: 'file_path',
      render: (path: string) => (
        <a href={path} target="_blank" rel="noopener noreferrer">
          {path.split('/').pop() || path}
        </a>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: ContractAmendment & { contract_id: number }) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除该补充协议吗？"
            onConfirm={() => handleDelete(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <Card title="补充协议">
        <Table
          columns={columns}
          dataSource={allAmendments || []}
          loading={isLoading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      <Modal
        title="编辑补充协议"
        open={editModalVisible}
        onCancel={handleModalClose}
        footer={null}
        width={600}
        destroyOnHidden
      >
        {contractId && (
          <ContractAmendmentForm
            projectId={projectId}
            contractId={contractId}
            amendmentId={editingAmendment?.id}
            onSuccess={handleSuccess}
            onCancel={handleModalClose}
          />
        )}
      </Modal>
    </>
  )
}
