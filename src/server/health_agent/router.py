# -*- coding: utf-8 -*-
"""
健康 Agent 模块路由

文件功能：
    提供健康数据管理与 AI 建议相关的 REST API。

公开接口：
     - POST /api/health/metrics
     - GET /api/health/metrics/latest
     - GET /api/health/metrics/history
     - GET /api/health/preferences
     - PUT /api/health/preferences
     - POST /api/health/recommendations
     - GET /api/health/recommendations/latest

内部方法：
    - 无

公开接口的 pydantic 模型：
     - `HealthMetricPayload`
     - `HealthMetricOut`
     - `HealthPreferencePayload`
     - `HealthPreferenceOut`
     - `HealthRecommendationOut`
     - `AgentSuggestion`
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.server.auth.dependencies import get_current_user
from src.server.auth.models import User
from src.server.dao.dao_base import run_in_thread
from src.server.database import get_db
from .schemas import (
    AgentContext,
    AgentSuggestion,
    HealthMetricOut,
    HealthMetricPayload,
    HealthPreferenceOut,
    HealthPreferencePayload,
    HealthRecommendationOut,
)
from .service import HealthService

router = APIRouter(prefix="/api/health", tags=["健康管理"])


@router.post(
    "/metrics",
    response_model=HealthMetricOut,
    status_code=status.HTTP_201_CREATED,
    summary="新增健康指标记录",
)
async def create_metric(
    payload: HealthMetricPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HealthMetricOut:
    service = HealthService(db)

    def _create() -> HealthMetricOut:
        return service.record_metric(current_user.id, payload)

    return await run_in_thread(_create)


@router.get(
    "/metrics/latest",
    response_model=HealthMetricOut,
    summary="获取最新健康指标",
)
async def get_latest_metric(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HealthMetricOut:
    service = HealthService(db)

    def _fetch() -> HealthMetricOut | None:
        return service.get_latest_metric(current_user.id)

    metric = await run_in_thread(_fetch)
    if metric is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="尚无健康指标记录。"
        )
    return metric


@router.get(
    "/metrics/history",
    response_model=list[HealthMetricOut],
    summary="分页获取历史健康指标",
)
async def get_metric_history(
    limit: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[HealthMetricOut]:
    service = HealthService(db)

    def _fetch() -> list[HealthMetricOut]:
        return service.list_metrics(current_user.id, limit=limit)

    return await run_in_thread(_fetch)


@router.get(
    "/preferences",
    response_model=HealthPreferenceOut,
    summary="获取个人健康偏好",
)
async def get_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HealthPreferenceOut:
    service = HealthService(db)

    def _fetch() -> HealthPreferenceOut | None:
        return service.get_preferences(current_user.id)

    preference = await run_in_thread(_fetch)
    if preference is None:
        return HealthPreferenceOut(
            user_id=current_user.id,
            target_weight_kg=None,
            calorie_budget_kcal=None,
            dietary_preference=None,
            activity_level=None,
            sleep_goal_hours=None,
            hydration_goal_liters=None,
        )
    return preference


@router.put(
    "/preferences",
    response_model=HealthPreferenceOut,
    summary="更新个人健康偏好",
)
async def update_preferences(
    payload: HealthPreferencePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HealthPreferenceOut:
    service = HealthService(db)

    def _update() -> HealthPreferenceOut:
        return service.update_preferences(current_user.id, payload)

    return await run_in_thread(_update)


@router.post(
    "/recommendations",
    response_model=AgentSuggestion,
    summary="生成 AI 健康建议",
)
async def generate_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AgentSuggestion:
    service = HealthService(db)

    def _build() -> AgentContext:
        return service.build_agent_context(current_user.id)

    context = await run_in_thread(_build)
    return await service.request_agent_suggestion(context)


@router.get(
    "/recommendations/latest",
    response_model=HealthRecommendationOut,
    summary="获取最新健康建议",
)
async def get_latest_recommendation(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HealthRecommendationOut:
    service = HealthService(db)

    def _fetch() -> HealthRecommendationOut | None:
        return service.get_latest_recommendation(current_user.id)

    recommendation = await run_in_thread(_fetch)
    if recommendation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="尚无健康建议记录。"
        )
    return recommendation
