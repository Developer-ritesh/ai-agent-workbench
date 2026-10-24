import React, { useState } from 'react';
import { Terminal as TerminalIcon, Play, RotateCcw } from 'lucide-react';
import { TauriApi } from '../../services/tauriIpc';

interface TerminalPanelProps {
  workspaceId: string;
  vmStatus?: string;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({ workspaceId, vmStatus: _vmStatus }) => {
  const [activeTab, setActiveTab] = useState<'shell' | 'opencode' | 'logs'>('shell');
  const [output, setOutput] = useState<string>(
    '=== macOS AI Agent Workbench Guest Terminal ===\nBoundary: Linux Guest VM (isolated via vfkit / Apple Virtualization)\nWorking directory: /workspace\nType any command or click a preset below.\n\n$ '
  );
  const [inputCmd, setInputCmd] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const executeCommand = async (cmdToRun: string) => {
    if (!cmdToRun.trim() || isRunning) return;
    const cmd = cmdToRun.trim();
    setInputCmd('');
    setOutput((prev) => prev + cmd + '\n[executing in guest VM...]\n');
    setIsRunning(true);

    try {
      const res = await TauriApi.terminalExecute(workspaceId, cmd);
      setOutput((prev) => {
        let text = prev;
        if (res.stdout) text += res.stdout;
        if (res.stderr) text += `[STDERR] ${res.stderr}`;
        text += `\n[Exit Code: ${res.exitCode}]\n$ `;
        return text;
      });
    } catch (err: any) {
      setOutput((prev) => prev + `[ERROR] ${err?.message || String(err)}\n$ `);
    } finally {
      setIsRunning(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(inputCmd);
    }
  };

  const clearTerminal = () => {
    setOutput('$ ');
  };

  return (
    <div className="terminal-window" style={{ flex: 1, minHeight: 340 }}>
      <div className="terminal-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
            <TerminalIcon size={14} color="var(--accent-cyan)" />
            <span>Linux Guest Shell</span>
          </div>

          <div className="terminal-tabs">
            <button
              className={`terminal-tab ${activeTab === 'shell' ? 'active' : ''}`}
              onClick={() => setActiveTab('shell')}
            >
              Interactive PTY
            </button>
            <button
              className={`terminal-tab ${activeTab === 'opencode' ? 'active' : ''}`}
              onClick={() => setActiveTab('opencode')}
            >
              OpenCode CLI
            </button>
            <button
              className={`terminal-tab ${activeTab === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveTab('logs')}
            >
              Guest Supervisor Logs
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={clearTerminal}
            title="Clear terminal buffer"
          >
            <RotateCcw size={12} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Preset Quick Actions */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '6px 12px',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          overflowX: 'auto',
        }}
      >
        <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Presets:
        </span>
        <button
          className="btn btn-secondary btn-sm"
          style={{ fontSize: 11, padding: '2px 8px' }}
          onClick={() => executeCommand('opencode --version')}
        >
          opencode --version
        </button>
        <button
          className="btn btn-secondary btn-sm"
          style={{ fontSize: 11, padding: '2px 8px' }}
          onClick={() => executeCommand('git status')}
        >
          git status
        </button>
        <button
          className="btn btn-secondary btn-sm"
          style={{ fontSize: 11, padding: '2px 8px' }}
          onClick={() => executeCommand('ls -la')}
        >
          ls -la
        </button>
        <button
          className="btn btn-secondary btn-sm"
          style={{ fontSize: 11, padding: '2px 8px' }}
          onClick={() => executeCommand('uname -a && cat /etc/os-release | head -n 3')}
        >
          uname -a
        </button>
      </div>

      {/* Terminal Output */}
      <div className="terminal-output" id="terminal-scroll-container">
        {output}
      </div>

      {/* Command Input Bar */}
      <div className="terminal-input-bar">
        <span style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>$</span>
        <input
          type="text"
          className="terminal-input"
          placeholder={isRunning ? 'Executing...' : 'Enter guest shell command (e.g. opencode run "add hello world function")'}
          value={inputCmd}
          onChange={(e) => setInputCmd(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isRunning}
        />
        <button
          className="btn btn-primary btn-sm"
          onClick={() => executeCommand(inputCmd)}
          disabled={isRunning || !inputCmd.trim()}
        >
          <Play size={12} />
          <span>Run</span>
        </button>
      </div>
    </div>
  );
};
