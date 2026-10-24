import React, { useState } from 'react';
import { KeyRound, Plus, Trash2, Lock, CheckCircle } from 'lucide-react';
import { ProviderProfile } from '../../types';
import { TauriApi } from '../../services/tauriIpc';

interface ProviderManagerProps {
  providers: ProviderProfile[];
  onRefreshProviders: () => void;
}

export const ProviderManager: React.FC<ProviderManagerProps> = ({
  providers,
  onRefreshProviders,
}) => {
  const [name, setName] = useState('');
  const [providerId, setProviderId] = useState('anthropic');
  const [defaultModel, setDefaultModel] = useState('claude-3-7-sonnet');
  const [apiKey, setApiKey] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSaving(true);
      setFeedback(null);
      await TauriApi.saveProvider({
        name: name.trim(),
        providerId,
        defaultModel,
        apiEndpoint: apiEndpoint.trim() || undefined,
        apiKey: apiKey.trim() || undefined,
      });

      setName('');
      setApiKey('');
      setApiEndpoint('');
      setFeedback('Provider profile and Keychain credential stored securely!');
      onRefreshProviders();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      alert(`Error saving provider: ${err?.message || String(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, provName: string) => {
    if (confirm(`Remove provider "${provName}" and revoke its macOS Keychain item?`)) {
      try {
        await TauriApi.deleteProvider(id);
        onRefreshProviders();
      } catch (err: any) {
        alert(`Error deleting provider: ${err?.message || String(err)}`);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>Provider Profiles & Keychain Manager</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
          Configure authorized AI model providers. Secrets are stored directly in macOS Keychain and never written to SQLite or application logs.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, alignItems: 'flex-start' }}>
        {/* Existing Profiles List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>Configured Profiles</h3>

          {providers.length === 0 ? (
            <div className="glass-card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
              No provider profiles configured yet.
            </div>
          ) : (
            providers.map((p) => (
              <div
                key={p.id}
                className="glass-card"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 16,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <KeyRound size={16} color="var(--accent-cyan)" />
                    <span style={{ fontWeight: 600, color: '#fff', fontSize: 14 }}>{p.name}</span>
                    <span
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: 4,
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {p.providerId}
                    </span>
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    Model: {p.defaultModel} • Keychain: <code style={{ color: 'var(--text-secondary)' }}>{p.credentialRef}</code>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                      color: '#34d399',
                      padding: '3px 8px',
                      borderRadius: 4,
                      background: 'rgba(16, 185, 129, 0.1)',
                    }}
                  >
                    <Lock size={12} />
                    <span>Keychain Secured</span>
                  </span>

                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ color: '#fb7185' }}
                    onClick={() => handleDelete(p.id, p.name)}
                    title="Delete profile and keychain credential"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create / Add Profile Form */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>Add Authorized Provider</h3>
          </div>

          {feedback && (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                color: '#34d399',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <CheckCircle size={15} />
              <span>{feedback}</span>
            </div>
          )}

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Profile Label</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Anthropic Production Key"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Provider Service</label>
              <select
                className="form-input"
                value={providerId}
                onChange={(e) => {
                  setProviderId(e.target.value);
                  if (e.target.value === 'anthropic') setDefaultModel('claude-3-7-sonnet');
                  if (e.target.value === 'openai') setDefaultModel('gpt-4o');
                  if (e.target.value === 'gemini') setDefaultModel('gemini-2.5-flash');
                  if (e.target.value === 'ollama') setDefaultModel('llama3:8b');
                }}
              >
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="openai">OpenAI</option>
                <option value="gemini">Google Gemini</option>
                <option value="openrouter">OpenRouter</option>
                <option value="ollama">Local Ollama (Offline)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Default Model</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. claude-3-7-sonnet"
                value={defaultModel}
                onChange={(e) => setDefaultModel(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">API Key / Token (stored in macOS Keychain)</label>
              <input
                type="password"
                className="form-input"
                placeholder={providerId === 'ollama' ? 'Optional for local models' : 'sk-ant-...'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>

            {providerId === 'ollama' && (
              <div className="form-group">
                <label className="form-label">Local Host Endpoint</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="http://localhost:11434"
                  value={apiEndpoint}
                  onChange={(e) => setApiEndpoint(e.target.value)}
                />
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ marginTop: 6 }} disabled={isSaving}>
              {isSaving ? 'Encrypting & Storing...' : 'Save to macOS Keychain'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
