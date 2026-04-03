from __future__ import annotations

import time
from typing import Dict, Optional

import httpx

from utils.config import settings

# ─── Prompt ───────────────────────────────────────────────────────────────────
SYSTEM_INSTRUCTION = (
    "You are a concise AI validator. "
    "Answer in 3–5 clear, well-written paragraphs or bullet points. "
    "Be informative but avoid unnecessary filler, repetition, or long preambles. "
    "Always complete your final sentence — never stop mid-thought."
)

# ─── Models ───────────────────────────────────────────────────────────────────
_GEMINI_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
]

_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

# ─── Quota state cache (in-process, resets if server restarts) ─────────────
# key = model name, value = unix timestamp when quota was marked exhausted
_QUOTA_EXHAUSTED_AT: Dict[str, float] = {}
_QUOTA_COOLDOWN_SECONDS = 3600  # skip an exhausted model for 1 hour


def _is_quota_exhausted(model: str) -> bool:
    ts = _QUOTA_EXHAUSTED_AT.get(model)
    if ts is None:
        return False
    if time.time() - ts > _QUOTA_COOLDOWN_SECONDS:
        # Cooldown elapsed — allow retry
        del _QUOTA_EXHAUSTED_AT[model]
        return False
    return True


def _mark_quota_exhausted(model: str) -> None:
    _QUOTA_EXHAUSTED_AT[model] = time.time()


# ─── Gemini model caller ───────────────────────────────────────────────────
async def _call_gemini_model(
    client: httpx.AsyncClient,
    model: str,
    query: str,
) -> Optional[str]:
    """
    Call one Gemini model. Returns the response text on success,
    None on quota/not-found (so the caller tries the next model).
    """
    url = f"{_BASE_URL}/{model}:generateContent?key={settings.gemini_api_key}"
    payload = {
        "system_instruction": {"parts": [{"text": SYSTEM_INSTRUCTION}]},
        "contents": [{"parts": [{"text": query}]}],
        "generationConfig": {
            "temperature": 0.6,
            "maxOutputTokens": 1024,  # ~700 words — complete, never cut off
        },
    }
    response = await client.post(url, json=payload)

    if response.status_code == 429:
        _mark_quota_exhausted(model)
        return None  # quota hit — try next

    if response.status_code == 404:
        return None  # model unavailable — try next

    response.raise_for_status()
    data = response.json()

    candidates = data.get("candidates") or []
    if candidates:
        parts = (candidates[0].get("content") or {}).get("parts") or []
        if parts and "text" in parts[0]:
            return parts[0]["text"].strip()

    return ""


# ─── Groq fallback ────────────────────────────────────────────────────────
async def _call_groq_fallback(query: str) -> str:
    """Use Groq Llama 3.3 70B when all Gemini models are quota-exhausted."""
    if not settings.groq_api_key:
        return "⚠️ Gemini quota exhausted and no Groq key available for fallback."

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.groq_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": SYSTEM_INSTRUCTION},
            {"role": "user", "content": query},
        ],
        "temperature": 0.6,
        "max_tokens": 1024,
    }
    async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        content = (data.get("choices") or [{}])[0].get("message", {}).get("content", "")
        return content


# ─── Public: generate response ────────────────────────────────────────────
async def get_gemini_response(query: str) -> str:
    """
    Broadcast query to Gemini (trying models in order, skipping cached-exhausted ones).
    Falls back to Groq Llama 3.3 70B if all Gemini models are quota-limited.
    Returns clean response text — the UI attaches provider labels separately.
    """
    if not settings.gemini_enabled:
        return "Gemini validation disabled."

    if not settings.gemini_api_key:
        return "Gemini API key not configured."

    try:
        async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
            for model in _GEMINI_MODELS:
                if _is_quota_exhausted(model):
                    continue  # skip without making an API call

                try:
                    result = await _call_gemini_model(client, model, query)
                    if result is not None:
                        return result  # ✅ success
                    # None = quota/404 — try next
                except httpx.HTTPStatusError as e:
                    if e.response.status_code == 403:
                        return "⚠️ Gemini API key invalid or unauthorised."
                    continue
                except Exception:
                    continue

        # All Gemini models exhausted — use Groq
        return await _call_groq_fallback(query)

    except Exception as e:
        return f"Gemini error: {e}"


# ─── Public: quota status check (used by /gemini/status endpoint) ─────────
async def check_gemini_status() -> dict:
    """
    Lightweight status check: tries a tiny 1-token prompt against each model
    and returns quota / availability info for the dashboard endpoint.
    Does NOT generate a real response — uses minimal tokens.
    """
    if not settings.gemini_api_key:
        return {
            "key_configured": False,
            "models": [],
            "active_model": None,
            "groq_fallback_available": bool(settings.groq_api_key),
            "status": "no_key",
        }

    model_results = []
    active_model = None

    async with httpx.AsyncClient(timeout=10) as client:
        for model in _GEMINI_MODELS:
            if _is_quota_exhausted(model):
                model_results.append(
                    {"model": model, "status": "quota_exhausted_cached", "available": False}
                )
                continue

            url = f"{_BASE_URL}/{model}:generateContent?key={settings.gemini_api_key}"
            payload = {
                "contents": [{"parts": [{"text": "hi"}]}],
                "generationConfig": {"maxOutputTokens": 1},
            }
            try:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    if active_model is None:
                        active_model = model
                    model_results.append({"model": model, "status": "ok", "available": True})
                elif resp.status_code == 429:
                    _mark_quota_exhausted(model)
                    model_results.append(
                        {"model": model, "status": "quota_exceeded", "available": False}
                    )
                elif resp.status_code == 404:
                    model_results.append(
                        {"model": model, "status": "not_found", "available": False}
                    )
                elif resp.status_code == 403:
                    model_results.append(
                        {"model": model, "status": "invalid_key", "available": False}
                    )
                else:
                    model_results.append(
                        {"model": model, "status": f"http_{resp.status_code}", "available": False}
                    )
            except Exception as exc:
                model_results.append(
                    {"model": model, "status": f"error: {exc}", "available": False}
                )

    overall = (
        "ok"
        if active_model
        else ("groq_fallback" if settings.groq_api_key else "all_exhausted")
    )

    return {
        "key_configured": True,
        "models": model_results,
        "active_model": active_model,
        "groq_fallback_available": bool(settings.groq_api_key),
        "status": overall,
        "cooldown_seconds": _QUOTA_COOLDOWN_SECONDS,
    }
