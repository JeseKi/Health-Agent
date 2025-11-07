import { isAxiosError } from 'axios'
import api from './api'
import { getAccessToken } from './tokenStorage'
import type {
  AgentSuggestion,
  AssistantMessage,
  AssistantStreamChunk,
  HealthMetric,
  HealthMetricPayload,
  HealthPreference,
  HealthPreferencePayload,
  HealthRecommendation,
} from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export async function createMetric(payload: HealthMetricPayload) {
  const { data } = await api.post<HealthMetric>('/health/metrics', payload)
  return data
}

export async function fetchLatestMetric() {
  try {
    const { data } = await api.get<HealthMetric>('/health/metrics/latest')
    return data
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return null
    }
    throw error
  }
}

export async function fetchMetricHistory(limit = 30) {
  const { data } = await api.get<HealthMetric[]>('/health/metrics/history', {
    params: { limit },
  })
  return data
}

export async function fetchPreferences() {
  const { data } = await api.get<HealthPreference>('/health/preferences')
  return data
}

export async function updatePreferences(payload: HealthPreferencePayload) {
  const { data } = await api.put<HealthPreference>('/health/preferences', payload)
  return data
}

export async function generateRecommendations() {
  const { data } = await api.post<AgentSuggestion>('/health/recommendations')
  return data
}

export async function getLatestRecommendation() {
  try {
    const { data } = await api.get<HealthRecommendation>('/health/recommendations/latest')
    return data
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return null
    }
    throw error
  }
}

export async function generateNewRecommendation() {
  const { data } = await api.post<AgentSuggestion>('/health/recommendations')
  return data
}

export async function fetchAssistantMessages(limit = 50) {
  const { data } = await api.get<AssistantMessage[]>('/health/assistant/messages', {
    params: { limit },
  })
  return data
}

export async function streamAssistantChat(
  content: string,
  onChunk: (chunk: AssistantStreamChunk) => void,
) {
  const token = getAccessToken()
  const response = await fetch(`${API_BASE_URL}/health/assistant/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ content }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || 'AI 助手请求失败')
  }

  if (!response.body) {
    throw new Error('当前浏览器不支持流式响应')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  const processBuffer = () => {
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''
    for (const event of events) {
      const trimmed = event.trim()
      if (!trimmed.startsWith('data:')) {
        continue
      }
      const payload = trimmed.replace(/^data:\s*/, '')
      if (!payload) {
        continue
      }
      try {
        const chunk = JSON.parse(payload) as AssistantStreamChunk
        onChunk(chunk)
      } catch (error) {
        console.warn('解析 AI 助手流数据失败', error)
      }
    }
  }

  while (true) {
    const { value, done } = await reader.read()
    if (done) {
      buffer += decoder.decode()
      processBuffer()
      break
    }
    buffer += decoder.decode(value, { stream: true })
    processBuffer()
  }
}
