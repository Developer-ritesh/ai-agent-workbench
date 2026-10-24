import React from 'react';
import {
  FolderKanban,
  LayoutDashboard,
  Bot,
  Terminal,
  KeyRound,
  GitBranch,
  Shield,
} from 'lucide-react';

export type NavTab = 'workspaces' | 'workbench' | 'agents' | 'terminal' | 'providers' | 'git';

interface NavigationProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  hasActiveWorkspace: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  hasActiveWorkspace,
}) => {
  return (
    <aside className="app-nav">
      <div className="nav-group">
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            color: 'var(--text-muted)',
            padding: '4px 12px 8px 12px',
          }}
        >
          Navigation
        </div>

        <button
          className={`nav-item ${currentTab === 'workspaces' ? 'active' : ''}`}
          onClick={() => onSelectTab('workspaces')}
        >
          <FolderKanban className="nav-item-icon" />
          <span>Workspaces</span>
        </button>

        <button
          className={`nav-item ${currentTab === 'workbench' ? 'active' : ''}`}
          onClick={() => onSelectTab('workbench')}
          disabled={!hasActiveWorkspace}
          style={{ opacity: hasActiveWorkspace ? 1 : 0.5 }}
          title={!hasActiveWorkspace ? 'Select a workspace first' : undefined}
        >
          <LayoutDashboard className="nav-item-icon" />
          <span>Workbench IDE</span>
        </button>

        <button
          className={`nav-item ${currentTab === 'agents' ? 'active' : ''}`}
          onClick={() => onSelectTab('agents')}
        >
          <Bot className="nav-item-icon" />
          <span>Agent Sessions</span>
        </button>

        <button
          className={`nav-item ${currentTab === 'terminal' ? 'active' : ''}`}
          onClick={() => onSelectTab('terminal')}
        >
          <Terminal className="nav-item-icon" />
          <span>Guest Terminal</span>
        </button>

        <button
          className={`nav-item ${currentTab === 'git' ? 'active' : ''}`}
          onClick={() => onSelectTab('git')}
        >
          <GitBranch className="nav-item-icon" />
          <span>Git & Diff Review</span>
        </button>

        <button
          className={`nav-item ${currentTab === 'providers' ? 'active' : ''}`}
          onClick={() => onSelectTab('providers')}
        >
          <KeyRound className="nav-item-icon" />
          <span>Providers & Keychain</span>
        </button>
      </div>

      <div
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
          <Shield size={14} color="var(--accent-cyan)" />
          <span style={{ fontWeight: 600 }}>Apple Hypervisor</span>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
          vfkit backend active. Host filesystem traversal strictly prevented.
        </p>
      </div>
    </aside>
  );
};
