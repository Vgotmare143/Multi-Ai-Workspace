import { create } from 'zustand';
import {
  AIAccountProfile,
  AIProviderId,
  AIProviderMetadata,
  ApprovalMode,
  BottomPanelTab,
  CommandClassification,
  ConnectionMode,
  EditorTab,
  FileNode,
  HandoffRecord,
  PendingAIDiffProposal,
  PendingTerminalCommandProposal,
  ProjectAISnapshot,
  QuotaState,
  RecentProjectItem,
  StructuredSessionState,
  TerminalExecutionEntry,
} from '@multi-ai/shared-types';

export const INITIAL_PROVIDERS: Record<AIProviderId, AIProviderMetadata> = {
  claude: {
    id: 'claude',
    displayName: 'Claude',
    shortName: 'Claude',
    supportsMultipleAccounts: true,
    availableModels: [
      { id: 'claude-3-7-sonnet-latest', displayName: 'Claude 3.7 Sonnet', contextWindow: 200000 },
      { id: 'claude-3-5-haiku-latest', displayName: 'Claude 3.5 Haiku', contextWindow: 200000 },
    ],
  },
  openai: {
    id: 'openai',
    displayName: 'OpenAI / Codex',
    shortName: 'OpenAI',
    supportsMultipleAccounts: true,
    availableModels: [
      { id: 'gpt-4o', displayName: 'GPT-4o (Codex)', contextWindow: 128000 },
      { id: 'o3-mini', displayName: 'o3-mini (Reasoning)', contextWindow: 200000 },
    ],
  },
  gemini: {
    id: 'gemini',
    displayName: 'Google Gemini',
    shortName: 'Gemini',
    supportsMultipleAccounts: true,
    availableModels: [
      { id: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro', contextWindow: 1000000 },
      { id: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash (Free Tier Ready)', contextWindow: 1000000 },
    ],
  },
};

export const REQUIRED_PROJECT_AI_DIRS = [
  'project-state',
  'session-state',
  'conversation-history',
  'handoffs',
  'memory',
  'tasks',
  'provider-state',
  'usage',
  'logs',
];

const nowIso = () => new Date().toISOString();

export const INITIAL_ACCOUNTS: AIAccountProfile[] = [
  {
    id: 'claude-account-a',
    providerId: 'claude',
    label: 'Claude Account A',
    connectionMode: 'web_bridge',
    modelId: 'claude-3-7-sonnet-latest',
    priorityOrder: 1,
    isDefault: true,
    telemetry: {
      providerId: 'claude',
      accountId: 'claude-account-a',
      availability: 'available',
      quotaState: 'unknown',
      sessionInputTokens: 1420,
      sessionOutputTokens: 890,
      sessionRequestCount: 4,
      remainingRequests: null,
      remainingTokens: null,
      estimatedResetAt: null,
      lastUpdatedAt: nowIso(),
    },
  },
  {
    id: 'claude-account-b',
    providerId: 'claude',
    label: 'Claude Account B',
    connectionMode: 'web_bridge',
    modelId: 'claude-3-7-sonnet-latest',
    priorityOrder: 2,
    isDefault: false,
    telemetry: {
      providerId: 'claude',
      accountId: 'claude-account-b',
      availability: 'available',
      quotaState: 'unknown',
      sessionInputTokens: 0,
      sessionOutputTokens: 0,
      sessionRequestCount: 0,
      remainingRequests: null,
      remainingTokens: null,
      estimatedResetAt: null,
      lastUpdatedAt: nowIso(),
    },
  },
  {
    id: 'claude-account-c',
    providerId: 'claude',
    label: 'Claude Account C',
    connectionMode: 'mock',
    modelId: 'claude-3-7-sonnet-latest',
    priorityOrder: 3,
    isDefault: false,
    telemetry: {
      providerId: 'claude',
      accountId: 'claude-account-c',
      availability: 'available',
      quotaState: 'available',
      sessionInputTokens: 0,
      sessionOutputTokens: 0,
      sessionRequestCount: 0,
      remainingRequests: 50,
      remainingTokens: 100000,
      estimatedResetAt: null,
      lastUpdatedAt: nowIso(),
    },
  },
  {
    id: 'openai-default',
    providerId: 'openai',
    label: 'OpenAI Primary (Free/Bridge)',
    connectionMode: 'web_bridge',
    modelId: 'gpt-4o',
    priorityOrder: 1,
    isDefault: true,
    telemetry: {
      providerId: 'openai',
      accountId: 'openai-default',
      availability: 'available',
      quotaState: 'unknown',
      sessionInputTokens: 0,
      sessionOutputTokens: 0,
      sessionRequestCount: 0,
      remainingRequests: null,
      remainingTokens: null,
      estimatedResetAt: null,
      lastUpdatedAt: nowIso(),
    },
  },
  {
    id: 'gemini-default',
    providerId: 'gemini',
    label: 'Gemini Free Tier / Studio',
    connectionMode: 'api_key',
    modelId: 'gemini-2.5-flash',
    priorityOrder: 1,
    isDefault: true,
    telemetry: {
      providerId: 'gemini',
      accountId: 'gemini-default',
      availability: 'available',
      quotaState: 'unknown',
      sessionInputTokens: 0,
      sessionOutputTokens: 0,
      sessionRequestCount: 0,
      remainingRequests: null,
      remainingTokens: null,
      estimatedResetAt: null,
      lastUpdatedAt: nowIso(),
    },
  },
];

export const INITIAL_FILE_CONTENTS: Record<string, string> = {
  'src/middleware/auth.ts': [
    "import { verifyTokenSignature } from '../utils/token';",
    '',
    'export interface AuthRequest {',
    '  headers: { authorization?: string };',
    '  user?: { id: string; role: string };',
    '}',
    '',
    'export async function verifySessionToken(req: AuthRequest): Promise<boolean> {',
    '  const authHeader = req.headers.authorization;',
    '  if (!authHeader) {',
    '    return false;',
    '  }',
    '  // TODO: Validate Bearer prefix and handle expired token errors cleanly',
    '  const token = authHeader.replace("Bearer ", "");',
    '  return verifyTokenSignature(token);',
    '}',
    '',
  ].join('\n'),
  'src/utils/token.ts': [
    'export function verifyTokenSignature(rawToken: string): boolean {',
    '  if (!rawToken || rawToken.trim().length < 10) {',
    '    return false;',
    '  }',
    '  return !rawToken.startsWith("expired_");',
    '}',
    '',
  ].join('\n'),
  'tests/auth.spec.ts': [
    "import { describe, it, expect } from 'vitest';",
    "import { verifySessionToken } from '../src/middleware/auth';",
    '',
    "describe('verifySessionToken', () => {",
    "  it('rejects missing authorization header', async () => {",
    '    const valid = await verifySessionToken({ headers: {} });',
    '    expect(valid).toBe(false);',
    '  });',
    '});',
    '',
  ].join('\n'),
  'README.md': '# sample-service-api\n\nManaged by Multi-AI Development Workspace.\n',
};

export const INITIAL_FILE_TREE: FileNode[] = [
  {
    id: 'node_src',
    name: 'src',
    path: 'src',
    absolutePath: '/workspace/sample-service-api/src',
    type: 'directory',
    isExpanded: true,
    children: [
      {
        id: 'node_src_middleware',
        name: 'middleware',
        path: 'src/middleware',
        absolutePath: '/workspace/sample-service-api/src/middleware',
        type: 'directory',
        isExpanded: true,
        children: [
          {
            id: 'node_src_middleware_auth_ts',
            name: 'auth.ts',
            path: 'src/middleware/auth.ts',
            absolutePath: '/workspace/sample-service-api/src/middleware/auth.ts',
            type: 'file',
            extension: 'ts',
          },
        ],
      },
      {
        id: 'node_src_utils',
        name: 'utils',
        path: 'src/utils',
        absolutePath: '/workspace/sample-service-api/src/utils',
        type: 'directory',
        isExpanded: true,
        children: [
          {
            id: 'node_src_utils_token_ts',
            name: 'token.ts',
            path: 'src/utils/token.ts',
            absolutePath: '/workspace/sample-service-api/src/utils/token.ts',
            type: 'file',
            extension: 'ts',
          },
        ],
      },
    ],
  },
  {
    id: 'node_tests',
    name: 'tests',
    path: 'tests',
    absolutePath: '/workspace/sample-service-api/tests',
    type: 'directory',
    isExpanded: true,
    children: [
      {
        id: 'node_tests_auth_spec_ts',
        name: 'auth.spec.ts',
        path: 'tests/auth.spec.ts',
        absolutePath: '/workspace/sample-service-api/tests/auth.spec.ts',
        type: 'file',
        extension: 'ts',
      },
    ],
  },
  {
    id: 'node_readme_md',
    name: 'README.md',
    path: 'README.md',
    absolutePath: '/workspace/sample-service-api/README.md',
    type: 'file',
    extension: 'md',
  },
];

export function detectLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    json: 'json',
    md: 'markdown',
    css: 'css',
    html: 'html',
    yml: 'yaml',
    yaml: 'yaml',
    sh: 'shell',
    sql: 'sql',
  };
  return map[ext] ?? 'plaintext';
}

