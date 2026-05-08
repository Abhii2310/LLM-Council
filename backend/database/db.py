from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any, Dict, List

from utils.config import settings


def _db_path() -> Path:
    return Path(settings.sqlite_db_path)


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(_db_path(), timeout=10)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db() -> None:
    path = _db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = _connect()
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS evaluations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                session_id TEXT NOT NULL DEFAULT 'default',
                query TEXT NOT NULL,
                responses_json TEXT NOT NULL,
                metrics_json TEXT NOT NULL,
                scores_json TEXT NOT NULL,
                best_model TEXT NOT NULL,
                best_response TEXT NOT NULL,
                reason TEXT NOT NULL,
                gemini_response TEXT NOT NULL,
                chatgpt_response TEXT NOT NULL DEFAULT '',
                validator_scores_json TEXT NOT NULL DEFAULT '[]',
                validator_winner TEXT NOT NULL DEFAULT '',
                validator_winner_response TEXT NOT NULL DEFAULT '',
                final_decision_metrics_json TEXT NOT NULL DEFAULT '[]',
                final_decision_scores_json TEXT NOT NULL DEFAULT '[]',
                final_decision_winner TEXT NOT NULL DEFAULT '',
                final_decision_winner_response TEXT NOT NULL DEFAULT '',
                final_decision_reason TEXT NOT NULL DEFAULT '',
                quantum_metadata_json TEXT NOT NULL DEFAULT '{}',
                validator_quantum_metadata_json TEXT NOT NULL DEFAULT '{}',
                council_reliability_json TEXT NOT NULL DEFAULT '{}',
                latency_json TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS feedback_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                session_id TEXT NOT NULL DEFAULT 'default',
                query TEXT NOT NULL DEFAULT '',
                best_model TEXT NOT NULL DEFAULT '',
                selected_model TEXT NOT NULL DEFAULT '',
                is_positive INTEGER NOT NULL DEFAULT 0,
                note TEXT NOT NULL DEFAULT ''
            )
            """
        )
        cols = {str(r[1]) for r in conn.execute("PRAGMA table_info(evaluations)").fetchall()}
        if "chatgpt_response" not in cols:
            conn.execute("ALTER TABLE evaluations ADD COLUMN chatgpt_response TEXT NOT NULL DEFAULT ''")
        if "session_id" not in cols:
            conn.execute("ALTER TABLE evaluations ADD COLUMN session_id TEXT NOT NULL DEFAULT 'default'")
        if "validator_scores_json" not in cols:
            conn.execute("ALTER TABLE evaluations ADD COLUMN validator_scores_json TEXT NOT NULL DEFAULT '[]'")
        if "validator_winner" not in cols:
            conn.execute("ALTER TABLE evaluations ADD COLUMN validator_winner TEXT NOT NULL DEFAULT ''")
        if "validator_winner_response" not in cols:
            conn.execute("ALTER TABLE evaluations ADD COLUMN validator_winner_response TEXT NOT NULL DEFAULT ''")
        if "final_decision_metrics_json" not in cols:
            conn.execute("ALTER TABLE evaluations ADD COLUMN final_decision_metrics_json TEXT NOT NULL DEFAULT '[]'")
        if "final_decision_scores_json" not in cols:
            conn.execute("ALTER TABLE evaluations ADD COLUMN final_decision_scores_json TEXT NOT NULL DEFAULT '[]'")
        if "final_decision_winner" not in cols:
            conn.execute("ALTER TABLE evaluations ADD COLUMN final_decision_winner TEXT NOT NULL DEFAULT ''")
        if "final_decision_winner_response" not in cols:
            conn.execute("ALTER TABLE evaluations ADD COLUMN final_decision_winner_response TEXT NOT NULL DEFAULT ''")
        if "final_decision_reason" not in cols:
            conn.execute("ALTER TABLE evaluations ADD COLUMN final_decision_reason TEXT NOT NULL DEFAULT ''")
        if "quantum_metadata_json" not in cols:
            conn.execute("ALTER TABLE evaluations ADD COLUMN quantum_metadata_json TEXT NOT NULL DEFAULT '{}'")
        if "validator_quantum_metadata_json" not in cols:
            conn.execute("ALTER TABLE evaluations ADD COLUMN validator_quantum_metadata_json TEXT NOT NULL DEFAULT '{}'")
        if "council_reliability_json" not in cols:
            conn.execute("ALTER TABLE evaluations ADD COLUMN council_reliability_json TEXT NOT NULL DEFAULT '{}'")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_evaluations_created_at ON evaluations(created_at DESC)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_evaluations_session_created ON evaluations(session_id, id DESC)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_feedback_events_created ON feedback_events(created_at DESC)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_feedback_events_model_created ON feedback_events(selected_model, id DESC)")
        conn.commit()
    finally:
        conn.close()


def fetch_feedback_insights(limit: int = 1000) -> Dict[str, Any]:
    conn = _connect()
    conn.row_factory = sqlite3.Row
    try:
        safe_limit = max(1, min(int(limit), 10000))
        rows = conn.execute(
            """
            SELECT selected_model, is_positive
            FROM feedback_events
            WHERE selected_model != ''
            ORDER BY id DESC
            LIMIT ?
            """,
            (safe_limit,),
        ).fetchall()

        per_model: Dict[str, Dict[str, int]] = {}
        total_positive = 0
        total_negative = 0
        recent_signals: List[int] = []

        for row in rows:
            model = str(row["selected_model"] or "").strip()
            if not model:
                continue
            if model not in per_model:
                per_model[model] = {"up": 0, "down": 0}

            is_positive = int(row["is_positive"] or 0) == 1
            if is_positive:
                per_model[model]["up"] += 1
                total_positive += 1
                recent_signals.append(1)
            else:
                per_model[model]["down"] += 1
                total_negative += 1
                recent_signals.append(-1)

        recent_signals = list(reversed(recent_signals[:40]))
        trend_points: List[float] = []
        if recent_signals:
            running = 0
            raw_points: List[int] = []
            for s in recent_signals:
                running += int(s)
                raw_points.append(running)
            min_v = min(raw_points)
            max_v = max(raw_points)
            span = float(max(1, max_v - min_v))
            trend_points = [round((p - min_v) / span, 4) for p in raw_points]

        model_rows: List[Dict[str, Any]] = []
        for model, counts in per_model.items():
            total = max(1, counts["up"] + counts["down"])
            signal = (counts["up"] - counts["down"]) / float(total)
            bias = max(-0.03, min(0.03, round(signal * 0.02, 4)))
            model_rows.append(
                {
                    "model": model,
                    "up": counts["up"],
                    "down": counts["down"],
                    "total": counts["up"] + counts["down"],
                    "bias": bias,
                }
            )

        model_rows.sort(key=lambda r: (int(r["total"]), float(r["bias"])), reverse=True)
        return {
            "total_feedback": total_positive + total_negative,
            "positive_feedback": total_positive,
            "negative_feedback": total_negative,
            "models": model_rows,
            "trend_points": trend_points,
        }
    finally:
        conn.close()


def fetch_reliability_insights(limit: int = 120) -> Dict[str, Any]:
    conn = _connect()
    conn.row_factory = sqlite3.Row
    try:
        safe_limit = max(1, min(int(limit), 2000))
        rows = conn.execute(
            """
            SELECT responses_json
            FROM evaluations
            ORDER BY id DESC
            LIMIT ?
            """,
            (safe_limit,),
        ).fetchall()

        model_stats: Dict[str, Dict[str, Any]] = {}
        total_slots = 0
        total_success = 0
        total_fail = 0
        latency_sum = 0.0
        latency_count = 0

        for row in rows:
            try:
                responses = json.loads(row["responses_json"] or "[]")
            except Exception:
                responses = []

            for item in responses:
                model = str(item.get("model") or "").strip()
                if not model:
                    continue

                if model not in model_stats:
                    model_stats[model] = {
                        "total": 0,
                        "success": 0,
                        "fail": 0,
                        "latency_sum": 0.0,
                        "latency_count": 0,
                        "reasons": {},
                    }

                stats = model_stats[model]
                stats["total"] += 1
                total_slots += 1

                response_text = str(item.get("response") or "").strip()
                error_text = str(item.get("error") or "").strip()
                is_success = bool(response_text) and not error_text

                if is_success:
                    stats["success"] += 1
                    total_success += 1
                    latency_ms = float(item.get("latency_ms") or 0.0)
                    if latency_ms > 0:
                        stats["latency_sum"] += latency_ms
                        stats["latency_count"] += 1
                        latency_sum += latency_ms
                        latency_count += 1
                else:
                    stats["fail"] += 1
                    total_fail += 1
                    reason = error_text.split("|", 1)[0].strip() if error_text else "Unknown provider error"
                    reason = reason[:120]
                    reasons = stats["reasons"]
                    reasons[reason] = int(reasons.get(reason, 0)) + 1

        model_rows: List[Dict[str, Any]] = []
        for model, stats in model_stats.items():
            total = int(stats["total"])
            success = int(stats["success"])
            fail = int(stats["fail"])
            success_rate = round((success / total) * 100.0, 2) if total else 0.0
            avg_latency = (
                round(float(stats["latency_sum"]) / max(1, int(stats["latency_count"])), 1)
                if int(stats["latency_count"]) > 0
                else 0.0
            )
            reasons_sorted = sorted(
                [{"reason": k, "count": int(v)} for k, v in stats["reasons"].items()],
                key=lambda x: int(x["count"]),
                reverse=True,
            )
            model_rows.append(
                {
                    "model": model,
                    "total": total,
                    "success": success,
                    "fail": fail,
                    "success_rate": success_rate,
                    "avg_latency_ms": avg_latency,
                    "top_failure_reason": reasons_sorted[0]["reason"] if reasons_sorted else "",
                    "failure_reasons": reasons_sorted[:3],
                }
            )

        model_rows.sort(key=lambda r: (float(r["success_rate"]), int(r["total"])), reverse=True)

        overall_rate = round((total_success / total_slots) * 100.0, 2) if total_slots else 0.0
        overall_latency = round(latency_sum / max(1, latency_count), 1) if latency_count > 0 else 0.0
        return {
            "window_evaluations": len(rows),
            "summary": {
                "total_slots": total_slots,
                "successful_slots": total_success,
                "failed_slots": total_fail,
                "success_rate": overall_rate,
                "avg_latency_ms": overall_latency,
            },
            "models": model_rows,
        }
    finally:
        conn.close()


def insert_feedback_event(payload: Dict[str, Any]) -> int:
    conn = _connect()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO feedback_events (
                session_id, query, best_model, selected_model, is_positive, note
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                payload.get("session_id", "default"),
                payload.get("query", ""),
                payload.get("best_model", ""),
                payload.get("selected_model", ""),
                1 if bool(payload.get("is_positive", False)) else 0,
                payload.get("note", ""),
            ),
        )
        conn.commit()
        return int(cur.lastrowid)
    finally:
        conn.close()


def fetch_feedback_model_bias(limit: int = 1000) -> Dict[str, float]:
    conn = _connect()
    conn.row_factory = sqlite3.Row
    try:
        safe_limit = max(1, min(int(limit), 10000))
        rows = conn.execute(
            """
            SELECT selected_model, is_positive
            FROM feedback_events
            WHERE selected_model != ''
            ORDER BY id DESC
            LIMIT ?
            """,
            (safe_limit,),
        ).fetchall()

        stats: Dict[str, Dict[str, int]] = {}
        for row in rows:
            model = str(row["selected_model"] or "").strip()
            if not model:
                continue
            if model not in stats:
                stats[model] = {"up": 0, "down": 0}
            if int(row["is_positive"] or 0) == 1:
                stats[model]["up"] += 1
            else:
                stats[model]["down"] += 1

        bias: Dict[str, float] = {}
        for model, s in stats.items():
            total = max(1, s["up"] + s["down"])
            signal = (s["up"] - s["down"]) / float(total)
            bias[model] = max(-0.03, min(0.03, round(signal * 0.02, 4)))
        return bias
    finally:
        conn.close()


def insert_evaluation(payload: Dict[str, Any]) -> int:
    conn = _connect()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO evaluations (
                session_id, query, responses_json, metrics_json, scores_json,
                best_model, best_response, reason, gemini_response,
                chatgpt_response, validator_scores_json, validator_winner,
                validator_winner_response, final_decision_metrics_json,
                final_decision_scores_json, final_decision_winner,
                final_decision_winner_response, final_decision_reason,
                quantum_metadata_json, validator_quantum_metadata_json,
                council_reliability_json, latency_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload.get("session_id", "default"),
                payload.get("query", ""),
                json.dumps(payload.get("responses", []), ensure_ascii=False),
                json.dumps(payload.get("metrics", []), ensure_ascii=False),
                json.dumps(payload.get("scores", []), ensure_ascii=False),
                payload.get("best_model", ""),
                payload.get("best_response", ""),
                payload.get("reason", ""),
                payload.get("gemini_response", ""),
                payload.get("chatgpt_response", ""),
                json.dumps(payload.get("validator_scores", []), ensure_ascii=False),
                payload.get("validator_winner", ""),
                payload.get("validator_winner_response", ""),
                json.dumps(payload.get("final_decision_metrics", []), ensure_ascii=False),
                json.dumps(payload.get("final_decision_scores", []), ensure_ascii=False),
                payload.get("final_decision_winner", ""),
                payload.get("final_decision_winner_response", ""),
                payload.get("final_decision_reason", ""),
                json.dumps(payload.get("quantum_metadata", {}), ensure_ascii=False),
                json.dumps(payload.get("validator_quantum_metadata", {}), ensure_ascii=False),
                json.dumps(payload.get("council_reliability", {}), ensure_ascii=False),
                json.dumps(payload.get("latency", []), ensure_ascii=False),
            ),
        )
        conn.commit()
        return int(cur.lastrowid)
    finally:
        conn.close()


def fetch_recent(limit: int = 20, session_id: str | None = None) -> List[Dict[str, Any]]:
    conn = _connect()
    conn.row_factory = sqlite3.Row
    try:
        safe_limit = max(1, min(int(limit), 200))
        if session_id:
            rows = conn.execute(
                """
                SELECT id, created_at, session_id, query, responses_json, metrics_json, scores_json,
                       best_model, best_response, reason, gemini_response,
                       chatgpt_response, validator_scores_json, validator_winner,
                       validator_winner_response, final_decision_metrics_json,
                       final_decision_scores_json, final_decision_winner,
                       final_decision_winner_response, final_decision_reason,
                       quantum_metadata_json, validator_quantum_metadata_json,
                       council_reliability_json, latency_json
                FROM evaluations
                WHERE session_id = ?
                ORDER BY id DESC
                LIMIT ?
                """,
                (session_id, safe_limit),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT id, created_at, session_id, query, responses_json, metrics_json, scores_json,
                       best_model, best_response, reason, gemini_response,
                       chatgpt_response, validator_scores_json, validator_winner,
                       validator_winner_response, final_decision_metrics_json,
                       final_decision_scores_json, final_decision_winner,
                       final_decision_winner_response, final_decision_reason,
                       quantum_metadata_json, validator_quantum_metadata_json,
                       council_reliability_json, latency_json
                FROM evaluations
                ORDER BY id DESC
                LIMIT ?
                """,
                (safe_limit,),
            ).fetchall()

        items: List[Dict[str, Any]] = []
        for r in rows:
            items.append(
                {
                    "id": r["id"],
                    "created_at": r["created_at"],
                    "session_id": r["session_id"],
                    "query": r["query"],
                    "responses": json.loads(r["responses_json"]),
                    "metrics": json.loads(r["metrics_json"]),
                    "scores": json.loads(r["scores_json"]),
                    "best_model": r["best_model"],
                    "best_response": r["best_response"],
                    "reason": r["reason"],
                    "gemini_response": r["gemini_response"],
                    "chatgpt_response": r["chatgpt_response"],
                    "validator_scores": json.loads(r["validator_scores_json"]),
                    "validator_winner": r["validator_winner"],
                    "validator_winner_response": r["validator_winner_response"],
                    "final_decision_metrics": json.loads(r["final_decision_metrics_json"]),
                    "final_decision_scores": json.loads(r["final_decision_scores_json"]),
                    "final_decision_winner": r["final_decision_winner"],
                    "final_decision_winner_response": r["final_decision_winner_response"],
                    "final_decision_reason": r["final_decision_reason"],
                    "quantum_metadata": json.loads(r["quantum_metadata_json"]),
                    "validator_quantum_metadata": json.loads(r["validator_quantum_metadata_json"]),
                    "council_reliability": json.loads(r["council_reliability_json"]),
                    "latency": json.loads(r["latency_json"]),
                }
            )
        return items
    finally:
        conn.close()
