from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


REQUIRED_SUBDIRECTORIES: List[str] = [
    "project-state",
    "session-state",
    "conversation-history",
    "handoffs",
    "memory",
    "tasks",
    "provider-state",
    "usage",
    "logs",
]

DEFAULT_IGNORED_PATHS: List[str] = [
    ".env",
    ".env.*",
    "*.pem",
    "*.key",
    "node_modules",
    ".git",
    "__pycache__",
    ".venv",
    "dist",
    "build",
]


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class StructuredSessionStateModel(BaseModel):
    currentGoal: str = "Understand project structure and assist with development tasks"
    currentTask: str = "Workspace initialized and ready"
    completedWork: List[str] = Field(default_factory=list)
    pendingWork: List[str] = Field(default_factory=list)
    importantDecisions: List[str] = Field(default_factory=list)
    errorsEncountered: List[str] = Field(default_factory=list)
    errorsResolved: List[str] = Field(default_factory=list)
    relevantFiles: List[str] = Field(default_factory=list)
    filesModified: List[str] = Field(default_factory=list)
    commandsExecuted: List[str] = Field(default_factory=list)
    testResults: List[str] = Field(default_factory=list)
    currentImplementationState: str = "Clean workspace state"
    nextRecommendedAction: str = "Select a file or start a task in the AI Assistant"


class ProviderSelectionModel(BaseModel):
    activeProviderId: str = "claude"
    activeAccountId: str = "claude-account-a"
    activeAccountLabel: str = "Claude Account A"
    connectionMode: str = "web_bridge"
    modelId: str = "claude-3-7-sonnet-latest"
    updatedAt: str = Field(default_factory=utc_now_iso)


class HandoffWriteRequest(BaseModel):
    sequenceNumber: int
    filename: str
    fromProvider: str
    fromAccountLabel: str
    toProvider: str
    toAccountLabel: str
    reason: str
    markdownContent: str


