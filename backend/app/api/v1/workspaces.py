from __future__ import annotations

from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from app.services.project_ai_sync import (
    HandoffWriteRequest,
    ProjectAISynchronizer,
    ProviderSelectionModel,
    StructuredSessionStateModel,
)

router = APIRouter(prefix="/api/v1/workspaces", tags=["workspaces"])
synchronizer = ProjectAISynchronizer()


class OpenWorkspaceRequest(BaseModel):
    rootPath: str
    projectName: Optional[str] = None
    gitBranch: str = "main"


class UpdateSessionStateRequest(BaseModel):
    rootPath: str
    sessionState: StructuredSessionStateModel


class UpdateProviderSelectionRequest(BaseModel):
    rootPath: str
    providerSelection: ProviderSelectionModel


class CreateHandoffArtifactRequest(BaseModel):
    rootPath: str
    handoff: HandoffWriteRequest


@router.post("/open")
async def open_workspace(payload: OpenWorkspaceRequest) -> Dict[str, Any]:
    try:
        return synchronizer.initialize_or_load_workspace(
            root_path=payload.rootPath,
            project_name=payload.projectName,
            git_branch=payload.gitBranch,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/state")
async def get_workspace_state(root_path: str = Query(..., alias="rootPath")) -> Dict[str, Any]:
    try:
        return synchronizer.initialize_or_load_workspace(root_path=root_path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.put("/session-state")
async def update_session_state(payload: UpdateSessionStateRequest) -> Dict[str, Any]:
    try:
        updated = synchronizer.save_session_state(payload.rootPath, payload.sessionState)
        return {"status": "ok", "sessionState": updated}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.put("/provider-selection")
async def update_provider_selection(payload: UpdateProviderSelectionRequest) -> Dict[str, Any]:
    try:
        updated = synchronizer.save_provider_selection(
            payload.rootPath, payload.providerSelection
        )
        return {"status": "ok", "providerSelection": updated}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/handoffs")
async def create_handoff_artifact(payload: CreateHandoffArtifactRequest) -> Dict[str, Any]:
    try:
        entry = synchronizer.write_handoff_markdown(payload.rootPath, payload.handoff)
        return {"status": "ok", "handoff": entry}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
