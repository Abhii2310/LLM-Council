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
    ollama_api_key: Optional[str] = None
    deepseek_api_key: Optional[str] = None
    cohere_api_key: Optional[str] = None
    cerebras_api_key: Optional[str] = None
    sambanova_api_key: Optional[str] = None
    cloudflare_api_key: Optional[str] = None
    cloudflare_account_id: Optional[str] = None
    nvidia_api_key: Optional[str] = None
    together_api_key: Optional[str] = None
    aimlapi_api_key: Optional[str] = None
    tavily_api_key: Optional[str] = None
    jina_api_key: Optional[str] = None
    serpapi_api_key: Optional[str] = None

    backend_cors_origins: str = "http://localhost:5173"
    request_timeout_seconds: int = 45
    rag_enabled: bool = True
    rag_docs_path: str = "knowledge_base"
    rag_chunk_size: int = 900
    rag_chunk_overlap: int = 150
    rag_top_k: int = 4
    rag_signature_refresh_seconds: int = 20
    sqlite_db_path: str = "data/llm_council.sqlite3"
    gemini_enabled: bool = True
    gemini_model: str = "gemini/gemini-pro"
    chatgpt_enabled: bool = True
    chatgpt_model: str = "openai/gpt-4o-mini"
    per_model_soft_timeout_seconds: int = 12
    evaluate_cache_ttl_seconds: int = 300
    prefer_local_ollama: bool = False
    ollama_primary_model: str = "ollama/llama3.1:8b"
    ollama_fallback_model: str = "ollama/qwen2.5:7b"
    quantum_optimization_mode: str = "assist"
    quantum_optimization_strength: float = 0.08
    quantum_optimization_seed: int = 23
    web_research_enabled: bool = True
    web_research_timeout_seconds: int = 10

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

if settings.ollama_api_key:
    os.environ.setdefault("OLLAMA_API_KEY", settings.ollama_api_key)

if settings.deepseek_api_key:
    os.environ.setdefault("DEEPSEEK_API_KEY", settings.deepseek_api_key)

if settings.cohere_api_key:
    os.environ.setdefault("COHERE_API_KEY", settings.cohere_api_key)

if settings.cerebras_api_key:
    os.environ.setdefault("CEREBRAS_API_KEY", settings.cerebras_api_key)

if settings.sambanova_api_key:
    os.environ.setdefault("SAMBANOVA_API_KEY", settings.sambanova_api_key)

if settings.cloudflare_api_key:
    os.environ.setdefault("CLOUDFLARE_API_KEY", settings.cloudflare_api_key)

if settings.cloudflare_account_id:
    os.environ.setdefault("CLOUDFLARE_ACCOUNT_ID", settings.cloudflare_account_id)

if settings.nvidia_api_key:
    os.environ.setdefault("NVIDIA_API_KEY", settings.nvidia_api_key)
    os.environ.setdefault("NVIDIA_NIM_API_KEY", settings.nvidia_api_key)
    os.environ.setdefault("NVCF_API_KEY", settings.nvidia_api_key)

if settings.together_api_key:
    os.environ.setdefault("TOGETHERAI_API_KEY", settings.together_api_key)
    os.environ.setdefault("TOGETHER_API_KEY", settings.together_api_key)

if settings.aimlapi_api_key:
    os.environ.setdefault("AIMLAPI_API_KEY", settings.aimlapi_api_key)

if settings.tavily_api_key:
    os.environ.setdefault("TAVILY_API_KEY", settings.tavily_api_key)

if settings.jina_api_key:
    os.environ.setdefault("JINA_API_KEY", settings.jina_api_key)

if settings.serpapi_api_key:
    os.environ.setdefault("SERPAPI_API_KEY", settings.serpapi_api_key)
