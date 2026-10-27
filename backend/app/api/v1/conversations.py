from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services.conversation_service import ConversationService
from app.services.project_ai_sync import StructuredSessionStateModel

router = APIRouter(prefix="/api/v1/conversations", tags=["conversations"])


class CreateMessagePayload(BaseModel):
    root_path: str
    role: str
    content: str
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None


class UpdateStatePayload(BaseModel):
    root_path: str
    state: StructuredSessionStateModel


@router.post("/{conversation_id}/messages")
async def add_message_to_conversation(
    conversation_id: str,
    payload: CreateMessagePayload,
    db: AsyncSession = Depends(get_db),
):
    service = ConversationService(db)
    msg = await service.add_message(
        conversation_id=conversation_id,
        root_path=payload.root_path,
        role=payload.role,
        content=payload.content,
        input_tokens=payload.input_tokens,
        output_tokens=payload.output_tokens,
    )
    return {"status": "success", "message_id": msg.id}


@router.put("/{conversation_id}/state")
async def sync_structured_state(
    conversation_id: str,
    payload: UpdateStatePayload,
    db: AsyncSession = Depends(get_db),
):
    service = ConversationService(db)
    try:
        conv = await service.update_session_state(
            conversation_id=conversation_id,
            root_path=payload.root_path,
            state_update=payload.state,
        )
        return {"status": "success", "state": conv.structured_state}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
