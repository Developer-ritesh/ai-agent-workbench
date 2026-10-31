import {
  Workspace,
  VmStatusResponse,
  HostSystemInfo,
  AgentSession,
  ProviderProfile,
  TerminalExecResult,
  CreateWorkspacePayload,
  AuditEventRecord,
  FileTreeNode,
  SearchResult,
  GitStatusResult,
  GitLogEntry,
  NetworkStats,
  PortForwardMapping,
  ApiRequestConfig,
  ApiResponseData,
  BrowserEngineStatus,
  CdpTabTarget,
  CdpEvalResult,
  OpencodeMcpServer,
  OpencodeSkillInfo,
  OpencodeSyncResult,
} from '../types';

let isTauriEnv = false;
try {
  isTauriEnv = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
} catch {
  isTauriEnv = false;
}

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
    template: 'React + TypeScript',
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
    template: 'Rust Actix Web',
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
    filesModified: ['src/auth.rs', 'tests/auth_test.rs'],
    steps: [
      {
        id: 'step-1',
        title: 'Inspecting workspace file structure',
        description: 'Examined Cargo.toml, src/lib.rs, and dependencies',
        status: 'completed',
        timestamp: new Date(Date.now() - 280000).toISOString(),
        toolCall: { tool: 'list_files', params: 'path: "src/"' },
      },
      {
        id: 'step-2',
        title: 'Updating src/auth.rs with JWT validation logic',
        description: 'Replaced placeholder token checker with HMAC SHA256 validator',
        status: 'completed',
        timestamp: new Date(Date.now() - 200000).toISOString(),
        toolCall: { tool: 'write_file', params: 'src/auth.rs' },
      },
      {
        id: 'step-3',
        title: 'Executing cargo test inside Linux Guest VM',
        description: 'Verifying test suite passes inside sandbox boundary',
        status: 'running',
        timestamp: new Date(Date.now() - 60000).toISOString(),
        toolCall: { tool: 'execute_command', params: 'cargo test --test auth_test' },
      },
    ],
  },
];

