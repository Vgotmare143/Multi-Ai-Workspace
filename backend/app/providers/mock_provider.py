from __future__ import annotations

import asyncio
from typing import AsyncIterator, Optional
from app.providers.base import BaseAIProvider
from app.providers.models import (
    ProviderCapabilities,
    CanonicalChatRequest,
    CanonicalStreamEvent,
    ProviderHealthStatus,
)
from app.core.exceptions import ProviderQuotaExhaustedError

class MockProvider(BaseAIProvider):
    def __init__(self, simulated_provider_id: str = "mock") -> None:
        self._simulated_provider_id = simulated_provider_id

    @property
    def provider_id(self) -> str:
        return self._simulated_provider_id

    def get_capabilities(self) -> ProviderCapabilities:
        return ProviderCapabilities(
            supports_streaming=True,
            supports_system_prompt=True,
            supports_tool_calling=True,
            supports_token_counting=True,
            exposes_quota_headers=True,
            max_context_tokens=200000,
        )

    async def stream_chat(
        self, request: CanonicalChatRequest, api_key: Optional[str] = None
    ) -> AsyncIterator[CanonicalStreamEvent]:
        if request.simulate_rate_limit:
            raise ProviderQuotaExhaustedError(
                provider=self.provider_id,
                reset_at="4:00 PM",
            )

        user_msg = next(
            (m.content for m in reversed(request.messages) if m.role == "user"),
            "No input",
        )

        response_text = (
            f"[{self.provider_id.upper()} Simulator Response to: {user_msg[:40]}]\n\n"
            "I have inspected your workspace context and `.project-ai/` state. "
            "The implementation state is synchronized and ready for the next step."
        )

        words = response_text.split(" ")
        for i, word in enumerate(words):
            await asyncio.sleep(0.01)
            suffix = " " if i < len(words) - 1 else ""
            yield CanonicalStreamEvent(event_type="chunk", content=word + suffix)

        input_tokens = await self.count_tokens(
            " ".join(m.content for m in request.messages)
        )
        output_tokens = await self.count_tokens(response_text)

        yield CanonicalStreamEvent(
            event_type="done",
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            remaining_requests=49,
            remaining_tokens=99500,
        )

    async def count_tokens(self, text: str) -> int:
        return max(1, len(text) // 4)

    async def validate_credentials(self, api_key: Optional[str] = None) -> ProviderHealthStatus:
        return ProviderHealthStatus(is_healthy=True, latency_ms=5.0)
