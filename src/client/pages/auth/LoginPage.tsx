import { isAxiosError } from 'axios'
import {
  Alert,
  App,
  Button,
  Flex,
  Form,
  Input,
  Typography,
} from 'antd'
import {
  LockOutlined,
  LoginOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import AuthCard from '../../components/auth/AuthCard'

function resolveErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const payload = error.response?.data as { detail?: string; message?: string } | undefined
    return payload?.detail ?? payload?.message ?? '登录失败，请稍后重试。'
  }
  if (error instanceof Error) {
    return error.message
  }
  return '登录失败，请稍后重试。'
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, loading, isAuthenticated } = useAuth()
  const { message } = App.useApp()

  const [form] = Form.useForm<{ username: string; password: string }>()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, loading, navigate])

  const handleSubmit = async (values: { username: string; password: string }) => {
    console.log('【登录页面】提交数据', { 用户名: values.username })
    setSubmitting(true)
    setError(null)
    try {
      await login(values)
      const fromState = location.state as { from?: { pathname?: string } } | undefined
      const redirectPath = fromState?.from?.pathname ?? '/'
      message.success('🎉 欢迎回来！')
      navigate(redirectPath, { replace: true })
    } catch (err) {
      console.error('【登录页面】调用登录接口失败', err)
      const text = resolveErrorMessage(err)
      setError(text)
      message.error(`❌ ${text}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Flex
        align="center"
        justify="center"
        style={{ minHeight: '100vh' }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16, animation: 'pulse 2s infinite' }}>🔐</div>
          <Typography.Text type="secondary">正在验证登录状态...</Typography.Text>
        </div>
      </Flex>
    )
  }

  return (
    <Flex
      align="center"
      justify="center"
      style={{ minHeight: '100vh', padding: '48px 16px', background: 'linear-gradient(135deg, #fafaf9 0%, #fff7ed 100%)' }}
    >
      <AuthCard
        title="欢迎回来"
        description="🚀 输入账号信息以开启你的健康之旅"
      >
        <div style={{ width: '100%' }}>
          {error && (
            <Alert
              type="error"
              showIcon
              message="登录失败"
              description={error}
              style={{ marginBottom: 16 }}
            />
          )}

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            requiredMark={false}
            autoComplete="on"
          >
            <Form.Item
              label="👤 用户名"
              name="username"
              rules={[
                { required: true, message: '请输入用户名 📝' },
                { min: 3, message: '用户名至少 3 个字符 ⚠️' },
              ]}
            >
              <Input
                size="large"
                prefix={<UserOutlined />}
                placeholder="输入你的用户名"
                autoComplete="username"
                allowClear
              />
            </Form.Item>

            <Form.Item
              label="🔑 密码"
              name="password"
              rules={[{ required: true, message: '请输入密码 🔐' }]}
            >
              <Input.Password
                size="large"
                prefix={<LockOutlined />}
                placeholder="输入你的密码"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                icon={<LoginOutlined />}
                loading={submitting}
                block
                style={{ fontWeight: 600, letterSpacing: '0.5px' }}
              >
                {submitting ? '登录中...' : '🚀 登录'}
              </Button>
            </Form.Item>
          </Form>
        </div>
      </AuthCard>

      {/* 底部导航 */}
      <div
        style={{
          position: 'fixed',
          bottom: 32,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <Typography.Text type="secondary">还没有账号？</Typography.Text>
        <Link to="/register" style={{ color: '#f97316', fontWeight: 600, textDecoration: 'none' }}>
          📝 立即注册 →
        </Link>
      </div>
    </Flex>
  )
}
