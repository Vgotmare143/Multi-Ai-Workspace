import React, { useState, useEffect, useRef } from 'react';
import { FileCode, Search } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';

export const QuickSearchModal: React.FC = () => {
  const { quickSearchOpen, fileTree, openFile, setQuickSearchOpen } =
    useWorkspaceStore();

  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (quickSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [quickSearchOpen]);

  if (!quickSearchOpen) {
    return null;
  }

  // Flatten file tree for search
  const flattenFiles = (nodes: typeof fileTree): Array<{ name: string; path: string }> => {
    let list: Array<{ name: string; path: string }> = [];
    for (const node of nodes) {
      if (node.type === 'file') {
        list.push({ name: node.name, path: node.path });
      } else if (node.children) {
        list.push(...flattenFiles(node.children));
      }
    }
    return list;
  };

  const allFiles = flattenFiles(fileTree);
  const filteredFiles = allFiles.filter(
    (f) =>
      f.name.toLowerCase().includes(query.toLowerCase()) ||
      f.path.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (path: string) => {
    openFile(path);
    setQuickSearchOpen(false);
  };

  return (
    <div
      data-testid="quick-search-modal"
      className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center pt-24 p-4"
      onClick={() => setQuickSearchOpen(false)}
    >
      <div
        className="bg-ide-panel border border-ide-border rounded-lg w-full max-w-xl shadow-2xl overflow-hidden text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 border-b border-ide-border flex items-center gap-2">
          <Search className="w-4 h-4 text-blue-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search files by name or path (Cmd/Ctrl+P)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-white font-mono focus:outline-none"
          />
        </div>
        <div className="max-h-72 overflow-y-auto divide-y divide-ide-border">
          {filteredFiles.length === 0 ? (
            <div className="p-4 text-center text-ide-muted">No matching files found.</div>
          ) : (
            filteredFiles.map((file) => (
              <div
                key={file.path}
                onClick={() => handleSelect(file.path)}
                className="p-2.5 flex items-center justify-between hover:bg-ide-hover cursor-pointer"
              >
                <div className="flex items-center gap-2 font-mono">
                  <FileCode className="w-4 h-4 text-blue-400" />
                  <span className="text-white font-medium">{file.name}</span>
                </div>
                <span className="text-ide-muted font-mono text-[11px]">{file.path}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
