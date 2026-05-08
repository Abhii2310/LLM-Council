from __future__ import annotations

import asyncio
import re
import socket
import time
from typing import List

from llm_council.collector import CollectedResponse, gather_with_concurrency, timeout_seconds
from llm_council.models import COUNCIL_MODELS
from services.llm_service import generate_completion
from services.safety_service import redact_secrets
from utils.config import settings

_PROVIDER_KEY_MAP = {
    "groq": "groq_api_key",
    "openrouter": "openrouter_api_key",
    "openai": "openai_api_key",
    "gemini": "gemini_api_key",
    "ollama": "ollama_api_key",
    "deepseek": "deepseek_api_key",
    "cohere": "cohere_api_key",
    "cerebras": "cerebras_api_key",
    "sambanova": "sambanova_api_key",
    "cloudflare": "cloudflare_api_key",
    "nvidia_nim": "nvidia_api_key",
    "together_ai": "together_api_key",
    "aimlapi": "aimlapi_api_key",
}

# Qwen3 (and some other models) emit chain-of-thought inside <think>…</think> blocks.
# Users should never see raw reasoning — strip it before storing or returning.
_THINK_RE = re.compile(r"<think>.*?</think>", re.DOTALL | re.IGNORECASE)


def _clean_response(text: str) -> str:
    """Remove <think>…</think> blocks and any leading/trailing whitespace."""
    return _THINK_RE.sub("", text or "").strip()


def _format_provider_error(error_text: str) -> str:
    safe_text = redact_secrets(error_text or "")
    lower = safe_text.lower()
    if "model_not_found" in lower or "does not exist" in lower:
        return "Configured model unavailable on provider."
    if "invalid_api_key" in lower or "unauthor" in lower or "forbidden" in lower:
        return "Provider API key invalid or missing access."
    first_line = (safe_text or "Unknown provider error").splitlines()[0].strip()
    return first_line[:280]


def _is_ollama_reachable(host: str = "127.0.0.1", port: int = 11434, timeout: float = 0.2) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def _provider_name(model_string: str) -> str:
    value = str(model_string or "")
    return value.split("/", 1)[0] if "/" in value else value


def _is_provider_configured(provider: str) -> bool:
    if provider == "ollama":
        return True
    key_attr = _PROVIDER_KEY_MAP.get(provider)
    if not key_attr:
        return False
    return bool(getattr(settings, key_attr, None))


async def broadcast_query(query: str) -> list[CollectedResponse]:
    local_ollama_available = _is_ollama_reachable()

    rescue_chain: List[str] = []
    candidate_rescue = [
        "nvidia_nim/meta/llama-3.1-70b-instruct",
        "groq/llama-3.1-8b-instant",
        "openrouter/moonshotai/kimi-k2:free",
        "openrouter/qwen/qwen-2.5-72b-instruct",
        settings.ollama_primary_model,
        settings.ollama_fallback_model,
    ]
    for model in candidate_rescue:
        provider = _provider_name(model)
        if provider == "ollama" and not local_ollama_available:
            continue
        if not _is_provider_configured(provider):
            continue
        if model and model not in rescue_chain:
            rescue_chain.append(model)

    max_attempts = 6

    def _provider_chain(primary: str, fallbacks: List[str]) -> List[str]:
        chain = [primary] + list(fallbacks) + rescue_chain
        if settings.prefer_local_ollama and local_ollama_available:
            local_first = [settings.ollama_primary_model, settings.ollama_fallback_model]
            for m in reversed(local_first):
                if m and m not in chain:
                    chain.insert(0, m)
        if not local_ollama_available:
            chain = [m for m in chain if not str(m).startswith("ollama/")]
        filtered: List[str] = []
        for m in chain:
            provider = _provider_name(m)
            if not _is_provider_configured(provider):
                continue
            if m not in filtered:
                filtered.append(m)
        return filtered[:max_attempts]

    async def _run_one(model_key: str, display_name: str, provider_models: List[str]):
        start = time.perf_counter()
        attempted: List[str] = []
        last_error = ""
        blocked_providers: set[str] = set()

        for provider_model in provider_models:
            provider = _provider_name(provider_model)
            if provider in blocked_providers:
                continue
            attempted.append(provider_model)
            try:
                res = await asyncio.wait_for(
                    generate_completion(
                        model=provider_model,
                        prompt=query,
                        timeout=timeout_seconds(),
                    ),
                    timeout=max(1.0, float(settings.per_model_soft_timeout_seconds)),
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
                last_error = str(e)
                lower = last_error.lower()
                if "rate limit" in lower or "429" in lower:
                    blocked_providers.add(provider)

        elapsed = (time.perf_counter() - start) * 1000
        return CollectedResponse(
            model_key=model_key,
            model_name=display_name,
            provider_model=attempted[-1] if attempted else "",
            response_text="",
            error=f"{_format_provider_error(last_error)} | attempts={','.join(attempted)}",
            latency_ms=round(elapsed, 1),
        )

    tasks = [
        asyncio.create_task(
            _run_one(
                m.key,
                m.display_name,
                _provider_chain(m.provider_model, list(m.fallback_provider_models)),
            )
        )
        for m in COUNCIL_MODELS
    ]
    results = await gather_with_concurrency(tasks, limit=7)
    return list(results)

