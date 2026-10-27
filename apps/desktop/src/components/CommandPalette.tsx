import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  FolderKanban,
  Play,
  Square,
  Bot,
  Terminal,
  GitBranch,
  Settings,
  Sun,
  Moon,
  Plus,
} from 'lucide-react';
import { Workspace, ThemeMode } from '../types';

interface CommandItem {
  id: string;
  title: string;
  category: 'Workspace' | 'Action' | 'Theme' | 'Navigation';
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  onSelectWorkspace: (ws: Workspace) => void;
  onOpenCreateModal: () => void;
  onStartVm: (id: string) => void;
  onStopVm: (id: string) => void;
  onNavigate: (tab: string) => void;
  onSetTheme: (theme: ThemeMode) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  workspaces,
  activeWorkspace,
  onSelectWorkspace,
  onOpenCreateModal,
  onStartVm,
  onStopVm,
  onNavigate,
  onSetTheme,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const commands: CommandItem[] = [
    // General Actions
    {
      id: 'create-ws',
      title: 'Create New Workspace',
      category: 'Action',
      icon: <Plus size={15} color="var(--accent-primary)" />,
      shortcut: 'Cmd+N',
      action: () => {
        onClose();
        onOpenCreateModal();
      },
    },
    ...(activeWorkspace
      ? [
          activeWorkspace.status === 'running'
            ? {
                id: 'stop-vm',
                title: `Stop VM (${activeWorkspace.name})`,
                category: 'Action' as const,
                icon: <Square size={15} color="var(--status-danger)" />,
                action: () => {
                  onClose();
                  onStopVm(activeWorkspace.id);
                },
              }
            : {
                id: 'start-vm',
                title: `Start VM (${activeWorkspace.name})`,
                category: 'Action' as const,
                icon: <Play size={15} color="var(--status-success)" />,
                action: () => {
                  onClose();
                  onStartVm(activeWorkspace.id);
                },
              },
        ]
      : []),
    // Navigation
    {
      id: 'nav-workspaces',
      title: 'Go to Workspaces Dashboard',
      category: 'Navigation',
      icon: <FolderKanban size={15} />,
      shortcut: 'Cmd+1',
      action: () => {
        onClose();
        onNavigate('workspaces');
      },
    },
    {
      id: 'nav-workbench',
      title: 'Go to Coding Workbench IDE',
      category: 'Navigation',
      icon: <Bot size={15} />,
      shortcut: 'Cmd+2',
      action: () => {
        onClose();
        onNavigate('workbench');
      },
    },
    {
      id: 'nav-terminal',
      title: 'Open Isolated Linux Terminal',
      category: 'Navigation',
      icon: <Terminal size={15} />,
      shortcut: 'Cmd+3',
      action: () => {
        onClose();
        onNavigate('terminal');
      },
    },
    {
      id: 'nav-git',
      title: 'Open Git & Diff Review',
      category: 'Navigation',
      icon: <GitBranch size={15} />,
      shortcut: 'Cmd+4',
      action: () => {
        onClose();
        onNavigate('git');
      },
    },
    {
      id: 'nav-browser',
      title: 'Open Integrated Browser Workspace',
      category: 'Navigation',
      icon: <FolderKanban size={15} />,
      shortcut: 'Cmd+5',
      action: () => {
        onClose();
        onNavigate('browser');
      },
    },
    {
      id: 'nav-api',
      title: 'Open API Testing Studio',
      category: 'Navigation',
      icon: <Bot size={15} />,
      shortcut: 'Cmd+6',
      action: () => {
        onClose();
        onNavigate('api');
      },
    },
    {
      id: 'nav-tests',
      title: 'Open Automatic Testing Engine',
      category: 'Navigation',
      icon: <Terminal size={15} />,
      shortcut: 'Cmd+7',
      action: () => {
        onClose();
        onNavigate('tests');
      },
    },
    {
      id: 'nav-ports',
      title: 'Open Port Forwarding Manager',
      category: 'Navigation',
      icon: <Settings size={15} />,
      shortcut: 'Cmd+8',
      action: () => {
        onClose();
        onNavigate('ports');
      },
    },
    {
      id: 'nav-diagnostics',
      title: 'Open Unified Diagnostics & Logs',
      category: 'Navigation',
      icon: <Settings size={15} />,
      shortcut: 'Cmd+9',
      action: () => {
        onClose();
        onNavigate('diagnostics');
      },
    },
    {
      id: 'nav-settings',
      title: 'Open Settings & Dev AI Cleanup',
      category: 'Navigation',
      icon: <Settings size={15} />,
      shortcut: 'Cmd+,',
      action: () => {
        onClose();
        onNavigate('settings');
      },
    },
    // Theme options
    {
      id: 'theme-dark',
      title: 'Switch Appearance: Dark Mode',
      category: 'Theme',
      icon: <Moon size={15} />,
      action: () => {
        onClose();
        onSetTheme('dark');
      },
    },
    {
      id: 'theme-light',
      title: 'Switch Appearance: Light Mode',
      category: 'Theme',
      icon: <Sun size={15} />,
      action: () => {
        onClose();
        onSetTheme('light');
      },
    },
    // Workspaces
    ...workspaces.map((ws) => ({
      id: `ws-${ws.id}`,
      title: `Switch Workspace: ${ws.name}`,
      category: 'Workspace' as const,
      icon: <FolderKanban size={15} color={ws.id === activeWorkspace?.id ? 'var(--accent-primary)' : undefined} />,
      action: () => {
        onClose();
        onSelectWorkspace(ws);
      },
    })),
  ];

  const filtered = commands.filter((cmd) =>
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    }
  };

  return (
    <div className="cmd-palette-backdrop" onClick={onClose}>
      <div className="cmd-palette-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cmd-palette-input-box">
          <Search size={18} color="var(--text-muted)" />
          <input
            ref={inputRef}
            type="text"
            className="cmd-palette-input"
            placeholder="Type a command or search workspaces (e.g. 'start', 'theme', 'git')..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <span className="cmd-k-kbd">ESC to close</span>
        </div>

        <div className="cmd-palette-list">
          {filtered.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No commands or workspaces found matching "{query}"
            </div>
          ) : (
            filtered.map((item, idx) => (
              <div
                key={item.id}
                className={`cmd-palette-item ${idx === selectedIndex ? 'selected' : ''}`}
                onClick={item.action}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {item.icon}
                  <span style={{ fontWeight: 500 }}>{item.title}</span>
                  <span
                    style={{
                      fontSize: 10.5,
                      padding: '1px 6px',
                      borderRadius: 4,
                      background: 'var(--bg-surface-elevated)',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: 0.4,
                    }}
                  >
                    {item.category}
                  </span>
                </div>
                {item.shortcut && <span className="cmd-k-kbd">{item.shortcut}</span>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
