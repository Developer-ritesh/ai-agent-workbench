import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import {
  Terminal as TermIcon,
  Trash2,
  Sparkles,
  RotateCcw,
  Square,
  Maximize2,
  Minimize2,
  Folder,
} from 'lucide-react';
import { TauriApi } from '../../services/tauriIpc';

interface TerminalPanelProps {
  workspaceId: string;
  workspaceName?: string;
  workspacePath?: string;
  vmStatus?: string;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  vmRotateNonce?: number;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({
  workspaceId: _workspaceId,
  workspaceName = 'callingapp',
  workspacePath,
  vmStatus: _vmStatus = 'running',
  isMaximized = false,
  onToggleMaximize,
  vmRotateNonce,
}) => {
  const [activeTab, setActiveTab] = useState<'Terminal' | 'Logs' | 'Problems' | 'Output'>('Terminal');

  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const terminalIdRef = useRef<string>(`term-${Math.random().toString(36).substring(2, 9)}`);
  const unlistenRef = useRef<(() => void) | null>(null);
  const isSpawningRef = useRef<boolean>(false);

  const sendCommand = (cmd: string) => {
    const termId = terminalIdRef.current;
    TauriApi.ptyWrite(termId, `${cmd}\r`);
    termRef.current?.focus();
  };

  const spawnTerminal = useCallback(async () => {
    if (!containerRef.current || isSpawningRef.current) return;
    isSpawningRef.current = true;

    try {
      // Clean up old terminal & kill previous PTY session
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
      if (terminalIdRef.current) {
        try {
          await TauriApi.ptyKill(terminalIdRef.current);
        } catch {}
      }
      if (termRef.current) {
        termRef.current.dispose();
        termRef.current = null;
      }

      // Small pause to allow OS and hypervisor sockets to release cleanly
      await new Promise((r) => setTimeout(r, 60));

    const termId = `term-${Math.random().toString(36).substring(2, 9)}`;
    terminalIdRef.current = termId;

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 12.5,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      lineHeight: 1.25,
      letterSpacing: 0,
      theme: {
        background: '#090d16',
        foreground: '#e6edf3',
        cursor: '#38bdf8',
        cursorAccent: '#090d16',
        selectionBackground: 'rgba(56, 189, 248, 0.35)',
        selectionInactiveBackground: 'rgba(56, 189, 248, 0.15)',
        black: '#161b22',
        red: '#f87171',
        green: '#34d399',
        yellow: '#fbbf24',
        blue: '#60a5fa',
        magenta: '#c084fc',
        cyan: '#38bdf8',
        white: '#f1f5f9',
        brightBlack: '#6b7280',
        brightRed: '#ef4444',
        brightGreen: '#10b981',
        brightYellow: '#f59e0b',
        brightBlue: '#3b82f6',
        brightMagenta: '#a855f7',
        brightCyan: '#06b6d4',
        brightWhite: '#ffffff',
      },
      convertEol: true,
      scrollback: 10000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    // Empty container before mount
    containerRef.current.innerHTML = '';
    term.open(containerRef.current);

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    try {
      fitAddon.fit();
    } catch {
      // Container might still be laying out
    }

    const containerWidth = containerRef.current.clientWidth || 1100;
    const containerHeight = containerRef.current.clientHeight || 450;
    const computedCols = Math.max(80, Math.floor(containerWidth / 8.5));
    const computedRows = Math.max(20, Math.floor(containerHeight / 17));
    const cols = term.cols > 40 ? term.cols : computedCols;
    const rows = term.rows > 10 ? term.rows : computedRows;

    // 100% Isolated Linux Guest VM (Hardware-isolated sandbox)
    await TauriApi.ptySpawn(termId, workspacePath, cols, rows);

      const unlisten = await TauriApi.listenPtyOutput(termId, (data) => {
        term.write(data);
      });
      unlistenRef.current = unlisten;

      term.onData((data) => {
        TauriApi.ptyWrite(termId, data);
      });

      term.attachCustomKeyEventHandler((e) => {
        if (e.type === 'keydown' && e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
          if (!term.hasSelection()) {
            TauriApi.ptyWrite(termId, '\x03');
            return false;
          }
        }
        return true;
      });

      term.onResize(({ cols: c, rows: r }) => {
        TauriApi.ptyResize(termId, c, r);
      });

      // Fit and sync immediately once container layout finishes
      setTimeout(() => {
        try {
          fitAddon.fit();
          TauriApi.ptyResize(termId, term.cols, term.rows);
        } catch {}
      }, 80);

      term.focus();
    } catch (err) {
      termRef.current?.writeln(`\r\n\x1b[31m[ERROR] Failed to spawn isolated Linux VM PTY: ${err}\x1b[0m\r\n`);
    } finally {
      isSpawningRef.current = false;
    }
  }, [workspacePath, workspaceName]);

  useEffect(() => {
    spawnTerminal();

    return () => {
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
      TauriApi.ptyKill(terminalIdRef.current);
      if (termRef.current) {
        termRef.current.dispose();
        termRef.current = null;
      }
    };
  }, [spawnTerminal]);

  // Re-spawn terminal cleanly whenever vmRotateNonce prop increments
  useEffect(() => {
    if (vmRotateNonce && vmRotateNonce > 0) {
      spawnTerminal();
    }
  }, [vmRotateNonce, spawnTerminal]);

  // Handle dynamic window and bottom panel resize during drag
  useEffect(() => {
    const handleRefit = () => {
      if (activeTab === 'Terminal' && fitAddonRef.current && termRef.current) {
        try {
          fitAddonRef.current.fit();
          const c = termRef.current.cols;
          const r = termRef.current.rows;
          if (c > 10 && r > 5) {
            TauriApi.ptyResize(terminalIdRef.current, c, r);
          }
        } catch {
          // Ignore
        }
      }
    };

    const ro = new ResizeObserver(() => {
      handleRefit();
    });

    if (containerRef.current) {
      ro.observe(containerRef.current);
    }

    window.addEventListener('resize', handleRefit);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', handleRefit);
    };
  }, [activeTab]);

