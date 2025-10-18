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
  MailOutlined,
  UserAddOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import AuthCard from '../../components/auth/AuthCard'

function resolveErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const payload = error.response?.data as { detail?: string; message?: string } | undefined
    return payload?.detail ?? payload?.message ?? '注册失败，请稍后再试。'
  }
  if (error instanceof Error) {
    return error.message
  }
  return '注册失败，请稍后再试。'
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register, loading, isAuthenticated } = useAuth()
  const { message } = App.useApp()

  const [form] = Form.useForm<{ username: string; email: string; password: string }>()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, loading, navigate])

  const handleSubmit = async (values: { username: string; email: string; password: string }) => {
    setSubmitting(true)
    setError(null)
    setSuccessMessage(null)
    try {
      await register(values)
      setSuccessMessage('✨ 注册成功，请使用新账号登录。')
      message.success('🎉 注册成功！')
      form.resetFields()
    } catch (err) {
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
          <div style={{ fontSize: 48, marginBottom: 16, animation: 'pulse 2s infinite' }}>📝</div>
          <Typography.Text type="secondary">正在加载，请稍候...</Typography.Text>
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
        title="创建新账号"
        description="👋 填写基础信息即可体验健康助手"
      >
        <div style={{ width: '100%' }}>
          {error && (
            <Alert
              type="error"
              showIcon
              message="注册失败"
              description={error}
              style={{ marginBottom: 16 }}
            />
          )}
          {successMessage && (
            <Alert
              type="success"
              showIcon
              message="注册成功"
              description={successMessage}
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
              label="✉️ 邮箱"
              name="email"
              rules={[
                { required: true, message: '请输入邮箱地址 📧' },
                { type: 'email', message: '请输入正确的邮箱格式 ⚠️' },
              ]}
            >
              <Input
                size="large"
                prefix={<MailOutlined />}
                placeholder="输入你的邮箱"
                autoComplete="email"
                allowClear
              />
            </Form.Item>

            <Form.Item
              label="🔑 密码"
              name="password"
              rules={[
                { required: true, message: '请输入密码 🔐' },
                { min: 8, message: '密码至少 8 个字符 ⚠️' },
              ]}
            >
              <Input.Password
                size="large"
                prefix={<LockOutlined />}
                placeholder="输入你的密码"
                autoComplete="new-password"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                icon={<UserAddOutlined />}
                loading={submitting}
                block
                style={{ fontWeight: 600, letterSpacing: '0.5px' }}
              >
                {submitting ? '注册中...' : '📝 注册'}
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
        <Typography.Text type="secondary">已有账号？</Typography.Text>
        <Link to="/login" style={{ color: '#f97316', fontWeight: 600, textDecoration: 'none' }}>
          🔐 返回登录 →
        </Link>
      </div>
    </Flex>
  )
}
