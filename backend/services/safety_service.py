from __future__ import annotations

import re
from typing import Iterable

_CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_SPACE_RE = re.compile(r"\s+")
_SECRET_RE = re.compile(r"\b(?:sk-[A-Za-z0-9_\-]{20,}|AIza[A-Za-z0-9_\-]{20,})\b")
_YEAR_RE = re.compile(r"\b(20\d{2})\b")

_COLLEGE_TERMS = {
    "college",
    "institute",
    "university",
    "campus",
    "admission",
    "fees",
    "placement",
    "msrit",
    "ramaiah",
}

_HEALTH_TERMS = {
    "health",
    "medical",
    "doctor",
    "symptom",
    "fever",
    "pain",
    "medicine",
    "hospital",
    "chest pain",
    "breath",
}

_POLITICS_TERMS = {
    "politic",
    "election",
    "government",
    "policy",
    "minister",
    "party",
    "constitution",
    "parliament",
    "vote",
}

_RANKING_TERMS = {
    "nirf",
    "rank",
    "ranking",
    "rankings",
}


def sanitize_query_text(query: str, max_chars: int = 2000) -> str:
    cleaned = _CONTROL_RE.sub(" ", query or "")
    cleaned = _SPACE_RE.sub(" ", cleaned).strip()
    if len(cleaned) > max_chars:
        return cleaned[:max_chars].strip()
    return cleaned


def redact_secrets(text: str) -> str:
    return _SECRET_RE.sub("[REDACTED_SECRET]", text or "")


def detect_query_domain(query: str) -> str:
    q = (query or "").lower()

    if any(t in q for t in _COLLEGE_TERMS):
        return "college"
    if any(t in q for t in _HEALTH_TERMS):
        return "health"
    if any(t in q for t in _POLITICS_TERMS):
        return "politics"
    return "general"


def _has_domain_grounding(domain: str, source_files: Iterable[str]) -> bool:
    normalized = " ".join((s or "").lower() for s in source_files)

    if domain == "college":
        return "msrit" in normalized
    if domain == "health":
        return "health_query_safety_playbook" in normalized
    if domain == "politics":
        return "political_query_neutrality_playbook" in normalized
    return True


def _is_ranking_query(query: str) -> bool:
    q = (query or "").lower()
    return any(t in q for t in _RANKING_TERMS)


def _has_nirf_grounding(source_files: Iterable[str]) -> bool:
    normalized = " ".join((s or "").lower() for s in source_files)
    return "msrit_nirf_rankings_verified" in normalized


def enforce_response_safety(query: str, response_text: str, source_files: Iterable[str]) -> str:
    text = redact_secrets(response_text or "").strip()
    if not text:
        return text

    domain = detect_query_domain(query)

    if domain == "college" and _is_ranking_query(query):
        q = (query or "").lower()
        if "msrit" in q or "ramaiah" in q:
            if not _has_nirf_grounding(source_files):
                return (
                    "Safety check: NIRF ranking requested, but the dedicated verified ranking source is missing in retrieval. "
                    "Please retry or provide official NIRF/MSRIT ranking source for year-specific accuracy."
                )
            year_match = _YEAR_RE.search(q)
            if year_match and year_match.group(1) != "2025":
                return (
                    f"Safety check: verified MSRIT NIRF snapshot available in KB is for 2025, not {year_match.group(1)}. "
                    "Please provide an official source for that specific year, and I will answer from it only."
                )
            return (
                "Based on the current verified KB snapshot (official MSRIT homepage reference to NIRF 2025): "
                "Engineering rank is 75, Architecture rank is 31, and overall rank band is 101-150. "
                "If you want another year, provide the year explicitly and I will answer only from verified sources for that year."
            )

    if domain == "general":
        return text

    if _has_domain_grounding(domain, source_files):
        return text

    if domain == "college":
        return (
            "Safety check: I cannot verify institution-specific details from trusted sources for this query. "
            "Please provide an official institute link/document so I can answer accurately without guessing."
        )

    if domain == "health":
        return (
            "Safety check: I can provide only general health guidance here, not a diagnosis. "
            "For severe symptoms (for example chest pain or breathing difficulty), seek urgent medical care."
        )

    return (
        "Safety check: I do not have enough trusted political/civic sources for a definitive claim. "
        "Please verify with official government or election sources."
    )
