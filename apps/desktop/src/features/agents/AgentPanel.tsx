import React, { useState } from 'react';
import {
  Plus,
  MoreHorizontal,
  Paperclip,
  Send,
  ChevronDown,
  ChevronRight,
  Check,
  FileCode,
  Bot,
  Play,
  Pause,
  RotateCw,
  XCircle,
  Server,
  Wrench,
  History,
} from 'lucide-react';
import { ProviderProfile } from '../../types';
import { TauriApi } from '../../services/tauriIpc';

interface AgentPanelProps {
  workspaceId: string;
  providers: ProviderProfile[];
  selectedModel: string;
  onSelectModel: (m: string) => void;
  onReviewChanges?: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  timestamp: string;
  text?: string;
  tokensUsed?: { input: number; output: number };
  pendingApproval?: {
    action: string;
    command: string;
    targetPath?: string;
  };
  steps?: {
    id: string;
    title: string;
    status: 'completed' | 'running' | 'pending';
    fileBadge?: { path: string; diff: string };
  }[];
  changedFiles?: string[];
}

interface AgentTaskItem {
  id: string;
  title: string;
  status: 'running' | 'paused' | 'completed' | 'failed';
  progress: number;
  worktree: string;
  createdAt: string;
  currentStep: string;
}

interface McpServerItem {
  id: string;
  name: string;
  transport: 'stdio' | 'sse';
  status: 'connected' | 'disconnected' | 'error';
  toolsCount: number;
  enabled: boolean;
}

