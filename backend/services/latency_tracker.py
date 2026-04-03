from __future__ import annotations

from typing import Dict, List


def extract_latency_rows(responses: List[Dict[str, object]]) -> List[Dict[str, object]]:
    rows: List[Dict[str, object]] = []
    for r in responses:
        rows.append(
            {
                "model": r.get("model"),
                "latency_ms": float(r.get("latency_ms") or 0.0),
            }
        )
    return rows
