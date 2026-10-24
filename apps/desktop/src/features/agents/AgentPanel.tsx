import React, { useState, useEffect } from 'react';
import { Bot, Play, Square, Sparkles } from 'lucide-react';
import { AgentSession, ProviderProfile } from '../../types';
import { TauriApi } from '../../services/tauriIpc';
import { StatusBadge } from '../../components/StatusBadge';

interface AgentPanelProps {
  workspaceId: string;
  providers: ProviderProfile[];
}

export const AgentPanel: React.FC<AgentPanelProps> = ({ workspaceId, providers }) => {
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [prompt, setPrompt] = useState('');
  const [selectedProviderId, setSelectedProviderId] = useState<string>(
    providers[0]?.id || ''
  );
  const [selectedModel, setSelectedModel] = useState('claude-3-7-sonnet');
  const [isStarting, setIsStarting] = useState(false);
  const [activeSession, setActiveSession] = useState<AgentSession | null>(null);

  useEffect(() => {
    loadSessions();
  }, [workspaceId]);

  const loadSessions = async () => {
    try {
      const list = await TauriApi.listAgentSessions(workspaceId);
      setSessions(list);
      const running = list.find((s) => s.state === 'running');
      if (running) setActiveSession(running);
    } catch (e) {
      console.error('Failed to load agent sessions', e);
    }
  };

  const handleStartTask = async () => {
    if (!prompt.trim() || isStarting) return;
    try {
      setIsStarting(true);
      const session = await TauriApi.startAgentTask(
        workspaceId,
        prompt.trim(),
        selectedProviderId || undefined,
        selectedModel
      );
      setActiveSession(session);
      setSessions((prev) => [session, ...prev]);
      setPrompt('');
    } catch (err: any) {
      alert(`Error starting agent task: ${err?.message || String(err)}`);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopTask = async (sessionId: string) => {
    try {
      await TauriApi.stopAgentTask(sessionId);
      if (activeSession?.id === sessionId) {
        setActiveSession(null);
      }
      loadSessions();
    } catch (err: any) {
      alert(`Error stopping agent task: ${err?.message || String(err)}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Task Input Card */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Run OpenCode Agent Task</h3>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Linux VM Execution Boundary
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Authorized Provider Profile</label>
            <select
              className="form-input"
              value={selectedProviderId}
              onChange={(e) => setSelectedProviderId(e.target.value)}
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.providerId})
                </option>
              ))}
              {providers.length === 0 && <option value="">No provider configured</option>}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">AI Model</label>
            <select
              className="form-input"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              <option value="claude-3-7-sonnet">Claude 3.7 Sonnet (Hybrid Reasoning)</option>
              <option value="gpt-4o">GPT-4o (Standard)</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (Ultra Fast)</option>
              <option value="llama3:8b">Local Ollama Llama 3 (Offline / Zero telemetry)</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Task Instructions</label>
          <textarea
            className="form-input"
            rows={3}
            style={{ resize: 'vertical' }}
            placeholder="Describe what OpenCode should do (e.g. 'Implement a healthcheck endpoint at /api/health and verify with a curl test in the VM')"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          {activeSession && activeSession.state === 'running' ? (
            <button
              className="btn btn-danger"
              onClick={() => handleStopTask(activeSession.id)}
            >
              <Square size={14} />
              <span>Cancel Running Task</span>
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleStartTask}
              disabled={isStarting || !prompt.trim()}
            >
              <Play size={14} />
              <span>{isStarting ? 'Launching Agent...' : 'Execute Task in VM'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Task Sessions History */}
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Agent Session History</h3>
        {sessions.length === 0 ? (
          <div
            className="glass-card"
            style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}
          >
            No agent sessions recorded for this workspace yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sessions.map((sess) => (
              <div
                key={sess.id}
                className="glass-card"
                style={{
                  padding: 14,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Bot size={18} color="var(--accent-cyan)" />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
                      {sess.taskPrompt || 'Interactive Coding Task'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      Model: {sess.modelId} • Started: {new Date(sess.startedAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <StatusBadge status={sess.state} />
                  {sess.state === 'running' && (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleStopTask(sess.id)}
                    >
                      Stop
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
