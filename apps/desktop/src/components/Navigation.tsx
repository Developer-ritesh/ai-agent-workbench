import React from 'react';
import {
  Files,
  Search,
  GitBranch,
  Globe,
  Send,
  FlaskConical,
  Network,
  Activity,
  Cpu,
  Cloud,
  Settings,
} from 'lucide-react';

export type ActivityTab =
  | 'explorer'
  | 'search'
  | 'git'
  | 'browser'
  | 'api'
  | 'tests'
  | 'ports'
  | 'terminal'
  | 'diagnostics'
  | 'vm'
  | 'providers'
  | 'settings';

interface NavigationProps {
  currentTab: ActivityTab;
  onSelectTab: (tab: ActivityTab) => void;
  portsCount?: number;
  testFailuresCount?: number;
  diagnosticsErrorsCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  portsCount = 0,
  testFailuresCount = 0,
  diagnosticsErrorsCount = 0,
}) => {
  return (
    <aside className="activity-bar">
      <div className="activity-bar-group">
        {/* 1. File Explorer */}
        <button
          className={`activity-bar-item ${currentTab === 'explorer' ? 'active' : ''}`}
          onClick={() => onSelectTab('explorer')}
          title="Explorer (Cmd+Shift+E)"
        >
          <Files size={18} />
          <span>Explorer</span>
        </button>

        {/* 2. Project Search */}
        <button
          className={`activity-bar-item ${currentTab === 'search' ? 'active' : ''}`}
          onClick={() => onSelectTab('search')}
          title="Search (Cmd+Shift+F)"
        >
          <Search size={18} />
          <span>Search</span>
        </button>

        {/* 3. Source Control & Git Review */}
        <button
          className={`activity-bar-item ${currentTab === 'git' ? 'active' : ''}`}
          onClick={() => onSelectTab('git')}
          title="Source Control & Git Review (Cmd+Shift+G)"
        >
          <GitBranch size={18} />
          <span>Git</span>
        </button>

        {/* 4. Integrated Browser Workspace */}
        <button
          className={`activity-bar-item ${currentTab === 'browser' ? 'active' : ''}`}
          onClick={() => onSelectTab('browser')}
          title="Integrated Browser Workspace"
        >
          <Globe size={18} />
          <span>Browser</span>
        </button>

        {/* 5. API Testing Studio */}
        <button
          className={`activity-bar-item ${currentTab === 'api' ? 'active' : ''}`}
          onClick={() => onSelectTab('api')}
          title="API Testing Studio (REST / OpenAPI)"
        >
          <Send size={18} />
          <span>API</span>
        </button>

        {/* 6. Automatic Testing Engine */}
        <button
          className={`activity-bar-item ${currentTab === 'tests' ? 'active' : ''}`}
          onClick={() => onSelectTab('tests')}
          title="Automatic Testing Engine (Playwright / Unit / Integration)"
          style={{ position: 'relative' }}
        >
          <FlaskConical size={18} />
          <span>Tests</span>
          {testFailuresCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                background: '#ef4444',
                color: '#fff',
                fontSize: 9,
                fontWeight: 700,
                borderRadius: '50%',
                width: 14,
                height: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {testFailuresCount}
            </span>
          )}
        </button>

        {/* 7. Port Forwarding Manager */}
        <button
          className={`activity-bar-item ${currentTab === 'ports' ? 'active' : ''}`}
          onClick={() => onSelectTab('ports')}
          title="Port Forwarding Manager"
          style={{ position: 'relative' }}
        >
          <Network size={18} />
          <span>Ports</span>
          {portsCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                background: 'var(--accent-cyan)',
                color: '#000',
                fontSize: 9,
                fontWeight: 700,
                borderRadius: '50%',
                width: 14,
                height: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {portsCount}
            </span>
          )}
        </button>



        {/* 9. Unified Diagnostics & Debugging */}
        <button
          className={`activity-bar-item ${currentTab === 'diagnostics' ? 'active' : ''}`}
          onClick={() => onSelectTab('diagnostics')}
          title="Unified Logs, Debugging & Diagnostics"
          style={{ position: 'relative' }}
        >
          <Activity size={18} />
          <span>Logs</span>
          {diagnosticsErrorsCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                background: '#f87171',
                color: '#fff',
                fontSize: 9,
                fontWeight: 700,
                borderRadius: '50%',
                width: 14,
                height: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {diagnosticsErrorsCount}
            </span>
          )}
        </button>

        {/* 10. VM Sandbox & Dev Environment */}
        <button
          className={`activity-bar-item ${currentTab === 'vm' ? 'active' : ''}`}
          onClick={() => onSelectTab('vm')}
          title="Linux VM Sandbox & Hardware Metrics"
        >
          <Cpu size={18} />
          <span>VM</span>
        </button>

        {/* 11. AI Providers & Keychain */}
        <button
          className={`activity-bar-item ${currentTab === 'providers' ? 'active' : ''}`}
          onClick={() => onSelectTab('providers')}
          title="Providers & Keychain Secrets"
        >
          <Cloud size={18} />
          <span>Providers</span>
        </button>
      </div>

      <div className="activity-bar-group">
        {/* 12. Settings & OpenCode Cleanup */}
        <button
          className={`activity-bar-item ${currentTab === 'settings' ? 'active' : ''}`}
          onClick={() => onSelectTab('settings')}
          title="Settings & OpenCode Sessions (Cmd+,)"
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
};
