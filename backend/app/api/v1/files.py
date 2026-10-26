from __future__ import annotations

from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from app.services.file_service import FileService

router = APIRouter(prefix="/api/v1/files", tags=["files"])
file_service = FileService()


class WriteFileRequest(BaseModel):
    rootPath: str
    path: str
    content: str


class CreateNodeRequest(BaseModel):
    rootPath: str
    path: str
    isDirectory: bool = False


class DeleteNodeRequest(BaseModel):
    rootPath: str
    path: str


@router.get("/tree")
async def get_file_tree(root_path: str = Query(..., alias="rootPath")) -> List[Dict[str, Any]]:
    try:
        tree = file_service.build_file_tree(root_path)
        return [node.model_dump() for node in tree]
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/content")
async def get_file_content(
    root_path: str = Query(..., alias="rootPath"),
    path: str = Query(..., alias="path"),
) -> Dict[str, str]:
    try:
        content = file_service.read_file_content(root_path, path)
        return {"path": path, "content": content}
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/content")
async def save_file_content(payload: WriteFileRequest) -> Dict[str, Any]:
    try:
        return file_service.write_file_content(payload.rootPath, payload.path, payload.content)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/create")
async def create_file_or_folder(payload: CreateNodeRequest) -> Dict[str, Any]:
    try:
        return file_service.create_node(payload.rootPath, payload.path, payload.isDirectory)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/delete")
async def delete_file_or_folder(payload: DeleteNodeRequest) -> Dict[str, Any]:
    try:
        return file_service.delete_node(payload.rootPath, payload.path)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
