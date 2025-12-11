import { Radio } from 'antd'

export type LoginMethod = 'email' | 'phone'

interface LoginMethodSelectorProps {
  value: LoginMethod
  onChange: (method: LoginMethod) => void
  disabled?: boolean
}

/**
 * 登录方式选择组件
 * 邮箱登录/手机号登录单选按钮组
 */
export const LoginMethodSelector: React.FC<LoginMethodSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <Radio.Group
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={{ width: '100%' }}
    >
      <Radio value="email">邮箱登录</Radio>
      <Radio value="phone">手机号登录</Radio>
    </Radio.Group>
  )
}

