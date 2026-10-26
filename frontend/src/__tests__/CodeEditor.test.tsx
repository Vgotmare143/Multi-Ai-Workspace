import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { App } from '../App';
import {
  useWorkspaceStore,
  INITIAL_ACCOUNTS,
  INITIAL_FILE_CONTENTS,
} from '../stores/useWorkspaceStore';

describe('Phase 4: Monaco Code Editor, Multi-Tab Buffers & Safe AI Diff Approval', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      accounts: INITIAL_ACCOUNTS,
      activeProviderId: 'claude',
      activeAccountId: 'claude-account-a',
      activeFilePath: 'src/middleware/auth.ts',
      fileContents: { ...INITIAL_FILE_CONTENTS },
      openTabs: [
        {
          path: 'src/middleware/auth.ts',
          name: 'auth.ts',
          language: 'typescript',
          content: INITIAL_FILE_CONTENTS['src/middleware/auth.ts'],
          savedContent: INITIAL_FILE_CONTENTS['src/middleware/auth.ts'],
          isDirty: false,
          cursorLine: 1,
          cursorColumn: 1,
        },
      ],
      pendingDiffProposal: null,
      commandPaletteOpen: false,
    });
  });

  it('tracks dirty state when editing code and clears dirty indicator on Save', () => {
    render(<App />);

    const editorInput = screen.getByTestId('code-editor-textarea');
    fireEvent.change(editorInput, {
      target: { value: '// Modified buffer content\nexport const x = 1;\n' },
    });

    // Dirty indicator dot should appear on auth.ts tab
    expect(screen.getByTestId('dirty-indicator-auth.ts')).toBeInTheDocument();

    // Click Save button
    fireEvent.click(screen.getByTestId('save-active-file-btn'));
    expect(screen.queryByTestId('dirty-indicator-auth.ts')).not.toBeInTheDocument();
  });

  it('enforces Safe AI Diff workflow: AI proposes diff -> shows side-by-side preview -> applies only on User Approval', () => {
    render(<App />);

    // Trigger AI Code Action (Diff Proposal)
    fireEvent.click(screen.getByTestId('propose-ai-diff-btn'));

    // Verify diff review banner & side-by-side preview appear without overwriting file yet
    expect(screen.getByTestId('ai-diff-review-banner')).toHaveTextContent(
      'Enforce strict Bearer prefix check'
    );
    expect(screen.getByTestId('diff-proposed-code')).toHaveTextContent(
      "authHeader.startsWith('Bearer ')"
    );

    // Approve the AI diff
    fireEvent.click(screen.getByTestId('approve-ai-diff-btn'));

    // Banner closes and editor buffer now contains the approved code
    expect(screen.queryByTestId('ai-diff-review-banner')).not.toBeInTheDocument();
    const textarea = screen.getByTestId('code-editor-textarea') as HTMLTextAreaElement;
    expect(textarea.value).toContain("authHeader.startsWith('Bearer ')");
  });

  it('executes provider and account switches directly from the Command Palette', () => {
    render(<App />);

    fireEvent.click(screen.getByTestId('open-command-palette-btn'));
    expect(screen.getByTestId('command-palette-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('cmd-switch-claude-b'));
    expect(screen.getByTestId('ai-panel-active-identity')).toHaveTextContent(
      'Claude — Claude Account B'
    );
  });
});
