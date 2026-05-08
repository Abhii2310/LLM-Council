from __future__ import annotations

import re
from typing import Any, Dict, List

from database.db import (
    fetch_feedback_insights,
    fetch_feedback_model_bias,
    fetch_reliability_insights,
    fetch_recent,
    insert_evaluation,
    insert_feedback_event,
)

_FOLLOW_UP_RE = re.compile(
    r"\b(it|that|this|those|these|they|them|he|she|above|earlier|previous|same|again|continue|summarize|shorten)\b",
    re.IGNORECASE,
)


def _is_main_turn(query: str) -> bool:
    text = str(query or "").strip()
    if not text:
        return False
    if _FOLLOW_UP_RE.search(text):
        return False
    if len(text.split()) <= 7:
        return False
    return True


def _to_snippets(rows: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    snippets: List[Dict[str, str]] = []
    for row in reversed(rows):
        query = str(row.get("query") or "").strip()
        best_response = str(row.get("best_response") or "").strip()
        if not query or not best_response:
            continue
        snippets.append(
            {
                "query": query[:500],
                "answer": best_response[:900],
            }
        )
    return snippets


def save_evaluation(payload: Dict[str, Any]) -> int:
    return insert_evaluation(payload)


def save_feedback(payload: Dict[str, Any]) -> int:
    return insert_feedback_event(payload)


def get_feedback_model_bias(limit: int = 1000) -> Dict[str, float]:
    return fetch_feedback_model_bias(limit=limit)


def get_feedback_insights(limit: int = 1000) -> Dict[str, Any]:
    return fetch_feedback_insights(limit=limit)


def get_reliability_insights(limit: int = 120) -> Dict[str, Any]:
    return fetch_reliability_insights(limit=limit)


def get_history(limit: int = 20, session_id: str | None = None, main_turn_only: bool = True) -> List[Dict[str, Any]]:
    rows = fetch_recent(limit=max(limit * 4, 20), session_id=session_id)
    if not rows:
        return []

    if not main_turn_only:
        return rows[: max(1, min(int(limit), 200))]

    main_rows = [r for r in rows if _is_main_turn(str(r.get("query") or ""))]
    if not main_rows:
        main_rows = rows[:1]
    return main_rows[: max(1, min(int(limit), 200))]


def get_conversation_memory_snippets(session_id: str, limit: int = 4) -> List[Dict[str, str]]:
    rows = fetch_recent(limit=limit, session_id=session_id)
    return _to_snippets(rows)


def get_global_memory_snippets(limit: int = 8, exclude_session_id: str | None = None) -> List[Dict[str, str]]:
    rows = fetch_recent(limit=max(limit * 2, 16), session_id=None)
    if exclude_session_id:
        rows = [r for r in rows if str(r.get("session_id") or "") != str(exclude_session_id)]

    snippets = _to_snippets(rows)
    if not snippets:
        return []

    deduped: List[Dict[str, str]] = []
    seen_queries: set[str] = set()
    for s in snippets:
        q = str(s.get("query") or "").strip().lower()
        if not q or q in seen_queries:
            continue
        seen_queries.add(q)
        deduped.append(s)
        if len(deduped) >= max(1, min(int(limit), 50)):
            break
    return deduped
