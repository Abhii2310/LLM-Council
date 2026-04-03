from __future__ import annotations

import asyncio
import re
import time

from llm_council.collector import CollectedResponse, gather_with_concurrency, timeout_seconds
from llm_council.models import COUNCIL_MODELS
from services.llm_service import generate_completion

# Qwen3 (and some other models) emit chain-of-thought inside <think>…</think> blocks.
# Users should never see raw reasoning — strip it before storing or returning.
_THINK_RE = re.compile(r"<think>.*?</think>", re.DOTALL | re.IGNORECASE)


def _clean_response(text: str) -> str:
    """Remove <think>…</think> blocks and any leading/trailing whitespace."""
    return _THINK_RE.sub("", text or "").strip()


async def broadcast_query(query: str) -> list[CollectedResponse]:
    async def _run_one(model_key: str, display_name: str, provider_model: str):
        start = time.perf_counter()
        try:
            res = await generate_completion(
                model=provider_model,
                prompt=query,
                timeout=timeout_seconds(),
            )
            elapsed = (time.perf_counter() - start) * 1000
            raw = (res.get("content") or "").strip()
            return CollectedResponse(
                model_key=model_key,
                model_name=display_name,
                provider_model=provider_model,
                response_text=_clean_response(raw),
                error=None,
                latency_ms=round(elapsed, 1),
            )
        except Exception as e:  # noqa: BLE001
            elapsed = (time.perf_counter() - start) * 1000
            return CollectedResponse(
                model_key=model_key,
                model_name=display_name,
                provider_model=provider_model,
                response_text="",
                error=str(e),
                latency_ms=round(elapsed, 1),
            )

    tasks = [
        asyncio.create_task(_run_one(m.key, m.display_name, m.provider_model))
        for m in COUNCIL_MODELS
    ]
    results = await gather_with_concurrency(tasks, limit=5)
    return list(results)

