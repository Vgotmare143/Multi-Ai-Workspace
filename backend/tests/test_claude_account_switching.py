import pytest
from unittest.mock import MagicMock

from app.core.vault import CredentialVault
from app.services.account_service import ClaudeAccountService
from app.providers.models import CanonicalChatRequest, CanonicalStreamEvent, ChatMessage


def test_vault_encrypts_and_masks_api_keys():
    custom_vault = CredentialVault(master_key="test-master-secret-key-for-unit-tests")
    raw_key = "sk-ant-api03-secret-account-a-key-9876"

    ciphertext = custom_vault.encrypt(raw_key)
    assert ciphertext != raw_key.encode("utf-8")
    assert b"secret-account-a" not in ciphertext

    decrypted = custom_vault.decrypt(ciphertext)
    assert decrypted == raw_key

    fp = custom_vault.fingerprint(raw_key)
    assert "sk-a...9876" in fp
    assert "secret-account-a" not in fp


@pytest.mark.asyncio
async def test_claude_multi_account_switching_isolates_credentials():
    service = ClaudeAccountService()

    # Configure Account A and Account B with distinct API keys
    acct_a = service.upsert_account(
        account_id="acct_claude_a",
        account_label="Claude Account A",
        connection_mode="api_key",
        raw_api_key="sk-ant-key-ACCOUNT-A-1111",
        priority_order=1,
    )
    acct_b = service.upsert_account(
        account_id="acct_claude_b",
        account_label="Claude Account B",
        connection_mode="api_key",
        raw_api_key="sk-ant-key-ACCOUNT-B-2222",
        priority_order=2,
    )

    # Ensure plaintext keys are never present in serialized AccountProfile
    serialized_a = acct_a.model_dump_json()
    assert "sk-ant-key-ACCOUNT-A-1111" not in serialized_a

    # Capture which API key is injected into ClaudeProvider on each stream call
    captured_keys: list[str] = []

    class SpyClaudeProvider:
        async def stream_chat(self, request, api_key=None):
            captured_keys.append(api_key)
            yield CanonicalStreamEvent(event_type="chunk", content=f"Reply from {api_key[-4:]}")

    spy_provider = SpyClaudeProvider()
    req = CanonicalChatRequest(
        model_id="claude-3-7-sonnet-latest",
        messages=[ChatMessage(role="user", content="Continue building the REST API")],
    )

    # 1. Stream with active Account A
    assert service.get_active_account().id == "acct_claude_a"
    events_a = [
        ev async for ev in service.stream_with_active_account(req, claude_provider=spy_provider)
    ]
    assert len(events_a) == 1
    assert captured_keys[-1] == "sk-ant-key-ACCOUNT-A-1111"

    # 2. Switch from Claude Account A -> Claude Account B
    handoff = service.switch_account(
        target_account_id="acct_claude_b",
        current_task="Implementing Phase 10 multi-account vault",
        next_action="Verify Account B isolated streaming",
    )
    assert handoff.previous_account_label == "Claude Account A"
    assert handoff.active_account_label == "Claude Account B"
    assert handoff.handoff_markdown_filename == "claude-session-001.md"
    assert service.get_active_account().id == "acct_claude_b"

    # 3. Stream with active Account B and verify isolated credential injection
    events_b = [
        ev async for ev in service.stream_with_active_account(req, claude_provider=spy_provider)
    ]
    assert len(events_b) == 1
    assert captured_keys[-1] == "sk-ant-key-ACCOUNT-B-2222"
    assert captured_keys == ["sk-ant-key-ACCOUNT-A-1111", "sk-ant-key-ACCOUNT-B-2222"]
