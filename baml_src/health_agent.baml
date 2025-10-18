// 健康 Agent BAML 定义
// 用于定义健康建议生成的数据模型和 LLM 函数

// ===== 数据模型定义 =====

// 健康指标模型
class HealthMetric {
  weight_kg float
  body_fat_percent float
  bmi float
  muscle_percent float
  water_percent float
  recorded_at string  // ISO format datetime
  note string?
}

// 健康偏好设置模型
class HealthPreference {
  target_weight_kg float?
  calorie_budget_kcal int?
  dietary_preference string?
  activity_level string?
  sleep_goal_hours float?
  hydration_goal_liters float?
}

// Agent 上下文 - 用于输入信息
class HealthAgentContext {
  metric HealthMetric
  preference HealthPreference?
}

// 健康建议输出模型
class AgentSuggestion {
  summary string
  meal_plan string[]
  calorie_management string[]
  weight_management string[]
  hydration string[]
  lifestyle string[]
}

// ===== LLM 函数定义 =====

// 生成健康建议的主函数
function GenerateHealthSuggestion(context: HealthAgentContext) -> AgentSuggestion {
  client CustomChat
  prompt #"
    你是智能健康顾问，需要针对体重管理、饮食和生活方式给出结构化建议。

    请根据以下用户的健康指标和偏好，生成 JSON 格式的建议，字段包括：
    summary（字符串），meal_plan（字符串数组），calorie_management（字符串数组），weight_management（字符串数组），hydration（字符串数组），lifestyle（字符串数组）。

    【健康指标】
    体重: {{ context.metric.weight_kg }} kg
    体脂率: {{ context.metric.body_fat_percent }}%
    BMI: {{ context.metric.bmi }}
    肌肉率: {{ context.metric.muscle_percent }}%
    水分率: {{ context.metric.water_percent }}%
    记录时间: {{ context.metric.recorded_at }}
    {%- if context.metric.note %}
    备注: {{ context.metric.note }}
    {%- endif %}

    {%- if context.preference %}

    【健康偏好】
    {%- if context.preference.target_weight_kg %}
    目标体重: {{ context.preference.target_weight_kg }} kg
    {%- endif %}
    {%- if context.preference.calorie_budget_kcal %}
    热量预算: {{ context.preference.calorie_budget_kcal }} kcal/日
    {%- endif %}
    {%- if context.preference.dietary_preference %}
    饮食偏好: {{ context.preference.dietary_preference }}
    {%- endif %}
    {%- if context.preference.activity_level %}
    活动水平: {{ context.preference.activity_level }}
    {%- endif %}
    {%- if context.preference.sleep_goal_hours %}
    睡眠目标: {{ context.preference.sleep_goal_hours }} 小时
    {%- endif %}
    {%- if context.preference.hydration_goal_liters %}
    饮水目标: {{ context.preference.hydration_goal_liters }} 升
    {%- endif %}
    {%- endif %}

    请确保返回值可以被 JSON.parse 正常解析。

    {{ ctx.output_format }}
  "#
}

// 测试函数
test health_suggestion_test {
  functions [GenerateHealthSuggestion]
  args {
    context {
      metric {
        weight_kg 75.5
        body_fat_percent 25.3
        bmi 24.5
        muscle_percent 45.2
        water_percent 55.8
        recorded_at "2025-10-18T00:00:00Z"
        note null
      }
      preference {
        target_weight_kg 72.0
        calorie_budget_kcal 2200
        dietary_preference "低脂"
        activity_level "中等"
        sleep_goal_hours 8.0
        hydration_goal_liters 2.5
      }
    }
  }
}

