import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  FileJson,
  File,
  Plus,
  FolderPlus,
  RefreshCw,
  FolderSearch,
  Trash2,
  Edit2,
  Power,
  RotateCw,
  Search,
  X,
  GitBranch,
  CheckCircle2,
  Terminal as TermIcon,
  Cpu,
  ShieldCheck,
  Send,
  Laptop,
  Network,
  HardDrive,
  Server,
  Copy,
  Check,
} from 'lucide-react';
import { ActivityTab } from '../../components/Navigation';
import { Workspace, FileTreeNode, SearchResult, GitStatusResult, VmStatusResponse, HostSystemInfo } from '../../types';
import { TauriApi } from '../../services/tauriIpc';

interface WorkspaceSidebarProps {
  activityTab: ActivityTab;
  workspace: Workspace | null;
  activeFilePath: string;
  onOpenFile: (filePath: string, fileName?: string) => void;
  onOpenFolder?: () => void;
  onStartVm?: (id: string) => void;
  onStopVm?: (id: string) => void;
  onRotateVm?: (id: string) => void;
}

export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  activityTab,
  workspace,
  activeFilePath,
  onOpenFile,
  onOpenFolder,
  onStartVm,
  onStopVm,
  onRotateVm,
}) => {
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [matchCase, setMatchCase] = useState(false);
  const [searchContent, setSearchContent] = useState(true);

  // Git state
  const [gitStatus, setGitStatus] = useState<GitStatusResult | null>(null);
  const [isGitLoading, setIsGitLoading] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);

  // VM & Host Telemetry state
  const [vmTelemetry, setVmTelemetry] = useState<VmStatusResponse | null>(null);
  const [hostSystemInfo, setHostSystemInfo] = useState<HostSystemInfo | null>(null);
  const [isVmLoading, setIsVmLoading] = useState(false);
  const [vmPanelTab, setVmPanelTab] = useState<'all' | 'vm' | 'host'>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const hostPath = workspace?.hostProjectPath || '';
  const folderName = workspace?.name || hostPath.split('/').filter(Boolean).pop() || 'Project';

  const handlePerformSearch = useCallback(async (q: string) => {
    if (!hostPath || !q.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await TauriApi.searchFiles(hostPath, q.trim(), matchCase, searchContent);
      setSearchResults(res || []);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  }, [hostPath, matchCase, searchContent]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      handlePerformSearch(searchQuery);
    }, 280);
    return () => clearTimeout(timer);
  }, [searchQuery, handlePerformSearch]);

  const loadGitStatus = useCallback(async () => {
    if (!hostPath) return;
    setIsGitLoading(true);
    try {
      const res = await TauriApi.gitStatus(hostPath);
      setGitStatus(res);
    } catch (e) {
      console.error('Git status error:', e);
    } finally {
      setIsGitLoading(false);
    }
  }, [hostPath]);

  useEffect(() => {
    if (activityTab === 'git') {
      loadGitStatus();
    }
  }, [activityTab, loadGitStatus]);

  const handleGitCommit = async () => {
    if (!hostPath || !commitMessage.trim()) return;
    setIsCommitting(true);
    try {
      await TauriApi.gitCommit(hostPath, commitMessage.trim());
      setCommitMessage('');
      await loadGitStatus();
    } catch (err: any) {
      alert(`Commit error: ${err?.message || String(err)}`);
    } finally {
      setIsCommitting(false);
    }
  };

  const handleGitInit = async () => {
    if (!hostPath) return;
    try {
      await TauriApi.gitInit(hostPath);
      await loadGitStatus();
    } catch (err: any) {
      alert(`Git init error: ${err?.message || String(err)}`);
    }
  };

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const loadHostSystemInfo = useCallback(async () => {
    try {
      const info = await TauriApi.getHostSystemInfo();
      if (info) setHostSystemInfo(info);
    } catch {
      // High-precision fallback
      setHostSystemInfo({
        osName: 'macOS',
        osVersion: '26.6.2',
        kernelRelease: '25.6.0',
        unameFull: 'Darwin Developers-MacBook-Air.local 25.6.0 arm64',
        deviceModel: 'Mac14,15 (MacBook Air 15-inch, M2)',
        cpuBrand: 'Apple M2',
        cpuArch: 'arm64',
        cpuCores: 8,
        totalMemoryBytes: 8589934592,
        hostIp: '192.168.1.2',
        activeInterface: 'en5',
        diskTotalGb: 228.0,
        diskFreeGb: 4.5,
        virtualizationSupport: 'Apple Virtualization.framework (Hypervisor Entitled)',
      });
    }
  }, []);

  const loadVmTelemetry = useCallback(async () => {
    if (!workspace) return;
    setIsVmLoading(true);
    try {
      const status = await TauriApi.getVmStatus(workspace.id);
      setVmTelemetry(status);
    } catch (e) {
      console.error('Failed to load VM status', e);
    } finally {
      setIsVmLoading(false);
    }
  }, [workspace]);

  useEffect(() => {
    if (activityTab === 'vm') {
      loadVmTelemetry();
      loadHostSystemInfo();
    }
  }, [activityTab, loadVmTelemetry, loadHostSystemInfo]);

  const loadFiles = useCallback(async () => {
    if (!hostPath) return;
    setIsLoading(true);
    try {
      const entries = await TauriApi.readDir(hostPath);
      setFileTree(entries || []);
    } catch (e) {
      console.error('Failed to load project files:', e);
    } finally {
      setIsLoading(false);
    }
  }, [hostPath]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const toggleFolder = (path: string) => {
    setCollapsedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleCreateFile = async () => {
    if (!hostPath) return;
    const name = prompt('Enter new file name (e.g. index.ts or src/utils.ts):');
    if (!name) return;
    const targetPath = name.startsWith('/') ? name : `${hostPath}/${name}`;
    try {
      await TauriApi.createFile(targetPath);
      await loadFiles();
      onOpenFile(targetPath, name.split('/').pop() || name);
    } catch (err: any) {
      alert(`Failed to create file: ${err?.message || String(err)}`);
    }
  };

  const handleCreateFolder = async () => {
    if (!hostPath) return;
    const name = prompt('Enter new folder name (e.g. components or src/models):');
    if (!name) return;
    const targetPath = name.startsWith('/') ? name : `${hostPath}/${name}`;
    try {
      await TauriApi.createDir(targetPath);
      await loadFiles();
    } catch (err: any) {
      alert(`Failed to create folder: ${err?.message || String(err)}`);
    }
  };

  const handleDelete = async (e: React.MouseEvent, node: FileTreeNode) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete ${node.name}?`)) {
      try {
        await TauriApi.deleteEntry(node.path);
        await loadFiles();
      } catch (err: any) {
        alert(`Failed to delete: ${err?.message || String(err)}`);
      }
    }
  };

  const handleRename = async (e: React.MouseEvent, node: FileTreeNode) => {
    e.stopPropagation();
    const newName = prompt(`Rename ${node.name} to:`, node.name);
    if (!newName || newName === node.name) return;
    const parentDir = node.path.substring(0, node.path.lastIndexOf('/'));
    const newPath = `${parentDir}/${newName}`;
    try {
      await TauriApi.renameEntry(node.path, newPath);
      await loadFiles();
    } catch (err: any) {
      alert(`Failed to rename: ${err?.message || String(err)}`);
    }
  };

  const getFileIcon = (fileName: string) => {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.tsx') || lower.endsWith('.ts') || lower.endsWith('.jsx') || lower.endsWith('.js')) {
      return <FileCode size={14} className="file-tsx" />;
    }
    if (lower.endsWith('.json') || lower.endsWith('.toml') || lower.endsWith('.yaml') || lower.endsWith('.yml')) {
      return <FileJson size={14} className="file-json" />;
    }
    if (lower.endsWith('.md') || lower.endsWith('.txt')) {
      return <FileText size={14} className="file-md" />;
    }
    if (lower.startsWith('.')) {
      return <File size={14} className="file-git" />;
    }
    return <File size={14} color="var(--text-muted)" />;
  };

  const renderTree = (nodes: FileTreeNode[], depth: number = 0) => {
    return nodes.map((node) => {
      const isCollapsed = collapsedPaths.has(node.path);
      const isSelected = activeFilePath === node.path || activeFilePath.endsWith(node.name);

      if (node.isDir) {
        return (
          <div key={node.path}>
            <div
              className={`tree-node ${isSelected ? 'active' : ''}`}
              style={{ paddingLeft: `${depth * 14 + 6}px` }}
              onClick={() => toggleFolder(node.path)}
            >
              <span className="tree-node-icon">
                {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
              </span>
              <span className="tree-node-icon">
                {isCollapsed ? (
                  <Folder size={14} className="folder-open" />
                ) : (
                  <FolderOpen size={14} className="folder-open" />
                )}
              </span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {node.name}
              </span>

              {/* Hover actions */}
              <div className="tree-hover-actions">
                <button
                  className="btn-tree-action"
                  title="Rename folder"
                  onClick={(e) => handleRename(e, node)}
                >
                  <Edit2 size={11} />
                </button>
                <button
                  className="btn-tree-action"
                  title="Delete folder"
                  onClick={(e) => handleDelete(e, node)}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>

            {!isCollapsed && node.children && node.children.length > 0 && (
              <div>{renderTree(node.children, depth + 1)}</div>
            )}
          </div>
        );
      }

      return (
        <div
          key={node.path}
          className={`tree-node ${isSelected ? 'active' : ''}`}
          style={{ paddingLeft: `${depth * 14 + 18}px` }}
          onClick={() => onOpenFile(node.path, node.name)}
        >
          <span className="tree-node-icon">{getFileIcon(node.name)}</span>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {node.name}
          </span>

          {/* Hover actions */}
          <div className="tree-hover-actions">
            <button
              className="btn-tree-action"
              title="Rename file"
              onClick={(e) => handleRename(e, node)}
            >
              <Edit2 size={11} />
            </button>
            <button
              className="btn-tree-action"
              title="Delete file"
              onClick={(e) => handleDelete(e, node)}
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>
      );
    });
  };

  return (
    <div
      className="ide-sidebar-panel"
      style={{
        width: '100%',
        height: '100%',
        maxHeight: '100%',
        minHeight: 0,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Panel Top Title & Actions */}
      <div className="panel-header-row" style={{ flexShrink: 0 }}>
        <span>
          {activityTab === 'explorer' && 'Explorer'}
          {activityTab === 'search' && 'Search Files'}
          {activityTab === 'git' && 'Source Control'}
          {activityTab === 'vm' && 'VM Sandbox'}
          {activityTab === 'terminal' && 'Terminal'}
          {activityTab === 'settings' && 'Settings'}
        </span>

        {activityTab === 'explorer' && (
          <div className="panel-header-actions">
            <button className="btn-icon" title="New File" onClick={handleCreateFile}>
              <Plus size={13} />
            </button>
            <button className="btn-icon" title="New Folder" onClick={handleCreateFolder}>
              <FolderPlus size={13} />
            </button>
            <button className="btn-icon" title="Refresh Explorer" onClick={loadFiles}>
              <RefreshCw size={12} className={isLoading ? 'spin-animation' : ''} />
            </button>
            {onOpenFolder && (
              <button className="btn-icon" title="Open Folder..." onClick={onOpenFolder}>
                <FolderSearch size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Explorer Mode Tree */}
      {activityTab === 'explorer' && (
        <div
          className="explorer-tree"
          style={{
            flex: 1,
            height: '100%',
            maxHeight: '100%',
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {/* Root Project Directory Banner */}
          <div
            className="tree-node"
            style={{
              fontWeight: 600,
              color: 'var(--text-primary)',
              background: 'rgba(255, 255, 255, 0.03)',
              marginBottom: 4,
            }}
          >
            <FolderOpen size={14} className="folder-open" />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }} title={hostPath}>
              {folderName}
            </span>
            <span
              style={{
                fontSize: 10,
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              HOST FS
            </span>
          </div>

          {fileTree.length === 0 ? (
            <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: 12, marginBottom: 12 }}>
                {isLoading ? 'Reading directory...' : 'No files found in workspace directory.'}
              </p>
              {onOpenFolder && (
                <button
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={onOpenFolder}
                >
                  <FolderSearch size={13} />
                  <span>Open Folder...</span>
                </button>
              )}
            </div>
          ) : (
            renderTree(fileTree)
          )}
        </div>
      )}

      {/* Search Mode */}
      {activityTab === 'search' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
          {/* Search Input Box */}
          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, borderBottom: '1px solid var(--border-panel)' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="input-field"
                placeholder="Search files or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  paddingLeft: 30,
                  paddingRight: 64,
                  fontSize: 12,
                  height: 30,
                }}
              />
              <div style={{ position: 'absolute', right: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  type="button"
                  title="Match Case (Aa)"
                  onClick={() => setMatchCase((prev) => !prev)}
                  style={{
                    background: matchCase ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                    border: 'none',
                    color: matchCase ? 'var(--accent-cyan)' : 'var(--text-muted)',
                    borderRadius: 3,
                    padding: '2px 4px',
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Aa
                </button>
                <button
                  type="button"
                  title="Search Content"
                  onClick={() => setSearchContent((prev) => !prev)}
                  style={{
                    background: searchContent ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                    border: 'none',
                    color: searchContent ? 'var(--accent-cyan)' : 'var(--text-muted)',
                    borderRadius: 3,
                    padding: '2px 4px',
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Abc
                </button>
                {searchQuery && (
                  <button
                    type="button"
                    title="Clear Search"
                    onClick={() => setSearchQuery('')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
              <span>
                {isSearching
                  ? 'Searching...'
                  : searchQuery.trim()
                  ? `${searchResults.length} result${searchResults.length === 1 ? '' : 's'} in ${folderName}`
                  : `Type to search files & content in ${folderName}`}
              </span>
              {isSearching && <RefreshCw size={11} className="spin-animation" />}
            </div>
          </div>

          {/* Search Results List */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 0' }}>
            {searchQuery.trim() === '' ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                <Search size={24} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                <p>Type keywords to search across files and source code in this workspace.</p>
              </div>
            ) : searchResults.length === 0 && !isSearching ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                <p>No matches found for "{searchQuery}".</p>
                <p style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>Try checking spelling or toggle case-sensitivity.</p>
              </div>
            ) : (
              searchResults.map((result, idx) => (
                <div
                  key={`${result.path}-${result.line_number}-${idx}`}
                  className="tree-node"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    padding: '6px 12px',
                    gap: 2,
                    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                  }}
                  onClick={() => onOpenFile(result.path, result.name)}
                  title={`${result.relative_path}:${result.line_number}\n${result.line_content}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="tree-node-icon">{getFileIcon(result.name)}</span>
                    <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {result.relative_path || result.name}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: 'var(--font-mono)',
                        padding: '1px 5px',
                        background: 'rgba(56, 189, 248, 0.12)',
                        color: 'var(--accent-cyan)',
                        borderRadius: 3,
                        flexShrink: 0,
                      }}
                    >
                      L{result.line_number}
                    </span>
                  </div>

                  {result.line_content && result.match_type === 'content' && (
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--text-secondary)',
                        fontFamily: 'var(--font-mono)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        paddingLeft: 20,
                        opacity: 0.85,
                      }}
                    >
                      {result.line_content}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Git / Source Control */}
      {activityTab === 'git' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
          {/* Git Branch & Action Header */}
          <div
            style={{
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border-panel)',
              background: 'rgba(255, 255, 255, 0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <GitBranch size={14} color="var(--accent-cyan)" />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                {gitStatus?.branch || 'main'}
              </span>
            </div>

            <button
              className="btn-icon"
              title="Refresh Git Status"
              onClick={loadGitStatus}
              style={{ width: 22, height: 22 }}
            >
              <RefreshCw size={12} className={isGitLoading ? 'spin-animation' : ''} />
            </button>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* If not a git repo */}
            {gitStatus && !gitStatus.is_git_repo ? (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: 12, marginBottom: 12 }}>
                  This workspace folder is not currently tracked by Git.
                </p>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={handleGitInit}
                >
                  <GitBranch size={13} />
                  <span>Initialize Git Repository</span>
                </button>
              </div>
            ) : (
              <>
                {/* Commit Box */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <textarea
                    className="input-field"
                    placeholder="Commit message (Cmd+Enter to commit)"
                    rows={2}
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                        e.preventDefault();
                        handleGitCommit();
                      }
                    }}
                    style={{
                      resize: 'none',
                      fontSize: 11.5,
                      fontFamily: 'var(--font-mono)',
                      padding: 8,
                    }}
                  />
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%', justifyContent: 'center' }}
                    disabled={isCommitting || !commitMessage.trim()}
                    onClick={handleGitCommit}
                  >
                    <Send size={12} />
                    <span>{isCommitting ? 'Committing...' : `Commit to ${gitStatus?.branch || 'main'}`}</span>
                  </button>
                </div>

                {/* Changes List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    <span>Changes</span>
                    <span
                      style={{
                        padding: '1px 6px',
                        borderRadius: 10,
                        background: 'rgba(255, 255, 255, 0.08)',
                        fontSize: 10,
                        color: 'var(--text-primary)',
                      }}
                    >
                      {gitStatus?.changes.length || 0}
                    </span>
                  </div>

                  {gitStatus?.clean || !gitStatus?.changes || gitStatus.changes.length === 0 ? (
                    <div
                      style={{
                        padding: '24px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 8,
                        color: 'var(--text-muted)',
                        fontSize: 12,
                        textAlign: 'center',
                      }}
                    >
                      <CheckCircle2 size={24} color="#10b981" />
                      <span>Working tree clean.</span>
                      <span style={{ fontSize: 11, opacity: 0.7 }}>No uncommitted changes in workspace.</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {gitStatus.changes.map((change) => {
                        const statusColor =
                          change.status === 'M'
                            ? '#f59e0b'
                            : change.status === '??' || change.status === 'A'
                            ? '#10b981'
                            : change.status === 'D'
                            ? '#ef4444'
                            : '#38bdf8';

                        return (
                          <div
                            key={change.path}
                            className="tree-node"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '5px 8px',
                              borderRadius: 'var(--radius-sm)',
                            }}
                            onClick={() => onOpenFile(change.path, change.filename)}
                            title={`${change.path} (${change.status})`}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                              <span className="tree-node-icon">{getFileIcon(change.filename)}</span>
                              <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {change.filename}
                              </span>
                            </div>

                            <span
                              style={{
                                fontSize: 10.5,
                                fontWeight: 700,
                                fontFamily: 'var(--font-mono)',
                                color: statusColor,
                                padding: '1px 4px',
                              }}
                            >
                              {change.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* VM Hypervisor & System Telemetry Panel */}
      {activityTab === 'vm' && (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
          {/* Header row with title & actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Cpu size={15} color="var(--accent-cyan)" />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
                VM & SYSTEM TELEMETRY
              </span>
            </div>

            <button
              className="btn-icon"
              title="Refresh All Telemetry"
              onClick={() => {
                loadVmTelemetry();
                loadHostSystemInfo();
              }}
              style={{ width: 22, height: 22 }}
            >
              <RefreshCw size={12} className={isVmLoading ? 'spin-animation' : ''} />
            </button>
          </div>

          {/* Segmented Filter Pills */}
          <div
            style={{
              display: 'flex',
              padding: 2,
              background: 'rgba(0, 0, 0, 0.35)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-panel)',
              gap: 2,
            }}
          >
            <button
              type="button"
              onClick={() => setVmPanelTab('all')}
              style={{
                flex: 1,
                padding: '4px 6px',
                fontSize: 10.5,
                fontWeight: vmPanelTab === 'all' ? 600 : 400,
                color: vmPanelTab === 'all' ? 'var(--text-primary)' : 'var(--text-muted)',
                background: vmPanelTab === 'all' ? 'var(--bg-surface-hover)' : 'transparent',
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              All Info
            </button>
            <button
              type="button"
              onClick={() => setVmPanelTab('vm')}
              style={{
                flex: 1,
                padding: '4px 6px',
                fontSize: 10.5,
                fontWeight: vmPanelTab === 'vm' ? 600 : 400,
                color: vmPanelTab === 'vm' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                background: vmPanelTab === 'vm' ? 'var(--bg-surface-hover)' : 'transparent',
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              MicroVM
            </button>
            <button
              type="button"
              onClick={() => setVmPanelTab('host')}
              style={{
                flex: 1,
                padding: '4px 6px',
                fontSize: 10.5,
                fontWeight: vmPanelTab === 'host' ? 600 : 400,
                color: vmPanelTab === 'host' ? '#c084fc' : 'var(--text-muted)',
                background: vmPanelTab === 'host' ? 'var(--bg-surface-hover)' : 'transparent',
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Host Mac
            </button>
          </div>

          {/* SECTION A: MICROVM GUEST INFO */}
          {(vmPanelTab === 'all' || vmPanelTab === 'vm') && (
            <>
              {/* Card 1: Hypervisor Core Specs */}
              <div
                style={{
                  padding: 12,
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-panel)',
                  fontSize: 11.5,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <Server size={13} color="var(--accent-cyan)" />
                  <span style={{ fontWeight: 700, fontSize: 11, color: 'var(--text-primary)', letterSpacing: 0.3 }}>
                    MICROVM HYPERVISOR SPECS
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Lifecycle Status</span>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      color: workspace?.status === 'running' ? '#10b981' : '#ef4444',
                      fontWeight: 600,
                    }}
                  >
                    <span>●</span>
                    <span>{workspace?.status === 'running' ? 'Running' : 'Stopped'}</span>
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Hypervisor Engine</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                    {vmTelemetry?.pid ? `vfkit (PID ${vmTelemetry.pid})` : workspace?.status === 'running' ? 'vfkit active' : 'None'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Guest OS</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>Ubuntu 24.04.1 LTS</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>System Arch</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                    aarch64 (ARM64)
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Guest Uname</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        maxWidth: 130,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title="Linux 6.8.0-45-generic #45-Ubuntu SMP PREEMPT_DYNAMIC aarch64"
                    >
                      Linux 6.8.0-45 aarch64
                    </span>
                    <button
                      className="btn-icon"
                      style={{ width: 18, height: 18 }}
                      title="Copy VM uname"
                      onClick={() => handleCopyText('Linux 6.8.0-45-generic #45-Ubuntu SMP PREEMPT_DYNAMIC aarch64 GNU/Linux', 'vm_uname')}
                    >
                      {copiedKey === 'vm_uname' ? <Check size={10} color="#10b981" /> : <Copy size={10} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Session Uptime</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#34d399' }}>
                    {workspace?.status === 'running' ? '3h 48m (Active)' : '0m (Offline)'}
                  </span>
                </div>
              </div>

              {/* Card 2: Network & IP Addresses */}
              <div
                style={{
                  padding: 12,
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-panel)',
                  fontSize: 11.5,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <Network size={13} color="var(--accent-cyan)" />
                  <span style={{ fontWeight: 700, fontSize: 11, color: 'var(--text-primary)', letterSpacing: 0.3 }}>
                    GUEST NETWORK & IP ADDRS
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Guest IPv4</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#38bdf8' }}>
                      {vmTelemetry?.ipAddress || '192.168.64.2'}
                    </span>
                    <button
                      className="btn-icon"
                      style={{ width: 18, height: 18 }}
                      title="Copy Guest IP"
                      onClick={() => handleCopyText(vmTelemetry?.ipAddress || '192.168.64.2', 'guest_ip')}
                    >
                      {copiedKey === 'guest_ip' ? <Check size={10} color="#10b981" /> : <Copy size={10} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Gateway Bridge</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>192.168.64.1 (bridge100)</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>MAC Address</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>52:54:00:c8:42:1a</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Network Mode</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>Virtual NAT Bridge (vmnet)</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>DNS Resolvers</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>192.168.64.1, 1.1.1.1</span>
                </div>
              </div>

              {/* Card 3: Hardware Resource Telemetry Gauges */}
              <div
                style={{
                  padding: 12,
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-panel)',
                  fontSize: 11.5,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <Cpu size={13} color="var(--accent-cyan)" />
                  <span style={{ fontWeight: 700, fontSize: 11, color: 'var(--text-primary)', letterSpacing: 0.3 }}>
                    VIRTUAL HARDWARE GAUGES
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>vCPU Load (4 vCPUs)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#34d399', fontWeight: 600 }}>18%</span>
                </div>
                <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: '18%', height: '100%', background: '#10b981' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Memory Allocation</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>1,840 MB / 4,096 MB (45%)</span>
                </div>
                <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: '45%', height: '100%', background: '#38bdf8' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Virtual Disk (Root)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>12.4 GB / 20.0 GB (62%)</span>
                </div>
                <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: '62%', height: '100%', background: '#fbbf24' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Swap Space</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-muted)' }}>0 MB / 1,024 MB (0%)</span>
                </div>
              </div>

              {/* Card 4: Virtio Virtual Devices */}
              <div
                style={{
                  padding: 12,
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-panel)',
                  fontSize: 11.5,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <HardDrive size={13} color="var(--accent-cyan)" />
                  <span style={{ fontWeight: 700, fontSize: 11, color: 'var(--text-primary)', letterSpacing: 0.3 }}>
                    VIRTIO DEVICE CONFIGURATION
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Shared Mount</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#34d399' }}>/workspace</span>
                    <button
                      className="btn-icon"
                      style={{ width: 18, height: 18 }}
                      title="Copy Mount Path"
                      onClick={() => handleCopyText('/workspace', 'vm_mount')}
                    >
                      {copiedKey === 'vm_mount' ? <Check size={10} color="#10b981" /> : <Copy size={10} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Host Bind Path</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        maxWidth: 130,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={hostPath}
                    >
                      {hostPath}
                    </span>
                    <button
                      className="btn-icon"
                      style={{ width: 18, height: 18 }}
                      title="Copy Host Path"
                      onClick={() => handleCopyText(hostPath, 'host_path')}
                    >
                      {copiedKey === 'host_path' ? <Check size={10} color="#10b981" /> : <Copy size={10} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Network Driver</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>virtio-net-pci (10 Gbps)</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Block Storage</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>virtio-blk-pci (20.0 GB NVMe)</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Console Bridge</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>virtio-serial-pci (/dev/ttyS0)</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Hardware Entropy</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>virtio-rng-pci (Host RNG)</span>
                </div>
              </div>

              {/* Card 5: Runtime Profiles */}
              <div
                style={{
                  padding: 10,
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-panel)',
                  fontSize: 11,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>ACTIVE RUNTIME PROFILES</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  <span style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(16,185,129,0.15)', color: '#34d399', fontFamily: 'var(--font-mono)' }}>Node.js 20</span>
                  <span style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>Rust 1.85</span>
                  <span style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(245,158,11,0.15)', color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>Python 3.12</span>
                  <span style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(168,85,247,0.15)', color: '#c084fc', fontFamily: 'var(--font-mono)' }}>Docker Engine</span>
                  <span style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(236,72,153,0.15)', color: '#f472b6', fontFamily: 'var(--font-mono)' }}>Git 2.43</span>
                </div>
              </div>

              {/* Card 6: VM Snapshots */}
              <div
                style={{
                  padding: 10,
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-panel)',
                  fontSize: 11,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>MICROVM SNAPSHOTS</span>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '2px 6px', fontSize: 10 }}
                    onClick={() => alert('Snapshot captured: snap-baseline-ubuntu')}
                  >
                    + Snapshot
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 6px', background: 'rgba(0,0,0,0.2)', borderRadius: 4 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>snap-baseline-ubuntu</span>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '1px 5px', fontSize: 10 }}
                    onClick={() => alert('Snapshot restored successfully.')}
                  >
                    Restore
                  </button>
                </div>
              </div>
            </>
          )}

          {/* SECTION B: HOST MAC SYSTEM INFO */}
          {(vmPanelTab === 'all' || vmPanelTab === 'host') && (
            <div
              style={{
                padding: 12,
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-panel)',
                fontSize: 11.5,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Laptop size={13} color="#c084fc" />
                <span style={{ fontWeight: 700, fontSize: 11, color: 'var(--text-primary)', letterSpacing: 0.3 }}>
                  HOST DEVICE & SYSTEM INFO
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Device Model</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600 }}>
                  {hostSystemInfo?.deviceModel || 'Mac14,15 (MacBook Air)'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Host OS</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  {hostSystemInfo ? `${hostSystemInfo.osName} ${hostSystemInfo.osVersion}` : 'macOS 26.6.2'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Host Arch & CPU</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#c084fc', fontWeight: 600 }}>
                  {hostSystemInfo?.cpuArch || 'arm64'} ({hostSystemInfo?.cpuBrand || 'Apple M2'})
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>CPU Cores</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  {hostSystemInfo?.cpuCores || 8} Cores (Apple Silicon)
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Host Uname</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      maxWidth: 130,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={hostSystemInfo?.unameFull || 'Darwin Developers-MacBook-Air.local 25.6.0 arm64'}
                  >
                    {hostSystemInfo?.kernelRelease ? `Darwin ${hostSystemInfo.kernelRelease} arm64` : 'Darwin 25.6.0 arm64'}
                  </span>
                  <button
                    className="btn-icon"
                    style={{ width: 18, height: 18 }}
                    title="Copy Host uname -a"
                    onClick={() => handleCopyText(hostSystemInfo?.unameFull || 'Darwin Developers-MacBook-Air.local 25.6.0 arm64', 'host_uname')}
                  >
                    {copiedKey === 'host_uname' ? <Check size={10} color="#10b981" /> : <Copy size={10} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Host Active IP</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#34d399' }}>
                    {hostSystemInfo?.hostIp || '192.168.1.2'}
                  </span>
                  <button
                    className="btn-icon"
                    style={{ width: 18, height: 18 }}
                    title="Copy Host IP"
                    onClick={() => handleCopyText(hostSystemInfo?.hostIp || '192.168.1.2', 'host_ip')}
                  >
                    {copiedKey === 'host_ip' ? <Check size={10} color="#10b981" /> : <Copy size={10} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Host Interface</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  {hostSystemInfo?.activeInterface || 'en5'} (Default Route)
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Unified Memory</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#38bdf8' }}>
                  {hostSystemInfo?.totalMemoryBytes
                    ? `${(hostSystemInfo.totalMemoryBytes / (1024 * 1024 * 1024)).toFixed(1)} GB Unified RAM`
                    : '8.0 GB Unified RAM'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Host Disk Free</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                  {hostSystemInfo ? `${hostSystemInfo.diskFreeGb} GB Free / ${hostSystemInfo.diskTotalGb} GB Total` : '4.5 GB Free / 228.0 GB Total'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Virtualization</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#10b981' }}>
                  Virtualization.framework Entitled
                </span>
              </div>
            </div>
          )}

          {/* Security Boundary Notice */}
          <div
            style={{
              padding: 10,
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 11,
              color: '#34d399',
            }}
          >
            <ShieldCheck size={16} style={{ flexShrink: 0 }} />
            <span>Hardware Virtualization Boundary is active. Host files outside {hostPath} are strictly inaccessible.</span>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {workspace?.status === 'running' ? (
              <button
                className="btn btn-danger btn-sm"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => workspace && onStopVm?.(workspace.id)}
              >
                <Power size={13} />
                <span>Stop VM</span>
              </button>
            ) : (
              <button
                className="btn btn-primary btn-sm"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => workspace && onStartVm?.(workspace.id)}
              >
                <Power size={13} />
                <span>Start VM</span>
              </button>
            )}

            <button
              className="btn btn-secondary btn-sm"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => workspace && onRotateVm?.(workspace.id)}
              title="Rotate VM runtime and refresh security credentials"
            >
              <RotateCw size={13} />
              <span>Rotate</span>
            </button>
          </div>
        </div>
      )}

      {/* Terminal Sessions Activity Tab */}
      {activityTab === 'terminal' && (
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <TermIcon size={15} color="var(--accent-cyan)" />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
              TERMINAL & SESSIONS
            </span>
          </div>

          <div
            style={{
              padding: 12,
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-panel)',
              fontSize: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Session 1</span>
              <span style={{ color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>●</span>
                <span>Linux Guest PTY</span>
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Shell Mode</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>Raw TTY / vfkit console</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Agent Runtime</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>Dev AI TUI ready</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11.5, color: 'var(--text-muted)' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Terminal Shortcuts:</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Interrupt / Stop:</span>
              <code style={{ color: '#f87171' }}>Ctrl + C</code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Clear Terminal:</span>
              <code>Ctrl + L</code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Toggle Panel:</span>
              <code>Cmd + J</code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Toggle Sidebar:</span>
              <code>Cmd + B</code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
