# -*- coding: utf-8 -*-
"""
健康 Agent 模块 DAO

文件功能：
    提供健康指标与偏好配置信息的数据库读写能力。

公开接口：
    - `HealthDataDAO`

内部方法：
    - `_apply_preference_fields`

公开接口的 pydantic 模型：
    - `HealthMetricPayload`、`HealthPreferencePayload`（由 schemas 提供，DAO 仅消费）
"""

from __future__ import annotations

from sqlalchemy import desc
from sqlalchemy.orm import Session

from src.server.dao.dao_base import BaseDAO
from .models import HealthMetric, HealthPreference
from .schemas import HealthMetricPayload, HealthPreferencePayload


class HealthDataDAO(BaseDAO):
    """健康数据访问对象"""

    def __init__(self, db_session: Session):
        super().__init__(db_session)

    def create_metric(self, user_id: int, payload: HealthMetricPayload) -> HealthMetric:
        metric = HealthMetric(
            user_id=user_id,
            weight_kg=payload.weight_kg,
            body_fat_percent=payload.body_fat_percent,
            bmi=payload.bmi,
            muscle_percent=payload.muscle_percent,
            water_percent=payload.water_percent,
            recorded_at=payload.recorded_at,
            note=payload.note,
        )
        self.db_session.add(metric)
        self.db_session.commit()
        self.db_session.refresh(metric)
        return metric

    def get_latest_metric(self, user_id: int) -> HealthMetric | None:
        return (
            self.db_session.query(HealthMetric)
            .filter(HealthMetric.user_id == user_id)
            .order_by(desc(HealthMetric.recorded_at), desc(HealthMetric.id))
            .first()
        )

    def list_metrics(self, user_id: int, limit: int = 30) -> list[HealthMetric]:
        query = (
            self.db_session.query(HealthMetric)
            .filter(HealthMetric.user_id == user_id)
            .order_by(desc(HealthMetric.recorded_at), desc(HealthMetric.id))
        )
        if limit > 0:
            query = query.limit(limit)
        return list(query.all())

    def get_preferences(self, user_id: int) -> HealthPreference | None:
        return (
            self.db_session.query(HealthPreference)
            .filter(HealthPreference.user_id == user_id)
            .first()
        )

    def upsert_preferences(
        self, user_id: int, payload: HealthPreferencePayload
    ) -> HealthPreference:
        preference = self.get_preferences(user_id)
        if preference is None:
            preference = HealthPreference(user_id=user_id)
            self.db_session.add(preference)

        self._apply_preference_fields(preference, payload)
        self.db_session.commit()
        self.db_session.refresh(preference)
        return preference

    def _apply_preference_fields(
        self, preference: HealthPreference, payload: HealthPreferencePayload
    ) -> None:
        """将 Pydantic payload 字段同步到模型实例"""
        preference.target_weight_kg = payload.target_weight_kg
        preference.calorie_budget_kcal = payload.calorie_budget_kcal
        preference.dietary_preference = payload.dietary_preference
        preference.activity_level = payload.activity_level
        preference.sleep_goal_hours = payload.sleep_goal_hours
        preference.hydration_goal_liters = payload.hydration_goal_liters
