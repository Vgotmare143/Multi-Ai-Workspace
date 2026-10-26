import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bot,
  FolderGit2,
  GitBranch,
  Plus,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { AIProviderId, ConnectionMode } from '@multi-ai/shared-types';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';

const CONNECTION_MODE_LABELS: Record<ConnectionMode, string> = {
  mock: 'Simulator ($0)',
  web_bridge: 'Web Bridge ($0)',
  api_key: 'Cloud API Key',
  local_ollama: 'Local Ollama ($0)',
};

export const TopBar: React.FC = () => {
  const {
    projectName,
    gitBranch,
    uncommittedChangesCount,
    providers,
    accounts,
    activeProviderId,
    activeAccountId,
    autoFallbackEnabled,
    switchProvider,
    switchAccount,
    addClaudeAccount,
    setAccountConnectionMode,
    simulateQuotaState,
    setAutoFallbackEnabled,
  } = useWorkspaceStore();

  const { setProjectModalOpen } = useWorkspaceStore();

  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newAccountLabel, setNewAccountLabel] = useState('');
  const [newAccountMode, setNewAccountMode] = useState<ConnectionMode>('web_bridge');

  const activeAccount =
    accounts.find((a) => a.id === activeAccountId) ?? accounts[0];
  const providerAccounts = accounts.filter((a) => a.providerId === activeProviderId);

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextProvider = e.target.value as AIProviderId;
    if (nextProvider !== activeProviderId) {
      switchProvider(nextProvider, 'manual_switch');
    }
  };

  const handleAccountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === '__add_new__') {
      setShowAddAccountModal(true);
      return;
    }
    if (value !== activeAccountId) {
      switchAccount(value, 'manual_switch');
    }
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountLabel.trim()) return;
    const created = addClaudeAccount(newAccountLabel, newAccountMode);
    switchAccount(created.id, 'manual_switch');
    setNewAccountLabel('');
    setShowAddAccountModal(false);
  };

  const renderQuotaBadge = () => {
    const { quotaState, availability } = activeAccount.telemetry;
    if (quotaState === 'limit_reached') {
      return (
        <span
          data-testid="usage-status-badge"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-red-950/80 text-red-300 border border-red-700/60"
        >
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Status: Limited | Usage: Limit Reached
        </span>
      );
    }
    if (quotaState === 'approaching_limit') {
      return (
        <span
          data-testid="usage-status-badge"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-amber-950/80 text-amber-300 border border-amber-700/60"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          Status: Available | Usage: Approaching Limit
        </span>
      );
    }
    if (quotaState === 'available') {
      return (
        <span
          data-testid="usage-status-badge"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-emerald-950/70 text-emerald-300 border border-emerald-700/50"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          Status: {availability === 'available' ? 'Available' : 'Degraded'} | Usage: Available
        </span>
      );
    }
    // Honest "Unknown" state when provider does not expose exact quota headers
    return (
      <span
        data-testid="usage-status-badge"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        Status: Available | Usage: Unknown
      </span>
    );
  };

  return (
    <header className="h-12 bg-ide-panel border-b border-ide-border px-3 flex items-center justify-between select-none text-xs">
      {/* Left: Project & Git Context */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 font-semibold text-sm text-white">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span>Multi-AI Workspace</span>
        </div>

        <div className="h-4 w-px bg-ide-border" />

        <button
          type="button"
          data-testid="open-project-switcher-btn"
          onClick={() => setProjectModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-ide-bg hover:bg-ide-hover border border-ide-border text-slate-200 cursor-pointer"
          title="Click to Switch or Open Local Project Directory"
        >
          <FolderGit2 className="w-3.5 h-3.5 text-blue-400" />
          <span data-testid="active-project-name" className="font-mono">
            {projectName}
          </span>
        </button>

        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-ide-bg border border-ide-border text-slate-300"
          title="Current Git Branch"
        >
          <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
          <span data-testid="active-git-branch" className="font-mono">
            {gitBranch}
          </span>
          {uncommittedChangesCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 text-[10px]">
              {uncommittedChangesCount}M
            </span>
          )}
        </div>
      </div>

      {/* Center: AI Provider, Claude Account Switcher, & Connection Mode */}
      <div className="flex items-center gap-2">
        {/* AI Provider Selector */}
        <div className="flex items-center gap-1.5 bg-ide-bg border border-ide-border rounded px-2 py-1">
          <Bot className="w-3.5 h-3.5 text-blue-400" />
          <label htmlFor="ai-provider-select" className="text-ide-muted">
            AI:
          </label>
          <select
            id="ai-provider-select"
            data-testid="ai-provider-select"
            value={activeProviderId}
            onChange={handleProviderChange}
            className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
          >
            {Object.values(providers).map((prov) => (
              <option key={prov.id} value={prov.id} className="bg-ide-panel text-white">
                {prov.displayName}
              </option>
            ))}
          </select>
        </div>

        {/* Account Selector (First-Class Multi-Account Support for Claude & others) */}
        <div className="flex items-center gap-1.5 bg-ide-bg border border-ide-border rounded px-2 py-1">
          <UserCheck className="w-3.5 h-3.5 text-purple-400" />
          <label htmlFor="ai-account-select" className="text-ide-muted">
            Account:
          </label>
          <select
            id="ai-account-select"
            data-testid="ai-account-select"
            value={activeAccount.id}
            onChange={handleAccountChange}
            className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
          >
            {providerAccounts.map((acc) => (
              <option key={acc.id} value={acc.id} className="bg-ide-panel text-white">
                {acc.label}
              </option>
            ))}
            {activeProviderId === 'claude' && (
              <option value="__add_new__" className="bg-ide-panel text-blue-400">
                + Add Claude Account...
              </option>
            )}
          </select>
        </div>

        {/* Zero-Subscription Mode Selector */}
        <div className="flex items-center gap-1.5 bg-ide-bg border border-ide-border rounded px-2 py-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <select
            aria-label="Connection Mode"
            data-testid="connection-mode-select"
            value={activeAccount.connectionMode}
            onChange={(e) =>
              setAccountConnectionMode(activeAccount.id, e.target.value as ConnectionMode)
            }
            className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
          >
            {(Object.keys(CONNECTION_MODE_LABELS) as ConnectionMode[]).map((mode) => (
              <option key={mode} value={mode} className="bg-ide-panel text-white">
                {CONNECTION_MODE_LABELS[mode]}
              </option>
            ))}
          </select>
        </div>

        {/* Honest Usage Status Indicator */}
        {renderQuotaBadge()}
      </div>

      {/* Right: Limit Simulator Controls (for $0 testing) & Auto-Fallback Toggle */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-ide-bg border border-ide-border rounded px-2 py-1">
          <Activity className="w-3.5 h-3.5 text-amber-400" />
          <button
            type="button"
            data-testid="simulate-low-usage-btn"
            onClick={() => simulateQuotaState(activeAccount.id, 'approaching_limit')}
            className="text-[11px] text-amber-300 hover:underline px-1"
            title="Test Section 14 Low Usage Warning"
          >
            Sim Low
          </button>
          <span className="text-ide-border">|</span>
          <button
            type="button"
            data-testid="simulate-limit-reached-btn"
            onClick={() => simulateQuotaState(activeAccount.id, 'limit_reached', '4:00 PM')}
            className="text-[11px] text-red-300 hover:underline px-1"
            title="Test Section 14 Limit Reached & Handoff"
          >
            Sim Limit
          </button>
        </div>

        <label className="flex items-center gap-1.5 px-2 py-1 rounded bg-ide-bg border border-ide-border cursor-pointer">
          <input
            type="checkbox"
            checked={autoFallbackEnabled}
            onChange={(e) => setAutoFallbackEnabled(e.target.checked)}
            className="rounded border-slate-600 text-blue-500 focus:ring-0"
          />
          <RefreshCw className="w-3 h-3 text-slate-400" />
          <span className="text-slate-300">Auto-Fallback</span>
        </label>

        <button
          type="button"
          aria-label="Workspace Settings"
          className="p-1.5 rounded hover:bg-ide-hover text-slate-400 hover:text-white border border-transparent hover:border-ide-border"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Modal to Add New Authorized Claude Account Profile */}
      {showAddAccountModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateAccount}
            className="bg-ide-panel border border-ide-border rounded-lg p-5 w-full max-w-md shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                Add Authorized Claude Account Profile
              </h3>
              <button
                type="button"
                onClick={() => setShowAddAccountModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              <label className="block text-xs text-slate-300">Account Label</label>
              <input
                type="text"
                required
                placeholder="e.g., Claude Account D"
                value={newAccountLabel}
                onChange={(e) => setNewAccountLabel(e.target.value)}
                className="w-full px-3 py-2 rounded bg-ide-bg border border-ide-border text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs text-slate-300">Execution Mode ($0 Ready)</label>
              <select
                value={newAccountMode}
                onChange={(e) => setNewAccountMode(e.target.value as ConnectionMode)}
                className="w-full px-3 py-2 rounded bg-ide-bg border border-ide-border text-white"
              >
                <option value="web_bridge">Web Bridge ($0 Free Web Account)</option>
                <option value="mock">Built-In Simulator ($0 Offline)</option>
                <option value="api_key">Anthropic API Key</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddAccountModal(false)}
                className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-500 font-medium"
              >
                Save Account
              </button>
            </div>
          </form>
        </div>
      )}
    </header>
  );
};
