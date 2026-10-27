import json
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.models import Conversation, Message
from app.services.project_ai_sync import ProjectAISynchronizer, StructuredSessionStateModel


class ConversationService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.sync_engine = ProjectAISynchronizer()

    async def create_conversation(self, workspace_id: str, root_path: str, title: str = "New Conversation") -> Conversation:
        conv = Conversation(workspace_id=workspace_id, title=title)
        self.db.add(conv)
        await self.db.commit()
        await self.db.refresh(conv)

        # Initialize the state in .project-ai/
        initial_state = StructuredSessionStateModel(currentTask=title)
        self.sync_engine.save_session_state(root_path, initial_state)

        return conv

    async def add_message(
        self,
        conversation_id: str,
        root_path: str,
        role: str,
        content: str,
        input_tokens: Optional[int] = None,
        output_tokens: Optional[int] = None,
    ) -> Message:
        # 1. Save Layer A (Message) to PostgreSQL
        msg = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            token_count_input=input_tokens,
            token_count_output=output_tokens,
        )
        self.db.add(msg)
        await self.db.commit()
        await self.db.refresh(msg)

        # 2. Mirror Layer A to .project-ai/conversation-history/ (append-only JSONL)
        ai_root = self.sync_engine.get_project_ai_root(root_path)
        history_dir = ai_root / "conversation-history"
        history_dir.mkdir(parents=True, exist_ok=True)

        log_file = history_dir / f"conv_{conversation_id}.jsonl"
        log_entry = {
            "id": msg.id,
            "role": role,
            "content": content,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "tokens": {"input": input_tokens, "output": output_tokens},
        }
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")

        return msg

    async def update_session_state(
        self,
        conversation_id: str,
        root_path: str,
        state_update: StructuredSessionStateModel,
    ) -> Conversation:
        # 1. Update Layer B (Structured State) in PostgreSQL
        stmt = select(Conversation).where(Conversation.id == conversation_id)
        result = await self.db.execute(stmt)
        conv = result.scalar_one_or_none()

        if not conv:
            raise ValueError(f"Conversation {conversation_id} not found.")

        conv.structured_state = state_update.model_dump()
        await self.db.commit()
        await self.db.refresh(conv)

        # 2. Mirror Layer B to .project-ai/session-state/current-session.json
        self.sync_engine.save_session_state(root_path, state_update)

        return conv
