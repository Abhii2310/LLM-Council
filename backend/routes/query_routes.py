from __future__ import annotations

import asyncio
import copy
import re
import time

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Any, Optional


from llm_council.broadcast import broadcast_query
from comparison.gemini_compare import get_gemini_response, check_gemini_status
from comparison.openai_compare import get_chatgpt_response
from evaluation.metrics import compute_metrics
from evaluation.scoring_engine import score_metrics, select_best_response
from services.history_service import (
    get_conversation_memory_snippets,
    get_feedback_model_bias,
    get_feedback_insights,
    get_global_memory_snippets,
    get_reliability_insights,
    get_history,
    save_evaluation,
    save_feedback,
)
from services.reason_generator import generate_reason
from services.latency_tracker import extract_latency_rows
from services.provider_status import provider_status_snapshot
from services.quantum_optimizer import maybe_apply_quantum_assist_with_meta, quantum_status_snapshot
from services.rag_service import get_rag_context
from services.web_research_service import get_web_research_context
from services.safety_service import sanitize_query_text, enforce_response_safety, redact_secrets
from utils.config import settings

router = APIRouter()

_EVALUATE_CACHE: dict[str, tuple[float, dict[str, Any]]] = {}
_SESSION_ID_RE = re.compile(r"[^a-zA-Z0-9_\-]")
_FOLLOW_UP_RE = re.compile(
    r"\b(it|that|this|those|these|they|them|he|she|above|earlier|previous|same|again|continue)\b",
    re.IGNORECASE,
)


def _cache_key(query: str, session_id: str, query_mode: str, web_search: bool) -> str:
    return f"{session_id}:{query}:{query_mode}:{int(bool(web_search))}"


def _cache_get(query: str, session_id: str, query_mode: str, web_search: bool) -> Optional[dict[str, Any]]:
    ttl = max(1, int(settings.evaluate_cache_ttl_seconds))
    item = _EVALUATE_CACHE.get(_cache_key(query, session_id, query_mode, web_search))
    if not item:
        return None

    ts, payload = item
    if time.time() - ts > ttl:
        _EVALUATE_CACHE.pop(_cache_key(query, session_id, query_mode, web_search), None)
        return None

    return copy.deepcopy(payload)


def _cache_put(query: str, session_id: str, query_mode: str, web_search: bool, payload: dict[str, Any]) -> None:
    _EVALUATE_CACHE[_cache_key(query, session_id, query_mode, web_search)] = (time.time(), copy.deepcopy(payload))


def _sanitize_reasoning_mode(mode: Optional[str]) -> str:
    raw = str(mode or "standard").strip().lower()
    if raw in {"standard", "thinking", "deep_research"}:
        return raw
    return "standard"


def _sanitize_session_id(session_id: Optional[str]) -> str:
    raw = (session_id or "default").strip()
    if not raw:
        return "default"
    cleaned = _SESSION_ID_RE.sub("_", raw)
    return cleaned[:64] or "default"


def _build_conversation_context(snippets: list[dict[str, str]]) -> str:
    if not snippets:
        return ""

    lines = [
        "Conversation memory from this session:",
    ]
    for i, s in enumerate(snippets, start=1):
        q = str(s.get("query") or "").strip()
        a = str(s.get("answer") or "").strip()
        if not q:
            continue
        lines.append(f"{i}. User asked: {q}")
        if a:
            lines.append(f"   Short answer memory: {a[:260]}")
    return "\n".join(lines)


def _build_cross_session_context(snippets: list[dict[str, str]]) -> str:
    if not snippets:
        return ""

    lines = [
        "Relevant memory from prior sessions:",
    ]
    for i, s in enumerate(snippets[-2:], start=1):
        q = str(s.get("query") or "").strip()
        a = str(s.get("answer") or "").strip()
        if not q:
            continue
        lines.append(f"{i}. Prior user topic: {q[:220]}")
        if a:
            lines.append(f"   Prior answer summary: {a[:220]}")
    return "\n".join(lines)


