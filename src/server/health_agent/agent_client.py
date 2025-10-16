# -*- coding: utf-8 -*-
"""
健康 Agent LLM 客户端

文件功能：
    封装对 OpenAI 兼容接口的访问，负责向大语言模型请求健康建议并返回结构化结果。

公开接口：
    - `AgentClient`
    - `AgentClientError`

内部方法：
    - `_extract_content`
    - `_normalize_list`

公开接口的 pydantic 模型：
    - `AgentSuggestion`（来自 schemas，由本模块实例化）
"""

from __future__ import annotations

import json
import os
from typing import Iterable, List, Sequence

import httpx

from .schemas import AgentSuggestion


class AgentClientError(RuntimeError):
    """LLM 客户端异常"""


class AgentClient:
    """面向 OpenAI 兼容接口的健康建议客户端"""

    def __init__(
        self,
        base_url: str | None = None,
        api_key: str | None = None,
        model: str | None = None,
        *,
        timeout: float = 30.0,
    ):
        self.base_url = (base_url or os.getenv("OPENAI_BASE_URL") or "").rstrip("/")
        self.api_key = api_key or os.getenv("OPENAI_API_KEY") or ""
        self.model = model or os.getenv("OPENAI_MODEL") or "gpt-4o-mini"
        self.timeout = timeout

    async def fetch_suggestion(
        self, prompt: Sequence[dict[str, str]]
    ) -> AgentSuggestion:
        if not self.base_url:
            raise AgentClientError("未配置 OPENAI_BASE_URL")
        if not self.api_key:
            raise AgentClientError("未配置 OPENAI_API_KEY")

        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": list(prompt),
            "temperature": 0.7,
            "response_format": {"type": "json_object"},
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(url, headers=headers, json=payload)

        if response.status_code != 200:
            raise AgentClientError(
                f"LLM 服务调用失败，状态码 {response.status_code}：{response.text}"
            )

        content = self._extract_content(response.json())

        try:
            parsed = json.loads(content)
        except json.JSONDecodeError as exc:
            raise AgentClientError(f"LLM 返回结果无法解析为 JSON：{exc}") from exc

        return AgentSuggestion(
            summary=str(parsed.get("summary") or "暂无摘要"),
            meal_plan=self._normalize_list(parsed.get("meal_plan")),
            calorie_management=self._normalize_list(parsed.get("calorie_management")),
            weight_management=self._normalize_list(parsed.get("weight_management")),
            hydration=self._normalize_list(parsed.get("hydration")),
            lifestyle=self._normalize_list(parsed.get("lifestyle")),
        )

    def _extract_content(self, payload: dict) -> str:
        """从 OpenAI 兼容响应中提取消息内容"""
        choices = payload.get("choices")
        if not choices:
            raise AgentClientError("LLM 返回数据缺少 choices 字段")
        message = choices[0].get("message")
        if not message:
            raise AgentClientError("LLM 返回数据缺少 message 字段")
        content = message.get("content")
        if not content:
            raise AgentClientError("LLM 返回数据缺少 content 字段")
        return content

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
