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
  | 'stopped'
  | 'error';

export type NetworkMode = 'restricted' | 'standard' | 'disabled';

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
}

export interface ProviderProfile {
  id: string;
  name: string;
  providerId: string; // e.g., 'anthropic', 'openai', 'gemini', 'openrouter', 'ollama'
  credentialRef: string; // Keychain reference identifier
  defaultModel: string;
  apiEndpoint?: string;
  enabled: boolean;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  workspaceId?: string;
  eventType: string;
  payloadJson: string;
  createdAt: string;
}

export interface CreateWorkspacePayload {
  name: string;
  hostProjectPath: string;
  imageId?: string;
  cpuCount?: number;
  memoryMb?: number;
  diskSizeGb?: number;
  networkMode?: NetworkMode;
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

export interface AgentTaskRequest {
  workspaceId: string;
  prompt: string;
  providerProfileId?: string;
  modelId?: string;
}

export interface TerminalExecutionPayload {
  workspaceId: string;
  command: string;
}

export interface TerminalOutputEvent {
  workspaceId: string;
  stream: 'stdout' | 'stderr';
  data: string;
}
