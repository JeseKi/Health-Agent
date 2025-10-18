import { Card, Space, Typography } from 'antd'
import type { ReactNode } from 'react'

interface AuthCardProps {
  /** 卡片标题 */
  title: string
  /** 卡片描述文本 */
  description: string
  /** 卡片内容 */
  children: ReactNode
  /** 底部操作区域（如链接等）*/
  footer?: ReactNode
}

/**
 * 🎨 认证卡片组件
 * 
 * 用于登录/注册页面的统一卡片包装，提供一致的视觉设计
 * 
 * @example
 * ```tsx
 * <AuthCard 
 *   title="欢迎回来" 
 *   description="输入账号信息以访问"
 * >
 *   <Form>{...}</Form>
 * </AuthCard>
 * ```
 */
export default function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <Card
      bordered={false}
      style={{
        width: '100%',
        maxWidth: 420,
        boxShadow: '0 12px 32px rgba(15, 23, 42, 0.1)',
        transition: 'all 0.3s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 16px 48px rgba(249, 115, 22, 0.12)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(15, 23, 42, 0.1)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        {/* 标题区 */}
        <div>
          <Typography.Title level={3} style={{ marginBottom: 8, color: '#1f2937' }}>
            {title} 👋
          </Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 14 }}>
            {description}
          </Typography.Text>
        </div>

        {/* 内容区 */}
        {children}

        {/* 底部区 */}
        {footer && <div>{footer}</div>}
      </Space>
    </Card>
  )
}