export function classifyTerminalCommandClient(command: string): CommandClassification {
  const cleaned = command.trim();
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const lower = cleaned.toLowerCase();

  const destructivePatterns: Array<[RegExp, string]> = [
    [/\brm\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r|--recursive)\b/i, 'Recursive or forced file deletion (rm -rf)'],
    [/\brm\s+/i, 'File deletion command (rm)'],
    [/\bgit\s+reset\s+--hard\b/i, 'Destructive Git working tree reset (git reset --hard)'],
    [/\bgit\s+clean\s+-[a-z]*f/i, 'Destructive removal of untracked Git files'],
    [/\b(dropdb|drop\s+table|drop\s+database|truncate\s+table)\b/i, 'Destructive database drop/truncate operation'],
    [/\bchmod\s+777\b/i, 'Insecure world-writable permission change (chmod 777)'],
    [/\b(curl|wget)\b.*\|\s*(sh|bash|zsh|pwsh|powershell)\b/i, 'Piping remote script directly into shell'],
    [/\b(sudo|su)\b/i, 'Privilege escalation command (sudo/su)'],
  ];

  for (const [regex, reason] of destructivePatterns) {
    if (regex.test(lower)) {
      return {
        command: cleaned,
        riskLevel: 'destructive',
        requiresConfirmation: true,
        reason,
        detectedTokens: tokens.slice(0, 6),
      };
    }
  }

  const mutatingPatterns: Array<[RegExp, string]> = [
    [/\b(npm|yarn|pnpm|bun)\s+(install|i|add|remove|uninstall|update)\b/i, 'Package dependency modification'],
    [/\b(pip|pip3|poetry|uv)\s+(install|uninstall|add|remove)\b/i, 'Python environment dependency modification'],
    [/\b(alembic|prisma|knex|flyway)\s+(upgrade|downgrade|migrate)\b/i, 'Database schema migration'],
    [/\bgit\s+(commit|checkout|switch|merge|rebase|stash)\b/i, 'Git repository state mutation'],
    [/\b(mv|cp|mkdir|touch)\b/i, 'Filesystem modification'],
  ];

  for (const [regex, reason] of mutatingPatterns) {
    if (regex.test(lower)) {
      return {
        command: cleaned,
        riskLevel: 'state_mutating',
        requiresConfirmation: true,
        reason,
        detectedTokens: tokens.slice(0, 6),
      };
    }
  }

  const safeReadOnlyBinaries = new Set([
    'ls',
    'dir',
    'pwd',
    'echo',
    'cat',
    'head',
    'tail',
    'grep',
    'rg',
    'pytest',
    'vitest',
    'jest',
    'tsc',
    'ruff',
    'eslint',
  ]);

  if (
    tokens.length >= 2 &&
    tokens[0] === 'git' &&
    ['status', 'diff', 'log', 'branch', 'show'].includes(tokens[1])
  ) {
    return {
      command: cleaned,
      riskLevel: 'safe_read_only',
      requiresConfirmation: false,
      reason: `Safe read-only Git inspection (git ${tokens[1]})`,
      detectedTokens: tokens.slice(0, 4),
    };
  }

  if (
    tokens.length >= 2 &&
    ['npm', 'pnpm', 'yarn'].includes(tokens[0]) &&
    ['test', 'run'].includes(tokens[1])
  ) {
    return {
      command: cleaned,
      riskLevel: 'safe_read_only',
      requiresConfirmation: false,
      reason: 'Safe test or verification script execution',
      detectedTokens: tokens.slice(0, 4),
    };
  }

  if (tokens.length > 0 && safeReadOnlyBinaries.has(tokens[0])) {
    return {
      command: cleaned,
      riskLevel: 'safe_read_only',
      requiresConfirmation: false,
      reason: `Read-only diagnostic/test command (${tokens[0]})`,
      detectedTokens: tokens.slice(0, 4),
    };
  }

  return {
    command: cleaned,
    riskLevel: 'state_mutating',
    requiresConfirmation: true,
    reason: 'Unrecognized command; requires confirmation before execution',
    detectedTokens: tokens.slice(0, 6),
  };
}

