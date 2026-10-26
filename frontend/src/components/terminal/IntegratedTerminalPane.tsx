import React, { useEffect, useRef, useState } from 'react';
import {
  AlertOctagon,
  Check,
  Play,
  ShieldAlert,
  Sparkles,
  Terminal as TerminalIcon,
  Trash2,
  X,
} from 'lucide-react';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';

const isTestEnv = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

export const IntegratedTerminalPane: React.FC = () => {
  const {
    projectName,
    terminalHistory,
    pendingCommandProposal,
    runOrProposeTerminalCommand,
    proposeAICommand,
    approvePendingCommand,
    rejectPendingCommand,
    clearTerminalHistory,
  } = useWorkspaceStore();

  const [commandInput, setCommandInput] = useState('');
  const xtermContainerRef = useRef<HTMLDivElement | null>(null);

  // Initialize xterm.js in live browser mode
  useEffect(() => {
    if (isTestEnv || !xtermContainerRef.current) return;

    let disposed = false;
    let termInstance: { dispose: () => void; writeln: (text: string) => void } | null = null;

    (async () => {
      try {
        const { Terminal } = await import('@xterm/xterm');
        if (disposed || !xtermContainerRef.current) return;
        const term = new Terminal({
          theme: {
            background: '#0f1117',
            foreground: '#e2e8f0',
            cursor: '#3b82f6',
          },
          fontSize: 12,
          fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
          rows: 8,
          convertEol: true,
        });
        term.open(xtermContainerRef.current);
        term.writeln(`Multi-AI Workspace PTY Terminal [${projectName}]`);
        termInstance = term;
      } catch {
        // Fallback log view remains active below
      }
    })();

    return () => {
      disposed = true;
      termInstance?.dispose();
    };
  }, [projectName]);

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;
    runOrProposeTerminalCommand(commandInput, 'user');
    setCommandInput('');
  };

  return (
    <div data-testid="terminal-view" className="h-full flex flex-col bg-ide-bg/80 text-xs font-mono">
      {/* Terminal Toolbar */}
      <div className="px-3 py-1.5 bg-ide-panel/80 border-b border-ide-border flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-300">
          <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
          <span>Shell: /workspace/{projectName}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-700/50">
            Command Guard Active
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="simulate-ai-safe-cmd-btn"
            onClick={() => proposeAICommand('npm test -- tests/auth.spec.ts')}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 border border-blue-500/40 text-[11px]"
          >
            <Sparkles className="w-3 h-3 text-blue-400" />
            <span>AI Suggest Test Cmd</span>
          </button>

          <button
            type="button"
            data-testid="simulate-ai-destructive-cmd-btn"
            onClick={() => proposeAICommand('rm -rf dist/ && git reset --hard')}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-600/20 hover:bg-red-600/30 text-red-200 border border-red-500/40 text-[11px]"
          >
            <ShieldAlert className="w-3 h-3 text-red-400" />
            <span>AI Suggest Destructive Cmd</span>
          </button>

          <button
            type="button"
            onClick={clearTerminalHistory}
            className="p-1 rounded hover:bg-ide-hover text-slate-400 hover:text-white"
            title="Clear Terminal Output"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Section 18: Destructive / State-Mutating Command Approval Bar */}
      {pendingCommandProposal && (
        <div
          data-testid="terminal-command-approval-banner"
          className={`px-4 py-2 border-b flex items-center justify-between gap-2 ${
            pendingCommandProposal.classification.riskLevel === 'destructive'
              ? 'bg-red-950/95 border-red-700 text-red-100'
              : 'bg-amber-950/95 border-amber-700 text-amber-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {pendingCommandProposal.classification.riskLevel === 'destructive' ? (
              <AlertOctagon className="w-4 h-4 text-red-400 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <div>
              <span className="font-semibold uppercase text-[10px] px-1.5 py-0.5 rounded bg-black/40 mr-2">
                {pendingCommandProposal.classification.riskLevel}
              </span>
              <span className="font-semibold">
                {pendingCommandProposal.source === 'ai'
                  ? `${pendingCommandProposal.accountLabel} proposes command:`
                  : 'Confirmation required:'}
              </span>{' '}
              <code
                data-testid="pending-command-text"
                className="px-1.5 py-0.5 rounded bg-black/40 text-white"
              >
                {pendingCommandProposal.command}
              </code>{' '}
              <span className="text-[11px] opacity-90">
                ({pendingCommandProposal.classification.reason})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              data-testid="approve-terminal-command-btn"
              onClick={approvePendingCommand}
              className="inline-flex items-center gap-1 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-medium"
            >
              <Check className="w-3.5 h-3.5" />
              Approve & Execute
            </button>
            <button
              type="button"
              data-testid="reject-terminal-command-btn"
              onClick={rejectPendingCommand}
              className="inline-flex items-center gap-1 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-sans"
            >
              <X className="w-3.5 h-3.5" />
              Block Command
            </button>
          </div>
        </div>
      )}

      {/* Terminal Output Scrollback */}
      <div
        data-testid="terminal-history-list"
        className="flex-1 p-3 overflow-y-auto space-y-2"
      >
        {terminalHistory.map((item) => (
          <div key={item.id} className="space-y-0.5">
            <div className="flex items-center gap-2 text-emerald-400">
              <span>$ {item.command}</span>
              <span className="text-[10px] text-slate-500">
                [{item.riskLevel} • {item.executedBy}]
              </span>
            </div>
            <pre className="text-slate-300 whitespace-pre-wrap pl-3">{item.output}</pre>
          </div>
        ))}
        <div ref={xtermContainerRef} className="hidden" />
      </div>

      {/* Interactive Command Input Form */}
      <form
        onSubmit={handleCommandSubmit}
        className="h-8 border-t border-ide-border px-3 flex items-center gap-2 bg-ide-panel"
      >
        <span className="text-emerald-400 font-bold">$</span>
        <input
          type="text"
          data-testid="terminal-command-input"
          placeholder="Enter shell command (e.g., git status, pytest, rm -rf dist)..."
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          className="flex-1 bg-transparent text-white focus:outline-none"
        />
        <button
          type="submit"
          data-testid="terminal-run-btn"
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-sans text-[11px]"
        >
          <Play className="w-3 h-3" />
          Run
        </button>
      </form>
    </div>
  );
};
