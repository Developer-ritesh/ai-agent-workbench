import React, { useState, useEffect, useRef } from 'react';
import { Workspace } from '../../types';
import { ActivityTab } from '../../components/Navigation';
import { WorkspaceSidebar } from './WorkspaceSidebar';
import { CodeEditorPanel } from '../editor/CodeEditorPanel';
import { TerminalPanel } from '../terminal/TerminalPanel';

interface WorkspaceDetailProps {
  workspace: Workspace;
  activityTab: ActivityTab;
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

  // Resizable panel dimensions
  const [leftWidth, setLeftWidth] = useState(250);
  const [bottomHeight, setBottomHeight] = useState(380);
  const [localTerminalMaximized, setLocalTerminalMaximized] = useState(false);
  const effectiveMaximized = isTerminalMaximized || localTerminalMaximized;

  const isDraggingLeft = useRef(false);
  const isDraggingBottom = useRef(false);

  // Initialize with readme or package.json if path exists
  useEffect(() => {
    if (workspace?.hostProjectPath) {
      const defaultFile = `${workspace.hostProjectPath}/README.md`;
      setActiveFilePath(defaultFile);
      setOpenFiles([defaultFile]);
    }
  }, [workspace?.hostProjectPath]);

  const handleOpenFile = (path: string, _name?: string) => {
    if (!openFiles.includes(path)) {
      setOpenFiles((prev) => [...prev, path]);
    }
    setActiveFilePath(path);
  };

  const handleCloseTab = (path: string) => {
    const remaining = openFiles.filter((f) => f !== path);
    setOpenFiles(remaining);
    if (activeFilePath === path && remaining.length > 0) {
      setActiveFilePath(remaining[remaining.length - 1]);
    } else if (remaining.length === 0) {
      setActiveFilePath('');
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
      // Activity bar is 48px
      const newWidth = Math.max(180, Math.min(550, moveEvent.clientX - 48));
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

  return (
    <div className="ide-body">
      {/* 1. Left Sidebar (Explorer / Search / Git / VM Manager) */}
      {showLeftSidebar && (
        <div style={{ width: leftWidth, display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100%', maxHeight: '100%', minHeight: 0, overflow: 'hidden' }}>
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
      {showLeftSidebar && (
        <div
          className="panel-resizer-horizontal"
          onMouseDown={handleLeftMouseDown}
          title="Drag to resize sidebar"
        />
      )}

      {/* 2. Center Column: Code Editor + Bottom Integrated Terminal (CLI Agent Ready) */}
      <div className="ide-center-column">
        {/* Center Code Editor Panel */}
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
      </div>
    </div>
  );
};