const DEFAULT_STRUCTURED_STATE: StructuredSessionState = {
  currentGoal: 'Build resilient API authentication and session continuity layer',
  currentTask: 'Complete JWT middleware validation and add unit tests',
  completedWork: [
    'Initialized project workspace structure',
    'Created token parser utility in src/utils/token.ts',
  ],
  pendingWork: [
    'Write unit tests for expired token handling',
    'Wire middleware into primary router',
  ],
  importantDecisions: [
    'Project state is stored in .project-ai/ independent of any external AI provider',
    'All AI file modifications require diff inspection before write',
  ],
  errorsEncountered: ['Missing null check on Authorization header split'],
  errorsResolved: ['Added strict header format guard in src/utils/token.ts'],
  relevantFiles: ['src/middleware/auth.ts', 'src/utils/token.ts', 'tests/auth.spec.ts'],
  filesModified: ['src/utils/token.ts'],
  commandsExecuted: ['npm test -- tests/auth.spec.ts'],
  testResults: ['4 passed, 1 todo'],
  currentImplementationState: 'Middleware drafted; awaiting test suite completion.',
  nextRecommendedAction: 'Implement expired-token test cases in tests/auth.spec.ts',
};

function createSnapshotForProject(
  projectName: string,
  rootPath: string,
  gitBranch: string,
  structuredState: StructuredSessionState,
  activeProviderId: AIProviderId,
  activeAccount: AIAccountProfile,
  handoffFiles: string[] = []
): ProjectAISnapshot {
  const now = nowIso();
  const projectId = `proj_${projectName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  return {
    config: {
      schemaVersion: '1.0.0',
      projectId,
      projectName,
      rootPath,
      ignoredPaths: ['.env', '.env.*', '*.pem', '*.key', 'node_modules', '.git'],
      autoFallbackEnabled: true,
      approvalMode: 'ask_every_time',
      createdAt: now,
      updatedAt: now,
    },
    projectState: {
      projectId,
      projectName,
      rootPath,
      detectedLanguages: ['TypeScript', 'Python'],
      gitBranch,
      architectureSummary: 'Local-first project managed by .project-ai/ state engine',
      entrypoints: structuredState.relevantFiles,
      lastIndexedAt: now,
    },
    sessionState: structuredState,
    providerSelection: {
      activeProviderId,
      activeAccountId: activeAccount.id,
      activeAccountLabel: activeAccount.label,
      connectionMode: activeAccount.connectionMode,
      modelId: activeAccount.modelId,
      updatedAt: now,
    },
    handoffFiles,
    projectAiDirectories: REQUIRED_PROJECT_AI_DIRS,
  };
}

function buildMarkdownHandoff(
  seq: number,
  fromProvider: AIProviderId,
  fromAccountLabel: string,
  toProvider: AIProviderId,
  toAccountLabel: string,
  state: StructuredSessionState
): string {
  return [
    `---`,
    `session_sequence: ${seq}`,
    `source_provider: "${fromProvider}"`,
    `source_account: "${fromAccountLabel}"`,
    `target_provider: "${toProvider}"`,
    `target_account: "${toAccountLabel}"`,
    `created_at: "${new Date().toISOString()}"`,
    `---`,
    ``,
    `# Conversation History`,
    ``,
    `## User`,
    `Implement the authentication middleware and add unit tests for token validation.`,
    ``,
    `## ${INITIAL_PROVIDERS[fromProvider].shortName} (${fromAccountLabel})`,
    `I have inspected \`src/middleware/auth.ts\` and structured the JWT verification guard. Ready to proceed with the edge-case unit tests.`,
    ``,
    `# Project Context`,
    `Goal: ${state.currentGoal}`,
    `Relevant Files: ${state.relevantFiles.join(', ')}`,
    ``,
    `# Current Task`,
    `${state.currentTask}`,
    ``,
    `# Files Modified`,
    ...state.filesModified.map((f) => `- \`${f}\``),
    ``,
    `# Current State`,
    `${state.currentImplementationState}`,
    ``,
    `# Pending Work`,
    ...state.pendingWork.map((w) => `- [ ] ${w}`),
    ``,
    `# Next Action`,
    `${state.nextRecommendedAction}`,
  ].join('\n');
}

