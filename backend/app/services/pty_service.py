from __future__ import annotations

import asyncio
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict
from app.core.command_guard import CommandClassificationModel, CommandGuard


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class PTYService:
    """
    Executes terminal commands inside the user's local project directory
    only after verifying CommandGuard permissions.
    """

    def __init__(self) -> None:
        self.guard = CommandGuard()

    def validate_cwd(self, root_path: str | Path) -> Path:
        resolved = Path(root_path).expanduser().resolve()
        if not resolved.exists() or not resolved.is_dir():
            raise ValueError(f"Workspace directory does not exist: {resolved}")
        return resolved

    def classify_command(self, command: str) -> CommandClassificationModel:
        return self.guard.classify(command)

    async def execute_command(
        self,
        root_path: str | Path,
        command: str,
        approved_by_user: bool = False,
        timeout_seconds: float = 15.0,
    ) -> Dict[str, Any]:
        cwd = self.validate_cwd(root_path)
        classification = self.guard.classify(command)

        if classification.requiresConfirmation and not approved_by_user:
            raise PermissionError(
                f"Command '{command}' is classified as '{classification.riskLevel}' "
                f"({classification.reason}) and requires explicit user approval."
            )

        def _run_sync() -> subprocess.CompletedProcess[str]:
            return subprocess.run(
                command,
                cwd=str(cwd),
                shell=True,
                capture_output=True,
                text=True,
                timeout=timeout_seconds,
            )

        try:
            completed = await asyncio.to_thread(_run_sync)
            combined_output = (completed.stdout or "") + (completed.stderr or "")
            return {
                "command": command,
                "output": combined_output.strip(),
                "exitCode": completed.returncode,
                "riskLevel": classification.riskLevel,
                "executedBy": "ai_approved" if approved_by_user else "user",
                "timestamp": utc_now_iso(),
            }
        except subprocess.TimeoutExpired:
            return {
                "command": command,
                "output": f"Command timed out after {timeout_seconds}s",
                "exitCode": 124,
                "riskLevel": classification.riskLevel,
                "executedBy": "ai_approved" if approved_by_user else "user",
                "timestamp": utc_now_iso(),
            }
