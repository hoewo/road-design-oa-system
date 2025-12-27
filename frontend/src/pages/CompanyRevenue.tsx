import { Card, Alert, Spin } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { permissionService } from '@/services/permission'
import { ManagementFeeSetting } from '@/components/financial/ManagementFeeSetting'
import { CompanyRevenueStatistics } from '@/components/financial/CompanyRevenueStatistics'
import { InvoiceSummary } from '@/components/financial/InvoiceSummary'
import { PaymentSummary } from '@/components/financial/PaymentSummary'

/**
 * 公司收入管理页面
 * T268: 更新前端公司收入管理页面
 * T469: 更新前端公司收入管理页面：使用权限服务检查权限（CanManageCompanyRevenue），无权限时拒绝访问并显示提示信息（完全不可访问模式）
 */
const CompanyRevenue = () => {
  // Check permission: CanManageCompanyRevenue
  const { data: canManage, isLoading: permissionLoading } = useQuery({
    queryKey: ['canManageCompanyRevenue'],
    queryFn: () => permissionService.canManageCompanyRevenue(),
  })

  // If permission check is loading
  if (permissionLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="正在检查权限..." />
      </div>
    )
  }

  // If user doesn't have permission, show access denied message
  if (!canManage) {
    return (
      <Card>
        <Alert
          message="权限不足"
          description="您没有权限访问公司收入信息。如需访问，请联系管理员配置相应权限（财务人员或系统管理员）。"
          type="warning"
          showIcon
          style={{ margin: '20px 0' }}
        />
      </Card>
    )
  }

  // User has permission, show the full page
  return (
    <div style={{ padding: '24px' }}>
      {/* 管理费设置 */}
      <div style={{ marginBottom: '24px' }}>
        <ManagementFeeSetting />
      </div>

      {/* 公司收入统计 */}
      <div style={{ marginBottom: '24px' }}>
        <CompanyRevenueStatistics />
      </div>

      {/* 发票信息列表 */}
      <div style={{ marginBottom: '24px' }}>
        <InvoiceSummary />
      </div>

      {/* 支付信息列表 */}
      <div style={{ marginBottom: '24px' }}>
        <PaymentSummary />
      </div>
    </div>
  )
}

export default CompanyRevenue
