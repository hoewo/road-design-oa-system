import { Segmented } from 'antd'

export type LoginMethod = 'email' | 'phone'

interface LoginMethodSelectorProps {
  value: LoginMethod
  onChange: (method: LoginMethod) => void
  disabled?: boolean
}

/**
 * 登录方式选择（Ant Design Segmented，与 Pro / 控制台类登录页常见形态一致）
 */
export const LoginMethodSelector: React.FC<LoginMethodSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <Segmented<LoginMethod>
      block
      disabled={disabled}
      value={value}
      onChange={(v) => onChange(v)}
      options={[
        { label: '邮箱登录', value: 'email' },
        { label: '手机号登录', value: 'phone' },
      ]}
    />
  )
}

