from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class FileNode(BaseModel):
    id: str
    name: str
    path: str
    absolutePath: str
    type: str  # "file" | "directory"
    extension: Optional[str] = None
    sizeBytes: Optional[int] = None
    children: Optional[List[FileNode]] = None
    isExpanded: bool = False


class FileService:
    """
    Provides secure, traversal-safe file explorer tree generation and CRUD operations
    within a project workspace root.
    """

    EXCLUDED_DIRS = {
        ".project-ai",
        "node_modules",
        ".git",
        "__pycache__",
        ".venv",
        "dist",
        "build",
        "coverage",
    }

    def _resolve_safe_path(self, project_root: str | Path, rel_path: str) -> Path:
        root_resolved = Path(project_root).expanduser().resolve()
        clean_rel = rel_path.lstrip("/\\")
        target = (root_resolved / clean_rel).resolve()

        # Prevent path traversal attacks
        if not target.is_relative_to(root_resolved):
            raise ValueError(f"Access denied: path '{rel_path}' escapes project root.")
        return target

    def build_file_tree(self, project_root: str | Path) -> List[FileNode]:
        root_resolved = Path(project_root).expanduser().resolve()
        if not root_resolved.exists():
            return []

        def _traverse(current_path: Path) -> List[FileNode]:
            nodes: List[FileNode] = []
            try:
                items = sorted(current_path.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower()))
            except PermissionError:
                return []

            for item in items:
                if item.name in self.EXCLUDED_DIRS or item.name.startswith(".DS_Store"):
                    continue

                rel_path = str(item.relative_to(root_resolved)).replace("\\", "/")
                node_id = f"node_{rel_path.replace('/', '_').replace('.', '_')}"

                if item.is_dir():
                    children = _traverse(item)
                    nodes.append(
                        FileNode(
                            id=node_id,
                            name=item.name,
                            path=rel_path,
                            absolutePath=str(item),
                            type="directory",
                            children=children,
                            isExpanded=True,
                        )
                    )
                else:
                    stat = item.stat()
                    nodes.append(
                        FileNode(
                            id=node_id,
                            name=item.name,
                            path=rel_path,
                            absolutePath=str(item),
                            type="file",
                            extension=item.suffix.lstrip("."),
                            sizeBytes=stat.st_size,
                        )
                    )
            return nodes

        return _traverse(root_resolved)

    def read_file_content(self, project_root: str | Path, rel_path: str) -> str:
        target = self._resolve_safe_path(project_root, rel_path)
        if not target.is_file():
            raise FileNotFoundError(f"File not found: {rel_path}")
        return target.read_text(encoding="utf-8", errors="replace")

    def write_file_content(self, project_root: str | Path, rel_path: str, content: str) -> Dict[str, Any]:
        target = self._resolve_safe_path(project_root, rel_path)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
        return {
            "success": True,
            "message": f"Successfully wrote {rel_path}",
            "path": rel_path,
            "sizeBytes": target.stat().st_size,
        }

    def create_node(self, project_root: str | Path, rel_path: str, is_directory: bool) -> Dict[str, Any]:
        target = self._resolve_safe_path(project_root, rel_path)
        if target.exists():
            raise FileExistsError(f"Path already exists: {rel_path}")

        if is_directory:
            target.mkdir(parents=True, exist_ok=True)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text("", encoding="utf-8")

        return {
            "success": True,
            "message": f"Created {'directory' if is_directory else 'file'}: {rel_path}",
            "path": rel_path,
        }

    def delete_node(self, project_root: str | Path, rel_path: str) -> Dict[str, Any]:
        target = self._resolve_safe_path(project_root, rel_path)
        if not target.exists():
            raise FileNotFoundError(f"Path not found: {rel_path}")

        if target.is_dir():
            for child in target.rglob("*"):
                if child.name in self.EXCLUDED_DIRS:
                    raise ValueError("Cannot delete protected system directory.")
            import shutil
            shutil.rmtree(target)
        else:
            target.unlink()

        return {
            "success": True,
            "message": f"Successfully deleted {rel_path}",
            "path": rel_path,
        }
