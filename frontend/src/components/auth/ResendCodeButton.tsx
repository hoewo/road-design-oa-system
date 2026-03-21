import { useState, useEffect } from 'react'
import { Button } from 'antd'

interface ResendCodeButtonProps {
  onResend: () => Promise<void>
  countdownSeconds?: number
  disabled?: boolean
}

/**
 * 验证码倒计时组件
 * 60秒倒计时，倒计时结束后可重新发送
 */
export const ResendCodeButton: React.FC<ResendCodeButtonProps> = ({
  onResend,
  countdownSeconds = 60,
  disabled = false,
}) => {
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleResend = async () => {
    if (countdown > 0 || loading) return

    setLoading(true)
    try {
      await onResend()
      setCountdown(countdownSeconds)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="link"
      onClick={handleResend}
      disabled={disabled || countdown > 0 || loading}
      loading={loading}
    >
      {countdown > 0 ? `重新发送验证码 (${countdown}s)` : '重新发送验证码'}
    </Button>
  )
}

