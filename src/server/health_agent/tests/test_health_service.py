# -*- coding: utf-8 -*-
"""
健康 Agent 服务层测试
"""

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

import src.server.health_agent.models  # noqa: F401
from src.server.health_agent.schemas import (
    AgentSuggestion,
    HealthMetricPayload,
    HealthPreferencePayload,
)
from src.server.health_agent.service import HealthService
from src.server.health_agent.agent_client import AgentClientError


def _build_payload(**overrides) -> HealthMetricPayload:
    base = {
        "weight_kg": 70.0,
        "body_fat_percent": 18.0,
        "bmi": 23.0,
        "muscle_percent": 40.0,
        "water_percent": 55.0,
    }
    base.update(overrides)
    return HealthMetricPayload(**base)  # type: ignore


def test_record_metric_and_validation(test_db_session: Session):
    """验证新增体测及业务校验"""
    service = HealthService(test_db_session)
    payload = _build_payload()

    result = service.record_metric(user_id=1, payload=payload)

    assert result.user_id == 1
    assert result.weight_kg == pytest.approx(70.0)
    assert result.body_fat_percent == pytest.approx(18.0)

    with pytest.raises(HTTPException) as exc_info:
        service.record_metric(
            user_id=1,
            payload=_build_payload(body_fat_percent=70.0, muscle_percent=40.0),
        )

    assert exc_info.value.status_code == 400
    assert "不能超过 100%" in exc_info.value.detail


def test_preferences_roundtrip(test_db_session: Session):
    """验证偏好设置的新增与读取"""
    service = HealthService(test_db_session)
    payload = HealthPreferencePayload(
        target_weight_kg=65.5,
        calorie_budget_kcal=2000,
        dietary_preference="高蛋白",
        activity_level="moderate",
        sleep_goal_hours=7.5,
        hydration_goal_liters=2.5,
    )

    updated = service.update_preferences(user_id=2, payload=payload)
    assert updated.user_id == 2
    assert updated.target_weight_kg == pytest.approx(65.5)
    assert updated.dietary_preference == "高蛋白"

    fetched = service.get_preferences(user_id=2)
    assert fetched is not None
    assert fetched.calorie_budget_kcal == 2000


def test_build_agent_context_without_metric(test_db_session: Session):
    """没有体测数据时提示用户先录入"""
    service = HealthService(test_db_session)

    with pytest.raises(HTTPException) as exc_info:
        service.build_agent_context(user_id=3)

    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_request_agent_suggestion_success(test_db_session: Session):
    """验证 Agent 返回的建议结构"""
    service = HealthService(test_db_session)
    service.record_metric(user_id=4, payload=_build_payload())
    context = service.build_agent_context(user_id=4)

    class StubClient:
        async def fetch_suggestion(self, prompt):
            assert any(
                "体重" in item["content"] for item in prompt if item["role"] == "user"
            )
            return AgentSuggestion(
                summary="保持现状即可",
                meal_plan=["早餐增加蛋白质"],
                calorie_management=["控制总热量摄入 2000 kcal"],
                weight_management=["每周力量训练 3 次"],
                hydration=["每日饮水 2.5 升"],
                lifestyle=["保持 7 小时睡眠"],
            )

    suggestion = await service.request_agent_suggestion(context, client=StubClient())  # type: ignore

    assert suggestion.summary == "保持现状即可"
    assert suggestion.meal_plan[0].startswith("早餐")


@pytest.mark.asyncio
async def test_request_agent_suggestion_failure(test_db_session: Session):
    """LLM 调用失败时抛出 503"""
    service = HealthService(test_db_session)
    service.record_metric(user_id=5, payload=_build_payload())
    context = service.build_agent_context(user_id=5)

    class FailingClient:
        async def fetch_suggestion(self, prompt):
            raise AgentClientError("LLM 不可用")

    with pytest.raises(HTTPException) as exc_info:
        await service.request_agent_suggestion(context, client=FailingClient())  # type: ignore

    assert exc_info.value.status_code == 503
    assert "LLM 不可用" in exc_info.value.detail
