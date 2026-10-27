import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Split,
  SplitSquareHorizontal,
  MoreHorizontal,
  FileCode,
  FileJson,
  FileText,
  File,
  Save,
  RotateCw,
  Sparkles,
  Terminal as TermIcon,
  Link2,
  ClipboardCopy,
  FileX,
} from 'lucide-react';
import { TauriApi } from '../../services/tauriIpc';

interface CodeEditorPanelProps {
  activeFilePath: string;
  openFiles: string[];
  onSelectTab: (filePath: string) => void;
  onCloseTab: (filePath: string) => void;
}

type PaneId = 'left' | 'right';

export const CodeEditorPanel: React.FC<CodeEditorPanelProps> = ({
  activeFilePath,
  openFiles,
  onSelectTab,
  onCloseTab,
}) => {
  // Map of filePath -> current content in memory
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  // Set of dirty (unsaved) filePaths
  const [dirtyFiles, setDirtyFiles] = useState<Set<string>>(new Set());
  // Save status for UI feedback
  const [saveStatus, setSaveStatus] = useState<string>('AutoSave: On');
  const [isSaving, setIsSaving] = useState(false);
  // Cursor position tracked per split pane
  const [cursorPos, setCursorPos] = useState<Record<PaneId, { line: number; col: number }>>({
    left: { line: 1, col: 1 },
    right: { line: 1, col: 1 },
  });

  // Split Editor Right: the file shown in the secondary pane (null = disabled)
  const [splitPath, setSplitPath] = useState<string | null>(null);
  // More Actions dropdown
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);
  const [moreAnchor, setMoreAnchor] = useState<{ top: number; right: number } | null>(null);

  const textareaLeftRef = useRef<HTMLTextAreaElement>(null);
  const textareaRightRef = useRef<HTMLTextAreaElement>(null);
  // Per-file debounced autosave timers (each split pane edits its own file)
  const autosaveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Load real file content from host disk on demand (active or split pane)
  const ensureContentLoaded = useCallback(
    (filePath: string, snapContents: Record<string, string>) => {
      if (!filePath || snapContents[filePath] !== undefined) return;
      TauriApi.readFile(filePath)
        .then((content) => {
          setFileContents((prev) => ({ ...prev, [filePath]: content }));
        })
        .catch(() => {
          // If file is new or empty
          setFileContents((prev) => ({
            ...prev,
            [filePath]: `// ${filePath.split('/').pop()}\n\n`,
          }));
        });
    },
    []
  );

  useEffect(() => {
    ensureContentLoaded(activeFilePath, fileContents);
  }, [activeFilePath, fileContents, ensureContentLoaded]);

  useEffect(() => {
    if (splitPath) ensureContentLoaded(splitPath, fileContents);
  }, [splitPath, fileContents, ensureContentLoaded]);

  // Clear split pane if its file was closed
  useEffect(() => {
    if (splitPath && !openFiles.includes(splitPath)) {
      setSplitPath(null);
    }
  }, [openFiles, splitPath]);

  useEffect(() => {
    return () => {
      Object.values(autosaveTimersRef.current).forEach((t) => clearTimeout(t));
      autosaveTimersRef.current = {};
    };
  }, []);

  const activeContent = fileContents[activeFilePath] ?? '';
  const splitContent = splitPath ? fileContents[splitPath] ?? '' : null;

  // Actual Save Function (writes directly to host disk)
  const saveFile = useCallback(async (filePath: string, content: string) => {
    if (!filePath) return;
    setIsSaving(true);
    setSaveStatus('Saving...');

    try {
      await TauriApi.writeFile(filePath, content);
      setDirtyFiles((prev) => {
        const next = new Set(prev);
        next.delete(filePath);
        return next;
      });
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setSaveStatus(`✓ Saved at ${timeStr}`);
    } catch (err: any) {
      console.error('Failed to save file:', err);
      setSaveStatus('Save error');
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Handle content edit for ANY pane path, with per-path debounced AutoSave (1000ms)
  const handleContentChange = useCallback((filePath: string, newContent: string) => {
    setFileContents((prev) => ({ ...prev, [filePath]: newContent }));
    setDirtyFiles((prev) => new Set(prev).add(filePath));
    setSaveStatus('● Unsaved');

    const timers = autosaveTimersRef.current;
    if (timers[filePath]) clearTimeout(timers[filePath]);
    timers[filePath] = setTimeout(() => {
      setFileContents((latest) => {
        void saveFile(filePath, latest[filePath] ?? newContent);
        return latest;
      });
      delete timers[filePath];
    }, 1000);
  }, [saveFile]);

  const savePaneNow = (filePath: string) => {
    if (autosaveTimersRef.current[filePath]) clearTimeout(autosaveTimersRef.current[filePath]);
    saveFile(filePath, fileContents[filePath] ?? '');
  };

  // Keyboard shortcuts: Cmd+S saves the focused pane, Tab indents
  const handleKeyDown = (filePath: string, content: string) => (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      savePaneNow(filePath);
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const spaces = '  '; // 2 spaces for tab
      const updated = content.substring(0, start) + spaces + content.substring(end);

      handleContentChange(filePath, updated);

      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + spaces.length;
      });
    }
  };

  const updateCursorPosition = (pane: PaneId, ref: React.RefObject<HTMLTextAreaElement | null>) => () => {
    if (!ref.current) return;
    const text = ref.current.value.substring(0, ref.current.selectionStart);
    const lines = text.split('\n');
    setCursorPos((prev) => ({
      ...prev,
      [pane]: { line: lines.length, col: lines[lines.length - 1].length + 1 },
    }));
  };

  const toggleSplit = () => {
    if (splitPath) {
      setSplitPath(null);
      return;
    }
    // Prefer a different open file for the split pane; fall back to the same file
    const other = openFiles.find((f) => f !== activeFilePath);
    setSplitPath(other ?? activeFilePath);
    // Ensure the right pane is loaded before it renders
    if (other) ensureContentLoaded(other, fileContents);
  };

  const openMoreMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
    setMoreAnchor({ top: rect.bottom + 6, right: Math.max(8, window.innerWidth - rect.right) });
    setShowMoreMenu(true);
  };

  const moreAction = (action: 'copyPath' | 'copyContents' | 'closeTab') => {
    const name = activeFilePath.split('/').pop() || activeFilePath;
    if (action === 'copyPath') {
      navigator.clipboard?.writeText(activeFilePath).catch(() => {});
      setSaveStatus(`✓ Path copied: ${name}`);
    } else if (action === 'copyContents') {
      navigator.clipboard?.writeText(activeContent).catch(() => {});
      setSaveStatus(`✓ Contents copied (${activeContent.length} chars)`);
    } else if (action === 'closeTab') {
      onCloseTab(activeFilePath);
    }
    setShowMoreMenu(false);
  };

  useEffect(() => {
    if (!showMoreMenu) return;
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') setShowMoreMenu(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showMoreMenu]);

  const getFileIcon = (fileName: string) => {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.tsx') || lower.endsWith('.ts') || lower.endsWith('.jsx') || lower.endsWith('.js')) {
      return <FileCode size={14} className="file-tsx" />;
    }
    if (lower.endsWith('.json') || lower.endsWith('.toml')) {
      return <FileJson size={14} className="file-json" />;
    }
    if (lower.endsWith('.md')) {
      return <FileText size={14} className="file-md" />;
    }
    return <File size={14} color="var(--text-muted)" />;
  };

  const getLanguageName = (path: string) => {
    const lower = path.toLowerCase();
    if (lower.endsWith('.tsx')) return 'TypeScript React';
    if (lower.endsWith('.ts')) return 'TypeScript';
    if (lower.endsWith('.jsx')) return 'JavaScript React';
    if (lower.endsWith('.js')) return 'JavaScript';
    if (lower.endsWith('.json')) return 'JSON';
    if (lower.endsWith('.md')) return 'Markdown';
    if (lower.endsWith('.rs')) return 'Rust';
    if (lower.endsWith('.toml')) return 'TOML';
    if (lower.endsWith('.css')) return 'CSS';
    if (lower.endsWith('.html')) return 'HTML';
    if (lower.endsWith('.py')) return 'Python';
    if (lower.endsWith('.sh')) return 'Shell Script';
    return 'Plain Text';
  };

  /** One editor pane (gutter + editable textarea + minimap strip). */
  const renderPane = (pane: PaneId, filePath: string, content: string) => {
    const ref = pane === 'left' ? textareaLeftRef : textareaRightRef;
    const pos = cursorPos[pane];
    const lineCount = Math.max(content.split('\n').length, 1);
    return (
      <div
        className="editor-canvas"
        style={{ flex: 1, minWidth: 0, width: 'auto' }}
      >
        {/* Pane header chip (right pane only) */}
        {pane === 'right' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 8px',
              borderBottom: '1px solid var(--border-panel)',
              fontSize: 10,
              color: 'var(--text-secondary)',
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            <SplitSquareHorizontal size={11} color="var(--accent-cyan)" />
            <span style={{ fontFamily: 'var(--font-mono, monospace)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
              {filePath.split('/').pop()}
            </span>
            <span style={{ marginLeft: 'auto', color: dirtyFiles.has(filePath) ? 'var(--accent-cyan)' : 'var(--status-emerald)' }}>
              {dirtyFiles.has(filePath) ? '● Unsaved' : 'Synced'}
            </span>
            <span
              className="editor-tab-close"
              onClick={() => setSplitPath(null)}
              title="Close Split"
              style={{ cursor: 'pointer', display: 'flex' }}
            >
              <X size={12} />
            </span>
          </div>
        )}
        <div style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>
          {/* Line Numbers Gutter */}
          <div className="editor-gutter">
            {Array.from({ length: lineCount }).map((_, i) => (
              <div
                key={i}
                className={`gutter-line-number ${i + 1 === pos.line ? 'active' : ''}`}
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* Interactive Editor Monospace Area */}
          <textarea
            ref={ref}
            className="editor-code-input"
            value={content}
            onChange={(e) => handleContentChange(filePath, e.target.value)}
            onKeyDown={handleKeyDown(filePath, content)}
            onKeyUp={updateCursorPosition(pane, ref)}
            onClick={updateCursorPosition(pane, ref)}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            placeholder={pane === 'left' ? 'Start typing code or open a file...' : `Second view: ${filePath.split('/').pop()}`}
          />

          {/* Subtle Minimap representation on right edge */}
          <div className="editor-minimap">
            {content.slice(0, 1500)}
          </div>
        </div>
      </div>
    );
  };

  const isDirty = dirtyFiles.has(activeFilePath);
  const statusPane: PaneId = 'left';
  const statusPos = cursorPos[statusPane];

  return (
    <div className="ide-editor-container">
      {/* 1. Tabs Bar */}
      <div className="editor-tabs-bar">
        <div className="editor-tabs-list">
          {openFiles.map((file) => {
            const fileName = file.split('/').pop() || file;
            const isActive = file === activeFilePath;
            const fileIsDirty = dirtyFiles.has(file);

            return (
              <div
                key={file}
                className={`editor-tab ${isActive ? 'active' : ''}`}
                onClick={() => onSelectTab(file)}
                title={file}
              >
                {getFileIcon(fileName)}
                <span>{fileName}</span>

                {fileIsDirty && (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--accent-cyan)',
                      marginLeft: -2,
                    }}
                    title="Unsaved changes"
                  />
                )}

                <span
                  className="editor-tab-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(file);
                  }}
                  title="Close (Cmd+W)"
                >
                  <X size={13} />
                </span>
              </div>
            );
          })}
        </div>

        {/* Tab Right Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            className="btn-icon"
            title="Save file immediately (Cmd+S)"
            onClick={() => savePaneNow(activeFilePath)}
          >
            <Save size={13} color={isDirty ? 'var(--accent-cyan)' : 'var(--text-secondary)'} />
          </button>
          <button
            className="btn-icon"
            title={splitPath ? 'Close Split Editor' : 'Split Editor Right'}
            onClick={toggleSplit}
            style={splitPath ? { color: 'var(--accent-cyan)' } : undefined}
          >
            <Split size={14} />
          </button>
          <button
            className="btn-icon"
            title="More Actions"
            onClick={openMoreMenu}
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* More Actions dropdown — portal at <body> so no ancestor can clip it */}
      {showMoreMenu && moreAnchor && createPortal(
        <>
          <div
            onClick={() => setShowMoreMenu(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
            aria-hidden="true"
          />
          <div
            style={{ position: 'fixed', top: moreAnchor.top, right: moreAnchor.right, zIndex: 9999, minWidth: 200 }}
            role="menu"
            aria-label="Editor More Actions"
          >
            {[
              { id: 'copyPath' as const, icon: <Link2 size={13} />, label: `Copy Path` },
              { id: 'copyContents' as const, icon: <ClipboardCopy size={13} />, label: `Copy File Contents` },
              { id: 'closeTab' as const, icon: <FileX size={13} />, label: `Close Tab` },
            ].map((item) => (
              <button
                key={item.id}
                role="menuitem"
                onClick={() => moreAction(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: 12,
                  color: item.id === 'closeTab' ? '#f87171' : 'var(--text-primary, #e2e8f0)',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </>,
        document.body
      )}

      {/* 2. Breadcrumbs Bar */}
      <div className="editor-breadcrumbs">
        <span>{activeFilePath || 'No file selected'}</span>
        {splitPath && (
          <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--accent-cyan)' }}>
            | Split: {splitPath.split('/').pop()}
          </span>
        )}
        {isSaving && (
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <RotateCw size={10} className="spin-animation" /> Saving to disk...
          </span>
        )}
      </div>

      {/* 3. Interactive Code Canvas with Real Disk Binding OR BihariGraphic Welcome View */}
      {!activeFilePath || openFiles.length === 0 ? (
        <div className="editor-empty-welcome">
          <div className="welcome-card">
            {/* Logo Badge */}
            <div className="welcome-badge-icon">
              <Sparkles size={30} color="#38bdf8" />
            </div>

            <h1 className="welcome-title">BihariGraphic</h1>
            <p className="welcome-tagline">AI Agent Workbench</p>
            <div className="welcome-author-badge">
              <TermIcon size={12} color="#34d399" />
              <span>Developer Ritesh</span>
            </div>

            {/* Quick shortcuts info */}
            <div className="welcome-shortcuts">
              <div className="shortcut-row">
                <span className="shortcut-label">Open File</span>
                <span className="shortcut-keys"><kbd>⌘</kbd> <kbd>P</kbd></span>
              </div>
              <div className="shortcut-row">
                <span className="shortcut-label">Toggle Terminal</span>
                <span className="shortcut-keys"><kbd>⌘</kbd> <kbd>`</kbd></span>
              </div>
              <div className="shortcut-row">
                <span className="shortcut-label">Dev AI CLI Agent</span>
                <span className="shortcut-keys"><kbd>devai</kbd></span>
              </div>
              <div className="shortcut-row">
                <span className="shortcut-label">Hardware Sandbox</span>
                <span className="shortcut-badge">Isolated Linux aarch64</span>
              </div>
            </div>

            <p className="welcome-footer-note">
              Select a file from the Explorer sidebar on the left to start editing.
            </p>
          </div>
        </div>
      ) : (
        /* Split layout: primary pane (+ optional secondary pane) */
        <div
          style={{
            display: 'flex',
            flex: 1,
            minHeight: 0,
            width: '100%',
            overflow: 'hidden',
          }}
        >
          {renderPane('left', activeFilePath, activeContent)}
          {splitPath !== null && renderPane('right', splitPath, splitContent ?? '')}
        </div>
      )}

      {/* 4. Editor Status Bar with AutoSave & Host FS info */}
      <div className="editor-status-bar">
        <div className="editor-status-item" style={{ color: isDirty ? 'var(--accent-cyan)' : 'var(--status-emerald)' }}>
          {saveStatus}
        </div>
        <div className="editor-status-item">UTF-8</div>
        <div className="editor-status-item">Spaces: 2</div>
        <div className="editor-status-item">
          Ln {statusPos.line}, Col {statusPos.col}
        </div>
        <div className="editor-status-item">
          {getLanguageName(activeFilePath)}
        </div>
      </div>
    </div>
  );
};
