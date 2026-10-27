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
  Globe,
} from 'lucide-react';
import { Workspace, ThemeMode, ProxyStatus } from '../types';
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
  vmRotateNonce?: number;
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
  vmRotateNonce,
}) => {
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isRotateMenuOpen, setIsRotateMenuOpen] = useState(false);
  const [isCredsModalOpen, setIsCredsModalOpen] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [proxyStatus, setProxyStatus] = useState<ProxyStatus | null>(null);
  const [isProxyMenuOpen, setIsProxyMenuOpen] = useState(false);
  const [proxyMode, setProxyMode] = useState<'auto' | 'custom'>('auto');
  const [proxyInputUrl, setProxyInputUrl] = useState('');
  const [isProxyLoading, setIsProxyLoading] = useState(false);

  React.useEffect(() => {
    TauriApi.getProxyConfig().then((cfg) => {
      if (cfg.mode === 'custom') {
        setProxyMode('custom');
        if (cfg.proxy_url) setProxyInputUrl(cfg.proxy_url);
      } else {
        setProxyMode('auto');
      }
    }).catch(() => {});

    TauriApi.testProxy().then((st) => {
      setProxyStatus(st);
      if (st.proxy_url && st.proxy_url !== 'socks5://127.0.0.1:9050') setProxyInputUrl(st.proxy_url);
    }).catch(() => {});
  }, [activeWorkspace?.id, vmRotateNonce]);

  const handleQuickSaveProxy = async (enabled: boolean, url?: string, modeParam?: 'auto' | 'custom') => {
    setIsProxyLoading(true);
    try {
      const selectedMode = modeParam || proxyMode;
      const targetUrl = selectedMode === 'auto' ? 'socks5://127.0.0.1:9050' : (url !== undefined ? url : proxyInputUrl);
      const st = await TauriApi.setProxyConfig(
        {
          enabled,
          mode: selectedMode,
          proxy_type: selectedMode === 'auto' ? 'socks5' : 'http',
          proxy_url: targetUrl,
          auto_rotate: true,
        },
        activeWorkspace?.hostProjectPath
      );
      setProxyStatus(st);
      if (st.proxy_url && selectedMode === 'custom') setProxyInputUrl(st.proxy_url);
    } finally {
      setIsProxyLoading(false);
    }
  };

  const handleQuickRotateProxy = async () => {
    setIsProxyLoading(true);
    try {
      const st = await TauriApi.rotateProxyIp(activeWorkspace?.hostProjectPath);
      setProxyStatus(st);
    } finally {
      setIsProxyLoading(false);
    }
  };

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

          {/* Outbound Proxy & IP Masking Pill */}
          <div style={{ position: 'relative' }}>
            <div
              className="topbar-pill"
              onClick={() => setIsProxyMenuOpen(!isProxyMenuOpen)}
              title={
                proxyStatus?.is_masked
                  ? `Proxy Active • Public IP Masked: ${proxyStatus.public_ip} ${proxyStatus.country ? `(${proxyStatus.country})` : ''}`
                  : `Direct Internet Connection • Physical IP Exposed: ${proxyStatus?.public_ip || '...'}`
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 'var(--radius-pill)',
                background: proxyStatus?.is_masked ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.08)',
                border: `1px solid ${proxyStatus?.is_masked ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.25)'}`,
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <Globe size={12} color={proxyStatus?.is_masked ? '#10b981' : '#f87171'} />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: proxyStatus?.is_masked ? '#34d399' : '#fca5a5',
                  whiteSpace: 'nowrap',
                }}
              >
                {proxyStatus?.is_masked ? 'IP Masked' : 'Direct IP'}
              </span>
              <ChevronDown size={10} color="var(--text-muted)" />
            </div>

            {/* Quick Proxy Dropdown */}
            {isProxyMenuOpen && (
              <div className="dropdown-menu" style={{ width: 310, left: '50%', transform: 'translateX(-50%)', padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                    PHYSICAL IP MASKING
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 4,
                      background: proxyStatus?.is_masked ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: proxyStatus?.is_masked ? '#34d399' : '#f87171',
                    }}
                  >
                    {proxyStatus?.is_masked ? 'PROTECTED' : 'EXPOSED'}
                  </div>
                </div>

                {/* Mode Selector Tabs */}
                <div style={{ display: 'flex', gap: 4, background: 'var(--bg-app)', padding: 3, borderRadius: 6, marginBottom: 10 }}>
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      padding: '4px 6px',
                      fontSize: 10.5,
                      fontWeight: proxyMode === 'auto' ? 600 : 400,
                      background: proxyMode === 'auto' ? 'var(--bg-surface)' : 'transparent',
                      color: proxyMode === 'auto' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      setProxyMode('auto');
                      if (proxyStatus?.enabled) {
                        handleQuickSaveProxy(true, undefined, 'auto');
                      }
                    }}
                  >
                    ✨ Auto (Built-in)
                  </button>
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      padding: '4px 6px',
                      fontSize: 10.5,
                      fontWeight: proxyMode === 'custom' ? 600 : 400,
                      background: proxyMode === 'custom' ? 'var(--bg-surface)' : 'transparent',
                      color: proxyMode === 'custom' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                    }}
                    onClick={() => setProxyMode('custom')}
                  >
                    Custom URL
                  </button>
                </div>

                {/* Auto Mode Panel */}
                {proxyMode === 'auto' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ background: 'var(--bg-app)', padding: '8px 10px', borderRadius: 6, fontSize: 11, border: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Public IP:</span>
                        <strong style={{ color: proxyStatus?.is_masked ? '#34d399' : '#f87171' }}>
                          {proxyStatus?.public_ip || 'Checking...'}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Location:</span>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                          {proxyStatus?.country || (proxyStatus?.is_masked ? 'International' : 'Physical ISP')}
                        </span>
                      </div>
                    </div>

                    <div style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      {proxyStatus?.is_masked
                        ? '✓ All microVM traffic routes through internal privacy circuits. OpenCode sees this masked IP.'
                        : '⚠️ Your real Wi-Fi IP is exposed, causing OpenCode cloud rate limits.'}
                    </div>

                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      {proxyStatus?.enabled && proxyStatus?.is_masked ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}
                            disabled={isProxyLoading}
                            onClick={handleQuickRotateProxy}
                            title="Instantly switch to a brand new international IP"
                          >
                            <RotateCw size={12} className={isProxyLoading ? 'spin-animation' : ''} />
                            <span>{isProxyLoading ? 'Rotating...' : 'Rotate IP Now'}</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: 11 }}
                            disabled={isProxyLoading}
                            onClick={() => handleQuickSaveProxy(false, undefined, 'auto')}
                          >
                            Disable
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1, justifyContent: 'center', fontSize: 11, padding: '6px 12px' }}
                          disabled={isProxyLoading}
                          onClick={() => handleQuickSaveProxy(true, undefined, 'auto')}
                        >
                          <Globe size={12} className={isProxyLoading ? 'spin-animation' : ''} />
                          <span>{isProxyLoading ? 'Masking IP...' : '✨ Activate Auto-Masking'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Custom URL Panel */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      Current IP: <strong style={{ color: proxyStatus?.is_masked ? '#34d399' : '#f87171' }}>{proxyStatus?.public_ip || '...'}</strong>
                    </div>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="http://127.0.0.1:7890 or socks5://..."
                      value={proxyInputUrl}
                      onChange={(e) => setProxyInputUrl(e.target.value)}
                      style={{ fontSize: 11, padding: '4px 8px' }}
                    />
                    <div style={{ display: 'flex', gap: 4 }}>
                      {['http://127.0.0.1:7890', 'socks5://127.0.0.1:1080'].map((p) => (
                        <button
                          key={p}
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 10, padding: '2px 6px', flex: 1 }}
                          onClick={() => {
                            setProxyInputUrl(p);
                            handleQuickSaveProxy(true, p, 'custom');
                          }}
                        >
                          {p.includes('7890') ? 'Clash 7890' : 'SOCKS 1080'}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      {proxyStatus?.enabled ? (
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ flex: 1, justifyContent: 'center' }}
                          disabled={isProxyLoading}
                          onClick={() => handleQuickSaveProxy(false, undefined, 'custom')}
                        >
                          <span>Disable</span>
                        </button>
                      ) : (
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1, justifyContent: 'center' }}
                          disabled={isProxyLoading || !proxyInputUrl.trim()}
                          onClick={() => handleQuickSaveProxy(true, proxyInputUrl, 'custom')}
                        >
                          <span>Save & Apply</span>
                        </button>
                      )}
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={isProxyLoading || !proxyStatus?.enabled}
                        onClick={handleQuickRotateProxy}
                        title="Rotate proxy circuit / IP"
                      >
                        <RotateCw size={11} className={isProxyLoading ? 'spin-animation' : ''} />
                        <span>Rotate</span>
                      </button>
                    </div>
                  </div>
                )}
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
