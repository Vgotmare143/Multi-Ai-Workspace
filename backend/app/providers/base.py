from __future__ import annotations

from abc import ABC, abstractmethod
from typing import AsyncIterator, Optional
from app.providers.models import (
    ProviderCapabilities,
    CanonicalChatRequest,
    CanonicalStreamEvent,
    ProviderHealthStatus,
    ClassifiedProviderError,
)
from app.providers.error_classifier import ErrorClassifier

class BaseAIProvider(ABC):
    @property
    @abstractmethod
    def provider_id(self) -> str:
        """e.g., 'claude', 'openai', 'gemini', 'mock'"""
        pass

    @abstractmethod
    def get_capabilities(self) -> ProviderCapabilities:
        pass

    @abstractmethod
    async def stream_chat(
        self, request: CanonicalChatRequest, api_key: Optional[str] = None
    ) -> AsyncIterator[CanonicalStreamEvent]:
        pass

    @abstractmethod
    async def count_tokens(self, text: str) -> int:
        pass

    @abstractmethod
    async def validate_credentials(self, api_key: Optional[str] = None) -> ProviderHealthStatus:
        pass

    def classify_error(self, exc: Exception) -> ClassifiedProviderError:
        return ErrorClassifier.classify(exc)
