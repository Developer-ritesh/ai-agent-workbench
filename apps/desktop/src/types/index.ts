export type VmLifecycleState =
  | 'stopped'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'suspended'
  | 'error';

export type AgentState =
  | 'idle'
  | 'starting'
  | 'running'
  | 'awaiting_approval'
  | 'completed'
  | 'cancelled'
  | 'stopped'
  | 'error';

export type NetworkMode = 'restricted' | 'standard' | 'disabled';

export type ThemeMode = 'dark' | 'light' | 'system';

export interface VmConfig {
  cpuCount: number;
  memoryMb: number;
  diskSizeGb: number;
  networkMode: NetworkMode;
  sharedMountTag?: string;
}

export interface Workspace {
  id: string;
  name: string;
  hostProjectPath: string;
  vmId: string;
  imageId: string;
  config: VmConfig;
  status: VmLifecycleState;
  createdAt: string;
  updatedAt: string;
  template?: string;
}

export interface AgentTaskStep {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  timestamp: string;
  toolCall?: {
    tool: string;
    params?: string;
  };
}

export interface AgentSession {
  id: string;
  workspaceId: string;
  providerProfileId?: string;
  modelId: string;
  guestProcessId?: string;
  state: AgentState;
  exitCode?: number | null;
  startedAt: string;
  endedAt?: string | null;
  taskPrompt?: string;
  steps?: AgentTaskStep[];
  filesModified?: string[];
}

export interface ProviderProfile {
  id: string;
  name: string;
  providerId: string;
  credentialRef: string;
  defaultModel: string;
  apiEndpoint?: string;
  enabled: boolean;
  createdAt: string;
}

export interface VmStatusResponse {
  vmId: string;
  state: VmLifecycleState;
  ipAddress?: string;
  pid?: number;
  memoryUsageMb?: number;
  cpuPercent?: number;
  activeMounts: string[];
}

export interface TerminalExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface CreateWorkspacePayload {
  name: string;
  hostProjectPath: string;
  cpuCount?: number;
  memoryMb?: number;
  diskSizeGb?: number;
  networkMode?: string;
}

export interface AuditEventRecord {
  id: string;
  workspaceId?: string;
  eventType: string;
  payloadJson: string;
  createdAt: string;
}

export interface FileTreeNode {
  name: string;
  path: string;
  isDir: boolean;
  size?: number;
  gitStatus?: 'M' | 'U' | 'A' | 'D' | 'clean';
  children?: FileTreeNode[];
}

export interface SearchResult {
  path: string;
  name: string;
  relative_path: string;
  line_number: number;
  line_content: string;
  match_type: 'content' | 'filename';
}

export interface GitFileChange {
  path: string;
  filename: string;
  status: string;
  staged: boolean;
}

export interface GitStatusResult {
  branch: string;
  is_git_repo: boolean;
  clean: boolean;
  changes: GitFileChange[];
}

export interface NetworkStats {
  is_online: boolean;
  latency_ms: number;
  download_speed_bps: number;
  upload_speed_bps: number;
  download_speed_formatted: string;
  upload_speed_formatted: string;
  total_download_bytes: number;
  total_upload_bytes: number;
  active_interface: string;
  status: 'online' | 'offline' | 'reconnecting' | 'testing';
  retry_count: number;
  last_checked_iso: string;
}

// -------------------------------------------------------------
// Integrated Browser
// -------------------------------------------------------------
export type BrowserViewportPreset = 'desktop' | 'laptop' | 'tablet' | 'mobile';

export interface BrowserTab {
  id: string;
  url: string;
  title: string;
  loading?: boolean;
  isLoading?: boolean;
  canGoBack?: boolean;
  canGoForward?: boolean;
  viewport?: BrowserViewportPreset;
}

export interface BrowserConsoleMessage {
  id: string;
  level?: 'info' | 'warn' | 'error' | 'log';
  type?: 'info' | 'warn' | 'error' | 'log';
  message: string;
  timestamp: string;
  source?: string;
}

export interface BrowserNetworkRequest {
  id: string;
  url: string;
  method: string;
  status: number;
  durationMs?: number;
  timingMs?: number;
  sizeBytes?: number;
  timestamp: string;
  failed?: boolean;
}

// -------------------------------------------------------------
// Port Forwarding Manager
// -------------------------------------------------------------
export interface PortForwardMapping {
  id: string;
  guestPort: number;
  localPort: number;
  protocol: 'tcp' | 'udp' | 'http' | 'ws';
  status: 'active' | 'starting' | 'stopped' | 'conflict';
  processName?: string;
  targetUrl: string;
  autoForwarded?: boolean;
  isListening?: boolean;
}

// -------------------------------------------------------------
// API Testing Studio
// -------------------------------------------------------------
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface KeyValuePair {
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

export interface ApiAuth {
  type: 'none' | 'bearer' | 'basic' | 'apikey';
  bearerToken?: string;
  basicUser?: string;
  basicPass?: string;
  apiKeyName?: string;
  apiKeyValue?: string;
  apiKeyLocation?: 'header' | 'query';
}

export interface ApiRequestConfig {
  id?: string;
  name?: string;
  method: HttpMethod;
  url: string;
  params?: KeyValuePair[];
  headers?: KeyValuePair[];
  auth?: ApiAuth;
  bodyType?: 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw';
  bodyContent?: string;
  timeoutSeconds?: number;
}

export interface ApiResponseData {
  status: number;
  statusText: string;
  timeMs: number;
  sizeBytes: number;
  headers: Record<string, string>;
  data: string;
  error?: string;
}

export interface ApiCollection {
  id: string;
  name: string;
  requests: ApiRequestConfig[];
}

export interface ApiEnvironment {
  id: string;
  name: string;
  variables: Record<string, string>;
}

// -------------------------------------------------------------
// Automatic Testing Engine
// -------------------------------------------------------------
export type TestCategory = 'unit' | 'integration' | 'e2e' | 'api' | 'lint';

export interface TestCaseResult {
  id: string;
  name?: string;
  testName?: string;
  suite?: string;
  suiteName?: string;
  category?: TestCategory;
  status: 'passed' | 'failed' | 'skipped' | 'running';
  durationMs: number;
  errorMessage?: string;
  stackTrace?: string;
  screenshotPath?: string;
}

export interface TestRunReport {
  id: string;
  timestamp: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  cases: TestCaseResult[];
}

// -------------------------------------------------------------
// Unified Diagnostics & Logs
// -------------------------------------------------------------
export type DiagnosticLevel = 'error' | 'warn' | 'info' | 'debug';
export type DiagnosticSource =
  | 'frontend'
  | 'tauri'
  | 'vm'
  | 'terminal'
  | 'agent'
  | 'api'
  | 'browser'
  | 'test'
  | 'ports';

export interface DiagnosticLogEntry {
  id: string;
  level: DiagnosticLevel;
  source: DiagnosticSource;
  message: string;
  timestamp: string;
  details?: string;
}

// -------------------------------------------------------------
// MCP (Model Context Protocol) & Extensions
// -------------------------------------------------------------
export interface McpServerConfig {
  id: string;
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  enabled: boolean;
  status: 'connected' | 'disconnected' | 'error';
  toolsCount: number;
}

