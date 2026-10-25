import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Wifi,
  WifiOff,
  RefreshCw,
  Zap,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { TauriApi } from '../services/tauriIpc';
import { NetworkStats } from '../types';

export const NetworkSpeedMeter: React.FC = () => {
  const [stats, setStats] = useState<NetworkStats>({
    is_online: true,
    latency_ms: 18,
    download_speed_bps: 0,
    upload_speed_bps: 0,
    download_speed_formatted: '0 B/s',
    upload_speed_formatted: '0 B/s',
    total_download_bytes: 0,
    total_upload_bytes: 0,
    active_interface: 'en0',
    status: 'online',
    retry_count: 0,
    last_checked_iso: new Date().toISOString(),
  });

  const [isOpen, setIsOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const [speedHistory, setSpeedHistory] = useState<{ down: number; up: number }[]>([]);
  const [peakDown, setPeakDown] = useState(0);
  const [peakUp, setPeakUp] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  // Periodic polling every 1 second
  useEffect(() => {
    let isMounted = true;

    const fetchStats = async () => {
      try {
        const res = await TauriApi.networkGetStats();
        if (!isMounted) return;
        setStats(res);

        setSpeedHistory((prev) => {
          const next = [...prev, { down: res.download_speed_bps, up: res.upload_speed_bps }];
          return next.slice(-16);
        });

        if (res.download_speed_bps > peakDown) {
          setPeakDown(res.download_speed_bps);
        }
        if (res.upload_speed_bps > peakUp) {
          setPeakUp(res.upload_speed_bps);
        }

        // If offline and no countdown active, initiate auto-retry countdown
        if (!res.is_online && retryCountdown === null) {
          setRetryCountdown(5);
        } else if (res.is_online && retryCountdown !== null) {
          setRetryCountdown(null);
        }
      } catch (err) {
        console.warn('Network stats fetch error:', err);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 1000);

    // Browser online/offline event handlers
    const handleOnline = () => {
      handleRetry();
    };
    const handleOffline = () => {
      setStats((prev) => ({ ...prev, is_online: false, status: 'offline' }));
      setRetryCountdown(5);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [retryCountdown, peakDown, peakUp]);

  // Handle auto-retry countdown
  useEffect(() => {
    if (retryCountdown === null) return;

    if (retryCountdown > 0) {
      const timer = window.setTimeout(() => {
        setRetryCountdown((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
      return () => clearTimeout(timer);
    } else if (retryCountdown === 0) {
      handleRetry();
      setRetryCountdown(null);
    }
  }, [retryCountdown]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Manual Retry Connection
  const handleRetry = async () => {
    if (isRetrying) return;
    setIsRetrying(true);
    try {
      const res = await TauriApi.networkRetryConnection();
      setStats(res);
      if (res.is_online) {
        setRetryCountdown(null);
      } else {
        setRetryCountdown(6);
      }
    } catch (err) {
      console.warn('Retry connection failed:', err);
      setRetryCountdown(6);
    } finally {
      setTimeout(() => setIsRetrying(false), 500);
    }
  };

  // Run Bandwidth Speed Test
  const handleRunSpeedTest = async () => {
    if (isTesting) return;
    setIsTesting(true);
    try {
      const res = await TauriApi.networkRunSpeedTest();
      setStats(res);
      if (res.download_speed_bps > peakDown) setPeakDown(res.download_speed_bps);
      if (res.upload_speed_bps > peakUp) setPeakUp(res.upload_speed_bps);
    } catch (err) {
      console.warn('Speed test failed:', err);
    } finally {
      setIsTesting(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  // Status colors & icons
  const isOnline = stats.is_online;
  const statusColor = isOnline
    ? stats.latency_ms > 200
      ? '#fbbf24'
      : '#10b981'
    : '#f87171';

  return (
    <div style={{ position: 'relative' }} ref={containerRef}>
      {/* Top Header Pill */}
      <button
        type="button"
        className="topbar-pill net-speed-pill"
        onClick={() => setIsOpen(!isOpen)}
        title={
          isOnline
            ? `Internet: Connected (${stats.latency_ms}ms) • Click for Network Health & Speed Test`
            : `Internet: Offline (${stats.retry_count} retries) • Click to Reconnect`
        }
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '4px 9px',
          background: isOnline ? 'var(--bg-surface)' : 'rgba(239, 68, 68, 0.12)',
          border: isOnline
            ? '1px solid var(--border-panel)'
            : '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          color: 'var(--text-primary)',
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          transition: 'all 0.15s ease',
        }}
      >
        {/* Connection Indicator Dot */}
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            backgroundColor: statusColor,
            boxShadow: isOnline
              ? '0 0 6px rgba(16, 185, 129, 0.6)'
              : '0 0 8px rgba(239, 68, 68, 0.8)',
            animation: !isOnline ? 'pulse 1.5s infinite' : 'none',
            flexShrink: 0,
          }}
        />

        {/* Download Speed */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ArrowDown size={11} color="var(--accent-cyan)" strokeWidth={2.5} />
          <span style={{ color: 'var(--accent-cyan)', fontWeight: 600, minWidth: 46 }}>
            {stats.download_speed_formatted}
          </span>
        </div>

        {/* Upload Speed */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ArrowUp size={11} color="#c084fc" strokeWidth={2.5} />
          <span style={{ color: '#c084fc', fontWeight: 600, minWidth: 46 }}>
            {stats.upload_speed_formatted}
          </span>
        </div>

        {/* Ping Latency (when online) or Offline Warning */}
        {isOnline ? (
          <span
            style={{
              fontSize: 10,
              color: 'var(--text-muted)',
              paddingLeft: 2,
              borderLeft: '1px solid var(--border-subtle)',
            }}
          >
            {stats.latency_ms}ms
          </span>
        ) : (
          <span
            style={{
              fontSize: 10,
              color: '#f87171',
              fontWeight: 600,
              paddingLeft: 2,
              borderLeft: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            {retryCountdown !== null ? `Retry ${retryCountdown}s` : 'Offline'}
          </span>
        )}

        <ChevronDown size={10} color="var(--text-muted)" style={{ marginLeft: 1 }} />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          className="dropdown-menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: 320,
            padding: 12,
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-panel)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.55)',
            zIndex: 1000,
            fontFamily: 'var(--font-sans)',
          }}
        >
          {/* Header Status Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
              paddingBottom: 8,
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              {isOnline ? (
                <Wifi size={15} color="#10b981" />
              ) : (
                <WifiOff size={15} color="#f87171" />
              )}
              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                {isOnline ? 'Internet Connected' : 'No Internet Connection'}
              </span>
            </div>

            <span
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                padding: '2px 7px',
                borderRadius: 4,
                background: isOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: isOnline ? '#34d399' : '#f87171',
              }}
            >
              {isOnline ? `${stats.latency_ms} ms Latency` : 'Offline'}
            </span>
          </div>

          {/* Speed Cards Grid (Download & Upload) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            {/* Download Card */}
            <div
              style={{
                padding: '8px 10px',
                background: 'rgba(56, 189, 248, 0.06)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 10.5,
                  color: 'var(--accent-cyan)',
                  marginBottom: 3,
                  fontWeight: 600,
                }}
              >
                <ArrowDown size={12} />
                <span>DOWNLOAD</span>
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-primary)',
                  marginBottom: 2,
                }}
              >
                {stats.download_speed_formatted}
              </div>
              <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>
                Peak: {formatBytes(peakDown)}/s
              </div>
            </div>

            {/* Upload Card */}
            <div
              style={{
                padding: '8px 10px',
                background: 'rgba(192, 132, 252, 0.06)',
                border: '1px solid rgba(192, 132, 252, 0.2)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 10.5,
                  color: '#c084fc',
                  marginBottom: 3,
                  fontWeight: 600,
                }}
              >
                <ArrowUp size={12} />
                <span>UPLOAD</span>
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-primary)',
                  marginBottom: 2,
                }}
              >
                {stats.upload_speed_formatted}
              </div>
              <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>
                Peak: {formatBytes(peakUp)}/s
              </div>
            </div>
          </div>

          {/* Live Activity Sparkline */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
              <span>Live Throughput</span>
              <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>↓ In</span>
              <span style={{ color: '#c084fc', fontWeight: 600 }}>↑ Out</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 3,
                height: 24,
                padding: '2px 4px',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
              }}
            >
              {speedHistory.map((s, idx) => {
                const max = Math.max(peakDown, peakUp, 2048);
                const hDown = Math.min(20, Math.max(2, Math.round((s.down / max) * 20)));
                const hUp = Math.min(20, Math.max(2, Math.round((s.up / max) * 20)));
                return (
                  <div key={idx} style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 1, height: '100%' }}>
                    <div
                      style={{
                        width: '50%',
                        height: `${hDown}px`,
                        background: 'var(--accent-cyan)',
                        borderRadius: 1,
                        opacity: 0.85,
                      }}
                      title={`Down: ${formatBytes(s.down)}/s`}
                    />
                    <div
                      style={{
                        width: '50%',
                        height: `${hUp}px`,
                        background: '#c084fc',
                        borderRadius: 1,
                        opacity: 0.85,
                      }}
                      title={`Up: ${formatBytes(s.up)}/s`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Network Details List */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
              fontSize: 11,
              padding: '6px 8px',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Active Interface</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                {stats.active_interface}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Session Inbound</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                {formatBytes(stats.total_download_bytes)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Session Outbound</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                {formatBytes(stats.total_upload_bytes)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Retry Attempts</span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  color: stats.retry_count > 0 ? '#f87171' : 'var(--text-secondary)',
                }}
              >
                {stats.retry_count}
              </span>
            </div>
          </div>

          {/* Action Buttons: Retry Connection & Speed Test */}
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Retry Button */}
            <button
              className="btn btn-secondary"
              onClick={handleRetry}
              disabled={isRetrying}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                fontSize: 11.5,
                padding: '6px 10px',
                background: isOnline ? 'var(--bg-surface-hover)' : 'rgba(239, 68, 68, 0.2)',
                borderColor: isOnline ? 'var(--border-panel)' : 'rgba(239, 68, 68, 0.5)',
                color: isOnline ? 'var(--text-primary)' : '#f87171',
                fontWeight: 600,
              }}
            >
              <RefreshCw size={12} className={isRetrying ? 'spin-animation' : ''} />
              <span>{isRetrying ? 'Retrying...' : 'Retry Connection'}</span>
            </button>

            {/* Speed Test Button */}
            <button
              className="btn btn-primary"
              onClick={handleRunSpeedTest}
              disabled={isTesting || !isOnline}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                fontSize: 11.5,
                padding: '6px 10px',
                opacity: !isOnline ? 0.5 : 1,
              }}
            >
              <Zap size={12} className={isTesting ? 'spin-animation' : ''} />
              <span>{isTesting ? 'Testing...' : 'Test Speed'}</span>
            </button>
          </div>

          {/* Auto-retry notice when offline */}
          {!isOnline && (
            <div
              style={{
                marginTop: 8,
                padding: '5px 8px',
                borderRadius: 4,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                fontSize: 10.5,
                color: '#f87171',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <AlertTriangle size={11} />
              <span>
                {retryCountdown !== null
                  ? `Connection lost. Auto-retrying in ${retryCountdown}s...`
                  : 'Connection lost. Auto-reconnecting...'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
