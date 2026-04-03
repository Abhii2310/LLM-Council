from __future__ import annotations

import os
from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    groq_api_key: Optional[str] = None
    openrouter_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None

    backend_cors_origins: str = "http://localhost:5173"
    request_timeout_seconds: int = 45
    rag_enabled: bool = True
    rag_docs_path: str = "knowledge_base"
    rag_chunk_size: int = 900
    rag_chunk_overlap: int = 150
    rag_top_k: int = 4
    sqlite_db_path: str = "data/llm_council.sqlite3"
    gemini_enabled: bool = True
    gemini_model: str = "gemini/gemini-pro"

    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.backend_cors_origins.split(",") if o.strip()]


settings = Settings()

if settings.groq_api_key:
    os.environ.setdefault("GROQ_API_KEY", settings.groq_api_key)

if settings.openrouter_api_key:
    os.environ.setdefault("OPENROUTER_API_KEY", settings.openrouter_api_key)

if settings.openai_api_key:
    os.environ.setdefault("OPENAI_API_KEY", settings.openai_api_key)

if settings.gemini_api_key:
    os.environ.setdefault("GEMINI_API_KEY", settings.gemini_api_key)
