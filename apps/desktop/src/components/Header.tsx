import React, { useState } from 'react';
import {
  Folder,
  FolderSearch,
  ChevronDown,
  RotateCw,
  Settings,
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
  theme: _theme,
  onSetTheme: _onSetTheme,
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, minWidth: 0 }}>
          {/* Spacer for native macOS traffic lights (red/yellow/green) */}
          <div className="native-traffic-spacer" data-tauri-drag-region />

          {/* Brand Icon & Title */}
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }} data-tauri-drag-region>
            <div className="app-brand-badge">A</div>
            <span className="app-brand-title">
              AI Agent Workbench
            </span>
          </div>

          {/* Workspace Dropdown Pill */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              className="topbar-pill"
              onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
              title={activeWorkspace ? `${activeWorkspace.name} (${activeWorkspace.hostProjectPath})` : 'Select Workspace'}
            >
              <Folder size={13} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
              <span className="header-workspace-name" style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeWorkspace ? activeWorkspace.name : 'masticall-in'}
              </span>
              <ChevronDown size={12} color="var(--text-muted)" style={{ flexShrink: 0 }} />
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
            style={{ flexShrink: 0 }}
          >
            <FolderSearch size={14} color="var(--accent-cyan)" />
          </button>
        </div>

        {/* Center: Unified VM Status & Rotate Action Pill (Zero Shift) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <div className={`vm-unified-pill ${!isVmRunning ? 'vm-stopped' : ''}`}>
              {/* Left: VM Status with click to toggle Start/Stop */}
              <div
                onClick={() => {
                  if (activeWorkspace) {
                    if (isVmRunning) onStopVm(activeWorkspace.id);
                    else onStartVm(activeWorkspace.id);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                title={isVmRunning ? 'VM Running (Click to Stop)' : 'VM Stopped (Click to Start)'}
              >
                <div
                  className="vm-status-dot"
                  style={{
                    backgroundColor: isVmRunning ? 'var(--status-emerald)' : '#64748b',
                    boxShadow: isVmRunning ? '0 0 8px var(--status-emerald)' : 'none',
                    animation: isVmRunning ? 'pulse-dot 2s infinite ease-in-out' : 'none',
                  }}
                />
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: 11.5,
                    color: isVmRunning ? '#34d399' : '#94a3b8',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isVmRunning ? 'VM Active' : 'VM Stopped'}
                </span>
              </div>

              {/* Subtle Vertical Divider */}
              <div
                style={{
                  width: 1,
                  height: 14,
                  background: isVmRunning ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                  flexShrink: 0,
                }}
              />

              {/* Middle: Auto-Rotate Countdown Timer (Click opens schedule dropdown) */}
              <div
                onClick={() => setIsRotateMenuOpen(!isRotateMenuOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  color: autoRotateMinutes > 0 ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  userSelect: 'none',
                }}
                title="Click to configure VM Auto-Rotation schedule"
              >
                <Clock size={11} color={autoRotateMinutes > 0 ? 'var(--accent-cyan)' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
                <span
                  style={{
                    width: 54,
                    minWidth: 54,
                    maxWidth: 54,
                    display: 'inline-block',
                    fontVariantNumeric: 'tabular-nums',
                    fontFamily: 'monospace',
                    whiteSpace: 'nowrap',
                    textAlign: 'left',
                  }}
                >
                  {autoRotateMinutes > 0 ? formatCountdown(secondsUntilRotate) : 'Off'}
                </span>
                <ChevronDown size={10} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              </div>

              {/* Subtle Vertical Divider */}
              <div
                style={{
                  width: 1,
                  height: 14,
                  background: isVmRunning ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                  flexShrink: 0,
                }}
              />

              {/* Right: Integrated Rotate VM Action Button */}
              <button
                className="vm-rotate-action-btn"
                onClick={handleManualRotate}
                disabled={isRotating || !activeWorkspace}
                title="Rotate VM immediately: purge ephemeral guest caches & refresh credentials"
              >
                <RotateCw size={11} className={isRotating ? 'spin-animation' : ''} style={{ flexShrink: 0 }} />
                <span>{isRotating ? 'Rotating...' : 'Rotate'}</span>
              </button>
            </div>

            {/* Dropdown Menu for Auto-Rotate Schedule */}
            {isRotateMenuOpen && (
              <div className="dropdown-menu" style={{ width: 230, left: '50%', transform: 'translateX(-50%)' }}>
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

        {/* Right side: Network Speed Meter + Panel Layout Toggles + Settings + Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Internet Speed Meter (Upload / Download / Latency & Retry - Fixed Zero Shift Width) */}
          <NetworkSpeedMeter />

          {/* VS Code Style Panel Layout Icons Group (Exact user screenshot match) */}
          <div className="header-panel-toggles" style={{ flexShrink: 0 }}>
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
          <button className="btn-icon" onClick={onOpenSettings} title="Settings" style={{ flexShrink: 0 }}>
            <Settings size={15} color="var(--text-secondary)" />
          </button>

          {/* User Profile Avatar Pill */}
          <div className="user-avatar-pill" title="Developer Ritesh" style={{ flexShrink: 0 }}>
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
