import {
  BarChartOutlined,
  BulbOutlined,
  PlusCircleOutlined,
  UserOutlined,
} from '@ant-design/icons'
import {
  App,
  Alert,
  Button,
  Card,
  Flex,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd'
import dayjs from 'dayjs'
import clsx from 'clsx'
import { isAxiosError } from 'axios'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../../hooks/useAuth'
import {
  createMetric,
  fetchLatestMetric,
  fetchMetricHistory,
  fetchPreferences,
  generateNewRecommendation,
  getLatestRecommendation,
  updatePreferences,
} from '../../lib/health'
import type {
  HealthMetric,
  HealthMetricPayload,
  HealthPreference,
  HealthPreferencePayload,
  HealthRecommendation,
} from '../../lib/types'
import LoadingState from '../../components/common/LoadingState'
import EmptyState from '../../components/common/EmptyState'
import StatsCard from '../../components/common/StatsCard'
import RecommendationCard from '../../components/common/RecommendationCard'

type TabKey = 'metrics' | 'suggestions' | 'profile'

function resolveErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const payload = error.response?.data as { detail?: string; message?: string } | undefined
    return payload?.detail ?? payload?.message ?? '请求失败，请稍后重试。'
  }
  if (error instanceof Error) {
    return error.message
  }
  return '请求失败，请稍后重试。'
}

