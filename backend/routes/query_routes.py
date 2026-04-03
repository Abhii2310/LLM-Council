from __future__ import annotations

import asyncio

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Any, Optional


from llm_council.broadcast import broadcast_query
from comparison.gemini_compare import get_gemini_response, check_gemini_status
from evaluation.metrics import compute_metrics
from evaluation.scoring_engine import score_metrics, select_best_response
from services.history_service import get_history, save_evaluation
from services.reason_generator import generate_reason
from services.latency_tracker import extract_latency_rows

router = APIRouter()


class EvaluateRequest(BaseModel):
    query: str = Field(..., min_length=1)


class ModelResponse(BaseModel):
    model: str
    response: str
    provider_model: str
    error: Optional[str] = None
    latency_ms: Optional[float] = None


class MetricsRow(BaseModel):
    model: str
    relevance: float
    semantic_similarity: float
    agreement: float
    clarity: float
    length_optimization: float


class ScoreRow(BaseModel):
    model: str
    final_score: float


class LatencyRow(BaseModel):
    model: str
    latency_ms: float


class EvaluateResponse(BaseModel):
    query: str
    responses: list[ModelResponse]
    metrics: list[MetricsRow]
    scores: list[ScoreRow]
    best_model: str
    best_response: str
    reason: str
    gemini_response: str
    latency: list[LatencyRow]


class HistoryResponse(BaseModel):
    items: list[dict[str, Any]]


def _to_model_rows(results: list[Any]) -> list[dict[str, Any]]:
    return [
        {
            "model": r.model_key,
            "response": r.response_text,
            "provider_model": r.provider_model,
            "error": r.error,
            "latency_ms": float(r.latency_ms or 0.0),
        }
        for r in results
    ]


@router.post("/evaluate", response_model=EvaluateResponse)
async def post_evaluate(payload: EvaluateRequest) -> EvaluateResponse:
    q = payload.query.strip()
    if not q:
        raise HTTPException(status_code=400, detail="query must be non-empty")

    # ── Run council + Gemini fully in parallel ──────────────────────────────
    council_results, gemini_response = await asyncio.gather(
        broadcast_query(q),
        get_gemini_response(q),
    )

    responses = _to_model_rows(council_results)

    # ── Compute metrics in thread-executor (CPU-bound; avoids blocking loop) ─
    loop = asyncio.get_event_loop()
    metrics = await loop.run_in_executor(None, compute_metrics, q, responses)

    scores = score_metrics(metrics)
    best_row, best_metrics, best_score = select_best_response(responses, metrics, scores)
    reason = generate_reason(best_metrics, str(best_row.get("model", "unknown")))
    latency = extract_latency_rows(responses)

    payload_to_store = {
        "query": q,
        "responses": responses,
        "metrics": metrics,
        "scores": scores,
        "best_model": str(best_row.get("model", "")),
        "best_response": str(best_row.get("response", "")),
        "reason": reason,
        "gemini_response": gemini_response,
        "latency": latency,
    }
    save_evaluation(payload_to_store)

    return EvaluateResponse(
        query=q,
        responses=[
            ModelResponse(
                model=str(r.get("model", "")),
                response=str(r.get("response", "")),
                provider_model=str(r.get("provider_model", "")),
                error=r.get("error"),
                latency_ms=float(r.get("latency_ms", 0.0)),
            )
            for r in responses
        ],
        metrics=[MetricsRow(**m) for m in metrics],
        scores=[ScoreRow(**s) for s in scores],
        best_model=str(best_row.get("model", "")),
        best_response=str(best_row.get("response", "")),
        reason=reason,
        gemini_response=gemini_response,
        latency=[LatencyRow(**l) for l in latency],
    )


@router.post("/query", response_model=EvaluateResponse)
async def post_query(payload: EvaluateRequest) -> EvaluateResponse:
    return await post_evaluate(payload)


@router.get("/history", response_model=HistoryResponse)
async def get_evaluation_history(limit: int = 20) -> HistoryResponse:
    return HistoryResponse(items=get_history(limit=limit))


@router.get("/gemini/status")
async def get_gemini_quota_status():
    """
    Check Gemini API key health and per-model quota state.
    Uses a minimal 1-token probe (not a real query) and an in-process
    cooldown cache so this endpoint is safe to poll from the UI.

    Returns:
        key_configured  : bool  – API key is set
        active_model    : str   – first Gemini model currently available, or null
        models          : list  – per-model status (ok / quota_exceeded / etc.)
        groq_fallback_available : bool – Groq key present for fallback
        status          : str   – "ok" | "groq_fallback" | "all_exhausted" | "no_key"
        cooldown_seconds: int   – how long exhausted models are skipped
    """
    return await check_gemini_status()
