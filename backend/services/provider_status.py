from __future__ import annotations

from typing import Any

from llm_council.models import COUNCIL_MODELS
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


def provider_status_snapshot() -> dict[str, Any]:
    providers = sorted({_provider_name(m.provider_model) for m in COUNCIL_MODELS})

    rows: list[dict[str, Any]] = []
    for provider in providers:
        rows.append(
            {
                "provider": provider,
                "configured": _is_provider_configured(provider),
                "requires_api_key": provider != "ollama",
            }
        )

    models = [
        {
            "key": m.key,
            "display_name": m.display_name,
            "provider_model": m.provider_model,
            "fallback_provider_models": list(m.fallback_provider_models),
        }
        for m in COUNCIL_MODELS
    ]

    return {
        "providers": rows,
        "models": models,
        "prefer_local_ollama": bool(settings.prefer_local_ollama),
        "ollama_primary_model": settings.ollama_primary_model,
        "ollama_fallback_model": settings.ollama_fallback_model,
    }
