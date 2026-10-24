import React from 'react';
import {
  Play,
  Square,
  FolderOpen,
  Trash2,
  Cpu,
  HardDrive,
  Network,
  ShieldCheck,
} from 'lucide-react';
import { Workspace } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';

interface WorkspaceListProps {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onSelectWorkspace: (workspace: Workspace) => void;
  onStartVm: (workspaceId: string) => Promise<void>;
  onStopVm: (workspaceId: string) => Promise<void>;
  onDeleteWorkspace: (workspaceId: string) => Promise<void>;
  onOpenCreateModal: () => void;
}

export const WorkspaceList: React.FC<WorkspaceListProps> = ({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onStartVm,
  onStopVm,
  onDeleteWorkspace,
  onOpenCreateModal,
}) => {
  const runningCount = workspaces.filter((w) => w.status === 'running').length;
  const totalCpus = workspaces.reduce((acc, w) => acc + (w.status === 'running' ? w.config.cpuCount : 0), 0);
  const totalMem = workspaces.reduce((acc, w) => acc + (w.status === 'running' ? w.config.memoryMb : 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Overview Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div className="glass-card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Configured Workspaces</div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 6, color: '#fff' }}>{workspaces.length}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            {runningCount} active Linux VM{runningCount === 1 ? '' : 's'}
          </div>
        </div>

        <div className="glass-card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Active VM Resources</div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 6, color: 'var(--accent-cyan)' }}>
            {totalCpus} vCPUs <span style={{ fontSize: 16, fontWeight: 400, color: 'var(--text-muted)' }}>/</span> {totalMem / 1024} GB
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            Apple Virtualization Framework
          </div>
        </div>

        <div className="glass-card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Security Perimeter</div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 6, color: '#34d399', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={24} />
            <span>Isolated</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            Host shell & Keychain blocked from guest
          </div>
        </div>
      </div>

      {/* Header and Grid */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>Virtual Machine Workspaces</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            Dedicated Linux execution environments running OpenCode coding agents
          </p>
        </div>
        <button className="btn btn-primary" onClick={onOpenCreateModal}>
          + New Workspace
        </button>
      </div>

      {workspaces.length === 0 ? (
        <div
          className="glass-card"
          style={{
            padding: 48,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Cpu size={40} color="var(--text-muted)" />
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>No Workspaces Configured Yet</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 420 }}>
            Create an isolated workspace to mount your local project directory into a secure Linux VM and run OpenCode agents safely.
          </p>
          <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={onOpenCreateModal}>
            Create First Workspace
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 18 }}>
          {workspaces.map((ws) => {
            const isRunning = ws.status === 'running';
            const isSelected = ws.id === activeWorkspaceId;

            return (
              <div
                key={ws.id}
                className="glass-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  borderColor: isSelected ? 'rgba(56, 189, 248, 0.4)' : undefined,
                  boxShadow: isSelected ? '0 0 20px rgba(56, 189, 248, 0.15)' : undefined,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>{ws.name}</h3>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                      {ws.vmId} • {ws.imageId}
                    </div>
                  </div>
                  <StatusBadge status={ws.status} />
                </div>

                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.25)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 12,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={ws.hostProjectPath}
                >
                  <span style={{ color: 'var(--text-muted)' }}>Mount: </span>
                  {ws.hostProjectPath}
                </div>

                {/* Specs row */}
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Cpu size={14} color="var(--accent-cyan)" />
                    <span>{ws.config.cpuCount} vCPUs</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <HardDrive size={14} color="var(--accent-purple)" />
                    <span>{ws.config.memoryMb / 1024} GB RAM</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Network size={14} color="var(--accent-amber)" />
                    <span style={{ textTransform: 'capitalize' }}>{ws.config.networkMode}</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  {isRunning ? (
                    <button
                      className="btn btn-danger btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => onStopVm(ws.id)}
                    >
                      <Square size={13} />
                      <span>Stop VM</span>
                    </button>
                  ) : (
                    <button
                      className="btn btn-success btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => onStartVm(ws.id)}
                    >
                      <Play size={13} />
                      <span>Start VM</span>
                    </button>
                  )}

                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => onSelectWorkspace(ws)}
                  >
                    <FolderOpen size={13} />
                    <span>Workbench</span>
                  </button>

                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ color: '#fb7185' }}
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete workspace "${ws.name}"?`)) {
                        onDeleteWorkspace(ws.id);
                      }
                    }}
                    title="Delete workspace metadata"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
