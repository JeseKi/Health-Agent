import { isAxiosError } from 'axios'
import api from './api'
import type {
   AgentSuggestion,
   HealthMetric,
   HealthMetricPayload,
   HealthPreference,
   HealthPreferencePayload,
   HealthRecommendation,
 } from './types'

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

