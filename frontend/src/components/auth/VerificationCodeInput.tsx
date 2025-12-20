import { useRef, useEffect } from 'react'
import { Input } from 'antd'

interface VerificationCodeInputProps {
  value?: string
  onChange?: (value: string) => void
  onComplete?: (value: string) => void
  disabled?: boolean
  error?: boolean
  autoFocus?: boolean
}

/**
 * 验证码输入组件
 * 6位数字输入框，自动聚焦，实时验证格式
 */
export const VerificationCodeInput: React.FC<VerificationCodeInputProps> = ({
  value = '',
  onChange,
  onComplete,
  disabled = false,
  error = false,
  autoFocus = true,
}) => {
  const inputRef = useRef<any>(null)

  useEffect(() => {
    if (autoFocus && !disabled && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus, disabled])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value

    // 只允许输入数字
    const numericValue = inputValue.replace(/\D/g, '')

    // 限制长度为6位
    const trimmedValue = numericValue.slice(0, 6)

    onChange?.(trimmedValue)

    // 如果输入完成（6位），触发完成回调
    if (trimmedValue.length === 6) {
      onComplete?.(trimmedValue)
    }
  }

  return (
    <Input
      ref={inputRef}
      value={value}
      onChange={handleChange}
      disabled={disabled}
      maxLength={6}
      placeholder="请输入6位验证码"
      style={{
        fontSize: '18px',
        textAlign: 'center',
        letterSpacing: '8px',
        borderColor: error ? '#ff4d4f' : undefined,
      }}
      status={error ? 'error' : undefined}
    />
  )
}

