import React from 'react';
import { AlertCircle, AlertTriangle, ArrowRight, Clock, RotateCcw } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';

export const LimitAlertBanner: React.FC = () => {
  const {
    accounts,
    activeAccountId,
    activeProviderId,
    switchAccount,
    switchProvider,
    simulateQuotaState,
  } = useWorkspaceStore();

  const activeAccount =
    accounts.find((a) => a.id === activeAccountId) ?? accounts[0];
  const { quotaState, estimatedResetAt } = activeAccount.telemetry;

  if (quotaState === 'available' || quotaState === 'unknown') {
    return null;
  }

  const alternateClaudeAccount = accounts.find(
    (a) =>
      a.providerId === 'claude' &&
      a.id !== activeAccount.id &&
      a.telemetry.quotaState !== 'limit_reached'
  );

  if (quotaState === 'approaching_limit') {
    return (
      <div
        data-testid="low-usage-warning-banner"
        className="bg-amber-950/90 border-b border-amber-700/70 px-4 py-2 flex items-center justify-between text-xs text-amber-100"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Warning:</strong> {activeAccount.label} usage is getting low. Project context
            and session state are continuously synced in <code>.project-ai/</code>.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => simulateQuotaState(activeAccount.id, 'available')}
            className="px-2.5 py-1 rounded bg-amber-900/80 hover:bg-amber-800 text-amber-100 border border-amber-700"
          >
            Continue
          </button>
          {activeProviderId === 'claude' && alternateClaudeAccount && (
            <button
              type="button"
              onClick={() => switchAccount(alternateClaudeAccount.id, 'account_rotation')}
              className="px-2.5 py-1 rounded bg-purple-700 hover:bg-purple-600 text-white font-medium"
            >
              Switch to {alternateClaudeAccount.label}
            </button>
          )}
          {activeProviderId !== 'openai' && (
            <button
              type="button"
              onClick={() => switchProvider('openai', 'usage_limit_reached')}
              className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium"
            >
              Switch to OpenAI
            </button>
          )}
          {activeProviderId !== 'gemini' && (
            <button
              type="button"
              onClick={() => switchProvider('gemini', 'usage_limit_reached')}
              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
            >
              Switch to Gemini
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="limit-reached-banner"
      className="bg-red-950/95 border-b border-red-700 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-red-100"
    >
      <div className="flex items-center gap-3">
        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
        <div>
          <span className="font-semibold">
            {activeAccount.label} usage limit reached.
          </span>{' '}
          Your conversation and project state have been safely saved to{' '}
          <code className="bg-red-900/60 px-1 rounded">.project-ai/</code>.
          {estimatedResetAt && (
            <span className="ml-2 inline-flex items-center gap-1 text-red-200">
              <Clock className="w-3.5 h-3.5" />
              Estimated reset: <strong>{estimatedResetAt}</strong>
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {activeProviderId === 'claude' && alternateClaudeAccount && (
          <button
            type="button"
            data-testid="banner-switch-claude-account-btn"
            onClick={() => switchAccount(alternateClaudeAccount.id, 'usage_limit_reached')}
            className="inline-flex items-center gap-1 px-3 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-medium"
          >
            Continue with {alternateClaudeAccount.label}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}

        {activeProviderId !== 'openai' && (
          <button
            type="button"
            data-testid="banner-switch-openai-btn"
            onClick={() => switchProvider('openai', 'usage_limit_reached')}
            className="inline-flex items-center gap-1 px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium"
          >
            Continue with OpenAI
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}

        {activeProviderId !== 'gemini' && (
          <button
            type="button"
            data-testid="banner-switch-gemini-btn"
            onClick={() => switchProvider('gemini', 'usage_limit_reached')}
            className="inline-flex items-center gap-1 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
          >
            Continue with Gemini
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={() => simulateQuotaState(activeAccount.id, 'available')}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-900/70 hover:bg-red-800 text-red-100 border border-red-700"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Wait and Retry {activeAccount.label}
        </button>
      </div>
    </div>
  );
};
