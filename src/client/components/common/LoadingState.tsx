import { Flex, Spin, Typography } from 'antd'

interface LoadingStateProps {
  /** 加载提示文本 */
  message?: string
  /** 加载大小，默认 large */
  size?: 'small' | 'default' | 'large'
  /** 最小高度，默认 200px */
  minHeight?: number
}

/**
 * ✨ 美化的加载状态组件
 * 
 * 用于统一显示加载中的状态
 */
export default function LoadingState({ message = '加载中...', size = 'large', minHeight = 200 }: LoadingStateProps) {
  return (
    <Flex
      align="center"
      justify="center"
      style={{
        minHeight: `${minHeight}px`,
        animation: 'fadeIn 0.3s ease-in-out',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <Spin tip={message} size={size} />
        <Typography.Text type="secondary" style={{ display: 'block', marginTop: 16, fontSize: 12 }}>
          🚀 {message}
        </Typography.Text>
      </div>
    </Flex>
  )
}
