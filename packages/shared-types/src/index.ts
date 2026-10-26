export type AIProviderId = 'claude' | 'openai' | 'gemini';

/**
 * Supports $0 operation out of the box:
 * - 'mock': Built-in offline deterministic simulator
 * - 'web_bridge': 1-click prompt/handoff packet for free web accounts (claude.ai, chatgpt.com, gemini.google.com)
 * - 'api_key': Official cloud SDK (free tier Gemini API or paid API keys)
 * - 'local_ollama': Local Ollama open-source coding models
 */
export type ConnectionMode = 'mock' | 'web_bridge' | 'api_key' | 'local_ollama';

export type ProviderAvailability = 'available' | 'degraded' | 'limited' | 'unavailable' | 'unknown';

export type QuotaState = 'available' | 'approaching_limit' | 'limit_reached' | 'unknown';

export interface UsageTelemetry {
  providerId: AIProviderId;
  accountId: string;
  availability: ProviderAvailability;
  quotaState: QuotaState;
  sessionInputTokens: number;
  sessionOutputTokens: number;
  sessionRequestCount: number;
  remainingRequests: number | null;
  remainingTokens: number | null;
  estimatedResetAt: string | null;
  lastUpdatedAt: string;
}

export interface AIAccountProfile {
  id: string;
  providerId: AIProviderId;
  label: string;
  connectionMode: ConnectionMode;
  modelId: string;
  priorityOrder: number;
  isDefault: boolean;
  telemetry: UsageTelemetry;
}

export interface AIProviderMetadata {
  id: AIProviderId;
  displayName: string;
  shortName: string;
  supportsMultipleAccounts: boolean;
  availableModels: Array<{
    id: string;
    displayName: string;
    contextWindow: number;
  }>;
}

export interface StructuredSessionState {
  currentGoal: string;
  currentTask: string;
  completedWork: string[];
  pendingWork: string[];
  importantDecisions: string[];
  errorsEncountered: string[];
  errorsResolved: string[];
  relevantFiles: string[];
  filesModified: string[];
  commandsExecuted: string[];
  testResults: string[];
  currentImplementationState: string;
  nextRecommendedAction: string;
}

export interface HandoffRecord {
  id: string;
  sequenceNumber: number;
  filename: string;
  fromProvider: AIProviderId;
  fromAccountLabel: string;
  toProvider: AIProviderId;
  toAccountLabel: string;
  reason: 'manual_switch' | 'usage_limit_reached' | 'rate_limit_fallback' | 'account_rotation';
  createdAt: string;
  markdownContent: string;
}

export type BottomPanelTab = 'terminal' | 'problems' | 'output' | 'git';

export type ApprovalMode = 'ask_every_time' | 'auto_approve_safe' | 'advanced';

// ============================================================================
// Phase 2: Project & Workspace Management Contracts (.project-ai/)
// ============================================================================

export interface ProjectWorkspaceConfig {
  schemaVersion: string;
  projectId: string;
  projectName: string;
  rootPath: string;
  ignoredPaths: string[];
  autoFallbackEnabled: boolean;
  approvalMode: ApprovalMode;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectStateArtifact {
  projectId: string;
  projectName: string;
  rootPath: string;
  detectedLanguages: string[];
  gitBranch: string;
  architectureSummary: string;
  entrypoints: string[];
  lastIndexedAt: string;
}

export interface ActiveProviderSelectionArtifact {
  activeProviderId: AIProviderId;
  activeAccountId: string;
  activeAccountLabel: string;
  connectionMode: ConnectionMode;
  modelId: string;
  updatedAt: string;
}

export interface ProjectAISnapshot {
  config: ProjectWorkspaceConfig;
  projectState: ProjectStateArtifact;
  sessionState: StructuredSessionState;
  providerSelection: ActiveProviderSelectionArtifact;
  handoffFiles: string[];
  projectAiDirectories: string[];
}

export interface RecentProjectItem {
  projectId: string;
  projectName: string;
  rootPath: string;
  gitBranch: string;
  lastOpenedAt: string;
  activeProviderId: AIProviderId;
  activeAccountLabel: string;
}

// ============================================================================
// Phase 3: File Explorer & File Operations Contracts
// ============================================================================

export type FileNodeType = 'file' | 'directory';

export interface FileNode {
  id: string;
  name: string;
  path: string;
  absolutePath: string;
  type: FileNodeType;
  extension?: string;
  sizeBytes?: number;
  children?: FileNode[];
  isExpanded?: boolean;
}

export interface FileOperationResult {
  success: boolean;
  message: string;
  path: string;
  node?: FileNode;
}

// ============================================================================
// Phase 4: Code Editor, Multi-Tab Buffers & Safe AI Diff Modification Contracts
// ============================================================================

export interface EditorTab {
  path: string;
  name: string;
  language: string;
  content: string;
  savedContent: string;
  isDirty: boolean;
  cursorLine: number;
  cursorColumn: number;
}

export interface PendingAIDiffProposal {
  id: string;
  filePath: string;
  providerId: AIProviderId;
  accountLabel: string;
  summary: string;
  originalContent: string;
  proposedContent: string;
  isDestructive: boolean;
  createdAt: string;
}

// ============================================================================
// Phase 5: Integrated Terminal & Destructive Command Guard Contracts
// ============================================================================

export type CommandRiskLevel = 'safe_read_only' | 'state_mutating' | 'destructive';

export interface CommandClassification {
  command: string;
  riskLevel: CommandRiskLevel;
  requiresConfirmation: boolean;
  reason: string;
  detectedTokens: string[];
}

export interface PendingTerminalCommandProposal {
  id: string;
  command: string;
  source: 'user' | 'ai';
  providerId: AIProviderId;
  accountLabel: string;
  classification: CommandClassification;
  createdAt: string;
}

export interface TerminalExecutionEntry {
  id: string;
  command: string;
  output: string;
  exitCode: number;
  riskLevel: CommandRiskLevel;
  executedBy: 'user' | 'ai_approved';
  timestamp: string;
}
