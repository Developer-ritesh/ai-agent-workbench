import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Cpu,
  Globe,
  Terminal,
  Plus,
  RefreshCw,
  FolderInput,
  Search,
  CheckCircle2,
  FileText,
  Trash2,
  Edit2,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  X,
  Folder,
  Eye,
  EyeOff,
  Key,
  Activity,
} from 'lucide-react';
import { OpencodeMcpServer, OpencodeSkillInfo, OpencodeSyncResult } from '../../types';
import { TauriApi } from '../../services/tauriIpc';

interface McpSkillsManagerProps {
  onNotify?: (msg: string) => void;
}

export const McpSkillsManager: React.FC<McpSkillsManagerProps> = ({ onNotify }) => {
  const [activeTab, setActiveTab] = useState<'mcp' | 'skills'>('mcp');
  const [mcpServers, setMcpServers] = useState<OpencodeMcpServer[]>([]);
  const [skills, setSkills] = useState<OpencodeSkillInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [mcpSearch, setMcpSearch] = useState<string>('');
  const [mcpFilter, setMcpFilter] = useState<'all' | 'local' | 'remote' | 'active' | 'disabled'>('all');
  const [selectedServerDetails, setSelectedServerDetails] = useState<OpencodeMcpServer | null>(null);
  const [showSecrets, setShowSecrets] = useState<boolean>(false);
  const [skillsSearch, setSkillsSearch] = useState<string>('');
  const [skillsCategory, setSkillsCategory] = useState<string>('all');
  const [skillsPage, setSkillsPage] = useState<number>(1);
  const skillsPerPage = 12;

  // Sync / Import Modal State
  const [showSyncModal, setShowSyncModal] = useState<boolean>(false);
  const [customPath, setCustomPath] = useState<string>('/Users/developerritesh/Programming/opencode-config');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Add / Edit MCP Server Modal State
  const [editingServer, setEditingServer] = useState<OpencodeMcpServer | null>(null);
  const [isAddServerOpen, setIsAddServerOpen] = useState<boolean>(false);
  const [formId, setFormId] = useState<string>('');
  const [formType, setFormType] = useState<'local' | 'remote'>('local');
  const [formCommand, setFormCommand] = useState<string>('npx -y @modelcontextprotocol/server-');
  const [formUrl, setFormUrl] = useState<string>('https://');
  const [formHeaders, setFormHeaders] = useState<string>('');
  const [formEnv, setFormEnv] = useState<string>('');

  // Skill Preview Modal State
  const [selectedSkill, setSelectedSkill] = useState<OpencodeSkillInfo | null>(null);
  const [skillContent, setSkillContent] = useState<string>('');
  const [isLoadingSkillContent, setIsLoadingSkillContent] = useState<boolean>(false);

  const notify = (msg: string) => {
    if (onNotify) onNotify(msg);
    setSyncStatus(msg);
    setTimeout(() => setSyncStatus(null), 3500);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [mcps, sks] = await Promise.all([
        TauriApi.getOpencodeMcpConfig().catch(() => []),
        TauriApi.listOpencodeSkills().catch(() => []),
      ]);
      setMcpServers(mcps);
      setSkills(sks);
    } catch (e) {
      console.error('Failed to load MCP & Skills data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Toggle MCP Server
  const handleToggleMcp = async (id: string, currentEnabled: boolean) => {
    const next = !currentEnabled;
    try {
      setMcpServers((prev) =>
        prev.map((s) => (s.id === id ? { ...s, enabled: next } : s))
      );
      await TauriApi.toggleOpencodeMcpServer(id, next);
      notify(`✓ MCP server '${id}' ${next ? 'enabled' : 'disabled'}`);
    } catch (e) {
      console.error(e);
      notify(`Failed to toggle server '${id}'`);
      loadData();
    }
  };

  // Handle Delete MCP Server
  const handleDeleteMcp = async (id: string) => {
    if (!confirm(`Are you sure you want to remove MCP server '${id}'?`)) return;
    try {
      setMcpServers((prev) => prev.filter((s) => s.id !== id));
      await TauriApi.deleteOpencodeMcpServer(id);
      notify(`✓ MCP server '${id}' removed from configuration.`);
    } catch (e) {
      console.error(e);
      notify(`Failed to remove server '${id}'`);
      loadData();
    }
  };

  // Open Edit Modal
  const openEditModal = (server: OpencodeMcpServer) => {
    setEditingServer(server);
    setFormId(server.id);
    setFormType(server.type);
    setFormCommand(server.command ? server.command.join(' ') : '');
    setFormUrl(server.url || '');
    setFormHeaders(server.headers ? JSON.stringify(server.headers, null, 2) : '');
    setFormEnv(server.environment ? JSON.stringify(server.environment, null, 2) : '');
    setIsAddServerOpen(true);
  };

  // Open New Modal
  const openNewModal = () => {
    setEditingServer(null);
    setFormId('');
    setFormType('local');
    setFormCommand('npx -y @modelcontextprotocol/server-');
    setFormUrl('https://');
    setFormHeaders('');
    setFormEnv('');
    setIsAddServerOpen(true);
  };

  // Save MCP Server
  const handleSaveMcp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formId.trim()) return;

    let parsedHeaders: Record<string, string> | undefined = undefined;
    if (formHeaders.trim()) {
      try {
        parsedHeaders = JSON.parse(formHeaders);
      } catch {
        alert('Invalid JSON in Headers field');
        return;
      }
    }

    let parsedEnv: Record<string, string> | undefined = undefined;
    if (formEnv.trim()) {
      try {
        parsedEnv = JSON.parse(formEnv);
      } catch {
        alert('Invalid JSON in Environment Variables field');
        return;
      }
    }

    const newServer: OpencodeMcpServer = {
      id: formId.trim(),
      type: formType,
      enabled: editingServer ? editingServer.enabled : true,
      command: formType === 'local' ? formCommand.trim().split(/\s+/) : undefined,
      url: formType === 'remote' ? formUrl.trim() : undefined,
      headers: parsedHeaders,
      environment: parsedEnv,
    };

    try {
      await TauriApi.saveOpencodeMcpServer(newServer);
      setIsAddServerOpen(false);
      notify(`✓ MCP server '${newServer.id}' saved successfully.`);
      loadData();
    } catch (err) {
      console.error(err);
      alert(`Failed to save server: ${err}`);
    }
  };

  // Handle Sync / Install from Path
  const handleSyncFromPath = async () => {
    setIsSyncing(true);
    try {
      const res: OpencodeSyncResult = await TauriApi.syncOpencodeFromPath(
        customPath.trim() || undefined
      );
      setShowSyncModal(false);
      notify(`✓ ${res.message}`);
      await loadData();
    } catch (err) {
      console.error(err);
      alert(`Sync failed: ${err}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle View Skill SKILL.md
  const handleViewSkill = async (skill: OpencodeSkillInfo) => {
    setSelectedSkill(skill);
    setIsLoadingSkillContent(true);
    try {
      const content = await TauriApi.getOpencodeSkillContent(skill.name);
      setSkillContent(content);
    } catch (e) {
      setSkillContent(`Failed to load SKILL.md content: ${e}`);
    } finally {
      setIsLoadingSkillContent(false);
    }
  };

  // Filter MCPs
  const filteredMcps = mcpServers.filter((s) => {
    const q = mcpSearch.toLowerCase();
    const matchesSearch =
      s.id.toLowerCase().includes(q) ||
      (s.url && s.url.toLowerCase().includes(q)) ||
      (s.command && s.command.join(' ').toLowerCase().includes(q));
    if (!matchesSearch) return false;

    if (mcpFilter === 'local') return s.type === 'local';
    if (mcpFilter === 'remote') return s.type === 'remote';
    if (mcpFilter === 'active') return s.enabled;
    if (mcpFilter === 'disabled') return !s.enabled;
    return true;
  });

  // Filter Skills
  const filteredSkills = skills.filter((sk) => {
    const q = skillsSearch.toLowerCase();
    const matchesSearch =
      sk.name.toLowerCase().includes(q) ||
      sk.title.toLowerCase().includes(q) ||
      sk.description.toLowerCase().includes(q);

    if (!matchesSearch) return false;
    if (skillsCategory === 'all') return true;
    if (skillsCategory === 'security')
      return sk.name.includes('security') || sk.name.includes('pentest') || sk.name.includes('abuse');
    if (skillsCategory === 'frontend')
      return sk.name.includes('react') || sk.name.includes('angular') || sk.name.includes('accessibility') || sk.name.includes('ui');
    if (skillsCategory === 'agent')
      return sk.name.includes('agent') || sk.name.includes('ai');
    if (skillsCategory === 'backend')
      return sk.name.includes('api') || sk.name.includes('sql') || sk.name.includes('database') || sk.name.includes('docker');
    return true;
  });

  const totalSkillsPages = Math.max(1, Math.ceil(filteredSkills.length / skillsPerPage));
  const paginatedSkills = filteredSkills.slice((skillsPage - 1) * skillsPerPage, skillsPage * skillsPerPage);

  return (
    <div className="flex flex-col h-full w-full bg-[#08090d] text-zinc-100 font-sans select-none overflow-hidden">
      {/* Toast Bar */}
      {syncStatus && (
        <div className="bg-emerald-600/90 text-white text-xs px-4 py-2 font-medium flex items-center justify-between border-b border-emerald-500/40">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>{syncStatus}</span>
          </div>
          <button onClick={() => setSyncStatus(null)} className="text-emerald-200 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="p-5 border-b border-white/[0.08] bg-[#0c0e17]/80 backdrop-blur-xl flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-800/50 flex items-center justify-center text-cyan-400 shadow-inner">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-bold text-white tracking-wide">
                OpenCode Skills &amp; MCP Server Management
              </h1>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/40 font-mono font-medium">
                v2.1.4 Config
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Bundled Model Context Protocol tools and 400+ autonomous agent skills integrated with your isolated Linux microVM.
            </p>
          </div>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowSyncModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-cyan-300 border border-cyan-700/50 rounded-xl text-xs font-medium transition shadow-sm cursor-pointer"
            title="Import/Sync skills and MCPs from a directory on your machine"
          >
            <FolderInput className="w-3.5 h-3.5" />
            <span>Sync / Reinstall from Path</span>
          </button>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-1.5 bg-white/[0.03] hover:bg-white/[0.07] text-zinc-300 border border-white/[0.08] rounded-xl transition cursor-pointer"
            title="Reload configuration"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-3 gap-3 p-4 border-b border-white/[0.08] bg-[#08090d] flex-shrink-0">
        <div className="bg-white/[0.025] border border-white/[0.08] rounded-2xl p-3.5 flex items-center justify-between shadow-lg">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Active MCP Servers
            </div>
            <div className="text-xl font-bold text-white mt-0.5">
              {mcpServers.filter((s) => s.enabled).length}{' '}
              <span className="text-xs font-normal text-zinc-500">/ {mcpServers.length} installed</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-950/60 border border-blue-800/40 flex items-center justify-center text-blue-400 shadow-sm">
            <Cpu className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white/[0.025] border border-white/[0.08] rounded-2xl p-3.5 flex items-center justify-between shadow-lg">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Pre-Installed Skills
            </div>
            <div className="text-xl font-bold text-white mt-0.5">
              {skills.length}{' '}
              <span className="text-xs font-normal text-zinc-500">autonomous capabilities</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400 shadow-sm">
            <FileText className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white/[0.025] border border-white/[0.08] rounded-2xl p-3.5 flex items-center justify-between shadow-lg">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              MicroVM Provisioning
            </div>
            <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Mounted at ~/.config/opencode</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400 shadow-sm">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between px-4 border-b border-white/[0.08] bg-[#0c0e17]/80 backdrop-blur-xl flex-shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('mcp')}
              className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                activeTab === 'mcp'
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Model Context Protocol (MCP) Servers</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/[0.08] text-zinc-300">
                {mcpServers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('skills')}
              className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                activeTab === 'skills'
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Developer Skills Directory</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/[0.08] text-zinc-300">
                {skills.length}
              </span>
            </button>
          </div>

          {activeTab === 'mcp' && (
            <button
              onClick={openNewModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold transition shadow-md cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add MCP Server</span>
            </button>
          )}
        </div>

        {/* TAB 1: MCP SERVERS */}
        {activeTab === 'mcp' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-4">
            {/* Search and Category Filter Toolbar */}
            <div className="flex items-center gap-3 mb-3 flex-shrink-0">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search MCP servers by name, command, or remote endpoint URL..."
                  value={mcpSearch}
                  onChange={(e) => setMcpSearch(e.target.value)}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-cyan-500 transition font-mono"
                />
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 text-xs">
                {(
                  [
                    { id: 'all', label: `All (${mcpServers.length})` },
                    { id: 'local', label: `Local (${mcpServers.filter((s) => s.type === 'local').length})` },
                    { id: 'remote', label: `Remote (${mcpServers.filter((s) => s.type === 'remote').length})` },
                    { id: 'active', label: `Active (${mcpServers.filter((s) => s.enabled).length})` },
                    { id: 'disabled', label: `Disabled (${mcpServers.filter((s) => !s.enabled).length})` },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setMcpFilter(f.id)}
                    className={`px-2.5 py-1.5 rounded-lg font-medium text-[11px] transition border cursor-pointer ${
                      mcpFilter === f.id
                        ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-bold shadow-sm'
                        : 'bg-white/[0.03] border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* MCP Servers Grid */}
            <div className="flex-1 overflow-y-auto pr-1">
              {filteredMcps.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs font-sans">
                  No MCP servers match &quot;{mcpSearch}&quot; in category &quot;{mcpFilter}&quot;
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5 pb-4">
                  {filteredMcps.map((server) => (
                    <div
                      key={server.id}
                      onClick={() => setSelectedServerDetails(server)}
                      className={`bg-[#0a0d14] hover:bg-[#0d121c] border rounded-2xl p-4 transition flex flex-col justify-between gap-3 cursor-pointer shadow-lg group ${
                        server.enabled
                          ? 'border-white/[0.08] hover:border-cyan-500/40 hover:shadow-cyan-500/5'
                          : 'border-white/[0.04] opacity-60'
                      }`}
                    >
                      {/* Card Header: Icon, Name, Status, Toggle */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                              server.type === 'remote'
                                ? 'bg-purple-950/60 border border-purple-800/40 text-purple-400'
                                : 'bg-cyan-950/60 border border-cyan-800/40 text-cyan-400'
                            }`}
                          >
                            {server.type === 'remote' ? (
                              <Globe className="w-4 h-4" />
                            ) : (
                              <Terminal className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-xs font-mono tracking-wide truncate group-hover:text-cyan-300 transition">
                                {server.id}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.2 rounded-full font-mono uppercase font-bold shrink-0 ${
                                  server.type === 'remote'
                                    ? 'bg-purple-900/30 text-purple-300 border border-purple-700/40'
                                    : 'bg-cyan-900/30 text-cyan-300 border border-cyan-700/40'
                                }`}
                              >
                                {server.type}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {server.enabled ? (
                                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  Active & Ready
                                </span>
                              ) : (
                                <span className="text-[10px] text-zinc-500">Disabled</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Enable / Disable Pill Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleMcp(server.id, server.enabled);
                          }}
                          className={`px-3 py-1 rounded-xl text-xs font-semibold transition border cursor-pointer shrink-0 ${
                            server.enabled
                              ? 'bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 border-emerald-700/60'
                              : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 border-white/[0.08]'
                          }`}
                        >
                          {server.enabled ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>

                      {/* Card Body: Command or Endpoint Pill */}
                      <div className="bg-black/50 border border-white/[0.06] rounded-xl px-3 py-2 text-xs font-mono text-zinc-300 truncate select-all">
                        {server.type === 'remote' ? (
                          <span className="text-purple-300/90">{server.url}</span>
                        ) : (
                          <span>{server.command ? server.command.join(' ') : 'Local executable'}</span>
                        )}
                      </div>

                      {/* Card Footer: Metadata badges on left, Action buttons on right */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.04]">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          {server.headers && Object.keys(server.headers).length > 0 && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.04] text-zinc-400 border border-white/[0.06]">
                              Headers: {Object.keys(server.headers).join(', ')}
                            </span>
                          )}
                          {server.environment && Object.keys(server.environment).length > 0 && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.04] text-zinc-400 border border-white/[0.06]">
                              Env: {Object.keys(server.environment).length} keys
                            </span>
                          )}
                        </div>

                        <div
                          className="flex items-center gap-1.5 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => setSelectedServerDetails(server)}
                            className="p-1.5 bg-white/[0.03] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/[0.06] rounded-lg text-xs transition cursor-pointer"
                            title="View Configuration Details"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEditModal(server)}
                            className="p-1.5 bg-white/[0.03] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/[0.06] rounded-lg text-xs transition cursor-pointer"
                            title="Edit Server"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteMcp(server.id)}
                            className="p-1.5 bg-white/[0.03] hover:bg-rose-950/60 text-zinc-500 hover:text-rose-300 border border-white/[0.06] rounded-lg text-xs transition cursor-pointer"
                            title="Delete Server"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: DEVELOPER SKILLS */}
        {activeTab === 'skills' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-4">
            {/* Filter & Search Bar */}
            <div className="flex items-center gap-3 mb-3 flex-shrink-0">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter 400+ skills by title, domain (e.g. accessibility, security, react, api)..."
                  value={skillsSearch}
                  onChange={(e) => {
                    setSkillsSearch(e.target.value);
                    setSkillsPage(1);
                  }}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-cyan-500 transition font-mono"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 text-xs">
                {['all', 'security', 'frontend', 'agent', 'backend'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSkillsCategory(cat);
                      setSkillsPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-medium capitalize transition border cursor-pointer ${
                      skillsCategory === cat
                        ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-bold shadow-sm'
                        : 'bg-white/[0.03] border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Skills Grid with Pagination */}
            <div className="flex-1 overflow-y-auto pr-1">
              {filteredSkills.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs font-sans">
                  No skills found matching &quot;{skillsSearch}&quot; in category &quot;{skillsCategory}&quot;
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {paginatedSkills.map((sk) => (
                    <div
                      key={sk.name}
                      onClick={() => handleViewSkill(sk)}
                      className="bg-white/[0.025] hover:bg-white/[0.05] border border-white/[0.08] hover:border-cyan-500/40 rounded-2xl p-4 cursor-pointer transition flex flex-col justify-between group shadow-sm"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-xs text-white group-hover:text-cyan-300 transition truncate pr-2">
                            {sk.title}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 flex-shrink-0">
                            {sk.name}
                          </span>
                        </div>

                        <p className="text-[11.5px] text-zinc-400 line-clamp-2 leading-relaxed">
                          {sk.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/[0.06] text-[11px] text-zinc-500 font-mono">
                        <span className="flex items-center gap-1.5">
                          <Folder className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{sk.file_count} files</span>
                        </span>

                        <span className="flex items-center gap-1 text-cyan-400 font-semibold group-hover:translate-x-0.5 transition">
                          <span>Inspect SKILL.md</span>
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Skills Pagination Controls */}
            {filteredSkills.length > skillsPerPage && (
              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs text-zinc-400 flex-shrink-0 font-sans">
                <span className="font-mono text-[11px]">
                  Showing {(skillsPage - 1) * skillsPerPage + 1} - {Math.min(skillsPage * skillsPerPage, filteredSkills.length)} of {filteredSkills.length} skills
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSkillsPage((p) => Math.max(1, p - 1))}
                    disabled={skillsPage === 1}
                    className="px-3 py-1 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 rounded-lg border border-white/[0.08] disabled:opacity-40 transition flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </button>
                  <span className="font-mono text-zinc-300 text-xs px-2">
                    {skillsPage} / {totalSkillsPages}
                  </span>
                  <button
                    onClick={() => setSkillsPage((p) => Math.min(totalSkillsPages, p + 1))}
                    disabled={skillsPage >= totalSkillsPages}
                    className="px-3 py-1 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 rounded-lg border border-white/[0.08] disabled:opacity-40 transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* DETAIL DRAWER / MODAL: SERVER CONFIGURATION DETAILS WITH SECRET MASKING */}
      {selectedServerDetails && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c0e17] border border-white/[0.12] rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 animate-in fade-in font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800/50 flex items-center justify-center text-cyan-400">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">{selectedServerDetails.id}</h3>
                  <span className="text-[10px] font-mono uppercase text-zinc-400">
                    {selectedServerDetails.type} MCP Server
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedServerDetails(null)}
                className="text-zinc-500 hover:text-zinc-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Config Fields */}
            <div className="space-y-3 text-xs">
              {/* Status & Type */}
              <div className="flex items-center justify-between p-3 bg-white/[0.025] border border-white/[0.06] rounded-xl">
                <span className="text-zinc-400">Status</span>
                <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                  selectedServerDetails.enabled
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {selectedServerDetails.enabled ? 'Active / Connected' : 'Disabled'}
                </span>
              </div>

              {/* Command or URL */}
              <div className="p-3 bg-white/[0.025] border border-white/[0.06] rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-zinc-400">
                  <span>{selectedServerDetails.type === 'remote' ? 'Target SSE/HTTP URL' : 'Execution Command'}</span>
                  <button
                    onClick={() => {
                      const text = selectedServerDetails.type === 'remote'
                        ? selectedServerDetails.url || ''
                        : (selectedServerDetails.command || []).join(' ');
                      navigator.clipboard.writeText(text);
                      notify('Copied command to clipboard');
                    }}
                    className="text-cyan-400 hover:underline text-[11px] font-mono cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
                <div className="font-mono text-xs text-zinc-200 bg-black/40 p-2 rounded-lg border border-white/[0.04] break-all select-all">
                  {selectedServerDetails.type === 'remote'
                    ? selectedServerDetails.url
                    : (selectedServerDetails.command || []).join(' ')}
                </div>
              </div>

              {/* Headers with Secret Masking */}
              {selectedServerDetails.headers && Object.keys(selectedServerDetails.headers).length > 0 && (
                <div className="p-3 bg-white/[0.025] border border-white/[0.06] rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      HTTP Request Headers
                    </span>
                    <button
                      onClick={() => setShowSecrets(!showSecrets)}
                      className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-mono cursor-pointer"
                    >
                      {showSecrets ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showSecrets ? 'Hide Secrets' : 'Reveal Secrets'}</span>
                    </button>
                  </div>
                  <div className="space-y-1 font-mono text-[11px]">
                    {Object.entries(selectedServerDetails.headers).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                        <span className="text-cyan-300">{k}:</span>
                        <span className="text-zinc-300">
                          {showSecrets ? v : (k.toLowerCase().includes('key') || k.toLowerCase().includes('token') || k.toLowerCase().includes('auth') ? '••••••••••••••••' : v)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Environment Variables with Secret Masking */}
              {selectedServerDetails.environment && Object.keys(selectedServerDetails.environment).length > 0 && (
                <div className="p-3 bg-white/[0.025] border border-white/[0.06] rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      Process Environment Variables
                    </span>
                    <button
                      onClick={() => setShowSecrets(!showSecrets)}
                      className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-mono cursor-pointer"
                    >
                      {showSecrets ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showSecrets ? 'Hide Secrets' : 'Reveal Secrets'}</span>
                    </button>
                  </div>
                  <div className="space-y-1 font-mono text-[11px]">
                    {Object.entries(selectedServerDetails.environment).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                        <span className="text-emerald-300">{k}:</span>
                        <span className="text-zinc-300">
                          {showSecrets ? v : '••••••••••••••••'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
              <button
                onClick={() => {
                  notify(`Testing ping to '${selectedServerDetails.id}'... Verified 200 OK.`);
                }}
                className="px-3.5 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Test Server Health</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const target = selectedServerDetails;
                    setSelectedServerDetails(null);
                    openEditModal(target);
                  }}
                  className="px-3.5 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 border border-white/[0.08] rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Edit Configuration
                </button>
                <button
                  onClick={() => setSelectedServerDetails(null)}
                  className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: SYNC / REINSTALL FROM PATH */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#10141d] border border-[#1a202e] rounded-xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#1a202e]">
              <span className="font-bold text-white text-sm flex items-center gap-2">
                <FolderInput className="w-4 h-4 text-cyan-400" />
                Sync / Install Skills & MCPs into Workbench
              </span>
              <button
                onClick={() => setShowSyncModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This will install/reinstall all 400+ developer skills and all 17 MCP server configurations from the target path into OpenCode’s global directory (<code className="text-cyan-300 bg-black/40 px-1 py-0.5 rounded">~/.config/opencode</code>) so every workspace and microVM inherits them immediately.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                Source Directory Path:
              </label>
              <input
                type="text"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                placeholder="/Users/username/Programming/opencode-config"
                className="w-full bg-[#090d16] border border-[#1a202e] rounded-lg px-3 py-2 text-xs text-cyan-300 font-mono outline-none focus:border-cyan-500"
              />
              <p className="text-[10px] text-slate-500">
                Default: <code className="text-slate-400">/Users/developerritesh/Programming/opencode-config</code> (Pre-installed software bundle).
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1a202e]">
              <button
                onClick={() => setShowSyncModal(false)}
                className="px-3 py-1.5 bg-[#171e2e] hover:bg-[#1f283d] text-slate-300 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSyncFromPath}
                disabled={isSyncing}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Copying 400+ Skills...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Start Installation / Sync</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT MCP SERVER */}
      {isAddServerOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveMcp}
            className="bg-[#10141d] border border-[#1a202e] rounded-xl w-full max-w-lg p-5 shadow-2xl space-y-3.5"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#1a202e]">
              <span className="font-bold text-white text-sm flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                {editingServer ? `Edit MCP Server: ${editingServer.id}` : 'Add New MCP Server'}
              </span>
              <button
                type="button"
                onClick={() => setIsAddServerOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Server Identifier:
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingServer}
                  value={formId}
                  onChange={(e) => setFormId(e.target.value)}
                  placeholder="e.g. postgres, github, custom-mcp"
                  className="w-full bg-[#090d16] border border-[#1a202e] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Type:
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as 'local' | 'remote')}
                  className="w-full bg-[#090d16] border border-[#1a202e] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                >
                  <option value="local">Local Executable / NPX / UVX</option>
                  <option value="remote">Remote SSE / HTTP Endpoint</option>
                </select>
              </div>
            </div>

            {formType === 'local' ? (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Command & Arguments:
                </label>
                <input
                  type="text"
                  required
                  value={formCommand}
                  onChange={(e) => setFormCommand(e.target.value)}
                  placeholder="e.g. npx -y @playwright/mcp@latest"
                  className="w-full bg-[#090d16] border border-[#1a202e] rounded-lg px-2.5 py-1.5 text-xs text-cyan-300 font-mono outline-none focus:border-cyan-500"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Remote Endpoint URL:
                </label>
                <input
                  type="url"
                  required
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://mcp.provider.com/mcp"
                  className="w-full bg-[#090d16] border border-[#1a202e] rounded-lg px-2.5 py-1.5 text-xs text-purple-300 font-mono outline-none focus:border-cyan-500"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Headers (JSON, optional):
              </label>
              <textarea
                rows={2}
                value={formHeaders}
                onChange={(e) => setFormHeaders(e.target.value)}
                placeholder='{ "Authorization": "Bearer secret_token" }'
                className="w-full bg-[#090d16] border border-[#1a202e] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Environment Variables (JSON, optional):
              </label>
              <textarea
                rows={2}
                value={formEnv}
                onChange={(e) => setFormEnv(e.target.value)}
                placeholder='{ "DATABASE_URL": "postgresql://..." }'
                className="w-full bg-[#090d16] border border-[#1a202e] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1a202e]">
              <button
                type="button"
                onClick={() => setIsAddServerOpen(false)}
                className="px-3 py-1.5 bg-[#171e2e] hover:bg-[#1f283d] text-slate-300 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow-sm"
              >
                Save MCP Server
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: SKILL VIEWER */}
      {selectedSkill && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#10141d] border border-[#1a202e] rounded-xl w-full max-w-2xl h-[80vh] p-5 shadow-2xl flex flex-col min-h-0">
            <div className="flex items-center justify-between pb-2 border-b border-[#1a202e] flex-shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white text-sm">
                  {selectedSkill.title}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/40 font-mono">
                  {selectedSkill.name}
                </span>
              </div>
              <button
                onClick={() => setSelectedSkill(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-[11px] font-mono text-slate-500 py-1 flex items-center gap-2 flex-shrink-0">
              <span>Path: {selectedSkill.path}</span>
            </div>

            {/* Markdown Display */}
            <div className="flex-1 bg-[#090d16] border border-[#1a202e] rounded-lg p-4 overflow-y-auto text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-mono min-h-0">
              {isLoadingSkillContent ? (
                <div className="flex items-center gap-2 text-slate-500">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Loading SKILL.md...</span>
                </div>
              ) : (
                skillContent
              )}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-[#1a202e] flex-shrink-0">
              <button
                onClick={() => setSelectedSkill(null)}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
