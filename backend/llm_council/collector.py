from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import List, Optional

from utils.config import settings


@dataclass
class CollectedResponse:
    model_key: str
    model_name: str
    provider_model: str
    response_text: str
    error: Optional[str] = None
    latency_ms: Optional[float] = None


async def gather_with_concurrency(tasks: List[asyncio.Task], limit: int = 5):
    semaphore = asyncio.Semaphore(limit)

    async def _sem_task(t: asyncio.Task):
        async with semaphore:
            return await t

    return await asyncio.gather(*[_sem_task(t) for t in tasks])


def timeout_seconds() -> float:
    return float(settings.request_timeout_seconds)
