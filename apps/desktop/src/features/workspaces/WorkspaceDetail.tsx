import React, { useState } from 'react';
import {
  Play,
  Square,
  Terminal as TermIcon,
  Bot,
  GitBranch,
} from 'lucide-react';
import { Workspace, ProviderProfile } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { TerminalPanel } from '../terminal/TerminalPanel';
import { AgentPanel } from '../agents/AgentPanel';
import { GitDiffViewer } from '../git/GitDiffViewer';

interface WorkspaceDetailProps {
  workspace: Workspace;
  providers: ProviderProfile[];
  onStartVm: (workspaceId: string) => Promise<void>;
  onStopVm: (workspaceId: string) => Promise<void>;
}

export const WorkspaceDetail: React.FC<WorkspaceDetailProps> = ({
  workspace,
  providers,
  onStartVm,
  onStopVm,
}) => {
  const [activeCenterTab, setActiveCenterTab] = useState<'agent' | 'diff' | 'files'>('agent');
  const isRunning = workspace.status === 'running';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>
      {/* Workspace Top Bar */}
      <div
        className="glass-card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600 }}>{workspace.name}</h2>
              <StatusBadge status={workspace.status} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              Mount: {workspace.hostProjectPath}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-secondary)', marginRight: 8 }}>
            <span>vCPUs: <strong style={{ color: '#fff' }}>{workspace.config.cpuCount}</strong></span>
            <span>RAM: <strong style={{ color: '#fff' }}>{workspace.config.memoryMb / 1024} GB</strong></span>
            <span>Net: <strong style={{ color: '#34d399', textTransform: 'capitalize' }}>{workspace.config.networkMode}</strong></span>
          </div>

          {isRunning ? (
            <button className="btn btn-danger btn-sm" onClick={() => onStopVm(workspace.id)}>
              <Square size={13} />
              <span>Stop VM</span>
            </button>
          ) : (
            <button className="btn btn-success btn-sm" onClick={() => onStartVm(workspace.id)}>
              <Play size={13} />
              <span>Start VM</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Split Layout: Center View + Terminal */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20, flex: 1 }}>
        {/* Tab Navigation for Center Panel */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
          <button
            className={`btn btn-sm ${activeCenterTab === 'agent' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveCenterTab('agent')}
          >
            <Bot size={14} />
            <span>OpenCode Agent</span>
          </button>
          <button
            className={`btn btn-sm ${activeCenterTab === 'diff' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveCenterTab('diff')}
          >
            <GitBranch size={14} />
            <span>Git Diffs & Changes</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeCenterTab === 'agent' && (
          <AgentPanel workspaceId={workspace.id} providers={providers} />
        )}

        {activeCenterTab === 'diff' && (
          <GitDiffViewer workspaceId={workspace.id} />
        )}

        {/* Bottom Panel: Interactive Terminal */}
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <TermIcon size={15} color="var(--accent-cyan)" />
            <span>Isolated Linux Terminal</span>
          </h3>
          <TerminalPanel workspaceId={workspace.id} vmStatus={workspace.status} />
        </div>
      </div>
    </div>
  );
};
