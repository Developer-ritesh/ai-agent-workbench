import React, { useState, useEffect } from 'react';
import {
  Shield,
  Sun,
  Moon,
  Database,
  RefreshCw,
  Cpu,
  Palette,
  FileCode,
  Bot,
  Info,
  Download,
  Trash2,
  Lock,
  RotateCw,
  Sparkles,
  Terminal as TermIcon,
  ShieldCheck,
  Sliders,
  Search,
  Boxes,
} from 'lucide-react';
import { ThemeMode, AuditEventRecord } from '../../types';
import { TauriApi } from '../../services/tauriIpc';
import { McpSkillsManager } from '../skills_mcp/McpSkillsManager';

interface SettingsViewProps {
  theme: ThemeMode;
  onSetTheme: (theme: ThemeMode) => void;
  autoRotateMinutes?: number;
  onSetAutoRotateMinutes?: (mins: number) => void;
  onRotateVm?: () => void;
  activeWorkspacePath?: string;
}

type SettingsCategory =
  | 'appearance'
  | 'editor'
  | 'vm'
  | 'agent'
  | 'skills_mcp'
  | 'security'
  | 'audit'
  | 'about';

const ACCENT_COLORS = [
  { name: 'Sky Cyan', value: '#38bdf8' },
  { name: 'Neon Emerald', value: '#10b981' },
  { name: 'Violet Purple', value: '#8b5cf6' },
  { name: 'Sunset Amber', value: '#f59e0b' },
  { name: 'Coral Rose', value: '#f43f5e' },
  { name: 'Royal Blue', value: '#2563eb' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  theme,
  onSetTheme,
  autoRotateMinutes = 60,
  onSetAutoRotateMinutes,
  onRotateVm,
  activeWorkspacePath,
}) => {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('appearance');
  const [toastMessage, setToastMessage] = useState<string | null>(null);


  const handleClearOpencodeSessions = async () => {
    if (!activeWorkspacePath) {
      alert('Please open a workspace first to clear its project-level OpenCode sessions.');
      return;
    }
    if (confirm('Are you sure you want to clear all OpenCode session history, conversations, and checkpoints for this project?')) {
      try {
        await TauriApi.clearOpencodeSessions(activeWorkspacePath);
        showToast('✓ Project OpenCode session history cleared successfully!');
      } catch (err: any) {
        alert(`Failed to clear session history: ${err?.message || String(err)}`);
      }
    }
  };

  const handleClearGlobalHistory = async () => {
    if (confirm('Are you sure you want to clear global OpenCode chat history, SQLite database (~150MB+), and snapshots? MCP server configurations will remain safe.')) {
      try {
        await TauriApi.clearOpencodeGlobalHistory();
        showToast('✓ Global OpenCode chat history & database purged!');
      } catch (err: any) {
        alert(`Failed to clear global history: ${err?.message || String(err)}`);
      }
    }
  };

  const handleClearOpencodeCache = async () => {
    if (confirm('Are you sure you want to purge OpenCode model cache, temporary packages, and token caches?')) {
      try {
        await TauriApi.clearOpencodeCache();
        showToast('✓ OpenCode cache and temporary data cleared!');
      } catch (err: any) {
        alert(`Failed to clear cache: ${err?.message || String(err)}`);
      }
    }
  };

  const handlePurgeAllAgentData = async () => {
    if (confirm('⚠️ Perform Full Clean: Clear project sessions, global chat database, and cache all at once?')) {
      try {
        if (activeWorkspacePath) {
          await TauriApi.clearOpencodeSessions(activeWorkspacePath);
        }
        await TauriApi.clearOpencodeGlobalHistory();
        await TauriApi.clearOpencodeCache();
        showToast('✓ All OpenCode sessions, databases, and cache purged completely!');
      } catch (err: any) {
        alert(`Failed to purge agent data: ${err?.message || String(err)}`);
      }
    }
  };

  // Appearance State
  const [accentColor, setAccentColor] = useState<string>(
    localStorage.getItem('wb_accent_color') || '#38bdf8'
  );
  const [uiScaling, setUiScaling] = useState<string>(
    localStorage.getItem('wb_ui_scaling') || '100%'
  );

  // Editor State
  const [fontSize, setFontSize] = useState<number>(
    Number(localStorage.getItem('wb_editor_font_size')) || 13
  );
  const [fontFamily, setFontFamily] = useState<string>(
    localStorage.getItem('wb_editor_font_family') || 'JetBrains Mono'
  );
  const [tabSize, setTabSize] = useState<number>(
    Number(localStorage.getItem('wb_editor_tab_size')) || 2
  );
  const [lineHeight, setLineHeight] = useState<string>(
    localStorage.getItem('wb_editor_line_height') || '20px'
  );
  const [wordWrap, setWordWrap] = useState<boolean>(
    localStorage.getItem('wb_editor_word_wrap') === 'true'
  );
  const [autoSaveMode, setAutoSaveMode] = useState<string>(
    localStorage.getItem('wb_autosave_mode') || 'delay-1s'
  );

  // VM Defaults State
  const [defaultCpu, setDefaultCpu] = useState(2);
  const [defaultMem, setDefaultMem] = useState(4096);
  const [defaultDisk, setDefaultDisk] = useState(20);
  const [networkPolicy, setNetworkPolicy] = useState('standard');

  // AI Agent & OpenCode State
  const [defaultModel, setDefaultModel] = useState('claude-3-7-sonnet');
  const [agentAutonomy, setAgentAutonomy] = useState('semi-autonomous');
  const [maxSteps, setMaxSteps] = useState(25);
  const [autoSyncVirtioFs, setAutoSyncVirtioFs] = useState(true);
  const [opencodeVerbosity, setOpencodeVerbosity] = useState('detailed');

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditEventRecord[]>([]);
  const [auditFilterType, setAuditFilterType] = useState('all');
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [isRefreshingAudit, setIsRefreshingAudit] = useState(false);

  useEffect(() => {
    loadAuditLogs();
  }, []);

  // Initialize CSS variables from localStorage on mount
  useEffect(() => {
    document.documentElement.style.setProperty('--accent-cyan', accentColor);
    document.documentElement.style.setProperty('--editor-font-size', `${fontSize}px`);
    document.documentElement.style.setProperty('--editor-font-family', fontFamily);
    document.documentElement.style.setProperty('--editor-tab-size', `${tabSize}`);
    document.documentElement.style.setProperty('--editor-line-height', lineHeight);
    document.documentElement.style.setProperty('--editor-white-space', wordWrap ? 'pre-wrap' : 'pre');
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadAuditLogs = async () => {
    setIsRefreshingAudit(true);
    try {
      const logs = await TauriApi.listAuditEvents();
      setAuditLogs(logs || []);
    } catch (e) {
      console.error('Failed to load audit logs', e);
    } finally {
      setIsRefreshingAudit(false);
    }
  };

  const handleAccentChange = (color: string, name: string) => {
    setAccentColor(color);
    localStorage.setItem('wb_accent_color', color);
    document.documentElement.style.setProperty('--accent-cyan', color);
    showToast(`✓ Accent color set to ${name}`);
  };

  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
    localStorage.setItem('wb_editor_font_size', size.toString());
    document.documentElement.style.setProperty('--editor-font-size', `${size}px`);
    showToast(`✓ Editor font size set to ${size}px`);
  };

  const handleFontFamilyChange = (fam: string) => {
    setFontFamily(fam);
    localStorage.setItem('wb_editor_font_family', fam);
    document.documentElement.style.setProperty('--editor-font-family', fam);
    showToast(`✓ Editor font set to ${fam}`);
  };

  const handleTabSizeChange = (tabs: number) => {
    setTabSize(tabs);
    localStorage.setItem('wb_editor_tab_size', tabs.toString());
    document.documentElement.style.setProperty('--editor-tab-size', tabs.toString());
    showToast(`✓ Tab indentation set to ${tabs} spaces`);
  };

  const handleWordWrapToggle = () => {
    const next = !wordWrap;
    setWordWrap(next);
    localStorage.setItem('wb_editor_word_wrap', next.toString());
    document.documentElement.style.setProperty('--editor-white-space', next ? 'pre-wrap' : 'pre');
    showToast(`✓ Word wrap ${next ? 'enabled' : 'disabled'}`);
  };

  const handleExportAuditJson = () => {
    try {
      const blob = new Blob([JSON.stringify(auditLogs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workbench-audit-logs-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('✓ Audit log exported to JSON file!');
    } catch (err: any) {
      alert(`Export error: ${err?.message || String(err)}`);
    }
  };

  const handleClearAuditHistory = () => {
    if (confirm('Clear audit event history from local database?')) {
      setAuditLogs([]);
      showToast('✓ Audit log cleared.');
    }
  };

  const handleResetDefaults = () => {
    if (confirm('Restore all workbench preferences to factory defaults?')) {
      localStorage.clear();
      onSetTheme('dark');
      setAccentColor('#38bdf8');
      setFontSize(13);
      setFontFamily('JetBrains Mono');
      setTabSize(2);
      setLineHeight('20px');
      setWordWrap(false);
      setDefaultCpu(2);
      setDefaultMem(4096);
      setNetworkPolicy('standard');
      onSetAutoRotateMinutes?.(60);

      document.documentElement.style.setProperty('--accent-cyan', '#38bdf8');
      document.documentElement.style.setProperty('--editor-font-size', '13px');
      document.documentElement.style.setProperty('--editor-font-family', 'JetBrains Mono');
      document.documentElement.style.setProperty('--editor-tab-size', '2');
      document.documentElement.style.setProperty('--editor-white-space', 'pre');

      showToast('✓ All preferences restored to factory defaults!');
    }
  };

  const filteredAuditLogs = auditLogs.filter((log) => {
    if (auditFilterType !== 'all') {
      if (!log.eventType.toLowerCase().includes(auditFilterType)) return false;
    }
    if (auditSearchQuery.trim()) {
      const q = auditSearchQuery.toLowerCase();
      return (
        log.eventType.toLowerCase().includes(q) ||
        log.payloadJson.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="settings-container">
      {/* 1. Header Banner */}
      <div className="settings-header-banner">
        <div className="settings-title-group">
          <h2>
            <Sliders size={18} color="var(--accent-cyan)" />
            <span>Preferences & Settings</span>
          </h2>
          <p>
            Configure appearance, code editor, isolated VM hardware, AI Agent autonomy, and security parameters.
          </p>
        </div>

        {/* Status / Toast Notification */}
        {toastMessage && (
          <div
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              color: 'var(--accent-cyan)',
              fontSize: 12,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* 2. Main Split: Category Nav on Left, Content on Right */}
      <div className="settings-body-split">
        {/* Navigation Sidebar */}
        <div className="settings-sidebar-nav">
          <button
            className={`settings-nav-btn ${activeCategory === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveCategory('appearance')}
          >
            <Palette size={15} />
            <span>Appearance</span>
          </button>

          <button
            className={`settings-nav-btn ${activeCategory === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveCategory('editor')}
          >
            <FileCode size={15} />
            <span>Code Editor</span>
          </button>


          <button
            className={`settings-nav-btn ${activeCategory === 'vm' ? 'active' : ''}`}
            onClick={() => setActiveCategory('vm')}
          >
            <Cpu size={15} />
            <span>Linux VM Sandbox</span>
          </button>

          <button
            className={`settings-nav-btn ${activeCategory === 'agent' ? 'active' : ''}`}
            onClick={() => setActiveCategory('agent')}
          >
            <Bot size={15} />
            <span>AI Agent & OpenCode</span>
          </button>

          <button
            className={`settings-nav-btn ${activeCategory === 'skills_mcp' ? 'active' : ''}`}
            onClick={() => setActiveCategory('skills_mcp')}
          >
            <Boxes size={15} />
            <span>Skills & MCP Servers</span>
          </button>

          <button
            className={`settings-nav-btn ${activeCategory === 'security' ? 'active' : ''}`}
            onClick={() => setActiveCategory('security')}
          >
            <Shield size={15} />
            <span>Security & Sandbox</span>
          </button>

          <button
            className={`settings-nav-btn ${activeCategory === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveCategory('audit')}
          >
            <Database size={15} />
            <span>SQLite Audit Trail</span>
          </button>

          <button
            className={`settings-nav-btn ${activeCategory === 'about' ? 'active' : ''}`}
            onClick={() => setActiveCategory('about')}
          >
            <Info size={15} />
            <span>System & About</span>
          </button>
        </div>

        {/* Content Pane */}
        <div className="settings-content-pane">
          {/* =========================================================================
              CATEGORY 1: APPEARANCE
             ========================================================================= */}
          {activeCategory === 'appearance' && (
            <>
              {/* Theme Selection */}
              <div className="settings-section-card">
                <div className="settings-card-header">
                  <h3>
                    <Sun size={16} color="var(--accent-cyan)" />
                    <span>Theme & Appearance Mode</span>
                  </h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div
                    onClick={() => {
                      onSetTheme('dark');
                      showToast('✓ Dark theme activated');
                    }}
                    style={{
                      padding: 16,
                      borderRadius: 'var(--radius-sm)',
                      background: '#0c0f17',
                      border: `2px solid ${theme === 'dark' ? 'var(--accent-cyan)' : 'var(--border-panel)'}`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Moon size={22} color={theme === 'dark' ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: '#f1f5f9' }}>Dark Theme</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>High-contrast dark IDE interface</div>
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      onSetTheme('light');
                      showToast('✓ Light theme activated');
                    }}
                    style={{
                      padding: 16,
                      borderRadius: 'var(--radius-sm)',
                      background: '#f8fafc',
                      border: `2px solid ${theme === 'light' ? 'var(--accent-cyan)' : 'var(--border-panel)'}`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Sun size={22} color={theme === 'light' ? '#f59e0b' : '#64748b'} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: '#0f172a' }}>Light Theme</div>
                      <div style={{ fontSize: 11.5, color: '#64748b' }}>Clean high-visibility daytime palette</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Accent Color Selection */}
              <div className="settings-section-card">
                <div className="settings-card-header">
                  <h3>
                    <Palette size={16} color="var(--accent-cyan)" />
                    <span>Accent Theme Color</span>
                  </h3>
                </div>

                <div className="settings-control-row">
                  <div className="settings-control-label">
                    <span>Interactive UI Highlight Color</span>
                    <span>Used for focus borders, terminal buttons, badges, and cursor glow</span>
                  </div>

                  <div className="color-palette-options">
                    {ACCENT_COLORS.map((col) => (
                      <button
                        key={col.value}
                        type="button"
                        className={`color-circle-btn ${accentColor === col.value ? 'active' : ''}`}
                        style={{ backgroundColor: col.value }}
                        onClick={() => handleAccentChange(col.value, col.name)}
                        title={col.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="settings-control-row">
                  <div className="settings-control-label">
                    <span>UI Scaling Density</span>
                    <span>Overall layout font sizing and padding</span>
                  </div>

                  <div className="segmented-pill-group">
                    {['90%', '100%', '110%'].map((scale) => (
                      <button
                        key={scale}
                        type="button"
                        className={`segmented-pill-btn ${uiScaling === scale ? 'active' : ''}`}
                        onClick={() => {
                          setUiScaling(scale);
                          localStorage.setItem('wb_ui_scaling', scale);
                          showToast(`✓ UI scaling set to ${scale}`);
                        }}
                      >
                        {scale}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* =========================================================================
              CATEGORY 2: CODE EDITOR
             ========================================================================= */}
          {activeCategory === 'editor' && (
            <>
              <div className="settings-section-card">
                <div className="settings-card-header">
                  <h3>
                    <FileCode size={16} color="var(--accent-cyan)" />
                    <span>Editor Typography & Formatting</span>
                  </h3>
                </div>

                <div className="settings-control-row">
                  <div className="settings-control-label">
                    <span>Font Family</span>
                    <span>Monospace programming font for active code workspace</span>
                  </div>

                  <select
                    className="form-select"
                    style={{ width: 180, fontSize: 12 }}
                    value={fontFamily}
                    onChange={(e) => handleFontFamilyChange(e.target.value)}
                  >
                    <option value="JetBrains Mono">JetBrains Mono</option>
                    <option value="Fira Code">Fira Code</option>
                    <option value="SF Mono">SF Mono</option>
                    <option value="Menlo">Menlo</option>
                    <option value="Courier New">Courier New</option>
                  </select>
                </div>

                <div className="settings-control-row">
                  <div className="settings-control-label">
                    <span>Font Size</span>
                    <span>Editor text rendering size</span>
                  </div>

                  <div className="segmented-pill-group">
                    {[12, 13, 14, 15, 16].map((size) => (
                      <button
                        key={size}
                        type="button"
                        className={`segmented-pill-btn ${fontSize === size ? 'active' : ''}`}
                        onClick={() => handleFontSizeChange(size)}
                      >
                        {size}px
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-control-row">
                  <div className="settings-control-label">
                    <span>Line Height</span>
                    <span>Vertical spacing between lines of code</span>
                  </div>

                  <div className="segmented-pill-group">
                    {[
                      { label: 'Compact', value: '18px' },
                      { label: 'Default', value: '20px' },
                      { label: 'Spacious', value: '24px' },
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        className={`segmented-pill-btn ${lineHeight === item.value ? 'active' : ''}`}
                        onClick={() => {
                          setLineHeight(item.value);
                          localStorage.setItem('wb_editor_line_height', item.value);
                          document.documentElement.style.setProperty('--editor-line-height', item.value);
                          showToast(`✓ Line height set to ${item.label}`);
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-control-row">
                  <div className="settings-control-label">
                    <span>Tab Indentation Size</span>
                    <span>Number of spaces inserted for tab indents</span>
                  </div>

                  <div className="segmented-pill-group">
                    {[2, 4].map((spaces) => (
                      <button
                        key={spaces}
                        type="button"
                        className={`segmented-pill-btn ${tabSize === spaces ? 'active' : ''}`}
                        onClick={() => handleTabSizeChange(spaces)}
                      >
                        {spaces} Spaces
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-control-row">
                  <div className="settings-control-label">
                    <span>Word Wrap</span>
                    <span>Wrap lines that exceed horizontal viewport width</span>
                  </div>

                  <label className="settings-switch-toggle">
                    <input
                      type="checkbox"
                      checked={wordWrap}
                      onChange={handleWordWrapToggle}
                    />
                    <span className="settings-switch-slider" />
                  </label>
                </div>

                <div className="settings-control-row">
                  <div className="settings-control-label">
                    <span>AutoSave Mode</span>
                    <span>How file modifications are synchronized to host disk</span>
                  </div>

                  <select
                    className="form-select"
                    style={{ width: 180, fontSize: 12 }}
                    value={autoSaveMode}
                    onChange={(e) => {
                      setAutoSaveMode(e.target.value);
                      localStorage.setItem('wb_autosave_mode', e.target.value);
                      showToast(`✓ AutoSave mode updated`);
                    }}
                  >
                    <option value="delay-1s">After 1s Inactivity (Default)</option>
                    <option value="delay-3s">After 3s Inactivity</option>
                    <option value="manual">Manual Only (Cmd+S)</option>
                  </select>
                </div>
              </div>
            </>
          )}



          {/* =========================================================================
              CATEGORY 3: VIRTUAL MACHINE & SANDBOX
             ========================================================================= */}
          {activeCategory === 'vm' && (
            <>
              <div className="settings-section-card">
                <div className="settings-card-header">
                  <h3>
                    <Cpu size={16} color="var(--accent-cyan)" />
                    <span>VM Hypervisor & Hardware Defaults</span>
                  </h3>
                </div>

                <div className="settings-control-row">
                  <div className="settings-control-label">
                    <span>Default Virtual CPUs (vCPUs)</span>
                    <span>Processor cores assigned to Linux guest sandbox</span>
                  </div>

                  <select
                    className="form-select"
                    style={{ width: 180, fontSize: 12 }}
                    value={defaultCpu}
                    onChange={(e) => {
                      setDefaultCpu(Number(e.target.value));
                      showToast(`✓ Default vCPUs set to ${e.target.value}`);
                    }}
                  >
                    <option value={1}>1 vCPU</option>
                    <option value={2}>2 vCPUs (Recommended)</option>
                    <option value={4}>4 vCPUs (High Performance)</option>
                    <option value={8}>8 vCPUs</option>
                  </select>
                </div>

                <div className="settings-control-row">
                  <div className="settings-control-label">
                    <span>Default Guest Memory (RAM)</span>
                    <span>Physical RAM mapped to guest sandbox</span>
                  </div>

                  <select
                    className="form-select"
                    style={{ width: 180, fontSize: 12 }}
                    value={defaultMem}
                    onChange={(e) => {
                      setDefaultMem(Number(e.target.value));
                      showToast(`✓ Default Memory set to ${e.target.value} MB`);
                    }}
                  >
                    <option value={2048}>2 GB RAM</option>
                    <option value={4096}>4 GB RAM (Recommended)</option>
                    <option value={8192}>8 GB RAM</option>
                    <option value={16384}>16 GB RAM</option>
                  </select>
                </div>

                <div className="settings-control-row">
                  <div className="settings-control-label">
                    <span>Default Disk Allocation</span>
                    <span>Virtual raw disk size for Linux guest filesystem</span>
                  </div>

                  <select
                    className="form-select"
                    style={{ width: 180, fontSize: 12 }}
                    value={defaultDisk}
                    onChange={(e) => {
                      setDefaultDisk(Number(e.target.value));
                      showToast(`✓ Default Disk set to ${e.target.value} GB`);
                    }}
                  >
                    <option value={10}>10 GB</option>
                    <option value={20}>20 GB (Standard)</option>
                    <option value={40}>40 GB</option>
                    <option value={80}>80 GB</option>
                  </select>
                </div>

                <div className="settings-control-row">
                  <div className="settings-control-label">
                    <span>Network Isolation Level</span>
                    <span>Network access policy for the guest VM</span>
                  </div>

                  <select
                    className="form-select"
                    style={{ width: 220, fontSize: 12 }}
                    value={networkPolicy}
                    onChange={(e) => {
                      setNetworkPolicy(e.target.value);
                      showToast(`✓ Network policy set to ${e.target.value}`);
                    }}
                  >
                    <option value="standard">Standard (IPv4/IPv6 Dual Stack)</option>
                    <option value="restricted">Restricted (Package Registries Only)</option>
                    <option value="disabled">Air-Gapped (Zero Network Access)</option>
                  </select>
                </div>

                <div className="settings-control-row">
                  <div className="settings-control-label">
                    <span>Auto-Rotate VM Runtime</span>
                    <span>Automatically restart and refresh ephemeral cache at periodic intervals</span>
                  </div>

                  <select
                    className="form-select"
                    style={{ width: 180, fontSize: 12 }}
                    value={autoRotateMinutes}
                    onChange={(e) => {
                      const mins = Number(e.target.value);
                      onSetAutoRotateMinutes?.(mins);
                      showToast(`✓ Auto-rotate interval set to ${mins > 0 ? `${mins} minutes` : 'Off'}`);
                    }}
                  >
                    <option value={0}>Disabled</option>
                    <option value={15}>Every 15 Minutes</option>
                    <option value={30}>Every 30 Minutes</option>
                    <option value={60}>Every 60 Minutes (Default)</option>
                    <option value={120}>Every 120 Minutes</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* =========================================================================
              CATEGORY 4: AI AGENT & OPENCODE
             ========================================================================= */}
          {activeCategory === 'agent' && (
            <>
              <div className="settings-section-card">
                <div className="settings-card-header">
                  <h3>
                    <Bot size={16} color="var(--accent-cyan)" />
                    <span>AI Model & Autonomous Supervision</span>
                  </h3>
                </div>

                <div className="settings-control-row">
                  <div className="settings-control-label">
                    <span>Default Model</span>
                    <span>Primary AI model initialized for OpenCode agent tasks</span>
                  </div>

                  <select
                    className="form-select"
                    style={{ width: 220, fontSize: 12 }}
                    value={defaultModel}
                    onChange={(e) => {
                      setDefaultModel(e.target.value);
                      showToast(`✓ Default AI model updated to ${e.target.value}`);
                    }}
                  >
                    <option value="claude-3-7-sonnet">Claude 3.7 Sonnet (Anthropic)</option>
                    <option value="gpt-4o">GPT-4o (OpenAI)</option>
                    <option value="deepseek-r1">DeepSeek R1 (Reasoning)</option>
                    <option value="llama-3.3-70b">Llama 3.3 70B (Ollama Local)</option>
                  </select>
                </div>

                <div className="settings-control-row">
                  <div className="settings-control-label">
                    <span>Agent Autonomy Level</span>
                    <span>Safety gates before executing commands or modifying files</span>
                  </div>

                  <select
                    className="form-select"
                    style={{ width: 220, fontSize: 12 }}
                    value={agentAutonomy}
                    onChange={(e) => {
                      setAgentAutonomy(e.target.value);
                      showToast(`✓ Agent autonomy set to ${e.target.value}`);
                    }}
                  >
                    <option value="semi-autonomous">Semi-Autonomous (Confirm Commands)</option>
                    <option value="full-autonomous">Fully Autonomous (Auto-Run in VM)</option>
                    <option value="read-only">Read-Only (Suggest Diffs Only)</option>
                  </select>
                </div>

                <div className="settings-control-row">
                  <div className="settings-control-label">
                    <span>Max Execution Steps</span>
                    <span>Maximum tool loop steps allowed before pausing for confirmation</span>
                  </div>

                  <div className="segmented-pill-group">
                    {[10, 25, 50, 100].map((steps) => (
                      <button
                        key={steps}
                        type="button"
                        className={`segmented-pill-btn ${maxSteps === steps ? 'active' : ''}`}
                        onClick={() => {
                          setMaxSteps(steps);
                          showToast(`✓ Max execution steps set to ${steps}`);
                        }}
                      >
                        {steps}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-control-row">
                  <div className="settings-control-label">
                    <span>Real-time Virtio-FS Synchronization</span>
                    <span>Instantly write file modifications from guest agent to host project directory</span>
                  </div>

                  <label className="settings-switch-toggle">
                    <input
                      type="checkbox"
                      checked={autoSyncVirtioFs}
                      onChange={() => {
                        setAutoSyncVirtioFs((prev) => !prev);
                        showToast(`✓ Virtio-FS auto-sync toggled`);
                      }}
                    />
                    <span className="settings-switch-slider" />
                  </label>
                </div>

                <div className="settings-control-row">
                  <div className="settings-control-label">
                    <span>OpenCode Terminal Output Verbosity</span>
                    <span>TUI logging detail rendered inside the guest sandbox console</span>
                  </div>

                  <div className="segmented-pill-group">
                    {[
                      { id: 'detailed', label: 'Detailed TUI' },
                      { id: 'compact', label: 'Compact' },
                      { id: 'silent', label: 'Silent' },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        className={`segmented-pill-btn ${opencodeVerbosity === mode.id ? 'active' : ''}`}
                        onClick={() => {
                          setOpencodeVerbosity(mode.id);
                          showToast(`✓ OpenCode verbosity set to ${mode.label}`);
                        }}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* OpenCode Persistent Session & Cache Management */}
              <div className="settings-section-card">
                <div className="settings-card-header">
                  <h3>
                    <Database size={16} color="var(--accent-cyan)" />
                    <span>OpenCode Persistent Sessions & Memory Storage</span>
                  </h3>
                  <span
                    style={{
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#34d399',
                      fontWeight: 600,
                    }}
                  >
                    ● Persistent (/workspace/.opencode)
                  </span>
                </div>

                <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  OpenCode chat conversations, task checkpoints, agent memory, and token contexts are preserved across VM restarts and rotations in your workspace's <code>.opencode</code> directory. Use the tools below to selectively clean or purge cached agent state.
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                  {/* Option 1: Project-level sessions */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border-panel)',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                        Clear Project Sessions & Memory
                      </span>
                      <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                        Wipes saved session conversations, checkpoints, and cached tokens for this project (<code>.opencode/data</code>).
                      </span>
                    </div>

                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ color: '#fb7185', borderColor: 'rgba(244, 63, 94, 0.3)', flexShrink: 0 }}
                      onClick={handleClearOpencodeSessions}
                      title="Clear session history for current workspace"
                    >
                      <Trash2 size={13} />
                      <span>Clear Project Sessions</span>
                    </button>
                  </div>

                  {/* Option 2: Global OpenCode Database */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border-panel)',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                        Purge Global OpenCode Database (~150MB+)
                      </span>
                      <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                        Deletes global SQLite chat database, command snapshots, and tool execution logs. MCP server keys are preserved.
                      </span>
                    </div>

                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ color: '#fb7185', borderColor: 'rgba(244, 63, 94, 0.3)', flexShrink: 0 }}
                      onClick={handleClearGlobalHistory}
                      title="Purge global opencode.db and logs"
                    >
                      <Database size={13} />
                      <span>Purge Global DB</span>
                    </button>
                  </div>

                  {/* Option 3: Model and Token Cache */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border-panel)',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                        Clear Model Cache & Temp Packages
                      </span>
                      <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                        Cleans cached model manifests, npm packages, and temporary agent tokens in <code>~/.cache/opencode</code>.
                      </span>
                    </div>

                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ color: 'var(--accent-cyan)', borderColor: 'rgba(56, 189, 248, 0.3)', flexShrink: 0 }}
                      onClick={handleClearOpencodeCache}
                      title="Clear cached packages and models"
                    >
                      <RefreshCw size={13} />
                      <span>Clear Cache</span>
                    </button>
                  </div>

                  {/* Option 4: Master Full Clean */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(244, 63, 94, 0.04)',
                      border: '1px solid rgba(244, 63, 94, 0.25)',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#fb7185' }}>
                        Full Clean Slate (Reset All Agent Data)
                      </span>
                      <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                        Simultaneously clears project checkpoints, global conversation database, and model cache for a 100% fresh start.
                      </span>
                    </div>

                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', borderColor: '#fb7185', flexShrink: 0 }}
                      onClick={handlePurgeAllAgentData}
                      title="Complete reset of all agent sessions and caches"
                    >
                      <Trash2 size={13} />
                      <span>Full Clean Slate</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* =========================================================================
              CATEGORY: SKILLS & MCP SERVERS
             ========================================================================= */}
          {activeCategory === 'skills_mcp' && (
            <div className="h-full min-h-[600px] flex flex-col -m-6">
              <McpSkillsManager onNotify={showToast} />
            </div>
          )}

          {/* =========================================================================
              CATEGORY 5: SECURITY & PRIVACY
             ========================================================================= */}
          {activeCategory === 'security' && (
            <>
              <div className="settings-section-card">
                <div className="settings-card-header">
                  <h3>
                    <ShieldCheck size={16} color="#10b981" />
                    <span>Security Boundaries & Key Vault</span>
                  </h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div
                    style={{
                      padding: 12,
                      background: 'rgba(16, 185, 129, 0.05)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981', fontWeight: 600, fontSize: 13 }}>
                      <Lock size={14} />
                      <span>macOS Keychain Service</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                      Target: <code>com.workbench.agent</code> (AES-256-GCM Secure Enclave encrypted)
                    </div>
                  </div>

                  <div
                    style={{
                      padding: 12,
                      background: 'rgba(56, 189, 248, 0.05)',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-cyan)', fontWeight: 600, fontSize: 13 }}>
                      <Shield size={14} />
                      <span>Host Path Traversal Guard</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                      Enforced strictly at <code>/workspace</code>. Symlinks & parent escapes blocked.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      onRotateVm?.();
                      showToast('✓ Ephemeral VM cache purged and session key rotated!');
                    }}
                  >
                    <RotateCw size={13} />
                    <span>Purge Ephemeral Cache & Rotate Session Key</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* =========================================================================
              CATEGORY 6: SQLITE AUDIT TRAIL
             ========================================================================= */}
          {activeCategory === 'audit' && (
            <>
              <div className="settings-section-card">
                <div className="settings-card-header">
                  <h3>
                    <Database size={16} color="var(--accent-purple)" />
                    <span>Local SQLite Audit Trail ({filteredAuditLogs.length} events)</span>
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={loadAuditLogs}
                      title="Refresh audit event records"
                    >
                      <RefreshCw size={12} className={isRefreshingAudit ? 'spin-animation' : ''} />
                      <span>Refresh</span>
                    </button>

                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleExportAuditJson}
                      title="Download audit logs as JSON file"
                    >
                      <Download size={12} />
                      <span>Export JSON</span>
                    </button>

                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ color: '#fb7185' }}
                      onClick={handleClearAuditHistory}
                      title="Clear local audit records"
                    >
                      <Trash2 size={12} />
                      <span>Clear</span>
                    </button>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={13} style={{ position: 'absolute', left: 10, top: 9, color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Search audit payload or event..."
                      value={auditSearchQuery}
                      onChange={(e) => setAuditSearchQuery(e.target.value)}
                      style={{ paddingLeft: 28, fontSize: 12, height: 32 }}
                    />
                  </div>

                  <select
                    className="form-select"
                    style={{ width: 160, fontSize: 12, height: 32 }}
                    value={auditFilterType}
                    onChange={(e) => setAuditFilterType(e.target.value)}
                  >
                    <option value="all">All Event Types</option>
                    <option value="workspace">workspace.*</option>
                    <option value="vm">vm.*</option>
                    <option value="agent">agent.*</option>
                  </select>
                </div>

                {/* Audit Event Table */}
                <div
                  style={{
                    maxHeight: 360,
                    overflowY: 'auto',
                    border: '1px solid var(--border-panel)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-app)',
                  }}
                >
                  {filteredAuditLogs.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                      No audit events match your filter criteria.
                    </div>
                  ) : (
                    filteredAuditLogs.map((log) => (
                      <div
                        key={log.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          borderBottom: '1px solid var(--border-subtle)',
                          fontSize: 12,
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                          <span
                            style={{
                              fontSize: 11,
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: 'rgba(56, 189, 248, 0.12)',
                              color: 'var(--accent-cyan)',
                              flexShrink: 0,
                            }}
                          >
                            {log.eventType}
                          </span>
                          <span
                            style={{
                              color: 'var(--text-secondary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {log.payloadJson}
                          </span>
                        </div>

                        <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 12 }}>
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {/* =========================================================================
              CATEGORY 7: SYSTEM & ABOUT
             ========================================================================= */}
          {activeCategory === 'about' && (
            <>
              {/* BihariGraphic / Developer Ritesh Card */}
              <div
                className="settings-section-card"
                style={{
                  background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  alignItems: 'center',
                  textAlign: 'center',
                  padding: '28px 24px',
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: 'rgba(56, 189, 248, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 8,
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                  }}
                >
                  <Sparkles size={28} color="var(--accent-cyan)" />
                </div>

                <h2 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.02em' }}>
                  BihariGraphic
                </h2>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                  AI Agent Workbench • Developer Sandbox
                </div>

                <div
                  style={{
                    marginTop: 10,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 12px',
                    borderRadius: 9999,
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#34d399',
                  }}
                >
                  <TermIcon size={13} color="#34d399" />
                  <span>Developer Ritesh</span>
                </div>
              </div>

              {/* Environment Specifications */}
              <div className="settings-section-card">
                <div className="settings-card-header">
                  <h3>
                    <Info size={16} color="var(--accent-cyan)" />
                    <span>Runtime Specifications</span>
                  </h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Host Platform</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>macOS Apple Silicon (Darwin aarch64)</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Virtualization Framework</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>Apple Virtualization / vfkit v0.6.4</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Guest Kernel</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>Linux 6.6.137-arm64 (Dual Stack IPv4/IPv6)</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>AI Agent Runtime</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>OpenCode v2.1.4</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>GUI Architecture</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>Tauri v2 + React 19 + TypeScript + Vite</span>
                  </div>
                </div>

                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-panel)', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleResetDefaults}
                  >
                    <span>Restore Factory Defaults</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
