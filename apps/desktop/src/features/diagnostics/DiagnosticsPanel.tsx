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
  Sparkles,
} from 'lucide-react';
import { DiagnosticLogEntry } from '../../types';

interface DiagnosticsPanelProps {
  onSendToAgent?: (prompt: string) => void;
}

export const DiagnosticsPanel: React.FC<DiagnosticsPanelProps> = ({ onSendToAgent }) => {
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

  const handleDiagnoseWithAI = () => {
    if (!onSendToAgent) return;
    const errorsAndWarns = logs.filter((l) => l.level === 'error' || l.level === 'warn');
    const sanitized = errorsAndWarns
      .map((l) => `[${l.source}] ${l.message}\n${l.details || ''}`)
      .join('\n---\n');

    onSendToAgent(
      `[AI System Diagnosis Request]\nPlease review the following runtime system and browser diagnostics collected across the microVM, frontend, and API clients:\n\n${sanitized}\n\nAnalyze the primary root causes, check for potential cascading failures or security boundary violations, and propose specific code or configuration remedies.`
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-100 font-sans select-none overflow-hidden">
      {/* Top Header */}
      <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-zinc-100">Unified System Diagnostics</h1>
            <p className="text-xs text-zinc-400">
              Aggregated telemetry across microVM supervisor, Tauri IPC, browser console, and agent tasks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDiagnoseWithAI}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Diagnose with AI</span>
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border border-zinc-700 rounded-lg text-xs transition"
            title="Copy Logs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleClear}
            className="p-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-400 hover:text-rose-400 border border-zinc-700 rounded-lg text-xs transition"
            title="Clear Logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="flex-1 flex items-center bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-zinc-500 mr-2" />
          <input
            type="text"
            placeholder="Search error messages or sources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-zinc-200 outline-none placeholder-zinc-600 font-mono"
          />
        </div>

        {/* Level Filters */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSelectedLevel('all')}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
              selectedLevel === 'all'
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            All ({logs.length})
          </button>
          <button
            onClick={() => setSelectedLevel('error')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition ${
              selectedLevel === 'error'
                ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                : 'text-rose-400 hover:bg-rose-950/40'
            }`}
          >
            <AlertCircle className="w-3 h-3" />
            <span>Errors ({errorCount})</span>
          </button>
          <button
            onClick={() => setSelectedLevel('warn')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition ${
              selectedLevel === 'warn'
                ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                : 'text-amber-400 hover:bg-amber-950/40'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Warnings ({warnCount})</span>
          </button>
          <button
            onClick={() => setSelectedLevel('info')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition ${
              selectedLevel === 'info'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                : 'text-emerald-400 hover:bg-emerald-950/40'
            }`}
          >
            <Info className="w-3 h-3" />
            <span>Info ({infoCount})</span>
          </button>
        </div>

        {/* Source Dropdown */}
        <div className="flex items-center gap-1">
          <span className="text-zinc-500 text-[11px]">Source:</span>
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 outline-none"
          >
            <option value="all">All Subsystems</option>
            <option value="vm">MicroVM</option>
            <option value="tauri">Tauri Supervisor</option>
            <option value="ports">Ports Forwarder</option>
            <option value="api">API Studio</option>
            <option value="browser">Integrated Browser</option>
            <option value="agent">AI Agent</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1.5">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500">
            <Activity className="w-8 h-8 mb-2 opacity-30 text-emerald-400" />
            <p>No diagnostic events match current filter criteria.</p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className={`p-2.5 rounded-lg border-l-4 transition ${
                log.level === 'error'
                  ? 'bg-rose-950/20 border-rose-500 text-rose-200'
                  : log.level === 'warn'
                  ? 'bg-amber-950/20 border-amber-500 text-amber-200'
                  : 'bg-zinc-900/50 border-emerald-500/60 text-zinc-300'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">{log.timestamp}</span>
                  <span
                    className={`uppercase font-bold px-1.5 py-0.2 rounded text-[10px] ${
                      log.level === 'error'
                        ? 'bg-rose-900/60 text-rose-300'
                        : log.level === 'warn'
                        ? 'bg-amber-900/60 text-amber-300'
                        : 'bg-emerald-900/60 text-emerald-300'
                    }`}
                  >
                    {log.level}
                  </span>
                  <span className="text-zinc-400 px-1.5 py-0.2 rounded bg-zinc-800 text-[10px]">
                    {log.source.toUpperCase()}
                  </span>
                </div>
              </div>
              <p className="text-zinc-100 font-medium">{log.message}</p>
              {log.details && (
                <pre className="mt-2 p-2 bg-black/40 rounded text-[10px] text-zinc-400 whitespace-pre-wrap">
                  {log.details}
                </pre>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
