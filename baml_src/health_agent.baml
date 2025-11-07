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

// 需要修改的字段项
class AgentChangeItem {
  field string
  value string
  reason string?
}

// Agent 历史消息
class AgentChatMessage {
  role string  // "user" or "assistant"
  content string
  need_change bool?
  change_log AgentChangeItem[]?
}

// 聊天请求，携带上下文、历史与当前输入
class AgentChatRequest {
  metric HealthMetric
  preference HealthPreference?
  history AgentChatMessage[]
  user_input string
}

// 聊天响应
class AgentChatResponse {
  content string
  need_change bool
  change_log AgentChangeItem[]
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

// AI 助手流式对话
function StreamAgentChat(request: AgentChatRequest) -> AgentChatResponse {
  client CustomChat
  prompt #"
    你是用户的长期健康教练，需要记住历史对话并根据最新体测/偏好实时交流。

    任务：
    1. 结合健康指标、偏好、历史对话内容，生成自然语言回复。
    2. 判断本轮是否需要修改用户数据库中的字段，填写 need_change。
    3. 当 need_change 为 true 时，在 change_log 中列出要更新的字段，每项包含 field、value、reason。
    4. change_log 为空数组表示无需修改。

    【健康指标】
    体重: {{ request.metric.weight_kg }} kg
    体脂率: {{ request.metric.body_fat_percent }}%
    BMI: {{ request.metric.bmi }}
    肌肉率: {{ request.metric.muscle_percent }}%
    水分率: {{ request.metric.water_percent }}%
    记录时间: {{ request.metric.recorded_at }}
    {%- if request.metric.note %}
    备注: {{ request.metric.note }}
    {%- endif %}

    {%- if request.preference %}
    【健康偏好】
    {%- if request.preference.target_weight_kg %}
    目标体重: {{ request.preference.target_weight_kg }}kg
    {%- endif %}
    {%- if request.preference.calorie_budget_kcal %}
    热量预算: {{ request.preference.calorie_budget_kcal }} kcal
    {%- endif %}
    {%- if request.preference.dietary_preference %}
    饮食偏好: {{ request.preference.dietary_preference }}
    {%- endif %}
    {%- if request.preference.activity_level %}
    活动水平: {{ request.preference.activity_level }}
    {%- endif %}
    {%- if request.preference.sleep_goal_hours %}
    睡眠目标: {{ request.preference.sleep_goal_hours }} 小时
    {%- endif %}
    {%- if request.preference.hydration_goal_liters %}
    饮水目标: {{ request.preference.hydration_goal_liters }} 升
    {%- endif %}
    {%- endif %}

    {%- if request.history and request.history | length > 0 %}
    【近期对话摘要（最新在后）】
    {%- for msg in request.history %}
    - {{ msg.role }}: {{ msg.content }}
      {%- if msg.need_change is not none %}
        (need_change={{ msg.need_change }})
      {%- endif %}
      {%- if msg.change_log %}
        (change_log={{ msg.change_log | length }} 项)
      {%- endif %}
    {%- endfor %}
    {%- endif %}

    【用户当前输入】
    {{ request.user_input }}

    输出要求（严格遵守 JSON 结构，确保可解析）：
    {
      "content": "自然语言回复",
      "need_change": true | false,
      "change_log": [
        {
          "field": "待更新的数据库字段（如 water_percent, hydration_goal_liters 等）",
          "value": "字段的新值，尽量保持为纯数字或简短文本",
          "reason": "修改原因"
        }
      ]
    }

    约束：
    - 如无需修改数据，请返回 need_change=false 且 change_log=[]。
    - 如需修改多个字段，逐项列出。
    - 回复语气专业且友好，可引用历史上下文。
    - change_log 的 field 字段必须严格使用以下枚举之一（不要创造新键或缩写）：
      ["weight_kg","body_fat_percent","bmi","muscle_percent","water_percent","note","target_weight_kg","calorie_budget_kcal","dietary_preference","activity_level","sleep_goal_hours","hydration_goal_liters"]
    - value 应与字段类型一致（数字字段仅写数字或数字+单位，字符串字段输出短句）。

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

test health_chat_test {
  functions [StreamAgentChat]
  args {
    request {
      metric {
        weight_kg 65.0
        body_fat_percent 22.5
        bmi 21.3
        muscle_percent 38.0
        water_percent 54.0
        recorded_at "2025-01-10T08:00:00Z"
        note "晨练后"
      }
      preference {
        target_weight_kg 60.0
        dietary_preference "高蛋白"
        activity_level "moderate"
        hydration_goal_liters 2.2
      }
      history [
        {
          role "user"
          content "请帮我制定今天的训练"
        },
        {
          role "assistant"
          content "建议安排 30 分钟有氧"
          need_change false
          change_log []
        }
      ]
      user_input "请把饮水目标提高到 2.5 升"
    }
  }
}
