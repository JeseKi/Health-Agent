import { Button, Space, Typography } from 'antd'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  /** 表情符号 */
  emoji?: string
  /** 标题 */
  title?: string
  /** 描述文本 */
  description: string
  /** 操作按钮 */
  action?: {
    text: string
    onClick: () => void
    icon?: ReactNode
  }
  /** 最小高度 */
  minHeight?: number
}

/**
 * 🎨 生动的空态状态组件
 * 
 * 用于统一显示空态的页面
 */
export default function EmptyState({
  emoji = '📭',
  title,
  description,
  action,
  minHeight = 240,
}: EmptyStateProps) {
  return (
    <div
      style={{
        minHeight: `${minHeight}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
      }}
    >
      <Space direction="vertical" size={16} align="center" style={{ textAlign: 'center', width: '100%' }}>
        {/* 表情符号 */}
        <div style={{ fontSize: 48 }}>{emoji}</div>

        {/* 标题 */}
        {title && (
          <Typography.Title level={4} style={{ marginBottom: 0, color: '#1f2937' }}>
            {title}
          </Typography.Title>
        )}

        {/* 描述 */}
        <Typography.Text type="secondary">{description}</Typography.Text>

        {/* 操作按钮 */}
        {action && (
          <Button
            type="primary"
            icon={action.icon}
            onClick={action.onClick}
            style={{ marginTop: 8 }}
          >
            {action.text}
          </Button>
        )}
      </Space>
    </div>
  )
}
