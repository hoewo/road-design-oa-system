import { Modal } from 'antd'
import type { ExternalCommission } from '@/types'
import dayjs from 'dayjs'

interface ExternalCommissionDeleteConfirmProps {
  visible: boolean
  commission: ExternalCommission | null
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export const ExternalCommissionDeleteConfirm = ({
  visible,
  commission,
  onConfirm,
  onCancel,
  loading = false,
}: ExternalCommissionDeleteConfirmProps) => {
  if (!commission) return null

  return (
    <Modal
      title="确认删除"
      open={visible}
      onOk={onConfirm}
      onCancel={onCancel}
      confirmLoading={loading}
      okText="确认删除"
      cancelText="取消"
      okButtonProps={{ danger: true }}
    >
      <p style={{ marginBottom: 15 }}>确定要删除这条对外委托记录吗？</p>
      <div
        style={{
          background: '#f9f9f9',
          padding: 15,
          borderRadius: 4,
          marginBottom: 15,
        }}
      >
        <div>
          <strong>委托类型:</strong>{' '}
          {commission.vendor_type === 'company' ? '单位' : '个人'}
        </div>
        <div>
          <strong>委托方:</strong> {commission.vendor_name}
        </div>
        {commission.score && (
          <div>
            <strong>评分:</strong> {commission.score}分
          </div>
        )}
        <div>
          <strong>创建时间:</strong>{' '}
          {dayjs(commission.created_at).format('YYYY-MM-DD')}
        </div>
      </div>
      <p style={{ color: '#999', fontSize: 14 }}>
        此操作不可恢复，请谨慎操作。
      </p>
    </Modal>
  )
}

