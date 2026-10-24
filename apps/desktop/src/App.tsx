import React, { useState, useEffect } from 'react';
import { Workspace, ProviderProfile, CreateWorkspacePayload } from './types';
import { TauriApi } from './services/tauriIpc';
import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { WorkspaceList } from './features/workspaces/WorkspaceList';
import { WorkspaceDetail } from './features/workspaces/WorkspaceDetail';
import { TerminalPanel } from './features/terminal/TerminalPanel';
import { AgentPanel } from './features/agents/AgentPanel';
import { ProviderManager } from './features/providers/ProviderManager';
import { GitDiffViewer } from './features/git/GitDiffViewer';
import { CreateWorkspaceModal } from './components/CreateWorkspaceModal';

export const App: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [opencodeVersion, setOpencodeVersion] = useState<string>('opencode v2.1.4');
  const [currentTab, setCurrentTab] = useState<NavTab>('workspaces');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const [wsList, provList, ver] = await Promise.all([
        TauriApi.listWorkspaces(),
        TauriApi.listProviders(),
        TauriApi.getOpencodeVersion().catch(() => 'opencode ready'),
      ]);

      setWorkspaces(wsList);
      setProviders(provList);
      if (ver) setOpencodeVersion(ver);
      if (wsList.length > 0 && !activeWorkspaceId) {
        setActiveWorkspaceId(wsList[0].id);
      }
    } catch (e) {
      console.error('Initialization error', e);
    } finally {
      setIsLoading(false);
    }
  };

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || null;

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

  const handleCreateWorkspace = async (payload: CreateWorkspacePayload) => {
    const created = await TauriApi.createWorkspace(payload);
    setWorkspaces((prev) => [created, ...prev]);
    setActiveWorkspaceId(created.id);
    setCurrentTab('workbench');
  };

  const handleDeleteWorkspace = async (workspaceId: string) => {
    await TauriApi.deleteWorkspace(workspaceId);
    setWorkspaces((prev) => prev.filter((w) => w.id !== workspaceId));
    if (activeWorkspaceId === workspaceId) {
      setActiveWorkspaceId(null);
      setCurrentTab('workspaces');
    }
  };

  const handleSelectWorkspace = (ws: Workspace) => {
    setActiveWorkspaceId(ws.id);
    setCurrentTab('workbench');
  };

  return (
    <div className="app-container">
      <Navigation
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        hasActiveWorkspace={Boolean(activeWorkspace)}
      />

      <div className="main-layout">
        <Header
          activeWorkspace={activeWorkspace}
          opencodeVersion={opencodeVersion}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
        />

        <main className="app-content">
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <div style={{ color: 'var(--text-muted)' }}>Initializing macOS Workbench...</div>
            </div>
          ) : (
            <>
              {currentTab === 'workspaces' && (
                <WorkspaceList
                  workspaces={workspaces}
                  activeWorkspaceId={activeWorkspaceId}
                  onSelectWorkspace={handleSelectWorkspace}
                  onStartVm={handleStartVm}
                  onStopVm={handleStopVm}
                  onDeleteWorkspace={handleDeleteWorkspace}
                  onOpenCreateModal={() => setIsCreateModalOpen(true)}
                />
              )}

              {currentTab === 'workbench' && activeWorkspace && (
                <WorkspaceDetail
                  workspace={activeWorkspace}
                  providers={providers}
                  onStartVm={handleStartVm}
                  onStopVm={handleStopVm}
                />
              )}

              {currentTab === 'agents' && activeWorkspace && (
                <AgentPanel workspaceId={activeWorkspace.id} providers={providers} />
              )}

              {currentTab === 'terminal' && activeWorkspace && (
                <TerminalPanel workspaceId={activeWorkspace.id} vmStatus={activeWorkspace.status} />
              )}

              {currentTab === 'providers' && (
                <ProviderManager
                  providers={providers}
                  onRefreshProviders={async () => {
                    const list = await TauriApi.listProviders();
                    setProviders(list);
                  }}
                />
              )}

              {currentTab === 'git' && activeWorkspace && (
                <GitDiffViewer workspaceId={activeWorkspace.id} />
              )}
            </>
          )}
        </main>
      </div>

      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateWorkspace}
      />
    </div>
  );
};

export default App;
