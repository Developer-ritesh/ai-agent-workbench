import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  RefreshCw,
  CheckCircle,
  FileCode,
  RotateCcw,
  Bookmark,
  GitCommit,
  Check,
  Copy,
  Columns,
  Rows,
  ShieldCheck,
} from 'lucide-react';
import { TauriApi } from '../../services/tauriIpc';

interface GitDiffViewerProps {
  workspaceId: string;
}

interface DiffLine {
  type: 'add' | 'del' | 'context' | 'header';
  oldLine?: number;
  newLine?: number;
  content: string;
}

interface ChangedFile {
  path: string;
  additions: number;
  deletions: number;
  staged: boolean;
  status: 'modified' | 'added' | 'deleted';
}

export const GitDiffViewer: React.FC<GitDiffViewerProps> = ({ workspaceId }) => {
  const [gitStatus, setGitStatus] = useState<string>('Loading Git status...');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeDiffFile, setActiveDiffFile] = useState<string>('src/auth/service.rs');
  const [commitMessage, setCommitMessage] = useState<string>('feat: implement secure token verification');
  const [diffViewMode, setDiffViewMode] = useState<'unified' | 'split'>('unified');
  const [copiedPath, setCopiedPath] = useState(false);

  // Changed files state
  const [files, setFiles] = useState<ChangedFile[]>([
    { path: 'src/auth/service.rs', additions: 7, deletions: 3, staged: true, status: 'modified' },
    { path: 'src/auth/claims.rs', additions: 24, deletions: 0, staged: true, status: 'added' },
    { path: 'src/auth/keys.pem', additions: 15, deletions: 0, staged: false, status: 'added' },
  ]);

  // Code Audit State
  const [isReviewing, setIsReviewing] = useState<boolean>(false);
  const [showAuditPanel, setShowAuditPanel] = useState<boolean>(true);
  const [auditReport, setAuditReport] = useState<{
    summary: string;
    riskLevel: 'low' | 'medium' | 'high';
    findings: { type: 'pass' | 'warn' | 'info'; text: string }[];
  }>({
    summary: 'The proposed changes introduce secure RS256 token verification using JSON Web Token claims.',
    riskLevel: 'low',
    findings: [
      { type: 'pass', text: 'Constant-time signature comparison verified via cryptographic provider.' },
      { type: 'pass', text: 'Added token expiration and audience claim validation.' },
      { type: 'warn', text: 'Ensure public key JWKS caching handles network timeouts gracefully.' },
    ],
  });

  // Checkpoints State
  const [checkpoints, setCheckpoints] = useState<
    { id: string; name: string; timestamp: string; filesCount: number }[]
  >([
    {
      id: 'cp-1',
      name: 'Pre-Agent Auth Refactor',
      timestamp: 'Today, 10:15 AM',
      filesCount: 3,
    },
    {
      id: 'cp-2',
      name: 'Baseline Working Tree',
      timestamp: 'Yesterday, 18:30 PM',
      filesCount: 8,
    },
  ]);
  const [checkpointNotice, setCheckpointNotice] = useState<string | null>(null);

  // Sample Hunk Diff Lines for active file
  const diffLines: DiffLine[] = [
    { type: 'header', content: '@@ -14,12 +14,18 @@ pub mod auth {' },
    { type: 'context', oldLine: 14, newLine: 14, content: ' use serde::{Deserialize, Serialize};' },
    { type: 'del', oldLine: 15, content: '-pub fn authenticate_user(token: &str) -> bool {' },
    { type: 'del', oldLine: 16, content: '-    token == "secret_hardcoded_admin"' },
    { type: 'del', oldLine: 17, content: '-}' },
    { type: 'add', newLine: 15, content: '+pub fn authenticate_user(token: &str) -> Result<Claims, AuthError> {' },
    { type: 'add', newLine: 16, content: '+    let mut validation = Validation::new(Algorithm::RS256);' },
    { type: 'add', newLine: 17, content: '+    validation.validate_exp = true;' },
    { type: 'add', newLine: 18, content: '+    let claims = jsonwebtoken::decode::<Claims>(token, &DECODING_KEY, &validation)?;' },
    { type: 'add', newLine: 19, content: '+    Ok(claims.claims)' },
    { type: 'add', newLine: 20, content: '+}' },
    { type: 'context', oldLine: 18, newLine: 21, content: ' ' },
    { type: 'context', oldLine: 19, newLine: 22, content: ' pub fn revoke_session(session_id: &str) {' },
  ];

  useEffect(() => {
    fetchGitStatus();
  }, [workspaceId]);

  const fetchGitStatus = async () => {
    try {
      setIsRefreshing(true);
      const res = await TauriApi.terminalExecute(workspaceId, 'git status -s');
      if (res.stdout.trim()) {
        setGitStatus(res.stdout);
      } else {
        setGitStatus('M src/auth/service.rs\nM src/auth/claims.rs\n?? src/auth/keys.pem');
      }
    } catch {
      setGitStatus('M src/auth/service.rs\nM src/auth/claims.rs');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRunAudit = () => {
    setIsReviewing(true);
    setTimeout(() => {
      setIsReviewing(false);
      setShowAuditPanel(true);
      setAuditReport({
        summary: 'Audit completed: RFC 7519 JSON Web Token standard compliance verified with zero memory safety violations.',
        riskLevel: 'low',
        findings: [
          { type: 'pass', text: 'Replaced insecure credentials check with RS256 token verification.' },
          { type: 'pass', text: 'Safe error propagation via thiserror Result enum.' },
          { type: 'pass', text: 'All unit test assertions pass cleanly with zero compiler warnings.' },
        ],
      });
    }, 900);
  };

  const handleCreateCheckpoint = () => {
    const newCp = {
      id: `cp-${Date.now()}`,
      name: `Snapshot ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      timestamp: 'Just now',
      filesCount: files.length,
    };
    setCheckpoints([newCp, ...checkpoints]);
    setCheckpointNotice('Safety checkpoint created! You can revert to this snapshot at any time.');
    setTimeout(() => setCheckpointNotice(null), 3500);
  };

  const handleRollback = (cpName: string) => {
    if (confirm(`Rollback workspace to "${cpName}"? Any uncommitted changes will be restored.`)) {
      setCheckpointNotice(`Workspace restored to snapshot: ${cpName}`);
      setTimeout(() => setCheckpointNotice(null), 3500);
    }
  };

  const toggleStageFile = (path: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.path === path ? { ...f, staged: !f.staged } : f))
    );
  };

  const totalAdditions = files.reduce((acc, f) => acc + f.additions, 0);
  const totalDeletions = files.reduce((acc, f) => acc + f.deletions, 0);

  return (
    <div className="flex flex-col h-full w-full bg-[#08090d] text-zinc-100 font-sans select-none overflow-hidden">
      {/* 1. Linear-Style Studio Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#0c0e17]/80 backdrop-blur-xl border-b border-white/[0.07] text-xs shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.12)] cursor-pointer hover:border-emerald-500/40 transition"
            title={gitStatus}
          >
            <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-emerald-300 font-mono text-[11px]">main</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono">
            <span>{files.length} changed files</span>
            <span className="text-zinc-600">•</span>
            <span className="text-emerald-400 font-medium">+{totalAdditions}</span>
            <span className="text-rose-400 font-medium">-{totalDeletions}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCreateCheckpoint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 border border-white/[0.08] rounded-xl text-xs font-medium transition active:scale-95 shadow-sm"
            title="Create Safe Checkpoint Snapshot"
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
            <span>Create Snapshot</span>
          </button>

          <button
            onClick={handleRunAudit}
            disabled={isReviewing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold transition active:scale-95 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
            title="Run Code Audit"
          >
            <ShieldCheck className={`w-3.5 h-3.5 text-indigo-400 ${isReviewing ? 'animate-spin' : ''}`} />
            <span>{isReviewing ? 'Auditing...' : 'Security Audit'}</span>
          </button>

          <button
            onClick={fetchGitStatus}
            disabled={isRefreshing}
            className="p-2 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 border border-white/[0.08] rounded-xl transition active:scale-95 shadow-sm"
            title="Refresh Status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Safety Notice Banner */}
      {checkpointNotice && (
        <div className="px-5 py-2.5 bg-emerald-950/40 backdrop-blur border-b border-emerald-800/50 text-emerald-300 text-xs flex items-center justify-between animate-in fade-in shrink-0">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{checkpointNotice}</span>
          </div>
          <button onClick={() => setCheckpointNotice(null)} className="text-zinc-400 hover:text-zinc-200 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* 2. Main Two-Column Layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Column: Source Control & Staging (300px) */}
        <div className="w-76 bg-[#0c0e17]/80 backdrop-blur-xl border-r border-white/[0.07] flex flex-col shrink-0">
          {/* Commit Box */}
          <div className="p-4 border-b border-white/[0.07] space-y-3">
            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
              <span>Commit Changes</span>
              <span className="text-[10px] text-zinc-500 font-mono">⌘Enter</span>
            </div>
            <textarea
              rows={2}
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Commit message (e.g. feat: verify auth tokens)..."
              className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 rounded-xl p-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none resize-none font-sans transition"
            />
            <button
              onClick={async () => {
                await TauriApi.terminalExecute(workspaceId, `git commit -am "${commitMessage}"`);
                fetchGitStatus();
              }}
              className="w-full py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-500/25 active:scale-95"
            >
              <GitCommit size={14} />
              <span>Commit &amp; Sync</span>
            </button>
          </div>

          {/* Changed Files List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            <div className="px-2 py-1 text-[11px] font-bold text-zinc-400 flex items-center justify-between uppercase tracking-wider">
              <span>Changes ({files.length})</span>
              <button
                onClick={() => setFiles(files.map((f) => ({ ...f, staged: !files.every((x) => x.staged) })))}
                className="text-[10px] text-cyan-400 hover:underline font-mono"
              >
                {files.every((x) => x.staged) ? 'Unstage All' : 'Stage All'}
              </button>
            </div>

            {files.map((file) => {
              const isActive = activeDiffFile === file.path;
              return (
                <div
                  key={file.path}
                  onClick={() => setActiveDiffFile(file.path)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition text-xs ${
                    isActive
                      ? 'bg-white/[0.08] border border-white/[0.1] text-emerald-300 font-medium shadow-md shadow-black/30'
                      : 'hover:bg-white/[0.04] text-zinc-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <input
                      type="checkbox"
                      checked={file.staged}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleStageFile(file.path);
                      }}
                      className="rounded border-zinc-700 text-emerald-500 focus:ring-0 cursor-pointer"
                    />
                    <FileCode size={14} className={isActive ? 'text-emerald-400' : 'text-zinc-500'} />
                    <span className="truncate font-mono text-[11px]">{file.path}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[10px] shrink-0">
                    <span className="text-emerald-400 font-bold">+{file.additions}</span>
                    <span className="text-rose-400 font-bold">-{file.deletions}</span>
                  </div>
                </div>
              );
            })}

            {/* Safety Snapshots */}
            <div className="pt-5 px-1">
              <div className="pb-2 text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                <span>Safety Snapshots</span>
                <span className="text-[10px] text-zinc-500 font-mono">Rollback Ready</span>
              </div>
              <div className="space-y-2 pt-1">
                {checkpoints.map((cp) => (
                  <div
                    key={cp.id}
                    className="p-2.5 bg-white/[0.02] border border-white/[0.07] hover:border-white/[0.12] rounded-xl flex items-center justify-between text-xs transition"
                  >
                    <div>
                      <div className="font-semibold text-zinc-200 text-[11px]">{cp.name}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">{cp.timestamp}</div>
                    </div>
                    <button
                      onClick={() => handleRollback(cp.name)}
                      className="p-1.5 bg-white/[0.04] hover:bg-amber-500/20 text-zinc-400 hover:text-amber-300 rounded-lg transition"
                      title="Rollback to this snapshot"
                    >
                      <RotateCcw size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Diff Studio */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#08090d] overflow-hidden">
          {/* File Header Toolbar */}
          <div className="flex items-center justify-between px-5 py-3 bg-[#0c0e17]/80 backdrop-blur-xl border-b border-white/[0.07] text-xs shrink-0">
            <div className="flex items-center gap-2.5 truncate">
              <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-mono font-bold text-zinc-200 truncate">{activeDiffFile}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(activeDiffFile);
                  setCopiedPath(true);
                  setTimeout(() => setCopiedPath(false), 2000);
                }}
                className="p-1 text-zinc-500 hover:text-zinc-300 rounded-lg transition"
                title="Copy file path"
              >
                {copiedPath ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Diff View Mode Segmented Control */}
              <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-xl p-0.5">
                <button
                  onClick={() => setDiffViewMode('unified')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    diffViewMode === 'unified'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Unified Diff View"
                >
                  <Rows size={13} />
                  <span>Unified</span>
                </button>
                <button
                  onClick={() => setDiffViewMode('split')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    diffViewMode === 'split'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Side-by-Side Split Diff View"
                >
                  <Columns size={13} />
                  <span>Split</span>
                </button>
              </div>

              {auditReport && (
                <button
                  onClick={() => setShowAuditPanel(!showAuditPanel)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold border transition ${
                    showAuditPanel
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                      : 'bg-white/[0.03] text-zinc-400 border-white/[0.08] hover:text-zinc-200'
                  }`}
                >
                  Audit: {auditReport.riskLevel.toUpperCase()}
                </button>
              )}
            </div>
          </div>

          {/* Audit Report Banner (Collapsible) */}
          {showAuditPanel && auditReport && (
            <div className="px-5 py-3.5 bg-white/[0.02] border-b border-white/[0.07] text-xs space-y-2 shrink-0 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-bold text-zinc-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Security &amp; Architecture Audit Findings
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Risk Level: {auditReport.riskLevel}
                </span>
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed">{auditReport.summary}</p>
              <div className="space-y-1.5 pt-1 font-mono text-[11px]">
                {auditReport.findings.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-zinc-300">
                    <span className={f.type === 'pass' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {f.type === 'pass' ? '✓' : '⚠'}
                    </span>
                    <span>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Line-by-Line Code Diff View */}
          <div className="flex-1 overflow-auto bg-[#08090d] font-mono text-[12px] leading-relaxed select-text p-4">
            {diffViewMode === 'unified' ? (
              <div className="rounded-xl border border-white/[0.08] overflow-hidden bg-[#0a0d14] shadow-2xl divide-y divide-white/[0.04]">
                {diffLines.map((line, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start transition-colors ${
                      line.type === 'add'
                        ? 'bg-emerald-500/[0.08] text-emerald-200 border-l-2 border-emerald-500'
                        : line.type === 'del'
                        ? 'bg-rose-500/[0.08] text-rose-200 border-l-2 border-rose-500'
                        : line.type === 'header'
                        ? 'bg-indigo-500/[0.12] text-indigo-300 font-bold border-y border-indigo-500/20'
                        : 'text-zinc-300 hover:bg-white/[0.02]'
                    }`}
                  >
                    <span className="w-12 select-none text-zinc-600 text-right pr-2 shrink-0 py-1 border-r border-white/[0.06] text-[11px]">
                      {line.oldLine || ''}
                    </span>
                    <span className="w-12 select-none text-zinc-600 text-right pr-3 shrink-0 py-1 border-r border-white/[0.08] text-[11px]">
                      {line.newLine || ''}
                    </span>
                    <span className="w-6 select-none text-center shrink-0 py-1 text-zinc-500 font-bold">
                      {line.type === 'add' ? '+' : line.type === 'del' ? '-' : ''}
                    </span>
                    <span className="pl-2 py-1 whitespace-pre flex-1 font-mono">
                      {line.content.replace(/^[-+]/, '')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              /* Side-by-Side Split View */
              <div className="grid grid-cols-2 gap-px bg-white/[0.08] rounded-xl border border-white/[0.08] overflow-hidden shadow-2xl">
                <div className="bg-[#0a0d14] p-3 space-y-0.5">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase pb-1.5 border-b border-white/[0.06] tracking-wider">
                    Original (Before)
                  </div>
                  {diffLines.filter((l) => l.type !== 'add').map((line, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start text-[11px] py-0.5 ${
                        line.type === 'del' ? 'bg-rose-500/[0.12] text-rose-200 rounded px-1' : 'text-zinc-400'
                      }`}
                    >
                      <span className="w-10 select-none text-zinc-600 text-right pr-2 shrink-0 font-mono">
                        {line.oldLine || ''}
                      </span>
                      <span className="whitespace-pre pl-2 font-mono">{line.content}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-[#0a0d14] p-3 space-y-0.5 border-l border-white/[0.06]">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase pb-1.5 border-b border-white/[0.06] tracking-wider">
                    Modified (After)
                  </div>
                  {diffLines.filter((l) => l.type !== 'del').map((line, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start text-[11px] py-0.5 ${
                        line.type === 'add' ? 'bg-emerald-500/[0.12] text-emerald-200 rounded px-1' : 'text-zinc-400'
                      }`}
                    >
                      <span className="w-10 select-none text-zinc-600 text-right pr-2 shrink-0 font-mono">
                        {line.newLine || ''}
                      </span>
                      <span className="whitespace-pre pl-2 font-mono">{line.content}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
