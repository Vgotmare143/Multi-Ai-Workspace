import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { App } from '../App';
import { useWorkspaceStore, INITIAL_ACCOUNTS } from '../stores/useWorkspaceStore';

describe('Phase 1: Multi-AI Development Workspace Application Shell', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      accounts: INITIAL_ACCOUNTS,
      activeProviderId: 'claude',
      activeAccountId: 'claude-account-a',
      handoffHistory: [],
      latestHandoffMarkdown: null,
    });
  });

  it('renders all 5 core IDE zones and honest default usage telemetry', () => {
    render(<App />);

    expect(screen.getByTestId('active-project-name')).toHaveTextContent('sample-service-api');
    expect(screen.getByTestId('active-git-branch')).toHaveTextContent('main');
    expect(screen.getByTestId('left-explorer-panel')).toBeInTheDocument();
    expect(screen.getByTestId('center-editor-panel')).toBeInTheDocument();
    expect(screen.getByTestId('right-ai-panel')).toBeInTheDocument();
    expect(screen.getByTestId('bottom-panel')).toBeInTheDocument();

    // Verify Rule 13: Honest Usage status ("Usage: Unknown" when no headers exist, never fake %)
    expect(screen.getByTestId('usage-status-badge')).toHaveTextContent(
      'Status: Available | Usage: Unknown'
    );
  });

  it('switches from Claude Account A to Claude Account B and generates claude-session-001.md handoff', () => {
    render(<App />);

    const accountSelect = screen.getByTestId('ai-account-select');
    fireEvent.change(accountSelect, { target: { value: 'claude-account-b' } });

    expect(screen.getByTestId('ai-panel-active-identity')).toHaveTextContent(
      'Claude — Claude Account B'
    );

    const handoffCard = screen.getByTestId('handoff-continuity-card');
    expect(handoffCard).toHaveTextContent('claude-session-001.md');
    expect(handoffCard).toHaveTextContent('Claude Account A → Claude Account B');

    const markdownPreview = screen.getByTestId('handoff-markdown-preview');
    expect(markdownPreview).toHaveTextContent('# Conversation History');
    expect(markdownPreview).toHaveTextContent('# Current Task');
    expect(markdownPreview).toHaveTextContent('# Pending Work');
    expect(markdownPreview).toHaveTextContent('# Next Action');
  });

  it('preserves project context when switching providers from Claude -> OpenAI -> Gemini', () => {
    render(<App />);

    const providerSelect = screen.getByTestId('ai-provider-select');

    // Switch Claude -> OpenAI
    fireEvent.change(providerSelect, { target: { value: 'openai' } });
    expect(screen.getByTestId('ai-panel-active-identity')).toHaveTextContent(
      'OpenAI / Codex — OpenAI Primary (Free/Bridge)'
    );
    expect(screen.getByTestId('structured-current-task')).toHaveTextContent(
      'Complete JWT middleware validation and add unit tests'
    );

    // Switch OpenAI -> Gemini
    fireEvent.change(providerSelect, { target: { value: 'gemini' } });
    expect(screen.getByTestId('ai-panel-active-identity')).toHaveTextContent(
      'Google Gemini — Gemini Free Tier / Studio'
    );
    expect(screen.getByTestId('handoff-continuity-card')).toHaveTextContent(
      'claude-session-002.md'
    );
  });

  it('displays limit-reached banner with reset estimate and switches cleanly on click', () => {
    render(<App />);

    fireEvent.click(screen.getByTestId('simulate-limit-reached-btn'));

    const banner = screen.getByTestId('limit-reached-banner');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent('Claude Account A usage limit reached.');
    expect(banner).toHaveTextContent('4:00 PM');

    // Click "Continue with Claude Account B" directly from the limit banner
    fireEvent.click(screen.getByTestId('banner-switch-claude-account-btn'));
    expect(screen.getByTestId('ai-panel-active-identity')).toHaveTextContent(
      'Claude — Claude Account B'
    );
  });
});
