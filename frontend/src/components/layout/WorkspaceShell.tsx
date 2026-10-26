import React, { useState } from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  ClipboardCopy,
  GitCommit,
  Layers,
  MessageSquare,
  Play,
  Terminal as TerminalIcon,
} from 'lucide-react';
import { BottomPanelTab } from '@multi-ai/shared-types';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import { TopBar } from './TopBar';
import { LimitAlertBanner } from './LimitAlertBanner';
import { ProjectSwitcherModal } from '../workspace/ProjectSwitcherModal';
import { FileExplorer } from '../explorer/FileExplorer';
import { QuickSearchModal } from '../explorer/QuickSearchModal';
import { CodeEditorPane } from '../editor/CodeEditorPane';
import { CommandPaletteModal } from '../editor/CommandPaletteModal';
import { IntegratedTerminalPane } from '../terminal/IntegratedTerminalPane';

export const WorkspaceShell: React.FC = () => {
  const {
    leftSidebarOpen,
    rightAIPanelOpen,
    bottomPanelOpen,
    activeBottomTab,
    providers,
    accounts,
    activeProviderId,
    activeAccountId,
    structuredState,
    handoffHistory,
    latestHandoffMarkdown,
    setActiveBottomTab,
    toggleLeftSidebar,
    toggleRightAIPanel,
    toggleBottomPanel,
  } = useWorkspaceStore();

  const [copiedHandoff, setCopiedHandoff] = useState(false);

  const activeProvider = providers[activeProviderId];
  const activeAccount =
    accounts.find((a) => a.id === activeAccountId) ?? accounts[0];

  const handleCopyHandoff = async () => {
    if (!latestHandoffMarkdown) return;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(latestHandoffMarkdown);
    }
    setCopiedHandoff(true);
    setTimeout(() => setCopiedHandoff(false), 2000);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-ide-bg text-ide-text overflow-hidden">
      {/* Zone 1: Top Orchestration Bar */}
      <TopBar />

      {/* Modals for Workspace Switching, Quick File Open, and Command Palette */}
      <ProjectSwitcherModal />
      <QuickSearchModal />
      <CommandPaletteModal />

      {/* Conditional Quota Warning / Limit Reached Banner */}
      <LimitAlertBanner />

      {/* Main Middle Area: Left Explorer | Center Editor & Bottom Panel | Right AI Assistant */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Zone 2: Left File Explorer Panel */}
        {leftSidebarOpen && (
          <aside
            aria-label="File Explorer"
            data-testid="left-explorer-panel"
            className="w-64 bg-ide-sidebar border-r border-ide-border flex flex-col shrink-0 select-none"
          >
            <FileExplorer />
          </aside>
        )}

        {/* Center Column: Zone 3 (Code Editor) + Zone 5 (Bottom Panel) */}
        <main className="flex-1 flex flex-col min-w-0 bg-ide-bg">
          {/* Zone 3: Monaco Multi-Tab Code Editor & Safe Diff Approval Pane */}
          <CodeEditorPane />

          {/* Zone 5: Bottom Integrated Terminal / Problems / Output / Git Panel */}
          {bottomPanelOpen && (
            <section
              aria-label="Bottom Workspace Panel"
              data-testid="bottom-panel"
              className="h-60 bg-ide-panel border-t border-ide-border flex flex-col shrink-0"
            >
              <div className="h-8 border-b border-ide-border px-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  {(
                    [
                      { id: 'terminal', label: 'Terminal', icon: TerminalIcon },
                      { id: 'problems', label: 'Problems', icon: AlertOctagon },
                      { id: 'output', label: 'Output', icon: Play },
                      { id: 'git', label: 'Git & Checkpoints', icon: GitCommit },
                    ] as Array<{ id: BottomPanelTab; label: string; icon: React.ElementType }>
                  ).map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeBottomTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        data-testid={`bottom-tab-${tab.id}`}
                        onClick={() => setActiveBottomTab(tab.id)}
                        className={`h-8 flex items-center gap-1.5 border-b-2 transition-colors ${
                          isActive
                            ? 'border-blue-500 text-white font-medium'
                            : 'border-transparent text-ide-muted hover:text-slate-200'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-hidden">
                {activeBottomTab === 'terminal' && <IntegratedTerminalPane />}
                {activeBottomTab === 'problems' && (
                  <div data-testid="problems-view" className="p-3 font-mono text-xs text-slate-400">
                    No active syntax or type errors detected in workspace.
                  </div>
                )}
                {activeBottomTab === 'output' && (
                  <div data-testid="output-view" className="p-3 font-mono text-xs space-y-1 text-slate-400">
                    <div>[Orchestrator] Active Provider: {activeProvider.displayName}</div>
                    <div>[Orchestrator] Active Account: {activeAccount.label}</div>
                    <div>[StateEngine] .project-ai/session-state/current.json synchronized.</div>
                  </div>
                )}
                {activeBottomTab === 'git' && (
                  <div data-testid="git-view" className="p-3 font-mono text-xs space-y-1 text-slate-300">
                    <div>Branch: main | Pre-AI Modification Checkpoints: Enabled</div>
                    <div className="text-amber-300">
                      Modified: {structuredState.filesModified.join(', ')}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </main>

        {/* Zone 4: Right AI Assistant & Continuity Panel */}
        {rightAIPanelOpen && (
          <aside
            aria-label="AI Assistant"
            data-testid="right-ai-panel"
            className="w-96 bg-ide-sidebar border-l border-ide-border flex flex-col shrink-0"
          >
            <div className="p-3 border-b border-ide-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <div>
                  <div
                    data-testid="ai-panel-active-identity"
                    className="text-xs font-semibold text-white"
                  >
                    {activeProvider.displayName} — {activeAccount.label}
                  </div>
                  <div className="text-[11px] text-ide-muted">
                    Model: {activeAccount.modelId} ({activeAccount.connectionMode})
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 border-b border-ide-border bg-ide-panel/60 space-y-2 text-xs">
              <div className="flex items-center justify-between text-blue-300 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Layer B Structured State (Platform Owned)
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20">
                  Synced
                </span>
              </div>
              <div className="text-slate-300">
                <span className="text-ide-muted">Current Task: </span>
                <span data-testid="structured-current-task">{structuredState.currentTask}</span>
              </div>
              <div className="text-slate-300">
                <span className="text-ide-muted">Next Action: </span>
                <span data-testid="structured-next-action" className="text-emerald-300">
                  {structuredState.nextRecommendedAction}
                </span>
              </div>
            </div>

            <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs">
              {handoffHistory.length > 0 && latestHandoffMarkdown ? (
                <div
                  data-testid="handoff-continuity-card"
                  className="p-3 rounded-lg bg-purple-950/30 border border-purple-700/60 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-purple-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Context Handed Off ({handoffHistory[0].filename})
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyHandoff}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-800/70 hover:bg-purple-700 text-purple-100 text-[11px]"
                    >
                      <ClipboardCopy className="w-3 h-3" />
                      {copiedHandoff ? 'Copied!' : 'Copy .md Packet'}
                    </button>
                  </div>
                  <div className="text-[11px] text-purple-300">
                    Transition: <strong>{handoffHistory[0].fromAccountLabel}</strong> →{' '}
                    <strong>{handoffHistory[0].toAccountLabel}</strong>
                  </div>
                  <pre
                    data-testid="handoff-markdown-preview"
                    className="p-2 rounded bg-ide-bg border border-ide-border font-mono text-[10px] text-slate-300 overflow-x-auto max-h-60"
                  >
                    {latestHandoffMarkdown}
                  </pre>
                </div>
              ) : (
                <div className="p-3 rounded bg-ide-panel border border-ide-border text-slate-300 space-y-1.5">
                  <div className="font-semibold text-white">Session Active</div>
                  <p className="text-ide-muted leading-relaxed">
                    Switch between <strong>Claude Account A / B / C</strong>,{' '}
                    <strong>OpenAI / Codex</strong>, or <strong>Gemini</strong> in the top bar at
                    any time. Your project state and conversation history are preserved
                    automatically.
                  </p>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Bottom Status Bar */}
      <footer className="h-6 bg-ide-panel border-t border-ide-border px-3 flex items-center justify-between text-[11px] text-ide-muted select-none">
        <div className="flex items-center gap-3">
          <button type="button" onClick={toggleLeftSidebar} className="hover:text-white">
            {leftSidebarOpen ? 'Hide Explorer' : 'Show Explorer'}
          </button>
          <span>•</span>
          <button type="button" onClick={toggleBottomPanel} className="hover:text-white">
            {bottomPanelOpen ? 'Hide Terminal' : 'Show Terminal'}
          </button>
          <span>•</span>
          <button type="button" onClick={toggleRightAIPanel} className="hover:text-white">
            {rightAIPanelOpen ? 'Hide AI Panel' : 'Show AI Panel'}
          </button>
        </div>

        <div className="flex items-center gap-3 font-mono">
          <span>State: .project-ai/ (Local-First)</span>
          <span>•</span>
          <span>
            Session Tokens:{' '}
            {activeAccount.telemetry.sessionInputTokens +
              activeAccount.telemetry.sessionOutputTokens}
          </span>
        </div>
      </footer>
    </div>
  );
};
