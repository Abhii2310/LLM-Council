from __future__ import annotations

from typing import Any, Dict, List
from urllib.parse import quote_plus

import httpx

from utils.config import settings


def _clean_text(text: Any, limit: int = 600) -> str:
    raw = str(text or "").strip().replace("\n", " ")
    if len(raw) <= limit:
        return raw
    return raw[:limit].rstrip() + "…"


async def _fetch_tavily(query: str, deep_research: bool) -> List[Dict[str, str]]:
    if not settings.tavily_api_key:
        return []

    payload = {
        "api_key": settings.tavily_api_key,
        "query": query,
        "max_results": 6 if deep_research else 3,
        "include_answer": True,
        "search_depth": "advanced" if deep_research else "basic",
    }

    timeout_s = max(3.0, float(settings.web_research_timeout_seconds))
    async with httpx.AsyncClient(timeout=timeout_s) as client:
        resp = await client.post("https://api.tavily.com/search", json=payload)
        resp.raise_for_status()
        data = resp.json() if resp.content else {}

    rows: List[Dict[str, str]] = []
    answer = _clean_text(data.get("answer"), 400)
    if answer:
        rows.append({"source": "Tavily", "title": "Answer summary", "url": "", "snippet": answer})

    for item in data.get("results", [])[: (6 if deep_research else 3)]:
        rows.append(
            {
                "source": "Tavily",
                "title": _clean_text(item.get("title"), 120),
                "url": _clean_text(item.get("url"), 220),
                "snippet": _clean_text(item.get("content"), 420),
            }
        )
    return rows


async def _fetch_serpapi(query: str, deep_research: bool) -> List[Dict[str, str]]:
    if not settings.serpapi_api_key:
        return []

    params = {
        "engine": "google",
        "q": query,
        "api_key": settings.serpapi_api_key,
        "num": 6 if deep_research else 3,
    }

    timeout_s = max(3.0, float(settings.web_research_timeout_seconds))
    async with httpx.AsyncClient(timeout=timeout_s) as client:
        resp = await client.get("https://serpapi.com/search.json", params=params)
        resp.raise_for_status()
        data = resp.json() if resp.content else {}

    rows: List[Dict[str, str]] = []
    for item in data.get("organic_results", [])[: (6 if deep_research else 3)]:
        rows.append(
            {
                "source": "SerpAPI",
                "title": _clean_text(item.get("title"), 120),
                "url": _clean_text(item.get("link"), 220),
                "snippet": _clean_text(item.get("snippet"), 420),
            }
        )
    return rows


async def _fetch_jina_reader(query: str, deep_research: bool) -> List[Dict[str, str]]:
    if not settings.jina_api_key:
        return []

    timeout_s = max(3.0, float(settings.web_research_timeout_seconds))
    headers = {"Authorization": f"Bearer {settings.jina_api_key}"}
    url = f"https://s.jina.ai/{quote_plus(query)}"

    async with httpx.AsyncClient(timeout=timeout_s, headers=headers) as client:
        resp = await client.get(url)
        if resp.status_code >= 400:
            return []
        text = _clean_text(resp.text, 1100)

    if not text:
        return []

    return [
        {
            "source": "Jina Reader",
            "title": "Web summary",
            "url": "https://s.jina.ai/",
            "snippet": text,
        }
    ]


async def get_web_research_context(query: str, *, deep_research: bool, web_search: bool) -> Dict[str, Any]:
    if not settings.web_research_enabled or not web_search:
        return {"enabled": False, "sources": [], "context": ""}

    rows: List[Dict[str, str]] = []

    for fetcher in (_fetch_tavily, _fetch_serpapi, _fetch_jina_reader):
        try:
            rows.extend(await fetcher(query, deep_research))
        except Exception:
            continue

    deduped: List[Dict[str, str]] = []
    seen = set()
    for row in rows:
        key = (row.get("title", ""), row.get("url", ""), row.get("snippet", ""))
        if key in seen:
            continue
        seen.add(key)
        deduped.append(row)

    deduped = deduped[:10]

    if not deduped:
        return {"enabled": True, "sources": [], "context": ""}

    blocks: List[str] = []
    for idx, row in enumerate(deduped, start=1):
        title = row.get("title", "Untitled")
        source = row.get("source", "web")
        url = row.get("url", "")
        snippet = row.get("snippet", "")
        blocks.append(f"[{idx}] {title} ({source})\\nURL: {url}\\n{snippet}")

    return {"enabled": True, "sources": deduped, "context": "\\n\\n".join(blocks)}
