import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  AlertCircle,
  Info,
  Search,
  Trash2,
  Copy,
  Check,
} from 'lucide-react';
import { DiagnosticLogEntry } from '../../types';

interface DiagnosticsPanelProps {
  onSendToAgent?: (prompt: string) => void;
}

export const DiagnosticsPanel: React.FC<DiagnosticsPanelProps> = () => {
  const [logs, setLogs] = useState<DiagnosticLogEntry[]>([
    {
      id: 'diag-1',
      timestamp: new Date(Date.now() - 120000).toLocaleTimeString(),
      level: 'info',
      source: 'vm',
      message: 'Linux microVM hypervisor started via vfkit (PID: 4912, 4 vCPUs, 4096MB RAM)',
    },
    {
      id: 'diag-2',
      timestamp: new Date(Date.now() - 90000).toLocaleTimeString(),
      level: 'info',
      source: 'tauri',
      message: 'Virtio-fs shared mount established at /Users/developer/Projects -> /workspace',
    },
    {
      id: 'diag-3',
      timestamp: new Date(Date.now() - 60000).toLocaleTimeString(),
      level: 'info',
      source: 'ports',
      message: 'Detected listening TCP dev server on 127.0.0.1:5173 (vite)',
    },
    {
      id: 'diag-4',
      timestamp: new Date(Date.now() - 30000).toLocaleTimeString(),
      level: 'warn',
      source: 'api',
      message: 'SSRF guard blocked request to prohibited destination: 169.254.169.254',
    },
    {
      id: 'diag-5',
      timestamp: new Date().toLocaleTimeString(),
      level: 'error',
      source: 'browser',
      message: 'Uncaught TypeError: Cannot read properties of undefined (reading "map") at ProductList.tsx:42',
      details: 'Stack trace:\n  at ProductList.tsx:42:18\n  at renderWithHooks (react-dom.js:14985)\n  at mountIndeterminateComponent',
    },
  ]);

  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const errorCount = logs.filter((l) => l.level === 'error').length;
  const warnCount = logs.filter((l) => l.level === 'warn').length;
  const infoCount = logs.filter((l) => l.level === 'info').length;

  const filteredLogs = logs.filter((log) => {
    if (selectedSource !== 'all' && log.source !== selectedSource) return false;
    if (selectedLevel !== 'all' && log.level !== selectedLevel) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.message.toLowerCase().includes(q) ||
        log.source.toLowerCase().includes(q) ||
        (log.details && log.details.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleCopy = () => {
    const text = filteredLogs
      .map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.source}] ${l.message}${l.details ? `\n${l.details}` : ''}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setLogs([]);
  };


  return (
    <div
      className="diagnostics-panel-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        background: 'var(--bg-app)',
        color: 'var(--text-primary)',
        padding: '24px 28px',
        overflowY: 'auto',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 16,
          borderBottom: '1px solid var(--border-panel)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              padding: 8,
              background: 'rgba(56, 189, 248, 0.1)',
              color: 'var(--accent-cyan)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Activity size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Unified System Diagnostics
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
              Aggregated telemetry across microVM supervisor, Tauri IPC, browser console, and background tasks
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={handleCopy} className="btn btn-secondary btn-sm" title="Copy Logs">
            {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
            <span>Copy</span>
          </button>
          <button onClick={handleClear} className="btn btn-secondary btn-sm" title="Clear Logs">
            <Trash2 size={14} color="#f87171" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '12px 0',
          borderBottom: '1px solid var(--border-panel)',
          flexShrink: 0,
          flexWrap: 'wrap',
        }}
      >
        {/* Search Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--bg-input)',
            border: '1px solid var(--border-panel)',
            borderRadius: 'var(--radius-sm)',
            padding: '5px 10px',
            width: 320,
          }}
        >
          <Search size={14} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search error messages or sources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              fontSize: 12,
              color: 'var(--text-primary)',
              width: '100%',
              outline: 'none',
              boxShadow: 'none',
            }}
          />
        </div>

        {/* Level Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setSelectedLevel('all')}
            className={`btn btn-sm ${selectedLevel === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 11, padding: '4px 10px', borderRadius: 'var(--radius-full)' }}
          >
            All ({logs.length})
          </button>
          <button
            onClick={() => setSelectedLevel('error')}
            className={`btn btn-sm ${selectedLevel === 'error' ? 'btn-danger' : 'btn-secondary'}`}
            style={{
              fontSize: 11,
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              color: selectedLevel === 'error' ? '#f87171' : undefined,
            }}
          >
            <AlertCircle size={12} color="#f87171" />
            <span>Errors ({errorCount})</span>
          </button>
          <button
            onClick={() => setSelectedLevel('warn')}
            className={`btn btn-sm ${selectedLevel === 'warn' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              fontSize: 11,
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              color: selectedLevel === 'warn' ? '#fbbf24' : undefined,
            }}
          >
            <AlertTriangle size={12} color="#fbbf24" />
            <span>Warnings ({warnCount})</span>
          </button>
          <button
            onClick={() => setSelectedLevel('info')}
            className={`btn btn-sm ${selectedLevel === 'info' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              fontSize: 11,
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              color: selectedLevel === 'info' ? '#38bdf8' : undefined,
            }}
          >
            <Info size={12} color="#38bdf8" />
            <span>Info ({infoCount})</span>
          </button>
        </div>

        {/* Source Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Source:</span>
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            style={{
              fontSize: 11.5,
              padding: '4px 8px',
              background: 'var(--bg-surface)',
              borderColor: 'var(--border-panel)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <option value="all">All Subsystems</option>
            <option value="vm">MicroVM</option>
            <option value="tauri">Tauri Supervisor</option>
            <option value="ports">Ports Forwarder</option>
            <option value="api">API Studio</option>
            <option value="browser">Integrated Browser</option>
          </select>
        </div>
      </div>

      {/* Logs Terminal Stream */}
      <div
        style={{
          marginTop: 18,
          flex: 1,
          background: '#05070d',
          border: '1px solid #1a2234',
          borderRadius: 'var(--radius-md)',
          padding: 16,
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          lineHeight: 1.6,
          overflowY: 'auto',
          boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.6)',
        }}
      >
        {filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <Activity size={28} style={{ margin: '0 auto 8px', opacity: 0.4, color: 'var(--accent-cyan)' }} />
            <p>No diagnostic events match current filter criteria.</p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const levelColor =
              log.level === 'error'
                ? '#f87171'
                : log.level === 'warn'
                ? '#fbbf24'
                : '#38bdf8';

            const levelBg =
              log.level === 'error'
                ? 'rgba(239, 68, 68, 0.12)'
                : log.level === 'warn'
                ? 'rgba(245, 158, 11, 0.12)'
                : 'rgba(56, 189, 248, 0.08)';

            return (
              <div
                key={log.id}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  borderLeft: `3px solid ${levelColor}`,
                  background: levelBg,
                  marginBottom: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{log.timestamp}</span>
                  <span
                    style={{
                      textTransform: 'uppercase',
                      fontWeight: 700,
                      fontSize: 10,
                      padding: '1px 6px',
                      borderRadius: 4,
                      background: 'rgba(0, 0, 0, 0.35)',
                      color: levelColor,
                    }}
                  >
                    {log.level}
                  </span>
                  <span
                    style={{
                      textTransform: 'uppercase',
                      fontSize: 10,
                      padding: '1px 6px',
                      borderRadius: 4,
                      background: 'rgba(255, 255, 255, 0.06)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {log.source}
                  </span>
                </div>

                <div style={{ color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                  {log.message}
                </div>

                {log.details && (
                  <pre
                    style={{
                      marginTop: 6,
                      padding: '6px 10px',
                      background: 'rgba(0, 0, 0, 0.5)',
                      borderRadius: 4,
                      fontSize: 11,
                      color: '#94a3b8',
                      overflowX: 'auto',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {log.details}
                  </pre>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
