# -*- coding: utf-8 -*-
"""
健康 Agent LLM 客户端

文件功能：
    通过 BAML 封装对 LLM 的访问，负责向大语言模型请求健康建议并返回结构化结果。

公开接口：
    - `AgentClient`
    - `AgentClientError`

内部方法：
    - `_normalize_list`

公开接口的 pydantic 模型：
    - `AgentSuggestion`（来自 schemas，由本模块实例化）
"""

from __future__ import annotations

from typing import Iterable, List

from baml_client.async_client import BamlAsyncClient
from baml_client.runtime import DoNotUseDirectlyCallManager
from baml_client import types

from .schemas import AgentSuggestion, HealthMetricOut, HealthPreferenceOut


class AgentClientError(RuntimeError):
    """LLM 客户端异常"""


class AgentClient:
    """通过 BAML 调用 LLM 的健康建议客户端"""

    def __init__(self):
        # 初始化 BAML 异步客户端（使用默认配置）
        self.client = BamlAsyncClient(DoNotUseDirectlyCallManager({}))

    async def fetch_suggestion(self, context) -> AgentSuggestion:
        """
        调用 BAML 定义的 GenerateHealthSuggestion 函数获取建议

        Args:
            context: 包含健康指标和偏好的上下文对象，需要转换为 BAML 类型

        Returns:
            AgentSuggestion: 结构化的健康建议

        Raises:
            AgentClientError: 当 LLM 调用失败时抛出
        """
        try:
            # 转换 Python 对象为 BAML 类型
            baml_metric = self._convert_to_baml_metric(context.metric)
            baml_preference = (
                self._convert_to_baml_preference(context.preference)
                if context.preference
                else None
            )
            baml_context = types.HealthAgentContext(
                metric=baml_metric,
                preference=baml_preference,
            )

            # 调用 BAML 函数
            result = await self.client.GenerateHealthSuggestion(baml_context)

            # 转换 BAML 结果为 Pydantic 模型
            return AgentSuggestion(
                summary=result.summary or "暂无摘要",
                meal_plan=self._normalize_list(result.meal_plan),
                calorie_management=self._normalize_list(result.calorie_management),
                weight_management=self._normalize_list(result.weight_management),
                hydration=self._normalize_list(result.hydration),
                lifestyle=self._normalize_list(result.lifestyle),
            )
        except Exception as exc:
            raise AgentClientError(f"LLM 服务调用失败: {exc}") from exc

    def _convert_to_baml_metric(self, metric: HealthMetricOut) -> types.HealthMetric:
        """将 HealthMetricOut 转换为 BAML 的 HealthMetric"""
        return types.HealthMetric(
            weight_kg=metric.weight_kg,
            body_fat_percent=metric.body_fat_percent,
            bmi=metric.bmi,
            muscle_percent=metric.muscle_percent,
            water_percent=metric.water_percent,
            recorded_at=metric.recorded_at.isoformat(),
            note=metric.note,
        )

    def _convert_to_baml_preference(
        self,
        preference: HealthPreferenceOut | None,
    ) -> types.HealthPreference | None:
        """将 HealthPreferenceOut 转换为 BAML 的 HealthPreference"""
        if preference is None:
            return None

        return types.HealthPreference(
            target_weight_kg=preference.target_weight_kg,
            calorie_budget_kcal=preference.calorie_budget_kcal,
            dietary_preference=preference.dietary_preference,
            activity_level=preference.activity_level,
            sleep_goal_hours=preference.sleep_goal_hours,
            hydration_goal_liters=preference.hydration_goal_liters,
        )

    def _normalize_list(self, value: Iterable[str] | str | None) -> List[str]:
        """将字符串或可迭代对象转换为建议列表"""
        if value is None:
            return []
        if isinstance(value, str):
            parts = [
                item.strip("-• ").strip() for item in value.splitlines() if item.strip()
            ]
            return [part for part in parts if part]
        result = []
        for item in value:
            text = str(item).strip()
            if text:
                result.append(text)
        return result
