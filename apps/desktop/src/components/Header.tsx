import React, { useState } from 'react';
import {
  Folder,
  FolderSearch,
  ChevronDown,
  RotateCw,
  Settings,
  Sun,
  Moon,
  Plus,
  Clock,
  Key,
  ShieldCheck,
} from 'lucide-react';
import { Workspace, ThemeMode } from '../types';
import { TauriApi } from '../services/tauriIpc';
import { NetworkSpeedMeter } from './NetworkSpeedMeter';

interface HeaderProps {
  activeWorkspace: Workspace | null;
  workspaces: Workspace[];
  theme: ThemeMode;
  onSetTheme: (theme: ThemeMode) => void;
  onOpenCreateModal: () => void;
  onSelectWorkspace: (ws: Workspace) => void;
  onOpenFolder: () => void;
  onStartVm: (id: string) => void;
  onStopVm: (id: string) => void;
  onRotateVm: (id: string) => void;
  onOpenSettings: () => void;
  // Panel layout toggles (matching user's screenshot)
  showLeftSidebar: boolean;
  onToggleLeftSidebar: () => void;
  showBottomPanel: boolean;
  onToggleBottomPanel: () => void;
  isTerminalMaximized: boolean;
  onToggleTerminalMaximized: () => void;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
  // Auto-rotate settings
  autoRotateMinutes: number;
  onSetAutoRotateMinutes: (mins: number) => void;
  secondsUntilRotate: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeWorkspace,
  workspaces,
  theme,
  onSetTheme,
  onOpenCreateModal,
  onSelectWorkspace,
  onOpenFolder,
  onStartVm,
  onStopVm,
  onRotateVm,
  onOpenSettings,
  showLeftSidebar,
  onToggleLeftSidebar,
  showBottomPanel,
  onToggleBottomPanel,
  isTerminalMaximized,
  onToggleTerminalMaximized,
  isFocusMode,
  onToggleFocusMode,
  autoRotateMinutes,
  onSetAutoRotateMinutes,
  secondsUntilRotate,
}) => {
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isRotateMenuOpen, setIsRotateMenuOpen] = useState(false);
  const [isCredsModalOpen, setIsCredsModalOpen] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  const isVmRunning = activeWorkspace?.status === 'running';

  const formatCountdown = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  const handleManualRotate = async () => {
    if (!activeWorkspace || isRotating) return;
    setIsRotating(true);
    try {
      await onRotateVm(activeWorkspace.id);
    } finally {
      setIsRotating(false);
      setIsRotateMenuOpen(false);
    }
  };

  const handleMouseDown = async (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('textarea') ||
      target.closest('.topbar-pill') ||
      target.closest('.vm-status-pill') ||
      target.closest('.header-panel-toggles') ||
      target.closest('.user-avatar-pill') ||
      target.closest('.dropdown-menu')
    ) {
      return;
    }

    try {
      await TauriApi.dragWindow();
    } catch {
      // Fallback
    }
  };

  const handleDoubleClick = async (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('.topbar-pill') ||
      target.closest('.vm-status-pill') ||
      target.closest('.header-panel-toggles') ||
      target.closest('.dropdown-menu')
    ) {
      return;
    }

    try {
      await TauriApi.toggleMaximizeWindow();
    } catch {
      // Fallback
    }
  };

  return (
    <>
      <header
        className="top-toolbar"
        data-tauri-drag-region
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      >
        {/* Left side: Traffic lights spacer + Brand + Workspace / Folder Picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Spacer for native macOS traffic lights (red/yellow/green) */}
          <div className="native-traffic-spacer" data-tauri-drag-region />

          {/* Brand Icon & Title */}
          <div style={{ display: 'flex', alignItems: 'center' }} data-tauri-drag-region>
            <div className="app-brand-badge">A</div>
            <span style={{ fontWeight: 600, fontSize: 13, letterSpacing: -0.2 }}>
              AI Agent Workbench
            </span>
          </div>

          {/* Workspace Dropdown Pill */}
          <div style={{ position: 'relative' }}>
            <button
              className="topbar-pill"
              onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
            >
              <Folder size={14} color="var(--text-secondary)" />
              <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activeWorkspace ? activeWorkspace.name : 'masticall-in'}
              </span>
              <ChevronDown size={13} color="var(--text-muted)" />
            </button>

            {isWorkspaceMenuOpen && (
              <div className="dropdown-menu" style={{ width: 280 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', padding: '4px 8px' }}>
                  ACTIVE WORKSPACES
                </div>
                {workspaces.map((ws) => (
                  <div
                    key={ws.id}
                    className="dropdown-item"
                    style={{
                      background: ws.id === activeWorkspace?.id ? 'var(--bg-surface-hover)' : 'transparent',
                    }}
                    onClick={() => {
                      onSelectWorkspace(ws);
                      setIsWorkspaceMenuOpen(false);
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: ws.id === activeWorkspace?.id ? 600 : 400, fontSize: 12.5 }}>
                        {ws.name}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ws.hostProjectPath}
                      </div>
                    </div>
                    <span style={{ fontSize: 10.5, color: ws.status === 'running' ? 'var(--status-emerald)' : 'var(--text-muted)' }}>
                      {ws.status === 'running' ? '● Running' : 'Stopped'}
                    </span>
                  </div>
                ))}
                <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', justifyContent: 'center', marginBottom: 4 }}
                  onClick={() => {
                    setIsWorkspaceMenuOpen(false);
                    onOpenFolder();
                  }}
                >
                  <FolderSearch size={13} />
                  <span>Open Folder on Disk...</span>
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => {
                    setIsWorkspaceMenuOpen(false);
                    onOpenCreateModal();
                  }}
                >
                  <Plus size={13} />
                  <span>New Workspace</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Open Folder Button */}
          <button
            className="btn-icon"
            title="Open project folder from your Mac (like VS Code)"
            onClick={onOpenFolder}
          >
            <FolderSearch size={14} color="var(--accent-cyan)" />
          </button>
        </div>

        {/* Center: VM Status Pill + Auto-Rotate Countdown Pill + Rotate VM Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* VM Status Pill */}
          <div
            className="vm-status-pill"
            onClick={() => {
              if (activeWorkspace) {
                if (isVmRunning) onStopVm(activeWorkspace.id);
                else onStartVm(activeWorkspace.id);
              }
            }}
            title={isVmRunning ? 'Click to Stop Linux VM' : 'Click to Start Linux VM'}
          >
            <div
              className="vm-status-dot"
              style={{ backgroundColor: isVmRunning ? '#10b981' : '#64748b' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
              <span style={{ fontWeight: 600, color: isVmRunning ? '#10b981' : '#94a3b8' }}>
                {isVmRunning ? 'VM Running' : 'VM Stopped'}
              </span>
              <span style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>
                {activeWorkspace?.imageId || 'Ubuntu 24.04'}
              </span>
            </div>
          </div>

          {/* Rotate VM Action Button */}
          <button
            className="btn-rotate-vm"
            onClick={handleManualRotate}
            disabled={isRotating}
            title="Rotate VM immediately: purge ephemeral guest caches & refresh credentials"
          >
            <RotateCw size={13} className={isRotating ? 'spin-animation' : ''} />
            <span>Rotate VM</span>
          </button>

          {/* Auto-Rotate Countdown Pill & Config Menu */}
          <div style={{ position: 'relative' }}>
            <div
              className="auto-rotate-pill"
              onClick={() => setIsRotateMenuOpen(!isRotateMenuOpen)}
              title="Click to configure VM Auto-Rotation schedule"
            >
              <Clock size={12} color="var(--accent-cyan)" />
              <span>
                {autoRotateMinutes > 0
                  ? `Rotate: ${formatCountdown(secondsUntilRotate)}`
                  : 'Auto-Rotate Off'}
              </span>
              <ChevronDown size={11} color="var(--text-muted)" />
            </div>

            {isRotateMenuOpen && (
              <div className="dropdown-menu" style={{ width: 230, right: 0 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', padding: '4px 8px' }}>
                  AUTO-ROTATE SCHEDULE
                </div>
                {[15, 30, 60, 120, 0].map((mins) => (
                  <div
                    key={mins}
                    className="dropdown-item"
                    style={{
                      background: autoRotateMinutes === mins ? 'var(--bg-surface-hover)' : 'transparent',
                      color: autoRotateMinutes === mins ? 'var(--accent-cyan)' : 'inherit',
                      fontWeight: autoRotateMinutes === mins ? 600 : 400,
                    }}
                    onClick={() => {
                      onSetAutoRotateMinutes(mins);
                      setIsRotateMenuOpen(false);
                    }}
                  >
                    <span>{mins === 0 ? 'Disabled (Manual Only)' : `${mins} Minutes`}</span>
                    {autoRotateMinutes === mins && <span>✓</span>}
                  </div>
                ))}
                <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />
                <div
                  className="dropdown-item"
                  onClick={() => {
                    setIsRotateMenuOpen(false);
                    setIsCredsModalOpen(true);
                  }}
                >
                  <Key size={13} color="var(--accent-purple)" />
                  <span>System Credentials...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side: Network Speed Meter + Panel Layout Toggles + Settings + Theme + Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Internet Speed Meter (Upload / Download / Latency & Retry) */}
          <NetworkSpeedMeter />

          {/* VS Code Style Panel Layout Icons Group (Exact user screenshot match) */}
          <div className="header-panel-toggles">
            {/* 1. Layout / Focus mode toggle */}
            <button
              className={`header-layout-btn ${isFocusMode ? 'active' : ''}`}
              title="Toggle Full Focus Mode"
              onClick={onToggleFocusMode}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2.5" width="4.5" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                <rect x="9.5" y="2.5" width="4.5" height="4.5" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
                <rect x="9.5" y="9" width="4.5" height="4.5" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </button>

            {/* 2. Left Primary Sidebar toggle */}
            <button
              className={`header-layout-btn ${showLeftSidebar ? 'active' : ''}`}
              title="Toggle Primary Sidebar (Cmd+B)"
              onClick={onToggleLeftSidebar}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.2" />
                <line x1="6" y1="2.5" x2="6" y2="13.5" stroke="currentColor" strokeWidth="1.2" />
                {showLeftSidebar && <rect x="2.5" y="3.5" width="2.5" height="9" fill="currentColor" rx="1" />}
              </svg>
            </button>

            {/* 3. Bottom Terminal Panel toggle */}
            <button
              className={`header-layout-btn ${showBottomPanel ? 'active' : ''}`}
              title="Toggle Bottom Terminal Panel (Cmd+J)"
              onClick={onToggleBottomPanel}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.2" />
                <line x1="1.5" y1="9.5" x2="14.5" y2="9.5" stroke="currentColor" strokeWidth="1.2" />
                {showBottomPanel && <rect x="2.5" y="10.5" width="11" height="2" fill="currentColor" rx="1" />}
              </svg>
            </button>

            {/* 4. Terminal Maximized / Split view toggle */}
            <button
              className={`header-layout-btn ${isTerminalMaximized ? 'active' : ''}`}
              title="Toggle Terminal Maximized Layout"
              onClick={onToggleTerminalMaximized}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.2" />
                <line x1="10" y1="2.5" x2="10" y2="13.5" stroke="currentColor" strokeWidth="1.2" />
                {isTerminalMaximized && <rect x="11" y="3.5" width="2.5" height="9" fill="currentColor" rx="1" />}
              </svg>
            </button>
          </div>

          {/* Settings Button */}
          <button className="btn-icon" onClick={onOpenSettings} title="Settings">
            <Settings size={15} color="var(--text-secondary)" />
          </button>

          {/* Theme Toggle (Sun/Moon) */}
          <button
            className="btn-icon"
            onClick={() => onSetTheme(theme === 'dark' ? 'light' : 'dark')}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* User Profile Avatar Pill */}
          <div className="user-avatar-pill" title="Developer Ritesh">
            DR
          </div>
        </div>
      </header>

      {/* System Credentials Modal */}
      {isCredsModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsCredsModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <ShieldCheck size={20} color="var(--status-emerald)" />
              <h3 style={{ fontSize: 15, fontWeight: 600 }}>System Credentials & Security</h3>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Rotating the VM flushes volatile memory, terminates guest processes, and generates fresh session tokens for secure CLI agent isolation.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
              <div className="cred-row">
                <span style={{ color: 'var(--text-muted)' }}>Guest Token:</span>
                <span className="cred-val">tok_live_{activeWorkspace?.vmId || 'sess9812'}</span>
              </div>
              <div className="cred-row">
                <span style={{ color: 'var(--text-muted)' }}>Mount Tag:</span>
                <span className="cred-val">project (Virtio-FS isolated)</span>
              </div>
              <div className="cred-row">
                <span style={{ color: 'var(--text-muted)' }}>Auto-Rotate Interval:</span>
                <span className="cred-val">{autoRotateMinutes > 0 ? `${autoRotateMinutes} mins` : 'Disabled'}</span>
              </div>
              <div className="cred-row">
                <span style={{ color: 'var(--text-muted)' }}>Next Auto-Rotation:</span>
                <span className="cred-val">{autoRotateMinutes > 0 ? formatCountdown(secondsUntilRotate) : 'N/A'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={() => setIsCredsModalOpen(false)}>
                Close
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  handleManualRotate();
                  setIsCredsModalOpen(false);
                }}
              >
                <RotateCw size={13} />
                <span>Rotate VM & Keys Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
