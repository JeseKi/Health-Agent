# -*- coding: utf-8 -*-
"""
健康 Agent 模块数据库模型

文件功能：
    定义健康指标与个性化偏好的 ORM 模型，负责数据持久化结构。

公开接口：
    - `HealthMetric`：记录单次健康体测数据
    - `HealthPreference`：记录用户的健康目标与偏好

内部方法：
    - 无

公开接口的 pydantic 模型：
    - 无（由本模块的 schemas 单独定义并在 service/路由层使用）

设计说明：
    - user_id 为普通整型字段，不建立数据库外键，遵循项目在 service 层处理跨表关联的规范。
    - recorded_at 与 updated_at 统一使用 UTC，方便在前端进行本地化。
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, Integer, String, Text, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column

from src.server.database import Base


class HealthMetric(Base):
    """用户健康指标记录"""

    __tablename__ = "health_metrics"
    __table_args__ = (
        Index("idx_health_metrics_user_recorded", "user_id", "recorded_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    body_fat_percent: Mapped[float] = mapped_column(Float, nullable=False)
    bmi: Mapped[float] = mapped_column(Float, nullable=False)
    muscle_percent: Mapped[float] = mapped_column(Float, nullable=False)
    water_percent: Mapped[float] = mapped_column(Float, nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


class HealthPreference(Base):
    """用户健康管理偏好"""

    __tablename__ = "health_preferences"
    __table_args__ = (UniqueConstraint("user_id", name="uq_health_preferences_user"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    target_weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    calorie_budget_kcal: Mapped[int | None] = mapped_column(Integer, nullable=True)
    dietary_preference: Mapped[str | None] = mapped_column(String(80), nullable=True)
    activity_level: Mapped[str | None] = mapped_column(String(40), nullable=True)
    sleep_goal_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    hydration_goal_liters: Mapped[float | None] = mapped_column(Float, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
