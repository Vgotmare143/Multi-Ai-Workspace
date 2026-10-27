from typing import List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.services.account_service import (
    AccountProfile,
    AccountSwitchHandoffResult,
    ConnectionMode,
    account_service,
)

router = APIRouter(prefix="/api/v1/accounts", tags=["Claude Accounts"])


class UpsertAccountRequest(BaseModel):
    account_id: Optional[str] = None
    account_label: str
    connection_mode: ConnectionMode = "mock"
    api_key: Optional[str] = None
    priority_order: Optional[int] = None


class SwitchAccountRequest(BaseModel):
    target_account_id: str
    current_task: str = "Active development task"
    next_action: str = "Continue from exact point where previous Claude account stopped"


@router.get("/claude", response_model=List[AccountProfile])
async def list_claude_accounts() -> List[AccountProfile]:
    """Lists all configured Claude accounts (Account A, B, C) without exposing API keys."""
    return account_service.list_accounts(provider_id="claude")


@router.get("/claude/active", response_model=AccountProfile)
async def get_active_claude_account() -> AccountProfile:
    return account_service.get_active_account()


@router.post("/claude", response_model=AccountProfile, status_code=status.HTTP_201_CREATED)
async def upsert_claude_account(payload: UpsertAccountRequest) -> AccountProfile:
    """Creates or updates a Claude account profile, encrypting any provided API key in the vault."""
    return account_service.upsert_account(
        account_id=payload.account_id,
        account_label=payload.account_label,
        connection_mode=payload.connection_mode,
        raw_api_key=payload.api_key,
        priority_order=payload.priority_order,
    )


@router.post("/claude/switch", response_model=AccountSwitchHandoffResult)
async def switch_claude_account(payload: SwitchAccountRequest) -> AccountSwitchHandoffResult:
    """Switches from the current Claude account to the target Claude account and returns the handoff record."""
    try:
        return account_service.switch_account(
            target_account_id=payload.target_account_id,
            current_task=payload.current_task,
            next_action=payload.next_action,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
