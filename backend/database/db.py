from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any, Dict, List

from utils.config import settings


def _db_path() -> Path:
    return Path(settings.sqlite_db_path)


def init_db() -> None:
    path = _db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS evaluations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                query TEXT NOT NULL,
                responses_json TEXT NOT NULL,
                metrics_json TEXT NOT NULL,
                scores_json TEXT NOT NULL,
                best_model TEXT NOT NULL,
                best_response TEXT NOT NULL,
                reason TEXT NOT NULL,
                gemini_response TEXT NOT NULL,
                latency_json TEXT NOT NULL
            )
            """
        )
        conn.commit()
    finally:
        conn.close()


def insert_evaluation(payload: Dict[str, Any]) -> int:
    conn = sqlite3.connect(_db_path())
    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO evaluations (
                query, responses_json, metrics_json, scores_json,
                best_model, best_response, reason, gemini_response, latency_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload.get("query", ""),
                json.dumps(payload.get("responses", []), ensure_ascii=False),
                json.dumps(payload.get("metrics", []), ensure_ascii=False),
                json.dumps(payload.get("scores", []), ensure_ascii=False),
                payload.get("best_model", ""),
                payload.get("best_response", ""),
                payload.get("reason", ""),
                payload.get("gemini_response", ""),
                json.dumps(payload.get("latency", []), ensure_ascii=False),
            ),
        )
        conn.commit()
        return int(cur.lastrowid)
    finally:
        conn.close()


def fetch_recent(limit: int = 20) -> List[Dict[str, Any]]:
    conn = sqlite3.connect(_db_path())
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            """
            SELECT id, created_at, query, responses_json, metrics_json, scores_json,
                   best_model, best_response, reason, gemini_response, latency_json
            FROM evaluations
            ORDER BY id DESC
            LIMIT ?
            """,
            (max(1, limit),),
        ).fetchall()

        items: List[Dict[str, Any]] = []
        for r in rows:
            items.append(
                {
                    "id": r["id"],
                    "created_at": r["created_at"],
                    "query": r["query"],
                    "responses": json.loads(r["responses_json"]),
                    "metrics": json.loads(r["metrics_json"]),
                    "scores": json.loads(r["scores_json"]),
                    "best_model": r["best_model"],
                    "best_response": r["best_response"],
                    "reason": r["reason"],
                    "gemini_response": r["gemini_response"],
                    "latency": json.loads(r["latency_json"]),
                }
            )
        return items
    finally:
        conn.close()
