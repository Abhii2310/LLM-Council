from __future__ import annotations

from services.llm_service import generate_completion
from utils.config import settings


async def generate_chatgpt_response(query: str) -> str:
    if not settings.chatgpt_enabled or not settings.openai_api_key:
        return "ChatGPT validation unavailable: set OPENAI_API_KEY and CHATGPT_ENABLED=true."

    prompt = (
        "Answer the user query with a concise, correct response. "
        "Prioritize factual clarity and structure.\n\n"
        f"Query:\n{query}\n"
    )
    result = await generate_completion(
        model=settings.chatgpt_model,
        prompt=prompt,
        timeout=float(settings.request_timeout_seconds),
    )
    return (result.get("content") or "").strip()
