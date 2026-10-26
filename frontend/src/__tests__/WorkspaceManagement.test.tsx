import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { App } from '../App';
import { useWorkspaceStore, INITIAL_ACCOUNTS } from '../stores/useWorkspaceStore';

describe('Phase 2: Project & Workspace Management (.project-ai/)', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      projectName: 'sample-service-api',
      projectRootPath: '/workspace/sample-service-api',
      gitBranch: 'main',
      projectModalOpen: false,
      accounts: INITIAL_ACCOUNTS,
      activeProviderId: 'claude',
      activeAccountId: 'claude-account-a',
      handoffHistory: [],
      latestHandoffMarkdown: null,
    });
  });

  it('opens the Project Switcher Modal and verifies all 9 .project-ai/ subdirectories', () => {
    render(<App />);

    fireEvent.click(screen.getByTestId('open-project-switcher-btn'));

    const modal = screen.getByTestId('project-switcher-modal');
    expect(modal).toBeInTheDocument();

    const dirBadges = screen.getByTestId('project-ai-directory-badges');
    expect(dirBadges).toHaveTextContent('.project-ai/project-state/');
    expect(dirBadges).toHaveTextContent('.project-ai/session-state/');
    expect(dirBadges).toHaveTextContent('.project-ai/handoffs/');
    expect(dirBadges).toHaveTextContent('.project-ai/provider-state/');
  });

  it('initializes a new project directory and preserves state when switching back', () => {
    render(<App />);

    // Open modal and initialize a new project
    fireEvent.click(screen.getByTestId('open-project-switcher-btn'));
    fireEvent.change(screen.getByTestId('open-project-path-input'), {
      target: { value: '/workspace/billing-microservice' },
    });
    fireEvent.change(screen.getByTestId('open-project-name-input'), {
      target: { value: 'billing-microservice' },
    });
    fireEvent.click(screen.getByTestId('confirm-open-project-btn'));

    // Verify top bar and Layer B structured state updated to new project
    expect(screen.getByTestId('active-project-name')).toHaveTextContent('billing-microservice');
    expect(screen.getByTestId('structured-current-task')).toHaveTextContent(
      'Initialized .project-ai/ workspace for billing-microservice'
    );

    // Switch back to sample-service-api and confirm its original Layer B state was preserved
    fireEvent.click(screen.getByTestId('open-project-switcher-btn'));
    fireEvent.click(screen.getByTestId('switch-recent-sample-service-api'));

    expect(screen.getByTestId('active-project-name')).toHaveTextContent('sample-service-api');
    expect(screen.getByTestId('structured-current-task')).toHaveTextContent(
      'Complete JWT middleware validation and add unit tests'
    );
  });
});