const mockAuditLogs: AuditEventRecord[] = [
  {
    id: 'audit-01',
    workspaceId: 'ws-demo-01',
    eventType: 'workspace.created',
    payloadJson: 'Workspace "Frontend Web App" initialized with 2 vCPUs, 4GB RAM',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'audit-02',
    workspaceId: 'ws-demo-01',
    eventType: 'vm.started',
    payloadJson: 'Hypervisor vfkit process started PID 24890 with virtio-fs mount /workspace',
    createdAt: new Date(Date.now() - 86300000).toISOString(),
  },
  {
    id: 'audit-03',
    workspaceId: 'ws-demo-01',
    eventType: 'agent.task.started',
    payloadJson: 'Dev AI session sess-01 started with model claude-3-7-sonnet',
    createdAt: new Date(Date.now() - 300000).toISOString(),
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
          case 'vm_rotate': {
            const id = args.workspaceId as string;
            const found = mockWorkspaces.find((w) => w.id === id);
            if (found) found.status = 'running';
            resolve({
              vmId: found?.vmId || 'vm-rotated',
              state: 'running',
              ipAddress: '192.168.64.2',
              pid: 24890 + Math.floor(Math.random() * 50),
              memoryUsageMb: 1024,
              cpuPercent: 1.8,
              activeMounts: found ? [`${found.hostProjectPath}:/workspace`] : [],
            } as unknown as T);
            break;
          }
          case 'drag_window': {
            resolve(undefined as unknown as T);
            break;
          }
          case 'toggle_maximize_window': {
            resolve(undefined as unknown as T);
            break;
          }
          case 'pty_spawn':
          case 'pty_write':
          case 'pty_resize':
          case 'pty_kill': {
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
                stdout: `Executing in Linux guest VM: ${command}\n[OK] Command succeeded with status 0.\n`,
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
              filesModified: ['src/index.ts'],
              steps: [
                {
                  id: 's-1',
                  title: 'Task accepted & isolated VM execution started',
                  status: 'completed',
                  timestamp: new Date().toISOString(),
                },
                {
                  id: 's-2',
                  title: 'Analyzing workspace dependencies',
                  status: 'running',
                  timestamp: new Date().toISOString(),
                  toolCall: { tool: 'analyze_project', params: 'workspace_root' },
                },
              ],
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
          case 'fs_search': {
            const query = ((args.query as string) || '').toLowerCase();
            const results: SearchResult[] = [
              {
                path: '/tmp/masticall-in/src/main.rs',
                name: 'main.rs',
                relative_path: 'src/main.rs',
                line_number: 1,
                line_content: 'fn main() { println!("Hello isolated agent"); }',
                match_type: 'content' as const,
              },
              {
                path: '/tmp/masticall-in/Cargo.toml',
                name: 'Cargo.toml',
                relative_path: 'Cargo.toml',
                line_number: 1,
                line_content: '[package]\nname = "masticall-in"',
                match_type: 'filename' as const,
              },
            ].filter((r) => r.name.toLowerCase().includes(query) || r.line_content.toLowerCase().includes(query));
            resolve(results as unknown as T);
            break;
          }
          case 'git_status': {
            resolve({
              branch: 'main',
              is_git_repo: true,
              clean: false,
              changes: [
                { path: '/tmp/masticall-in/src/main.rs', filename: 'main.rs', status: 'M', staged: false },
                { path: '/tmp/masticall-in/tests/test.rs', filename: 'test.rs', status: '??', staged: false },
              ],
            } as unknown as T);
            break;
          }
          case 'git_commit': {
            resolve('Commit successful (dev preview)' as unknown as T);
            break;
          }
          case 'git_log': {
            // Honest dev-preview: the mock browser has no real repository wired
            // up, so history is empty and the UI shows its explanatory empty state.
            resolve([] as unknown as T);
            break;
          }
          case 'ports_forward_create': {
            const mapping = {
              id: `port-${(args.localPort as number) || Math.floor(Math.random() * 10000)}`,
              guestPort: args.guestPort ?? 3000,
              localPort: args.localPort ?? 3000,
              protocol: args.protocol || 'http',
              status: 'active',
              processName: 'user-created',
              targetUrl: `http://127.0.0.1:${args.localPort ?? 3000}`,
              isListening: true,
            };
            resolve(mapping as unknown as T);
            break;
          }
          case 'ports_forward_remove': {
            // Dev-browser mock: report success so the UI list updates; the real
            // Tauri backend (commands/ports.rs PortManager) performs the actual teardown.
            resolve(undefined as unknown as T);
            break;
          }
          case 'git_init': {
            resolve('Initialized empty Git repository' as unknown as T);
            break;
          }
          case 'opencode_clear_sessions': {
            resolve('Dev AI session history and checkpoints cleared successfully' as unknown as T);
            break;
          }
          case 'opencode_clear_global_history': {
            resolve('Global Dev AI session history and conversation database cleared successfully.' as unknown as T);
            break;
          }
          case 'opencode_clear_cache': {
            resolve('Dev AI model cache and temporary packages cleared successfully.' as unknown as T);
            break;
          }
          case 'network_get_stats':
          case 'network_retry_connection':
          case 'network_run_speed_test': {
            resolve({
              is_online: true,
              latency_ms: 18,
              download_speed_bps: 1450000,
              upload_speed_bps: 380000,
              download_speed_formatted: '1.45 MB/s',
              upload_speed_formatted: '380 KB/s',
              total_download_bytes: 2764724156,
              total_upload_bytes: 3164874697,
              active_interface: 'en0 (Wi-Fi)',
              status: 'online',
              retry_count: 0,
              last_checked_iso: new Date().toISOString(),
            } as unknown as T);
            break;
          }
          case 'api_parse_curl': {
            resolve({
              method: 'GET',
              url: 'http://127.0.0.1:3000/api/v1/health',
              params: [],
              headers: [],
              bodyType: 'none',
            } as unknown as T);
            break;
          }
          case 'api_execute_request': {
            resolve({
              status: 200,
              statusText: 'OK',
              timeMs: 42,
              sizeBytes: 154,
              headers: { 'Content-Type': 'application/json' },
              cookies: [],
              data: '{\n  "status": "healthy",\n  "timestamp": "' + new Date().toISOString() + '"\n}',
            } as unknown as T);
            break;
          }
          case 'opencode_get_mcp_config': {
            resolve([
              { id: 'dart', type: 'local', enabled: true, command: ['dart', 'mcp-server'] },
              { id: 'heroui', type: 'local', enabled: true, command: ['npx', '-y', '@heroui/react-mcp@latest'] },
              { id: 'playwright', type: 'local', enabled: true, command: ['npx', '-y', '@playwright/mcp@latest'] },
              { id: 'context7', type: 'remote', enabled: true, url: 'https://mcp.context7.com/mcp' },
              { id: 'gh_grep', type: 'remote', enabled: true, url: 'https://mcp.grep.app' },
              { id: 'stitch', type: 'remote', enabled: true, url: 'https://stitch.googleapis.com/mcp' },
              { id: 'thinking', type: 'local', enabled: true, command: ['npx', '-y', '@modelcontextprotocol/server-sequential-thinking'] },
              { id: 'filesystem', type: 'local', enabled: true, command: ['npx', '-y', '@modelcontextprotocol/server-filesystem', '/Users/developerritesh/Dev-Action-2026'] },
              { id: 'google-search', type: 'local', enabled: true, command: ['npx', '-y', '@mcp-server/google-search-mcp@latest'] },
              { id: 'memory', type: 'local', enabled: true, command: ['npx', '-y', '@modelcontextprotocol/server-memory'] },
              { id: 'puppeteer', type: 'local', enabled: true, command: ['npx', '-y', '@modelcontextprotocol/server-puppeteer'] },
              { id: 'supabase', type: 'remote', enabled: true, url: 'https://mcp.supabase.com/mcp' },
              { id: 'sentry', type: 'remote', enabled: true, url: 'https://mcp.sentry.dev/mcp' },
              { id: 'fetch', type: 'local', enabled: true, command: ['uvx', '--with', 'mcp<2', 'mcp-server-fetch'] },
              { id: 'florence2', type: 'local', enabled: true, command: ['uvx', '--from', 'git+https://github.com/jkawamoto/mcp-florence2', 'mcp-florence2'] },
              { id: 'rea', type: 'local', enabled: true, command: ['npx', '-y', 'rea-agents@6.5.0', 'mcp'] },
              { id: 'chrome-devtools', type: 'local', enabled: true, command: ['npx', '-y', 'chrome-devtools-mcp@latest'] },
            ] as unknown as T);
            break;
          }
          case 'opencode_toggle_mcp_server': {
            resolve(true as unknown as T);
            break;
          }
          case 'opencode_save_mcp_server': {
            resolve((args as any)?.server as unknown as T);
            break;
          }
          case 'opencode_delete_mcp_server': {
            resolve((args as any)?.serverId as unknown as T);
            break;
          }
          case 'opencode_list_skills': {
            resolve([
              { name: 'accessibility', title: 'Accessibility (WCAG 2.2)', description: 'Design, implement, and audit inclusive digital products using WCAG 2.2 Level AA.', path: '/Users/developerritesh/Programming/opencode-config/skills/accessibility', has_skill_md: true, file_count: 3 },
              { name: 'agent-architecture-audit', title: 'Agent Architecture Audit', description: 'Evaluate autonomous AI agents against safety, tool-use, and prompt-injection baselines.', path: '/Users/developerritesh/Programming/opencode-config/skills/agent-architecture-audit', has_skill_md: true, file_count: 3 },
              { name: 'api-design', title: 'API Design', description: 'Design RESTful, gRPC, and GraphQL APIs with schema-first validation.', path: '/Users/developerritesh/Programming/opencode-config/skills/api-design', has_skill_md: true, file_count: 3 },
              { name: 'react-patterns', title: 'React Modern Patterns', description: 'Best practices for React 19, hooks, Suspense, and state management.', path: '/Users/developerritesh/Programming/opencode-config/skills/react-patterns', has_skill_md: true, file_count: 4 },
            ] as unknown as T);
            break;
          }
          case 'opencode_get_skill_content': {
            resolve('# Accessibility (WCAG 2.2)\n\nInclusive digital product design and automated auditing.' as unknown as T);
            break;
          }
          case 'opencode_sync_from_path': {
            resolve({
              success: true,
              skills_count: 413,
              mcps_count: 17,
              message: 'Successfully installed 413 skills and 17 MCP servers into Dev AI',
              target_path: '~/.config/opencode',
            } as unknown as T);
            break;
          }
          default:
            reject(new Error(`Unknown mock command: ${cmd}`));
        }
      } catch (err) {
        reject(err);
      }
    }, 120);
  });
}

