import {
  Workspace,
  VmStatusResponse,
  AgentSession,
  ProviderProfile,
  TerminalExecResult,
  CreateWorkspacePayload,
} from '../types';

let isTauriEnv = false;
try {
  isTauriEnv = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
} catch {
  isTauriEnv = false;
}

// In-memory mock store for preview / browser environments
const mockWorkspaces: Workspace[] = [
  {
    id: 'ws-demo-01',
    name: 'Frontend Web App',
    hostProjectPath: '/Users/developer/Projects/web-app',
    vmId: 'vm-a1b2c3d4',
    imageId: 'ubuntu-24.04-arm64',
    config: {
      cpuCount: 2,
      memoryMb: 4096,
      diskSizeGb: 20,
      networkMode: 'standard',
      sharedMountTag: 'project',
    },
    status: 'running',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ws-demo-02',
    name: 'Backend API Service',
    hostProjectPath: '/Users/developer/Projects/api-service',
    vmId: 'vm-e5f6g7h8',
    imageId: 'ubuntu-24.04-arm64',
    config: {
      cpuCount: 4,
      memoryMb: 8192,
      diskSizeGb: 40,
      networkMode: 'restricted',
      sharedMountTag: 'project',
    },
    status: 'stopped',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

const mockProviders: ProviderProfile[] = [
  {
    id: 'prov-01',
    name: 'Anthropic Claude Profile',
    providerId: 'anthropic',
    credentialRef: 'cred-profile-prov-01',
    defaultModel: 'claude-3-7-sonnet',
    enabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prov-02',
    name: 'OpenAI Dev Profile',
    providerId: 'openai',
    credentialRef: 'cred-profile-prov-02',
    defaultModel: 'gpt-4o',
    enabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prov-03',
    name: 'Local Ollama Instance',
    providerId: 'ollama',
    credentialRef: 'cred-profile-prov-03',
    defaultModel: 'llama3:8b',
    apiEndpoint: 'http://localhost:11434',
    enabled: true,
    createdAt: new Date().toISOString(),
  },
];

const mockSessions: AgentSession[] = [
  {
    id: 'sess-01',
    workspaceId: 'ws-demo-01',
    providerProfileId: 'prov-01',
    modelId: 'claude-3-7-sonnet',
    guestProcessId: '4120',
    state: 'running',
    exitCode: null,
    startedAt: new Date(Date.now() - 300000).toISOString(),
    taskPrompt: 'Refactor authentication middleware to use JWT and add unit tests',
  },
];

async function callTauri<T>(cmd: string, args: Record<string, unknown> = {}): Promise<T> {
  if (isTauriEnv) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<T>(cmd, args);
  }
  return mockCall<T>(cmd, args);
}

function mockCall<T>(cmd: string, args: Record<string, unknown>): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        switch (cmd) {
          case 'workspace_list':
            resolve([...mockWorkspaces] as unknown as T);
            break;
          case 'workspace_create': {
            const input = args.input as CreateWorkspacePayload;
            const newWs: Workspace = {
              id: 'ws-' + Math.random().toString(36).substring(2, 9),
              name: input.name,
              hostProjectPath: input.hostProjectPath,
              vmId: 'vm-' + Math.random().toString(36).substring(2, 8),
              imageId: 'ubuntu-24.04-arm64',
              config: {
                cpuCount: input.cpuCount || 2,
                memoryMb: input.memoryMb || 4096,
                diskSizeGb: input.diskSizeGb || 20,
                networkMode: (input.networkMode as any) || 'standard',
                sharedMountTag: 'project',
              },
              status: 'stopped',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            mockWorkspaces.unshift(newWs);
            resolve(newWs as unknown as T);
            break;
          }
          case 'workspace_get': {
            const id = args.id as string;
            const found = mockWorkspaces.find((w) => w.id === id);
            if (found) resolve(found as unknown as T);
            else reject(new Error('Workspace not found'));
            break;
          }
          case 'workspace_delete': {
            const id = args.id as string;
            const idx = mockWorkspaces.findIndex((w) => w.id === id);
            if (idx !== -1) mockWorkspaces.splice(idx, 1);
            resolve(undefined as unknown as T);
            break;
          }
          case 'vm_start': {
            const id = args.workspaceId as string;
            const found = mockWorkspaces.find((w) => w.id === id);
            if (found) found.status = 'running';
            resolve({
              vmId: found?.vmId || 'vm-active',
              state: 'running',
              ipAddress: '192.168.64.2',
              pid: 24890,
              memoryUsageMb: 1024,
              cpuPercent: 3.2,
              activeMounts: [`${found?.hostProjectPath}:/workspace`],
            } as unknown as T);
            break;
          }
          case 'vm_stop': {
            const id = args.workspaceId as string;
            const found = mockWorkspaces.find((w) => w.id === id);
            if (found) found.status = 'stopped';
            resolve(undefined as unknown as T);
            break;
          }
          case 'vm_status': {
            const id = args.workspaceId as string;
            const found = mockWorkspaces.find((w) => w.id === id);
            resolve({
              vmId: found?.vmId || 'vm-status',
              state: found?.status || 'stopped',
              ipAddress: found?.status === 'running' ? '192.168.64.2' : undefined,
              pid: found?.status === 'running' ? 24890 : undefined,
              memoryUsageMb: found?.status === 'running' ? 1024 : undefined,
              cpuPercent: found?.status === 'running' ? 2.8 : undefined,
              activeMounts: found ? [`${found.hostProjectPath}:/workspace`] : [],
            } as unknown as T);
            break;
          }
          case 'terminal_execute': {
            const command = (args.command as string) || '';
            if (command.includes('opencode --version')) {
              resolve({
                exitCode: 0,
                stdout: 'opencode v2.1.4 (arm64-apple-darwin / linux guest ready)\n',
                stderr: '',
              } as unknown as T);
            } else if (command.includes('git status')) {
              resolve({
                exitCode: 0,
                stdout: 'On branch main\nChanges not staged for commit:\n  modified: src/auth.rs\n  modified: tests/auth_test.rs\n\nno changes added to commit (use "git add" to update)\n',
                stderr: '',
              } as unknown as T);
            } else {
              resolve({
                exitCode: 0,
                stdout: `Executing in Linux guest VM: ${command}\n[OK] Completed.\n`,
                stderr: '',
              } as unknown as T);
            }
            break;
          }
          case 'agent_get_version':
            resolve('opencode v2.1.4' as unknown as T);
            break;
          case 'agent_start_task': {
            const wsId = args.workspaceId as string;
            const prompt = args.prompt as string;
            const sess: AgentSession = {
              id: 'sess-' + Math.random().toString(36).substring(2, 9),
              workspaceId: wsId,
              providerProfileId: args.providerProfileId as string,
              modelId: (args.modelId as string) || 'claude-3-7-sonnet',
              guestProcessId: '4890',
              state: 'running',
              exitCode: null,
              startedAt: new Date().toISOString(),
              taskPrompt: prompt,
            };
            mockSessions.unshift(sess);
            resolve(sess as unknown as T);
            break;
          }
          case 'agent_stop_task': {
            const sId = args.sessionId as string;
            const s = mockSessions.find((x) => x.id === sId);
            if (s) {
              s.state = 'stopped';
              s.exitCode = 0;
              s.endedAt = new Date().toISOString();
            }
            resolve(undefined as unknown as T);
            break;
          }
          case 'agent_list_sessions': {
            const wsId = args.workspaceId as string;
            resolve(mockSessions.filter((s) => s.workspaceId === wsId) as unknown as T);
            break;
          }
          case 'provider_list':
            resolve([...mockProviders] as unknown as T);
            break;
          case 'provider_save': {
            const input = args.input as any;
            const prov: ProviderProfile = {
              id: input.id || 'prov-' + Math.random().toString(36).substring(2, 8),
              name: input.name,
              providerId: input.providerId,
              credentialRef: 'cred-profile-' + input.name,
              defaultModel: input.defaultModel,
              apiEndpoint: input.apiEndpoint,
              enabled: true,
              createdAt: new Date().toISOString(),
            };
            mockProviders.push(prov);
            resolve(prov as unknown as T);
            break;
          }
          case 'provider_delete': {
            const id = args.id as string;
            const idx = mockProviders.findIndex((p) => p.id === id);
            if (idx !== -1) mockProviders.splice(idx, 1);
            resolve(undefined as unknown as T);
            break;
          }
          default:
            reject(new Error(`Unknown mock command: ${cmd}`));
        }
      } catch (err) {
        reject(err);
      }
    }, 150);
  });
}

