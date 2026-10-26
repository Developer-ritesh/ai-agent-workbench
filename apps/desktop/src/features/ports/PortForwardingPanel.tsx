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
    try {
      await tauriIpc.portsForwardRemove(id);
      setPorts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      console.error('Failed to remove forward:', err);
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
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-100 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-5 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-100">Port Forwarding Manager</h1>
              <p className="text-xs text-zinc-400">
                Bridge isolated VM services to macOS localhost with automated port discovery
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchPorts}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-300 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Rescan</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Forward Port</span>
          </button>
        </div>
      </div>

      {/* Security Status Banner */}
      <div className="mt-4 p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-zinc-300">
            Loopback-Only Binding: All ports are locked to <code className="text-emerald-400 font-mono">127.0.0.1</code>.
          </span>
        </div>
        <span className="text-[11px] text-zinc-500">Zero WAN Exposure • Automatic Cleanup</span>
      </div>

      {/* Ports Table */}
      <div className="mt-6 border border-zinc-800 rounded-xl bg-zinc-900/40 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-zinc-900 text-zinc-400 border-b border-zinc-800 text-[11px] font-medium">
              <th className="py-2.5 px-4">Status</th>
              <th className="py-2.5 px-4">Guest Port</th>
              <th className="py-2.5 px-4">Local Port</th>
              <th className="py-2.5 px-4">Protocol</th>
              <th className="py-2.5 px-4">Process</th>
              <th className="py-2.5 px-4">Target URL</th>
              <th className="py-2.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-850">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-zinc-500">
                  Scanning active listening ports...
                </td>
              </tr>
            ) : ports.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-zinc-500">
                  <Radio className="w-6 h-6 mx-auto mb-2 opacity-40 text-emerald-500" />
                  <p>No listening services detected inside the VM.</p>
                  <p className="text-[11px] text-zinc-600 mt-1">
                    Start a dev server (e.g. <code>npm run dev</code> or <code>cargo run</code>) to auto-detect.
                  </p>
                </td>
              </tr>
            ) : (
              ports.map((port) => {
                const isCopied = copiedId === port.id;
                return (
                  <tr key={port.id} className="hover:bg-zinc-850/40 transition">
                    <td className="py-3 px-4">
                      {port.status === 'active' ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/60 text-amber-400 border border-amber-800/40">
                          Conflict
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-zinc-200">
                      :{port.guestPort}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                      :{port.localPort}
                    </td>
                    <td className="py-3 px-4">
                      <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                        {port.protocol}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-400 font-mono text-[11px]">
                      {port.processName || 'dev server'}
                    </td>
                    <td className="py-3 px-4 text-zinc-300 font-mono text-[11px]">
                      {port.targetUrl}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenInBrowser && onOpenInBrowser(port.targetUrl)}
                          className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[11px] transition"
                          title="Open in Workbench Integrated Browser"
                        >
                          <Globe className="w-3 h-3" />
                          <span>Browse</span>
                        </button>
                        <button
                          onClick={() => handleCopy(port.id, port.targetUrl)}
                          className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition"
                          title="Copy URL"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <a
                          href={port.targetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition"
                          title="Open in Safari / System Browser"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => handleRemoveForward(port.id)}
                          className="p-1 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded transition"
                          title="Delete Mapping"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                <span>Forward Port from Isolated VM</span>
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-zinc-200 text-xs"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-rose-950/40 border border-rose-900 text-rose-300 rounded text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateForward} className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Guest Port (Inside VM)</label>
                <input
                  type="number"
                  value={guestPortInput}
                  onChange={(e) => setGuestPortInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 font-mono outline-none focus:border-emerald-500"
                  placeholder="3000"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Local Host Port (macOS)</label>
                <input
                  type="number"
                  value={localPortInput}
                  onChange={(e) => handleCheckPort(e.target.value)}
                  className={`w-full bg-zinc-950 border rounded-lg px-3 py-1.5 text-xs text-zinc-100 font-mono outline-none ${
                    isConflict ? 'border-amber-500' : 'border-zinc-800 focus:border-emerald-500'
                  }`}
                  placeholder="3000"
                  required
                />
                {isConflict && (
                  <p className="text-[11px] text-amber-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Port is currently occupied by another host process.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Protocol</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['http', 'tcp', 'ws'] as const).map((proto) => (
                    <button
                      type="button"
                      key={proto}
                      onClick={() => setProtocolInput(proto)}
                      className={`py-1.5 rounded text-xs font-mono uppercase transition border ${
                        protocolInput === proto
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      {proto}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
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
