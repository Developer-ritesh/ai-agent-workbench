import React, { useState, useEffect } from 'react';
import { Workspace, ProviderProfile, CreateWorkspacePayload, ThemeMode } from './types';
import { TauriApi } from './services/tauriIpc';
import { Header } from './components/Header';
import { Navigation, ActivityTab } from './components/Navigation';
import { WorkspaceList } from './features/workspaces/WorkspaceList';
import { WorkspaceDetail } from './features/workspaces/WorkspaceDetail';
import { ProviderManager } from './features/providers/ProviderManager';
import { SettingsView } from './features/settings/SettingsView';
import { CreateWorkspaceModal } from './components/CreateWorkspaceModal';
import { CommandPalette } from './components/CommandPalette';

const DEFAULT_WORKSPACE: Workspace = {
  id: 'ws-masticall-in',
  name: 'masticall-in',
  hostProjectPath: '/tmp/masticall-in',
  vmId: 'vm-masticall-in',
  imageId: 'Ubuntu 24.04',
  config: {
    cpuCount: 2,
    memoryMb: 4096,
    diskSizeGb: 20,
    networkMode: 'standard',
  },
  status: 'stopped',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const App: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([DEFAULT_WORKSPACE]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(DEFAULT_WORKSPACE.id);
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [activityTab, setActivityTab] = useState<ActivityTab>('explorer');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Panel layout toggles (matches user screenshot)
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showBottomPanel, setShowBottomPanel] = useState(true);
  const [isTerminalMaximized, setIsTerminalMaximized] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Auto-Rotate configuration (default 60 minutes)
  const [autoRotateMinutes, setAutoRotateMinutes] = useState<number>(60);
  const [secondsUntilRotate, setSecondsUntilRotate] = useState<number>(60 * 60);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Auto-Rotate Countdown Timer
  useEffect(() => {
    if (autoRotateMinutes <= 0) return;

    const timer = setInterval(() => {
      setSecondsUntilRotate((prev) => {
        if (prev <= 1) {
          // Trigger Auto-Rotate
          if (activeWorkspaceId) {
            handleRotateVm(activeWorkspaceId);
          }
          return autoRotateMinutes * 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRotateMinutes, activeWorkspaceId]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setShowLeftSidebar((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setShowBottomPanel((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setActivityTab('settings');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const [wsList, provList] = await Promise.all([
        TauriApi.listWorkspaces().catch(() => []),
        TauriApi.listProviders().catch(() => []),
      ]);

      if (wsList && wsList.length > 0) {
        setWorkspaces(wsList);
        setActiveWorkspaceId(wsList[0].id);
      } else {
        setWorkspaces([DEFAULT_WORKSPACE]);
        setActiveWorkspaceId(DEFAULT_WORKSPACE.id);
      }

      if (provList && provList.length > 0) {
        setProviders(provList);
      }
    } catch (e) {
      console.error('Initialization error', e);
    } finally {
      setIsLoading(false);
    }
  };

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0] || null;

  const handleStartVm = async (workspaceId: string) => {
    try {
      await TauriApi.startVm(workspaceId);
      setWorkspaces((prev) =>
        prev.map((w) => (w.id === workspaceId ? { ...w, status: 'running' } : w))
      );
    } catch (err: any) {
      alert(`Failed to start VM: ${err?.message || String(err)}`);
    }
  };

  const handleStopVm = async (workspaceId: string) => {
    try {
      await TauriApi.stopVm(workspaceId);
      setWorkspaces((prev) =>
        prev.map((w) => (w.id === workspaceId ? { ...w, status: 'stopped' } : w))
      );
    } catch (err: any) {
      alert(`Failed to stop VM: ${err?.message || String(err)}`);
    }
  };

  const handleRotateVm = async (workspaceId: string) => {
    try {
      await TauriApi.rotateVm(workspaceId);
      setWorkspaces((prev) =>
        prev.map((w) => (w.id === workspaceId ? { ...w, status: 'running' } : w))
      );
      setSecondsUntilRotate(autoRotateMinutes * 60);
    } catch (err: any) {
      alert(`Failed to rotate VM: ${err?.message || String(err)}`);
    }
  };

  const handleOpenFolder = async () => {
    try {
      const selectedPath = await TauriApi.dialogOpenFolder();
      if (!selectedPath) return;

      const folderName = selectedPath.split('/').filter(Boolean).pop() || 'Project';

      // Check if workspace for this path already exists
      const existing = workspaces.find((w) => w.hostProjectPath === selectedPath);
      if (existing) {
        setActiveWorkspaceId(existing.id);
        setActivityTab('explorer');
        return;
      }

      // Create new workspace for selected folder
      const created = await TauriApi.createWorkspace({
        name: folderName,
        hostProjectPath: selectedPath,
      });

      setWorkspaces((prev) => [created, ...prev]);
      setActiveWorkspaceId(created.id);
      setActivityTab('explorer');
    } catch (err: any) {
      alert(`Could not open folder: ${err?.message || String(err)}`);
    }
  };

  const handleCreateWorkspace = async (payload: CreateWorkspacePayload) => {
    const created = await TauriApi.createWorkspace(payload);
    setWorkspaces((prev) => [created, ...prev]);
    setActiveWorkspaceId(created.id);
    setActivityTab('explorer');
  };

  const handleDeleteWorkspace = async (workspaceId: string) => {
    await TauriApi.deleteWorkspace(workspaceId);
    setWorkspaces((prev) => prev.filter((w) => w.id !== workspaceId));
    if (activeWorkspaceId === workspaceId) {
      const remaining = workspaces.filter((w) => w.id !== workspaceId);
      setActiveWorkspaceId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleSelectWorkspace = (ws: Workspace) => {
    setActiveWorkspaceId(ws.id);
    setActivityTab('explorer');
  };

  const handleSetAutoRotateMinutes = (mins: number) => {
    setAutoRotateMinutes(mins);
    setSecondsUntilRotate(mins * 60);
  };

  // Toggle layout functions (matches user screenshot)
  const handleToggleFocusMode = () => {
    if (!isFocusMode) {
      setShowLeftSidebar(false);
      setShowBottomPanel(false);
      setIsFocusMode(true);
    } else {
      setShowLeftSidebar(true);
      setShowBottomPanel(true);
      setIsFocusMode(false);
    }
  };

  return (
    <div className="workbench-shell">
      {/* 1. Header Toolbar with exact user screenshot controls */}
      <Header
        activeWorkspace={activeWorkspace}
        workspaces={workspaces}
        theme={theme}
        onSetTheme={setTheme}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onSelectWorkspace={handleSelectWorkspace}
        onOpenFolder={handleOpenFolder}
        onStartVm={handleStartVm}
        onStopVm={handleStopVm}
        onRotateVm={handleRotateVm}
        onOpenSettings={() => setActivityTab('settings')}
        showLeftSidebar={showLeftSidebar}
        onToggleLeftSidebar={() => setShowLeftSidebar((prev) => !prev)}
        showBottomPanel={showBottomPanel}
        onToggleBottomPanel={() => setShowBottomPanel((prev) => !prev)}
        isTerminalMaximized={isTerminalMaximized}
        onToggleTerminalMaximized={() => setIsTerminalMaximized((prev) => !prev)}
        isFocusMode={isFocusMode}
        onToggleFocusMode={handleToggleFocusMode}
        autoRotateMinutes={autoRotateMinutes}
        onSetAutoRotateMinutes={handleSetAutoRotateMinutes}
        secondsUntilRotate={secondsUntilRotate}
      />

      {/* 2. Main IDE Workspace */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, width: '100%', overflow: 'hidden' }}>
        {/* Leftmost Activity Bar */}
        <Navigation
          currentTab={activityTab}
          onSelectTab={(tab) => {
            setActivityTab(tab);
            if (['explorer', 'search', 'vm', 'terminal'].includes(tab)) {
              setShowLeftSidebar(true);
            }
            if (tab === 'terminal') {
              setShowBottomPanel(true);
            }
          }}
        />

        {/* View Switcher */}
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
              Loading workspace...
            </div>
          </div>
        ) : activityTab === 'settings' ? (
          <div className="view-container">
            <SettingsView
              theme={theme}
              onSetTheme={setTheme}
              autoRotateMinutes={autoRotateMinutes}
              onSetAutoRotateMinutes={handleSetAutoRotateMinutes}
              onRotateVm={() => activeWorkspace && handleRotateVm(activeWorkspace.id)}
              activeWorkspacePath={activeWorkspace?.hostProjectPath}
            />
          </div>
        ) : activityTab === 'providers' ? (
          <div className="view-container">
            <ProviderManager
              providers={providers}
              onRefreshProviders={async () => {
                const list = await TauriApi.listProviders();
                setProviders(list);
              }}
            />
          </div>
        ) : activeWorkspace ? (
          /* IDE layout with full real disk read/write & resizable panels */
          <WorkspaceDetail
            workspace={activeWorkspace}
            activityTab={activityTab}
            onSelectTab={setActivityTab}
            providers={providers}
            onStartVm={handleStartVm}
            onStopVm={handleStopVm}
            onRotateVm={handleRotateVm}
            onOpenFolder={handleOpenFolder}
            showLeftSidebar={showLeftSidebar}
            showBottomPanel={showBottomPanel}
            isTerminalMaximized={isTerminalMaximized}
          />
        ) : (
          <div className="view-container">
            <WorkspaceList
              workspaces={workspaces}
              activeWorkspaceId={activeWorkspaceId}
              onSelectWorkspace={handleSelectWorkspace}
              onStartVm={handleStartVm}
              onStopVm={handleStopVm}
              onDeleteWorkspace={handleDeleteWorkspace}
              onOpenCreateModal={() => setIsCreateModalOpen(true)}
            />
          </div>
        )}
      </div>

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateWorkspace}
      />

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        workspaces={workspaces}
        activeWorkspace={activeWorkspace}
        onSelectWorkspace={handleSelectWorkspace}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onStartVm={handleStartVm}
        onStopVm={handleStopVm}
        onNavigate={(tab) => {
          setActivityTab(tab as ActivityTab);
          setIsCommandPaletteOpen(false);
        }}
        onSetTheme={setTheme}
      />
    </div>
  );
};

export default App;
