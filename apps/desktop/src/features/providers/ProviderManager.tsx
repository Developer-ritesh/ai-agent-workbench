import React, { useState } from 'react';
import { KeyRound, Plus, Trash2, Lock, CheckCircle, Shield } from 'lucide-react';
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
    <div
      className="provider-settings-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        padding: '28px 36px',
        maxWidth: 1100,
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          paddingBottom: 18,
          borderBottom: '1px solid var(--border-panel)',
        }}
      >
        <div
          style={{
            padding: 10,
            background: 'rgba(56, 189, 248, 0.1)',
            color: 'var(--accent-cyan)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <KeyRound size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Provider Profiles & Keychain Manager
          </h2>
          <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: '3px 0 0' }}>
            Configure authorized AI model providers. Secrets are stored directly in macOS Keychain and never written to SQLite or application logs.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, alignItems: 'flex-start' }}>
        {/* Existing Profiles List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Configured Profiles ({providers.length})
            </h3>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Shield size={12} color="#34d399" />
              Hardware-backed Keychain
            </span>
          </div>

          {providers.length === 0 ? (
            <div
              className="card"
              style={{
                padding: 36,
                textAlign: 'center',
                color: 'var(--text-muted)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-panel)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <KeyRound size={28} style={{ margin: '0 auto 10px', opacity: 0.35, color: 'var(--accent-cyan)' }} />
              <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                No provider profiles configured yet.
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Add your Anthropic, OpenAI, Gemini, or local Ollama credentials on the right to authenticate workspace tools.
              </p>
            </div>
          ) : (
            providers.map((p) => (
              <div
                key={p.id}
                className="card"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 18px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-panel)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <KeyRound size={15} color="var(--accent-cyan)" />
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13.5 }}>{p.name}</span>
                    <span
                      style={{
                        fontSize: 10.5,
                        padding: '2px 8px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        borderRadius: 4,
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {p.providerId}
                    </span>
                  </div>

                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
                    Model: <span style={{ color: 'var(--text-secondary)' }}>{p.defaultModel}</span> • Keychain Ref:{' '}
                    <code style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>{p.credentialRef}</code>
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
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                    }}
                  >
                    <Lock size={12} />
                    <span>Keychain Secured</span>
                  </span>

                  <button
                    className="btn-icon"
                    style={{ color: '#f87171', width: 28, height: 28 }}
                    onClick={() => handleDelete(p.id, p.name)}
                    title="Delete profile and revoke keychain credential"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create / Add Profile Form */}
        <div
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-panel)',
            borderRadius: 'var(--radius-lg)',
            padding: 22,
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottom: '1px solid var(--border-panel)' }}>
            <Plus size={16} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Add Authorized Provider
            </h3>
          </div>

          {feedback && (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                color: '#34d399',
                fontSize: 12.5,
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
              <label className="form-label" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Profile Label
              </label>
              <input
                type="text"
                placeholder="e.g. Anthropic Production Key"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%', padding: '7px 12px' }}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Provider Service
              </label>
              <select
                value={providerId}
                onChange={(e) => {
                  setProviderId(e.target.value);
                  if (e.target.value === 'anthropic') setDefaultModel('claude-3-7-sonnet');
                  if (e.target.value === 'openai') setDefaultModel('gpt-4o');
                  if (e.target.value === 'gemini') setDefaultModel('gemini-2.5-flash');
                  if (e.target.value === 'ollama') setDefaultModel('llama3:8b');
                }}
                style={{ width: '100%', padding: '7px 12px' }}
              >
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="openai">OpenAI</option>
                <option value="gemini">Google Gemini</option>
                <option value="openrouter">OpenRouter</option>
                <option value="ollama">Local Ollama (Offline)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Default Model
              </label>
              <input
                type="text"
                placeholder="e.g. claude-3-7-sonnet"
                value={defaultModel}
                onChange={(e) => setDefaultModel(e.target.value)}
                style={{ width: '100%', padding: '7px 12px', fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                API Key / Token (stored in macOS Keychain)
              </label>
              <input
                type="password"
                placeholder={providerId === 'ollama' ? 'Optional for local models' : 'sk-ant-...'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                style={{ width: '100%', padding: '7px 12px', fontFamily: 'var(--font-mono)' }}
              />
            </div>

            {providerId === 'ollama' && (
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Local Host Endpoint
                </label>
                <input
                  type="text"
                  placeholder="http://localhost:11434"
                  value={apiEndpoint}
                  onChange={(e) => setApiEndpoint(e.target.value)}
                  style={{ width: '100%', padding: '7px 12px', fontFamily: 'var(--font-mono)' }}
                />
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                marginTop: 6,
                padding: '9px 16px',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                fontWeight: 600,
                border: 'none',
              }}
              disabled={isSaving}
            >
              {isSaving ? 'Encrypting & Storing...' : 'Save to macOS Keychain'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
