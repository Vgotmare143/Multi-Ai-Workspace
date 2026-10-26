from __future__ import annotations

import re
import shlex
from typing import List, Literal
from pydantic import BaseModel, Field

CommandRiskLevel = Literal["safe_read_only", "state_mutating", "destructive"]


class CommandClassificationModel(BaseModel):
    command: str
    riskLevel: CommandRiskLevel
    requiresConfirmation: bool
    reason: str
    detectedTokens: List[str] = Field(default_factory=list)


class CommandGuard:
    """
    Classifies terminal commands before execution so that state-mutating
    and destructive shell commands require explicit user confirmation.
    """

    SAFE_READ_ONLY_BINARIES = {
        "ls",
        "dir",
        "pwd",
        "echo",
        "cat",
        "head",
        "tail",
        "wc",
        "find",
        "grep",
        "rg",
        "which",
        "where",
        "whoami",
        "pytest",
        "vitest",
        "jest",
        "mypy",
        "ruff",
        "eslint",
        "tsc",
    }

    DESTRUCTIVE_PATTERNS = [
        (r"\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r|--recursive)\b", "Recursive or forced file deletion (rm -rf)"),
        (r"\brm\s+", "File deletion command (rm)"),
        (r"\bdel\s+/[fqs]", "Forced file deletion (del)"),
        (r"\brmdir\b", "Directory removal (rmdir)"),
        (r"\bgit\s+reset\s+--hard\b", "Destructive Git working tree reset (git reset --hard)"),
        (r"\bgit\s+clean\s+-[a-zA-Z]*f", "Destructive removal of untracked Git files (git clean -f)"),
        (r"\bgit\s+push\s+.*--force\b", "Force push to remote Git repository"),
        (r"\b(dropdb|drop\s+table|drop\s+database|truncate\s+table)\b", "Destructive database drop/truncate operation"),
        (r"\bchmod\s+777\b", "Insecure world-writable permission change (chmod 777)"),
        (r"\b(curl|wget)\b.*\|\s*(sh|bash|zsh|pwsh|powershell)\b", "Piping remote script directly into shell"),
        (r"\b(sudo|su)\b", "Privilege escalation command (sudo/su)"),
        (r"\b(mkfs|fdisk|dd|format)\b", "Low-level disk formatting or raw write operation"),
        (r"\b(shutdown|reboot|halt|poweroff)\b", "System power state modification"),
    ]

    STATE_MUTATING_PATTERNS = [
        (r"\b(npm|yarn|pnpm|bun)\s+(install|i|add|remove|uninstall|update)\b", "Package dependency modification"),
        (r"\b(pip|pip3|poetry|uv)\s+(install|uninstall|add|remove)\b", "Python environment dependency modification"),
        (r"\b(alembic|prisma|knex|flyway|django-admin)\s+(upgrade|downgrade|migrate|makemigrations)\b", "Database schema migration"),
        (r"\bgit\s+(commit|checkout|switch|merge|rebase|cherry-pick|stash|tag|branch\s+-[dD])\b", "Git repository state mutation"),
        (r"\b(mv|cp|mkdir|touch)\b", "Filesystem modification (move/copy/mkdir/touch)"),
        (r"\bdocker\s+(run|rm|rmi|build|compose\s+up|compose\s+down)\b", "Container lifecycle mutation"),
    ]

    def classify(self, command: str) -> CommandClassificationModel:
        cleaned = command.strip()
        if not cleaned:
            return CommandClassificationModel(
                command=command,
                riskLevel="safe_read_only",
                requiresConfirmation=False,
                reason="Empty command",
                detectedTokens=[],
            )

        tokens = self._tokenize(cleaned)
        lowered = cleaned.lower()

        # 1. Check destructive patterns first
        for pattern, description in self.DESTRUCTIVE_PATTERNS:
            if re.search(pattern, lowered):
                return CommandClassificationModel(
                    command=cleaned,
                    riskLevel="destructive",
                    requiresConfirmation=True,
                    reason=description,
                    detectedTokens=tokens[:6],
                )

        # 2. Check shell redirections overwriting files (> or >>)
        if ">" in cleaned:
            return CommandClassificationModel(
                command=cleaned,
                riskLevel="state_mutating",
                requiresConfirmation=True,
                reason="Shell output redirection modifies files on disk",
                detectedTokens=tokens[:6],
            )

        # 3. Check state-mutating patterns
        for pattern, description in self.STATE_MUTATING_PATTERNS:
            if re.search(pattern, lowered):
                return CommandClassificationModel(
                    command=cleaned,
                    riskLevel="state_mutating",
                    requiresConfirmation=True,
                    reason=description,
                    detectedTokens=tokens[:6],
                )

        # 4. Check safe git read-only subcommands
        if len(tokens) >= 2 and tokens[0] == "git" and tokens[1] in {"status", "diff", "log", "branch", "show"}:
            return CommandClassificationModel(
                command=cleaned,
                riskLevel="safe_read_only",
                requiresConfirmation=False,
                reason=f"Safe read-only Git inspection (git {tokens[1]})",
                detectedTokens=tokens[:4],
            )

        # 5. Check safe npm/node test commands
        if len(tokens) >= 2 and tokens[0] in {"npm", "pnpm", "yarn"} and tokens[1] in {"test", "run"}:
            if len(tokens) == 2 or (len(tokens) >= 3 and tokens[2] in {"test", "typecheck", "lint"}):
                return CommandClassificationModel(
                    command=cleaned,
                    riskLevel="safe_read_only",
                    requiresConfirmation=False,
                    reason="Safe test or verification script execution",
                    detectedTokens=tokens[:4],
                )

        # 6. Check known read-only binaries
        if tokens and tokens[0] in self.SAFE_READ_ONLY_BINARIES:
            return CommandClassificationModel(
                command=cleaned,
                riskLevel="safe_read_only",
                requiresConfirmation=False,
                reason=f"Read-only diagnostic/test command ({tokens[0]})",
                detectedTokens=tokens[:4],
            )

        # Default conservative posture: unknown commands require confirmation as state_mutating
        return CommandClassificationModel(
            command=cleaned,
            riskLevel="state_mutating",
            requiresConfirmation=True,
            reason="Unrecognized command; requires confirmation before execution",
            detectedTokens=tokens[:6],
        )

    @staticmethod
    def _tokenize(command: str) -> List[str]:
        try:
            return shlex.split(command, posix=True)
        except ValueError:
            return command.split()
