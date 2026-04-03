from __future__ import annotations

from pydantic import BaseModel, Field


class CouncilModel(BaseModel):
    key: str = Field(..., description="Stable identifier used by the system")
    display_name: str = Field(..., description="Human readable name")
    provider_model: str = Field(..., description="LiteLLM provider/model string")


COUNCIL_MODELS: list[CouncilModel] = [
    CouncilModel(
        key="llama3_70b",
        display_name="Llama 3.3 70B",
        provider_model="groq/llama-3.3-70b-versatile",
    ),
    CouncilModel(
        key="llama4_scout",
        display_name="Llama 4 Scout 17B",
        provider_model="groq/meta-llama/llama-4-scout-17b-16e-instruct",
    ),
    CouncilModel(
        key="kimi_k2",
        display_name="Kimi K2",
        provider_model="groq/moonshotai/kimi-k2-instruct",
    ),
    CouncilModel(
        key="llama3_8b",
        display_name="Llama 3.1 8B",
        provider_model="groq/llama-3.1-8b-instant",
    ),
]