const initialSnapshot = createSnapshotForProject(
  'sample-service-api',
  '/workspace/sample-service-api',
  'main',
  DEFAULT_STRUCTURED_STATE,
  'claude',
  INITIAL_ACCOUNTS[0]
);

export interface WorkspaceStoreState {
  // Phase 1 & 2: Project & Workspace State
  projectName: string;
  projectRootPath: string;
  gitBranch: string;
  uncommittedChangesCount: number;
  projectSnapshots: Record<string, ProjectAISnapshot>;
  recentProjects: RecentProjectItem[];
  projectModalOpen: boolean;

  // Layout Visibility & Active Panels
  leftSidebarOpen: boolean;
  rightAIPanelOpen: boolean;
  bottomPanelOpen: boolean;
  activeBottomTab: BottomPanelTab;

  // Phase 3: File Explorer & Quick Search
  fileTree: FileNode[];
  quickSearchOpen: boolean;

  // Phase 4: Monaco Editor, Multi-Tab Buffers, Diff Viewer & Command Palette
  openTabs: EditorTab[];
  activeFilePath: string;
  fileContents: Record<string, string>;
  pendingDiffProposal: PendingAIDiffProposal | null;
  commandPaletteOpen: boolean;

  // Phase 5: Integrated Terminal & Command Guard State
  terminalHistory: TerminalExecutionEntry[];
  pendingCommandProposal: PendingTerminalCommandProposal | null;

  // AI Provider & Account State
  providers: Record<AIProviderId, AIProviderMetadata>;
  accounts: AIAccountProfile[];
  activeProviderId: AIProviderId;
  activeAccountId: string;
  autoFallbackEnabled: boolean;
  approvalMode: ApprovalMode;

  // Layer B Structured Project/Session State
  structuredState: StructuredSessionState;
  handoffHistory: HandoffRecord[];
  latestHandoffMarkdown: string | null;

  // Phase 1 & 2 Actions
  openProjectWorkspace: (
    rootPath: string,
    projectName?: string,
    gitBranch?: string
  ) => ProjectAISnapshot;
  updateStructuredSessionState: (patch: Partial<StructuredSessionState>) => void;
  setProjectModalOpen: (open: boolean) => void;
  switchProvider: (
    targetProviderId: AIProviderId,
    reason?: HandoffRecord['reason']
  ) => HandoffRecord;
  switchAccount: (
    targetAccountId: string,
    reason?: HandoffRecord['reason']
  ) => HandoffRecord;
  addClaudeAccount: (label: string, connectionMode: ConnectionMode) => AIAccountProfile;
  setAccountConnectionMode: (accountId: string, mode: ConnectionMode) => void;
  simulateQuotaState: (accountId: string, quotaState: QuotaState, resetTime?: string) => void;
  setActiveBottomTab: (tab: BottomPanelTab) => void;
  toggleLeftSidebar: () => void;
  toggleRightAIPanel: () => void;
  toggleBottomPanel: () => void;
  setAutoFallbackEnabled: (enabled: boolean) => void;
  setApprovalMode: (mode: ApprovalMode) => void;

  // Phase 3 Actions
  openFile: (path: string) => void;
  createFileOrFolder: (path: string, isDirectory: boolean) => void;
  deleteFileNode: (path: string) => void;
  setQuickSearchOpen: (open: boolean) => void;