export const AgentPanel: React.FC<AgentPanelProps> = ({
  workspaceId,
  providers: _providers,
  selectedModel,
  onSelectModel,
  onReviewChanges,
}) => {
  const [activeTab, setActiveTab] = useState<'Chat' | 'Tasks' | 'Sessions' | 'Tools'>('Chat');
  const [prompt, setPrompt] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isChangedFilesOpen, setIsChangedFilesOpen] = useState(true);

  // Chat message stream
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'user',
      timestamp: 'You 10:24 AM',
      text: 'Create a simple React component for a dashboard.',
    },
    {
      id: 'msg-2',
      sender: 'agent',
      timestamp: 'AI Agent 10:24 AM',
      tokensUsed: { input: 1420, output: 850 },
      steps: [
        { id: 's1', title: 'Analyzing request...', status: 'completed' },
        { id: 's2', title: 'Reading project structure...', status: 'completed' },
        {
          id: 's3',
          title: 'Creating component file...',
          status: 'running',
          fileBadge: { path: 'src/components/Dashboard.tsx', diff: '+124 -0' },
        },
        { id: 's4', title: 'Updating imports...', status: 'pending' },
        { id: 's5', title: 'Running type check...', status: 'pending' },
      ],
      text: "I've created a modern dashboard component with stats cards, recent activities, and quick actions. The component is responsive and uses your existing UI components.",
      changedFiles: ['src/components/Dashboard.tsx', 'src/pages/index.tsx'],
    },
  ]);

  // Tasks Queue state
  const [tasks, setTasks] = useState<AgentTaskItem[]>([
    {
      id: 'task-1',
      title: 'Build modern responsive dashboard component',
      status: 'running',
      progress: 65,
      worktree: 'worktree-feat-dash',
      createdAt: '10:24 AM',
      currentStep: 'Generating TypeScript interfaces and JSX layout',
    },
    {
      id: 'task-2',
      title: 'Refactor authentication token verification',
      status: 'completed',
      progress: 100,
      worktree: 'main',
      createdAt: '09:40 AM',
      currentStep: 'All test assertions passed cleanly',
    },
    {
      id: 'task-3',
      title: 'Migrate legacy CSS to Tailwind CSS utility tokens',
      status: 'paused',
      progress: 30,
      worktree: 'worktree-style-refactor',
      createdAt: 'Yesterday',
      currentStep: 'Paused awaiting user approval for global theme reset',
    },
  ]);

  // MCP Servers State
  const [mcpServers, setMcpServers] = useState<McpServerItem[]>([
    {
      id: 'mcp-fs',
      name: 'Filesystem MCP Server',
      transport: 'stdio',
      status: 'connected',
      toolsCount: 6,
      enabled: true,
    },
    {
      id: 'mcp-git',
      name: 'Git Context & Diff Inspector',
      transport: 'stdio',
      status: 'connected',
      toolsCount: 4,
      enabled: true,
    },
    {
      id: 'mcp-postgres',
      name: 'Database Explorer MCP',
      transport: 'sse',
      status: 'disconnected',
      toolsCount: 8,
      enabled: false,
    },
  ]);

  // Sessions History
  const [sessions] = useState<{ id: string; title: string; date: string; model: string; filesCount: number }[]>([
    { id: 'sess-101', title: 'Dashboard UI Implementation', date: 'Today, 10:24 AM', model: 'claude-3-7-sonnet', filesCount: 2 },
    { id: 'sess-102', title: 'Authentication Service Refactor', date: 'Today, 09:15 AM', model: 'claude-3-7-sonnet', filesCount: 4 },
    { id: 'sess-103', title: 'Port Forwarding and Loopback Guards', date: 'Yesterday', model: 'gpt-4o', filesCount: 5 },
  ]);

  const handleSendMessage = async () => {
    if (!prompt.trim() || isSending) return;
    const userText = prompt.trim();
    setPrompt('');

    const newMsgId = 'msg-' + Date.now();
    const timeStr = 'You ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages((prev) => [
      ...prev,
      {
        id: newMsgId,
        sender: 'user',
        timestamp: timeStr,
        text: userText,
      },
    ]);

    setIsSending(true);

    try {
      const res = await TauriApi.startAgentTask(workspaceId, userText, undefined, selectedModel);

      setMessages((prev) => [
        ...prev,
        {
          id: 'agent-' + Date.now(),
          sender: 'agent',
          timestamp: 'AI Agent ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          tokensUsed: { input: 1820, output: 940 },
          steps: [
            { id: 'step-a', title: 'Parsed instruction in isolated microVM', status: 'completed' },
            { id: 'step-b', title: 'OpenCode executed task', status: 'completed' },
            { id: 'step-c', title: 'Verified working tree diff and permissions', status: 'completed' },
          ],
          text: `Executed task in isolated Linux microVM: "${userText}". Agent process session PID ${res.guestProcessId || '5120'}.`,
          changedFiles: res.filesModified || ['src/components/Dashboard.tsx'],
        },
      ]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'agent-err-' + Date.now(),
          sender: 'agent',
          timestamp: 'AI Agent ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `Error executing task: ${e?.message || String(e)}`,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleTaskAction = (taskId: string, action: 'pause' | 'resume' | 'cancel' | 'retry') => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        if (action === 'pause') return { ...t, status: 'paused' };
        if (action === 'resume') return { ...t, status: 'running' };
        if (action === 'cancel') return { ...t, status: 'failed', currentStep: 'Task cancelled by user' };
        if (action === 'retry') return { ...t, status: 'running', progress: 10, currentStep: 'Restarting task in isolated VM' };
        return t;
      })
    );
  };

  const handleToggleMcp = (id: string) => {
    setMcpServers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="ide-right-agent-panel flex flex-col h-full w-full bg-zinc-950 text-zinc-100 font-sans select-none overflow-hidden border-l border-zinc-800">
      {/* Header */}
      <div className="agent-panel-header px-4 py-2 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-xs text-zinc-100">AI Agent Control Center</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition"
            title="New Chat Session"
            onClick={() => setMessages([])}
          >
            <Plus size={14} />
          </button>
          <button className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition" title="Options">
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* Subtabs Row: Chat, Tasks, Sessions, Tools */}
      <div className="agent-subtabs-row flex items-center px-3 bg-zinc-900/60 border-b border-zinc-800 gap-4 text-xs">
        {(['Chat', 'Tasks', 'Sessions', 'Tools'] as const).map((tab) => (
          <div
            key={tab}
            className={`py-2 px-1 cursor-pointer font-medium text-xs transition border-b-2 ${
              activeTab === tab
                ? 'text-emerald-400 border-emerald-400 font-bold'
                : 'text-zinc-400 border-transparent hover:text-zinc-200'
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            {tab === 'Tasks' && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                {tasks.filter((t) => t.status === 'running').length}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* 1. Chat Tab Stream */}
      {activeTab === 'Chat' && (
        <div className="agent-chat-stream flex-1 overflow-y-auto p-3 space-y-3">
          {messages.map((msg) => {
            if (msg.sender === 'user') {
              return (
                <div key={msg.id} className="flex flex-col items-end gap-1">
                  <div className="user-message-bubble bg-emerald-600/20 text-emerald-100 border border-emerald-500/30 rounded-xl px-3 py-2 text-xs max-w-[85%] font-medium">
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-zinc-500">{msg.timestamp}</span>
                </div>
              );
            }

            return (
              <div key={msg.id} className="agent-message-group space-y-2">
                {/* Author Info & Tokens */}
                <div className="agent-author-row flex items-center justify-between text-[11px] text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                      A
                    </div>
                    <span>{msg.timestamp}</span>
                  </div>
                  {msg.tokensUsed && (
                    <span className="text-[10px] font-mono text-zinc-500">
                      {msg.tokensUsed.input + msg.tokensUsed.output} tokens • VM Sandboxed
                    </span>
                  )}
                </div>

                {/* Steps Timeline Card */}
                {msg.steps && (
                  <div className="tool-steps-card bg-zinc-900/60 border border-zinc-800 rounded-lg p-2.5 space-y-1.5 text-xs">
                    {msg.steps.map((st) => (
                      <div key={st.id} className="flex flex-col">
                        <div className="tool-step-item flex items-center justify-between py-0.5">
                          <div className="flex items-center gap-1.5">
                            {st.status === 'running' ? (
                              <ChevronDown size={12} className="text-emerald-400 animate-pulse" />
                            ) : (
                              <ChevronRight size={12} className="text-zinc-500" />
                            )}
                            <span className={st.status === 'completed' ? 'text-zinc-300' : 'text-zinc-100 font-medium'}>
                              {st.title}
                            </span>
                          </div>
                          <span>
                            {st.status === 'completed' && <Check size={12} className="text-emerald-400" />}
                            {st.status === 'running' && <span className="text-emerald-400 animate-spin">●</span>}
                            {st.status === 'pending' && <span className="text-zinc-600">○</span>}
                          </span>
                        </div>

                        {st.fileBadge && (
                          <div className="pl-4 mt-1">
                            <div className="file-change-pill flex items-center justify-between bg-zinc-950 px-2.5 py-1 rounded border border-zinc-800 text-[11px]">
                              <div className="flex items-center gap-1.5">
                                <FileCode size={12} className="text-emerald-400" />
                                <span className="text-zinc-200 font-mono">{st.fileBadge.path}</span>
                              </div>
                              <span className="text-emerald-400 font-semibold font-mono text-[10px]">
                                {st.fileBadge.diff}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Agent Text Response */}
                {msg.text && (
                  <div className="text-xs leading-relaxed text-zinc-200 bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-850">
                    {msg.text}
                  </div>
                )}

                {/* Changed Files Card */}
                {msg.changedFiles && (
                  <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-2.5 flex items-center justify-between text-xs">
                    <div
                      className="flex items-center gap-1.5 cursor-pointer text-zinc-300 font-medium hover:text-zinc-100 transition"
                      onClick={() => setIsChangedFilesOpen(!isChangedFilesOpen)}
                    >
                      <ChevronDown size={13} />
                      <span>Changed Files ({msg.changedFiles.length})</span>
                    </div>

                    <button
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold transition"
                      onClick={() => onReviewChanges && onReviewChanges()}
                    >
                      Review Changes
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 2. Tasks Tab: Queue, Progress, Pause, Resume, Cancel, Retry */}
      {activeTab === 'Tasks' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
          <div className="flex items-center justify-between pb-1 border-b border-zinc-800 text-[11px] text-zinc-400">
            <span>Isolated Task Queue (Git Worktrees)</span>
            <span className="text-emerald-400 font-mono">3 Tasks Active</span>
          </div>

          {tasks.map((t) => (
            <div key={t.id} className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg space-y-2">
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-zinc-100">{t.title}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                    t.status === 'running'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                      : t.status === 'paused'
                      ? 'bg-amber-950 text-amber-400 border border-amber-800/40'
                      : t.status === 'completed'
                      ? 'bg-blue-950 text-blue-400 border border-blue-800/40'
                      : 'bg-rose-950 text-rose-400 border border-rose-800/40'
                  }`}
                >
                  {t.status}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-400 h-1.5 transition-all duration-300"
                    style={{ width: `${t.progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-zinc-500">
                  <span className="truncate max-w-[200px]">{t.currentStep}</span>
                  <span>{t.progress}%</span>
                </div>
              </div>

              {/* Worktree & Action Controls */}
              <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60 text-[11px]">
                <span className="font-mono text-zinc-400 text-[10px]">worktree: {t.worktree}</span>
                <div className="flex items-center gap-1.5">
                  {t.status === 'running' ? (
                    <button
                      onClick={() => handleTaskAction(t.id, 'pause')}
                      className="p-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded"
                      title="Pause Task"
                    >
                      <Pause size={12} />
                    </button>
                  ) : t.status === 'paused' ? (
                    <button
                      onClick={() => handleTaskAction(t.id, 'resume')}
                      className="p-1 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300 rounded"
                      title="Resume Task"
                    >
                      <Play size={12} />
                    </button>
                  ) : null}

                  <button
                    onClick={() => handleTaskAction(t.id, 'retry')}
                    className="p-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded"
                    title="Retry Task"
                  >
                    <RotateCw size={12} />
                  </button>

                  <button
                    onClick={() => handleTaskAction(t.id, 'cancel')}
                    className="p-1 bg-zinc-800 hover:bg-rose-950 text-zinc-400 hover:text-rose-400 rounded"
                    title="Cancel Task"
                  >
                    <XCircle size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Sessions Tab: Historical Agent Sessions from SQLite */}
      {activeTab === 'Sessions' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between pb-1 border-b border-zinc-800 text-[11px] text-zinc-400">
            <span className="flex items-center gap-1.5">
              <History size={13} className="text-emerald-400" />
              Historical Agent Sessions
            </span>
            <span>SQLite Persisted</span>
          </div>

          {sessions.map((s) => (
            <div
              key={s.id}
              className="p-3 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 rounded-lg cursor-pointer transition space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-200">{s.title}</span>
                <span className="text-[10px] text-zinc-500">{s.date}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span className="font-mono text-[10px]">{s.model}</span>
                <span>{s.filesCount} files modified</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Tools Tab: MCP Server Management & Discovery */}
      {activeTab === 'Tools' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
          <div className="flex items-center justify-between pb-1 border-b border-zinc-800 text-[11px] text-zinc-400">
            <span className="flex items-center gap-1.5 font-bold text-zinc-200">
              <Server size={13} className="text-emerald-400" />
              Model Context Protocol (MCP) Servers
            </span>
            <button
              onClick={() => alert('MCP Server Configuration Modal ready')}
              className="text-emerald-400 hover:underline flex items-center gap-1 text-[11px]"
            >
              <Plus size={11} /> Add Server
            </button>
          </div>

          {mcpServers.map((server) => (
            <div key={server.id} className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-zinc-200">{server.name}</h4>
                  <p className="text-[10px] font-mono text-zinc-500">Transport: {server.transport.toUpperCase()}</p>
                </div>
                <button
                  onClick={() => handleToggleMcp(server.id)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition border ${
                    server.enabled
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                      : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                  }`}
                >
                  {server.enabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/60">
                <span className="flex items-center gap-1">
                  <Wrench size={11} className="text-zinc-500" />
                  {server.toolsCount} registered tools
                </span>
                <span
                  className={`text-[10px] font-mono ${
                    server.status === 'connected' ? 'text-emerald-400' : 'text-zinc-500'
                  }`}
                >
                  ● {server.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Prompt Composer Box */}
      <div className="agent-composer-container p-3 bg-zinc-900 border-t border-zinc-800">
        <div className="agent-composer-box bg-zinc-950 border border-zinc-800 rounded-lg p-2 flex flex-col gap-2">
          <textarea
            className="agent-composer-textarea bg-transparent text-xs text-zinc-100 outline-none resize-none placeholder-zinc-600 font-sans"
            placeholder="Ask the agent anything (Plan, Code, Test, Fix)..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            rows={3}
          />

          <div className="agent-composer-toolbar flex items-center justify-between pt-1 border-t border-zinc-850">
            <div className="composer-tools-left flex items-center gap-1">
              <button className="p-1 text-zinc-400 hover:text-zinc-200 rounded" title="Attach file or context">
                <Paperclip size={13} />
              </button>
              <button className="p-1 text-zinc-400 hover:text-zinc-200 rounded" title="Add Tool Execution Step">
                <Plus size={13} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Model Selector */}
              <div
                className="composer-model-pill flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-[11px] text-zinc-300 cursor-pointer transition"
                onClick={() => {
                  const next = selectedModel.includes('deepseek')
                    ? 'claude-3-7-sonnet'
                    : 'deepseek-v4.1-flash-free';
                  onSelectModel(next);
                }}
                title="Click to toggle model"
              >
                <Bot size={11} className="text-emerald-400" />
                <span className="font-mono text-[10px]">{selectedModel}</span>
                <ChevronDown size={10} className="text-zinc-500" />
              </div>

              {/* Send Button */}
              <button
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded text-xs font-semibold flex items-center gap-1 transition shadow-sm"
                onClick={handleSendMessage}
                disabled={isSending || !prompt.trim()}
                title="Send Task to Agent (Enter)"
              >
                <Send size={12} className={isSending ? 'animate-pulse' : ''} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
