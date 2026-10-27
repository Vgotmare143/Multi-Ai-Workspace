import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from anthropic import APIStatusError
from httpx import Response, Request

from app.providers.claude_provider import ClaudeProvider
from app.providers.models import CanonicalChatRequest, ChatMessage
from app.core.exceptions import ProviderQuotaExhaustedError, ProviderRateLimitError

@pytest.mark.asyncio
async def test_claude_provider_maps_429_burst_limit_correctly():
    provider = ClaudeProvider()
    
    # Create a mock 429 burst rate limit response
    mock_request = Request("POST", "https://api.anthropic.com/v1/messages")
    mock_response = Response(429, request=mock_request, headers={"retry-after": "10"})
    
    error = APIStatusError("Rate limit exceeded", response=mock_response, body={})
    
    with patch.object(provider, '_get_client') as mock_get_client:
        mock_client = MagicMock()
        mock_client.messages.stream.side_effect = error
        mock_get_client.return_value = mock_client
        
        req = CanonicalChatRequest(
            model_id="claude-3-7-sonnet-latest",
            messages=[ChatMessage(role="user", content="Hello")]
        )
        
        with pytest.raises(ProviderRateLimitError) as exc:
            async for _ in provider.stream_chat(req, api_key="fake-key"):
                pass
                
        assert exc.value.status_code == 429
        assert exc.value.details["retry_after"] == 10

@pytest.mark.asyncio
async def test_claude_provider_maps_429_quota_exhausted_correctly():
    provider = ClaudeProvider()
    
    mock_request = Request("POST", "https://api.anthropic.com/v1/messages")
    mock_response = Response(429, request=mock_request)
    
    # Hard quota limit often returns text mentioning credit balance or quota
    error = APIStatusError("insufficient credit balance", response=mock_response, body={})
    
    with patch.object(provider, '_get_client') as mock_get_client:
        mock_client = MagicMock()
        mock_client.messages.stream.side_effect = error
        mock_get_client.return_value = mock_client
        
        req = CanonicalChatRequest(
            model_id="claude-3-7-sonnet-latest",
            messages=[ChatMessage(role="user", content="Hello")]
        )
        
        with pytest.raises(ProviderQuotaExhaustedError) as exc:
            async for _ in provider.stream_chat(req, api_key="fake-key"):
                pass
                
        assert exc.value.details["error_code"] == "QUOTA_EXHAUSTED"