class ProjectAISynchronizer:
    """
    Manages the platform-owned .project-ai/ directory inside a developer's project.
    Guarantees that project state, session state, and handoff artifacts persist
    independently of Claude, OpenAI, or Gemini.
    """

    PROJECT_AI_DIR = ".project-ai"

    def validate_project_path(self, root_path: str | Path) -> Path:
        resolved = Path(root_path).expanduser().resolve()
        if resolved == Path("/"):
            raise ValueError("Refusing to initialize .project-ai/ in filesystem root '/'")
        if not resolved.exists():
            resolved.mkdir(parents=True, exist_ok=True)
        if not resolved.is_dir():
            raise ValueError(f"Project path is not a directory: {resolved}")
        return resolved

    def get_project_ai_root(self, root_path: str | Path) -> Path:
        project_root = self.validate_project_path(root_path)
        return project_root / self.PROJECT_AI_DIR

    def initialize_or_load_workspace(
        self,
        root_path: str | Path,
        project_name: Optional[str] = None,
        git_branch: str = "main",
    ) -> Dict[str, Any]:
        project_root = self.validate_project_path(root_path)
        ai_root = project_root / self.PROJECT_AI_DIR
        ai_root.mkdir(parents=True, exist_ok=True)

        # 1. Ensure all canonical subdirectories exist
        for subdir in REQUIRED_SUBDIRECTORIES:
            (ai_root / subdir).mkdir(parents=True, exist_ok=True)

        inferred_name = project_name or project_root.name
        now = utc_now_iso()

        # 2. Initialize or load .project-ai/config.json
        config_path = ai_root / "config.json"
        if config_path.exists():
            config_data = self._read_json(config_path)
            config_data["updatedAt"] = now
            self._write_json(config_path, config_data)
        else:
            config_data = {
                "schemaVersion": "1.0.0",
                "projectId": f"proj_{uuid.uuid4().hex[:12]}",
                "projectName": inferred_name,
                "rootPath": str(project_root),
                "ignoredPaths": DEFAULT_IGNORED_PATHS,
                "autoFallbackEnabled": True,
                "approvalMode": "ask_every_time",
                "createdAt": now,
                "updatedAt": now,
            }
            self._write_json(config_path, config_data)

        # 3. Initialize or load .project-ai/project-state/project-state.json
        project_state_path = ai_root / "project-state" / "project-state.json"
        if project_state_path.exists():
            project_state = self._read_json(project_state_path)
        else:
            detected_files = self._scan_top_level_files(project_root)
            project_state = {
                "projectId": config_data["projectId"],
                "projectName": config_data["projectName"],
                "rootPath": str(project_root),
                "detectedLanguages": self._detect_languages(project_root),
                "gitBranch": git_branch,
                "architectureSummary": "Local software project managed by Multi-AI Workspace",
                "entrypoints": detected_files[:5],
                "lastIndexedAt": now,
            }
            self._write_json(project_state_path, project_state)

        # 4. Initialize or load .project-ai/session-state/current-session.json
        session_state_path = ai_root / "session-state" / "current-session.json"
        if session_state_path.exists():
            session_state = self._read_json(session_state_path)
        else:
            default_session = StructuredSessionStateModel(
                relevantFiles=project_state.get("entrypoints", []),
            )
            session_state = default_session.model_dump()
            self._write_json(session_state_path, session_state)

        # 5. Initialize or load .project-ai/provider-state/active-selection.json
        # Strictly stores non-sensitive identifiers only (never API keys)
        provider_state_path = ai_root / "provider-state" / "active-selection.json"
        if provider_state_path.exists():
            provider_selection = self._read_json(provider_state_path)
        else:
            provider_selection = ProviderSelectionModel().model_dump()
            self._write_json(provider_state_path, provider_selection)

        # 6. Initialize default memory & task files if missing
        decisions_path = ai_root / "memory" / "decisions.md"
        if not decisions_path.exists():
            decisions_path.write_text(
                "# Architectural Decisions\n\n"
                "- Project state is owned by `.project-ai/` independent of external AI providers.\n",
                encoding="utf-8",
            )

        error_res_path = ai_root / "memory" / "error-resolutions.json"
        if not error_res_path.exists():
            self._write_json(error_res_path, {"resolutions": []})

        tasks_path = ai_root / "tasks" / "active-tasks.json"
        if not tasks_path.exists():
            self._write_json(tasks_path, {"tasks": []})

        manifest_path = ai_root / "handoffs" / "handoff-manifest.json"
        if not manifest_path.exists():
            self._write_json(manifest_path, {"handoffs": []})

        handoff_files = sorted(
            [p.name for p in (ai_root / "handoffs").glob("*.md")]
        )

        return {
            "config": config_data,
            "projectState": project_state,
            "sessionState": session_state,
            "providerSelection": provider_selection,
            "handoffFiles": handoff_files,
            "projectAiDirectories": REQUIRED_SUBDIRECTORIES,
        }

    def save_session_state(
        self, root_path: str | Path, state: StructuredSessionStateModel
    ) -> Dict[str, Any]:
        ai_root = self.get_project_ai_root(root_path)
        session_state_path = ai_root / "session-state" / "current-session.json"
        payload = state.model_dump()
        self._write_json(session_state_path, payload)
        return payload

    def save_provider_selection(
        self, root_path: str | Path, selection: ProviderSelectionModel
    ) -> Dict[str, Any]:
        ai_root = self.get_project_ai_root(root_path)
        provider_state_path = ai_root / "provider-state" / "active-selection.json"
        payload = selection.model_dump()
        payload["updatedAt"] = utc_now_iso()
        self._write_json(provider_state_path, payload)
        return payload

    def write_handoff_markdown(
        self, root_path: str | Path, handoff: HandoffWriteRequest
    ) -> Dict[str, Any]:
        ai_root = self.get_project_ai_root(root_path)
        handoffs_dir = ai_root / "handoffs"
        handoffs_dir.mkdir(parents=True, exist_ok=True)

        safe_filename = Path(handoff.filename).name
        if not safe_filename.endswith(".md"):
            safe_filename = f"{safe_filename}.md"

        md_path = handoffs_dir / safe_filename
        md_path.write_text(handoff.markdownContent, encoding="utf-8")

        manifest_path = handoffs_dir / "handoff-manifest.json"
        manifest = (
            self._read_json(manifest_path)
            if manifest_path.exists()
            else {"handoffs": []}
        )
        entry = {
            "sequenceNumber": handoff.sequenceNumber,
            "filename": safe_filename,
            "fromProvider": handoff.fromProvider,
            "fromAccountLabel": handoff.fromAccountLabel,
            "toProvider": handoff.toProvider,
            "toAccountLabel": handoff.toAccountLabel,
            "reason": handoff.reason,
            "createdAt": utc_now_iso(),
        }
        manifest["handoffs"].insert(0, entry)
        self._write_json(manifest_path, manifest)
        return entry

    def _scan_top_level_files(self, project_root: Path) -> List[str]:
        results: List[str] = []
        for item in sorted(project_root.iterdir()):
            if item.name.startswith(".") or item.name in ("node_modules", "__pycache__", "dist", "build"):
                continue
            if item.is_file():
                results.append(item.name)
        return results

    def _detect_languages(self, project_root: Path) -> List[str]:
        ext_map = {
            ".ts": "TypeScript",
            ".tsx": "TypeScript",
            ".js": "JavaScript",
            ".py": "Python",
            ".go": "Go",
            ".rs": "Rust",
            ".java": "Java",
        }
        detected = set()
        for path in project_root.rglob("*"):
            if any(part.startswith(".") or part in ("node_modules", ".venv", "dist") for part in path.parts):
                continue
            if path.is_file() and path.suffix in ext_map:
                detected.add(ext_map[path.suffix])
            if len(detected) >= 5:
                break
        return sorted(detected) if detected else ["General"]

    @staticmethod
    def _read_json(path: Path) -> Dict[str, Any]:
        return json.loads(path.read_text(encoding="utf-8"))

    @staticmethod
    def _write_json(path: Path, data: Dict[str, Any]) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
