# 模块：health_agent

## 公开接口
 - `POST /api/health/metrics`：新增一条健康体测记录。
 - `GET /api/health/metrics/latest`：获取最新体测记录。
 - `GET /api/health/metrics/history?limit=N`：按时间倒序获取历史体测记录。
 - `GET /api/health/preferences`：获取健康目标与偏好。
 - `PUT /api/health/preferences`：更新健康目标与偏好。
 - `POST /api/health/recommendations`：调用 LLM 生成结构化健康建议并保存到数据库。
 - `GET /api/health/recommendations/latest`：获取最新保存的健康建议。
 - `GET /api/health/assistant/messages`：按时间返回 AI 助手的历史对话。
 - `POST /api/health/assistant/chat/stream`：以 SSE 方式与 AI 助手进行流式对话，并在需要时回写用户数据。

## 业务定位
- 为移动端 Health Agent 提供体测数据管理、个性化目标维护、AI 日报以及 AI 助手对话功能。
- 业务流程：用户通过前端录入体测数据，后端持久化并按需汇总；在生成日报或进行聊天时，后端将最新数据、偏好以及历史对话送入 LLM，返回结构化结果或流式片段，同时可根据 change_log 修改数据库。

## 数据流
 ```mermaid
 flowchart TD
     A[前端表单提交] -->|HealthMetricPayload| B[健康路由 /api/health/metrics]
     B -->|线程切换 run_in_thread| C[HealthService.record_metric]
     C --> D[HealthDataDAO]
     D -->|写入| E[(SQLite: health_metrics)]

     subgraph "生成并保存建议"
         F[前端点击“重新生成”] -->|POST /recommendations| G[HealthService.build_agent_context]
         G --> H[HealthDataDAO 查询最新数据与偏好]
         H -->|AgentContext| I[HealthService.request_agent_suggestion]
         I -->|转换数据模型| J[AgentClient.fetch_suggestion]
         J -->|HealthAgentContext| K[BAML: GenerateHealthSuggestion]
         K -->|Jinja2 Prompt| L[OpenAI 兼容接口]
         L -->|JSON 响应| M[BAML 自动解析]
         M -->|AgentSuggestion| I
         I -->|保存建议| P[HealthDataDAO.create_recommendation]
         P -->|写入| Q[(SQLite: health_recommendations)]
         I -->|返回新建议| F
     end

     subgraph "获取最新建议"
         R[前端加载页面] -->|GET /recommendations/latest| S[HealthService.get_latest_recommendation]
         S --> T[HealthDataDAO.get_latest_recommendation]
         T -->|读取| U[(SQLite: health_recommendations)]
         T --> S
         S -->|返回已存建议| R
     end

     subgraph "AI 助手对话（SSE）"
         AA[前端输入消息] -->|POST /assistant/chat/stream| AB[HealthService.build_agent_context]
         AB --> AC[HealthService.build_chat_history]
         AC --> AD[HealthService.compose_chat_request]
         AD --> AE[AgentClient.stream_chat]
         AE -->|BAML StreamAgentChat| AF[BAML / LLM]
         AE -->|SSE 分片| AG[前端实时渲染]
         AE --> AH[HealthService.save_assistant_message(role=assistant)]
         AH --> AI[(SQLite: health_assistant_messages)]
         AE -->|有 change_log| AJ[HealthService.apply_change_log]
         AJ --> D
         AJ --> O
         AG -->|完成后| AK[前端刷新历史消息]
     end
 ```

## 架构说明

### 原实现（已替换）
- Prompt 构建在 `HealthService._compose_prompt()` 中
- HTTP 请求和响应解析在 `AgentClient` 中
- 类型检查依赖 Pydantic

### 新实现（BAML 驱动）
- **BAML 定义**（`baml_src/health_agent.baml`）：
  - 数据模型定义：`HealthMetric`、`HealthPreference`、`HealthAgentContext`、`AgentSuggestion`
  - 扩展模型：`AgentChangeItem`、`AgentChatMessage`、`AgentChatRequest`、`AgentChatResponse`
  - LLM 函数：`GenerateHealthSuggestion(context) -> AgentSuggestion`、`StreamAgentChat(request) -> AgentChatResponse`
  - 使用 Jinja2 模板构建 Prompt，自动处理条件字段
  - 自动 JSON 解析和类型映射

- **Python 数据转换**（`AgentClient`）：
  - `_convert_to_baml_metric()`：HealthMetricOut → HealthMetric
  - `_convert_to_baml_preference()`：HealthPreferenceOut → HealthPreference
  - `_convert_to_baml_chat_request()`：拼装聊天上下文
  - `stream_chat()`：封装 BAML Stream API，返回 `AssistantStreamChunk`

- **Service 层简化**（`HealthService`）：
  - 移除了 Prompt 构建逻辑
  - 负责消息落库、历史拼装、change_log 入库、SSE 片段格式化

**优势**：
- 类型安全：BAML 编译期检查
- Prompt 管理集中化：所有语言逻辑在 BAML 文件
- 易于扩展：支持多语言、多模型无需修改 Python 代码
- 自动文档：BAML 类型即文档

## 数据模型
 - `health_metrics`：保存体重、体脂率、BMI、肌肉率、水分率等指标，以 recorded_at 记录采样时间。
- `health_preferences`：保存目标体重、热量预算、饮食偏好、活动水平、睡眠/饮水目标等个性化配置。
- `health_recommendations`：保存 AI 生成的健康建议，包括摘要、饮食建议、热量管理、体重管理、水分补充和生活方式建议等。
- `health_assistant_messages`：保存 AI 对话历史（用户与助手消息、need_change、change_log、时间戳），便于拼装上下文与回溯记录。

## 用法示例
```bash
# 创建体测数据
curl -X POST http://localhost:8000/api/health/metrics \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
        "weight_kg": 68.5,
        "body_fat_percent": 20.1,
        "bmi": 22.5,
        "muscle_percent": 38.0,
        "water_percent": 55.4
      }'

# 生成 AI 建议（会自动保存到数据库）
 curl -X POST http://localhost:8000/api/health/recommendations \
   -H "Authorization: Bearer <token>"

# 获取最新保存的健康建议
 curl -X GET http://localhost:8000/api/health/recommendations/latest \
   -H "Authorization: Bearer <token>"
```
