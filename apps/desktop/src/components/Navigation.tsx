import React from 'react';
import {
  Files,
  Search,
  GitBranch,
  Terminal,
  Cpu,
  Cloud,
  Settings,
} from 'lucide-react';

export type ActivityTab =
  | 'explorer'
  | 'search'
  | 'git'
  | 'agent'
  | 'terminal'
  | 'vm'
  | 'providers'
  | 'settings';

interface NavigationProps {
  currentTab: ActivityTab;
  onSelectTab: (tab: ActivityTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
}) => {
  return (
    <aside className="activity-bar">
      <div className="activity-bar-group">
        <button
          className={`activity-bar-item ${currentTab === 'explorer' ? 'active' : ''}`}
          onClick={() => onSelectTab('explorer')}
          title="Explorer (Cmd+Shift+E)"
        >
          <Files size={18} />
          <span>Explorer</span>
        </button>

        <button
          className={`activity-bar-item ${currentTab === 'search' ? 'active' : ''}`}
          onClick={() => onSelectTab('search')}
          title="Search (Cmd+Shift+F)"
        >
          <Search size={18} />
          <span>Search</span>
        </button>

        <button
          className={`activity-bar-item ${currentTab === 'git' ? 'active' : ''}`}
          onClick={() => onSelectTab('git')}
          title="Source Control (Cmd+Shift+G)"
        >
          <GitBranch size={18} />
          <span>Source Control</span>
        </button>



        <button
          className={`activity-bar-item ${currentTab === 'terminal' ? 'active' : ''}`}
          onClick={() => onSelectTab('terminal')}
          title="Terminal (Cmd+`)"
        >
          <Terminal size={18} />
          <span>Terminal</span>
        </button>

        <button
          className={`activity-bar-item ${currentTab === 'vm' ? 'active' : ''}`}
          onClick={() => onSelectTab('vm')}
          title="VM Manager"
        >
          <Cpu size={18} />
          <span>VM Manager</span>
        </button>

        <button
          className={`activity-bar-item ${currentTab === 'providers' ? 'active' : ''}`}
          onClick={() => onSelectTab('providers')}
          title="Providers & Keychain"
        >
          <Cloud size={18} />
          <span>Providers</span>
        </button>
      </div>

      <div className="activity-bar-group">
        <button
          className={`activity-bar-item ${currentTab === 'settings' ? 'active' : ''}`}
          onClick={() => onSelectTab('settings')}
          title="Settings (Cmd+,)"
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
};
