import { Card, Typography, List, Button, Space, Divider, Row, Col } from 'antd'
import { ReloadOutlined, HeartOutlined, AppleOutlined, FireOutlined, DashboardOutlined, BulbOutlined } from '@ant-design/icons'
import type { HealthRecommendation } from '../../lib/types'

interface RecommendationCardProps {
    recommendation: HealthRecommendation
    onRegenerate?: () => void
    isLoading?: boolean
}

/**
 * 🏥 健康建议卡片组件
 *
 * 美观地展示 AI 生成的健康建议，包括摘要、饮食计划、热量管理等各个部分
 */
export default function RecommendationCard({ recommendation, onRegenerate, isLoading }: RecommendationCardProps) {
    const sectionIcons: Record<string, React.ReactNode> = {
        meal_plan: <AppleOutlined style={{ color: '#f97316' }} />,
        calorie_management: <FireOutlined style={{ color: '#ef4444' }} />,
        weight_management: <DashboardOutlined style={{ color: '#10b981' }} />,
        hydration: <span style={{ color: '#3b82f6' }}>💧</span>,
        lifestyle: <BulbOutlined style={{ color: '#f59e0b' }} />,
    }

    const sectionTitles: Record<string, string> = {
        meal_plan: '🍎 饮食建议',
        calorie_management: '🔥 热量管理',
        weight_management: '⚖️ 体重管理',
        hydration: '💧 水分补充',
        lifestyle: '💡 生活方式',
    }

    const sectionColors: Record<string, string> = {
        meal_plan: '#fff7ed',
        calorie_management: '#fef2f2',
        weight_management: '#ecfdf5',
        hydration: '#eff6ff',
        lifestyle: '#fffbeb',
    }

    return (
        <Card
            className="w-full"
            bodyStyle={{ padding: 24 }}
            style={{
                borderRadius: 16,
                boxShadow: '0 4px 20px rgba(249, 115, 22, 0.08)',
                border: '1px solid #fed7aa',
            }}
            title={
                <Space align="center">
                    <HeartOutlined style={{ color: '#f97316', fontSize: 20 }} />
                    <Typography.Title level={4} style={{ margin: 0, color: '#1f2937' }}>
                        个性化健康建议
                    </Typography.Title>
                </Space>
            }
            extra={
                <Button
                    type="primary"
                    icon={<ReloadOutlined />}
                    onClick={onRegenerate}
                    loading={isLoading}
                    style={{
                        backgroundColor: '#f97316',
                        borderColor: '#f97316',
                        borderRadius: 8,
                    }}
                >
                    重新生成
                </Button>
            }
        >
            <Space direction="vertical" size={20} style={{ width: '100%' }}>
                {/* 摘要部分 */}
                <div>
                    <Typography.Title level={5} style={{ color: '#1f2937', marginBottom: 12 }}>
                        📋 健康概览
                    </Typography.Title>
                    <Card
                        size="small"
                        style={{
                            backgroundColor: '#fff7ed',
                            border: '1px solid #fed7aa',
                            borderRadius: 12,
                        }}
                    >
                        <Typography.Paragraph style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
                            {recommendation.summary}
                        </Typography.Paragraph>
                    </Card>
                </div>

                <Divider style={{ margin: '16px 0', borderColor: '#fed7aa' }} />

                {/* 建议详情 */}
                <Row gutter={[16, 16]}>
                    {Object.entries(recommendation)
                        .filter(([key]) => ['meal_plan', 'calorie_management', 'weight_management', 'hydration', 'lifestyle'].includes(key))
                        .map(([key, items]) => (
                            <Col xs={24} sm={24} md={12} lg={12} xl={12} key={key}>
                                <Card
                                    size="small"
                                    title={
                                        <Space>
                                            {sectionIcons[key]}
                                            <Typography.Text strong style={{ fontSize: 14 }}>
                                                {sectionTitles[key]}
                                            </Typography.Text>
                                        </Space>
                                    }
                                    style={{
                                        backgroundColor: sectionColors[key],
                                        border: `1px solid ${sectionColors[key]}33`,
                                        borderRadius: 12,
                                        height: '100%',
                                    }}
                                    bodyStyle={{ padding: 16 }}
                                >
                                    {Array.isArray(items) && items.length > 0 ? (
                                        <List
                                            size="small"
                                            dataSource={items}
                                            renderItem={(item) => (
                                                <List.Item style={{ padding: '4px 0', border: 'none' }}>
                                                    <Typography.Text style={{ fontSize: 13, lineHeight: 1.5 }}>
                                                        • {item}
                                                    </Typography.Text>
                                                </List.Item>
                                            )}
                                        />
                                    ) : (
                                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                            暂无建议
                                        </Typography.Text>
                                    )}
                                </Card>
                            </Col>
                        ))}
                </Row>

                {/* 生成时间 */}
                <div style={{ textAlign: 'right', marginTop: 16 }}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        生成时间：{new Date(recommendation.created_at).toLocaleString('zh-CN')}
                    </Typography.Text>
                </div>
            </Space>
        </Card>
    )
}