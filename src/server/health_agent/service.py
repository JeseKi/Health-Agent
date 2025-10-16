# -*- coding: utf-8 -*-
"""
健康 Agent 模块服务层

文件功能：
    聚合健康数据的业务逻辑，提供指标记录、偏好维护以及 Agent 建议生成等公开接口。

公开接口：
    - `HealthService`

内部方法：
    - `_validate_metric_payload`
    - `_compose_prompt`

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
        prompt = self._compose_prompt(context)
        try:
            return await agent_client.fetch_suggestion(prompt)
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

    def _compose_prompt(self, context: AgentContext) -> list[dict[str, str]]:
        metric = context.metric
        preference = context.preference

        metric_lines = [
            f"体重: {metric.weight_kg:.1f} kg",
            f"体脂率: {metric.body_fat_percent:.1f}%",
            f"BMI: {metric.bmi:.1f}",
            f"肌肉率: {metric.muscle_percent:.1f}%",
            f"水分率: {metric.water_percent:.1f}%",
            f"记录时间: {metric.recorded_at.isoformat()}",
        ]
        if metric.note:
            metric_lines.append(f"备注: {metric.note}")

        preference_lines: list[str] = []
        if preference:
            if preference.target_weight_kg is not None:
                preference_lines.append(
                    f"目标体重: {preference.target_weight_kg:.1f} kg"
                )
            if preference.calorie_budget_kcal is not None:
                preference_lines.append(
                    f"热量预算: {preference.calorie_budget_kcal} kcal/日"
                )
            if preference.dietary_preference:
                preference_lines.append(f"饮食偏好: {preference.dietary_preference}")
            if preference.activity_level:
                preference_lines.append(f"活动水平: {preference.activity_level}")
            if preference.sleep_goal_hours is not None:
                preference_lines.append(
                    f"睡眠目标: {preference.sleep_goal_hours:.1f} 小时"
                )
            if preference.hydration_goal_liters is not None:
                preference_lines.append(
                    f"饮水目标: {preference.hydration_goal_liters:.1f} 升"
                )

        user_content = "\n".join(
            [
                "请根据以下用户的健康指标和偏好，生成 JSON 格式的建议，字段包括：",
                "summary（字符串），meal_plan（字符串数组），calorie_management（字符串数组），weight_management（字符串数组），hydration（字符串数组），lifestyle（字符串数组）。",
                "",
                "【健康指标】",
                *metric_lines,
            ]
            + (["", "【健康偏好】", *preference_lines] if preference_lines else [])
            + [
                "",
                "请确保返回值可以被 JSON.parse 正常解析。",
            ]
        )

        system_prompt = (
            "你是智能健康顾问，需要针对体重管理、饮食和生活方式给出结构化建议。"
        )

        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ]
