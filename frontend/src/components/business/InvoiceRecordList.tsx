import { useState } from 'react'
import { Card, Table, Button, Space, message, Modal, Popconfirm } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { businessService } from '@/services/business'
import { FinancialForm } from '@/components/financial/FinancialForm'
import type { FinancialRecord } from '@/types'
import dayjs from 'dayjs'

interface InvoiceRecordListProps {
  projectId: number
}

export const InvoiceRecordList = ({ projectId }: InvoiceRecordListProps) => {
  const [modalVisible, setModalVisible] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(
    null
  )
  const queryClient = useQueryClient()

  const { data: financial, isLoading } = useQuery({
    queryKey: ['projectFinancial', projectId],
    queryFn: () => businessService.getProjectFinancial(projectId),
    enabled: !!projectId,
  })

  // 过滤出开票记录（record_type 为 'invoice'）
  const invoiceRecords =
    financial?.financial_records?.filter((r) => r.record_type === 'invoice') ||
    []

  const deleteMutation = useMutation({
    mutationFn: (recordId: number) =>
      businessService.deleteFinancialRecord(recordId),
    onSuccess: () => {
      message.success('开票记录删除成功')
      queryClient.invalidateQueries({
        queryKey: ['projectFinancial', projectId],
      })
    },
    onError: (error: any) => {
      message.error(error.message || '删除失败')
    },
  })

  const handleCreate = () => {
    setEditingRecord(null)
    setModalVisible(true)
  }

  const handleEdit = (record: FinancialRecord) => {
    setEditingRecord(record)
    setEditModalVisible(true)
  }

  const handleDelete = (recordId: number) => {
    deleteMutation.mutate(recordId)
  }

  const handleModalClose = () => {
    setModalVisible(false)
    setEditingRecord(null)
  }

  const handleEditModalClose = () => {
    setEditModalVisible(false)
    setEditingRecord(null)
  }

  const handleSuccess = () => {
    setModalVisible(false)
    queryClient.invalidateQueries({ queryKey: ['projectFinancial', projectId] })
  }

  const handleEditSuccess = () => {
    setEditModalVisible(false)
    setEditingRecord(null)
    queryClient.invalidateQueries({ queryKey: ['projectFinancial', projectId] })
  }

  const columns = [
    {
      title: '开票时间',
      dataIndex: 'invoice_date',
      key: 'invoice_date',
      render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
    },
    {
      title: '开票金额',
      dataIndex: 'invoice_amount',
      key: 'invoice_amount',
      render: (amount: number) => `¥${amount.toLocaleString()}`,
    },
    {
      title: '发票文件',
      key: 'invoice_file',
      render: (_: any, record: FinancialRecord) => {
        // 这里可以添加发票文件链接，如果有的话
        // @ts-ignore - invoice_file_path 可能不在类型定义中
        return record.invoice_file_path ? (
          <a
            // @ts-ignore
            href={record.invoice_file_path}
            target="_blank"
            rel="noopener noreferrer"
          >
            查看发票
          </a>
        ) : (
          '-'
        )
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: FinancialRecord) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这条开票记录吗？"
            onConfirm={() => handleDelete(record.id)}
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
      <Card
        title="我方开票记录"
        extra={
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            添加开票记录
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={invoiceRecords}
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
        title="添加开票记录"
        open={modalVisible}
        onCancel={handleModalClose}
        footer={null}
        width={800}
        destroyOnHidden
      >
        <FinancialForm
          projectId={projectId}
          defaultRecordType="invoice"
          onSuccess={handleSuccess}
          onCancel={handleModalClose}
        />
      </Modal>

      <Modal
        title="编辑开票记录"
        open={editModalVisible}
        onCancel={handleEditModalClose}
        footer={null}
        width={800}
        destroyOnHidden
      >
        {editingRecord && (
          <FinancialForm
            projectId={projectId}
            recordId={editingRecord.id}
            defaultRecordType="invoice"
            onSuccess={handleEditSuccess}
            onCancel={handleEditModalClose}
          />
        )}
      </Modal>
    </>
  )
}
