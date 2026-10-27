import json
from pathlib import Path

import pytest

from app.services.conversation_service import ConversationService
from app.services.project_ai_sync import StructuredSessionStateModel


@pytest.mark.asyncio
async def test_dual_persistence_of_layer_a_and_b(tmp_path: Path, db_session):
    project_root = tmp_path / "test-persistence-repo"
    project_root.mkdir()

    service = ConversationService(db_session)

    # Test 1: Create conversation
    conv = await service.create_conversation(workspace_id="test_ws", root_path=str(project_root), title="Debug Database")
    assert conv.id is not None

    # Test 2: Add a message (Layer A)
    msg = await service.add_message(
        conversation_id=conv.id,
        root_path=str(project_root),
        role="user",
        content="Check the DB schema.",
    )
    assert msg.id is not None
    assert msg.content == "Check the DB schema."

    history_file = project_root / ".project-ai" / "conversation-history" / f"conv_{conv.id}.jsonl"
    assert history_file.exists()
    assert "Check the DB schema." in history_file.read_text(encoding="utf-8")

    # Test 3: Update State (Layer B)
    new_state = StructuredSessionStateModel(
        currentGoal="Validate database schema",
        currentTask="Check constraints",
        completedWork=["Created test repository"],
    )
    await service.update_session_state(conv.id, str(project_root), new_state)

    assert conv.structured_state["currentGoal"] == "Validate database schema"

    state_file = project_root / ".project-ai" / "session-state" / "current-session.json"
    assert state_file.exists()
    disk_state = json.loads(state_file.read_text(encoding="utf-8"))
    assert disk_state["completedWork"] == ["Created test repository"]
