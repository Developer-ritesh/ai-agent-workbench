import React, { useState } from 'react';
import { X, Folder, Cpu, Layers } from 'lucide-react';
import { CreateWorkspacePayload } from '../types';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: CreateWorkspacePayload) => Promise<void>;
}

interface TemplateOption {
  id: string;
  name: string;
  desc: string;
  suggestedPath: string;
  cpus: number;
  memory: number;
}

const TEMPLATES: TemplateOption[] = [
  {
    id: 'nextjs',
    name: 'Next.js & React',
    desc: 'TypeScript web app with TailwindCSS & Node.js guest tools',
    suggestedPath: '/tmp/nextjs-agent-project',
    cpus: 2,
    memory: 4096,
  },
  {
    id: 'rust',
    name: 'Rust Systems Service',
    desc: 'High-performance backend with Cargo & Linux compilation',
    suggestedPath: '/tmp/rust-backend-project',
    cpus: 4,
    memory: 8192,
  },
  {
    id: 'python',
    name: 'Python / AI Agent Service',
    desc: 'FastAPI service with PyTest and virtualenv isolation',
    suggestedPath: '/tmp/python-agent-project',
    cpus: 2,
    memory: 4096,
  },
  {
    id: 'custom',
    name: 'Existing Directory / Git Repo',
    desc: 'Mount your existing local code folder with custom settings',
    suggestedPath: '',
    cpus: 2,
    memory: 4096,
  },
];

export const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState('nextjs');
  const [name, setName] = useState('Web Application');
  const [hostProjectPath, setHostProjectPath] = useState('/tmp/nextjs-agent-project');
  const [cpuCount, setCpuCount] = useState(2);
  const [memoryMb, setMemoryMb] = useState(4096);
  const [networkMode, setNetworkMode] = useState<'standard' | 'restricted' | 'disabled'>('standard');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectTemplate = (tmpl: TemplateOption) => {
    setSelectedTemplate(tmpl.id);
    if (tmpl.id !== 'custom') {
      setName(tmpl.name);
      setHostProjectPath(tmpl.suggestedPath);
    }
    setCpuCount(tmpl.cpus);
    setMemoryMb(tmpl.memory);
  };

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
        diskSizeGb: 20,
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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ width: 620 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Cpu size={18} color="var(--accent-primary)" />
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Create New Linux VM Workspace</h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={16} />
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
                  color: 'var(--status-danger)',
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}

            {/* Template Selector Grid */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Layers size={13} />
                <span>Project Template / Starter</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {TEMPLATES.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className={`card card-interactive ${selectedTemplate === tmpl.id ? 'active' : ''}`}
                    style={{
                      padding: 10,
                      borderColor: selectedTemplate === tmpl.id ? 'var(--accent-primary)' : undefined,
                      background: selectedTemplate === tmpl.id ? 'var(--bg-surface-active)' : undefined,
                    }}
                    onClick={() => handleSelectTemplate(tmpl)}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                      {tmpl.name}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {tmpl.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Workspace Display Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Customer Portal API"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Host Project Directory (Virtio-FS Mount)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 12.5 }}
                  placeholder="/Users/username/Projects/my-app"
                  value={hostProjectPath}
                  onChange={(e) => setHostProjectPath(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setHostProjectPath('/tmp/workbench-test-project')}
                  title="Use temporary test path"
                >
                  <Folder size={14} />
                  <span>Test Path</span>
                </button>
              </div>
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                Host boundary protection: Root (`/`), home root (`~`), `.ssh`, and Keychain files are strictly blocked.
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Virtual CPUs</label>
                <select
                  className="form-select"
                  value={cpuCount}
                  onChange={(e) => setCpuCount(Number(e.target.value))}
                >
                  <option value={1}>1 vCPU (Minimal)</option>
                  <option value={2}>2 vCPUs (Recommended)</option>
                  <option value={4}>4 vCPUs (Build intensive)</option>
                  <option value={8}>8 vCPUs (Max performance)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Guest RAM Allocation</label>
                <select
                  className="form-select"
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
                className="form-select"
                value={networkMode}
                onChange={(e) => setNetworkMode(e.target.value as any)}
              >
                <option value="standard">Standard (Internet & AI API access)</option>
                <option value="restricted">Restricted (Minimal package registries only)</option>
                <option value="disabled">Disabled (Offline mode, zero outbound traffic)</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Provisioning VM...' : 'Initialize Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
