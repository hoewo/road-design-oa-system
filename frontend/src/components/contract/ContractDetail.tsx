import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Card, Descriptions, Tag, Divider, Tabs } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { businessService } from '@/services/business'
import { ContractAmendmentList } from './ContractAmendmentList'
import { ContractFileUpload } from './ContractFileUpload'
import { ContractFileList } from './ContractFileList'
import dayjs from 'dayjs'

const ContractDetail = () => {
  const { id } = useParams<{ id: string }>()
  const contractId = Number(id)

  const { data: contract, isLoading } = useQuery({
    queryKey: ['contract', contractId],
    queryFn: () => businessService.getContract(contractId),
    enabled: !!contractId,
  })

  if (isLoading) {
    return <div>加载中...</div>
  }

  if (!contract) {
    return <div>合同不存在</div>
  }

  return (
    <>
      <Card title="合同详情" loading={isLoading}>
        <Descriptions column={2} bordered>
          <Descriptions.Item label="合同编号">
            {contract.contract_number}
          </Descriptions.Item>
          <Descriptions.Item label="合同类型">
            {contract.contract_type}
          </Descriptions.Item>
          <Descriptions.Item label="签订日期">
            {dayjs(contract.sign_date).format('YYYY-MM-DD')}
          </Descriptions.Item>
          <Descriptions.Item label="合同费率">
            {contract.contract_rate ? `${contract.contract_rate}%` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="合同金额">
            ¥{contract.contract_amount.toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label="文件路径">
            {contract.file_path || '-'}
          </Descriptions.Item>
        </Descriptions>

        <Divider>费用明细</Divider>
        <Descriptions column={3} bordered>
          <Descriptions.Item label="设计费">
            ¥{(contract.design_fee || 0).toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label="勘察费">
            ¥{(contract.survey_fee || 0).toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label="咨询费">
            ¥{(contract.consultation_fee || 0).toLocaleString()}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="补充协议" style={{ marginTop: 16 }}>
        <ContractAmendmentList contractId={contractId} />
      </Card>

      <Card title="合同文件管理" style={{ marginTop: 16 }}>
        <Tabs
          items={[
            {
              key: 'list',
              label: '文件列表',
              children: (
                <ContractFileList
                  projectId={contract.project_id}
                  contractId={contractId}
                />
              ),
            },
            {
              key: 'upload',
              label: '上传文件',
              children: (
                <ContractFileUpload
                  contractId={contractId}
                  onSuccess={() => {
                    // Refresh file list
                  }}
                />
              ),
            },
          ]}
        />
      </Card>
    </>
  )
}

export default ContractDetail
