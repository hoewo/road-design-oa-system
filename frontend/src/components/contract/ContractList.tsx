import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Button, Space, message, Tag, Modal } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { businessService } from '@/services/business'
import { ContractForm } from './ContractForm'
import type { Contract } from '@/types'
import dayjs from 'dayjs'

interface ContractListProps {
  projectId: number
}

export const ContractList = ({ projectId }: ContractListProps) => {
  const navigate = useNavigate()
  const [modalVisible, setModalVisible] = useState(false)
  const [editingContract, setEditingContract] = useState<Contract | null>(null)
  const queryClient = useQueryClient()

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['contracts', projectId],
    queryFn: () => businessService.getContracts(projectId),
    enabled: !!projectId,
  })

  const deleteMutation = useMutation({
    mutationFn: (contractId: number) =>
      businessService.deleteContract(contractId),
    onSuccess: () => {
      message.success('合同删除成功')
      queryClient.invalidateQueries({ queryKey: ['contracts', projectId] })
    },
    onError: (error: any) => {
      message.error(error.message || '删除失败')
    },
  })

  const handleCreate = () => {
    setEditingContract(null)
    setModalVisible(true)
  }

  const handleView = (contract: Contract) => {
    navigate(`/contracts/${contract.id}`)
  }

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract)
    setModalVisible(true)
  }

  const handleDelete = (contract: Contract) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除合同 ${contract.contract_number} 吗？`,
      onOk: () => {
        deleteMutation.mutate(contract.id)
      },
    })
  }

  const handleModalClose = () => {
    setModalVisible(false)
    setEditingContract(null)
  }

  const handleSuccess = () => {
    setModalVisible(false)
    setEditingContract(null)
  }

  const columns = [
    {
      title: '合同编号',
      dataIndex: 'contract_number',
      key: 'contract_number',
    },
    {
      title: '合同类型',
      dataIndex: 'contract_type',
      key: 'contract_type',
    },
    {
      title: '签订日期',
      dataIndex: 'sign_date',
      key: 'sign_date',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '合同金额',
      dataIndex: 'contract_amount',
      key: 'contract_amount',
      render: (amount: number) => `¥${amount.toLocaleString()}`,
    },
    {
      title: '费用明细',
      key: 'fee_breakdown',
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
      title: '操作',
      key: 'action',
      render: (_: any, record: Contract) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            查看
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          新建合同
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={contracts || []}
        loading={isLoading}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />

      <Modal
        title={editingContract ? '编辑合同' : '新建合同'}
        open={modalVisible}
        onCancel={handleModalClose}
        footer={null}
        width={800}
        destroyOnHidden
      >
        <ContractForm
          projectId={projectId}
          contractId={editingContract?.id}
          onSuccess={handleSuccess}
          onCancel={handleModalClose}
        />
      </Modal>
    </>
  )
}
