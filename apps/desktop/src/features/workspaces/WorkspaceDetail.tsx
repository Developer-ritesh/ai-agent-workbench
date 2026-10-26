import React, { useState, useEffect, useRef } from 'react';
import { Workspace, ProviderProfile } from '../../types';
import { ActivityTab } from '../../components/Navigation';
import { WorkspaceSidebar } from './WorkspaceSidebar';
import { CodeEditorPanel } from '../editor/CodeEditorPanel';
import { TerminalPanel } from '../terminal/TerminalPanel';
import { IntegratedBrowser } from '../browser/IntegratedBrowser';
import { PortForwardingPanel } from '../ports/PortForwardingPanel';
import { ApiStudio } from '../api/ApiStudio';
import { TestingEngine } from '../testing/TestingEngine';
import { DiagnosticsPanel } from '../diagnostics/DiagnosticsPanel';
import { AgentPanel } from '../agents/AgentPanel';
import { Bot, PanelRightClose, PanelRightOpen } from 'lucide-react';

interface WorkspaceDetailProps {
  workspace: Workspace;
  activityTab: ActivityTab;
  onSelectTab?: (tab: ActivityTab) => void;
  providers?: ProviderProfile[];
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
  providers = [],
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
  const [selectedModel, setSelectedModel] = useState<string>('claude-3-7-sonnet');
  const [showRightAgentPanel, setShowRightAgentPanel] = useState<boolean>(false);

  // Resizable panel dimensions
  const [leftWidth, setLeftWidth] = useState(250);
  const [rightWidth, setRightWidth] = useState(380);
  const [bottomHeight, setBottomHeight] = useState(360);
  const [localTerminalMaximized, setLocalTerminalMaximized] = useState(false);
  const effectiveMaximized = isTerminalMaximized || localTerminalMaximized;

  const isDraggingLeft = useRef(false);
  const isDraggingRight = useRef(false);
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

  // Horizontal resizer (Right Agent Panel)
  const handleRightMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRight.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRight.current) return;
      const newWidth = Math.max(280, Math.min(650, window.innerWidth - moveEvent.clientX));
      setRightWidth(newWidth);
    };

    const onMouseUp = () => {
      isDraggingRight.current = false;
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

  const handleSendToAgent = (promptText: string) => {
    setShowRightAgentPanel(true);
    console.log('[Agent Dispatch]', promptText);
  };

  // Determine whether left sidebar applies for the current activity tab
  const isSidebarVisible =
    showLeftSidebar && ['explorer', 'search', 'git', 'vm', 'terminal'].includes(activityTab);

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
        {/* Top-Right Quick Toggle for AI Agent Right Panel */}
        {activityTab !== 'agent' && (
          <div className="absolute right-3 top-2 z-20 flex items-center gap-1.5">
            <button
              onClick={() => setShowRightAgentPanel((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border shadow-sm transition backdrop-blur ${
                showRightAgentPanel
                  ? 'bg-purple-900/40 text-purple-200 border-purple-500/60'
                  : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border-zinc-700'
              }`}
              title="Toggle AI Agent Panel (Cmd+Shift+A)"
            >
              <Bot className="w-3.5 h-3.5 text-purple-400" />
              <span>AI Agent</span>
              {showRightAgentPanel ? (
                <PanelRightClose className="w-3 h-3 text-zinc-400" />
              ) : (
                <PanelRightOpen className="w-3 h-3 text-zinc-400" />
              )}
            </button>
          </div>
        )}

        {/* Dynamic Center Workspaces */}
        {activityTab === 'browser' ? (
          <div className="flex-1 flex min-h-0 overflow-hidden">
            <IntegratedBrowser
              initialUrl={browserUrl}
              onSendToAgent={handleSendToAgent}
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
            <ApiStudio onSendToAgent={handleSendToAgent} />
          </div>
        ) : activityTab === 'tests' ? (
          <div className="flex-1 flex min-h-0 overflow-hidden">
            <TestingEngine
              onSendToAgent={handleSendToAgent}
              workspacePath={workspace.hostProjectPath}
            />
          </div>
        ) : activityTab === 'diagnostics' ? (
          <div className="flex-1 flex min-h-0 overflow-hidden">
            <DiagnosticsPanel onSendToAgent={handleSendToAgent} />
          </div>
        ) : activityTab === 'agent' ? (
          <div className="flex-1 flex min-h-0 overflow-hidden bg-zinc-950">
            <AgentPanel
              workspaceId={workspace.id}
              providers={providers}
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
              onReviewChanges={() => onSelectTab && onSelectTab('git')}
            />
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

      {/* 3. Resizer & Right AI Agent Panel */}
      {showRightAgentPanel && activityTab !== 'agent' && (
        <>
          <div
            className="panel-resizer-horizontal"
            onMouseDown={handleRightMouseDown}
            title="Drag to resize agent panel"
          />
          <div
            style={{
              width: rightWidth,
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
              height: '100%',
              overflow: 'hidden',
            }}
          >
            <AgentPanel
              workspaceId={workspace.id}
              providers={providers}
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
              onReviewChanges={() => onSelectTab && onSelectTab('git')}
            />
          </div>
        </>
      )}
    </div>
  );
};
