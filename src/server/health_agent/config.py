# -*- coding: utf-8 -*-
"""
健康代理配置

公开接口：
- `health_agent_config`
"""

from pydantic import Field
from pydantic_settings import BaseSettings


class HealthAgentConfig(BaseSettings):
    """健康代理配置"""

    openai_base_url: str = Field(
        default="",
        title="OpenAI 基础 URL",
        description="OpenAI 兼容接口的基础 URL，生产环境必须通过环境变量覆盖",
    )
    openai_api_key: str = Field(
        default="",
        title="OpenAI API 密钥",
        description="OpenAI 兼容接口的 API 密钥，生产环境必须通过环境变量覆盖",
    )
    openai_model: str = Field(
        default="gpt-4o-mini",
        title="OpenAI 模型名称",
        description="使用的模型名称，默认为 gpt-4o-mini",
    )


health_agent_config = HealthAgentConfig()
