import { useState } from 'react'
import {
  Form,
  Input,
  Button,
  Col,
  Grid,
  Row,
  Space,
  Typography,
  message,
  theme,
} from 'antd'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/services/auth'
import { useAuth } from '@/contexts/AuthContext'
import type { VerificationCodeLoginRequest } from '@/types'
import { LoginMethodSelector, type LoginMethod } from '@/components/auth/LoginMethodSelector'
import { VerificationCodeInput } from '@/components/auth/VerificationCodeInput'
import { ResendCodeButton } from '@/components/auth/ResendCodeButton'
import { LoginErrorAlert, type LoginErrorType } from '@/components/auth/LoginErrorAlert'
import { getErrorMessage } from '@/utils/error'

type LoginState =
  | 'initial' // 初始状态：选择登录方式，输入邮箱/手机号
  | 'sending' // 发送验证码中
  | 'code_sent' // 验证码已发送：输入验证码
  | 'logging_in' // 登录中
  | 'success' // 登录成功

/** 公司全称：以 login-page-branding.md §1 为准；法务签批后若变更须同步此处与页面展示 */
const COMPANY_FULL_NAME = '北京京宏勘察设计有限公司'

/** Logo：由组织母版京宏logo.pdf 导出（见 frontend/public/branding/README.md） */
const BRAND_LOGO_SRC = '/branding/jinghong-logo.png'
const BRAND_LOGO_ALT = '北京京宏勘察设计有限公司标识'

const { Title, Text } = Typography

const Login = () => {
  const { token } = theme.useToken()
  const screens = Grid.useBreakpoint()
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
    } catch (error: unknown) {
      setLoginState('initial')
      const errorMsg = getErrorMessage(error, '验证码发送失败')
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
    } catch (error: unknown) {
      setLoginState('code_sent')
      const errorMsg = getErrorMessage(error, '登录失败')
      
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

  /**
   * 品牌侧（道路/工程语境）：偏冷的中性灰阶 + 极弱青灰倾向，接近图纸底色、混凝土/沥青的「矿物感」，
   * 避免偏粉偏杏的居家气质；红 Logo 作为唯一高饱和点更稳。与右侧纯白栏仍靠明度与色温差分层。
   */
  const brandBg = 'linear-gradient(168deg, #f5f7fa 0%, #eceff4 44%, #e3e8f0 100%)'
  const brandTitleColor = 'rgba(28, 31, 38, 0.92)'
  const brandMutedColor = 'rgba(28, 31, 38, 0.5)'

  return (
    <main
      aria-labelledby="login-brand-heading"
      style={{
        margin: 0,
        padding: 0,
        minHeight: '100vh',
        fontFamily: token.fontFamily,
        WebkitFontSmoothing: 'antialiased',
        background: token.colorBgLayout,
      }}
    >
      <Row gutter={0} align="stretch" wrap style={{ minHeight: '100vh' }}>
        <Col
          xs={24}
          lg={10}
          xl={9}
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: `${token.paddingXL * 1.25}px ${token.paddingXL}px`,
            background: brandBg,
            boxSizing: 'border-box',
          }}
        >
          <Space
            direction="vertical"
            size={token.marginLG}
            align="center"
            style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}
          >
            <header>
              <Title
                level={3}
                id="login-brand-heading"
                style={{
                  margin: 0,
                  marginBottom: token.marginXS,
                  color: brandTitleColor,
                  fontSize: token.fontSizeHeading3,
                  lineHeight: token.lineHeightHeading3,
                  fontWeight: token.fontWeightStrong,
                  letterSpacing: '0.02em',
                }}
              >
                {COMPANY_FULL_NAME}
              </Title>
              <Text style={{ display: 'block', fontSize: token.fontSizeSM, color: brandMutedColor }}>
                使用组织账号登录
              </Text>
              <img
                src={BRAND_LOGO_SRC}
                alt={BRAND_LOGO_ALT}
                width={480}
                height={281}
                style={{
                  display: 'block',
                  margin: `${token.marginLG + token.marginXS}px auto 0`,
                  maxWidth: 'min(100%, 208px)',
                  height: 'auto',
                }}
              />
            </header>
          </Space>
        </Col>

        <Col
          xs={24}
          lg={14}
          xl={15}
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: `${token.paddingXL * 1.5}px clamp(${token.paddingLG}px, 6vw, 56px)`,
            background: token.colorBgContainer,
            boxSizing: 'border-box',
            borderLeft: screens.lg ? `1px solid ${token.colorSplit}` : undefined,
            borderTop: screens.lg ? undefined : `1px solid ${token.colorSplit}`,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 392,
              boxSizing: 'border-box',
            }}
          >
            <Title
              level={4}
              style={{
                marginTop: 0,
                marginBottom: token.marginLG,
                paddingBottom: token.paddingMD,
                color: token.colorTextHeading,
                fontWeight: token.fontWeightStrong,
                letterSpacing: '0.04em',
                borderBottom: `1px solid ${token.colorSplit}`,
              }}
            >
              登录
            </Title>

            <Form
              form={form}
              layout="vertical"
              autoComplete="off"
              size="large"
              requiredMark={false}
              colon={false}
              style={{ width: '100%' }}
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
                  <Button type="primary" block onClick={handleSendVerification}>
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
                    <Text
                      type="secondary"
                      style={{ display: 'block', marginTop: token.marginXS, fontSize: token.fontSizeSM }}
                    >
                      验证码已发送到{loginMethod === 'email' ? '邮箱' : '手机号'}
                    </Text>
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
                  <Text
                    style={{
                      display: 'block',
                      textAlign: 'center',
                      fontSize: token.fontSizeLG,
                      color: token.colorSuccess,
                    }}
                  >
                    登录成功，正在跳转…
                  </Text>
                </Form.Item>
              )}
            </Form>

            <div
              style={{
                marginTop: token.marginXL,
                paddingTop: token.marginLG,
              }}
            >
              <Text
                type="secondary"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  fontSize: token.fontSizeSM,
                  lineHeight: token.lineHeightSM,
                }}
              >
                如需账号，请联系系统管理员
              </Text>
              <Text
                type="secondary"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  marginTop: token.marginXXS,
                  fontSize: token.fontSize,
                  color: token.colorTextTertiary,
                }}
              >
                系统不提供公开注册功能
              </Text>
            </div>
          </div>
        </Col>
      </Row>
    </main>
  )
}

export default Login
