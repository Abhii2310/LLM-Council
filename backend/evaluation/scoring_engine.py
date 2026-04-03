from __future__ import annotations

from typing import Dict, List, Tuple

WEIGHTS = {
    "relevance": 0.35,            # How well the response addresses the query
    "semantic_similarity": 0.30,  # Alignment with the peer consensus
    "agreement": 0.15,            # Cross-model agreement
    "clarity": 0.12,              # Readability and structure
    "length_optimization": 0.08,  # Penalises only extreme brevity/verbosity
}



def score_metrics(metrics: List[Dict[str, object]]) -> List[Dict[str, object]]:
    scored: List[Dict[str, object]] = []
    for row in metrics:
        final_score = (
            WEIGHTS["relevance"] * float(row.get("relevance", 0.0))
            + WEIGHTS["semantic_similarity"] * float(row.get("semantic_similarity", 0.0))
            + WEIGHTS["agreement"] * float(row.get("agreement", 0.0))
            + WEIGHTS["clarity"] * float(row.get("clarity", 0.0))
            + WEIGHTS["length_optimization"] * float(row.get("length_optimization", 0.0))
        )

        scored.append(
            {
                "model": row.get("model"),
                "final_score": round(float(final_score), 4),
            }
        )
    return scored


def select_best_response(
    responses: List[Dict[str, object]],
    metrics: List[Dict[str, object]],
    scores: List[Dict[str, object]],
) -> Tuple[Dict[str, object], Dict[str, object], Dict[str, object]]:
    score_map = {str(s["model"]): s for s in scores}
    metric_map = {str(m["model"]): m for m in metrics}

    valid = [r for r in responses if not r.get("error") and str(r.get("model")) in score_map]
    if not valid:
        fallback = responses[0] if responses else {"model": "none", "response": ""}
        model = str(fallback.get("model", "none"))
        return (
            fallback,
            metric_map.get(
                model,
                {
                    "model": model,
                    "relevance": 0.0,
                    "semantic_similarity": 0.0,
                    "agreement": 0.0,
                    "clarity": 0.0,
                    "length_optimization": 0.0,
                },
            ),
            score_map.get(model, {"model": model, "final_score": 0.0}),
        )

    best = max(valid, key=lambda r: score_map[str(r["model"])]["final_score"])
    model_key = str(best["model"])
    return best, metric_map[model_key], score_map[model_key]
