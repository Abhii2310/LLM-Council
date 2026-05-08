#!/usr/bin/env python3
"""Regression checks for verdict fairness and tie-breaking behavior."""

from evaluation.scoring_engine import select_best_response


def run() -> None:
    responses = [
        {
            "model": "model_a",
            "response": "answer from model a",
            "error": None,
        },
        {
            "model": "model_b",
            "response": "answer from model b",
            "error": None,
        },
    ]

    # Same final score for both models; tie must be resolved via metric quality,
    # not list order.
    scores = [
        {"model": "model_a", "final_score": 0.82},
        {"model": "model_b", "final_score": 0.82},
    ]
    metrics = [
        {
            "model": "model_a",
            "relevance": 0.86,
            "semantic_similarity": 0.75,
            "agreement": 0.74,
            "clarity": 0.80,
            "length_optimization": 0.70,
        },
        {
            "model": "model_b",
            "relevance": 0.90,
            "semantic_similarity": 0.72,
            "agreement": 0.70,
            "clarity": 0.78,
            "length_optimization": 0.68,
        },
    ]

    best_row, _, _ = select_best_response(responses, metrics, scores)
    if best_row["model"] != "model_b":
        raise AssertionError(f"Expected model_b to win on tie-break relevance, got {best_row['model']}")

    # Swap response order and confirm winner remains unchanged.
    swapped = [responses[1], responses[0]]
    best_row_swapped, _, _ = select_best_response(swapped, metrics, scores)
    if best_row_swapped["model"] != "model_b":
        raise AssertionError(
            f"Order bias detected: expected model_b after swapping, got {best_row_swapped['model']}"
        )

    print("PASS: verdict fairness tie-break is deterministic and order-independent")


if __name__ == "__main__":
    run()
