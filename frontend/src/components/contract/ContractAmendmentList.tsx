import { useState } from 'react'
import { Table, Button, Space, message, Modal } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { businessService } from '@/services/business'
import { ContractAmendmentForm } from './ContractAmendmentForm'
import type { ContractAmendment } from '@/types'
import dayjs from 'dayjs'

interface ContractAmendmentListProps {
  contractId: number
}

export const ContractAmendmentList = ({
  contractId,
}: ContractAmendmentListProps) => {
  const [modalVisible, setModalVisible] = useState(false)
  const [editingAmendment, setEditingAmendment] =
    useState<ContractAmendment | null>(null)
  const queryClient = useQueryClient()

  const { data: amendments, isLoading } = useQuery({
    queryKey: ['contractAmendments', contractId],
    queryFn: () => businessService.getContractAmendments(contractId),
    enabled: !!contractId,
  })

  const deleteMutation = useMutation({
    mutationFn: (amendmentId: number) =>
      businessService.deleteContractAmendment(amendmentId),
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
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除补充协议 ${amendment.amendment_number} 吗？`,
      onOk: () => {
        deleteMutation.mutate(amendment.id)
      },
    })
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
      title: '文件路径',
      dataIndex: 'file_path',
      key: 'file_path',
    },
    {
      title: '备注',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: ContractAmendment) => (
        <Space>
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
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新建补充协议
        </Button>
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
          contractId={contractId}
          amendmentId={editingAmendment?.id}
          onSuccess={handleSuccess}
          onCancel={handleModalClose}
        />
      </Modal>
    </>
  )
}
