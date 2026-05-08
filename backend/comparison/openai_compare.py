from __future__ import annotations

from litellm import acompletion

from utils.config import settings

_SYSTEM_INSTRUCTION = (
    "You are a concise AI validator. "
    "Answer in 3–5 clear, well-written paragraphs or bullet points. "
    "Be informative but avoid unnecessary filler, repetition, or long preambles. "
    "Always complete your final sentence — never stop mid-thought."
)


def _validator_timeout_seconds() -> float:
    request_timeout = float(settings.request_timeout_seconds)
    soft_timeout = float(settings.per_model_soft_timeout_seconds)
    return max(3.0, min(request_timeout, soft_timeout))


async def get_chatgpt_response(query: str) -> str:
    if not settings.chatgpt_enabled:
        return "ChatGPT validation disabled."

    if not settings.openai_api_key:
        return "ChatGPT API key not configured."

    try:
        resp = await acompletion(
            model=settings.chatgpt_model,
            messages=[
                {"role": "system", "content": _SYSTEM_INSTRUCTION},
                {"role": "user", "content": query},
            ],
            temperature=0.4,
            max_tokens=1024,
            timeout=_validator_timeout_seconds(),
        )
        choice = (resp.get("choices") or [{}])[0]
        message = choice.get("message") or {}
        content = str(message.get("content") or "").strip()
        return content or ""
    except Exception as exc:  # noqa: BLE001
        return f"ChatGPT error: {exc}"
