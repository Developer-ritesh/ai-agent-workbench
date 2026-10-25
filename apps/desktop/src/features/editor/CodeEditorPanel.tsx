import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Split,
  MoreHorizontal,
  FileCode,
  FileJson,
  FileText,
  File,
  Save,
  RotateCw,
  Sparkles,
  Terminal as TermIcon,
} from 'lucide-react';
import { TauriApi } from '../../services/tauriIpc';

interface CodeEditorPanelProps {
  activeFilePath: string;
  openFiles: string[];
  onSelectTab: (filePath: string) => void;
  onCloseTab: (filePath: string) => void;
}

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
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load real file content from host disk whenever activeFilePath changes and isn't cached yet
  useEffect(() => {
    if (!activeFilePath) return;

    if (fileContents[activeFilePath] === undefined) {
      TauriApi.readFile(activeFilePath)
        .then((content) => {
          setFileContents((prev) => ({ ...prev, [activeFilePath]: content }));
        })
        .catch(() => {
          // If file is new or empty
          setFileContents((prev) => ({
            ...prev,
            [activeFilePath]: `// ${activeFilePath.split('/').pop()}\n\n`,
          }));
        });
    }
  }, [activeFilePath, fileContents]);

  const activeContent = fileContents[activeFilePath] ?? '';

  // Actual Save Function (writes directly to host disk)
  const saveFile = useCallback(
    async (filePath: string, content: string) => {
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
    },
    []
  );

  // Handle content edit with debounced AutoSave (1000ms)
  const handleContentChange = (newContent: string) => {
    setFileContents((prev) => ({ ...prev, [activeFilePath]: newContent }));
    setDirtyFiles((prev) => new Set(prev).add(activeFilePath));
    setSaveStatus('● Unsaved');

    // Debounced autosave
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = setTimeout(() => {
      saveFile(activeFilePath, newContent);
    }, 1000);
  };

  // Keyboard shortcuts: Cmd+S / Ctrl+S to save immediately, Tab indentation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      saveFile(activeFilePath, activeContent);
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const spaces = '  '; // 2 spaces for tab
      const updated = activeContent.substring(0, start) + spaces + activeContent.substring(end);

      handleContentChange(updated);

      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + spaces.length;
      });
    }
  };

  const updateCursorPosition = () => {
    if (!textareaRef.current) return;
    const text = textareaRef.current.value.substring(0, textareaRef.current.selectionStart);
    const lines = text.split('\n');
    setCursorPos({
      line: lines.length,
      col: lines[lines.length - 1].length + 1,
    });
  };

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

  const lineCount = Math.max(activeContent.split('\n').length, 1);
  const isDirty = dirtyFiles.has(activeFilePath);

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
            onClick={() => saveFile(activeFilePath, activeContent)}
          >
            <Save size={13} color={isDirty ? 'var(--accent-cyan)' : 'var(--text-secondary)'} />
          </button>
          <button className="btn-icon" title="Split Editor Right">
            <Split size={14} />
          </button>
          <button className="btn-icon" title="More Actions">
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* 2. Breadcrumbs Bar */}
      <div className="editor-breadcrumbs">
        <span>{activeFilePath || 'No file selected'}</span>
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
                <span className="shortcut-label">OpenCode CLI Agent</span>
                <span className="shortcut-keys"><kbd>opencode</kbd></span>
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
        <div className="editor-canvas">
          {/* Line Numbers Gutter */}
          <div className="editor-gutter">
            {Array.from({ length: lineCount }).map((_, i) => (
              <div
                key={i}
                className={`gutter-line-number ${i + 1 === cursorPos.line ? 'active' : ''}`}
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* Interactive Editor Monospace Area */}
          <textarea
            ref={textareaRef}
            className="editor-code-input"
            value={activeContent}
            onChange={(e) => handleContentChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onKeyUp={updateCursorPosition}
            onClick={updateCursorPosition}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            placeholder="Start typing code or open a file..."
          />

          {/* Subtle Minimap representation on right edge */}
          <div className="editor-minimap">
            {activeContent.slice(0, 1500)}
          </div>
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
          Ln {cursorPos.line}, Col {cursorPos.col}
        </div>
        <div className="editor-status-item">
          {getLanguageName(activeFilePath)}
        </div>
      </div>
    </div>
  );
};
