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
     - GET /api/health/assistant/messages
     - POST /api/health/assistant/chat/stream

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

import json

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from src.server.auth.dependencies import get_current_user
from src.server.auth.models import User
from src.server.dao.dao_base import run_in_thread
from src.server.database import get_db
from .agent_client import AgentClientError
from .schemas import (
    AgentContext,
    AgentSuggestion,
    AgentChatMessage,
    AssistantMessageOut,
    AssistantMessagePayload,
    AssistantStreamChunk,
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


@router.get(
    "/assistant/messages",
    response_model=list[AssistantMessageOut],
    summary="获取 AI 助手历史消息",
)
async def list_assistant_messages(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AssistantMessageOut]:
    service = HealthService(db)

    def _fetch() -> list[AssistantMessageOut]:
        return service.list_assistant_messages(current_user.id, limit=limit)

    return await run_in_thread(_fetch)


@router.post(
    "/assistant/chat/stream",
    summary="与 AI 助手流式对话",
    response_class=StreamingResponse,
)
async def stream_assistant_chat(
    payload: AssistantMessagePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    service = HealthService(db)

    def _build_context() -> AgentContext:
        return service.build_agent_context(current_user.id)

    def _build_history() -> list[AgentChatMessage]:
        return service.build_chat_history(current_user.id, limit=50)

    context = await run_in_thread(_build_context)
    history = await run_in_thread(_build_history)
    request = service.compose_chat_request(context, history, payload.content)

    await run_in_thread(
        lambda: service.save_assistant_message(
            current_user.id, "user", request.user_input
        )
    )

    async def event_generator():
        try:
            async for chunk in service.stream_chat(request):
                yield _format_sse(chunk)
                if chunk.is_final:
                    await run_in_thread(
                        lambda: service.save_assistant_message(
                            current_user.id,
                            "assistant",
                            chunk.content,
                            need_change=chunk.need_change,
                            change_log=chunk.change_log,
                        )
                    )
                    if chunk.need_change and chunk.change_log:
                        await run_in_thread(
                            lambda: service.apply_change_log(
                                current_user.id, chunk.change_log
                            )
                        )
        except AgentClientError as exc:
            error_chunk = AssistantStreamChunk(
                content=f"AI 助手暂时不可用：{exc}",
                need_change=False,
                change_log=[],
                is_final=True,
            )
            yield _format_sse(error_chunk)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"},
    )


def _format_sse(chunk: AssistantStreamChunk) -> str:
    payload = json.dumps(chunk.model_dump(mode="json"), ensure_ascii=False)
    return f"data: {payload}\n\n"
