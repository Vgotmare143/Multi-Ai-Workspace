import React, { useState } from 'react';
import { Command, Play } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';

export const CommandPaletteModal: React.FC = () => {
  const {
    commandPaletteOpen,
    activeFilePath,
    setCommandPaletteOpen,
    switchProvider,
    switchAccount,
    saveTab,
    setProjectModalOpen,
    setQuickSearchOpen,
  } = useWorkspaceStore();

  const [filter, setFilter] = useState('');

  if (!commandPaletteOpen) {
    return null;
  }

  const actions = [
    {
      id: 'switch-claude-b',
      label: 'AI: Switch to Claude Account B (Preserve Context & Export .md)',
      run: () => switchAccount('claude-account-b', 'manual_switch'),
    },
    {
      id: 'switch-openai',
      label: 'AI: Switch Provider to OpenAI / Codex',
      run: () => switchProvider('openai', 'manual_switch'),
    },
    {
      id: 'switch-gemini',
      label: 'AI: Switch Provider to Google Gemini',
      run: () => switchProvider('gemini', 'manual_switch'),
    },
    {
      id: 'save-file',
      label: 'File: Save Active File (Cmd/Ctrl+S)',
      run: () => activeFilePath && saveTab(activeFilePath),
    },
    {
      id: 'quick-open',
      label: 'File: Quick Open File by Name (Cmd/Ctrl+P)',
      run: () => setQuickSearchOpen(true),
    },
    {
      id: 'switch-project',
      label: 'Workspace: Switch or Initialize Project (.project-ai/)',
      run: () => setProjectModalOpen(true),
    },
  ];

  const matching = actions.filter((a) =>
    a.label.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div
      data-testid="command-palette-modal"
      className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center pt-20 p-4"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div
        className="bg-ide-panel border border-ide-border rounded-lg w-full max-w-xl shadow-2xl overflow-hidden text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 border-b border-ide-border flex items-center gap-2">
          <Command className="w-4 h-4 text-blue-400" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command (e.g., Switch to Claude Account B, Save)..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-transparent text-white font-mono focus:outline-none"
          />
        </div>
        <div className="max-h-72 overflow-y-auto divide-y divide-ide-border">
          {matching.map((item) => (
            <button
              key={item.id}
              type="button"
              data-testid={`cmd-${item.id}`}
              onClick={() => {
                item.run();
                setCommandPaletteOpen(false);
              }}
              className="w-full p-2.5 flex items-center justify-between hover:bg-ide-hover text-left text-slate-200"
            >
              <span>{item.label}</span>
              <Play className="w-3 h-3 text-slate-500" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
