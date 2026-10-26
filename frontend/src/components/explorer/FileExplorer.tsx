import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FileCode,
  Folder,
  FolderOpen,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { FileNode } from '@multi-ai/shared-types';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';

interface FileTreeItemProps {
  node: FileNode;
  level: number;
  activeFilePath: string;
  onSelectFile: (path: string) => void;
  onDeleteNode: (path: string) => void;
}

const FileTreeItem: React.FC<FileTreeItemProps> = ({
  node,
  level,
  activeFilePath,
  onSelectFile,
  onDeleteNode,
}) => {
  const [expanded, setExpanded] = useState(node.isExpanded ?? true);

  const isDir = node.type === 'directory';
  const isActive = node.path === activeFilePath;

  const handleClick = () => {
    if (isDir) {
      setExpanded(!expanded);
    } else {
      onSelectFile(node.path);
    }
  };

  return (
    <div>
      <div
        onClick={handleClick}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        className={`group flex items-center justify-between py-1 pr-2 rounded cursor-pointer text-xs font-mono select-none ${
          isActive
            ? 'bg-blue-600/20 text-blue-300 font-medium'
            : 'text-slate-300 hover:bg-ide-hover hover:text-white'
        }`}
      >
        <div className="flex items-center gap-1.5 truncate">
          {isDir ? (
            <>
              {expanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )}
              {expanded ? (
                <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : (
                <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              )}
            </>
          ) : (
            <span className="w-3.5" />
          )}
          {!isDir && (
            <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          )}
          <span className="truncate">{node.name}</span>
        </div>

        <button
          type="button"
          aria-label={`Delete ${node.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onDeleteNode(node.path);
          }}
          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400 p-0.5"
          title={`Delete ${node.name}`}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {isDir && expanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              activeFilePath={activeFilePath}
              onSelectFile={onSelectFile}
              onDeleteNode={onDeleteNode}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileExplorer: React.FC = () => {
  const {
    fileTree,
    activeFilePath,
    openFile,
    createFileOrFolder,
    deleteFileNode,
    setQuickSearchOpen,
  } = useWorkspaceStore();

  const [showNewModal, setShowNewModal] = useState(false);
  const [newNodePath, setNewNodePath] = useState('');
  const [newIsDirectory, setNewIsDirectory] = useState(false);

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNodePath.trim()) return;
    createFileOrFolder(newNodePath.trim(), newIsDirectory);
    setNewNodePath('');
    setShowNewModal(false);
  };

  return (
    <div className="h-full flex flex-col bg-ide-sidebar select-none">
      {/* Explorer Header */}
      <div className="px-3 py-2 border-b border-ide-border flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-ide-muted">
        <span>Explorer</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Quick File Search"
            onClick={() => setQuickSearchOpen(true)}
            className="p-1 rounded hover:bg-ide-hover text-slate-300 hover:text-white"
            title="Quick File Search (Cmd/Ctrl+P)"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            aria-label="New File or Folder"
            onClick={() => setShowNewModal(true)}
            className="p-1 rounded hover:bg-ide-hover text-slate-300 hover:text-white"
            title="New File or Folder"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* File Tree List */}
      <div className="flex-1 p-2 overflow-y-auto space-y-0.5">
        {fileTree.length === 0 ? (
          <div className="p-3 text-xs text-ide-muted text-center">
            No files found in workspace. Click [+] to add a file.
          </div>
        ) : (
          fileTree.map((node) => (
            <FileTreeItem
              key={node.id}
              node={node}
              level={0}
              activeFilePath={activeFilePath}
              onSelectFile={openFile}
              onDeleteNode={deleteFileNode}
            />
          ))
        )}
      </div>

      {/* New File / Folder Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateNew}
            className="bg-ide-panel border border-ide-border rounded-lg p-5 w-full max-w-md shadow-2xl space-y-4 text-xs"
          >
            <div className="flex items-center justify-between font-semibold text-white">
              <span>Create New File or Folder</span>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1">
              <label className="text-slate-300">Path (relative to workspace)</label>
              <input
                type="text"
                required
                placeholder="src/components/Button.tsx"
                value={newNodePath}
                onChange={(e) => setNewNodePath(e.target.value)}
                className="w-full px-3 py-2 rounded bg-ide-bg border border-ide-border text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={newIsDirectory}
                onChange={(e) => setNewIsDirectory(e.target.checked)}
                className="rounded border-slate-600 text-blue-500 focus:ring-0"
              />
              <span>Create as directory</span>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-500 font-medium"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
