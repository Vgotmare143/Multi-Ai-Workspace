import React from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import {
  Check,
  Code2,
  Command,
  FileCheck2,
  Save,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';
import { ApprovalMode } from '@multi-ai/shared-types';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';

const isTestEnv = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

export const CodeEditorPane: React.FC = () => {
  const {
    openTabs,
    activeFilePath,
    pendingDiffProposal,
    approvalMode,
    openFile,
    closeTab,
    updateTabContent,
    saveTab,
    proposeAIDiff,
    approveAIDiff,
    rejectAIDiff,
    setApprovalMode,
    setCommandPaletteOpen,
  } = useWorkspaceStore();

  const activeTab = openTabs.find((t) => t.path === activeFilePath) ?? openTabs[0];

  const handleSimulateAIPatch = () => {
    if (!activeTab) return;
    const improvedCode = [
      "import { verifyTokenSignature } from '../utils/token';",
      '',
      'export interface AuthRequest {',
      '  headers: { authorization?: string };',
      '  user?: { id: string; role: string };',
      '}',
      '',
      'export async function verifySessionToken(req: AuthRequest): Promise<boolean> {',
      '  const authHeader = req.headers.authorization?.trim();',
      "  if (!authHeader || !authHeader.startsWith('Bearer ')) {",
      '    return false;',
      '  }',
      "  const token = authHeader.slice('Bearer '.length).trim();",
      '  return verifyTokenSignature(token);',
      '}',
      '',
    ].join('\n');

    proposeAIDiff(
      activeTab.path,
      improvedCode,
      'Enforce strict Bearer prefix check and trim token whitespace'
    );
  };

  return (
    <section
      aria-label="Code Editor"
      data-testid="center-editor-panel"
      className="flex-1 flex flex-col min-h-0 bg-ide-bg"
    >
      {/* Top Row: Editor Tabs + Quick Actions */}
      <div className="h-9 bg-ide-panel border-b border-ide-border flex items-center justify-between px-2 text-xs select-none">
        {/* Multi-Tab Bar */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {openTabs.map((tab) => {
            const isActive = tab.path === activeTab?.path;
            return (
              <div
                key={tab.path}
                data-testid={`editor-tab-${tab.name}`}
                onClick={() => openFile(tab.path)}
                className={`group px-3 py-1.5 rounded-t flex items-center gap-2 border-t-2 cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-ide-bg border-blue-500 text-white font-medium'
                    : 'bg-ide-panel border-transparent text-ide-muted hover:text-slate-200'
                }`}
              >
                <Code2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="font-mono">{tab.name}</span>
                {tab.isDirty && (
                  <span
                    data-testid={`dirty-indicator-${tab.name}`}
                    className="w-2 h-2 rounded-full bg-amber-400"
                    title="Unsaved changes"
                  />
                )}
                <button
                  type="button"
                  aria-label={`Close ${tab.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.path);
                  }}
                  className="opacity-60 group-hover:opacity-100 hover:text-red-400"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Editor Toolbar: Save, AI Diff Action, Approval Mode, Command Palette */}
        <div className="flex items-center gap-2 shrink-0">
          {activeTab && (
            <button
              type="button"
              data-testid="save-active-file-btn"
              onClick={() => saveTab(activeTab.path)}
              disabled={!activeTab.isDirty}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] ${
                activeTab.isDirty
                  ? 'bg-blue-600/20 border-blue-500/50 text-blue-200 hover:bg-blue-600/30'
                  : 'bg-ide-bg border-ide-border text-slate-500 cursor-not-allowed'
              }`}
              title="Save File (Cmd/Ctrl+S)"
            >
              <Save className="w-3 h-3" />
              <span>Save</span>
            </button>
          )}

          <button
            type="button"
            data-testid="propose-ai-diff-btn"
            onClick={handleSimulateAIPatch}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/40 text-[11px]"
            title="Test Safe AI Diff Proposal Workflow (Section 17)"
          >
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>AI Code Action (Diff)</span>
          </button>

          <select
            aria-label="AI Modification Approval Policy"
            data-testid="approval-mode-select"
            value={approvalMode}
            onChange={(e) => setApprovalMode(e.target.value as ApprovalMode)}
            className="bg-ide-bg border border-ide-border rounded px-2 py-1 text-[11px] text-slate-300"
          >
            <option value="ask_every_time">Policy: Ask Every Time</option>
            <option value="auto_approve_safe">Policy: Auto-Approve Safe</option>
            <option value="advanced">Policy: Advanced Mode</option>
          </select>

          <button
            type="button"
            data-testid="open-command-palette-btn"
            onClick={() => setCommandPaletteOpen(true)}
            className="p-1 rounded bg-ide-bg border border-ide-border text-slate-300 hover:text-white"
            title="Command Palette (Cmd/Ctrl+Shift+P)"
          >
            <Command className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Section 17: Safe AI Code Modification Diff Review Bar */}
      {pendingDiffProposal && (
        <div
          data-testid="ai-diff-review-banner"
          className="bg-purple-950/90 border-b border-purple-700 px-4 py-2 flex items-center justify-between text-xs text-purple-100"
        >
          <div className="flex items-center gap-2">
            {pendingDiffProposal.isDestructive ? (
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            ) : (
              <FileCheck2 className="w-4 h-4 text-purple-300 shrink-0" />
            )}
            <div>
              <span className="font-semibold">
                Proposed by {pendingDiffProposal.accountLabel}:
              </span>{' '}
              <span>{pendingDiffProposal.summary}</span>{' '}
              <code className="px-1.5 py-0.5 rounded bg-purple-900/80 font-mono text-[11px]">
                {pendingDiffProposal.filePath}
              </code>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="approve-ai-diff-btn"
              onClick={approveAIDiff}
              className="inline-flex items-center gap-1 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
            >
              <Check className="w-3.5 h-3.5" />
              Approve & Apply Changes
            </button>
            <button
              type="button"
              data-testid="reject-ai-diff-btn"
              onClick={rejectAIDiff}
              className="inline-flex items-center gap-1 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600"
            >
              <X className="w-3.5 h-3.5" />
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Main Editor Body: Either Side-by-Side Diff Viewer OR Active Code Editor */}
      <div className="flex-1 relative min-h-0">
        {!activeTab ? (
          <div className="h-full flex items-center justify-center text-xs text-ide-muted">
            Select a file from the Explorer or press Cmd/Ctrl+P to start editing.
          </div>
        ) : pendingDiffProposal ? (
          isTestEnv ? (
            <div
              data-testid="diff-editor-surface"
              className="grid grid-cols-2 gap-2 p-4 h-full font-mono text-xs overflow-auto"
            >
              <pre data-testid="diff-original-code" className="p-2 bg-red-950/20 border border-red-800/40 rounded">
                {pendingDiffProposal.originalContent}
              </pre>
              <pre data-testid="diff-proposed-code" className="p-2 bg-emerald-950/20 border border-emerald-800/40 rounded">
                {pendingDiffProposal.proposedContent}
              </pre>
            </div>
          ) : (
            <DiffEditor
              height="100%"
              theme="vs-dark"
              language={detectLanguageForMonaco(pendingDiffProposal.filePath)}
              original={pendingDiffProposal.originalContent}
              modified={pendingDiffProposal.proposedContent}
              options={{
                readOnly: true,
                renderSideBySide: true,
                minimap: { enabled: false },
                fontSize: 13,
                scrollBeyondLastLine: false,
              }}
            />
          )
        ) : isTestEnv ? (
          <textarea
            aria-label={`Editor Content ${activeTab.name}`}
            data-testid="code-editor-textarea"
            value={activeTab.content}
            onChange={(e) => updateTabContent(activeTab.path, e.target.value)}
            className="w-full h-full p-4 bg-ide-bg text-slate-200 font-mono text-xs focus:outline-none resize-none"
          />
        ) : (
          <Editor
            height="100%"
            theme="vs-dark"
            path={activeTab.path}
            language={activeTab.language}
            value={activeTab.content}
            onChange={(val) => updateTabContent(activeTab.path, val ?? '')}
            options={{
              minimap: { enabled: true },
              fontSize: 13,
              fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
            }}
          />
        )}
      </div>
    </section>
  );
};

function detectLanguageForMonaco(filePath: string): string {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) return 'typescript';
  if (filePath.endsWith('.py')) return 'python';
  if (filePath.endsWith('.json')) return 'json';
  return 'typescript';
}
