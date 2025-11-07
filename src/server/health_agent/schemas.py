# -*- coding: utf-8 -*-
"""
健康 Agent 模块 Pydantic 模型

文件功能：
    提供路由层与服务层使用的数据模型定义，确保输入输出的结构化与校验。

公开接口：
     - `HealthMetricPayload`
     - `HealthMetricOut`
     - `HealthPreferencePayload`
     - `HealthPreferenceOut`
     - `HealthRecommendationOut`
     - `AgentContext`
     - `AgentSuggestion`
     - `AgentChangeItem`
     - `AgentChatMessage`
     - `AgentChatRequest`
     - `AgentChatResponse`
     - `AssistantMessagePayload`
     - `AssistantMessageOut`
     - `AssistantStreamChunk`

内部方法：
    - `_ensure_timezone`

公开接口的 pydantic 模型：
    - 本文件所有模型即为公开接口。
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


def _ensure_timezone(value: datetime) -> datetime:
    """确保日期时间包含时区信息"""
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


class HealthMetricPayload(BaseModel):
    """健康指标入参模型"""

    weight_kg: float = Field(..., gt=0, lt=500, description="体重（公斤）")
    body_fat_percent: float = Field(..., ge=2, le=75, description="体脂率（百分比）")
    bmi: float = Field(..., gt=10, lt=70, description="身体质量指数")
    muscle_percent: float = Field(..., ge=10, le=80, description="肌肉率（百分比）")
    water_percent: float = Field(..., ge=20, le=80, description="水分率（百分比）")
    recorded_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="数据记录时间（默认当前 UTC）",
    )
    note: Optional[str] = Field(default=None, max_length=200, description="备注，可选")

    @field_validator("recorded_at")
    @classmethod
    def validate_recorded_at(cls, value: datetime) -> datetime:
        return _ensure_timezone(value)


class HealthMetricOut(BaseModel):
    """健康指标输出模型"""

    id: int
    user_id: int
    weight_kg: float
    body_fat_percent: float
    bmi: float
    muscle_percent: float
    water_percent: float
    recorded_at: datetime
    note: Optional[str]

    model_config = ConfigDict(from_attributes=True)


class HealthPreferencePayload(BaseModel):
    """健康偏好设置入参"""

    target_weight_kg: Optional[float] = Field(
        default=None, gt=0, lt=500, description="目标体重（公斤）"
    )
    calorie_budget_kcal: Optional[int] = Field(
        default=None, gt=600, lt=5000, description="每日热量预算"
    )
    dietary_preference: Optional[str] = Field(
        default=None, max_length=80, description="饮食偏好"
    )
    activity_level: Optional[str] = Field(
        default=None, max_length=40, description="日常活动水平"
    )
    sleep_goal_hours: Optional[float] = Field(
        default=None, ge=4, le=12, description="睡眠目标（小时）"
    )
    hydration_goal_liters: Optional[float] = Field(
        default=None, ge=1, le=6, description="每日饮水目标（升）"
    )

    @field_validator("target_weight_kg")
    @classmethod
    def validate_weight(cls, value: Optional[float]) -> Optional[float]:
        if value is None:
            return value
        return round(value, 1)

    @field_validator("sleep_goal_hours")
    @classmethod
    def validate_sleep(cls, value: Optional[float]) -> Optional[float]:
        if value is None:
            return value
        return round(value, 1)

    @field_validator("hydration_goal_liters")
    @classmethod
    def validate_hydration(cls, value: Optional[float]) -> Optional[float]:
        if value is None:
            return value
        return round(value, 1)


class HealthPreferenceOut(BaseModel):
    """健康偏好输出模型"""

    user_id: int
    target_weight_kg: Optional[float]
    calorie_budget_kcal: Optional[int]
    dietary_preference: Optional[str]
    activity_level: Optional[str]
    sleep_goal_hours: Optional[float]
    hydration_goal_liters: Optional[float]

    model_config = ConfigDict(from_attributes=True)


class AgentContext(BaseModel):
    """Agent 生成建议所需上下文"""

    metric: HealthMetricOut
    preference: Optional[HealthPreferenceOut] = None


class AgentSuggestion(BaseModel):
    """健康 Agent 返回的建议"""

    summary: str = Field(..., description="概览摘要")
    meal_plan: List[str] = Field(default_factory=list, description="饮食建议列表")
    calorie_management: List[str] = Field(
        default_factory=list, description="热量与体重管理建议"
    )
    weight_management: List[str] = Field(
        default_factory=list, description="体重管理策略"
    )
    hydration: List[str] = Field(default_factory=list, description="水分补充建议")
    lifestyle: List[str] = Field(default_factory=list, description="生活方式/运动建议")


class HealthRecommendationOut(BaseModel):
    """健康建议输出模型"""

    id: int
    user_id: int
    summary: str
    meal_plan: List[str]
    calorie_management: List[str]
    weight_management: List[str]
    hydration: List[str]
    lifestyle: List[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AgentChangeItem(BaseModel):
    """AI 助手返回的字段修改项"""

    field: str = Field(..., description="需要修改的字段名")
    value: str = Field(..., description="该字段的新值（原始字符串）")
    reason: Optional[str] = Field(default=None, description="产生修改的原因")


class AgentChatMessage(BaseModel):
    """上下文历史消息"""

    role: Literal["user", "assistant"]
    content: str
    need_change: Optional[bool] = None
    change_log: Optional[List[AgentChangeItem]] = None


class AgentChatRequest(BaseModel):
    """LLM 聊天请求"""

    metric: HealthMetricOut
    preference: Optional[HealthPreferenceOut] = None
    history: List[AgentChatMessage] = Field(default_factory=list)
    user_input: str


class AgentChatResponse(BaseModel):
    """LLM 聊天响应"""

    content: str
    need_change: bool = False
    change_log: List[AgentChangeItem] = Field(default_factory=list)

    @field_validator("change_log", mode="before")
    @classmethod
    def ensure_change_log(cls, value: Optional[List[AgentChangeItem]]):
        return value or []


class AssistantMessagePayload(BaseModel):
    """前端发送的用户消息"""

    content: str = Field(..., min_length=1, max_length=2000, description="用户输入内容")


class AssistantMessageOut(BaseModel):
    """历史消息输出"""

    id: int
    user_id: int
    role: Literal["user", "assistant"]
    content: str
    need_change: bool
    change_log: List[AgentChangeItem] = Field(default_factory=list)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_validator("change_log", mode="before")
    @classmethod
    def ensure_change_log(cls, value: Optional[List[AgentChangeItem]]):
        return value or []


class AssistantStreamChunk(BaseModel):
    """SSE 流中的片段"""

    content: str
    need_change: bool = False
    change_log: List[AgentChangeItem] = Field(default_factory=list)
    is_final: bool = False