def _build_rag_query(
    query: str,
    session_snippets: list[dict[str, str]],
    global_snippets: list[dict[str, str]],
) -> str:
    text = str(query or "").strip()
    if not text:
        return text

    is_follow_up = _is_follow_up_query(text)
    recent_session = session_snippets[-2:] if is_follow_up else session_snippets[-1:]
    recent_global = global_snippets[-2:] if is_follow_up else global_snippets[-1:]

    session_queries = [
        str(s.get("query") or "").strip()
        for s in recent_session
        if str(s.get("query") or "").strip()
    ]
    global_queries = [
        str(s.get("query") or "").strip()
        for s in recent_global
        if str(s.get("query") or "").strip()
    ]
    latest_session_answer = str(recent_session[-1].get("answer") or "").strip() if recent_session else ""
    latest_global_answer = str(recent_global[-1].get("answer") or "").strip() if recent_global else ""

    parts = [f"Current query: {text}"]
    if session_queries:
        parts.append("Recent session queries: " + " | ".join(session_queries))
    if latest_session_answer:
        parts.append("Most recent session answer summary: " + latest_session_answer[:420])
    if global_queries:
        parts.append("Relevant prior queries from other sessions: " + " | ".join(global_queries))
    if latest_global_answer:
        parts.append("Prior cross-session answer summary: " + latest_global_answer[:320])
    return "\n".join(parts)


def _classify_blocker(error_text: str) -> ProviderHealthFailureReason:
    text = str(error_text or "").strip()
    lower = text.lower()
    if not text:
        return ProviderHealthFailureReason(code="unknown", message="Unknown provider error")
    if "429" in lower or "rate limit" in lower or "quota" in lower:
        return ProviderHealthFailureReason(code="quota_or_rate_limit", message="Provider quota/rate limit reached")
    if "api key" in lower or "unauthor" in lower or "forbidden" in lower or "invalid_key" in lower:
        return ProviderHealthFailureReason(code="invalid_or_missing_key", message="Provider API key invalid, missing, or lacks access")
    if "model unavailable" in lower or "not_found" in lower or "does not exist" in lower:
        return ProviderHealthFailureReason(code="model_unavailable", message="Configured model unavailable on provider")
    if "timed out" in lower or "timeout" in lower:
        return ProviderHealthFailureReason(code="timeout", message="Provider request timed out")
    return ProviderHealthFailureReason(code="provider_error", message=text.split("|", 1)[0].strip()[:180])


def _extract_attempts(error_text: str) -> list[str]:
    text = str(error_text or "")
    marker = "| attempts="
    if marker not in text:
        return []
    raw = text.split(marker, 1)[1].strip()
    if not raw:
        return []
    return [a.strip() for a in raw.split(",") if a.strip()]


def _is_follow_up_query(query: str) -> bool:
    text = str(query or "").strip()
    if not text:
        return False
    lower = text.lower()
    if _FOLLOW_UP_RE.search(lower):
        return True
    if len(lower.split()) <= 8 and any(token in lower for token in ["risk", "impact", "why", "how so"]):
        return True
    return False


def _keyword_set(text: str) -> set[str]:
    stop = {
        "the", "a", "an", "and", "or", "to", "of", "in", "on", "for", "is", "are", "was", "were",
        "that", "this", "it", "with", "as", "by", "be", "from", "at", "about", "into", "your", "my",
    }
    tokens = re.findall(r"[a-z0-9]+", str(text or "").lower())
    return {t for t in tokens if len(t) > 2 and t not in stop}


def _select_relevant_global_snippets(query: str, snippets: list[dict[str, str]], limit: int = 2) -> list[dict[str, str]]:
    if not snippets:
        return []

    qset = _keyword_set(query)
    if not qset:
        return snippets[-limit:]

    scored: list[tuple[int, dict[str, str]]] = []
    for s in snippets:
        text = f"{s.get('query', '')} {s.get('answer', '')}"
        overlap = len(qset.intersection(_keyword_set(text)))
        scored.append((overlap, s))

    ranked = [s for score, s in sorted(scored, key=lambda x: x[0], reverse=True) if score > 0]
    if ranked:
        return ranked[: max(1, min(int(limit), 6))]
    return snippets[-1:]


async def _await_with_timeout(coro: Any, *, timeout_seconds: float, fallback: Any) -> Any:
    try:
        return await asyncio.wait_for(coro, timeout=max(1.0, float(timeout_seconds)))
    except Exception:
        return fallback


