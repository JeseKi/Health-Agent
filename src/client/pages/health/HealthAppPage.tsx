import {
  BarChartOutlined,
  BulbOutlined,
  PlusCircleOutlined,
  ReloadOutlined,
  UserOutlined,
} from '@ant-design/icons'
import {
  App,
  Alert,
  Button,
  Card,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Select,
  Space,
  Spin,
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
  generateRecommendations,
  updatePreferences,
} from '../../lib/health'
import type {
  AgentSuggestion,
  HealthMetric,
  HealthMetricPayload,
  HealthPreference,
  HealthPreferencePayload,
} from '../../lib/types'

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

  const [suggestion, setSuggestion] = useState<AgentSuggestion | null>(null)
  const [suggestionLoading, setSuggestionLoading] = useState(false)
  const [suggestionError, setSuggestionError] = useState<string | null>(null)

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
        value: `${latestMetric.weight_kg.toFixed(1)} kg`,
        tip: '基于最新一次体测的重量',
      },
      {
        key: 'bodyFat',
        label: '体脂率',
        value: `${latestMetric.body_fat_percent.toFixed(1)} %`,
        tip: '关注脂肪比例的变化趋势',
      },
      {
        key: 'bmi',
        label: 'BMI',
        value: latestMetric.bmi.toFixed(1),
        tip: '18.5 - 23.9 为常见健康区间',
      },
      {
        key: 'muscle',
        label: '肌肉率',
        value: `${latestMetric.muscle_percent.toFixed(1)} %`,
        tip: '维持肌肉量有助于提高代谢',
      },
      {
        key: 'water',
        label: '水分率',
        value: `${latestMetric.water_percent.toFixed(1)} %`,
        tip: '水分稳定代表良好的体液平衡',
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
      message.error(resolveErrorMessage(error))
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
      message.error(resolveErrorMessage(error))
    } finally {
      setPreferencesLoading(false)
    }
  }, [message])

  const loadSuggestions = useCallback(async () => {
    setSuggestionLoading(true)
    setSuggestionError(null)
    try {
      const data = await generateRecommendations()
      setSuggestion(data)
    } catch (error) {
      const text = resolveErrorMessage(error)
      setSuggestionError(text)
      setSuggestion(null)
    } finally {
      setSuggestionLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadMetrics()
    void loadPreferences()
  }, [loadMetrics, loadPreferences])

  useEffect(() => {
    if (activeTab === 'suggestions' && !suggestion && !suggestionLoading) {
      void loadSuggestions()
    }
  }, [activeTab, suggestion, suggestionLoading, loadSuggestions])

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
      message.success('体测数据已更新')
      setMetricModalOpen(false)
      await loadMetrics()
    } catch (error) {
      if (!isAxiosError(error)) {
        message.error(resolveErrorMessage(error))
      } else {
        message.error(resolveErrorMessage(error))
      }
    }
  }

  const handleSavePreferences = async () => {
    try {
      const values = await preferenceForm.validateFields()
      const payload = {} as HealthPreferencePayload
      ;(Object.entries(values) as [keyof HealthPreferencePayload, number | string | null | undefined][]).forEach(
        ([key, value]) => {
          if (value !== undefined) {
            ;(payload as any)[key] = value
          }
        },
      )
      setPreferencesSaving(true)
      const updated = await updatePreferences(payload)
      setPreferences(updated)
      message.success('健康偏好已保存')
    } catch (error) {
      message.error(resolveErrorMessage(error))
    } finally {
      setPreferencesSaving(false)
    }
  }

  const tabs: { key: TabKey; label: string; icon: ReactNode }[] = useMemo(
    () => [
      { key: 'metrics', label: '我的数据', icon: <BarChartOutlined /> },
      { key: 'suggestions', label: 'AI 建议', icon: <BulbOutlined /> },
      { key: 'profile', label: '我的', icon: <UserOutlined /> },
    ],
    [],
  )

  const renderMetricTab = () => {
    if (metricLoading) {
      return (
        <div className="flex h-full items-center justify-center py-16">
          <Spin tip="加载最新体测..." />
        </div>
      )
    }

    if (!latestMetric) {
      return (
        <Card
          className="border-none bg-white shadow-sm"
          actions={[
            <Button
              key="create"
              type="primary"
              icon={<PlusCircleOutlined />}
              onClick={() => setMetricModalOpen(true)}
            >
              记录首条数据
            </Button>,
          ]}
        >
          <Empty description="暂无健康数据，请先录入体测信息。" />
        </Card>
      )
    }

    return (
      <Space direction="vertical" size={16} className="w-full">
        <Card
          className="border-none bg-white shadow-sm"
          title="最新体测"
          extra={
            <Space size={12}>
              <Tag color="blue">记录时间 {recordedAtText}</Tag>
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
          <Flex wrap gap={12}>
            {metricCards.map((item) => (
              <Card
                key={item.key}
                className="w-[calc(50%-6px)] min-w-[160px] border bg-slate-50"
                bodyStyle={{ padding: 16 }}
              >
                <Typography.Text type="secondary">{item.label}</Typography.Text>
                <Typography.Title level={3} style={{ marginTop: 8, marginBottom: 4 }}>
                  {item.value}
                </Typography.Title>
                <Typography.Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 12 }}>
                  {item.tip}
                </Typography.Paragraph>
              </Card>
            ))}
          </Flex>
          {latestMetric.note && (
            <Alert
              type="info"
              showIcon
              className="mt-4"
              message={<span className="font-medium text-slate-700">备注</span>}
              description={latestMetric.note}
            />
          )}
        </Card>

        {metricHistory.length > 1 && (
          <Card className="border-none bg-white shadow-sm" title="历史记录">
            <List
              itemLayout="horizontal"
              dataSource={metricHistory.slice(0, 6)}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={dayjs(item.recorded_at).format('MM-DD HH:mm')}
                    description={
                      <Space size={12}>
                        <span>体重 {item.weight_kg.toFixed(1)} kg</span>
                        <span>体脂率 {item.body_fat_percent.toFixed(1)}%</span>
                        <span>肌肉率 {item.muscle_percent.toFixed(1)}%</span>
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

  const renderSuggestionList = (title: string, items: string[]) => {
    if (!items?.length) {
      return null
    }
    return (
      <Card className="border-none bg-slate-50" size="small" title={title}>
        <List
          dataSource={items}
          renderItem={(text) => (
            <List.Item className="px-0">
              <Typography.Text>{text}</Typography.Text>
            </List.Item>
          )}
        />
      </Card>
    )
  }

  const renderSuggestionTab = () => {
    if (suggestionLoading && !suggestion) {
      return (
        <div className="flex h-full items-center justify-center py-16">
          <Spin tip="正在生成建议..." />
        </div>
      )
    }

    return (
      <Space direction="vertical" size={16} className="w-full">
        <Card
          className="border-none bg-white shadow-sm"
          title="今日建议"
          extra={
            <Button
              type="default"
              icon={<ReloadOutlined />}
              onClick={() => {
                void loadSuggestions()
              }}
              loading={suggestionLoading}
            >
              重新生成
            </Button>
          }
        >
          {suggestionError && (
            <Alert
              type="warning"
              showIcon
              className="mb-4"
              message="无法获取 AI 建议"
              description={suggestionError}
            />
          )}
          {!suggestionError && !suggestion && (
            <Empty description="请先录入健康数据后再获取 AI 建议。" />
          )}
          {suggestion && (
            <Space direction="vertical" size={16} className="w-full">
              <Alert
                type="success"
                showIcon
                message="摘要"
                description={suggestion.summary}
              />
              {renderSuggestionList('健康食谱推荐', suggestion.meal_plan)}
              {renderSuggestionList('卡路里管理', suggestion.calorie_management)}
              {renderSuggestionList('体重管理策略', suggestion.weight_management)}
              {renderSuggestionList('水分建议', suggestion.hydration)}
              {renderSuggestionList('生活方式', suggestion.lifestyle)}
            </Space>
          )}
        </Card>
      </Space>
    )
  }

  const renderProfileTab = () => (
    <Space direction="vertical" size={16} className="w-full">
      <Card className="border-none bg-white shadow-sm">
        <Typography.Title level={4}>账户信息</Typography.Title>
        <Space direction="vertical" size={12} className="mt-4">
          <Typography.Text strong>用户名</Typography.Text>
          <Typography.Text>{user?.username ?? '未知用户'}</Typography.Text>
          <Typography.Text strong>邮箱</Typography.Text>
          <Typography.Text>{user?.email ?? '尚未填写'}</Typography.Text>
        </Space>
      </Card>

      <Card className="border-none bg-white shadow-sm" title="健康偏好">
        {preferencesLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Spin tip="加载偏好..." />
          </div>
        ) : (
          <Form form={preferenceForm} layout="vertical" requiredMark={false}>
            <Form.Item
              label="目标体重 (kg)"
              name="target_weight_kg"
              rules={[
                { min: 1, type: 'number', message: '请输入合理的体重数值' },
              ]}
            >
              <InputNumber className="w-full" min={30} max={200} step={0.1} placeholder="示例：65.5" />
            </Form.Item>
            <Form.Item
              label="每日热量预算 (kcal)"
              name="calorie_budget_kcal"
              rules={[
                { type: 'number', min: 600, max: 5000, message: '热量预算需在 600-5000 之间' },
              ]}
            >
              <InputNumber className="w-full" placeholder="示例：2000" />
            </Form.Item>
            <Form.Item label="饮食偏好" name="dietary_preference">
              <Input placeholder="例如：高蛋白、地中海饮食" />
            </Form.Item>
            <Form.Item label="活动水平" name="activity_level">
              <Select
                placeholder="请选择日常活动水平"
                options={[
                  { value: 'light', label: '低强度（久坐为主）' },
                  { value: 'moderate', label: '中等强度（每周 2-3 次运动）' },
                  { value: 'high', label: '高强度（经常训练）' },
                ]}
                allowClear
              />
            </Form.Item>
            <Form.Item
              label="睡眠目标 (小时)"
              name="sleep_goal_hours"
              rules={[
                { type: 'number', min: 4, max: 12, message: '睡眠目标需在 4-12 小时之间' },
              ]}
            >
              <InputNumber className="w-full" placeholder="示例：7.5" step={0.5} />
            </Form.Item>
            <Form.Item
              label="饮水目标 (升)"
              name="hydration_goal_liters"
              rules={[
                { type: 'number', min: 1, max: 6, message: '饮水目标需在 1-6 升之间' },
              ]}
            >
              <InputNumber className="w-full" placeholder="示例：2.5" step={0.1} />
            </Form.Item>
            <Button
              type="primary"
              block
              loading={preferencesSaving}
              onClick={() => {
                void handleSavePreferences()
              }}
            >
              保存偏好
            </Button>
          </Form>
        )}
      </Card>

      <Alert
        type="info"
        showIcon
        message="LLM 配置提示"
        description={
          <Typography.Paragraph className="mb-0">
            Agent 建议依赖服务端环境变量 <code>OPENAI_BASE_URL</code> 与 <code>OPENAI_API_KEY</code>。若遇到 503 错误，请检查配置或稍后重试。
          </Typography.Paragraph>
        }
      />
    </Space>
  )

  return (
    <div className="relative flex min-h-screen flex-col bg-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full max-w-xl items-center justify-between px-4">
          <div>
            <Typography.Text className="text-xs uppercase tracking-wide text-slate-400">
              Health Agent
            </Typography.Text>
            <Typography.Title level={4} className="!mb-0 text-slate-900">
              个性化健康助手
            </Typography.Title>
          </div>
          <Tag color="cyan" className="rounded-full px-3 py-1 text-xs">
            移动端体验
          </Tag>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-16 px-4 pb-24 pt-6">
        {activeTab === 'metrics' && renderMetricTab()}
        {activeTab === 'suggestions' && renderSuggestionTab()}
        {activeTab === 'profile' && renderProfileTab()}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-xl">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'flex flex-1 flex-col items-center justify-center gap-1 py-3 text-xs font-medium',
                activeTab === tab.key ? 'text-blue-600' : 'text-slate-500',
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <Modal
        title="记录我的体测数据"
        open={metricModalOpen}
        onCancel={() => setMetricModalOpen(false)}
        onOk={() => {
          void handleSubmitMetric()
        }}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Typography.Paragraph type="secondary">
          请填写最近一次体测的核心指标，所有字段均会参与 AI 建议的生成。
        </Typography.Paragraph>
        <Form form={metricForm} layout="vertical" requiredMark={false}>
          <Form.Item
            label="体重 (kg)"
            name="weight_kg"
            rules={[{ required: true, message: '请输入体重' }]}
          >
            <InputNumber className="w-full" min={30} max={250} step={0.1} />
          </Form.Item>
          <Form.Item
            label="体脂率 (%)"
            name="body_fat_percent"
            rules={[{ required: true, message: '请输入体脂率' }]}
          >
            <InputNumber className="w-full" min={5} max={70} step={0.1} />
          </Form.Item>
          <Form.Item
            label="BMI"
            name="bmi"
            rules={[{ required: true, message: '请输入 BMI' }]}
          >
            <InputNumber className="w-full" min={10} max={60} step={0.1} />
          </Form.Item>
          <Form.Item
            label="肌肉率 (%)"
            name="muscle_percent"
            rules={[{ required: true, message: '请输入肌肉率' }]}
          >
            <InputNumber className="w-full" min={10} max={80} step={0.1} />
          </Form.Item>
          <Form.Item
            label="水分率 (%)"
            name="water_percent"
            rules={[{ required: true, message: '请输入水分率' }]}
          >
            <InputNumber className="w-full" min={20} max={80} step={0.1} />
          </Form.Item>
          <Form.Item label="备注" name="note">
            <Input.TextArea placeholder="可记录当日状态、饮食或训练情况" rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
