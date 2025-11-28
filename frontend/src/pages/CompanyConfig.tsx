import { Card, Typography } from 'antd'
import { CompanyConfigForm } from '@/components/financial/CompanyConfigForm'

const { Title } = Typography

const CompanyConfig = () => {
  return (
    <div>
      <Title level={2}>公司配置管理</Title>
      <Card>
        <CompanyConfigForm />
      </Card>
    </div>
  )
}

export default CompanyConfig
