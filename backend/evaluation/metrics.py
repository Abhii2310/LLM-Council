from __future__ import annotations

import re
from typing import Dict, List

import numpy as np

try:
    from sentence_transformers import SentenceTransformer
except Exception:  # noqa: BLE001
    SentenceTransformer = None  # type: ignore


_SENTENCE_MODEL = None
_SENTENCE_SPLIT_RE = re.compile(r"[.!?]+")


def _get_sentence_model():
    global _SENTENCE_MODEL
    if _SENTENCE_MODEL is None and SentenceTransformer is not None:
        _SENTENCE_MODEL = SentenceTransformer("all-MiniLM-L6-v2")
    return _SENTENCE_MODEL


def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)


def _clamp01(x: float) -> float:
    return max(0.0, min(1.0, x))


def _normalize_cosine(cos_value: float) -> float:
    return _clamp01((cos_value + 1.0) / 2.0)


def _embed_texts(texts: List[str]) -> np.ndarray:
    model = _get_sentence_model()
    if model is not None:
        vectors = model.encode(texts, normalize_embeddings=True)
        return np.asarray(vectors, dtype=np.float32)

    vocab: Dict[str, int] = {}
    rows: List[Dict[int, float]] = []
    for t in texts:
        tokens = re.findall(r"[a-zA-Z0-9]+", t.lower())
        counts: Dict[int, float] = {}
        for tok in tokens:
            idx = vocab.setdefault(tok, len(vocab))
            counts[idx] = counts.get(idx, 0.0) + 1.0
        rows.append(counts)

    if not vocab:
        return np.zeros((len(texts), 1), dtype=np.float32)

    mat = np.zeros((len(texts), len(vocab)), dtype=np.float32)
    for r, counts in enumerate(rows):
        for c, v in counts.items():
            mat[r, c] = v
        norm = np.linalg.norm(mat[r])
        if norm > 0:
            mat[r] = mat[r] / norm
    return mat


def clarity_score(text: str) -> float:
    words = re.findall(r"\b\w+\b", text)
    word_count = len(words)
    if word_count == 0:
        return 0.0

    sentences = [s.strip() for s in _SENTENCE_SPLIT_RE.split(text) if s.strip()]
    sentence_count = max(1, len(sentences))
    avg_sentence_len = word_count / sentence_count

    sentence_len_component = 1.0 - min(abs(avg_sentence_len - 18.0) / 18.0, 1.0)

    punctuation_endings = len(re.findall(r"[.!?]", text))
    punctuation_component = min(1.0, punctuation_endings / sentence_count)

    cap_ratio = sum(1 for ch in text if ch.isupper()) / max(1, len(text))
    cap_component = 1.0 - min(cap_ratio / 0.2, 1.0)

    score = 0.55 * sentence_len_component + 0.30 * punctuation_component + 0.15 * cap_component
    return round(_clamp01(score), 4)


def length_optimization_score(text: str, ideal_min: int = 80, ideal_max: int = 300) -> float:
    words = re.findall(r"\b\w+\b", text)
    n = len(words)
    if n == 0:
        return 0.0

    if ideal_min <= n <= ideal_max:
        return 1.0

    if n < ideal_min:
        floor = 20
        score = (n - floor) / max(1, ideal_min - floor)
        return round(_clamp01(score), 4)

    ceiling = 600
    score = (ceiling - n) / max(1, ceiling - ideal_max)
    return round(_clamp01(score), 4)


def compute_metrics(query: str, model_rows: List[Dict[str, object]]) -> List[Dict[str, object]]:
    texts = [str(row.get("response") or "") for row in model_rows]
    embeddings = _embed_texts([query] + texts)
    query_emb = embeddings[0]
    response_embs = embeddings[1:]

    n = len(model_rows)
    pairwise = np.zeros((n, n), dtype=np.float32)
    for i in range(n):
        for j in range(i, n):
            sim = _cosine(response_embs[i], response_embs[j])
            pairwise[i, j] = sim
            pairwise[j, i] = sim

    results: List[Dict[str, object]] = []
    for i, row in enumerate(model_rows):
        text = str(row.get("response") or "")
        has_error = bool(row.get("error")) or not text.strip()

        if has_error:
            metric = {
                "model": row.get("model"),
                "relevance": 0.0,
                "semantic_similarity": 0.0,
                "agreement": 0.0,
                "clarity": 0.0,
                "length_optimization": 0.0,
            }
            results.append(metric)
            continue

        rel = _normalize_cosine(_cosine(query_emb, response_embs[i]))

        peers = [pairwise[i, j] for j in range(n) if j != i and not model_rows[j].get("error")]
        if peers:
            sem_raw = float(np.mean(peers))
            sem = _normalize_cosine(sem_raw)
            agree_count = sum(1 for s in peers if _normalize_cosine(float(s)) >= 0.70)
            agree = agree_count / len(peers)
        else:
            sem = 0.0
            agree = 0.0

        metric = {
            "model": row.get("model"),
            "relevance": round(_clamp01(rel), 4),
            "semantic_similarity": round(_clamp01(sem), 4),
            "agreement": round(_clamp01(agree), 4),
            "clarity": clarity_score(text),
            "length_optimization": length_optimization_score(text),
        }
        results.append(metric)

    return results