  // Re-fit and focus when tab switches to Terminal
  useEffect(() => {
    if (activeTab === 'Terminal') {
      setTimeout(() => {
        if (fitAddonRef.current && termRef.current) {
          try {
            fitAddonRef.current.fit();
            TauriApi.ptyResize(terminalIdRef.current, termRef.current.cols, termRef.current.rows);
          } catch {
            // Ignore
          }
        }
        termRef.current?.focus();
      }, 50);
    }
  }, [activeTab]);

  // Handle maximize/restore re-fitting
  useEffect(() => {
    const timer = setTimeout(() => {
      if (fitAddonRef.current && termRef.current) {
        try {
          fitAddonRef.current.fit();
          TauriApi.ptyResize(terminalIdRef.current, termRef.current.cols, termRef.current.rows);
        } catch {
          // Ignore
        }
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [isMaximized]);

  const handleClear = () => {
    termRef.current?.clear();
    termRef.current?.focus();
  };

  const handleRestart = () => {
    TauriApi.ptyKill(terminalIdRef.current);
    spawnTerminal();
  };

  return (
    <div className="ide-bottom-panel" style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Header Bar */}
      <div className="bottom-panel-header" style={{ flexShrink: 0, gap: 10 }}>
        {/* Left Tabs */}
        <div className="bottom-panel-tabs">
          {(['Terminal', 'Logs', 'Problems', 'Output'] as const).map((tab) => (
            <div
              key={tab}
              className={`bottom-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </div>
          ))}
        </div>

        {/* Quick CLI Shortcuts (Isolated Linux Environment) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap', overflowX: 'auto', flex: 1 }}>
          {/* Main Launch Dev AI Button */}
          <button
            className="btn-quick-cmd"
            onClick={() => sendCommand('devai')}
            title="Launch interactive Dev AI TUI interface in isolated Linux VM"
            style={{
              background: 'rgba(56, 189, 248, 0.15)',
              borderColor: 'rgba(56, 189, 248, 0.4)',
              color: 'var(--accent-cyan)',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <Sparkles size={11} color="var(--accent-cyan)" />
            <span>Dev AI</span>
          </button>

          {/* Interrupt / Ctrl+C Button */}
          <button
            className="btn-quick-cmd"
            onClick={() => TauriApi.ptyWrite(terminalIdRef.current, '\x03')}
            title="Send SIGINT (Ctrl+C) to cancel or stop running command/Dev AI"
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              borderColor: 'rgba(239, 68, 68, 0.4)',
              color: '#f87171',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <Square size={11} color="#f87171" />
            <span>Ctrl+C</span>
          </button>

          <button
            className="btn-quick-cmd"
            onClick={() => sendCommand('ls -la')}
            title="List workspace files inside isolated sandbox"
            style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            <Folder size={11} color="var(--accent-cyan)" />
            <span>ls -la</span>
          </button>

          <button
            className="btn-quick-cmd"
            onClick={() => sendCommand('ip addr show eth0')}
            title="Check isolated guest VM IP address"
            style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            <span>ip addr</span>
          </button>

          <button
            className="btn-quick-cmd"
            onClick={() => sendCommand('rotate-network')}
            title="Rotate virtual MAC, IPv4 DHCP lease and IPv6 privacy address"
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              borderColor: 'rgba(16, 185, 129, 0.4)',
              color: '#34d399',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <span>Rotate IP/MAC</span>
          </button>

          <button
            className="btn-quick-cmd"
            onClick={() => sendCommand('rotate-identity')}
            title="Rotate virtual machine ID, device ID and hostname"
            style={{
              background: 'rgba(168, 85, 247, 0.15)',
              borderColor: 'rgba(168, 85, 247, 0.4)',
              color: '#c084fc',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <span>Rotate Device ID</span>
          </button>

          <button
            className="btn-quick-cmd"
            onClick={() => sendCommand('uname -a')}
            title="Verify isolated Linux aarch64 kernel"
            style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            <span>uname -a</span>
          </button>
        </div>

        {/* Right Controls: 100% Isolated Linux VM Status & Panel Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {/* Terminal Instance Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '2px 8px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-panel)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 11,
              color: 'var(--text-secondary)',
            }}
          >
            <TermIcon size={12} color="var(--accent-cyan)" />
            <span>Linux Guest VM (Isolated aarch64)</span>
          </div>

          <button
            className="btn-icon"
            title="Restart Shell Session"
            onClick={handleRestart}
          >
            <RotateCcw size={12} />
          </button>

          <button
            className="btn-icon"
            title="Clear Terminal Screen"
            onClick={handleClear}
          >
            <Trash2 size={13} />
          </button>

          {onToggleMaximize && (
            <button
              className="btn-icon"
              title={isMaximized ? 'Restore Terminal Panel Height' : 'Maximize Terminal Panel (Full Height)'}
              onClick={onToggleMaximize}
              style={{
                color: isMaximized ? 'var(--accent-cyan)' : 'inherit',
              }}
            >
              {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          )}
        </div>
      </div>

      {/* Terminal Body */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          position: 'relative',
          display: activeTab === 'Terminal' ? 'flex' : 'none',
          flexDirection: 'column',
          background: '#090d16',
        }}
        onClick={() => termRef.current?.focus()}
      >
        <div
          ref={containerRef}
          style={{
            flex: 1,
            width: '100%',
            height: '100%',
            minHeight: 0,
            overflow: 'hidden',
          }}
        />
      </div>

      {activeTab !== 'Terminal' && (
        <div style={{ padding: 14, color: 'var(--text-muted)', fontSize: 12 }}>
          {activeTab} stream is ready. Check terminal output for execution results.
        </div>
      )}
    </div>
  );
};
