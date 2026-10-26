import React, { useState, useEffect, useRef } from 'react';
import { Workspace } from '../../types';
import { ActivityTab } from '../../components/Navigation';
import { WorkspaceSidebar } from './WorkspaceSidebar';
import { CodeEditorPanel } from '../editor/CodeEditorPanel';
import { TerminalPanel } from '../terminal/TerminalPanel';
import { IntegratedBrowser } from '../browser/IntegratedBrowser';
import { PortForwardingPanel } from '../ports/PortForwardingPanel';
import { ApiStudio } from '../api/ApiStudio';
import { TestingEngine } from '../testing/TestingEngine';
import { DiagnosticsPanel } from '../diagnostics/DiagnosticsPanel';
import { GitDiffViewer } from '../git/GitDiffViewer';

interface WorkspaceDetailProps {
  workspace: Workspace;
  activityTab: ActivityTab;
  onSelectTab?: (tab: ActivityTab) => void;
  onStartVm: (workspaceId: string) => void;
  onStopVm: (workspaceId: string) => void;
  onRotateVm: (workspaceId: string) => void;
  onOpenFolder?: () => void;
  showLeftSidebar?: boolean;
  showBottomPanel?: boolean;
  isTerminalMaximized?: boolean;
}

export const WorkspaceDetail: React.FC<WorkspaceDetailProps> = ({
  workspace,
  activityTab,
  onSelectTab,
  onStartVm,
  onStopVm,
  onRotateVm,
  onOpenFolder,
  showLeftSidebar = true,
  showBottomPanel = true,
  isTerminalMaximized = false,
}) => {
  const [activeFilePath, setActiveFilePath] = useState('');
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [browserUrl, setBrowserUrl] = useState<string>('http://127.0.0.1:5173');

  // Resizable panel dimensions
  const [leftWidth, setLeftWidth] = useState(250);
  const [bottomHeight, setBottomHeight] = useState(360);
  const [localTerminalMaximized, setLocalTerminalMaximized] = useState(false);
  const effectiveMaximized = isTerminalMaximized || localTerminalMaximized;

  const isDraggingLeft = useRef(false);
  const isDraggingBottom = useRef(false);

  // Initialize with readme or package.json if path exists
  useEffect(() => {
    if (workspace.hostProjectPath) {
      const readme = `${workspace.hostProjectPath}/README.md`;
      setActiveFilePath(readme);
      setOpenFiles([readme]);
    }
  }, [workspace.hostProjectPath]);

  const handleOpenFile = (path: string) => {
    setActiveFilePath(path);
    if (!openFiles.includes(path)) {
      setOpenFiles((prev) => [...prev, path]);
    }
  };

  const handleCloseTab = (path: string) => {
    const nextFiles = openFiles.filter((f) => f !== path);
    setOpenFiles(nextFiles);
    if (activeFilePath === path) {
      setActiveFilePath(nextFiles[nextFiles.length - 1] || '');
    }
  };

  // Horizontal resizer (Left Sidebar)
  const handleLeftMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingLeft.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingLeft.current) return;
      const newWidth = Math.max(180, Math.min(500, moveEvent.clientX));
      setLeftWidth(newWidth);
    };

    const onMouseUp = () => {
      isDraggingLeft.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Vertical resizer (Bottom Panel)
  const handleBottomMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingBottom.current = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingBottom.current) return;
      const newHeight = Math.max(120, Math.min(window.innerHeight - 80, window.innerHeight - moveEvent.clientY));
      setBottomHeight(newHeight);
      window.dispatchEvent(new Event('resize'));
    };

    const onMouseUp = () => {
      isDraggingBottom.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.dispatchEvent(new Event('resize'));
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };


  // Determine whether left sidebar applies for the current activity tab
  const isSidebarVisible =
    showLeftSidebar && ['explorer', 'search', 'vm', 'terminal'].includes(activityTab);

  return (
    <div className="ide-body relative flex flex-1 h-full w-full overflow-hidden">
      {/* 1. Left Sidebar (Explorer / Search / Git / VM Manager) */}
      {isSidebarVisible && (
        <div
          style={{
            width: leftWidth,
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            height: '100%',
            maxHeight: '100%',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <WorkspaceSidebar
            activityTab={activityTab}
            workspace={workspace}
            activeFilePath={activeFilePath}
            onOpenFile={handleOpenFile}
            onOpenFolder={onOpenFolder}
            onStartVm={onStartVm}
            onStopVm={onStopVm}
            onRotateVm={onRotateVm}
          />
        </div>
      )}

      {/* Resizer Handle: Left Sidebar to Center */}
      {isSidebarVisible && (
        <div
          className="panel-resizer-horizontal"
          onMouseDown={handleLeftMouseDown}
          title="Drag to resize sidebar"
        />
      )}

      {/* 2. Center Column: Switcher for Browser, API Studio, Tests, Ports, Diagnostics, or Code Editor */}
      <div className="ide-center-column flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Dynamic Center Workspaces */}
        {activityTab === 'browser' ? (
          <div className="flex-1 flex min-h-0 overflow-hidden">
            <IntegratedBrowser
              initialUrl={browserUrl}
            />
          </div>
        ) : activityTab === 'ports' ? (
          <div className="flex-1 flex min-h-0 overflow-hidden">
            <PortForwardingPanel
              onOpenInBrowser={(url) => {
                setBrowserUrl(url);
                if (onSelectTab) onSelectTab('browser');
              }}
            />
          </div>
        ) : activityTab === 'api' ? (
          <div className="flex-1 flex min-h-0 overflow-hidden">
            <ApiStudio />
          </div>
        ) : activityTab === 'tests' ? (
          <div className="flex-1 flex min-h-0 overflow-hidden">
            <TestingEngine />
          </div>
        ) : activityTab === 'diagnostics' ? (
          <div className="flex-1 flex min-h-0 overflow-hidden">
            <DiagnosticsPanel />
          </div>
        ) : activityTab === 'git' ? (
          <div className="flex-1 flex min-h-0 overflow-hidden bg-zinc-950">
            <GitDiffViewer workspaceId={workspace.id} />
          </div>
        ) : (
          /* Default: Code Editor + Bottom Integrated Terminal */
          <>
            {!effectiveMaximized && (
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <CodeEditorPanel
                  activeFilePath={activeFilePath}
                  openFiles={openFiles}
                  onSelectTab={setActiveFilePath}
                  onCloseTab={handleCloseTab}
                />
              </div>
            )}

            {/* Resizer Handle: Editor to Bottom Terminal */}
            {showBottomPanel && !effectiveMaximized && (
              <div
                className="panel-resizer-vertical"
                onMouseDown={handleBottomMouseDown}
                title="Drag to resize terminal panel"
              />
            )}

            {/* Bottom Terminal / Logs / Output Panel */}
            {showBottomPanel && (
              <div
                style={{
                  height: effectiveMaximized ? '100%' : bottomHeight,
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 100,
                }}
              >
                <TerminalPanel
                  workspaceId={workspace.id}
                  workspaceName={workspace.name}
                  workspacePath={workspace.hostProjectPath}
                  vmStatus={workspace.status}
                  isMaximized={effectiveMaximized}
                  onToggleMaximize={() => setLocalTerminalMaximized((prev) => !prev)}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
