export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface UserProfile {
  id: number
  username: string
  email: string
  name: string | null
  role: string
  status: string
}

export interface LoginPayload {
  username: string
  password: string
}

export interface RegisterPayload {
  username: string
  email: string
  password: string
}

export interface UpdateProfilePayload {
  email?: string | null
  name?: string | null
}

export interface PasswordChangePayload {
  old_password: string
  new_password: string
}

export interface ItemPayload {
  name: string
}

export interface Item {
  id: number
  name: string
}

export interface HealthMetricPayload {
  weight_kg: number
  body_fat_percent: number
  bmi: number
  muscle_percent: number
  water_percent: number
  recorded_at?: string
  note?: string | null
}

export interface HealthMetric {
  id: number
  user_id: number
  weight_kg: number
  body_fat_percent: number
  bmi: number
  muscle_percent: number
  water_percent: number
  recorded_at: string
  note: string | null
}

export interface HealthPreferencePayload {
  target_weight_kg?: number | null
  calorie_budget_kcal?: number | null
  dietary_preference?: string | null
  activity_level?: string | null
  sleep_goal_hours?: number | null
  hydration_goal_liters?: number | null
}

export interface HealthPreference {
  user_id: number
  target_weight_kg: number | null
  calorie_budget_kcal: number | null
  dietary_preference: string | null
  activity_level: string | null
  sleep_goal_hours: number | null
  hydration_goal_liters: number | null
}

export interface AgentSuggestion {
  summary: string
  meal_plan: string[]
  calorie_management: string[]
  weight_management: string[]
  hydration: string[]
  lifestyle: string[]
}