export const TauriApi = {
  isTauri: () => isTauriEnv,

  // Workspace
  listWorkspaces: () => callTauri<Workspace[]>('workspace_list'),
  getWorkspace: (id: string) => callTauri<Workspace>('workspace_get', { id }),
  createWorkspace: (input: CreateWorkspacePayload) =>
    callTauri<Workspace>('workspace_create', { input }),
  deleteWorkspace: (id: string) => callTauri<void>('workspace_delete', { id }),

  // VM
  startVm: (workspaceId: string) =>
    callTauri<VmStatusResponse>('vm_start', { workspaceId }),
  stopVm: (workspaceId: string) => callTauri<void>('vm_stop', { workspaceId }),
  getVmStatus: (workspaceId: string) =>
    callTauri<VmStatusResponse>('vm_status', { workspaceId }),

  // Terminal
  terminalExecute: (workspaceId: string, command: string) =>
    callTauri<TerminalExecResult>('terminal_execute', { workspaceId, command }),

  // Agent
  getOpencodeVersion: () => callTauri<string>('agent_get_version'),
  startAgentTask: (
    workspaceId: string,
    prompt: string,
    providerProfileId?: string,
    modelId?: string
  ) =>
    callTauri<AgentSession>('agent_start_task', {
      workspaceId,
      prompt,
      providerProfileId,
      modelId,
    }),
  stopAgentTask: (sessionId: string) =>
    callTauri<void>('agent_stop_task', { sessionId }),
  listAgentSessions: (workspaceId: string) =>
    callTauri<AgentSession[]>('agent_list_sessions', { workspaceId }),

  // Providers & Keychain
  listProviders: () => callTauri<ProviderProfile[]>('provider_list'),
  saveProvider: (input: {
    id?: string;
    name: string;
    providerId: string;
    defaultModel: string;
    apiEndpoint?: string;
    apiKey?: string;
  }) => callTauri<ProviderProfile>('provider_save', { input }),
  deleteProvider: (id: string) => callTauri<void>('provider_delete', { id }),
};
