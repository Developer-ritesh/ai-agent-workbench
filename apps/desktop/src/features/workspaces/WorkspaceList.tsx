import React, { useState } from 'react';
import {
  Play,
  Square,
  FolderOpen,
  Trash2,
  Cpu,
  HardDrive,
  Network,
  ShieldCheck,
  Search,
  Plus,
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
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'running' | 'stopped'>('all');

  const runningCount = workspaces.filter((w) => w.status === 'running').length;
  const totalCpus = workspaces.reduce((acc, w) => acc + (w.status === 'running' ? w.config.cpuCount : 0), 0);
  const totalMem = workspaces.reduce((acc, w) => acc + (w.status === 'running' ? w.config.memoryMb : 0), 0);

  const filtered = workspaces.filter((w) => {
    const matchesSearch =
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.hostProjectPath.toLowerCase().includes(search.toLowerCase());
    if (filter === 'running') return matchesSearch && w.status === 'running';
    if (filter === 'stopped') return matchesSearch && w.status !== 'running';
    return matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '24px 32px', overflowY: 'auto' }}>
      {/* Top Banner Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div className="card">
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Workspaces
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4, color: 'var(--text-primary)' }}>
            {workspaces.length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            {runningCount} active Linux VM{runningCount === 1 ? '' : 's'}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Allocated Resources
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4, color: 'var(--accent-cyan)' }}>
            {totalCpus} vCPUs <span style={{ fontSize: 16, fontWeight: 400, color: 'var(--text-muted)' }}>/</span> {totalMem / 1024} GB
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            Apple Virtualization Framework
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Isolation Perimeter
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4, color: '#10b981', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={22} />
            <span>Enforced</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            Host shell & Keychain blocked from guest
          </div>
        </div>
      </div>

      {/* Search & Filters Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, maxWidth: 460 }}>
          <div className="form-group" style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search workspaces by name or path..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 30 }}
            />
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: 10 }} />
          </div>

          <div style={{ display: 'flex', background: 'var(--bg-surface)', padding: 3, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-panel)' }}>
            {(['all', 'running', 'stopped'] as const).map((tab) => (
              <button
                key={tab}
                className={`btn btn-sm ${filter === tab ? 'btn-primary' : ''}`}
                style={{
                  background: filter === tab ? undefined : 'transparent',
                  color: filter === tab ? undefined : 'var(--text-secondary)',
                  border: 'none',
                  textTransform: 'capitalize',
                }}
                onClick={() => setFilter(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <button className="btn btn-primary" onClick={onOpenCreateModal}>
          <Plus size={14} />
          <span>New Workspace</span>
        </button>
      </div>

      {/* Workspaces Grid */}
      {filtered.length === 0 ? (
        <div
          className="card"
          style={{
            padding: 48,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Cpu size={36} color="var(--text-muted)" />
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>No Workspaces Found</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 400 }}>
            {search ? `No workspaces matching "${search}".` : 'Create your first isolated workspace to run OpenCode coding agents inside a dedicated Linux VM.'}
          </p>
          <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={onOpenCreateModal}>
            Create Workspace
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
          {filtered.map((ws) => {
            const isRunning = ws.status === 'running';
            const isSelected = ws.id === activeWorkspaceId;

            return (
              <div
                key={ws.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  borderColor: isSelected ? 'var(--accent-primary)' : undefined,
                  boxShadow: isSelected ? '0 0 16px var(--accent-glow)' : undefined,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {ws.name}
                    </h3>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                      {ws.vmId} • {ws.imageId}
                    </div>
                  </div>
                  <StatusBadge status={ws.status} />
                </div>

                <div
                  style={{
                    background: 'var(--bg-app)',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: 11.5,
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
                <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Cpu size={13} color="var(--accent-cyan)" />
                    <span>{ws.config.cpuCount} vCPUs</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <HardDrive size={13} color="var(--accent-purple)" />
                    <span>{ws.config.memoryMb / 1024} GB RAM</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Network size={13} color="var(--status-amber)" />
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
                      <Square size={12} />
                      <span>Stop VM</span>
                    </button>
                  ) : (
                    <button
                      className="btn btn-success btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => onStartVm(ws.id)}
                    >
                      <Play size={12} />
                      <span>Start VM</span>
                    </button>
                  )}

                  <button
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1.2 }}
                    onClick={() => onSelectWorkspace(ws)}
                  >
                    <FolderOpen size={12} />
                    <span>Open in IDE</span>
                  </button>

                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ color: 'var(--status-rose)' }}
                    onClick={() => {
                      if (confirm(`Delete workspace "${ws.name}"?`)) {
                        onDeleteWorkspace(ws.id);
                      }
                    }}
                    title="Delete workspace"
                  >
                    <Trash2 size={12} />
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
