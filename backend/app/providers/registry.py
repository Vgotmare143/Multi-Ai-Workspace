from typing import Dict, Type
from app.providers.base import BaseAIProvider
from app.providers.mock_provider import MockProvider
from app.providers.claude_provider import ClaudeProvider

class ProviderRegistry:
    _providers: Dict[str, BaseAIProvider] = {}

    @classmethod
    def register(cls, provider: BaseAIProvider) -> None:
        cls._providers[provider.provider_id] = provider

    @classmethod
    def get_provider(cls, provider_id: str) -> BaseAIProvider:
        if provider_id not in cls._providers:
            raise ValueError(f"AI Provider '{provider_id}' is not registered.")
        return cls._providers[provider_id]

# Initialize Registry
ProviderRegistry.register(MockProvider())
ProviderRegistry.register(ClaudeProvider())