export default function HealthAppPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('metrics')
  const [metricModalOpen, setMetricModalOpen] = useState(false)
  const [latestMetric, setLatestMetric] = useState<HealthMetric | null>(null)
  const [metricHistory, setMetricHistory] = useState<HealthMetric[]>([])
  const [metricLoading, setMetricLoading] = useState(false)


  const [recommendation, setRecommendation] = useState<HealthRecommendation | null>(null)
  const [recommendationLoading, setRecommendationLoading] = useState(false)
  const [recommendationError, setRecommendationError] = useState<string | null>(null)

  const [preferences, setPreferences] = useState<HealthPreference | null>(null)
  const [preferencesLoading, setPreferencesLoading] = useState(false)
  const [preferencesSaving, setPreferencesSaving] = useState(false)

  const { user } = useAuth()
  const { message } = App.useApp()
  const [metricForm] = Form.useForm<HealthMetricPayload>()
  const [preferenceForm] = Form.useForm<HealthPreferencePayload>()

  const metricCards = useMemo(() => {
    if (!latestMetric) {
      return []
    }
    return [
      {
        key: 'weight',
        label: '体重',
        emoji: '⚖️',
        value: `${latestMetric.weight_kg.toFixed(1)} kg`,
        tip: '基于最新一次体测的重量',
        color: 'orange' as const,
      },
      {
        key: 'bodyFat',
        label: '体脂率',
        emoji: '🔥',
        value: `${latestMetric.body_fat_percent.toFixed(1)} %`,
        tip: '关注脂肪比例的变化趋势',
        color: 'red' as const,
      },
      {
        key: 'bmi',
        label: 'BMI',
        emoji: '📊',
        value: latestMetric.bmi.toFixed(1),
        tip: '18.5 - 23.9 为常见健康区间',
        color: 'blue' as const,
      },
      {
        key: 'muscle',
        label: '肌肉率',
        emoji: '💪',
        value: `${latestMetric.muscle_percent.toFixed(1)} %`,
        tip: '维持肌肉量有助于提高代谢',
        color: 'green' as const,
      },
      {
        key: 'water',
        label: '水分率',
        emoji: '💧',
        value: `${latestMetric.water_percent.toFixed(1)} %`,
        tip: '水分稳定代表良好的体液平衡',
        color: 'blue' as const,
      },
    ]
  }, [latestMetric])

  const recordedAtText = useMemo(() => {
    if (!latestMetric) {
      return ''
    }
    return dayjs(latestMetric.recorded_at).format('YYYY-MM-DD HH:mm')
  }, [latestMetric])

  const loadMetrics = useCallback(async () => {
    setMetricLoading(true)
    try {
      const [latest, history] = await Promise.all([
        fetchLatestMetric(),
        fetchMetricHistory(10),
      ])
      setLatestMetric(latest)
      setMetricHistory(history ?? [])
    } catch (error) {
      message.error(`❌ ${resolveErrorMessage(error)}`)
    } finally {
      setMetricLoading(false)
    }
  }, [message])

  const loadPreferences = useCallback(async () => {
    setPreferencesLoading(true)
    try {
      const data = await fetchPreferences()
      setPreferences(data)
    } catch (error) {
      message.error(`❌ ${resolveErrorMessage(error)}`)
    } finally {
      setPreferencesLoading(false)
    }
  }, [message])


  const loadLatestRecommendation = useCallback(async () => {
    setRecommendationLoading(true)
    setRecommendationError(null)
    try {
      const data = await getLatestRecommendation()
      setRecommendation(data)
    } catch (error) {
      const text = resolveErrorMessage(error)
      setRecommendationError(text)
      setRecommendation(null)
    } finally {
      setRecommendationLoading(false)
    }
  }, [])

  const handleRegenerateRecommendation = useCallback(async () => {
    setRecommendationLoading(true)
    setRecommendationError(null)
    try {
      await generateNewRecommendation()
      // 重新加载最新建议以获取数据库中的完整记录
      await loadLatestRecommendation()
    } catch (error) {
      const text = resolveErrorMessage(error)
      setRecommendationError(text)
    } finally {
      setRecommendationLoading(false)
    }
  }, [loadLatestRecommendation])

  useEffect(() => {
    void loadMetrics()
    void loadPreferences()
    void loadLatestRecommendation()
  }, [loadMetrics, loadPreferences, loadLatestRecommendation])


  useEffect(() => {
    if (metricModalOpen) {
      if (latestMetric) {
        metricForm.setFieldsValue({
          weight_kg: Number(latestMetric.weight_kg.toFixed(1)),
          body_fat_percent: Number(latestMetric.body_fat_percent.toFixed(1)),
          bmi: Number(latestMetric.bmi.toFixed(1)),
          muscle_percent: Number(latestMetric.muscle_percent.toFixed(1)),
          water_percent: Number(latestMetric.water_percent.toFixed(1)),
          note: latestMetric.note ?? undefined,
        })
      } else {
        metricForm.resetFields()
      }
    } else {
      metricForm.resetFields()
    }
  }, [metricModalOpen, latestMetric, metricForm])

  useEffect(() => {
    if (preferences) {
      preferenceForm.setFieldsValue({
        target_weight_kg: preferences.target_weight_kg ?? undefined,
        calorie_budget_kcal: preferences.calorie_budget_kcal ?? undefined,
        dietary_preference: preferences.dietary_preference ?? undefined,
        activity_level: preferences.activity_level ?? undefined,
        sleep_goal_hours: preferences.sleep_goal_hours ?? undefined,
        hydration_goal_liters: preferences.hydration_goal_liters ?? undefined,
      })
    } else {
      preferenceForm.resetFields()
    }
  }, [preferences, preferenceForm])

  const handleSubmitMetric = async () => {
    try {
      const values = await metricForm.validateFields()
      await createMetric({
        ...values,
        note: values.note ?? null,
      })
      message.success('✅ 体测数据已更新')
      setMetricModalOpen(false)
      await loadMetrics()
    } catch (error) {
      message.error(`❌ ${resolveErrorMessage(error)}`)
    }
  }

  const handleSavePreferences = async () => {
    try {
      const values = await preferenceForm.validateFields()
      const payload = Object.fromEntries(
        Object.entries(values).filter(([, value]) => value !== undefined)
      ) as HealthPreferencePayload
      setPreferencesSaving(true)
      const updated = await updatePreferences(payload)
      setPreferences(updated)
      message.success('✅ 健康偏好已保存')
    } catch (error) {
      message.error(`❌ ${resolveErrorMessage(error)}`)
    } finally {
      setPreferencesSaving(false)
    }
  }

  const tabs: { key: TabKey; label: string; icon: ReactNode; emoji: string }[] = useMemo(
    () => [
      { key: 'metrics', label: '我的数据', icon: <BarChartOutlined />, emoji: '📊' },
      { key: 'suggestions', label: 'AI 建议', icon: <BulbOutlined />, emoji: '💡' },
      { key: 'profile', label: '我的', icon: <UserOutlined />, emoji: '👤' },
    ],
    [],
  )

  const renderMetricTab = () => {
    if (metricLoading) {
      return <LoadingState message="加载最新体测数据..." minHeight={300} />
    }

    if (!latestMetric) {
      return (
        <EmptyState
          emoji="📭"
          title="暂无健康数据"
          description="还没有记录任何体测信息，让我们开始吧！💪"
          action={{
            text: '📝 记录首条数据',
            onClick: () => setMetricModalOpen(true),
            icon: <PlusCircleOutlined />,
          }}
        />
      )
    }

    return (
      <Space direction="vertical" size={16} className="w-full">
        {/* 最新体测卡片 */}
        <Card
          className="border-none bg-white"
          style={{ boxShadow: '0 2px 12px rgba(0, 0, 0, 0.05)' }}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>📈</span>
              <Typography.Title level={4} style={{ marginBottom: 0 }}>
                最新体测
              </Typography.Title>
            </div>
          }
          extra={
            <Space size={12}>
              <Tag color="orange">⏰ {recordedAtText}</Tag>
              <Button
                type="primary"
                icon={<PlusCircleOutlined />}
                onClick={() => setMetricModalOpen(true)}
              >
                更新数据
              </Button>
            </Space>
          }
        >
          {/* 数据卡片网格 */}
          <Flex wrap gap={12}>
            {metricCards.map((item) => (
              <StatsCard
                key={item.key}
                emoji={item.emoji}
                label={item.label}
                value={item.value}
                tip={item.tip}
                color={item.color}
              />
            ))}
          </Flex>

          {/* 备注信息 */}
          {latestMetric.note && (
            <Alert
              type="info"
              showIcon
              className="mt-4"
              message={<span style={{ fontWeight: 600 }}>📝 备注</span>}
              description={latestMetric.note}
              style={{ marginTop: 16 }}
            />
          )}
        </Card>

        {/* 历史记录 */}
        {metricHistory.length > 1 && (
          <Card
            className="border-none bg-white"
            style={{ boxShadow: '0 2px 12px rgba(0, 0, 0, 0.05)' }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>📚</span>
                <Typography.Title level={4} style={{ marginBottom: 0 }}>
                  历史记录
                </Typography.Title>
              </div>
            }
          >
            <List
              itemLayout="horizontal"
              dataSource={metricHistory.slice(0, 6)}
              renderItem={(item) => (
                <List.Item style={{ padding: '12px 0' }}>
                  <List.Item.Meta
                    title={
                      <span style={{ fontSize: 13, fontWeight: 600 }}>
                        📅 {dayjs(item.recorded_at).format('MM-DD HH:mm')}
                      </span>
                    }
                    description={
                      <Space size={12} wrap>
                        <span style={{ fontSize: 12 }}>⚖️ 体重 {item.weight_kg.toFixed(1)} kg</span>
                        <span style={{ fontSize: 12 }}>🔥 体脂 {item.body_fat_percent.toFixed(1)}%</span>
                        <span style={{ fontSize: 12 }}>💪 肌肉 {item.muscle_percent.toFixed(1)}%</span>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        )}
      </Space>
    )
  }


  const renderSuggestionTab = () => {
    if (recommendationLoading && !recommendation) {
      return <LoadingState message="加载健康建议中..." minHeight={300} />
    }

    // 检查用户是否填写了数据
    if (!latestMetric) {
      return (
        <EmptyState
          emoji="📝"
          title="请先填写个人数据"
          description="AI 建议需要您的健康数据作为基础。请先在「我的数据」标签页记录您的体测数据。"
          action={{
            text: '📊 前往填写数据',
            onClick: () => setActiveTab('metrics'),
            icon: <BarChartOutlined />,
          }}
          minHeight={300}
        />
      )
    }

    return (
      <Space direction="vertical" size={16} className="w-full">
        {recommendationError && (
          <Alert
            type="warning"
            showIcon
            className="mb-4"
            message="⚠️ 无法获取健康建议"
            description={recommendationError}
            style={{ marginBottom: 16 }}
          />
        )}

        {!recommendationError && !recommendation && (
          <EmptyState
            emoji="🎯"
            title="还没有生成建议"
            description="现在为您生成个性化的健康建议吧！点击下方按钮，AI 将基于您的数据为您量身定制健康方案。"
            action={{
              text: '✨ 生成 AI 建议',
              onClick: handleRegenerateRecommendation,
              icon: <BulbOutlined />,
            }}
            minHeight={200}
          />
        )}

        {recommendation && (
          <RecommendationCard
            recommendation={recommendation}
            onRegenerate={handleRegenerateRecommendation}
            isLoading={recommendationLoading}
          />
        )}
      </Space>
    )
  }

  const renderProfileTab = () => (
    <Space direction="vertical" size={16} className="w-full">
      {/* 账户信息卡片 */}
      <Card
        className="border-none bg-white"
        style={{ boxShadow: '0 2px 12px rgba(0, 0, 0, 0.05)' }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>👤</span>
            <Typography.Title level={4} style={{ marginBottom: 0 }}>
              账户信息
            </Typography.Title>
          </div>
        }
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              👥 用户名
            </Typography.Text>
            <Typography.Text strong style={{ fontSize: 15 }}>
              {user?.username ?? '未知用户'}
            </Typography.Text>
          </div>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              ✉️ 邮箱
            </Typography.Text>
            <Typography.Text strong style={{ fontSize: 15 }}>
              {user?.email ?? '尚未填写'}
            </Typography.Text>
          </div>
        </Space>
      </Card>

      {/* 健康偏好卡片 */}
      <Card
        className="border-none bg-white"
        style={{ boxShadow: '0 2px 12px rgba(0, 0, 0, 0.05)' }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>⚙️</span>
            <Typography.Title level={4} style={{ marginBottom: 0 }}>
              健康偏好设置
            </Typography.Title>
          </div>
        }
      >
        {preferencesLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12, animation: 'pulse 2s infinite' }}>⚙️</div>
              <Typography.Text type="secondary">加载偏好设置中...</Typography.Text>
            </div>
          </div>
        ) : (
          <Form form={preferenceForm} layout="vertical" requiredMark={false}>
            <Form.Item
              label="🎯 目标体重 (kg)"
              name="target_weight_kg"
              rules={[
                { min: 1, type: 'number', message: '请输入合理的体重数值 ⚠️' },
              ]}
            >
              <InputNumber
                className="w-full"
                min={30}
                max={200}
                step={0.1}
                placeholder="示例：65.5"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="🔥 每日热量预算 (kcal)"
              name="calorie_budget_kcal"
              rules={[
                { type: 'number', min: 600, max: 5000, message: '热量预算需在 600-5000 之间 ⚠️' },
              ]}
            >
              <InputNumber className="w-full" placeholder="示例：2000" size="large" />
            </Form.Item>

            <Form.Item label="🍽️ 饮食偏好" name="dietary_preference">
              <Input placeholder="例如：高蛋白、地中海饮食" size="large" />
            </Form.Item>

            <Form.Item label="🏃 活动水平" name="activity_level">
              <Select
                placeholder="请选择日常活动水平"
                size="large"
                options={[
                  { value: 'light', label: '🪑 低强度（久坐为主）' },
                  { value: 'moderate', label: '🚶 中等强度（每周 2-3 次运动）' },
                  { value: 'high', label: '🏋️ 高强度（经常训练）' },
                ]}
                allowClear
              />
            </Form.Item>

            <Form.Item
              label="😴 睡眠目标 (小时)"
              name="sleep_goal_hours"
              rules={[
                { type: 'number', min: 4, max: 12, message: '睡眠目标需在 4-12 小时之间 ⚠️' },
              ]}
            >
              <InputNumber className="w-full" placeholder="示例：7.5" step={0.5} size="large" />
            </Form.Item>

            <Form.Item
              label="💧 饮水目标 (升)"
              name="hydration_goal_liters"
              rules={[
                { type: 'number', min: 1, max: 6, message: '饮水目标需在 1-6 升之间 ⚠️' },
              ]}
            >
              <InputNumber className="w-full" placeholder="示例：2.5" step={0.1} size="large" />
            </Form.Item>

            <Button
              type="primary"
              block
              size="large"
              loading={preferencesSaving}
              onClick={() => {
                void handleSavePreferences()
              }}
              style={{ marginTop: 16 }}
            >
              💾 保存偏好设置
            </Button>
          </Form>
        )}
      </Card>
    </Space>
  )

  return (
    <div className="relative flex min-h-screen flex-col bg-gradient-to-b from-slate-50 to-orange-50">
      {/* 顶部粘性导航栏 */}
      <header className="sticky top-0 z-10 border-b border-orange-100 bg-white/95 backdrop-blur-sm" style={{ boxShadow: '0 2px 8px rgba(249, 115, 22, 0.08)' }}>
        <div className="mx-auto flex h-16 w-full max-w-2xl items-center justify-between px-4">
          <div>
            <Typography.Title level={4} className="!mb-0" style={{ color: '#1f2937' }}>
              🏥 个性化健康助手
            </Typography.Title>
          </div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            👋 欢迎，{user?.username}
          </Typography.Text>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-16 px-4 pb-32 pt-6">
        {activeTab === 'metrics' && renderMetricTab()}
        {activeTab === 'suggestions' && renderSuggestionTab()}
        {activeTab === 'profile' && renderProfileTab()}
      </main>

      {/* 底部浮动导航栏 - 优化设计 */}
      <nav
        className="fixed bottom-0 left-0 right-0 border-t border-orange-100 bg-white/95 backdrop-blur-sm"
        style={{ boxShadow: '0 -2px 12px rgba(249, 115, 22, 0.1)' }}
      >
        <div className="mx-auto flex w-full max-w-2xl">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'flex flex-1 flex-col items-center justify-center gap-1.5 py-3 text-xs font-medium transition-all duration-200',
                activeTab === tab.key
                  ? 'text-orange-600 bg-gradient-to-t from-orange-50 to-transparent'
                  : 'text-slate-500 hover:text-slate-700',
              )}
              style={{
                borderTop: activeTab === tab.key ? '2px solid #f97316' : 'none',
              }}
            >
              <span style={{ fontSize: 20 }}>{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* 记录体测数据的模态框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>📝</span>
            <span>记录我的体测数据</span>
          </div>
        }
        open={metricModalOpen}
        onCancel={() => setMetricModalOpen(false)}
        onOk={() => {
          void handleSubmitMetric()
        }}
        okText="💾 保存"
        cancelText="❌ 取消"
        destroyOnClose
        okButtonProps={{ type: 'primary' }}
        style={{ borderRadius: 16 }}
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 16, fontSize: 13 }}>
          📋 请填写最近一次体测的核心指标，所有字段均会参与 AI 建议的生成。
        </Typography.Paragraph>

        <Form form={metricForm} layout="vertical" requiredMark={false}>
          <Form.Item
            label="⚖️ 体重 (kg)"
            name="weight_kg"
            rules={[{ required: true, message: '请输入体重 ⚠️' }]}
          >
            <InputNumber className="w-full" min={30} max={250} step={0.1} size="large" />
          </Form.Item>

          <Form.Item
            label="🔥 体脂率 (%)"
            name="body_fat_percent"
            rules={[{ required: true, message: '请输入体脂率 ⚠️' }]}
          >
            <InputNumber className="w-full" min={5} max={70} step={0.1} size="large" />
          </Form.Item>

          <Form.Item
            label="📊 BMI"
            name="bmi"
            rules={[{ required: true, message: '请输入 BMI ⚠️' }]}
          >
            <InputNumber className="w-full" min={10} max={60} step={0.1} size="large" />
          </Form.Item>

          <Form.Item
            label="💪 肌肉率 (%)"
            name="muscle_percent"
            rules={[{ required: true, message: '请输入肌肉率 ⚠️' }]}
          >
            <InputNumber className="w-full" min={10} max={80} step={0.1} size="large" />
          </Form.Item>

          <Form.Item
            label="💧 水分率 (%)"
            name="water_percent"
            rules={[{ required: true, message: '请输入水分率 ⚠️' }]}
          >
            <InputNumber className="w-full" min={20} max={80} step={0.1} size="large" />
          </Form.Item>

          <Form.Item label="📝 备注（可选）" name="note">
            <Input.TextArea
              placeholder="可记录当日状态、饮食或训练情况 🎯"
              rows={3}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
