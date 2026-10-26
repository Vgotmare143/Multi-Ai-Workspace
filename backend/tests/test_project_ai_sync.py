from pathlib import Path
import json
import pytest
from app.services.project_ai_sync import (
    HandoffWriteRequest,
    ProjectAISynchronizer,
    ProviderSelectionModel,
    REQUIRED_SUBDIRECTORIES,
    StructuredSessionStateModel,
)


def test_initialize_creates_all_canonical_project_ai_directories(tmp_path: Path):
    project_dir = tmp_path / "payments-service"
    project_dir.mkdir()
    (project_dir / "main.py").write_text("print('hello')\n", encoding="utf-8")

    sync = ProjectAISynchronizer()
    snapshot = sync.initialize_or_load_workspace(
        root_path=project_dir,
        project_name="payments-service",
        git_branch="feat/upi-gateway",
    )

    ai_root = project_dir / ".project-ai"
    assert ai_root.is_dir()

    for subdir in REQUIRED_SUBDIRECTORIES:
        assert (ai_root / subdir).is_dir(), f"Missing .project-ai/{subdir}"

    assert snapshot["config"]["projectName"] == "payments-service"
    assert snapshot["projectState"]["gitBranch"] == "feat/upi-gateway"
    assert "Python" in snapshot["projectState"]["detectedLanguages"]


def test_session_state_and_handoff_persist_across_reopen(tmp_path: Path):
    project_dir = tmp_path / "inventory-api"
    sync = ProjectAISynchronizer()
    sync.initialize_or_load_workspace(project_dir, project_name="inventory-api")

    # Update Layer B structured session state
    custom_state = StructuredSessionStateModel(
        currentGoal="Add PostgreSQL stock reservation lock",
        currentTask="Write SELECT FOR UPDATE query in repository",
        completedWork=["Designed schema"],
        pendingWork=["Add deadlock retry test"],
        relevantFiles=["app/repo.py"],
        filesModified=["app/repo.py"],
        currentImplementationState="Repository method half-written",
        nextRecommendedAction="Complete transaction rollback test",
    )
    sync.save_session_state(project_dir, custom_state)

    # Persist a Claude Account A -> Account B handoff Markdown artifact
    handoff_req = HandoffWriteRequest(
        sequenceNumber=1,
        filename="claude-session-001.md",
        fromProvider="claude",
        fromAccountLabel="Claude Account A",
        toProvider="claude",
        toAccountLabel="Claude Account B",
        reason="usage_limit_reached",
        markdownContent="# Conversation History\n\n# Next Action\nComplete transaction rollback test\n",
    )
    sync.write_handoff_markdown(project_dir, handoff_req)

    # Re-open workspace and verify state survived intact
    reloaded = sync.initialize_or_load_workspace(project_dir)
    assert reloaded["sessionState"]["currentTask"] == "Write SELECT FOR UPDATE query in repository"
    assert "claude-session-001.md" in reloaded["handoffFiles"]

    md_disk_path = project_dir / ".project-ai" / "handoffs" / "claude-session-001.md"
    assert md_disk_path.exists()
    assert "Complete transaction rollback test" in md_disk_path.read_text(encoding="utf-8")


def test_provider_selection_never_writes_secrets_to_disk(tmp_path: Path):
    project_dir = tmp_path / "secure-app"
    sync = ProjectAISynchronizer()
    sync.initialize_or_load_workspace(project_dir)

    selection = ProviderSelectionModel(
        activeProviderId="claude",
        activeAccountId="claude-account-b",
        activeAccountLabel="Claude Account B",
        connectionMode="web_bridge",
        modelId="claude-3-7-sonnet-latest",
    )
    sync.save_provider_selection(project_dir, selection)

    raw_json = (
        project_dir / ".project-ai" / "provider-state" / "active-selection.json"
    ).read_text(encoding="utf-8")
    parsed = json.loads(raw_json)
    assert parsed["activeAccountLabel"] == "Claude Account B"
    assert "apiKey" not in parsed
    assert "encryptedCredentials" not in parsed
