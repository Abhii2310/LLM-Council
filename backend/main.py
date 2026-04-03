from __future__ import annotations

import asyncio
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database.db import init_db
from routes.query_routes import router as query_router
from utils.config import settings

logger = logging.getLogger("uvicorn.error")

app = FastAPI(title="LLM Council System", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(query_router)


def _prewarm_sentence_model() -> None:
    """
    Load and run one dummy inference on the sentence-transformer model.
    This "burns" the cold-start penalty (7-8 s) so the first real
    /evaluate request is fast.  Runs in an executor thread so it
    doesn't block the event loop.
    """
    try:
        from evaluation.metrics import _get_sentence_model, _embed_texts
        logger.info("Pre-warming sentence-transformer model…")
        _embed_texts(["warm up", "pre-warm sentence model"])
        logger.info("Sentence-transformer model ready ✓")
    except Exception as exc:  # noqa: BLE001
        logger.warning("Could not pre-warm sentence model: %s", exc)


@app.on_event("startup")
async def on_startup() -> None:
    init_db()
    # Run model pre-warm in a background thread (non-blocking)
    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, _prewarm_sentence_model)