  // Phase 4 Actions
  closeTab: (path: string) => void;
  updateTabContent: (path: string, newContent: string) => void;
  saveTab: (path: string) => void;
  proposeAIDiff: (filePath: string, proposedContent: string, summary: string) => void;
  approveAIDiff: () => void;
  rejectAIDiff: () => void;
  setCommandPaletteOpen: (open: boolean) => void;

  // Phase 5 Actions
  classifyTerminalCommand: (command: string) => CommandClassification;
  runOrProposeTerminalCommand: (command: string, source?: 'user' | 'ai') => void;
  proposeAICommand: (command: string) => PendingTerminalCommandProposal;
  approvePendingCommand: () => TerminalExecutionEntry | null;
  rejectPendingCommand: () => void;
  clearTerminalHistory: () => void;
}

export const useWorkspaceStore = create<WorkspaceStoreState>((set, get) => ({
  projectName: 'sample-service-api',
  projectRootPath: '/workspace/sample-service-api',
  gitBranch: 'main',
  uncommittedChangesCount: 2,

  projectSnapshots: {
    '/workspace/sample-service-api': initialSnapshot,
  },
  recentProjects: [
    {
      projectId: initialSnapshot.config.projectId,
      projectName: 'sample-service-api',
      rootPath: '/workspace/sample-service-api',
      gitBranch: 'main',
      lastOpenedAt: nowIso(),
      activeProviderId: 'claude',
      activeAccountLabel: 'Claude Account A',
    },
    {
      projectId: 'proj_ecommerce_checkout',
      projectName: 'ecommerce-checkout-worker',
      rootPath: '/workspace/ecommerce-checkout-worker',
      gitBranch: 'feat/stripe-webhooks',
      lastOpenedAt: nowIso(),
      activeProviderId: 'openai',
      activeAccountLabel: 'OpenAI Primary (Free/Bridge)',
    },
  ],
  projectModalOpen: false,

  leftSidebarOpen: true,
  rightAIPanelOpen: true,
  bottomPanelOpen: true,
  activeBottomTab: 'terminal',

  fileTree: INITIAL_FILE_TREE,
  quickSearchOpen: false,

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
    {
      path: 'src/utils/token.ts',
      name: 'token.ts',
      language: 'typescript',
      content: INITIAL_FILE_CONTENTS['src/utils/token.ts'],
      savedContent: INITIAL_FILE_CONTENTS['src/utils/token.ts'],
      isDirty: false,
      cursorLine: 1,
      cursorColumn: 1,
    },
  ],
  activeFilePath: 'src/middleware/auth.ts',
  fileContents: { ...INITIAL_FILE_CONTENTS },
  pendingDiffProposal: null,
  commandPaletteOpen: false,

  terminalHistory: [
    {
      id: 'term_init_1',
      command: 'npm test -- tests/auth.spec.ts',
      output: 'PASS tests/auth.spec.ts (4 passed, 1 todo)',
      exitCode: 0,
      riskLevel: 'safe_read_only',
      executedBy: 'user',
      timestamp: nowIso(),
    },
  ],
  pendingCommandProposal: null,

  providers: INITIAL_PROVIDERS,
  accounts: INITIAL_ACCOUNTS,
  activeProviderId: 'claude',
  activeAccountId: 'claude-account-a',
  autoFallbackEnabled: true,
  approvalMode: 'ask_every_time',

  structuredState: DEFAULT_STRUCTURED_STATE,
  handoffHistory: [],
  latestHandoffMarkdown: null,

  openProjectWorkspace: (rootPath, customName, gitBranch = 'main') => {
    const state = get();
    const cleanPath = rootPath.trim().replace(/\/+$/, '') || '/workspace/untitled-project';
    const inferredName =
      customName?.trim() ||
      cleanPath.split('/').filter(Boolean).pop() ||
      'untitled-project';

    const currentAccount =
      state.accounts.find((a) => a.id === state.activeAccountId) ?? state.accounts[0];
    const updatedCurrentSnapshot = createSnapshotForProject(
      state.projectName,
      state.projectRootPath,
      state.gitBranch,
      state.structuredState,
      state.activeProviderId,
      currentAccount,
      state.handoffHistory.map((h) => h.filename)
    );

    const existingSnapshot = state.projectSnapshots[cleanPath];
    const nextStructuredState: StructuredSessionState = existingSnapshot
      ? existingSnapshot.sessionState
      : {
          currentGoal: `Develop and maintain ${inferredName}`,
          currentTask: `Initialized .project-ai/ workspace for ${inferredName}`,
          completedWork: [`Created .project-ai/ state directories in ${cleanPath}`],
          pendingWork: ['Analyze project entrypoints and pending tasks'],
          importantDecisions: [
            'Project state is stored in .project-ai/ independent of any external AI provider',
          ],
          errorsEncountered: [],
          errorsResolved: [],
          relevantFiles: ['src/index.ts', 'package.json', 'README.md'],
          filesModified: [],
          commandsExecuted: ['git status'],
          testResults: ['No test runs recorded yet'],
          currentImplementationState: 'Workspace initialized and ready for AI assistance.',
          nextRecommendedAction: `Inspect src/index.ts in ${inferredName}`,
        };

    const targetSnapshot =
      existingSnapshot ??
      createSnapshotForProject(
        inferredName,
        cleanPath,
        gitBranch,
        nextStructuredState,
        state.activeProviderId,
        currentAccount,
        []
      );

    const updatedRecent: RecentProjectItem[] = [
      {
        projectId: targetSnapshot.config.projectId,
        projectName: targetSnapshot.config.projectName,
        rootPath: cleanPath,
        gitBranch: targetSnapshot.projectState.gitBranch,
        lastOpenedAt: nowIso(),
        activeProviderId: state.activeProviderId,
        activeAccountLabel: currentAccount.label,
      },
      ...state.recentProjects.filter((p) => p.rootPath !== cleanPath),
    ];

    set({
      projectName: targetSnapshot.config.projectName,
      projectRootPath: cleanPath,
      gitBranch: targetSnapshot.projectState.gitBranch,
      structuredState: targetSnapshot.sessionState,
      projectSnapshots: {
        ...state.projectSnapshots,
        [state.projectRootPath]: updatedCurrentSnapshot,
        [cleanPath]: targetSnapshot,
      },
      recentProjects: updatedRecent,
      projectModalOpen: false,
    });

    return targetSnapshot;
  },

  updateStructuredSessionState: (patch) => {
    set((state) => {
      const merged = { ...state.structuredState, ...patch };
      const currentSnap = state.projectSnapshots[state.projectRootPath];
      return {
        structuredState: merged,
        projectSnapshots: currentSnap
          ? {
              ...state.projectSnapshots,
              [state.projectRootPath]: {
                ...currentSnap,
                sessionState: merged,
              },
            }
          : state.projectSnapshots,
      };
    });
  },

  setProjectModalOpen: (open) => set({ projectModalOpen: open }),

  switchAccount: (targetAccountId, reason = 'manual_switch') => {
    const state = get();
    const currentAccount =
      state.accounts.find((a) => a.id === state.activeAccountId) ?? state.accounts[0];
    const targetAccount =
      state.accounts.find((a) => a.id === targetAccountId) ?? state.accounts[0];

    const seq = state.handoffHistory.length + 1;
    const filename = `claude-session-${String(seq).padStart(3, '0')}.md`;
    const markdownContent = buildMarkdownHandoff(
      seq,
      currentAccount.providerId,
      currentAccount.label,
      targetAccount.providerId,
      targetAccount.label,
      state.structuredState
    );

    const record: HandoffRecord = {
      id: `handoff-${seq}`,
      sequenceNumber: seq,
      filename,
      fromProvider: currentAccount.providerId,
      fromAccountLabel: currentAccount.label,
      toProvider: targetAccount.providerId,
      toAccountLabel: targetAccount.label,
      reason,
      createdAt: new Date().toISOString(),
      markdownContent,
    };

    const nextHistory = [record, ...state.handoffHistory];
    const currentSnap = state.projectSnapshots[state.projectRootPath];

    set({
      activeProviderId: targetAccount.providerId,
      activeAccountId: targetAccount.id,
      handoffHistory: nextHistory,
      latestHandoffMarkdown: markdownContent,
      projectSnapshots: currentSnap
        ? {
            ...state.projectSnapshots,
            [state.projectRootPath]: {
              ...currentSnap,
              handoffFiles: nextHistory.map((h) => h.filename),
              providerSelection: {
                activeProviderId: targetAccount.providerId,
                activeAccountId: targetAccount.id,
                activeAccountLabel: targetAccount.label,
                connectionMode: targetAccount.connectionMode,
                modelId: targetAccount.modelId,
                updatedAt: nowIso(),
              },
            },
          }
        : state.projectSnapshots,
    });

    return record;
  },

  switchProvider: (targetProviderId, reason = 'manual_switch') => {
    const state = get();
    const targetAccounts = state.accounts
      .filter((a) => a.providerId === targetProviderId)
      .sort((a, b) => a.priorityOrder - b.priorityOrder);

    const preferredAccount =
      targetAccounts.find((a) => a.telemetry.quotaState !== 'limit_reached') ??
      targetAccounts[0];

    return get().switchAccount(preferredAccount.id, reason);
  },

  addClaudeAccount: (label, connectionMode) => {
    const state = get();
    const claudeAccounts = state.accounts.filter((a) => a.providerId === 'claude');
    const newId = `claude-account-${Date.now()}`;
    const newAccount: AIAccountProfile = {
      id: newId,
      providerId: 'claude',
      label: label.trim() || `Claude Account ${claudeAccounts.length + 1}`,
      connectionMode,
      modelId: 'claude-3-7-sonnet-latest',
      priorityOrder: claudeAccounts.length + 1,
      isDefault: false,
      telemetry: {
        providerId: 'claude',
        accountId: newId,
        availability: 'available',
        quotaState: connectionMode === 'mock' ? 'available' : 'unknown',
        sessionInputTokens: 0,
        sessionOutputTokens: 0,
        sessionRequestCount: 0,
        remainingRequests: connectionMode === 'mock' ? 50 : null,
        remainingTokens: connectionMode === 'mock' ? 100000 : null,
        estimatedResetAt: null,
        lastUpdatedAt: new Date().toISOString(),
      },
    };

    set({ accounts: [...state.accounts, newAccount] });
    return newAccount;
  },

  setAccountConnectionMode: (accountId, mode) => {
    set((state) => ({
      accounts: state.accounts.map((acc) =>
        acc.id === accountId
          ? {
              ...acc,
              connectionMode: mode,
              telemetry: {
                ...acc.telemetry,
                quotaState: mode === 'mock' ? 'available' : 'unknown',
              },
            }
          : acc
      ),
    }));
  },

  simulateQuotaState: (accountId, quotaState, resetTime = '4:00 PM') => {
    set((state) => ({
      accounts: state.accounts.map((acc) =>
        acc.id === accountId
          ? {
              ...acc,
              telemetry: {
                ...acc.telemetry,
                availability: quotaState === 'limit_reached' ? 'limited' : 'available',
                quotaState,
                estimatedResetAt: quotaState === 'limit_reached' ? resetTime : null,
                lastUpdatedAt: new Date().toISOString(),
              },
            }
          : acc
      ),
    }));
  },

  setActiveBottomTab: (tab) => set({ activeBottomTab: tab, bottomPanelOpen: true }),
  toggleLeftSidebar: () => set((s) => ({ leftSidebarOpen: !s.leftSidebarOpen })),
  toggleRightAIPanel: () => set((s) => ({ rightAIPanelOpen: !s.rightAIPanelOpen })),
  toggleBottomPanel: () => set((s) => ({ bottomPanelOpen: !s.bottomPanelOpen })),
  setAutoFallbackEnabled: (enabled) => set({ autoFallbackEnabled: enabled }),
  setApprovalMode: (mode) => set({ approvalMode: mode }),

  // Phase 3 Actions
  openFile: (path) => {
    const state = get();
    const existingTab = state.openTabs.find((t) => t.path === path);
    if (existingTab) {
      set({ activeFilePath: path });
      return;
    }
    const name = path.split('/').pop() ?? path;
    const content = state.fileContents[path] ?? `// ${path}\n`;
    const newTab: EditorTab = {
      path,
      name,
      language: detectLanguageFromPath(path),
      content,
      savedContent: content,
      isDirty: false,
      cursorLine: 1,
      cursorColumn: 1,
    };
    set({
      openTabs: [...state.openTabs, newTab],
      activeFilePath: path,
    });
  },

  createFileOrFolder: (path, isDirectory) => {
    const state = get();
    const clean = path.replace(/^\/+/, '');
    const name = clean.split('/').pop() ?? clean;
    const newNode: FileNode = {
      id: `node_${clean.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`,
      name,
      path: clean,
      absolutePath: `${state.projectRootPath}/${clean}`,
      type: isDirectory ? 'directory' : 'file',
      extension: isDirectory ? undefined : name.split('.').pop(),
      children: isDirectory ? [] : undefined,
      isExpanded: true,
    };

    const nextContents = isDirectory
      ? state.fileContents
      : { ...state.fileContents, [clean]: `// ${clean}\n` };

    set({
      fileTree: [...state.fileTree, newNode],
      fileContents: nextContents,
    });

    if (!isDirectory) {
      get().openFile(clean);
    }
  },

  deleteFileNode: (path) => {
    const removeRecursive = (nodes: FileNode[]): FileNode[] =>
      nodes
        .filter((n) => n.path !== path)
        .map((n) => (n.children ? { ...n, children: removeRecursive(n.children) } : n));

    set((state) => ({
      fileTree: removeRecursive(state.fileTree),
      openTabs: state.openTabs.filter((t) => t.path !== path),
    }));
  },

  setQuickSearchOpen: (open) => set({ quickSearchOpen: open }),

  // Phase 4 Actions
  closeTab: (path) => {
    const state = get();
    const nextTabs = state.openTabs.filter((t) => t.path !== path);
    let nextActive = state.activeFilePath;
    if (state.activeFilePath === path) {
      nextActive = nextTabs.length > 0 ? nextTabs[nextTabs.length - 1].path : '';
    }
    set({ openTabs: nextTabs, activeFilePath: nextActive });
  },

  updateTabContent: (path, newContent) => {
    set((state) => ({
      openTabs: state.openTabs.map((tab) =>
        tab.path === path
          ? {
              ...tab,
              content: newContent,
              isDirty: newContent !== tab.savedContent,
            }
          : tab
      ),
    }));
  },

  saveTab: (path) => {
    const state = get();
    const target = state.openTabs.find((t) => t.path === path);
    if (!target) return;

    const updatedModified = state.structuredState.filesModified.includes(path)
      ? state.structuredState.filesModified
      : [...state.structuredState.filesModified, path];

    set({
      fileContents: {
        ...state.fileContents,
        [path]: target.content,
      },
      openTabs: state.openTabs.map((tab) =>
        tab.path === path
          ? { ...tab, savedContent: tab.content, isDirty: false }
          : tab
      ),
      structuredState: {
        ...state.structuredState,
        filesModified: updatedModified,
      },
    });
  },

  proposeAIDiff: (filePath, proposedContent, summary) => {
    const state = get();
    const activeAccount =
      state.accounts.find((a) => a.id === state.activeAccountId) ?? state.accounts[0];
    const activeTab = state.openTabs.find((t) => t.path === filePath);
    const originalContent =
      activeTab?.content ?? state.fileContents[filePath] ?? '';

    const proposal: PendingAIDiffProposal = {
      id: `diff_${Date.now()}`,
      filePath,
      providerId: state.activeProviderId,
      accountLabel: activeAccount.label,
      summary,
      originalContent,
      proposedContent,
      isDestructive:
        filePath.includes('.env') ||
        filePath.includes('migration') ||
        proposedContent.trim().length === 0,
      createdAt: new Date().toISOString(),
    };

    set({ pendingDiffProposal: proposal });
  },

  approveAIDiff: () => {
    const state = get();
    const proposal = state.pendingDiffProposal;
    if (!proposal) return;

    get().openFile(proposal.filePath);
    get().updateTabContent(proposal.filePath, proposal.proposedContent);
    get().saveTab(proposal.filePath);

    set((s) => ({
      pendingDiffProposal: null,
      structuredState: {
        ...s.structuredState,
        completedWork: [
          ...s.structuredState.completedWork,
          `Applied AI diff (${proposal.accountLabel}): ${proposal.summary}`,
        ],
      },
    }));
  },

  rejectAIDiff: () => set({ pendingDiffProposal: null }),

  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  // Phase 5 Actions: Integrated Terminal & Command Guard
  classifyTerminalCommand: (command) => classifyTerminalCommandClient(command),

  runOrProposeTerminalCommand: (command, source = 'user') => {
    const cleaned = command.trim();
    if (!cleaned) return;

    const state = get();
    const activeAccount =
      state.accounts.find((a) => a.id === state.activeAccountId) ?? state.accounts[0];
    const classification = classifyTerminalCommandClient(cleaned);

    // If command is destructive or state-mutating (or proposed by AI under ask_every_time), require confirmation
    if (
      classification.requiresConfirmation ||
      (source === 'ai' && state.approvalMode === 'ask_every_time')
    ) {
      const proposal: PendingTerminalCommandProposal = {
        id: `cmd_prop_${Date.now()}`,
        command: cleaned,
        source,
        providerId: state.activeProviderId,
        accountLabel: activeAccount.label,
        classification,
        createdAt: nowIso(),
      };
      set({
        pendingCommandProposal: proposal,
        activeBottomTab: 'terminal',
        bottomPanelOpen: true,
      });
      return;
    }

    // Safe read-only command executes immediately and updates Layer B state
    const output = simulateCommandOutput(cleaned, state.projectName, state.gitBranch);
    const entry: TerminalExecutionEntry = {
      id: `term_${Date.now()}`,
      command: cleaned,
      output,
      exitCode: 0,
      riskLevel: classification.riskLevel,
      executedBy: 'user',
      timestamp: nowIso(),
    };

    const isTestCmd =
      cleaned.includes('test') || cleaned.includes('pytest') || cleaned.includes('vitest');

    set({
      terminalHistory: [...state.terminalHistory, entry],
      structuredState: {
        ...state.structuredState,
        commandsExecuted: [...state.structuredState.commandsExecuted, cleaned],
        testResults: isTestCmd
          ? [...state.structuredState.testResults, output]
          : state.structuredState.testResults,
      },
    });
  },

  proposeAICommand: (command) => {
    const state = get();
    const activeAccount =
      state.accounts.find((a) => a.id === state.activeAccountId) ?? state.accounts[0];
    const classification = classifyTerminalCommandClient(command);
    const proposal: PendingTerminalCommandProposal = {
      id: `cmd_prop_${Date.now()}`,
      command: command.trim(),
      source: 'ai',
      providerId: state.activeProviderId,
      accountLabel: activeAccount.label,
      classification,
      createdAt: nowIso(),
    };
    set({
      pendingCommandProposal: proposal,
      activeBottomTab: 'terminal',
      bottomPanelOpen: true,
    });
    return proposal;
  },

  approvePendingCommand: () => {
    const state = get();
    const proposal = state.pendingCommandProposal;
    if (!proposal) return null;

    const output = simulateCommandOutput(
      proposal.command,
      state.projectName,
      state.gitBranch
    );
    const entry: TerminalExecutionEntry = {
      id: `term_${Date.now()}`,
      command: proposal.command,
      output,
      exitCode: 0,
      riskLevel: proposal.classification.riskLevel,
      executedBy: 'ai_approved',
      timestamp: nowIso(),
    };

    set({
      pendingCommandProposal: null,
      terminalHistory: [...state.terminalHistory, entry],
      structuredState: {
        ...state.structuredState,
        commandsExecuted: [...state.structuredState.commandsExecuted, proposal.command],
      },
    });

    return entry;
  },

  rejectPendingCommand: () => set({ pendingCommandProposal: null }),

  clearTerminalHistory: () => set({ terminalHistory: [] }),
}));

function simulateCommandOutput(
  command: string,
  projectName: string,
  gitBranch: string
): string {
  const lower = command.toLowerCase();
  if (lower === 'pwd') return `/workspace/${projectName}`;
  if (lower.startsWith('git status')) {
    return `On branch ${gitBranch}\nChanges not staged for commit:\n  modified: src/utils/token.ts`;
  }
  if (lower.includes('test') || lower.includes('vitest') || lower.includes('pytest')) {
    return 'PASS tests/auth.spec.ts (5 passed, 0 failed in 142ms)';
  }
  if (lower === 'ls' || lower === 'dir') {
    return '.project-ai/  src/  tests/  package.json  README.md';
  }
  return `[Executed in /workspace/${projectName}]: ${command} (exit code 0)`;
}
