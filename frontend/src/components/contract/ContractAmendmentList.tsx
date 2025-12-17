import { useState } from 'react'
import { Table, Button, Space, message, Modal, Popconfirm } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { businessService } from '@/services/business'
import { permissionService } from '@/services/permission'
import { ContractAmendmentForm } from './ContractAmendmentForm'
import type { ContractAmendment } from '@/types'
import dayjs from 'dayjs'

interface ContractAmendmentListProps {
  projectId: string
  contractId: string
}

export const ContractAmendmentList = ({
  projectId,
  contractId,
}: ContractAmendmentListProps) => {
  const [modalVisible, setModalVisible] = useState(false)
  const [editingAmendment, setEditingAmendment] =
    useState<ContractAmendment | null>(null)
  const queryClient = useQueryClient()

  // Check permission
  const { data: canManage } = useQuery({
    queryKey: ['canManageBusinessInfo', projectId],
    queryFn: () => permissionService.canManageBusinessInfo(projectId),
    enabled: !!projectId,
  })

  const { data: amendments, isLoading } = useQuery({
    queryKey: ['contractAmendments', projectId, contractId],
    queryFn: () => businessService.getContractAmendments(projectId, contractId),
    enabled: !!projectId && !!contractId,
  })

  const deleteMutation = useMutation({
    mutationFn: (amendmentId: string) =>
      businessService.deleteContractAmendment(projectId, contractId, amendmentId),
    onSuccess: () => {
      message.success('补充协议删除成功')
      queryClient.invalidateQueries({
        queryKey: ['contractAmendments', contractId],
      })
    },
    onError: (error: any) => {
      message.error(error.message || '删除失败')
    },
  })

  const handleCreate = () => {
    setEditingAmendment(null)
    setModalVisible(true)
  }

  const handleEdit = (amendment: ContractAmendment) => {
    setEditingAmendment(amendment)
    setModalVisible(true)
  }

  const handleDelete = (amendment: ContractAmendment) => {
        deleteMutation.mutate(amendment.id)
  }

  const handleModalClose = () => {
    setModalVisible(false)
    setEditingAmendment(null)
  }

  const handleSuccess = () => {
    setModalVisible(false)
    setEditingAmendment(null)
  }

  const columns = [
    {
      title: '补充协议编号',
      dataIndex: 'amendment_number',
      key: 'amendment_number',
    },
    {
      title: '签订日期',
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
      title: '金额明细',
      key: 'fee_breakdown',
      render: (_: any, record: ContractAmendment) => (
        <Space direction="vertical" size="small">
          {record.design_fee > 0 && (
            <span>设计费: ¥{record.design_fee.toLocaleString()}</span>
          )}
          {record.survey_fee > 0 && (
            <span>勘察费: ¥{record.survey_fee.toLocaleString()}</span>
          )}
          {record.consultation_fee > 0 && (
            <span>咨询费: ¥{record.consultation_fee.toLocaleString()}</span>
          )}
        </Space>
      ),
    },
    {
      title: '协议文件',
      key: 'amendment_file',
      render: (_: any, record: ContractAmendment) => {
        return record.amendment_file ? (
          <a
            href={`/user/files/${record.amendment_file.id}/download`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {record.amendment_file.original_name || '查看文件'}
          </a>
        ) : (
          '-'
        )
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: ContractAmendment) => (
        <Space>
          {canManage && (
            <>
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
            </>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        {canManage && (
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新建补充协议
        </Button>
        )}
      </Space>

      <Table
        columns={columns}
        dataSource={amendments || []}
        loading={isLoading}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />

      <Modal
        title={editingAmendment ? '编辑补充协议' : '新建补充协议'}
        open={modalVisible}
        onCancel={handleModalClose}
        footer={null}
        width={600}
        destroyOnHidden
      >
        <ContractAmendmentForm
          projectId={projectId}
          contractId={contractId}
          amendmentId={editingAmendment?.id}
          onSuccess={handleSuccess}
          onCancel={handleModalClose}
        />
      </Modal>
    </>
  )
}