class EvaluateRequest(BaseModel):
    query: str = Field(..., min_length=1)
    session_id: Optional[str] = Field(default="default", min_length=1, max_length=128)
    reasoning_mode: str = Field(default="standard")
    enable_web_search: bool = Field(default=False)


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


class WebResearchSource(BaseModel):
    source: str
    title: str
    url: str
    snippet: str


class EvaluateResponse(BaseModel):
    query: str
    reasoning_mode: str = "standard"
    enable_web_search: bool = False
    web_research_used: bool = False
    web_research_sources_count: int = 0
    web_research_note: str = ""
    web_research_sources: list[WebResearchSource] = Field(default_factory=list)
    responses: list[ModelResponse]
    metrics: list[MetricsRow]
    scores: list[ScoreRow]
    best_model: str
    best_response: str
    reason: str
    second_best_model: str = ""
    second_best_response: str = ""
    second_best_score: float = 0.0
    gemini_response: str
    chatgpt_response: str
    validator_scores: list[ScoreRow]
    validator_winner: str
    validator_winner_response: str
    final_decision_metrics: list[MetricsRow] = Field(default_factory=list)
    final_decision_scores: list[ScoreRow] = Field(default_factory=list)
    final_decision_winner: str = ""
    final_decision_winner_response: str = ""
    final_decision_reason: str = ""
    quantum_selected_model: str = ""
    quantum_selected_score: float = 0.0
    quantum_layer_note: str = ""
    quantum_metadata: dict[str, Any] = Field(default_factory=dict)
    validator_quantum_metadata: dict[str, Any] = Field(default_factory=dict)
    council_reliability: dict[str, object]
    latency: list[LatencyRow]


class HistoryResponse(BaseModel):
    items: list[dict[str, Any]]


class QuantumStatusResponse(BaseModel):
    enabled: bool
    mode: str
    strength: float
    seed: int
    backend: str
    provider: str
    providers_available: dict[str, bool]


class ProviderStatusRow(BaseModel):
    provider: str
    configured: bool
    requires_api_key: bool


class ProviderModelRow(BaseModel):
    key: str
    display_name: str
    provider_model: str
    fallback_provider_models: list[str] = Field(default_factory=list)


class ProvidersStatusResponse(BaseModel):
    providers: list[ProviderStatusRow] = Field(default_factory=list)
    models: list[ProviderModelRow] = Field(default_factory=list)
    prefer_local_ollama: bool
    ollama_primary_model: str
    ollama_fallback_model: str


class ProviderHealthFailureReason(BaseModel):
    code: str
    message: str


class ProviderHealthModelRow(BaseModel):
    model: str
    provider_model: str
    status: str
    blocker_code: str = ""
    blocker_message: str = ""
    attempts: list[str] = Field(default_factory=list)
    latency_ms: float = 0.0


class ProviderHealthSummary(BaseModel):
    total_models: int
    healthy_models: int
    blocked_models: int


class ProviderHealthCheckResponse(BaseModel):
    summary: ProviderHealthSummary
    models: list[ProviderHealthModelRow] = Field(default_factory=list)
    gemini_status: dict[str, Any] = Field(default_factory=dict)


class FeedbackRequest(BaseModel):
    query: str = Field(default="")
    session_id: Optional[str] = Field(default="default", min_length=1, max_length=128)
    best_model: str = Field(default="")
    selected_model: str = Field(default="")
    is_positive: bool
    note: str = Field(default="", max_length=500)


class FeedbackResponse(BaseModel):
    ok: bool
    feedback_id: int


class FeedbackInsightModelRow(BaseModel):
    model: str
    up: int
    down: int
    total: int
    bias: float


class FeedbackInsightsResponse(BaseModel):
    total_feedback: int
    positive_feedback: int
    negative_feedback: int
    models: list[FeedbackInsightModelRow] = Field(default_factory=list)
    trend_points: list[float] = Field(default_factory=list)


class ReliabilityFailureReason(BaseModel):
    reason: str
    count: int


class ReliabilityModelRow(BaseModel):
    model: str
    total: int
    success: int
    fail: int
    success_rate: float
    avg_latency_ms: float
    top_failure_reason: str = ""
    failure_reasons: list[ReliabilityFailureReason] = Field(default_factory=list)


