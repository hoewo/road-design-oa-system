import { useState } from 'react'
import { Form, Input, Button, Card, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/services/auth'
import { useAuth } from '@/contexts/AuthContext'
import type { VerificationCodeLoginRequest } from '@/types'
import { LoginMethodSelector, type LoginMethod } from '@/components/auth/LoginMethodSelector'
import { VerificationCodeInput } from '@/components/auth/VerificationCodeInput'
import { ResendCodeButton } from '@/components/auth/ResendCodeButton'
import { LoginErrorAlert, type LoginErrorType } from '@/components/auth/LoginErrorAlert'

type LoginState =
  | 'initial' // 初始状态：选择登录方式，输入邮箱/手机号
  | 'sending' // 发送验证码中
  | 'code_sent' // 验证码已发送：输入验证码
  | 'logging_in' // 登录中
  | 'success' // 登录成功

const Login = () => {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const { login: updateAuth } = useAuth()

  const [loginMethod, setLoginMethod] = useState<LoginMethod>('email')
  const [loginState, setLoginState] = useState<LoginState>('initial')
  const [verificationCode, setVerificationCode] = useState('')
  const [errorType, setErrorType] = useState<LoginErrorType | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')

  // 验证邮箱格式
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // 验证手机号格式（简单验证：11位数字）
  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^1[3-9]\d{9}$/
    return phoneRegex.test(phone)
  }

  // 发送验证码
  const handleSendVerification = async () => {
    const target = form.getFieldValue(loginMethod === 'email' ? 'email' : 'phone')
    if (!target) {
      message.error(loginMethod === 'email' ? '请输入邮箱' : '请输入手机号')
      return
    }

    // 验证格式
    if (loginMethod === 'email' && !validateEmail(target)) {
      message.error('请输入正确的邮箱格式')
      return
    }
    if (loginMethod === 'phone' && !validatePhone(target)) {
      message.error('请输入正确的手机号格式')
      return
    }

    setLoginState('sending')
    setErrorType(null)
    setErrorMessage('')

    try {
      await authService.sendVerification(target, loginMethod === 'email' ? 'email' : 'sms')
      setLoginState('code_sent')
      message.success('验证码已发送，请查收')
    } catch (error: any) {
      setLoginState('initial')
      const errorMsg = error.message || '验证码发送失败'
      setErrorType('verification_send_failed')
      setErrorMessage(errorMsg)
      message.error(errorMsg)
    }
  }

  // 处理验证码输入完成
  const handleVerificationCodeComplete = (code: string) => {
    setVerificationCode(code)
  }

  // 重新发送验证码
  const handleResendCode = async () => {
    await handleSendVerification()
  }

  // 登录
  const handleLogin = async () => {
    if (verificationCode.length !== 6) {
      message.error('请输入6位验证码')
      return
    }

    const target = form.getFieldValue(loginMethod === 'email' ? 'email' : 'phone')
    if (!target) {
      message.error(loginMethod === 'email' ? '请输入邮箱' : '请输入手机号')
      return
    }

    setLoginState('logging_in')
    setErrorType(null)
    setErrorMessage('')

    try {
      const credentials: VerificationCodeLoginRequest = {
        code: verificationCode,
        code_type: loginMethod === 'email' ? 'email' : 'sms',
        purpose: 'login',
      }

      if (loginMethod === 'email') {
        credentials.email = target
      } else {
        credentials.phone = target
      }

      const loginResponse = await authService.login(credentials)
      
      setLoginState('success')
      message.success('登录成功')
      
      // 更新 AuthContext 中的认证状态，传递用户信息（如果存在）
      // authService.login() 已经触发了 auth-state-change 事件，不需要重复触发
      updateAuth(loginResponse.user)
      
      // 立即导航，updateAuth 会同步更新 isAuthenticated 状态
      navigate('/projects', { replace: true })
    } catch (error: any) {
      setLoginState('code_sent')
      const errorMsg = error.message || '登录失败'
      
      // 根据错误信息判断错误类型
      if (errorMsg.includes('验证码') || errorMsg.includes('code')) {
        setErrorType('verification_invalid')
      } else if (errorMsg.includes('账号') || errorMsg.includes('不存在') || errorMsg.includes('not found')) {
        setErrorType('account_not_found')
      } else if (errorMsg.includes('网络') || errorMsg.includes('network') || errorMsg.includes('连接')) {
        setErrorType('network_error')
      } else {
        setErrorType('unknown')
      }
      
      setErrorMessage(errorMsg)
      message.error(errorMsg)
    }
  }

  // 清除错误提示
  const handleErrorClose = () => {
    setErrorType(null)
    setErrorMessage('')
  }

  // 切换登录方式时清除错误和验证码
  const handleMethodChange = (method: LoginMethod) => {
    setLoginMethod(method)
    setErrorType(null)
    setErrorMessage('')
    setVerificationCode('')
    form.setFieldsValue({
      email: undefined,
      phone: undefined,
    })
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#f0f2f5',
      }}
    >
      <Card
        title="道路设计公司项目管理系统"
        style={{ width: 400 }}
        styles={{ header: { textAlign: 'center', fontSize: '20px', fontWeight: 'bold' } }}
      >
        <Form
          form={form}
          layout="vertical"
          autoComplete="off"
          size="large"
        >
          {/* 错误提示 */}
          <LoginErrorAlert
            errorType={errorType}
            errorMessage={errorMessage}
            onClose={handleErrorClose}
          />

          {/* 登录方式选择 */}
          <Form.Item label="登录方式">
            <LoginMethodSelector
              value={loginMethod}
              onChange={handleMethodChange}
              disabled={loginState === 'sending' || loginState === 'logging_in' || loginState === 'success'}
            />
          </Form.Item>

          {/* 邮箱/手机号输入 */}
          <Form.Item
            label={loginMethod === 'email' ? '邮箱' : '手机号'}
            name={loginMethod === 'email' ? 'email' : 'phone'}
            rules={[
              {
                required: true,
                message: loginMethod === 'email' ? '请输入邮箱' : '请输入手机号',
              },
              {
                validator: (_, value) => {
                  if (!value) {
                    return Promise.resolve()
                  }
                  if (loginMethod === 'email' && !validateEmail(value)) {
                    return Promise.reject('请输入正确的邮箱格式')
                  }
                  if (loginMethod === 'phone' && !validatePhone(value)) {
                    return Promise.reject('请输入正确的手机号格式')
                  }
                  return Promise.resolve()
                },
              },
            ]}
          >
            <Input
              placeholder={loginMethod === 'email' ? '请输入邮箱' : '请输入手机号'}
              disabled={loginState === 'sending' || loginState === 'code_sent' || loginState === 'logging_in' || loginState === 'success'}
            />
          </Form.Item>

          {/* 获取验证码按钮（初始状态） */}
          {loginState === 'initial' && (
            <Form.Item>
              <Button
                type="primary"
                block
                onClick={handleSendVerification}
                loading={false}
              >
                获取验证码
              </Button>
            </Form.Item>
          )}

          {/* 发送验证码中状态 */}
          {loginState === 'sending' && (
            <Form.Item>
              <Button type="primary" block loading disabled>
                发送中...
              </Button>
            </Form.Item>
          )}

          {/* 验证码已发送状态 */}
          {loginState === 'code_sent' && (
            <>
              <Form.Item label="验证码">
                <VerificationCodeInput
                  value={verificationCode}
                  onChange={(value) => setVerificationCode(value)}
                  onComplete={handleVerificationCodeComplete}
                  disabled={['logging_in', 'success'].includes(loginState)}
                  error={errorType === 'verification_invalid'}
                  autoFocus={true}
                />
                <div style={{ marginTop: 8, fontSize: '12px', color: '#999' }}>
                  验证码已发送到{loginMethod === 'email' ? '邮箱' : '手机号'}
                </div>
              </Form.Item>

              <Form.Item>
                <ResendCodeButton
                  onResend={handleResendCode}
                  countdownSeconds={60}
                  disabled={['logging_in', 'success'].includes(loginState)}
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  block
                  onClick={handleLogin}
                  loading={(loginState as LoginState) === 'logging_in'}
                  disabled={verificationCode.length !== 6 || ['success'].includes(loginState)}
                >
                  {(loginState as LoginState) === 'logging_in' ? '登录中...' : '登录'}
                </Button>
              </Form.Item>
            </>
          )}

          {/* 登录中状态 */}
          {loginState === 'logging_in' && (
            <Form.Item>
              <Button type="primary" block loading disabled>
                登录中...
              </Button>
            </Form.Item>
          )}

          {/* 登录成功状态 */}
          {loginState === 'success' && (
            <Form.Item>
              <div style={{ textAlign: 'center', color: '#52c41a', fontSize: '16px' }}>
                ✓ 登录成功，正在跳转...
              </div>
            </Form.Item>
          )}
        </Form>

        <div style={{ marginTop: 16, color: '#999', fontSize: 12, textAlign: 'center' }}>
          <p style={{ marginBottom: 8 }}>如需账号，请联系系统管理员</p>
          <p style={{ fontSize: 11 }}>系统不提供公开注册功能</p>
        </div>
      </Card>
    </div>
  )
}

export default Login
