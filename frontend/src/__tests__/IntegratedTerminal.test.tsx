import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { App } from '../App';
import { useWorkspaceStore, INITIAL_ACCOUNTS } from '../stores/useWorkspaceStore';

describe('Phase 5: Integrated Terminal & Destructive Command Guard', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      accounts: INITIAL_ACCOUNTS,
      activeProviderId: 'claude',
      activeAccountId: 'claude-account-a',
      activeBottomTab: 'terminal',
      bottomPanelOpen: true,
      pendingCommandProposal: null,
      terminalHistory: [],
    });
  });

  it('executes safe read-only commands immediately and records them in Layer B state', () => {
    render(<App />);

    const input = screen.getByTestId('terminal-command-input');
    fireEvent.change(input, { target: { value: 'git status' } });
    fireEvent.click(screen.getByTestId('terminal-run-btn'));

    expect(screen.queryByTestId('terminal-command-approval-banner')).not.toBeInTheDocument();
    expect(screen.getByTestId('terminal-history-list')).toHaveTextContent('$ git status');
    expect(screen.getByTestId('terminal-history-list')).toHaveTextContent('On branch main');
  });

  it('intercepts destructive commands, shows high-severity approval banner, and executes only on user approval', () => {
    render(<App />);

    // Click AI Suggest Destructive Cmd button
    fireEvent.click(screen.getByTestId('simulate-ai-destructive-cmd-btn'));

    const banner = screen.getByTestId('terminal-command-approval-banner');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent('destructive');
    expect(screen.getByTestId('pending-command-text')).toHaveTextContent(
      'rm -rf dist/ && git reset --hard'
    );

    // Command must not be in terminal history before approval
    expect(screen.getByTestId('terminal-history-list')).not.toHaveTextContent(
      'rm -rf dist/ && git reset --hard'
    );

    // Approve command execution
    fireEvent.click(screen.getByTestId('approve-terminal-command-btn'));

    expect(screen.queryByTestId('terminal-command-approval-banner')).not.toBeInTheDocument();
    expect(screen.getByTestId('terminal-history-list')).toHaveTextContent(
      '$ rm -rf dist/ && git reset --hard'
    );
  });
});
