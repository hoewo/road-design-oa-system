import { useState } from 'react'
import { Timeline, Button, Modal, Space, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { productionService } from '@/services/production'
import { ProductionAuditForm } from './ProductionAuditForm'
import type { ProductionApprovalRecord } from '@/types'
import dayjs from 'dayjs'

interface ProductionApprovalTimelineProps {
  projectId: number
}

export const ProductionApprovalTimeline = ({
  projectId,
}: ProductionApprovalTimelineProps) => {
  const [modalVisible, setModalVisible] = useState(false)

  const { data, refetch } = useQuery({
    queryKey: ['productionApprovals', projectId],
    queryFn: () => productionService.listApprovals(projectId),
    enabled: !!projectId,
  })

  const handleSuccess = () => {
    setModalVisible(false)
    refetch()
  }

  const records = data?.data || []

  const timelineItems = records.map((record: ProductionApprovalRecord) => ({
    color: record.status === 'completed' ? 'green' : 'blue',
    children: (
      <div>
        <Space>
          <Tag color={record.record_type === 'review' ? 'blue' : 'green'}>
            {record.record_type === 'review' ? '审核' : '审定'}
          </Tag>
          <span>
            {record.approver?.real_name} - {record.status}
          </span>
          {record.signed_at && (
            <span style={{ color: '#999' }}>
              {dayjs(record.signed_at).format('YYYY-MM-DD')}
            </span>
          )}
        </Space>
        {record.remarks && (
          <div style={{ marginTop: 8, color: '#666' }}>{record.remarks}</div>
        )}
        {record.audit_resolution && (
          <div style={{ marginTop: 8 }}>
            <Tag>
              设计费: {record.audit_resolution.amount_design} | 勘察费:{' '}
              {record.audit_resolution.amount_survey} | 咨询费:{' '}
              {record.audit_resolution.amount_consultation}
            </Tag>
          </div>
        )}
      </div>
    ),
  }))

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalVisible(true)}
        >
          新建审核/审定记录
        </Button>
      </Space>

      <Timeline items={timelineItems} />

      <Modal
        title="新建审核/审定记录"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        <ProductionAuditForm projectId={projectId} onSuccess={handleSuccess} />
      </Modal>
    </>
  )
}
