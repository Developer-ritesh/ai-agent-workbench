import React, { useState } from 'react';
import { X, Folder, Cpu } from 'lucide-react';
import { CreateWorkspacePayload } from '../types';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: CreateWorkspacePayload) => Promise<void>;
}

export const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [hostProjectPath, setHostProjectPath] = useState('');
  const [cpuCount, setCpuCount] = useState(2);
  const [memoryMb, setMemoryMb] = useState(4096);
  const [diskSizeGb] = useState(20);
  const [networkMode, setNetworkMode] = useState<'standard' | 'restricted' | 'disabled'>('standard');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Workspace name is required');
      return;
    }
    if (!hostProjectPath.trim()) {
      setError('Host project directory path is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onCreate({
        name: name.trim(),
        hostProjectPath: hostProjectPath.trim(),
        cpuCount,
        memoryMb,
        diskSizeGb,
        networkMode,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Cpu size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Create Isolated Workspace</h3>
          </div>
          <button
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div
                style={{
                  background: 'rgba(244, 63, 94, 0.1)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  color: '#fb7185',
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Workspace Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Next.js SaaS App"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Host Project Directory (Virtio-FS Mount)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ flex: 1 }}
                  placeholder="/Users/username/Projects/my-app"
                  value={hostProjectPath}
                  onChange={(e) => setHostProjectPath(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setHostProjectPath('/tmp/workbench-test-project')}
                  title="Use quick test folder"
                >
                  <Folder size={15} />
                  <span>Test Path</span>
                </button>
              </div>
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                Only this directory is exposed to the VM. Host root, home directory, and SSH keys remain strictly inaccessible.
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Virtual CPUs</label>
                <select
                  className="form-input"
                  value={cpuCount}
                  onChange={(e) => setCpuCount(Number(e.target.value))}
                >
                  <option value={1}>1 vCPU</option>
                  <option value={2}>2 vCPUs (Recommended)</option>
                  <option value={4}>4 vCPUs</option>
                  <option value={8}>8 vCPUs</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Guest Memory (RAM)</label>
                <select
                  className="form-input"
                  value={memoryMb}
                  onChange={(e) => setMemoryMb(Number(e.target.value))}
                >
                  <option value={2048}>2 GB RAM</option>
                  <option value={4096}>4 GB RAM (Recommended)</option>
                  <option value={8192}>8 GB RAM</option>
                  <option value={16384}>16 GB RAM</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Network Isolation Policy</label>
              <select
                className="form-input"
                value={networkMode}
                onChange={(e) => setNetworkMode(e.target.value as any)}
              >
                <option value="standard">Standard (Internet & Provider API access)</option>
                <option value="restricted">Restricted (Minimal package registry only)</option>
                <option value="disabled">Disabled (Offline mode, zero outbound traffic)</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Provisioning...' : 'Create Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
