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

