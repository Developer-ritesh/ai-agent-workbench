import React, { useState, useEffect } from 'react';
import {
  Network,
  RefreshCw,
  Plus,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  ShieldCheck,
  AlertCircle,
  Radio,
  Globe,
  SlidersHorizontal,
} from 'lucide-react';
import { PortForwardMapping } from '../../types';
import { tauriIpc } from '../../services/tauriIpc';

interface PortForwardingPanelProps {
  onOpenInBrowser?: (url: string) => void;
}

export const PortForwardingPanel: React.FC<PortForwardingPanelProps> = ({ onOpenInBrowser }) => {
  const [ports, setPorts] = useState<PortForwardMapping[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Forward Form
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [guestPortInput, setGuestPortInput] = useState<string>('3000');
  const [localPortInput, setLocalPortInput] = useState<string>('3000');
  const [protocolInput, setProtocolInput] = useState<'http' | 'tcp' | 'ws'>('http');
  const [isConflict, setIsConflict] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchPorts = async () => {
    setIsRefreshing(true);
    try {
      const data = await tauriIpc.portsList();
      setPorts(data);
    } catch (err: any) {
      console.error('Failed to load ports:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPorts();
    const interval = setInterval(fetchPorts, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateForward = async (e: React.FormEvent) => {
    e.preventDefault();
    const gp = parseInt(guestPortInput, 10);
    const lp = parseInt(localPortInput, 10);
    if (isNaN(gp) || isNaN(lp)) {
      setErrorMsg('Port numbers must be valid integers');
      return;
    }

    try {
      const newMapping = await tauriIpc.portsForwardCreate(gp, lp, protocolInput);
      setPorts((prev) => [newMapping, ...prev.filter((p) => p.id !== newMapping.id)]);
      setShowAddModal(false);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(String(err?.message || err || 'Failed to create port forward'));
    }
  };

  const handleRemoveForward = async (id: string) => {
    if (!confirm(`Remove this port forwarding mapping? Traffic between the VM guest port and the local target will stop immediately.`)) {
      return;
    }
    try {
      await tauriIpc.portsForwardRemove(id);
      setPorts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      console.error('Failed to remove forward:', err);
      setErrorMsg(String(err?.message || err || 'Failed to remove port mapping'));
    }
  };

  const handleCheckPort = async (val: string) => {
    setLocalPortInput(val);
    const p = parseInt(val, 10);
    if (!isNaN(p)) {
      try {
        const available = await tauriIpc.portsCheckAvailability(p);
        setIsConflict(!available);
      } catch {
        // Ignore
      }
    }
  };

  return (
    <div
      className="ports-panel-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        background: 'var(--bg-app)',
        color: 'var(--text-primary)',
        padding: '24px 28px',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 16,
          borderBottom: '1px solid var(--border-panel)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              padding: 8,
              background: 'rgba(56, 189, 248, 0.1)',
              color: 'var(--accent-cyan)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Network size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Port Forwarding Manager
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
              Bridge isolated VM services to macOS localhost with automated port discovery
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={fetchPorts}
            disabled={isRefreshing}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Rescan</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary btn-sm"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}
          >
            <Plus size={14} />
            <span>Forward Port</span>
          </button>
        </div>
      </div>

      {/* Security Status Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: 'var(--radius-md)',
          marginTop: 18,
          fontSize: 12,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={16} color="#34d399" />
          <span style={{ color: 'var(--text-primary)' }}>
            Loopback-Only Binding: All ports are locked to{' '}
            <code style={{ color: '#34d399', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>127.0.0.1</code>.
          </span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Zero WAN Exposure • Automatic Cleanup</span>
      </div>

      {/* Ports Table Card */}
      <div
        style={{
          marginTop: 20,
          border: '1px solid var(--border-panel)',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-surface)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
          <thead>
            <tr
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                color: 'var(--text-muted)',
                borderBottom: '1px solid var(--border-panel)',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              <th style={{ padding: '10px 16px' }}>Status</th>
              <th style={{ padding: '10px 16px' }}>Guest Port</th>
              <th style={{ padding: '10px 16px' }}>Local Port</th>
              <th style={{ padding: '10px 16px' }}>Protocol</th>
              <th style={{ padding: '10px 16px' }}>Process</th>
              <th style={{ padding: '10px 16px' }}>Target URL</th>
              <th style={{ padding: '10px 16px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
                  Scanning active listening ports...
                </td>
              </tr>
            ) : ports.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)' }}>
                  <Radio size={28} style={{ margin: '0 auto 8px', opacity: 0.5, color: 'var(--accent-cyan)' }} />
                  <p style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-secondary)' }}>
                    No listening services detected inside the VM.
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    Start a dev server (e.g. <code style={{ color: 'var(--accent-cyan)' }}>npm run dev</code> or{' '}
                    <code style={{ color: 'var(--accent-cyan)' }}>cargo run</code>) to auto-detect.
                  </p>
                </td>
              </tr>
            ) : (
              ports.map((port) => {
                const isCopied = copiedId === port.id;
                return (
                  <tr
                    key={port.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      {port.status === 'active' ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: 11,
                            fontWeight: 600,
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: '#34d399',
                            }}
                          />
                          Active
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: 11,
                            fontWeight: 600,
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#fbbf24',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                          }}
                        >
                          Conflict
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      :{port.guestPort}
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        color: 'var(--accent-cyan)',
                      }}
                    >
                      :{port.localPort}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          textTransform: 'uppercase',
                          fontSize: 10,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: 'rgba(255, 255, 255, 0.06)',
                          color: 'var(--text-secondary)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {port.protocol}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        color: 'var(--text-muted)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11.5,
                      }}
                    >
                      {port.processName || 'dev server'}
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11.5,
                      }}
                    >
                      {port.targetUrl}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          onClick={() => onOpenInBrowser && onOpenInBrowser(port.targetUrl)}
                          className="btn btn-secondary btn-sm"
                          style={{
                            padding: '3px 8px',
                            fontSize: 11,
                            background: 'rgba(56, 189, 248, 0.1)',
                            color: 'var(--accent-cyan)',
                            borderColor: 'rgba(56, 189, 248, 0.3)',
                          }}
                          title="Open in Workbench Integrated Browser"
                        >
                          <Globe size={13} />
                          <span>Browse</span>
                        </button>
                        <button
                          onClick={() => handleCopy(port.id, port.targetUrl)}
                          className="btn-icon"
                          style={{ width: 26, height: 26 }}
                          title="Copy URL"
                        >
                          {isCopied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                        </button>
                        <a
                          href={port.targetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-icon"
                          style={{
                            width: 26,
                            height: 26,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-muted)',
                          }}
                          title="Open in Safari / System Browser"
                        >
                          <ExternalLink size={14} />
                        </a>
                        <button
                          onClick={() => handleRemoveForward(port.id)}
                          className="btn-icon"
                          style={{ width: 26, height: 26, color: '#f87171' }}
                          title="Delete Mapping"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Port Forward Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 420,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-panel)',
              borderRadius: 'var(--radius-lg)',
              padding: 20,
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: 12,
                borderBottom: '1px solid var(--border-panel)',
                marginBottom: 16,
              }}
            >
              <h2
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <SlidersHorizontal size={16} color="var(--accent-cyan)" />
                <span>Forward Port from Isolated VM</span>
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="btn-icon"
                style={{ width: 24, height: 24 }}
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div
                style={{
                  padding: '8px 12px',
                  background: 'rgba(244, 63, 94, 0.15)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  color: '#fb7185',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <AlertCircle size={14} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateForward} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Guest Port (Inside VM)
                </label>
                <input
                  type="number"
                  value={guestPortInput}
                  onChange={(e) => setGuestPortInput(e.target.value)}
                  style={{
                    width: '100%',
                    fontFamily: 'var(--font-mono)',
                    padding: '8px 12px',
                  }}
                  placeholder="3000"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Local Host Port (macOS)
                </label>
                <input
                  type="number"
                  value={localPortInput}
                  onChange={(e) => handleCheckPort(e.target.value)}
                  style={{
                    width: '100%',
                    fontFamily: 'var(--font-mono)',
                    padding: '8px 12px',
                    borderColor: isConflict ? '#f59e0b' : undefined,
                  }}
                  placeholder="3000"
                  required
                />
                {isConflict && (
                  <p
                    style={{
                      fontSize: 11,
                      color: '#fbbf24',
                      marginTop: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <AlertCircle size={12} />
                    Port is currently occupied by another host process.
                  </p>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Protocol
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {(['http', 'tcp', 'ws'] as const).map((proto) => (
                    <button
                      type="button"
                      key={proto}
                      onClick={() => setProtocolInput(proto)}
                      className={`btn btn-sm ${protocolInput === proto ? 'btn-primary' : 'btn-secondary'}`}
                      style={{
                        fontFamily: 'var(--font-mono)',
                        textTransform: 'uppercase',
                        padding: '6px 0',
                      }}
                    >
                      {proto}
                    </button>
                  ))}
                </div>
              </div>

              <div
                style={{
                  paddingTop: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 8,
                  borderTop: '1px solid var(--border-panel)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}
                >
                  Create Forward
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
