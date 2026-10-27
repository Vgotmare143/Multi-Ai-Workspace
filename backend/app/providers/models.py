from __future__ import annotations

from typing import List, Optional, Literal
from pydantic import BaseModel

class ProviderCapabilities(BaseModel):
    supports_streaming: bool
    supports_system_prompt: bool
    supports_tool_calling: bool
    supports_token_counting: bool
    exposes_quota_headers: bool
    max_context_tokens: int

class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system", "tool"]
    content: str

class CanonicalChatRequest(BaseModel):
    messages: List[ChatMessage]
    model_id: str
    system_prompt: Optional[str] = None
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    simulate_rate_limit: bool = False  # Used to test the 429 fallback in Mock Mode

class CanonicalStreamEvent(BaseModel):
    event_type: Literal["chunk", "done", "error"]
    content: str = ""
    error_detail: Optional[str] = None
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    remaining_requests: Optional[int] = None
    remaining_tokens: Optional[int] = None
    reset_at: Optional[str] = None

class ProviderHealthStatus(BaseModel):
    is_healthy: bool
    latency_ms: Optional[float] = None
    error: Optional[str] = None

class ClassifiedProviderError(BaseModel):
    category: Literal[
        "QUOTA_EXHAUSTED",
        "RATE_LIMITED",
        "PROVIDER_OVERLOADED",
        "NETWORK_TIMEOUT",
        "CONTEXT_LENGTH_EXCEEDED",
        "AUTH_INVALID",
        "INVALID_REQUEST",
        "UNKNOWN_ERROR",
    ]
    is_recoverable_via_fallback: bool
    message: str
    retry_after_seconds: Optional[int] = None
    estimated_reset_at: Optional[str] = None
