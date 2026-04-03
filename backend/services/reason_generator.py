from __future__ import annotations

from typing import Dict


def generate_reason(metrics: Dict[str, float], model_name: str) -> str:
    rel = float(metrics.get("relevance", 0.0))
    sem = float(metrics.get("semantic_similarity", 0.0))
    agr = float(metrics.get("agreement", 0.0))
    clr = float(metrics.get("clarity", 0.0))
    lng = float(metrics.get("length_optimization", 0.0))

    strengths = []
    if rel >= 0.75:
        strengths.append("highest relevance to the query")
    if sem >= 0.70:
        strengths.append("strong semantic alignment with peer models")
    if agr >= 0.65:
        strengths.append("high cross-model agreement")
    if clr >= 0.70:
        strengths.append("clear and readable phrasing")
    if lng >= 0.80:
        strengths.append("an optimal response length")

    if not strengths:
        strengths.append("the best overall weighted score across all metrics")

    joined = ", ".join(strengths[:-1]) + (" and " + strengths[-1] if len(strengths) > 1 else strengths[0])
    return (
        f"{model_name} was selected because it achieved {joined}, "
        "making it the most reliable council output by the multi-metric scoring formula."
    )
