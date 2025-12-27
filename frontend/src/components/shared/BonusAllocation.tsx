import { useState } from 'react'
import { Card, Button, Modal } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { permissionService } from '@/services/permission'
import { BonusAllocationForm } from './BonusAllocationForm'
import { BonusAllocationList } from './BonusAllocationList'
import { BonusAllocationStatistics } from './BonusAllocationStatistics'
import type { FinancialRecord } from '@/types'

interface BonusAllocationProps {
  projectId: string
  bonusType: 'business' | 'production'
  showStatistics?: boolean
  onRefresh?: () => void
}

/**
 * 可复用的奖金分配主组件
 * 整合表单、统计、列表，支持bonusType参数：business/production
 * T499: 创建可复用的奖金分配主组件
 */
export const BonusAllocation = ({
  projectId,
  bonusType,
  showStatistics = false,
  onRefresh,
}: BonusAllocationProps) => {
  const [modalVisible, setModalVisible] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(
    null
  )

  // Check permission based on bonus type
  const permissionKey =
    bonusType === 'business' ? 'canManageBusinessInfo' : 'canManageProductionInfo'
  const permissionFn =
    bonusType === 'business'
      ? permissionService.canManageBusinessInfo
      : permissionService.canManageProductionInfo

  const { data: canManage } = useQuery({
    queryKey: [permissionKey, projectId],
    queryFn: () => permissionFn(projectId),
    enabled: !!projectId,
  })

  const handleCreate = () => {
    setEditingRecord(null)
    setModalVisible(true)
  }

  const handleEdit = (record: FinancialRecord) => {
    setEditingRecord(record)
    setEditModalVisible(true)
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
    onRefresh?.()
  }

  const handleEditSuccess = () => {
    setEditModalVisible(false)
    setEditingRecord(null)
    onRefresh?.()
  }

  const title = bonusType === 'business' ? '经营奖金分配' : '生产奖金分配'

  return (
    <>
      <Card
        title={title}
        extra={
          canManage && (
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={handleCreate}
            >
              分配奖金
            </Button>
          )
        }
      >
        {/* 统计信息（showStatistics=true时显示） */}
        {showStatistics && (
          <BonusAllocationStatistics projectId={projectId} bonusType={bonusType} />
        )}

        {/* 列表 */}
        <BonusAllocationList
          projectId={projectId}
          bonusType={bonusType}
          canManage={canManage || false}
          onEdit={handleEdit}
        />
      </Card>

      {/* 添加模态框 */}
      <Modal
        title={`分配${bonusType === 'business' ? '经营' : '生产'}奖金`}
        open={modalVisible}
        onCancel={handleModalClose}
        footer={null}
        width={800}
        destroyOnClose
      >
        <BonusAllocationForm
          projectId={projectId}
          bonusType={bonusType}
          onSuccess={handleSuccess}
          onCancel={handleModalClose}
        />
      </Modal>

      {/* 编辑模态框 */}
      <Modal
        title={`编辑${bonusType === 'business' ? '经营' : '生产'}奖金`}
        open={editModalVisible}
        onCancel={handleEditModalClose}
        footer={null}
        width={800}
        destroyOnClose
      >
        {editingRecord && (
          <BonusAllocationForm
            projectId={projectId}
            bonusType={bonusType}
            recordId={editingRecord.id}
            onSuccess={handleEditSuccess}
            onCancel={handleEditModalClose}
          />
        )}
      </Modal>
    </>
  )
}

