from pathlib import Path
import pytest
from app.core.command_guard import CommandGuard
from app.services.pty_service import PTYService


def test_command_guard_classifies_read_only_vs_mutating_vs_destructive():
    guard = CommandGuard()

    # Safe read-only commands
    res_safe = guard.classify("git status")
    assert res_safe.riskLevel == "safe_read_only"
    assert res_safe.requiresConfirmation is False

    res_pytest = guard.classify("pytest tests/unit")
    assert res_pytest.riskLevel == "safe_read_only"
    assert res_pytest.requiresConfirmation is False

    # State-mutating commands
    res_mut = guard.classify("npm install zod")
    assert res_mut.riskLevel == "state_mutating"
    assert res_mut.requiresConfirmation is True

    # Destructive commands
    res_dest = guard.classify("rm -rf build/ && git reset --hard")
    assert res_dest.riskLevel == "destructive"
    assert res_dest.requiresConfirmation is True


@pytest.mark.asyncio
async def test_pty_service_blocks_unapproved_destructive_command(tmp_path: Path):
    pty = PTYService()

    # Safe command executes without approval flag
    safe_out = await pty.execute_command(tmp_path, "echo hello_world", approved_by_user=False)
    assert safe_out["exitCode"] == 0
    assert "hello_world" in safe_out["output"]

    # Destructive command raises PermissionError when approved_by_user=False
    with pytest.raises(PermissionError, match="requires explicit user approval"):
        await pty.execute_command(tmp_path, "rm -rf some_folder", approved_by_user=False)
