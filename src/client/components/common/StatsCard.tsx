import { Card, Space, Typography } from 'antd'

interface StatsCardProps {
  /** 表情图标 */
  emoji?: string
  /** 标签文本 */
  label: string
  /** 数值展示 */
  value: string | number
  /** 提示文本 */
  tip?: string
  /** 自定义样式 */
  color?: 'orange' | 'green' | 'blue' | 'red' | 'purple'
}

/**
 * 📊 数据统计卡片组件
 * 
 * 用于健康数据等指标的展示
 */
export default function StatsCard({ emoji = '💪', label, value, tip, color = 'orange' }: StatsCardProps) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    orange: { bg: '#fff7ed', text: '#b45309', border: '#fed7aa' },
    green: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
    blue: { bg: '#eff6ff', text: '#0c2d6b', border: '#bfdbfe' },
    red: { bg: '#fef2f2', text: '#7f1d1d', border: '#fecaca' },
    purple: { bg: '#faf5ff', text: '#6b21a8', border: '#e9d5ff' },
  }

  const style = colorMap[color]

  return (
    <Card
      className="w-[calc(50%-6px)] min-w-[160px]"
      bodyStyle={{ padding: 16 }}
      style={{
        backgroundColor: style.bg,
        border: `1.5px solid ${style.border}`,
        borderRadius: 12,
        transition: 'all 0.3s ease',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.1)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)'
      }}
    >
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        {/* 顶部 - 表情 + 标签 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography.Text type="secondary" style={{ fontSize: 12, color: style.text }}>
            {label}
          </Typography.Text>
          <span style={{ fontSize: 16 }}>{emoji}</span>
        </div>

        {/* 中间 - 数值 */}
        <Typography.Title level={3} style={{ marginTop: 8, marginBottom: 4, color: style.text }}>
          {value}
        </Typography.Title>

        {/* 底部 - 提示 */}
        {tip && (
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 11, lineHeight: 1.4 }}>
            💡 {tip}
          </Typography.Paragraph>
        )}
      </Space>
    </Card>
  )
}
