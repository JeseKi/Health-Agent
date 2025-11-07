# -*- coding: utf-8 -*-
"""
AgentClient 模块测试

文件功能：
    验证 AgentClient 针对 LLM change_log 的清洗逻辑，确保允许的字段覆盖 HealthMetric 与 HealthPreference。

公开接口：
    - `test_sanitize_change_items_preserves_preference_fields`
    - `test_sanitize_change_items_filters_invalid_entries`

内部方法：
    - 无。

公开接口的 pydantic 模型：
    - `AgentChangeItem`（用于断言输出结构）。
"""

from baml_client import types

from src.server.health_agent.agent_client import AgentClient
from src.server.health_agent.schemas import AgentChangeItem


def test_sanitize_change_items_preserves_preference_fields():
    """偏好字段不会被过滤"""
    raw_items = [
        types.AgentChangeItem(
            field=" hydration_goal_liters ",
            value=" 2.8 L ",
            reason="用户主动调整饮水目标",
        ),
        types.AgentChangeItem(
            field="target_weight_kg",
            value="65.5",
            reason=None,
        ),
    ]

    sanitized = AgentClient.sanitize_change_items(raw_items)

    assert len(sanitized) == 2
    assert sanitized[0].field == "hydration_goal_liters"
    assert sanitized[0].value == "2.8 L"
    assert sanitized[1].field == "target_weight_kg"
    assert isinstance(sanitized[0], AgentChangeItem)


def test_sanitize_change_items_filters_invalid_entries():
    """无效字段与空值会被丢弃"""
    raw_items = [
        types.AgentChangeItem(field="unknown_field", value="1", reason=None),
        types.AgentChangeItem(field="note", value=" ", reason=None),
        types.AgentChangeItem(field="", value="abc", reason=None),
    ]

    sanitized = AgentClient.sanitize_change_items(raw_items)

    assert sanitized == []