class ReliabilitySummary(BaseModel):
    total_slots: int
    successful_slots: int
    failed_slots: int
    success_rate: float
    avg_latency_ms: float


class ReliabilityInsightsResponse(BaseModel):
    window_evaluations: int
    summary: ReliabilitySummary
    models: list[ReliabilityModelRow] = Field(default_factory=list)


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


def _validator_error_text(response_text: str) -> Optional[str]:
    text = str(response_text or "").strip()
    if not text:
        return "No validator response."

    lower = text.lower()
    failure_signals = (
        "timed out",
        "error:",
        "api key not configured",
        "validation disabled",
        "quota exhausted",
        "invalid or unauthorised",
        "provider api key invalid",
    )
    if any(signal in lower for signal in failure_signals):
        return text
    return None


def _texts_near_identical(values: list[str]) -> bool:
    normalized = [" ".join(v.lower().split()) for v in values if str(v).strip()]
    if len(normalized) < 2:
        return False
    first = normalized[0]
    return all(v == first for v in normalized[1:])


def _select_unbiased_validator_winner(
    rows: list[dict[str, Any]],
    metrics: list[dict[str, Any]],
    scores: list[dict[str, Any]],
) -> tuple[str, str, str]:
    valid = [r for r in rows if not r.get("error") and str(r.get("response") or "").strip()]
    if not valid:
        return "", "", "No validator produced a valid response."

    score_map = {str(s.get("model", "")): float(s.get("final_score", 0.0)) for s in scores}
    best_score = max(score_map.get(str(r.get("model", "")), 0.0) for r in valid)
    tied = [r for r in valid if abs(score_map.get(str(r.get("model", "")), 0.0) - best_score) <= 1e-4]

    tie_models = [str(r.get("model", "")) for r in tied]
    tie_responses = [str(r.get("response", "")) for r in tied]
    if len(tied) > 1:
        winner_response = str(tied[0].get("response", ""))
        if _texts_near_identical(tie_responses):
            tie_note = "High cross-validator consensus: top models produced near-identical answers."
        else:
            tie_note = "Top models are statistically tied on the scoring formula."
        return "tie", winner_response, f"{tie_note} Tied models: {', '.join(tie_models)}."

    winner_row = tied[0]
    winner = str(winner_row.get("model", ""))
    winner_response = str(winner_row.get("response", ""))
    metric_map = {str(m.get("model", "")): m for m in metrics}
    reason = generate_reason(metric_map.get(winner, {}), winner)
    return winner, winner_response, reason


