import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { App } from '../App';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';

describe('Phase 3: File Explorer & Quick Search', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      fileTree: [
        {
          id: 'node_readme',
          name: 'README.md',
          path: 'README.md',
          absolutePath: '/workspace/sample-service-api/README.md',
          type: 'file',
          extension: 'md',
        },
        {
          id: 'node_src',
          name: 'src',
          path: 'src',
          absolutePath: '/workspace/sample-service-api/src',
          type: 'directory',
          children: [
            {
              id: 'node_src_auth',
              name: 'auth.ts',
              path: 'src/auth.ts',
              absolutePath: '/workspace/sample-service-api/src/auth.ts',
              type: 'file',
              extension: 'ts',
            },
          ],
        },
      ],
      quickSearchOpen: false,
    });
  });

  it('renders recursive file explorer tree and opens quick search modal on shortcut/click', () => {
    render(<App />);

    expect(screen.getByText('README.md')).toBeInTheDocument();
    expect(screen.getAllByText('auth.ts')[0]).toBeInTheDocument();

    // Open quick search modal
    fireEvent.click(screen.getByTitle('Quick File Search (Cmd/Ctrl+P)'));
    expect(screen.getByTestId('quick-search-modal')).toBeInTheDocument();
  });
});
