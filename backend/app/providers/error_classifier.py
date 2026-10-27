from __future__ import annotations

from app.providers.models import ClassifiedProviderError
from app.core.exceptions import (
    ProviderQuotaExhaustedError,
    ProviderRateLimitError,
)

class ErrorClassifier:
    """Classifies provider exceptions into recoverable vs. halting buckets."""

    @staticmethod
    def classify(exc: Exception) -> ClassifiedProviderError:
        if isinstance(exc, ProviderQuotaExhaustedError):
            return ClassifiedProviderError(
                category="QUOTA_EXHAUSTED",
                is_recoverable_via_fallback=True,
                message=exc.message,
                estimated_reset_at=exc.details.get("reset_at"),
            )

        if isinstance(exc, ProviderRateLimitError):
            retry_after = exc.details.get("retry_after_seconds")
            return ClassifiedProviderError(
                category="RATE_LIMITED",
                is_recoverable_via_fallback=True,
                message=exc.message,
                retry_after_seconds=retry_after,
            )

        msg = str(exc).lower()
        if "401" in msg or "403" in msg or "invalid api key" in msg or "unauthorized" in msg:
            return ClassifiedProviderError(
                category="AUTH_INVALID",
                is_recoverable_via_fallback=False,
                message="Authentication failed or API key is invalid. Halt and notify user.",
            )

        if "context_length" in msg or "maximum context length" in msg or "too many tokens" in msg:
            return ClassifiedProviderError(
                category="CONTEXT_LENGTH_EXCEEDED",
                is_recoverable_via_fallback=False,
                message="Prompt exceeds model context window. Run ContextCompiler compaction.",
            )

        if "429" in msg or "quota" in msg or "rate limit" in msg:
            return ClassifiedProviderError(
                category="QUOTA_EXHAUSTED",
                is_recoverable_via_fallback=True,
                message=str(exc),
                estimated_reset_at="4:00 PM",
            )

        if any(code in msg for code in ("502", "503", "529", "overloaded")):
            return ClassifiedProviderError(
                category="PROVIDER_OVERLOADED",
                is_recoverable_via_fallback=True,
                message="Provider is temporarily overloaded.",
            )

        if "timeout" in msg or "connection" in msg:
            return ClassifiedProviderError(
                category="NETWORK_TIMEOUT",
                is_recoverable_via_fallback=True,
                message="Network timeout communicating with provider.",
            )

        return ClassifiedProviderError(
            category="UNKNOWN_ERROR",
            is_recoverable_via_fallback=False,
            message=str(exc),
        )
