from __future__ import annotations

from pydantic import BaseModel, Field
from typing import List


class CouncilModel(BaseModel):
    key: str = Field(..., description="Stable identifier used by the system")
    display_name: str = Field(..., description="Human readable name")
    provider_model: str = Field(..., description="LiteLLM provider/model string")
    fallback_provider_models: List[str] = Field(
        default_factory=list,
        description="Ordered fallback provider/model strings to try if the primary model is unavailable",
    )


COUNCIL_MODELS: list[CouncilModel] = [
    CouncilModel(
        key="llama3_70b",
        display_name="Llama 3.3 70B",
        provider_model="groq/llama-3.3-70b-versatile",
        fallback_provider_models=["ollama/llama3.1:8b", "ollama/qwen2.5:7b"],
    ),
    CouncilModel(
        key="llama4_scout",
        display_name="Llama 4 Scout 17B",
        provider_model="groq/meta-llama/llama-4-scout-17b-16e-instruct",
        fallback_provider_models=[
            "groq/llama-3.1-8b-instant",
            "openrouter/moonshotai/kimi-k2:free",
            "ollama/llama3.1:8b",
            "ollama/qwen2.5:7b",
        ],
    ),
    CouncilModel(
        key="kimi_k2",
        display_name="Kimi K2",
        provider_model="openrouter/moonshotai/kimi-k2",
        fallback_provider_models=[
            "openrouter/moonshotai/kimi-k2-instruct",
            "openrouter/moonshotai/kimi-k2:free",
            "openrouter/moonshotai/kimi-k2-instruct:free",
            "ollama/qwen2.5:7b",
        ],
    ),
    CouncilModel(
        key="llama3_8b",
        display_name="Llama 3.1 8B",
        provider_model="groq/llama-3.1-8b-instant",
        fallback_provider_models=["ollama/llama3.1:8b", "ollama/qwen2.5:7b"],
    ),
    CouncilModel(
        key="deepseek_chat",
        display_name="DeepSeek Chat",
        provider_model="deepseek/deepseek-chat",
        fallback_provider_models=[
            "openrouter/deepseek/deepseek-chat",
            "groq/llama-3.1-8b-instant",
            "ollama/qwen2.5:7b",
        ],
    ),
    CouncilModel(
        key="cohere_command_r",
        display_name="Cohere Command R",
        provider_model="cohere/command-r",
        fallback_provider_models=[
            "openrouter/cohere/command-r",
            "groq/llama-3.1-8b-instant",
            "ollama/qwen2.5:7b",
        ],
    ),
    CouncilModel(
        key="cerebras_llama3_70b",
        display_name="Cerebras Llama 3.1 70B",
        provider_model="cerebras/llama3.1-70b",
        fallback_provider_models=["groq/llama-3.3-70b-versatile", "ollama/llama3.1:8b"],
    ),
    CouncilModel(
        key="sambanova_qwen",
        display_name="SambaNova Qwen 2.5 72B",
        provider_model="sambanova/qwen2.5-72b-instruct",
        fallback_provider_models=[
            "openrouter/qwen/qwen-2.5-72b-instruct",
            "groq/llama-3.1-8b-instant",
            "ollama/qwen2.5:7b",
        ],
    ),
    CouncilModel(
        key="nvidia_llama",
        display_name="NVIDIA Llama 3.1 Nemotron 70B",
        provider_model="nvidia_nim/meta/llama-3.1-70b-instruct",
        fallback_provider_models=["groq/llama-3.3-70b-versatile", "ollama/llama3.1:8b"],
    ),
    CouncilModel(
        key="together_qwen",
        display_name="Together Qwen 2.5 72B",
        provider_model="together_ai/Qwen/Qwen2.5-72B-Instruct-Turbo",
        fallback_provider_models=[
            "openrouter/qwen/qwen-2.5-72b-instruct",
            "groq/llama-3.1-8b-instant",
            "ollama/qwen2.5:7b",
        ],
    ),
    CouncilModel(
        key="aimlapi_mistral",
        display_name="AI/ML API Mistral Small",
        provider_model="aimlapi/mistralai/mistral-small-3.1-24b-instruct",
        fallback_provider_models=[
            "openrouter/mistralai/mistral-small-3.1-24b-instruct",
            "groq/llama-3.1-8b-instant",
            "ollama/qwen2.5:7b",
        ],
    ),
    CouncilModel(
        key="ollama_local",
        display_name="Ollama Local",
        provider_model="ollama/llama3.1:8b",
        fallback_provider_models=[
            "ollama/qwen2.5:7b",
            "nvidia_nim/meta/llama-3.1-70b-instruct",
            "groq/llama-3.1-8b-instant",
            "openrouter/moonshotai/kimi-k2:free",
            "openrouter/qwen/qwen-2.5-72b-instruct",
        ],
    ),
]
