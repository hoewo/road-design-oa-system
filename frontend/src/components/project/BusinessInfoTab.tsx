import { useState } from 'react'
import { Card, Button, Row, Col, Statistic, message } from 'antd'
import { ContractAndAmendments } from '@/components/business/ContractAndAmendments'
import { BusinessBonusList } from '@/components/business/BusinessBonusList'
import { BusinessStatistics } from '@/components/business/BusinessStatistics'
import { BiddingFileList } from '@/components/business/BiddingFileList'
import { BusinessPersonnelList } from '@/components/business/BusinessPersonnelList'
import { PaymentRecordList } from '@/components/business/PaymentRecordList'
import { InvoiceRecordList } from '@/components/business/InvoiceRecordList'
import { ClientSelectModal } from '@/components/business/ClientSelectModal'
import { useQuery } from '@tanstack/react-query'
import { permissionService } from '@/services/permission'
import { projectContactService } from '@/services/projectContact'
import type { ProjectFinancial, ProjectBusiness, ProjectContact } from '@/types'

interface BusinessInfoTabProps {
  projectId: string
  financialData: ProjectFinancial | undefined
  businessData: ProjectBusiness | undefined
}

export const BusinessInfoTab = ({
  projectId,
  financialData,
  businessData,
}: BusinessInfoTabProps) => {
  const [clientSelectModalVisible, setClientSelectModalVisible] =
    useState(false)

  // 检查权限：是否可以管理项目经营信息
  const { data: canManageBusinessInfo } = useQuery({
    queryKey: ['canManageBusinessInfo', projectId],
    queryFn: () => permissionService.canManageBusinessInfo(projectId),
    enabled: !!projectId,
  })

  // Load project contact
  const { data: projectContact } = useQuery({
    queryKey: ['projectContact', projectId],
    queryFn: () => projectContactService.getProjectContact(projectId),
    enabled: !!projectId,
  })

  // Calculate statistics for business tab
  const totalReceivable = financialData?.total_receivable || 0
  const totalPaid = financialData?.total_paid || 0
  const totalUnpaid = financialData?.total_outstanding || 0

  return (
    <>
      {/* 经营信息统计 */}
      <div style={{ marginBottom: 24 }}>
        <BusinessStatistics projectId={projectId} />
      </div>

      {/* 甲方信息 */}
      <Card
        title="甲方信息"
        extra={
          canManageBusinessInfo === true && (
          <Button
            type="link"
            size="small"
            onClick={() => setClientSelectModalVisible(true)}
          >
            选择/创建甲方
          </Button>
          )
        }
        style={{ marginBottom: 24 }}
      >
        <Row gutter={16}>
          <Col span={8}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
                甲方名称
              </div>
              <div
                style={{
                  padding: '10px',
                  border: '2px solid #e0e0e0',
                  background: '#f9f9f9',
                  borderRadius: '4px',
                }}
              >
                {businessData?.client?.client_name || '-'}
              </div>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>联系人</div>
              <div
                style={{
                  padding: '10px',
                  border: '2px solid #e0e0e0',
                  background: '#f9f9f9',
                  borderRadius: '4px',
                }}
              >
                {projectContact?.contact_name ||
                  businessData?.project_contact?.contact_name ||
                  '-'}
              </div>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
                联系电话
              </div>
              <div
                style={{
                  padding: '10px',
                  border: '2px solid #e0e0e0',
                  background: '#f9f9f9',
                  borderRadius: '4px',
                }}
              >
                {projectContact?.contact_phone ||
                  businessData?.project_contact?.contact_phone ||
                  '-'}
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 经营参与人 */}
      <div style={{ marginBottom: 24 }}>
        <BusinessPersonnelList projectId={projectId} />
      </div>

      {/* 招投标信息 */}
      <div style={{ marginBottom: 24 }}>
        <BiddingFileList projectId={projectId} />
      </div>

      {/* 合同信息和补充协议 */}
      <ContractAndAmendments projectId={projectId} />

      {/* 甲方支付记录 */}
      <div style={{ marginBottom: 24 }}>
        <PaymentRecordList projectId={projectId} />
      </div>

      {/* 我方开票记录 */}
      <div style={{ marginBottom: 24 }}>
        <InvoiceRecordList projectId={projectId} />
      </div>

      {/* 经营奖金分配 */}
      <div style={{ marginBottom: 24 }}>
        <BusinessBonusList projectId={projectId} />
      </div>

      {/* 甲方选择模态框（包含联系人管理功能） */}
      <ClientSelectModal
        projectId={projectId}
        open={clientSelectModalVisible}
        onCancel={() => setClientSelectModalVisible(false)}
        onSuccess={() => {
          setClientSelectModalVisible(false)
        }}
      />
    </>
  )
}
