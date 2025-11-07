import { Card, Space, Typography } from 'antd'
import type { AgentChangeItem } from '../../lib/types'

interface ChangeItemCardProps {
  /** 改动项数据 */
  changeItem: AgentChangeItem
}

/**
 * 🛠️ 数据改动卡片组件
 * 
 * 用于展示 AI 助手对数据库字段的改动，每个改动项都有专门的卡片展示
 * 根据不同的字段类型展示不同的图标和样式
 */
export default function ChangeItemCard({ changeItem }: ChangeItemCardProps) {
  // 字段配置映射：字段名 -> { 标签, 图标, 颜色, 单位 }
  const fieldConfig: Record<string, { label: string; emoji: string; color: 'orange' | 'green' | 'blue' | 'red' | 'purple'; unit?: string }> = {
    // 健康指标字段
    weight_kg: { label: '体重', emoji: '⚖️', color: 'orange', unit: 'kg' },
    body_fat_percent: { label: '体脂率', emoji: '🔥', color: 'red', unit: '%' },
    bmi: { label: 'BMI', emoji: '📊', color: 'blue' },
    muscle_percent: { label: '肌肉率', emoji: '💪', color: 'green', unit: '%' },
    water_percent: { label: '水分率', emoji: '💧', color: 'blue', unit: '%' },
    
    // 健康偏好字段
    target_weight_kg: { label: '目标体重', emoji: '🎯', color: 'orange', unit: 'kg' },
    calorie_budget_kcal: { label: '热量预算', emoji: '🔥', color: 'red', unit: 'kcal' },
    dietary_preference: { label: '饮食偏好', emoji: '🍽️', color: 'green' },
    activity_level: { label: '活动水平', emoji: '🏃', color: 'purple' },
    sleep_goal_hours: { label: '睡眠目标', emoji: '😴', color: 'blue', unit: '小时' },
    hydration_goal_liters: { label: '饮水目标', emoji: '💧', color: 'blue', unit: '升' },
  }

  const config = fieldConfig[changeItem.field] || {
    label: changeItem.field,
    emoji: '📝',
    color: 'orange' as const,
  }

  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    orange: { bg: '#fff7ed', text: '#b45309', border: '#fed7aa' },
    green: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
    blue: { bg: '#eff6ff', text: '#0c2d6b', border: '#bfdbfe' },
    red: { bg: '#fef2f2', text: '#7f1d1d', border: '#fecaca' },
    purple: { bg: '#faf5ff', text: '#6b21a8', border: '#e9d5ff' },
  }

  const style = colorMap[config.color]

  // 格式化显示值
  const displayValue = config.unit 
    ? `${changeItem.value} ${config.unit}`
    : changeItem.value

  return (
    <Card
      bodyStyle={{ padding: 12 }}
      style={{
        backgroundColor: style.bg,
        border: `1.5px solid ${style.border}`,
        borderRadius: 10,
        transition: 'all 0.2s ease',
        cursor: 'default',
        marginBottom: 8,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <Space direction="vertical" size={6} style={{ width: '100%' }}>
        {/* 顶部：字段标签和图标 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography.Text strong style={{ fontSize: 13, color: style.text }}>
            {config.emoji} {config.label}
          </Typography.Text>
        </div>

        {/* 中间：新值 */}
        <Typography.Text style={{ fontSize: 16, fontWeight: 600, color: style.text }}>
          {displayValue}
        </Typography.Text>

        {/* 底部：原因说明 */}
        {changeItem.reason && (
          <Typography.Paragraph 
            style={{ 
              marginBottom: 0, 
              fontSize: 11, 
              lineHeight: 1.4,
              color: style.text,
              opacity: 0.8,
            }}
          >
            💡 {changeItem.reason}
          </Typography.Paragraph>
        )}
      </Space>
    </Card>
  )
}

