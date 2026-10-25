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
} from 'lucide-react';
import { ActivityTab } from '../../components/Navigation';
import { Workspace, FileTreeNode, SearchResult, GitStatusResult, VmStatusResponse } from '../../types';
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

  // VM Telemetry state
  const [vmTelemetry, setVmTelemetry] = useState<VmStatusResponse | null>(null);
  const [isVmLoading, setIsVmLoading] = useState(false);

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
    }
  }, [activityTab, loadVmTelemetry]);

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
          {activityTab === 'providers' && 'Settings'}
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

      {/* VM Hypervisor Status Card */}
      {activityTab === 'vm' && (
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Cpu size={15} color="var(--accent-cyan)" />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                LINUX VM HYPERVISOR
              </span>
            </div>

            <button
              className="btn-icon"
              title="Refresh VM Status"
              onClick={loadVmTelemetry}
              style={{ width: 22, height: 22 }}
            >
              <RefreshCw size={12} className={isVmLoading ? 'spin-animation' : ''} />
            </button>
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
              gap: 9,
            }}
          >
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

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Hypervisor PID</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>
                {vmTelemetry?.pid ? `vfkit (PID ${vmTelemetry.pid})` : workspace?.status === 'running' ? 'vfkit active' : 'None'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Guest IP</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{vmTelemetry?.ipAddress || '192.168.64.2'}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Shared Mount</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>/workspace</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Hardware Arch</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>aarch64 (ARM64)</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Host Path</span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10.5,
                  maxWidth: 140,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={hostPath}
              >
                {hostPath}
              </span>
            </div>
          </div>

          <div
            style={{
              padding: 10,
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 11.5,
              color: '#34d399',
            }}
          >
            <ShieldCheck size={16} style={{ flexShrink: 0 }} />
            <span>Hardware Virtualization Boundary is active. Host files outside {hostPath} are strictly inaccessible.</span>
          </div>

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
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>opencode TUI ready</span>
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
