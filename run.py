#!/usr/bin/env python
import uvicorn
import os
from dotenv import load_dotenv
from pathlib import Path

from loguru import logger

if __name__ == "__main__":
    logger.info("健康 Agent 开始启动！")
    load_dotenv(Path.cwd() / ".env")
    logger.info(f"当前应用环境：{os.getenv('APP_ENV')}")
    log_level = os.getenv("LOG_LEVEL", "INFO").lower()

    uvicorn.run(
        "src.server.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 3000)),
        reload=True,
        log_level=log_level.lower(),
    )
