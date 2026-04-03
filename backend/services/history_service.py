from __future__ import annotations

from typing import Any, Dict, List

from database.db import fetch_recent, insert_evaluation


def save_evaluation(payload: Dict[str, Any]) -> int:
    return insert_evaluation(payload)


def get_history(limit: int = 20) -> List[Dict[str, Any]]:
    return fetch_recent(limit=limit)
