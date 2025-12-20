import { useState } from 'react'
import { Card, Table, Button, Space, message, Modal, Popconfirm } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { businessService } from '@/services/business'
import { permissionService } from '@/services/permission'
import { fileService } from '@/services/file'
import { OurInvoiceForm } from './OurInvoiceForm'
import type { FinancialRecord } from '@/types'
import dayjs from 'dayjs'

interface InvoiceRecordListProps {
  projectId: string
}

export const InvoiceRecordList = ({ projectId }: InvoiceRecordListProps) => {
  const [modalVisible, setModalVisible] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(
    null
  )
  const queryClient = useQueryClient()

  // Check permission
  const { data: canManage } = useQuery({
    queryKey: ['canManageBusinessInfo', projectId],
    queryFn: () => permissionService.canManageBusinessInfo(projectId),
    enabled: !!projectId,
  })

  const { data: financial, isLoading } = useQuery({
    queryKey: ['projectFinancial', projectId],
    queryFn: () => businessService.getProjectFinancial(projectId),
    enabled: !!projectId,
  })

  // 过滤出开票记录（financial_type 为 'our_invoice'）
  const invoiceRecords =
    financial?.financial_records?.filter(
      (r) => r.financial_type === 'our_invoice'
    ) || []

  const deleteMutation = useMutation({
    mutationFn: (recordId: string) =>
      businessService.deleteFinancialRecord(projectId, recordId),
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

  const handleDelete = (recordId: string) => {
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

  const handleDownloadFile = async (fileId: string, fileName: string) => {
    try {
      await fileService.downloadFile(fileId, fileName)
      message.success(`正在下载 ${fileName}`)
    } catch (error: any) {
      message.error(error.message || '下载失败')
    }
  }

  const columns = [
    {
      title: '开票时间',
      dataIndex: 'occurred_at',
      key: 'occurred_at',
      render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
    },
    {
      title: '开票金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `¥${amount.toLocaleString()}`,
    },
    {
      title: '甲方',
      key: 'client',
      render: (_: any, record: FinancialRecord) =>
        record.client ? record.client.client_name : '-',
    },
    {
      title: '发票文件',
      key: 'invoice_file',
      render: (_: any, record: FinancialRecord) => {
        if (record.invoice_file) {
          return (
            <Button
              type="link"
              icon={<DownloadOutlined />}
              onClick={() =>
                handleDownloadFile(
                  record.invoice_file!.id,
                  record.invoice_file!.original_name || '发票文件'
                )
              }
            >
              {record.invoice_file.original_name || '下载文件'}
            </Button>
          )
        }
        return '-'
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: FinancialRecord) => (
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
            title="确定要删除这条开票记录吗？"
            onConfirm={() => handleDelete(record.id)}
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
      <Card
        title="我方开票记录"
        extra={
          canManage && (
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            添加开票记录
          </Button>
          )
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
        <OurInvoiceForm
          projectId={projectId}
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
          <OurInvoiceForm
            projectId={projectId}
            recordId={editingRecord.id}
            onSuccess={handleEditSuccess}
            onCancel={handleEditModalClose}
          />
        )}
      </Modal>
    </>
  )
}
