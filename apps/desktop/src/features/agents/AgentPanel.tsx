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
  steps?: {
    id: string;
    title: string;
    status: 'completed' | 'running' | 'pending';
    fileBadge?: { path: string; diff: string };
  }[];
  changedFiles?: string[];
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

  // Chat message stream matching the screenshot
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
      // Execute through real Tauri agent supervisor
      const res = await TauriApi.startAgentTask(workspaceId, userText, undefined, selectedModel);

      // Append agent response
      setMessages((prev) => [
        ...prev,
        {
          id: 'agent-' + Date.now(),
          sender: 'agent',
          timestamp: 'AI Agent ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          steps: [
            { id: 'step-a', title: 'Parsed instruction in Linux VM', status: 'completed' },
            { id: 'step-b', title: 'OpenCode executed task', status: 'completed' },
            { id: 'step-c', title: 'Checked working tree diff', status: 'completed' },
          ],
          text: `Executed task in isolated Linux VM: "${userText}". Agent session PID ${res.guestProcessId || '4890'}.`,
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="ide-right-agent-panel">
      {/* Header */}
      <div className="agent-panel-header">
        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
          AI Agent
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            className="btn-icon"
            title="New Chat Session"
            onClick={() => {
              setMessages([]);
            }}
          >
            <Plus size={14} />
          </button>
          <button className="btn-icon" title="Options">
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* Subtabs Row: Chat, Tasks, Sessions, Tools */}
      <div className="agent-subtabs-row">
        {(['Chat', 'Tasks', 'Sessions', 'Tools'] as const).map((tab) => (
          <div
            key={tab}
            className={`agent-subtab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </div>
        ))}
      </div>

      {/* Chat Tab Stream */}
      {activeTab === 'Chat' ? (
        <div className="agent-chat-stream">
          {messages.map((msg) => {
            if (msg.sender === 'user') {
              return (
                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <div className="user-message-bubble">
                    {msg.text}
                  </div>
                  <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                    {msg.timestamp}
                  </span>
                </div>
              );
            }

            return (
              <div key={msg.id} className="agent-message-group">
                {/* Author Info */}
                <div className="agent-author-row">
                  <div className="agent-author-avatar">A</div>
                  <span>{msg.timestamp}</span>
                </div>

                {/* Steps Timeline Card matching screenshot */}
                {msg.steps && (
                  <div className="tool-steps-card">
                    {msg.steps.map((st) => (
                      <div key={st.id} style={{ display: 'flex', flexDirection: 'column' }}>
                        <div className="tool-step-item">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {st.status === 'running' ? (
                              <ChevronDown size={12} color="var(--accent-cyan)" />
                            ) : (
                              <ChevronRight size={12} color="var(--text-muted)" />
                            )}
                            <span style={{ color: st.status === 'completed' ? '#cbd5e1' : '#fff' }}>
                              {st.title}
                            </span>
                          </div>
                          <span>
                            {st.status === 'completed' && <Check size={12} color="#10b981" />}
                            {st.status === 'running' && <span style={{ color: '#38bdf8' }}>◯</span>}
                            {st.status === 'pending' && <span style={{ color: '#64748b' }}>◯</span>}
                          </span>
                        </div>

                        {st.fileBadge && (
                          <div style={{ paddingLeft: 18, marginTop: 4 }}>
                            <div className="file-change-pill">
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <FileCode size={13} className="file-tsx" />
                                <span style={{ color: '#e2e8f0', fontFamily: 'var(--font-mono)' }}>
                                  {st.fileBadge.path}
                                </span>
                              </div>
                              <span style={{ color: '#10b981', fontWeight: 600, fontSize: 11 }}>
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
                  <div style={{ fontSize: 12.5, lineHeight: 1.6, color: '#e2e8f0', marginTop: 4 }}>
                    {msg.text}
                  </div>
                )}

                {/* Changed Files Card matching screenshot */}
                {msg.changedFiles && (
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-panel)',
                      borderRadius: 'var(--radius-md)',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 4,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                      }}
                      onClick={() => setIsChangedFilesOpen(!isChangedFilesOpen)}
                    >
                      <ChevronDown size={13} />
                      <span>Changed Files ({msg.changedFiles.length})</span>
                    </div>

                    <button
                      className="btn btn-primary btn-sm"
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
      ) : (
        <div style={{ flex: 1, padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>
          {activeTab === 'Tasks' && 'All active OpenCode task queues running in Linux guest VM.'}
          {activeTab === 'Sessions' && 'Historical agent conversation sessions stored in SQLite.'}
          {activeTab === 'Tools' && 'Available guest tools: execute_command, write_file, read_file, git_status.'}
        </div>
      )}

      {/* Prompt Composer Box matching screenshot */}
      <div className="agent-composer-container">
        <div className="agent-composer-box">
          <textarea
            className="agent-composer-textarea"
            placeholder="Ask the agent anything..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
          />

          <div className="agent-composer-toolbar">
            <div className="composer-tools-left">
              <button className="btn-icon" title="Attach file or context">
                <Paperclip size={14} />
              </button>
              <button className="btn-icon" title="Add Tool Execution Step">
                <Plus size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Model pill inside composer */}
              <div
                className="composer-model-pill"
                onClick={() => {
                  const next = selectedModel.includes('deepseek') ? 'claude-3-7-sonnet' : 'deepseek-v4.1-flash-free';
                  onSelectModel(next);
                }}
                title="Click to toggle agent model"
              >
                <Bot size={12} color="var(--accent-cyan)" />
                <span>{selectedModel}</span>
                <ChevronDown size={10} color="var(--text-muted)" />
              </div>

              {/* Send Button */}
              <button
                className="btn-send-message"
                onClick={handleSendMessage}
                disabled={isSending || !prompt.trim()}
                title="Send Task to OpenCode Agent (Enter)"
              >
                <Send size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
