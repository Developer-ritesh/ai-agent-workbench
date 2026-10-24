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