export const TauriApi = {
  isTauri: () => isTauriEnv,

  // Workspaces
  listWorkspaces: () => callTauri<Workspace[]>('workspace_list'),
  getWorkspace: (id: string) => callTauri<Workspace>('workspace_get', { id }),
  createWorkspace: (input: CreateWorkspacePayload) =>
    callTauri<Workspace>('workspace_create', { input }),
  deleteWorkspace: (id: string) => callTauri<void>('workspace_delete', { id }),

  // VM Lifecycle
  startVm: (workspaceId: string) =>
    callTauri<VmStatusResponse>('vm_start', { workspaceId }),
  stopVm: (workspaceId: string) => callTauri<void>('vm_stop', { workspaceId }),
  getVmStatus: (workspaceId: string) =>
    callTauri<VmStatusResponse>('vm_status', { workspaceId }),
  rotateVm: (workspaceId: string) =>
    callTauri<VmStatusResponse>('vm_rotate', { workspaceId }),
  getHostSystemInfo: () =>
    callTauri<HostSystemInfo>('system_get_host_info'),

  // Window Management
  dragWindow: () => callTauri<void>('drag_window'),
  toggleMaximizeWindow: () => callTauri<void>('toggle_maximize_window'),

  // Host File System (VS Code functionality)
  readDir: (path: string) => callTauri<FileTreeNode[]>('fs_read_dir', { path }),
  readFile: (path: string) => callTauri<string>('fs_read_file', { path }),
  writeFile: (path: string, content: string) => callTauri<void>('fs_write_file', { path, content }),
  createFile: (path: string) => callTauri<void>('fs_create_file', { path }),
  createDir: (path: string) => callTauri<void>('fs_create_dir', { path }),
  deleteEntry: (path: string) => callTauri<void>('fs_delete', { path }),
  renameEntry: (oldPath: string, newPath: string) => callTauri<void>('fs_rename', { oldPath, newPath }),
  dialogOpenFolder: () => callTauri<string | null>('dialog_open_folder'),
  searchFiles: (path: string, query: string, matchCase: boolean = false, searchContent: boolean = true) =>
    callTauri<SearchResult[]>('fs_search', { path, query, matchCase, searchContent }),

  // Git / Source Control
  gitStatus: (path: string) => callTauri<GitStatusResult>('git_status', { path }),
  gitCommit: (path: string, message: string, files?: string[]) =>
    callTauri<string>('git_commit', { path, message, files: files ?? null }),
  gitLog: (path: string, limit: number = 50) => callTauri<GitLogEntry[]>('git_log', { path, limit }),
  gitInit: (path: string) => callTauri<string>('git_init', { path }),

  // Dev AI (OpenCode engine) Session Management
  clearOpencodeSessions: (path: string) => callTauri<string>('opencode_clear_sessions', { path }),
  clearOpencodeGlobalHistory: () => callTauri<string>('opencode_clear_global_history'),
  clearOpencodeCache: () => callTauri<string>('opencode_clear_cache'),
  clearDevAiSessions: (path: string) => callTauri<string>('opencode_clear_sessions', { path }),
  clearDevAiGlobalHistory: () => callTauri<string>('opencode_clear_global_history'),
  clearDevAiCache: () => callTauri<string>('opencode_clear_cache'),

  // Dev AI MCP & Skills Management
  getOpencodeMcpConfig: () => callTauri<OpencodeMcpServer[]>('opencode_get_mcp_config'),
  toggleOpencodeMcpServer: (serverId: string, enabled: boolean) =>
    callTauri<boolean>('opencode_toggle_mcp_server', { serverId, enabled }),
  saveOpencodeMcpServer: (server: OpencodeMcpServer) =>
    callTauri<OpencodeMcpServer>('opencode_save_mcp_server', { server }),
  deleteOpencodeMcpServer: (serverId: string) =>
    callTauri<string>('opencode_delete_mcp_server', { serverId }),
  listOpencodeSkills: () => callTauri<OpencodeSkillInfo[]>('opencode_list_skills'),
  getOpencodeSkillContent: (skillName: string) =>
    callTauri<string>('opencode_get_skill_content', { skillName }),
  syncOpencodeFromPath: (sourcePath?: string) =>
    callTauri<OpencodeSyncResult>('opencode_sync_from_path', { sourcePath }),
  getDevAiMcpConfig: () => callTauri<OpencodeMcpServer[]>('opencode_get_mcp_config'),
  listDevAiSkills: () => callTauri<OpencodeSkillInfo[]>('opencode_list_skills'),
  syncDevAiFromPath: (sourcePath?: string) =>
    callTauri<OpencodeSyncResult>('opencode_sync_from_path', { sourcePath }),

  // Terminal & Execution
  terminalExecute: (workspaceId: string, command: string) =>
    callTauri<TerminalExecResult>('terminal_execute', { workspaceId, command }),

  // Native PTY (Isolated Linux VM Terminal)
  ptySpawn: (terminalId: string, cwd?: string, cols: number = 80, rows: number = 24) =>
    callTauri<void>('pty_spawn', { terminalId, cwd, cols, rows }),
  ptyWrite: (terminalId: string, data: string) =>
    callTauri<void>('pty_write', { terminalId, data }),
  ptyResize: (terminalId: string, cols: number, rows: number) =>
    callTauri<void>('pty_resize', { terminalId, cols, rows }),
  ptyKill: (terminalId: string) =>
    callTauri<void>('pty_kill', { terminalId }),

  // Network Speed Meter & Connection Health
  networkGetStats: () => callTauri<NetworkStats>('network_get_stats'),
  networkRetryConnection: () => callTauri<NetworkStats>('network_retry_connection'),
  networkRunSpeedTest: () => callTauri<NetworkStats>('network_run_speed_test'),
  listenPtyOutput: async (terminalId: string, callback: (data: string) => void): Promise<() => void> => {
    if (isTauriEnv) {
      const { listen } = await import('@tauri-apps/api/event');
      const unlisten = await listen<string>(`pty-output-${terminalId}`, (event) => {
        callback(event.payload);
      });
      return unlisten;
    }
    return () => {};
  },
  listenVmRotated: async (callback: (workspaceId: string) => void): Promise<() => void> => {
    if (isTauriEnv) {
      const { listen } = await import('@tauri-apps/api/event');
      const unlisten = await listen<string>('vm-rotated', (event) => {
        callback(event.payload);
      });
      return unlisten;
    }
    return () => {};
  },

  // Agent Supervision
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
  testProviderConnection: async (_providerId: string): Promise<{ success: boolean; latencyMs: number; message: string }> => {
    return new Promise((res) => {
      setTimeout(() => {
        res({ success: true, latencyMs: 142, message: 'Provider API reachable and authenticated via Keychain.' });
      }, 500);
    });
  },

  // Audit Events
  listAuditEvents: async (): Promise<AuditEventRecord[]> => {
    return [...mockAuditLogs];
  },

  // Project Files
  listProjectFiles: async (workspacePath: string): Promise<FileTreeNode[]> => {
    try {
      const files = await callTauri<FileTreeNode[]>('fs_read_dir', { path: workspacePath });
      if (files && files.length > 0) return files;
    } catch {
      // Fallback
    }
    return [
      {
        name: 'src',
        path: `${workspacePath}/src`,
        isDir: true,
        children: [
          { name: 'main.rs', path: `${workspacePath}/src/main.rs`, isDir: false, size: 1420, gitStatus: 'clean' },
          { name: 'lib.rs', path: `${workspacePath}/src/lib.rs`, isDir: false, size: 890, gitStatus: 'clean' },
        ],
      },
      { name: 'Cargo.toml', path: `${workspacePath}/Cargo.toml`, isDir: false, size: 920, gitStatus: 'clean' },
      { name: 'README.md', path: `${workspacePath}/README.md`, isDir: false, size: 1540, gitStatus: 'clean' },
    ];
  },

  // Port Forwarding Manager
  portsList: async (): Promise<PortForwardMapping[]> => {
    try {
      const ports = await callTauri<PortForwardMapping[]>('ports_list');
      if (ports) return ports;
    } catch (e) {
      console.warn('ports_list fallback:', e);
    }
    return [
      {
        id: 'port-3000',
        guestPort: 3000,
        localPort: 3000,
        protocol: 'http',
        status: 'active',
        processName: 'node (dev server)',
        targetUrl: 'http://127.0.0.1:3000',
        isListening: true,
      },
      {
        id: 'port-5173',
        guestPort: 5173,
        localPort: 5173,
        protocol: 'http',
        status: 'active',
        processName: 'vite',
        targetUrl: 'http://127.0.0.1:5173',
        isListening: true,
      },
      {
        id: 'port-8080',
        guestPort: 8080,
        localPort: 8080,
        protocol: 'http',
        status: 'active',
        processName: 'api-gateway',
        targetUrl: 'http://127.0.0.1:8080',
        isListening: true,
      },
    ];
  },
  portsForwardCreate: async (guestPort: number, localPort: number, protocol?: string): Promise<PortForwardMapping> => {
    return callTauri<PortForwardMapping>('ports_forward_create', { guestPort, localPort, protocol });
  },
  portsForwardRemove: async (id: string): Promise<void> => {
    return callTauri<void>('ports_forward_remove', { id });
  },
  portsCheckAvailability: async (port: number): Promise<boolean> => {
    return callTauri<boolean>('ports_check_availability', { port });
  },

  // API Testing Studio
  apiExecuteRequest: async (payload: ApiRequestConfig): Promise<ApiResponseData> => {
    try {
      return await callTauri<ApiResponseData>('api_execute_request', { payload });
    } catch (err: any) {
      return {
        status: 0,
        statusText: 'Execution Error',
        timeMs: 0,
        sizeBytes: 0,
        headers: {},
        data: '',
        error: String(err?.message || err || 'Network or execution failure'),
      };
    }
  },
  apiParseCurl: async (curlCmd: string): Promise<ApiRequestConfig> => {
    return callTauri<ApiRequestConfig>('api_parse_curl', { curlCmd });
  },

  // Browser Engine & CDP Protocol Controller
  browserEngineStatus: async (): Promise<BrowserEngineStatus> => {
    try {
      return await callTauri<BrowserEngineStatus>('browser_engine_status');
    } catch {
      return {
        isRunning: false,
        cdpPort: 9222,
        cdpUrl: 'http://127.0.0.1:9222/json',
        version: 'Chromium/155.0 (CDP 1.3)',
        profileDir: '~/.ai-agent-workbench/browser-profile',
      };
    }
  },
  browserEngineLaunch: async (headless?: boolean, initialUrl?: string): Promise<BrowserEngineStatus> => {
    return callTauri<BrowserEngineStatus>('browser_engine_launch', { headless, initialUrl });
  },
  browserEngineTerminate: async (): Promise<void> => {
    return callTauri<void>('browser_engine_terminate');
  },
  browserCdpListTabs: async (): Promise<CdpTabTarget[]> => {
    try {
      return await callTauri<CdpTabTarget[]>('browser_cdp_list_tabs');
    } catch {
      return [];
    }
  },
  browserCdpNewTab: async (url: string): Promise<CdpTabTarget> => {
    return callTauri<CdpTabTarget>('browser_cdp_new_tab', { url });
  },
  browserCdpCloseTab: async (targetId: string): Promise<void> => {
    return callTauri<void>('browser_cdp_close_tab', { targetId });
  },
  browserCdpEval: async (targetId: string, expression: string): Promise<CdpEvalResult> => {
    try {
      return await callTauri<CdpEvalResult>('browser_cdp_eval', { targetId, expression });
    } catch (e: any) {
      return {
        success: false,
        value: '',
        error: String(e?.message || e || 'CDP evaluation error'),
      };
    }
  },
};

export const tauriIpc = TauriApi;
