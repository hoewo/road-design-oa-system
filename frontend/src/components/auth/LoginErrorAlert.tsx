import { Alert } from 'antd'

export type LoginErrorType =
  | 'verification_send_failed'
  | 'verification_invalid'
  | 'account_not_found'
  | 'network_error'
  | 'unknown'

interface LoginErrorAlertProps {
  errorType: LoginErrorType | null
  errorMessage?: string
  onClose?: () => void
}

/**
 * 错误提示组件
 * 显示验证码发送失败、验证码错误、账号不存在、网络错误等错误信息
 */
export const LoginErrorAlert: React.FC<LoginErrorAlertProps> = ({
  errorType,
  errorMessage,
  onClose,
}) => {
  if (!errorType) {
    return null
  }

  const getErrorConfig = () => {
    switch (errorType) {
      case 'verification_send_failed':
        return {
          message: '验证码发送失败',
          description: '请检查邮箱/手机号是否正确，或稍后重试',
        }
      case 'verification_invalid':
        return {
          message: '验证码错误或已过期',
          description: '请重新输入验证码或重新获取',
        }
      case 'account_not_found':
        return {
          message: '账号不存在',
          description: '请联系管理员创建账号',
        }
      case 'network_error':
        return {
          message: '网络连接失败',
          description: '请检查网络连接后重试',
        }
      default:
        return {
          message: errorMessage || '操作失败',
          description: '请稍后重试',
        }
    }
  }

  const config = getErrorConfig()

  return (
    <Alert
      message={config.message}
      description={config.description}
      type="error"
      showIcon
      closable
      onClose={onClose}
      style={{ marginBottom: 16 }}
    />
  )
}

