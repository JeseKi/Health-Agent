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
    - `AgentContext`
    - `AgentSuggestion`

设计说明：
    - 服务层承担业务校验，路由只负责装配与线程切换。
"""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from .agent_client import AgentClient, AgentClientError
from .dao import HealthDataDAO
from .schemas import (
    AgentContext,
    AgentSuggestion,
    HealthMetricOut,
    HealthMetricPayload,
    HealthPreferenceOut,
    HealthPreferencePayload,
)


class HealthService:
    """健康数据与 Agent 建议业务逻辑"""

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
            return await agent_client.fetch_suggestion(context)
        except AgentClientError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(exc),
            ) from exc

    def _validate_metric_payload(self, payload: HealthMetricPayload) -> None:
        total_ratio = payload.body_fat_percent + payload.muscle_percent
        if total_ratio > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="体脂率与肌肉率之和不能超过 100%。",
            )
