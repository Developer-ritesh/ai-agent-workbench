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
  X,
  Folder,
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
  const [skillsSearch, setSkillsSearch] = useState<string>('');
  const [skillsCategory, setSkillsCategory] = useState<string>('all');

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
    return (
      s.id.toLowerCase().includes(q) ||
      (s.url && s.url.toLowerCase().includes(q)) ||
      (s.command && s.command.join(' ').toLowerCase().includes(q))
    );
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

  return (
    <div className="flex flex-col h-full w-full bg-[#0c0f17] text-slate-100 font-sans select-none overflow-hidden">
      {/* Toast Bar */}
      {syncStatus && (
        <div className="bg-emerald-600/90 text-white text-xs px-4 py-2 font-medium flex items-center justify-between border-b border-emerald-500/40">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>{syncStatus}</span>
          </div>
          <button onClick={() => setSyncStatus(null)} className="text-emerald-200 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="p-5 border-b border-[#1a202e] bg-[#10141d] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-800/50 flex items-center justify-center text-cyan-400 shadow-inner">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-bold text-white tracking-wide">
                OpenCode Skills & MCP Server Management
              </h1>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/40 font-mono font-medium">
                v2.1.4 Config
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Bundled Model Context Protocol tools and 400+ autonomous agent skills integrated with your isolated Linux microVM.
            </p>
          </div>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowSyncModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#171e2e] hover:bg-[#1f283d] text-cyan-300 border border-cyan-700/50 rounded-lg text-xs font-medium transition shadow-sm"
            title="Import/Sync skills and MCPs from a directory on your machine"
          >
            <FolderInput className="w-3.5 h-3.5" />
            <span>Sync / Reinstall from Path</span>
          </button>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-1.5 bg-[#131824] hover:bg-[#1c2233] text-slate-300 border border-[#1a202e] rounded-lg transition"
            title="Reload configuration"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-3 gap-3 p-4 border-b border-[#1a202e] bg-[#0c0f17] flex-shrink-0">
        <div className="bg-[#131824] border border-[#1a202e] rounded-xl p-3 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Active MCP Servers
            </div>
            <div className="text-xl font-bold text-white mt-0.5">
              {mcpServers.filter((s) => s.enabled).length}{' '}
              <span className="text-xs font-normal text-slate-500">/ {mcpServers.length} installed</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-950/60 border border-blue-800/40 flex items-center justify-center text-blue-400">
            <Cpu className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-[#131824] border border-[#1a202e] rounded-xl p-3 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Pre-Installed Skills
            </div>
            <div className="text-xl font-bold text-white mt-0.5">
              {skills.length}{' '}
              <span className="text-xs font-normal text-slate-500">autonomous capabilities</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
            <FileText className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-[#131824] border border-[#1a202e] rounded-xl p-3 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              MicroVM Provisioning
            </div>
            <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Mounted at ~/.config/opencode</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between px-4 border-b border-[#1a202e] bg-[#10141d] flex-shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('mcp')}
              className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
                activeTab === 'mcp'
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Model Context Protocol (MCP) Servers</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#1c2233] text-slate-300">
                {mcpServers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('skills')}
              className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
                activeTab === 'skills'
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Developer Skills Directory</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#1c2233] text-slate-300">
                {skills.length}
              </span>
            </button>
          </div>

          {activeTab === 'mcp' && (
            <button
              onClick={openNewModal}
              className="flex items-center gap-1.5 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-medium transition shadow-sm"
            >
              <Plus className="w-3 h-3" />
              <span>Add MCP Server</span>
            </button>
          )}
        </div>

        {/* TAB 1: MCP SERVERS */}
        {activeTab === 'mcp' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-4">
            {/* Search Bar */}
            <div className="mb-3 relative flex-shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search MCP servers by name, command, or remote endpoint URL..."
                value={mcpSearch}
                onChange={(e) => setMcpSearch(e.target.value)}
                className="w-full bg-[#10141e] border border-[#1a202e] rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500 transition"
              />
            </div>

            {/* MCP Servers Grid */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredMcps.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No MCP servers match &quot;{mcpSearch}&quot;
                </div>
              ) : (
                filteredMcps.map((server) => (
                  <div
                    key={server.id}
                    className={`bg-[#131824] border rounded-xl p-3.5 transition flex items-center justify-between ${
                      server.enabled
                        ? 'border-[#1a202e] hover:border-cyan-800/60'
                        : 'border-[#1a202e]/60 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-4">
                      {/* Icon */}
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          server.type === 'remote'
                            ? 'bg-purple-950/60 border border-purple-800/40 text-purple-400'
                            : 'bg-blue-950/60 border border-blue-800/40 text-blue-400'
                        }`}
                      >
                        {server.type === 'remote' ? (
                          <Globe className="w-4 h-4" />
                        ) : (
                          <Terminal className="w-4 h-4" />
                        )}
                      </div>

                      {/* Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs tracking-wide">
                            {server.id}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-mono uppercase ${
                              server.type === 'remote'
                                ? 'bg-purple-900/30 text-purple-300 border border-purple-700/40'
                                : 'bg-blue-900/30 text-blue-300 border border-blue-700/40'
                            }`}
                          >
                            {server.type}
                          </span>
                          {server.enabled ? (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Active
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800/60 text-slate-400 border border-slate-700/40">
                              Disabled
                            </span>
                          )}
                        </div>

                        {/* Command or URL */}
                        <div className="text-[11px] font-mono text-slate-400 truncate mt-1">
                          {server.type === 'remote' ? (
                            <span className="text-purple-300/90">{server.url}</span>
                          ) : (
                            <span>{server.command ? server.command.join(' ') : 'Local executable'}</span>
                          )}
                        </div>

                        {/* Badges for Headers / Env */}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {server.headers && Object.keys(server.headers).length > 0 && (
                            <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              Headers: {Object.keys(server.headers).join(', ')}
                            </span>
                          )}
                          {server.environment && Object.keys(server.environment).length > 0 && (
                            <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              Env: {Object.keys(server.environment).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Enable/Disable Toggle */}
                      <button
                        onClick={() => handleToggleMcp(server.id, server.enabled)}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition border ${
                          server.enabled
                            ? 'bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 border-emerald-700/60'
                            : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700'
                        }`}
                      >
                        {server.enabled ? 'Enabled' : 'Disabled'}
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => openEditModal(server)}
                        className="p-1.5 bg-[#171e2e] hover:bg-[#1f283d] text-slate-300 hover:text-white border border-[#1a202e] rounded transition"
                        title="Edit MCP Server"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteMcp(server.id)}
                        className="p-1.5 bg-[#171e2e] hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-[#1a202e] rounded transition"
                        title="Delete MCP Server"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
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
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter 400+ skills by title, domain (e.g. accessibility, security, react, api)..."
                  value={skillsSearch}
                  onChange={(e) => setSkillsSearch(e.target.value)}
                  className="w-full bg-[#10141e] border border-[#1a202e] rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500 transition"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 text-xs">
                {['all', 'security', 'frontend', 'agent', 'backend'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSkillsCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg font-medium capitalize transition border ${
                      skillsCategory === cat
                        ? 'bg-cyan-950 border-cyan-700/60 text-cyan-300'
                        : 'bg-[#131824] border-[#1a202e] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Skills Grid */}
            <div className="flex-1 overflow-y-auto pr-1">
              {filteredSkills.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No skills found matching &quot;{skillsSearch}&quot;
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {filteredSkills.map((sk) => (
                    <div
                      key={sk.name}
                      onClick={() => handleViewSkill(sk)}
                      className="bg-[#131824] hover:bg-[#181f2f] border border-[#1a202e] hover:border-cyan-800/50 rounded-xl p-3 cursor-pointer transition flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-xs text-white group-hover:text-cyan-300 transition truncate pr-2">
                            {sk.title}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/30 flex-shrink-0">
                            {sk.name}
                          </span>
                        </div>

                        <p className="text-[11.5px] text-slate-400 line-clamp-2 leading-relaxed">
                          {sk.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-[#1a202e]/60 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Folder className="w-3 h-3 text-slate-400" />
                          <span>{sk.file_count} files</span>
                        </span>

                        <span className="flex items-center gap-1 text-cyan-400 font-medium group-hover:translate-x-0.5 transition">
                          <span>Inspect SKILL.md</span>
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

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
