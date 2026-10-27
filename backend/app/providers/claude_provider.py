from __future__ import annotations

import time
from typing import AsyncIterator, Optional, Any, cast

import anthropic
from anthropic import AsyncAnthropic, APIError, APIStatusError
from app.providers.base import BaseAIProvider
from app.providers.models import (
    ProviderCapabilities,
    CanonicalChatRequest,
    CanonicalStreamEvent,
    ProviderHealthStatus,
)
from app.core.exceptions import (
    ProviderQuotaExhaustedError,
    ProviderRateLimitError,
)


class ClaudeProvider(BaseAIProvider):
    def __init__(self) -> None:
        pass

    @property
    def provider_id(self) -> str:
        return "claude"

    def get_capabilities(self) -> ProviderCapabilities:
        return ProviderCapabilities(
            supports_streaming=True,
            supports_system_prompt=True,
            supports_tool_calling=True,
            supports_token_counting=True,
            exposes_quota_headers=True,
            max_context_tokens=200000,
        )

    def _get_client(self, api_key: Optional[str]) -> AsyncAnthropic:
        if not api_key:
            raise ValueError("Anthropic API key is required but was not provided.")
        return AsyncAnthropic(api_key=api_key)

    async def stream_chat(
        self, request: CanonicalChatRequest, api_key: Optional[str] = None
    ) -> AsyncIterator[CanonicalStreamEvent]:
        client = self._get_client(api_key)

        anthropic_messages: list[dict[str, Any]] = []
        for msg in request.messages:
            if msg.role != "system":
                # Ensure the role is strictly "user" or "assistant" for standard text
                role = "assistant" if msg.role == "assistant" else "user"
                anthropic_messages.append({
                    "role": role,
                    "content": msg.content
                })

        kwargs: dict[str, Any] = {
            "model": request.model_id,
            "messages": anthropic_messages,
            "temperature": request.temperature,
            "max_tokens": request.max_tokens or 4096,
        }
        
        if request.system_prompt:
            kwargs["system"] = request.system_prompt

        try:
            async with client.messages.stream(**kwargs) as stream:
                async for chunk in stream.text_stream:
                    yield CanonicalStreamEvent(event_type="chunk", content=chunk)

                # Capture final metadata from the completed message
                message = await stream.get_final_message()
                
                # Extract headers if available from the underlying response
                remaining_reqs = None
                remaining_tokens = None
                reset_at = None
                
                try:
                    # stream.response is the raw httpx response
                    if hasattr(stream, 'response') and stream.response:
                        headers = stream.response.headers
                        if "anthropic-ratelimit-requests-remaining" in headers:
                            remaining_reqs = int(headers["anthropic-ratelimit-requests-remaining"])
                        if "anthropic-ratelimit-tokens-remaining" in headers:
                            remaining_tokens = int(headers["anthropic-ratelimit-tokens-remaining"])
                        if "anthropic-ratelimit-requests-reset" in headers:
                            reset_at = headers["anthropic-ratelimit-requests-reset"]
                except Exception:
                    pass

                yield CanonicalStreamEvent(
                    event_type="done",
                    input_tokens=message.usage.input_tokens,
                    output_tokens=message.usage.output_tokens,
                    remaining_requests=remaining_reqs,
                    remaining_tokens=remaining_tokens,
                    reset_at=reset_at,
                )

        except APIStatusError as e:
            if e.status_code == 429:
                # Differentiate between short burst limits and hard quota limits
                err_msg = str(e).lower()
                if "credit balance" in err_msg or "quota" in err_msg:
                    raise ProviderQuotaExhaustedError(provider="claude")
                
                # Assume standard rate limit
                retry = int(e.response.headers.get("retry-after", 5)) if e.response else 5
                raise ProviderRateLimitError(provider="claude", retry_after_seconds=retry)
            raise e

    async def count_tokens(self, text: str) -> int:
        # For Phase 9 MVP without launching a full tokenizer sub-process, 
        # we will use a fast 4-char heuristic locally, since Claude API 
        # requires actual API calls to count tokens precisely via /count_tokens.
        return max(1, len(text) // 4)

    async def validate_credentials(self, api_key: Optional[str] = None) -> ProviderHealthStatus:
        if not api_key:
            return ProviderHealthStatus(is_healthy=False, error="API key not provided.")
        
        client = self._get_client(api_key)
        start_time = time.perf_counter()
        
        try:
            # Quickest valid call to verify key
            await client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=1,
                messages=[{"role": "user", "content": "ping"}]
            )
            latency = (time.perf_counter() - start_time) * 1000
            return ProviderHealthStatus(is_healthy=True, latency_ms=latency)
        except APIStatusError as e:
            if e.status_code in (401, 403):
                return ProviderHealthStatus(is_healthy=False, error="Invalid or revoked API key.")
            # If we hit a rate limit, the key is still mathematically valid
            if e.status_code == 429:
                 return ProviderHealthStatus(is_healthy=True, latency_ms=0)
            return ProviderHealthStatus(is_healthy=False, error=str(e))
        except Exception as e:
             return ProviderHealthStatus(is_healthy=False, error=str(e))
