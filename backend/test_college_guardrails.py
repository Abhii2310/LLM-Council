#!/usr/bin/env python3
"""Regression checks for college-query grounding guardrails."""

from services.safety_service import enforce_response_safety


def _assert_contains(text: str, expected: str) -> None:
    if expected not in text:
        raise AssertionError(f"Expected substring not found: {expected!r}\nGot: {text!r}")


def run() -> None:
    grounded_sources = [
        "knowledge_base/msrit_nirf_rankings_verified.md",
        "knowledge_base/msrit_overview_official.md",
    ]
    missing_ranking_source = ["knowledge_base/msrit_overview_official.md"]

    out = enforce_response_safety(
        "What is MSRIT NIRF ranking?",
        "model output",
        grounded_sources,
    )
    _assert_contains(out, "official MSRIT homepage reference to NIRF 2025")
    _assert_contains(out, "Engineering rank is 75")

    out = enforce_response_safety(
        "What is MSRIT NIRF ranking in 2023?",
        "model output",
        grounded_sources,
    )
    _assert_contains(out, "snapshot available in KB is for 2025, not 2023")

    out = enforce_response_safety(
        "What is MSRIT NIRF ranking?",
        "model output",
        missing_ranking_source,
    )
    _assert_contains(out, "dedicated verified ranking source is missing")

    out = enforce_response_safety(
        "Tell me MSRIT hostel fee details",
        "hallucinated fee number",
        [],
    )
    _assert_contains(out, "cannot verify institution-specific details")

    print("PASS: college guardrails are enforced")


if __name__ == "__main__":
    run()
