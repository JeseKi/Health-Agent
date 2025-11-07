# -*- coding: utf-8 -*-
"""
健康 Agent 模块服务层

文件功能：
    聚合健康数据的业务逻辑，提供指标记录、偏好维护以及 Agent 建议生成等公开接口。

公开接口：
    - `HealthService`

内部方法：
    - `_validate_metric_payload`

公开接口的 pydantic 模型：
     - `HealthMetricPayload`
     - `HealthPreferencePayload`
     - `HealthRecommendationOut`
     - `AgentContext`
     - `AgentSuggestion`

设计说明：
    - 服务层承担业务校验，路由只负责装配与线程切换。
"""

from __future__ import annotations

import re
from typing import AsyncIterator, List

from fastapi import HTTPException, status
from loguru import logger
from sqlalchemy.orm import Session

from .agent_client import AgentClient, AgentClientError
from .dao import HealthDataDAO
from .schemas import (
    AgentChangeItem,
    AgentChatMessage,
    AgentChatRequest,
    AgentContext,
    AgentSuggestion,
    AssistantMessageOut,
    AssistantStreamChunk,
    HealthMetricOut,
    HealthMetricPayload,
    HealthPreferenceOut,
    HealthPreferencePayload,
    HealthRecommendationOut,
)


class HealthService:
    """健康数据与 Agent 建议业务逻辑"""

    _FIELD_RULES: dict[str, dict[str, str]] = {
        "weight_kg": {"scope": "metric", "type": "float"},
        "body_fat_percent": {"scope": "metric", "type": "float"},
        "bmi": {"scope": "metric", "type": "float"},
        "muscle_percent": {"scope": "metric", "type": "float"},
        "water_percent": {"scope": "metric", "type": "float"},
        "note": {"scope": "metric", "type": "str"},
        "target_weight_kg": {"scope": "preference", "type": "float"},
        "calorie_budget_kcal": {"scope": "preference", "type": "int"},
        "dietary_preference": {"scope": "preference", "type": "str"},
        "activity_level": {"scope": "preference", "type": "str"},
        "sleep_goal_hours": {"scope": "preference", "type": "float"},
        "hydration_goal_liters": {"scope": "preference", "type": "float"},
    }

    _NUMERIC_PATTERN = re.compile(r"[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?")

    def __init__(self, db_session: Session):
        self.dao = HealthDataDAO(db_session)

    def record_metric(
        self, user_id: int, payload: HealthMetricPayload
    ) -> HealthMetricOut:
        self._validate_metric_payload(payload)
        metric = self.dao.create_metric(user_id, payload)
        return HealthMetricOut.model_validate(metric)

    def get_latest_metric(self, user_id: int) -> HealthMetricOut | None:
        metric = self.dao.get_latest_metric(user_id)
        return HealthMetricOut.model_validate(metric) if metric is not None else None

    def list_metrics(self, user_id: int, limit: int = 30) -> list[HealthMetricOut]:
        records = self.dao.list_metrics(user_id, limit)
        return [HealthMetricOut.model_validate(item) for item in records]

    def get_preferences(self, user_id: int) -> HealthPreferenceOut | None:
        preference = self.dao.get_preferences(user_id)
        return (
            HealthPreferenceOut.model_validate(preference)
            if preference is not None
            else None
        )

    def update_preferences(
        self, user_id: int, payload: HealthPreferencePayload
    ) -> HealthPreferenceOut:
        preference = self.dao.upsert_preferences(user_id, payload)
        return HealthPreferenceOut.model_validate(preference)

    def build_agent_context(self, user_id: int) -> AgentContext:
        metric = self.dao.get_latest_metric(user_id)
        if metric is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="尚未记录健康数据，请先添加体测记录。",
            )

        preference = self.dao.get_preferences(user_id)
        return AgentContext(
            metric=HealthMetricOut.model_validate(metric),
            preference=(
                HealthPreferenceOut.model_validate(preference)
                if preference is not None
                else None
            ),
        )

    async def request_agent_suggestion(
        self, context: AgentContext, *, client: AgentClient | None = None
    ) -> AgentSuggestion:
        agent_client = client or AgentClient()
        try:
            suggestion = await agent_client.fetch_suggestion(context)

            # 保存建议到数据库
            self.dao.create_recommendation(context.metric.user_id, suggestion)

            return suggestion
        except AgentClientError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(exc),
            ) from exc

    def get_latest_recommendation(self, user_id: int) -> HealthRecommendationOut | None:
        """获取用户最新的健康建议"""
        recommendation = self.dao.get_latest_recommendation(user_id)
        return (
            HealthRecommendationOut.model_validate(recommendation)
            if recommendation is not None
            else None
        )

    def list_assistant_messages(
        self, user_id: int, limit: int = 50
    ) -> list[AssistantMessageOut]:
        """获取 AI 助手历史对话"""
        records = self.dao.list_assistant_messages(user_id, limit)
        return [AssistantMessageOut.model_validate(item) for item in records]

    def build_chat_history(
        self, user_id: int, limit: int = 50
    ) -> List[AgentChatMessage]:
        """整理为 BAML 可消费的历史消息"""
        history = []
        for message in self.list_assistant_messages(user_id, limit):
            history.append(
                AgentChatMessage(
                    role=message.role,
                    content=message.content,
                    need_change=message.need_change,
                    change_log=message.change_log,
                )
            )
        return history

    def compose_chat_request(
        self,
        context: AgentContext,
        history: List[AgentChatMessage],
        user_input: str,
    ) -> AgentChatRequest:
        """根据上下文构造聊天请求"""
        if not user_input.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="请输入有效的对话内容。",
            )
        return AgentChatRequest(
            metric=context.metric,
            preference=context.preference,
            history=history,
            user_input=user_input.strip(),
        )

    def save_assistant_message(
        self,
        user_id: int,
        role: str,
        content: str,
        *,
        need_change: bool = False,
        change_log: List[AgentChangeItem] | None = None,
    ) -> AssistantMessageOut:
        """保存对话消息"""
        record = self.dao.create_assistant_message(
            user_id=user_id,
            role=role,
            content=content,
            need_change=need_change,
            change_log=[item.model_dump() for item in (change_log or [])],
        )
        return AssistantMessageOut.model_validate(record)

    async def stream_chat(
        self,
        request: AgentChatRequest,
        *,
        client: AgentClient | None = None,
    ) -> AsyncIterator[AssistantStreamChunk]:
        """调用 LLM 执行流式对话"""
        agent_client = client or AgentClient()
        async for chunk in agent_client.stream_chat(request):
            yield AssistantStreamChunk(
                content=chunk.response.content,
                need_change=chunk.response.need_change,
                change_log=chunk.response.change_log,
                is_final=chunk.is_final,
            )

    def apply_change_log(self, user_id: int, changes: List[AgentChangeItem]) -> None:
        """根据 change_log 更新数据库"""
        if not changes:
            return

        metric_updates: dict[str, float | str] = {}
        preference_updates: dict[str, float | int | str | None] = {}

        for item in changes:
            config = self._FIELD_RULES.get(item.field)
            if config is None:
                logger.warning("未知字段，忽略 change_log 项: {}", item.field)
                continue
            parsed_value = self._parse_change_value(config["type"], item.value)
            if parsed_value is None:
                logger.warning("无法解析字段 {} 的值: {}", item.field, item.value)
                continue

            if config["scope"] == "metric":
                metric_updates[item.field] = parsed_value  # type: ignore[assignment]
            else:
                preference_updates[item.field] = parsed_value

        if metric_updates:
            try:
                self.dao.update_latest_metric_fields(user_id, metric_updates)
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="尚未记录健康数据，无法同步 AI 修改结果。",
                ) from exc
        if preference_updates:
            self.dao.apply_preference_updates(user_id, preference_updates)

    def _validate_metric_payload(self, payload: HealthMetricPayload) -> None:
        total_ratio = payload.body_fat_percent + payload.muscle_percent
        if total_ratio > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="体脂率与肌肉率之和不能超过 100%。",
            )

    def _parse_change_value(
        self, value_type: str, raw_value: str | float | int | None
    ) -> float | int | str | None:
        """根据字段类型解析 change_log 数值"""
        if raw_value is None:
            return None

        if value_type == "str":
            return str(raw_value).strip()

        text = str(raw_value).strip()
        text = text.replace("%", "").replace("％", "")
        match = self._NUMERIC_PATTERN.search(text)
        if match:
            text = match.group(0)

        if not text:
            return None

        try:
            number = float(text)
        except ValueError:
            return None

        if value_type == "int":
            return int(round(number))
        return round(number, 2)
