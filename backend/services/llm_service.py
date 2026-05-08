from __future__ import annotations

from typing import Any, Dict, Optional

from litellm import acompletion

# System prompt for ALL council models — ensures rich, complete answers
_COUNCIL_SYSTEM_PROMPT = (
    "You are a highly capable AI assistant. "
    "Provide clear, well-structured, and thorough answers. "
    "Use paragraphs or bullet points as appropriate. "
    "Be informative and direct — avoid filler phrases, repetition, or unnecessary disclaimers. "
    "Always complete your final sentence. "
    "Do not invent facts. If a factual detail is uncertain or not present in given context, "
    "state that clearly and ask for a reliable source or more details."
)


def _build_user_message(prompt: str) -> str:
    return (
        "User query:\n"
        f"{prompt}\n\n"
        "Grounding rules:\n"
        "- Use the provided prompt context as primary grounding.\n"
        "- If factual detail is uncertain or missing, say so clearly instead of guessing.\n"
        "- Keep the response relevant to the latest user query and its session context."
    )


async def generate_completion(
    *,
    model: str,
    prompt: str,
    temperature: float = 0.4,
    max_tokens: int = 1024,
    timeout: Optional[float] = None,
) -> Dict[str, Any]:
    resp = await acompletion(
        model=model,
        messages=[
            {"role": "system", "content": _COUNCIL_SYSTEM_PROMPT},
            {"role": "user", "content": _build_user_message(prompt)},
        ],
        temperature=temperature,
        max_tokens=max_tokens,
        timeout=timeout,
    )

    choice = (resp.get("choices") or [{}])[0]
    message = choice.get("message") or {}
    content = message.get("content") or ""

    return {
        "content": content,
        "raw": resp,
    }
