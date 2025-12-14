import { useState } from 'react'
import { Card, Button, Row, Col, Statistic, message } from 'antd'
import { ContractAndAmendments } from '@/components/business/ContractAndAmendments'
import { BonusList } from '@/components/financial/BonusList'
import { BiddingFileList } from '@/components/business/BiddingFileList'
import { BusinessPersonnelList } from '@/components/business/BusinessPersonnelList'
import { PaymentRecordList } from '@/components/business/PaymentRecordList'
import { InvoiceRecordList } from '@/components/business/InvoiceRecordList'
import { ClientSelectModal } from '@/components/business/ClientSelectModal'
import { ProjectContactForm } from '@/components/business/ProjectContactForm'
import { useQuery } from '@tanstack/react-query'
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
  const [contactFormVisible, setContactFormVisible] = useState(false)

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
      {/* 经营统计 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="总应收金额"
              value={totalReceivable}
              prefix="¥"
              precision={2}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="已收金额"
              value={totalPaid}
              prefix="¥"
              precision={2}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="未收金额"
              value={totalUnpaid}
              prefix="¥"
              precision={2}
              valueStyle={{ color: totalUnpaid > 0 ? '#ff4d4f' : '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 甲方信息 */}
      <Card
        title="甲方信息"
        extra={
          <Button
            type="link"
            size="small"
            onClick={() => setClientSelectModalVisible(true)}
          >
            选择/创建甲方
          </Button>
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
                  businessData?.contact_name ||
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
                  businessData?.contact_phone ||
                  '-'}
              </div>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: 16 }}>
              <Button
                type="link"
                size="small"
                onClick={() => setContactFormVisible(true)}
              >
                管理联系人
              </Button>
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
        <Card
          title="经营奖金分配"
          extra={
            <Button
              type="link"
              size="small"
              onClick={() => {
                // 可以打开一个模态框来添加奖金
                message.info('请使用下方的奖金列表来添加经营奖金')
              }}
            >
              分配奖金
            </Button>
          }
        >
          <BonusList projectId={projectId} bonusType="business" />
        </Card>
      </div>

      {/* 甲方选择模态框 */}
      <ClientSelectModal
        projectId={projectId}
        open={clientSelectModalVisible}
        onCancel={() => setClientSelectModalVisible(false)}
        onSuccess={() => {
          setClientSelectModalVisible(false)
        }}
      />

      {/* 项目联系人表单 */}
      <ProjectContactForm
        projectId={projectId}
        open={contactFormVisible}
        onCancel={() => setContactFormVisible(false)}
        onSuccess={() => {
          setContactFormVisible(false)
        }}
        initialData={projectContact || undefined}
      />
    </>
  )
}
