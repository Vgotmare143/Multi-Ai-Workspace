import pytest
from app.providers.mock_provider import MockProvider
from app.providers.models import CanonicalChatRequest, ChatMessage
from app.core.exceptions import ProviderQuotaExhaustedError

@pytest.mark.asyncio
async def test_mock_provider_streams_chunks_and_done_telemetry():
    provider = MockProvider(simulated_provider_id="claude")
    req = CanonicalChatRequest(
        model_id="claude-3-7-sonnet-latest",
        messages=[ChatMessage(role="user", content="Explain src/middleware/auth.ts")],
    )

    events = [event async for event in provider.stream_chat(req)]
    chunks = [e.content for e in events if e.event_type == "chunk"]
    done_events = [e for e in events if e.event_type == "done"]

    assert len(chunks) > 0
    full_text = "".join(chunks)
    assert "CLAUDE Simulator Response" in full_text
    assert len(done_events) == 1
    assert done_events[0].input_tokens is not None
    assert done_events[0].remaining_requests == 49

@pytest.mark.asyncio
async def test_error_classifier_distinguishes_recoverable_quota_vs_auth_failure():
    provider = MockProvider(simulated_provider_id="claude")
    req = CanonicalChatRequest(
        model_id="claude-3-7-sonnet-latest",
        messages=[ChatMessage(role="user", content="Trigger 429")],
        simulate_rate_limit=True,
    )

    with pytest.raises(ProviderQuotaExhaustedError) as exc_info:
        async for _ in provider.stream_chat(req):
            pass

    classified_quota = provider.classify_error(exc_info.value)
    assert classified_quota.category == "QUOTA_EXHAUSTED"
    assert classified_quota.is_recoverable_via_fallback is True
    assert classified_quota.estimated_reset_at == "4:00 PM"

    classified_auth = provider.classify_error(Exception("401 Unauthorized: invalid api key"))
    assert classified_auth.category == "AUTH_INVALID"
    assert classified_auth.is_recoverable_via_fallback is False
