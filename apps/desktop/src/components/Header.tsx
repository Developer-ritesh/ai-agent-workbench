import React from 'react';
import { Cpu, ShieldCheck, Plus, Sparkles } from 'lucide-react';
import { Workspace } from '../types';
import { StatusBadge } from './StatusBadge';

interface HeaderProps {
  activeWorkspace: Workspace | null;
  opencodeVersion: string;
  onOpenCreateModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeWorkspace,
  opencodeVersion,
  onOpenCreateModal,
}) => {
  return (
    <header className="app-header">
      <div className="header-left">
        <div className="brand-badge">
          <div className="brand-icon">
            <Cpu size={16} color="#fff" />
          </div>
          <span>macOS AI Agent Workbench</span>
        </div>

        <div className="header-divider" />

        {activeWorkspace ? (
          <div className="workspace-active-chip">
            <span style={{ color: 'var(--text-muted)' }}>Workspace:</span>
            <span style={{ color: '#fff', fontWeight: 600 }}>{activeWorkspace.name}</span>
            <StatusBadge status={activeWorkspace.status} />
          </div>
        ) : (
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>No workspace selected</span>
        )}
      </div>

      <div className="header-right">
        {/* OpenCode Version badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 12,
            color: 'var(--text-secondary)',
          }}
        >
          <Sparkles size={13} color="var(--accent-cyan)" />
          <span>{opencodeVersion || 'OpenCode Ready'}</span>
        </div>

        {/* Guest Isolation Boundary indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 12,
            color: '#34d399',
          }}
          title="Execution is strictly isolated within Linux Virtual Machine"
        >
          <ShieldCheck size={14} />
          <span>VM Sandboxed</span>
        </div>

        <button className="btn btn-primary" onClick={onOpenCreateModal}>
          <Plus size={15} />
          <span>New Workspace</span>
        </button>
      </div>
    </header>
  );
};
