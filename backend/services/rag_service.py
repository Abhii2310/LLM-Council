from __future__ import annotations

import math
import re
from collections import Counter
from pathlib import Path
from typing import Dict, List, Tuple

from utils.config import settings

ALLOWED_EXTENSIONS = {".txt", ".md", ".markdown"}
_TOKEN_RE = re.compile(r"[a-zA-Z0-9]+")


def _tokenize(text: str) -> List[str]:
    return _TOKEN_RE.findall((text or "").lower())


def _chunk_text(text: str, chunk_size: int, overlap: int) -> List[str]:
    clean = (text or "").strip()
    if not clean:
        return []

    if len(clean) <= chunk_size:
        return [clean]

    chunks: List[str] = []
    start = 0
    step = max(chunk_size - overlap, 1)
    while start < len(clean):
        end = min(start + chunk_size, len(clean))
        chunk = clean[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(clean):
            break
        start += step
    return chunks


class LocalRAGIndex:
    def __init__(self) -> None:
        self.doc_paths: List[Path] = []
        self.chunks: List[Dict[str, str]] = []
        self.chunk_vectors: List[Dict[str, float]] = []
        self.idf: Dict[str, float] = {}

    def build(self, docs_root: Path, chunk_size: int, overlap: int) -> None:
        self.doc_paths = sorted(
            [
                p
                for p in docs_root.rglob("*")
                if p.is_file() and p.suffix.lower() in ALLOWED_EXTENSIONS
            ]
        )

        chunk_rows: List[Dict[str, str]] = []
        for path in self.doc_paths:
            try:
                raw = path.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                raw = path.read_text(encoding="latin-1")

            for idx, chunk in enumerate(_chunk_text(raw, chunk_size, overlap)):
                chunk_rows.append(
                    {
                        "source": str(path.relative_to(docs_root)),
                        "title": path.stem,
                        "chunk_id": str(idx),
                        "text": chunk,
                    }
                )

        self.chunks = chunk_rows
        if not self.chunks:
            self.chunk_vectors = []
            self.idf = {}
            return

        doc_freq: Counter = Counter()
        tf_counts: List[Counter] = []

        for row in self.chunks:
            tokens = _tokenize(row["text"])
            counts = Counter(tokens)
            tf_counts.append(counts)
            for tok in counts.keys():
                doc_freq[tok] += 1

        total_docs = len(self.chunks)
        self.idf = {
            tok: math.log((1 + total_docs) / (1 + df)) + 1.0
            for tok, df in doc_freq.items()
        }

        vectors: List[Dict[str, float]] = []
        for counts in tf_counts:
            total_terms = sum(counts.values()) or 1
            vec: Dict[str, float] = {}
            for tok, c in counts.items():
                tf = c / total_terms
                vec[tok] = tf * self.idf.get(tok, 0.0)
            vectors.append(vec)

        self.chunk_vectors = vectors

    def retrieve(self, query: str, top_k: int = 4) -> List[Tuple[int, float]]:
        if not self.chunks or not self.idf:
            return []

        q_counts = Counter(_tokenize(query))
        if not q_counts:
            return []

        q_total = sum(q_counts.values()) or 1
        q_vec: Dict[str, float] = {
            tok: (count / q_total) * self.idf.get(tok, 0.0)
            for tok, count in q_counts.items()
            if tok in self.idf
        }
        if not q_vec:
            return []

        q_norm = math.sqrt(sum(v * v for v in q_vec.values())) or 1.0

        scored: List[Tuple[int, float]] = []
        for idx, d_vec in enumerate(self.chunk_vectors):
            dot = 0.0
            for tok, qv in q_vec.items():
                dot += qv * d_vec.get(tok, 0.0)
            d_norm = math.sqrt(sum(v * v for v in d_vec.values())) or 1.0
            score = dot / (q_norm * d_norm)
            if score > 0:
                scored.append((idx, score))

        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[: max(top_k, 1)]


_CACHE_SIGNATURE: str = ""
_CACHE_INDEX: LocalRAGIndex = LocalRAGIndex()


def _docs_signature(docs_root: Path) -> str:
    if not docs_root.exists() or not docs_root.is_dir():
        return "missing"

    parts: List[str] = []
    for p in sorted(docs_root.rglob("*")):
        if p.is_file() and p.suffix.lower() in ALLOWED_EXTENSIONS:
            stat = p.stat()
            parts.append(f"{p}:{int(stat.st_mtime)}:{stat.st_size}")
    return "|".join(parts)


def get_rag_context(query: str) -> Dict[str, object]:
    if not settings.rag_enabled:
        return {"enabled": False, "context": "", "sources": []}

    docs_root = Path(settings.rag_docs_path)
    signature = _docs_signature(docs_root)

    global _CACHE_SIGNATURE, _CACHE_INDEX
    if signature != _CACHE_SIGNATURE:
        index = LocalRAGIndex()
        index.build(
            docs_root=docs_root,
            chunk_size=settings.rag_chunk_size,
            overlap=settings.rag_chunk_overlap,
        )
        _CACHE_INDEX = index
        _CACHE_SIGNATURE = signature

    hits = _CACHE_INDEX.retrieve(query, top_k=settings.rag_top_k)
    if not hits:
        return {"enabled": True, "context": "", "sources": []}

    sources: List[Dict[str, object]] = []
    context_blocks: List[str] = []

    for rank, (idx, score) in enumerate(hits, start=1):
        row = _CACHE_INDEX.chunks[idx]
        snippet = row["text"][:400].strip()
        source_item = {
            "rank": rank,
            "source": row["source"],
            "title": row["title"],
            "chunk_id": row["chunk_id"],
            "score": round(float(score), 4),
            "snippet": snippet,
        }
        sources.append(source_item)
        context_blocks.append(
            f"[{rank}] {row['title']} ({row['source']})\n{row['text']}"
        )

    context = "\n\n".join(context_blocks)
    return {"enabled": True, "context": context, "sources": sources}
