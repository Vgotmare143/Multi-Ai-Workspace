from datetime import datetime, timezone
from typing import Dict, List, Literal, Optional
from uuid import uuid4
from pydantic import BaseModel, Field

from app.core.vault import vault
from app.providers.models import CanonicalChatRequest, CanonicalStreamEvent
from app.providers.claude_provider import ClaudeProvider
from app.providers.mock_provider import MockProvider

ConnectionMode = Literal["mock", "web_bridge", "api_key", "local_ollama"]
AccountQuotaStatus = Literal["Available", "Approaching Limit", "Limit Reached", "Unknown"]


class AccountProfile(BaseModel):
    id: str
    provider_id: str = "claude"
    account_label: str  # e.g., "Claude Account A", "Claude Account B"
    connection_mode: ConnectionMode = "mock"
    key_fingerprint: str = "no-key-configured"
    priority_order: int = 1
    quota_status: AccountQuotaStatus = "Available"
    rate_limit_reset_at: Optional[str] = None
    is_active: bool = False
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class AccountSwitchHandoffResult(BaseModel):
    handoff_id: str
    previous_account_id: str
    previous_account_label: str
    active_account_id: str
    active_account_label: str
    connection_mode: ConnectionMode
    handoff_markdown_filename: str
    switched_at: str
    continuity_briefing: str


class ClaudeAccountService:
    """
    Manages multiple isolated Claude accounts (Account A, Account B, Account C)
    with encrypted in-vault API keys and zero credential leakage between accounts.
    """

    def __init__(self) -> None:
        self._accounts: Dict[str, AccountProfile] = {}
        self._encrypted_keys: Dict[str, bytes] = {}
        self._active_account_id: Optional[str] = None
        self._handoff_counter: int = 0
        self._seed_default_claude_accounts()

    def _seed_default_claude_accounts(self) -> None:
        defaults = [
            ("acct_claude_a", "Claude Account A", 1, True),
            ("acct_claude_b", "Claude Account B", 2, False),
            ("acct_claude_c", "Claude Account C", 3, False),
        ]
        for acct_id, label, priority, is_active in defaults:
            self._accounts[acct_id] = AccountProfile(
                id=acct_id,
                provider_id="claude",
                account_label=label,
                connection_mode="mock",
                key_fingerprint="mock-mode",
                priority_order=priority,
                quota_status="Available",
                is_active=is_active,
            )
            self._encrypted_keys[acct_id] = b""
            if is_active:
                self._active_account_id = acct_id

    def list_accounts(self, provider_id: str = "claude") -> List[AccountProfile]:
        accounts = [a for a in self._accounts.values() if a.provider_id == provider_id]
        return sorted(accounts, key=lambda a: a.priority_order)

    def get_active_account(self) -> AccountProfile:
        if not self._active_account_id or self._active_account_id not in self._accounts:
            raise ValueError("No active Claude account configured")
        return self._accounts[self._active_account_id]

    def upsert_account(
        self,
        account_label: str,
        connection_mode: ConnectionMode = "mock",
        raw_api_key: Optional[str] = None,
        priority_order: Optional[int] = None,
        account_id: Optional[str] = None,
    ) -> AccountProfile:
        target_id = account_id
        if not target_id:
            for existing in self._accounts.values():
                if existing.account_label.lower() == account_label.lower():
                    target_id = existing.id
                    break
        if not target_id:
            target_id = f"acct_{uuid4().hex[:10]}"

        encrypted = vault.encrypt(raw_api_key) if raw_api_key else self._encrypted_keys.get(target_id, b"")
        fingerprint = (
            vault.fingerprint(raw_api_key)
            if raw_api_key
            else (
                self._accounts[target_id].key_fingerprint
                if target_id in self._accounts
                else ("mock-mode" if connection_mode == "mock" else "no-key-configured")
            )
        )

        order = priority_order if priority_order is not None else (len(self._accounts) + 1)
        is_active = (target_id == self._active_account_id) or (self._active_account_id is None)

        profile = AccountProfile(
            id=target_id,
            provider_id="claude",
            account_label=account_label,
            connection_mode=connection_mode,
            key_fingerprint=fingerprint,
            priority_order=order,
            quota_status="Available",
            is_active=is_active,
        )
        self._accounts[target_id] = profile
        self._encrypted_keys[target_id] = encrypted

        if is_active:
            self._active_account_id = target_id

        return profile

    def get_decrypted_key_for_account(self, account_id: str) -> Optional[str]:
        """Internal-only method used by the provider adapter right before an outbound request."""
        if account_id not in self._accounts:
            raise ValueError(f"Unknown account_id: {account_id}")
        ciphertext = self._encrypted_keys.get(account_id, b"")
        return vault.decrypt(ciphertext)

    def mark_account_quota_status(
        self,
        account_id: str,
        status: AccountQuotaStatus,
        reset_at: Optional[str] = None,
    ) -> AccountProfile:
        if account_id not in self._accounts:
            raise ValueError(f"Unknown account_id: {account_id}")
        acct = self._accounts[account_id]
        acct.quota_status = status
        acct.rate_limit_reset_at = reset_at
        acct.updated_at = datetime.now(timezone.utc).isoformat()
        return acct

    def switch_account(
        self,
        target_account_id: str,
        current_task: str = "Active development task",
        next_action: str = "Continue implementation from the previous account stopping point",
    ) -> AccountSwitchHandoffResult:
        if target_account_id not in self._accounts:
            raise ValueError(f"Target Claude account '{target_account_id}' not found")

        prev_account = self.get_active_account()
        target_account = self._accounts[target_account_id]

        # Flip active flags atomically
        for acct in self._accounts.values():
            acct.is_active = acct.id == target_account_id
        self._active_account_id = target_account_id

        self._handoff_counter += 1
        handoff_filename = f"claude-session-{self._handoff_counter:03d}.md"
        now_iso = datetime.now(timezone.utc).isoformat()

        briefing = (
            f"HANDOFF BRIEFING ({handoff_filename}): "
            f"Switched from {prev_account.account_label} to {target_account.account_label}. "
            f"Current Task: {current_task}. Next Action: {next_action}."
        )

        return AccountSwitchHandoffResult(
            handoff_id=f"ho_{uuid4().hex[:12]}",
            previous_account_id=prev_account.id,
            previous_account_label=prev_account.account_label,
            active_account_id=target_account.id,
            active_account_label=target_account.account_label,
            connection_mode=target_account.connection_mode,
            handoff_markdown_filename=handoff_filename,
            switched_at=now_iso,
            continuity_briefing=briefing,
        )

    async def stream_with_active_account(
        self,
        request: CanonicalChatRequest,
        claude_provider: Optional[ClaudeProvider] = None,
        mock_provider: Optional[MockProvider] = None,
    ):
        """
        Streams a chat request using ONLY the currently active Claude account's isolated credentials.
        Falls back to MockProvider when the account is in 'mock' or 'web_bridge' mode.
        """
        active_acct = self.get_active_account()
        decrypted_key = self.get_decrypted_key_for_account(active_acct.id)

        if active_acct.connection_mode == "api_key" and decrypted_key:
            provider = claude_provider or ClaudeProvider()
            async for event in provider.stream_chat(request, api_key=decrypted_key):
                yield event
        else:
            sim_provider = mock_provider or MockProvider()
            async for event in sim_provider.stream_chat(request, api_key=None):
                yield event


account_service = ClaudeAccountService()
