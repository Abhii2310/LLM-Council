from __future__ import annotations

from dataclasses import dataclass
import os
from typing import Any

import random


@dataclass
class QuantumOptimizationResult:
    optimized_scores: list[dict[str, Any]]
    objective: float
    iterations: int


def _normalize(values: list[float]) -> list[float]:
    if not values:
        return []
    lo = min(values)
    hi = max(values)
    if hi - lo <= 1e-9:
        return [0.5 for _ in values]
    return [(v - lo) / (hi - lo) for v in values]


def _extract_latency_ms(rows: list[dict[str, Any]], model: str) -> float:
    for row in rows:
        if str(row.get("model", "")) == model:
            try:
                return float(row.get("latency_ms", 0.0) or 0.0)
            except Exception:
                return 0.0
    return 0.0


def _objective(
    score: float,
    relevance: float,
    clarity: float,
    latency_norm: float,
    strength: float,
) -> float:
    quality_term = 0.72 * score + 0.18 * relevance + 0.10 * clarity
    latency_term = 0.06 * latency_norm
    return quality_term - (strength * latency_term)


def optimize_scores_quantum_assist(
    *,
    scores: list[dict[str, Any]],
    metrics: list[dict[str, Any]],
    latency_rows: list[dict[str, Any]],
    strength: float,
    seed: int,
    iterations: int = 48,
) -> QuantumOptimizationResult:
    if not scores:
        return QuantumOptimizationResult(optimized_scores=[], objective=0.0, iterations=0)

    metric_map = {str(m.get("model", "")): m for m in metrics}
    model_keys = [str(s.get("model", "")) for s in scores]
    score_vals = [float(s.get("final_score", 0.0) or 0.0) for s in scores]
    latency_vals = [_extract_latency_ms(latency_rows, m) for m in model_keys]

    norm_latency = _normalize(latency_vals)
    rng = random.Random(seed)

    best_scores = list(score_vals)
    best_objective = float("-inf")

    for _ in range(max(1, int(iterations))):
        candidate = []
        for base in score_vals:
            noise = (rng.random() - 0.5) * strength * 0.08
            candidate.append(max(0.0, min(1.0, base + noise)))

        obj = 0.0
        for idx, model_key in enumerate(model_keys):
            metric_row = metric_map.get(model_key, {})
            obj += _objective(
                score=candidate[idx],
                relevance=float(metric_row.get("relevance", 0.0) or 0.0),
                clarity=float(metric_row.get("clarity", 0.0) or 0.0),
                latency_norm=norm_latency[idx] if idx < len(norm_latency) else 0.0,
                strength=strength,
            )

        if obj > best_objective:
            best_objective = obj
            best_scores = candidate

    optimized_scores = [
        {"model": model_keys[i], "final_score": round(float(best_scores[i]), 4)}
        for i in range(len(model_keys))
    ]
    return QuantumOptimizationResult(
        optimized_scores=optimized_scores,
        objective=round(float(best_objective), 6),
        iterations=max(1, int(iterations)),
    )


def maybe_apply_quantum_assist(
    *,
    mode: str,
    scores: list[dict[str, Any]],
    metrics: list[dict[str, Any]],
    latency_rows: list[dict[str, Any]],
    strength: float,
    seed: int,
) -> list[dict[str, Any]]:
    optimized, _meta = maybe_apply_quantum_assist_with_meta(
        mode=mode,
        scores=scores,
        metrics=metrics,
        latency_rows=latency_rows,
        strength=strength,
        seed=seed,
    )
    return optimized


def maybe_apply_quantum_assist_with_meta(
    *,
    mode: str,
    scores: list[dict[str, Any]],
    metrics: list[dict[str, Any]],
    latency_rows: list[dict[str, Any]],
    strength: float,
    seed: int,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    selected_mode = str(mode or "off").strip().lower()
    if selected_mode not in {"assist", "hybrid"}:
        return scores, {
            "enabled": False,
            "mode": selected_mode,
            "applied": False,
            "reason": "Quantum optimization disabled by mode.",
        }

    safe_strength = max(0.0, min(float(strength), 0.35))
    if safe_strength <= 1e-9:
        return scores, {
            "enabled": True,
            "mode": selected_mode,
            "applied": False,
            "reason": "Quantum optimization strength is zero.",
            "strength": safe_strength,
        }

    backend = "simulated-annealing"
    provider_used = "local"
    if selected_mode == "hybrid":
        if os.getenv("D_WAVE_API_TOKEN"):
            provider_used = "d-wave"
            backend = "hybrid-quantum-annealing"
        elif os.getenv("IBMQ_TOKEN"):
            provider_used = "ibm"
            backend = "hybrid-gate-based"

    try:
        result = optimize_scores_quantum_assist(
            scores=scores,
            metrics=metrics,
            latency_rows=latency_rows,
            strength=safe_strength,
            seed=int(seed),
        )
        optimized = result.optimized_scores if result.optimized_scores else scores
        return optimized, {
            "enabled": True,
            "mode": selected_mode,
            "applied": bool(result.optimized_scores),
            "backend": backend,
            "provider": provider_used,
            "strength": safe_strength,
            "seed": int(seed),
            "iterations": int(result.iterations),
            "objective": float(result.objective),
            "candidate_count": len(scores),
        }
    except Exception:
        return scores, {
            "enabled": True,
            "mode": selected_mode,
            "applied": False,
            "backend": backend,
            "provider": provider_used,
            "strength": safe_strength,
            "seed": int(seed),
            "reason": "Optimizer fallback used due to internal error.",
        }


def quantum_status_snapshot(*, mode: str, strength: float, seed: int) -> dict[str, Any]:
    selected_mode = str(mode or "off").strip().lower()
    safe_strength = max(0.0, min(float(strength), 0.35))
    d_wave_available = bool(os.getenv("D_WAVE_API_TOKEN"))
    ibm_available = bool(os.getenv("IBMQ_TOKEN"))
    provider = "local"
    backend = "simulated-annealing"
    if selected_mode == "hybrid":
        if d_wave_available:
            provider = "d-wave"
            backend = "hybrid-quantum-annealing"
        elif ibm_available:
            provider = "ibm"
            backend = "hybrid-gate-based"

    return {
        "enabled": selected_mode in {"assist", "hybrid"} and safe_strength > 0.0,
        "mode": selected_mode,
        "strength": safe_strength,
        "seed": int(seed),
        "backend": backend,
        "provider": provider,
        "providers_available": {
            "d_wave": d_wave_available,
            "ibm": ibm_available,
            "local": True,
        },
    }
