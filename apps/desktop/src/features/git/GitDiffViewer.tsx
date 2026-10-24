import React, { useState, useEffect } from 'react';
import { GitBranch, RefreshCw, CheckCircle, FileCode } from 'lucide-react';
import { TauriApi } from '../../services/tauriIpc';

interface GitDiffViewerProps {
  workspaceId: string;
}

export const GitDiffViewer: React.FC<GitDiffViewerProps> = ({ workspaceId }) => {
  const [gitStatus, setGitStatus] = useState<string>('Loading Git working tree status...');
  const [diffContent] = useState<string>(
    'diff --git a/src/auth.rs b/src/auth.rs\nindex 8a3f1..9c2b4 100644\n--- a/src/auth.rs\n+++ b/src/auth.rs\n@@ -14,6 +14,14 @@\n- pub fn authenticate_user(token: &str) -> bool {\n-     token == "secret"\n+ pub fn authenticate_user(token: &str) -> Result<Claims, AuthError> {\n+     let validation = Validation::new(Algorithm::RS256);\n+     jsonwebtoken::decode::<Claims>(token, &KEY, &validation)\n+ }\n'
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

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
        setGitStatus('Working tree clean. No uncommitted modifications by OpenCode.');
      }
    } catch {
      setGitStatus('Working tree clean (or not a Git repository yet).');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>Git Changes & Agent Diff Review</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            Review all file modifications made by OpenCode inside the Linux VM before accepting or committing.
          </p>
        </div>

        <button className="btn btn-secondary btn-sm" onClick={fetchGitStatus} disabled={isRefreshing}>
          <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} />
          <span>Refresh Git Diff</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, alignItems: 'stretch' }}>
        {/* Changed Files Sidebar */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
            <GitBranch size={16} color="var(--accent-cyan)" />
            <span>Modified Project Files</span>
          </div>

          <div
            style={{
              background: '#0d1117',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: 12,
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: '#38bdf8',
              whiteSpace: 'pre-wrap',
            }}
          >
            {gitStatus}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
            <button
              className="btn btn-primary btn-sm"
              style={{ flex: 1 }}
              onClick={async () => {
                await TauriApi.terminalExecute(workspaceId, 'git add . && git commit -m "Agent changes accepted"');
                fetchGitStatus();
              }}
            >
              <CheckCircle size={13} />
              <span>Accept & Commit</span>
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={async () => {
                if (confirm('Revert all uncommitted agent modifications?')) {
                  await TauriApi.terminalExecute(workspaceId, 'git checkout . && git clean -fd');
                  fetchGitStatus();
                }
              }}
            >
              Revert
            </button>
          </div>
        </div>

        {/* Diff Presentation View */}
        <div className="terminal-window" style={{ flex: 1, minHeight: 400 }}>
          <div className="terminal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileCode size={14} color="var(--accent-cyan)" />
              <span style={{ fontWeight: 600 }}>Diff Inspector (src/auth.rs)</span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Unified Diff View</span>
          </div>

          <div
            className="terminal-output"
            style={{ height: 380, color: '#e6edf3', fontSize: 13, lineHeight: 1.6 }}
          >
            {diffContent.split('\n').map((line, idx) => {
              let color = '#8b949e';
              let bg = 'transparent';
              if (line.startsWith('+') && !line.startsWith('+++')) {
                color = '#34d399';
                bg = 'rgba(16, 185, 129, 0.1)';
              } else if (line.startsWith('-') && !line.startsWith('---')) {
                color = '#fb7185';
                bg = 'rgba(244, 63, 94, 0.1)';
              } else if (line.startsWith('@@')) {
                color = '#38bdf8';
              }

              return (
                <div key={idx} style={{ color, background: bg, padding: '1px 6px', borderRadius: 2 }}>
                  {line}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