def _apply_feedback_bias(scores: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not scores:
        return scores
    bias_map = get_feedback_model_bias(limit=1000)
    if not bias_map:
        return scores

    adjusted: list[dict[str, Any]] = []
    for row in scores:
        model = str(row.get("model", ""))
        base = float(row.get("final_score", 0.0))
        bias = float(bias_map.get(model, 0.0))
        adjusted_score = max(0.0, min(1.0, round(base + bias, 4)))
        adjusted.append({"model": model, "final_score": adjusted_score})
    return adjusted


def _second_best_from_scores(
    responses: list[dict[str, Any]],
    scores: list[dict[str, Any]],
    best_model: str,
) -> tuple[str, str, float]:
    score_map = {str(s.get("model", "")): float(s.get("final_score", 0.0)) for s in scores}
    valid = [
        r
        for r in responses
        if not r.get("error")
        and str(r.get("response") or "").strip()
        and str(r.get("model", "")) in score_map
        and str(r.get("model", "")) != best_model
    ]
    if not valid:
        return "", "", 0.0

    second = max(valid, key=lambda r: score_map.get(str(r.get("model", "")), 0.0))
    model = str(second.get("model", ""))
    return model, str(second.get("response", "")), float(score_map.get(model, 0.0))


@router.post("/evaluate", response_model=EvaluateResponse)
async def post_evaluate(payload: EvaluateRequest) -> EvaluateResponse:
    q = sanitize_query_text(payload.query)
    session_id = _sanitize_session_id(payload.session_id)
    reasoning_mode = _sanitize_reasoning_mode(payload.reasoning_mode)
    enable_web_search = bool(payload.enable_web_search)
    if not q:
        raise HTTPException(status_code=400, detail="query must be non-empty")

    cached = _cache_get(q, session_id, reasoning_mode, enable_web_search)
    if cached:
        return EvaluateResponse(**cached)

    snippets = get_conversation_memory_snippets(session_id=session_id, limit=4)
    global_snippets = get_global_memory_snippets(limit=6, exclude_session_id=session_id)
    global_snippets = _select_relevant_global_snippets(q, global_snippets, limit=2)
    conversation_context = _build_conversation_context(snippets)
    cross_session_context = _build_cross_session_context(global_snippets)
    rag = get_rag_context(_build_rag_query(q, snippets, global_snippets))
    web_research = await get_web_research_context(
        q,
        deep_research=reasoning_mode == "deep_research",
        web_search=enable_web_search,
    )

    prompt_sections = []
    if conversation_context:
        prompt_sections.append(conversation_context)
    if cross_session_context:
        prompt_sections.append(cross_session_context)
    if conversation_context and _is_follow_up_query(q):
        prompt_sections.append(
            "The current user query is a follow-up. Resolve pronouns and references using the conversation memory above, "
            "and stay on the same topic unless the user explicitly changes topic."
        )
    elif cross_session_context and _is_follow_up_query(q):
        prompt_sections.append(
            "The current user query is a follow-up with limited same-session memory. Use relevant prior-session memory above to resolve references,"
            " but prioritize the current query intent and do not fabricate missing details."
        )

    prompt_sections.append(f"Current user query: {q}")

    if reasoning_mode == "thinking":
        prompt_sections.append("Reasoning style: think step-by-step and keep the answer concise and direct.")
    elif reasoning_mode == "deep_research":
        prompt_sections.append(
            "Reasoning style: deep research. Synthesize sources, highlight uncertainties, and provide a structured answer with a short conclusion."
        )

    rag_context = str(rag.get("context") or "").strip()
    if rag_context:
        prompt_sections.append(
            "Local knowledge context from project RAG (prioritize this over unsupported assumptions):\n"
            f"{rag_context}"
        )

    web_context = str(web_research.get("context") or "").strip()
    if web_context:
        prompt_sections.append(
            "Web research context (use as additional supporting evidence; do not fabricate missing facts):\n"
            f"{web_context}"
        )
    elif enable_web_search:
        prompt_sections.append(
            "Web search is enabled but no reliable fresh sources were retrieved. "
            "Do not claim live updates unless explicitly supported by provided context."
        )
    effective_query = "\n\n".join(prompt_sections)

    validator_timeout = max(
        3.0,
        min(float(settings.request_timeout_seconds), float(settings.per_model_soft_timeout_seconds)),
    )
    council_timeout = max(validator_timeout * 3.0, float(settings.per_model_soft_timeout_seconds))

    # ── Run council + external validators fully in parallel ─────────────────
    council_results, gemini_response, chatgpt_response = await asyncio.gather(
        _await_with_timeout(
            broadcast_query(effective_query),
            timeout_seconds=council_timeout,
            fallback=[],
        ),
        _await_with_timeout(
            get_gemini_response(effective_query),
            timeout_seconds=validator_timeout,
            fallback="Gemini request timed out.",
        ),
        _await_with_timeout(
            get_chatgpt_response(effective_query),
            timeout_seconds=validator_timeout,
            fallback="ChatGPT request timed out.",
        ),
    )

    responses = _to_model_rows(council_results)
    successful_models = sum(1 for r in responses if str(r.get("response") or "").strip() and not r.get("error"))
    council_reliability = {
        "total_models": len(responses),
        "successful_models": successful_models,
        "all_models_healthy": successful_models == len(responses),
    }

    source_files = [str(s.get("source") or "") for s in rag.get("sources", [])]
    for row in responses:
        row["response"] = enforce_response_safety(q, str(row.get("response") or ""), source_files)
        row["error"] = redact_secrets(str(row.get("error") or "")).strip() or None

    gemini_response = enforce_response_safety(q, gemini_response, source_files)
    chatgpt_response = enforce_response_safety(q, chatgpt_response, source_files)

    # ── Compute metrics in thread-executor (CPU-bound; avoids blocking loop) ─
    loop = asyncio.get_event_loop()
    metrics = await loop.run_in_executor(None, compute_metrics, q, responses)

    scores = score_metrics(metrics)
    scores, quantum_metadata = maybe_apply_quantum_assist_with_meta(
        mode=settings.quantum_optimization_mode,
        scores=scores,
        metrics=metrics,
        latency_rows=responses,
        strength=float(settings.quantum_optimization_strength),
        seed=int(settings.quantum_optimization_seed),
    )
    scores = _apply_feedback_bias(scores)
    quantum_best = max(scores, key=lambda s: float(s.get("final_score", 0.0)), default={})
    quantum_selected_model = str(quantum_best.get("model", ""))
    quantum_selected_score = float(quantum_best.get("final_score", 0.0) or 0.0)
    quantum_layer_note = (
        f"Quantum layer selected {quantum_selected_model} with score {quantum_selected_score:.4f}."
        if quantum_selected_model
        else "Quantum layer fallback used default scoring output."
    )
    best_row, best_metrics, best_score = select_best_response(responses, metrics, scores)
    reason = generate_reason(best_metrics, str(best_row.get("model", "unknown")))
    second_best_model, second_best_response, second_best_score = _second_best_from_scores(
        responses,
        scores,
        str(best_row.get("model", "")),
    )
    latency = extract_latency_rows(responses)

    validator_rows = [
        {
            "model": "verdict_ai",
            "response": str(best_row.get("response", "")),
            "provider_model": "verdict/council-best",
            "error": _validator_error_text(str(best_row.get("response", ""))),
            "latency_ms": 0.0,
        },
        {
            "model": "gemini",
            "response": str(gemini_response or ""),
            "provider_model": "google/gemini",
            "error": _validator_error_text(gemini_response),
            "latency_ms": 0.0,
        },
        {
            "model": "chatgpt",
            "response": str(chatgpt_response or ""),
            "provider_model": "openai/chatgpt",
            "error": _validator_error_text(chatgpt_response),
            "latency_ms": 0.0,
        },
    ]
    validator_metrics = await loop.run_in_executor(None, compute_metrics, q, validator_rows)
    validator_scores = score_metrics(validator_metrics)
    validator_scores, validator_quantum_metadata = maybe_apply_quantum_assist_with_meta(
        mode=settings.quantum_optimization_mode,
        scores=validator_scores,
        metrics=validator_metrics,
        latency_rows=validator_rows,
        strength=float(settings.quantum_optimization_strength),
        seed=int(settings.quantum_optimization_seed) + 1,
    )
    validator_best_row, validator_best_metrics, _ = select_best_response(
        validator_rows,
        validator_metrics,
        validator_scores,
    )
    validator_winner = str(validator_best_row.get("model", ""))
    validator_winner_response = str(validator_best_row.get("response", ""))
    validator_reason = generate_reason(validator_best_metrics, validator_winner)
    final_winner, final_winner_response, final_reason = _select_unbiased_validator_winner(
        validator_rows,
        validator_metrics,
        validator_scores,
    )

    payload_to_store = {
        "session_id": session_id,
        "query": q,
        "reasoning_mode": reasoning_mode,
        "enable_web_search": enable_web_search,
        "web_research_used": bool(web_context),
        "web_research_sources_count": len(web_research.get("sources") or []),
        "web_research_note": "sources_attached" if web_context else (
            "web_search_enabled_but_no_sources" if enable_web_search else "web_search_disabled"
        ),
        "web_research_sources": web_research.get("sources") or [],
        "responses": responses,
        "metrics": metrics,
        "scores": scores,
        "best_model": str(best_row.get("model", "")),
        "best_response": redact_secrets(str(best_row.get("response", ""))),
        "reason": reason,
        "second_best_model": second_best_model,
        "second_best_response": redact_secrets(second_best_response),
        "second_best_score": float(second_best_score),
        "gemini_response": redact_secrets(gemini_response),
        "chatgpt_response": redact_secrets(chatgpt_response),
        "validator_scores": validator_scores,
        "validator_winner": validator_winner,
        "validator_winner_response": redact_secrets(validator_winner_response),
        "final_decision_metrics": validator_metrics,
        "final_decision_scores": validator_scores,
        "final_decision_winner": final_winner,
        "final_decision_winner_response": redact_secrets(final_winner_response),
        "final_decision_reason": final_reason,
        "quantum_selected_model": quantum_selected_model,
        "quantum_selected_score": float(quantum_selected_score),
        "quantum_layer_note": quantum_layer_note,
        "quantum_metadata": quantum_metadata,
        "validator_quantum_metadata": validator_quantum_metadata,
        "council_reliability": council_reliability,
        "latency": latency,
    }
    save_evaluation(payload_to_store)

    response_payload = {
        "session_id": session_id,
        "query": q,
        "reasoning_mode": reasoning_mode,
        "enable_web_search": enable_web_search,
        "web_research_used": bool(web_context),
        "web_research_sources_count": len(web_research.get("sources") or []),
        "web_research_note": "sources_attached" if web_context else (
            "web_search_enabled_but_no_sources" if enable_web_search else "web_search_disabled"
        ),
        "web_research_sources": web_research.get("sources") or [],
        "responses": [
            {
                "model": str(r.get("model", "")),
                "response": str(r.get("response", "")),
                "provider_model": str(r.get("provider_model", "")),
                "error": r.get("error"),
                "latency_ms": float(r.get("latency_ms", 0.0)),
            }
            for r in responses
        ],
        "metrics": metrics,
        "scores": scores,
        "best_model": str(best_row.get("model", "")),
        "best_response": redact_secrets(str(best_row.get("response", ""))),
        "reason": reason,
        "second_best_model": second_best_model,
        "second_best_response": redact_secrets(second_best_response),
        "second_best_score": float(second_best_score),
        "gemini_response": redact_secrets(gemini_response),
        "chatgpt_response": redact_secrets(chatgpt_response),
        "validator_scores": validator_scores,
        "validator_winner": validator_winner,
        "validator_winner_response": redact_secrets(validator_winner_response),
        "final_decision_metrics": validator_metrics,
        "final_decision_scores": validator_scores,
        "final_decision_winner": final_winner,
        "final_decision_winner_response": redact_secrets(final_winner_response),
        "final_decision_reason": final_reason,
        "quantum_selected_model": quantum_selected_model,
        "quantum_selected_score": float(quantum_selected_score),
        "quantum_layer_note": quantum_layer_note,
        "quantum_metadata": quantum_metadata,
        "validator_quantum_metadata": validator_quantum_metadata,
        "council_reliability": council_reliability,
        "latency": latency,
    }
    _cache_put(q, session_id, reasoning_mode, enable_web_search, response_payload)

    return EvaluateResponse(
        query=q,
        reasoning_mode=reasoning_mode,
        enable_web_search=enable_web_search,
        web_research_used=bool(web_context),
        web_research_sources_count=len(web_research.get("sources") or []),
        web_research_note="sources_attached" if web_context else (
            "web_search_enabled_but_no_sources" if enable_web_search else "web_search_disabled"
        ),
        web_research_sources=[
            WebResearchSource(
                source=str(s.get("source", "")),
                title=str(s.get("title", "")),
                url=str(s.get("url", "")),
                snippet=str(s.get("snippet", "")),
            )
            for s in (web_research.get("sources") or [])
        ],
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
        best_response=redact_secrets(str(best_row.get("response", ""))),
        reason=reason,
        second_best_model=second_best_model,
        second_best_response=redact_secrets(second_best_response),
        second_best_score=float(second_best_score),
        gemini_response=redact_secrets(gemini_response),
        chatgpt_response=redact_secrets(chatgpt_response),
        validator_scores=[ScoreRow(**s) for s in validator_scores],
        validator_winner=validator_winner,
        validator_winner_response=redact_secrets(validator_winner_response),
        final_decision_metrics=[MetricsRow(**m) for m in validator_metrics],
        final_decision_scores=[ScoreRow(**s) for s in validator_scores],
        final_decision_winner=final_winner,
        final_decision_winner_response=redact_secrets(final_winner_response),
        final_decision_reason=final_reason,
        quantum_selected_model=quantum_selected_model,
        quantum_selected_score=float(quantum_selected_score),
        quantum_layer_note=quantum_layer_note,
        quantum_metadata=quantum_metadata,
        validator_quantum_metadata=validator_quantum_metadata,
        council_reliability=council_reliability,
        latency=[LatencyRow(**l) for l in latency],
    )


@router.post("/query", response_model=EvaluateResponse)
async def post_query(payload: EvaluateRequest) -> EvaluateResponse:
    return await post_evaluate(payload)


@router.get("/history", response_model=HistoryResponse)
async def get_evaluation_history(
    limit: int = 20,
    session_id: Optional[str] = None,
    include_all_turns: bool = False,
) -> HistoryResponse:
    safe_session_id = _sanitize_session_id(session_id)
    return HistoryResponse(
        items=get_history(
            limit=limit,
            session_id=safe_session_id,
            main_turn_only=not include_all_turns,
        )
    )


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


@router.get("/quantum/status", response_model=QuantumStatusResponse)
async def get_quantum_status() -> QuantumStatusResponse:
    status = quantum_status_snapshot(
        mode=settings.quantum_optimization_mode,
        strength=float(settings.quantum_optimization_strength),
        seed=int(settings.quantum_optimization_seed),
    )
    return QuantumStatusResponse(**status)


@router.get("/providers/status", response_model=ProvidersStatusResponse)
async def get_providers_status() -> ProvidersStatusResponse:
    return ProvidersStatusResponse(**provider_status_snapshot())


@router.get("/providers/health-check", response_model=ProviderHealthCheckResponse)
async def get_providers_health_check() -> ProviderHealthCheckResponse:
    probe_prompt = (
        "Health check ping. Reply with exactly: OK"
    )
    results = await _await_with_timeout(
        broadcast_query(probe_prompt),
        timeout_seconds=max(10.0, float(settings.per_model_soft_timeout_seconds) * 4.0),
        fallback=[],
    )
    model_rows = _to_model_rows(results)
    rows: list[ProviderHealthModelRow] = []

    healthy = 0
    blocked = 0
    for row in model_rows:
        error_text = str(row.get("error") or "").strip()
        response_text = str(row.get("response") or "").strip()
        is_ok = bool(response_text) and not error_text
        if is_ok:
            healthy += 1
            rows.append(
                ProviderHealthModelRow(
                    model=str(row.get("model", "")),
                    provider_model=str(row.get("provider_model", "")),
                    status="ok",
                    latency_ms=float(row.get("latency_ms") or 0.0),
                )
            )
            continue

        blocked += 1
        reason = _classify_blocker(error_text)
        rows.append(
            ProviderHealthModelRow(
                model=str(row.get("model", "")),
                provider_model=str(row.get("provider_model", "")),
                status="blocked",
                blocker_code=reason.code,
                blocker_message=reason.message,
                attempts=_extract_attempts(error_text),
                latency_ms=float(row.get("latency_ms") or 0.0),
            )
        )

    gemini_status = await check_gemini_status()
    return ProviderHealthCheckResponse(
        summary=ProviderHealthSummary(
            total_models=len(rows),
            healthy_models=healthy,
            blocked_models=blocked,
        ),
        models=rows,
        gemini_status=gemini_status,
    )


@router.post("/feedback", response_model=FeedbackResponse)
async def post_feedback(payload: FeedbackRequest) -> FeedbackResponse:
    feedback_id = save_feedback(
        {
            "session_id": _sanitize_session_id(payload.session_id),
            "query": sanitize_query_text(payload.query),
            "best_model": str(payload.best_model or "").strip(),
            "selected_model": str(payload.selected_model or "").strip(),
            "is_positive": bool(payload.is_positive),
            "note": str(payload.note or "").strip(),
        }
    )
    return FeedbackResponse(ok=True, feedback_id=feedback_id)


@router.get("/feedback/insights", response_model=FeedbackInsightsResponse)
async def get_feedback_insights_endpoint(limit: int = 1000) -> FeedbackInsightsResponse:
    safe_limit = max(1, min(int(limit), 5000))
    return FeedbackInsightsResponse(**get_feedback_insights(limit=safe_limit))


@router.get("/reliability/insights", response_model=ReliabilityInsightsResponse)
async def get_reliability_insights_endpoint(limit: int = 120) -> ReliabilityInsightsResponse:
    safe_limit = max(1, min(int(limit), 1000))
    return ReliabilityInsightsResponse(**get_reliability_insights(limit=safe_limit))
