from __future__ import annotations

from typing import Any, Dict
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from app.services.pty_service import PTYService

router = APIRouter(prefix="/api/v1/terminal", tags=["terminal"])
pty_service = PTYService()


class ClassifyCommandRequest(BaseModel):
    command: str


class ExecuteCommandRequest(BaseModel):
    rootPath: str
    command: str
    approvedByUser: bool = False


@router.post("/classify")
async def classify_terminal_command(payload: ClassifyCommandRequest) -> Dict[str, Any]:
    result = pty_service.classify_command(payload.command)
    return result.model_dump()


@router.post("/execute")
async def execute_terminal_command(payload: ExecuteCommandRequest) -> Dict[str, Any]:
    try:
        return await pty_service.execute_command(
            root_path=payload.rootPath,
            command=payload.command,
            approved_by_user=payload.approvedByUser,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.websocket("/ws")
async def terminal_websocket(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        while True:
            message = await websocket.receive_json()
            msg_type = message.get("type", "execute")
            command = message.get("command", "")
            root_path = message.get("rootPath", ".")
            approved = bool(message.get("approvedByUser", False))

            if msg_type == "classify":
                classification = pty_service.classify_command(command)
                await websocket.send_json(
                    {"type": "classification", "data": classification.model_dump()}
                )
                continue

            try:
                result = await pty_service.execute_command(
                    root_path=root_path,
                    command=command,
                    approved_by_user=approved,
                )
                await websocket.send_json({"type": "execution_result", "data": result})
            except PermissionError as exc:
                classification = pty_service.classify_command(command)
                await websocket.send_json(
                    {
                        "type": "approval_required",
                        "error": str(exc),
                        "classification": classification.model_dump(),
                    }
                )
            except Exception as exc:
                await websocket.send_json({"type": "error", "error": str(exc)})
    except WebSocketDisconnect:
        return
