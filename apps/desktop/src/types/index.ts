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
// System Browser & Developer Tools (CDP & DevTools Architecture)
// -------------------------------------------------------------
export type BrowserViewportPreset = 'desktop' | 'laptop' | 'tablet' | 'mobile';

export interface BrowserTab {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  loading?: boolean;
  isLoading?: boolean;
  canGoBack?: boolean;
  canGoForward?: boolean;
  viewport?: BrowserViewportPreset;
  cdpTargetId?: string;
  zoomLevel?: number;
}

export interface BrowserBookmark {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  createdAt: string;
}

export interface BrowserHistoryEntry {
  id: string;
  title: string;
  url: string;
  timestamp: string;
}

export interface BrowserDownloadItem {
  id: string;
  filename: string;
  url: string;
  sizeBytes: number;
  transferredBytes: number;
  status: 'progress' | 'completed' | 'cancelled' | 'failed';
  timestamp: string;
}

export interface BrowserEngineStatus {
  isRunning: boolean;
  pid?: number;
  cdpPort: number;
  cdpUrl: string;
  version: string;
  profileDir: string;
}

export interface CdpTabTarget {
  id: string;
  title: string;
  url: string;
  type: string;
  webSocketDebuggerUrl?: string;
}

export interface CdpEvalResult {
  success: boolean;
  value: string;
  error?: string;
}

export interface BrowserConsoleMessage {
  id: string;
  level?: 'info' | 'warn' | 'error' | 'log';
  type?: 'info' | 'warn' | 'error' | 'log';
  message: string;
  timestamp: string;
  source?: string;
  stackTrace?: string;
  count?: number;
}

export interface BrowserNetworkRequest {
  id: string;
  url: string;
  method: string;
  status: number;
  statusText?: string;
  durationMs?: number;
  timingMs?: number;
  sizeBytes?: number;
  resourceType?: 'document' | 'stylesheet' | 'script' | 'image' | 'font' | 'xhr' | 'fetch' | 'other';
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  timestamp: string;
  failed?: boolean;
  blockedReason?: string;
}

export interface DOMNodeInfo {
  nodeId: number;
  nodeName: string;
  localName: string;
  attributes: Record<string, string>;
  children?: DOMNodeInfo[];
  childNodeCount?: number;
}

export interface CSSRuleProperty {
  name: string;
  value: string;
  enabled: boolean;
}

export interface CSSRuleInfo {
  selector: string;
  properties: CSSRuleProperty[];
}

export interface BoxModelMetrics {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  border: { top: number; right: number; bottom: number; left: number };
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface StorageEntry {
  key: string;
  value: string;
  size?: number;
}

export interface CookieEntry {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: string;
  httpOnly: boolean;
  secure: boolean;
}

export interface PerformanceTraceMetric {
  name: string;
  value: number;
  unit: string;
  status: 'good' | 'needs-improvement' | 'poor';
}

export interface AutomationStep {
  id: string;
  action: 'navigate' | 'click' | 'fill' | 'wait' | 'screenshot';
  target?: string;
  value?: string;
  status?: 'pending' | 'running' | 'passed' | 'failed';
  durationMs?: number;
}

export interface AutomationScript {
  id: string;
  name: string;
  description: string;
  steps: AutomationStep[];
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
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'CUSTOM';
export type ApiRequestBodyType = 'none' | 'json' | 'xml' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'binary' | 'graphql';

export interface KeyValuePair {
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

export interface ApiAuth {
  type: 'none' | 'bearer' | 'basic' | 'apikey' | 'oauth2' | 'inherit';
  bearerToken?: string;
  basicUser?: string;
  basicPass?: string;
  apiKeyName?: string;
  apiKeyValue?: string;
  apiKeyLocation?: 'header' | 'query';
  oauth2Token?: string;
  oauth2AuthUrl?: string;
  oauth2TokenUrl?: string;
  oauth2ClientId?: string;
  oauth2ClientSecret?: string;
  oauth2Scope?: string;
}

export interface ApiTimingMetrics {
  dnsLookupMs?: number;
  dns_lookup_ms?: number;
  tcpConnectMs?: number;
  tcp_connect_ms?: number;
  tlsHandshakeMs?: number;
  tls_handshake_ms?: number;
  ttfbMs?: number;
  ttfb_ms?: number;
  contentTransferMs?: number;
  content_transfer_ms?: number;
  totalMs?: number;
  total_ms?: number;
}

export interface ApiCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: string;
  httpOnly: boolean;
  secure: boolean;
}

export interface ApiTestResult {
  name: string;
  status: 'passed' | 'failed';
  error?: string;
}

export interface ApiRequestConfig {
  id?: string;
  name?: string;
  description?: string;
  method: HttpMethod;
  customMethod?: string;
  url: string;
  params?: KeyValuePair[];
  headers?: KeyValuePair[];
  auth?: ApiAuth;
  bodyType?: ApiRequestBodyType;
  bodyContent?: string;
  bodyJson?: string;
  bodyFormData?: KeyValuePair[];
  graphqlQuery?: string;
  graphqlVariables?: string;
  preRequestScript?: string;
  testScript?: string;
  timeoutSeconds?: number;
  followRedirects?: boolean;
  maxRedirects?: number;
  verifySsl?: boolean;
  proxyUrl?: string;
}

export interface ApiResponseData {
  status: number;
  statusText: string;
  timeMs: number;
  sizeBytes: number;
  headers: Record<string, string>;
  cookies?: ApiCookie[];
  timing?: ApiTimingMetrics;
  redirectCount?: number;
  testResults?: ApiTestResult[];
  data: string;
  error?: string;
}

export interface ApiFolder {
  id: string;
  name: string;
  requests: ApiRequestConfig[];
}

export interface ApiCollection {
  id: string;
  name: string;
  description?: string;
  requests: ApiRequestConfig[];
  folders?: ApiFolder[];
  variables?: Record<string, string>;
  auth?: ApiAuth;
}

export interface ApiEnvironment {
  id: string;
  name: string;
  variables: Record<string, string>;
  isSecret?: Record<string, boolean>;
}

export interface ApiHistoryItem {
  id: string;
  timestamp: string;
  method: HttpMethod;
  url: string;
  status: number;
  timeMs: number;
  sizeBytes: number;
  requestConfig: ApiRequestConfig;
}

export interface ApiRunnerReportResult {
  requestId: string;
  name: string;
  method: string;
  url: string;
  status: number;
  timeMs: number;
  tests: ApiTestResult[];
}

export interface ApiRunnerReport {
  id: string;
  startTime: string;
  totalDurationMs: number;
  totalRequests: number;
  passedRequests: number;
  failedRequests: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: ApiRunnerReportResult[];
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

