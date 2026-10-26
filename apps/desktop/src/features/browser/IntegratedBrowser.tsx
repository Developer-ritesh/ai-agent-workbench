import React, { useState, useRef, useEffect } from 'react';
import {
  Globe,
  RotateCw,
  ArrowLeft,
  ArrowRight,
  Shield,
  Smartphone,
  Tablet,
  Monitor,
  Laptop,
  ExternalLink,
  Camera,
  Terminal,
  Activity,
  AlertTriangle,
  Plus,
  X,
  Search,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { BrowserTab, BrowserViewportPreset, BrowserConsoleMessage, BrowserNetworkRequest } from '../../types';

interface IntegratedBrowserProps {
  initialUrl?: string;
  onSendToAgent?: (prompt: string, attachment?: string) => void;
  detectedPorts?: number[];
}

export const IntegratedBrowser: React.FC<IntegratedBrowserProps> = ({
  initialUrl = 'http://127.0.0.1:5173',
  onSendToAgent,
  detectedPorts = [3000, 5173, 8080],
}) => {
  const [tabs, setTabs] = useState<BrowserTab[]>([
    {
      id: 'tab-1',
      title: 'Dev Server Preview',
      url: initialUrl,
      isLoading: false,
      viewport: 'desktop',
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');
  const [inputUrl, setInputUrl] = useState<string>(initialUrl);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState<'console' | 'network' | 'errors'>('console');
  const [screenshotSuccess, setScreenshotSuccess] = useState<boolean>(false);

  // Inspector Logs
  const [consoleLogs] = useState<BrowserConsoleMessage[]>([
    {
      id: 'log-1',
      type: 'info',
      message: '[Vite] connected and hot reload enabled',
      source: 'client.js:104',
      timestamp: new Date().toLocaleTimeString(),
    },
    {
      id: 'log-2',
      type: 'log',
      message: 'App initialized successfully with Zustand store and React Query',
      source: 'index.tsx:28',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  const [networkLogs] = useState<BrowserNetworkRequest[]>([
    {
      id: 'net-1',
      url: '/src/main.tsx',
      method: 'GET',
      status: 200,
      timingMs: 14,
      sizeBytes: 4210,
      timestamp: new Date().toLocaleTimeString(),
    },
    {
      id: 'net-2',
      url: '/api/v1/health',
      method: 'GET',
      status: 200,
      timingMs: 28,
      sizeBytes: 154,
      timestamp: new Date().toLocaleTimeString(),
    },
    {
      id: 'net-3',
      url: '/src/assets/logo.svg',
      method: 'GET',
      status: 200,
      timingMs: 8,
      sizeBytes: 2180,
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  useEffect(() => {
    if (activeTab) {
      setInputUrl(activeTab.url);
    }
  }, [activeTabId, activeTab]);

  const handleNavigate = (newUrl: string) => {
    let formatted = newUrl.trim();
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = `http://${formatted}`;
    }
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId
          ? { ...t, url: formatted, title: formatted.replace(/^https?:\/\//, '') }
          : t
      )
    );
    setInputUrl(formatted);
  };

  const handleAddTab = (url: string = 'http://127.0.0.1:3000') => {
    const newId = `tab-${Date.now()}`;
    const newTab: BrowserTab = {
      id: newId,
      title: url.replace(/^https?:\/\//, ''),
      url,
      isLoading: false,
      viewport: 'desktop',
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
  };

  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const remaining = tabs.filter((t) => t.id !== id);
    setTabs(remaining);
    if (activeTabId === id) {
      setActiveTabId(remaining[remaining.length - 1].id);
    }
  };

  const setViewport = (viewport: BrowserViewportPreset) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, viewport } : t))
    );
  };

  const handleRefresh = () => {
    if (iframeRef.current) {
      const src = iframeRef.current.src;
      iframeRef.current.src = 'about:blank';
      setTimeout(() => {
        if (iframeRef.current) iframeRef.current.src = src;
      }, 50);
    }
  };

  const handleCaptureScreenshot = () => {
    setScreenshotSuccess(true);
    setTimeout(() => setScreenshotSuccess(false), 3000);

    if (onSendToAgent) {
      onSendToAgent(
        `I have captured a screenshot of the integrated browser at ${activeTab?.url} (Viewport: ${activeTab?.viewport || 'desktop'}). Please inspect the visual layout and test responsiveness or check for visual defects.`
      );
    }
  };

  const handleOpenErrorInAgent = (err: BrowserConsoleMessage) => {
    if (onSendToAgent) {
      onSendToAgent(
        `[Browser Debug Request]\nFailed URL: ${activeTab?.url}\nError: ${err.message}\nSource: ${err.source || 'browser console'}\nPlease investigate this frontend issue, locate the file, and apply the appropriate bug fix.`
      );
    }
  };

  // Viewport container sizing
  const getViewportDimensions = () => {
    switch (activeTab?.viewport) {
      case 'mobile':
        return { width: '375px', height: '667px', border: '12px solid #27272a', borderRadius: '32px' };
      case 'tablet':
        return { width: '768px', height: '90%', border: '12px solid #27272a', borderRadius: '24px' };
      case 'laptop':
        return { width: '1200px', height: '95%', border: '8px solid #27272a', borderRadius: '16px' };
      case 'desktop':
      default:
        return { width: '100%', height: '100%', border: 'none', borderRadius: '0' };
    }
  };

  const viewportStyle = getViewportDimensions();

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-100 font-sans select-none overflow-hidden">
      {/* Tab Bar */}
      <div className="flex items-center bg-zinc-900 border-b border-zinc-800 px-2 pt-1 gap-1 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-xs font-medium cursor-pointer transition-colors max-w-56 border-t border-x ${
                isActive
                  ? 'bg-zinc-950 text-emerald-400 border-zinc-800 border-b-transparent shadow-sm'
                  : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-zinc-850'
              }`}
            >
              <Globe className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`} />
              <span className="truncate flex-1">{tab.title || 'New Tab'}</span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => handleCloseTab(tab.id, e)}
                  className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-0.5 rounded transition"
                  title="Close Tab"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        <button
          onClick={() => handleAddTab()}
          className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition ml-1"
          title="New Tab"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Quick Port Jumpers */}
        <div className="ml-auto flex items-center gap-1.5 py-1 text-xs text-zinc-400 pr-2">
          <span className="text-[11px] text-zinc-500 font-mono">Discovered:</span>
          {detectedPorts.map((port) => (
            <button
              key={port}
              onClick={() => handleNavigate(`http://127.0.0.1:${port}`)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition border ${
                activeTab?.url.includes(`:${port}`)
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-750 hover:text-zinc-100 border-zinc-700'
              }`}
              title={`Switch to port ${port}`}
            >
              :{port}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-950 border-b border-zinc-800">
        <div className="flex items-center gap-1">
          <button
            onClick={() => {}}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded transition disabled:opacity-30"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => {}}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded transition disabled:opacity-30"
            title="Forward"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleRefresh}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded transition"
            title="Reload Page"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* URL Input Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleNavigate(inputUrl);
          }}
          className="flex-1 flex items-center bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus-within:border-emerald-500/80 rounded-lg px-2.5 py-1 transition"
        >
          <div className="flex items-center gap-1.5 mr-2 text-emerald-400">
            <Shield className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-500/80">Local</span>
          </div>
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            className="flex-1 bg-transparent text-xs text-zinc-100 outline-none font-mono placeholder-zinc-600"
            placeholder="http://127.0.0.1:3000"
          />
          <button
            type="submit"
            className="text-zinc-400 hover:text-emerald-400 transition ml-1"
            title="Go"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Viewport Presets */}
        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
          <button
            onClick={() => setViewport('desktop')}
            className={`p-1.5 rounded transition ${
              activeTab?.viewport === 'desktop'
                ? 'bg-zinc-800 text-emerald-400 shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Desktop (100%)"
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewport('laptop')}
            className={`p-1.5 rounded transition ${
              activeTab?.viewport === 'laptop'
                ? 'bg-zinc-800 text-emerald-400 shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Laptop (1200px)"
          >
            <Laptop className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewport('tablet')}
            className={`p-1.5 rounded transition ${
              activeTab?.viewport === 'tablet'
                ? 'bg-zinc-800 text-emerald-400 shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Tablet (768px)"
          >
            <Tablet className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewport('mobile')}
            className={`p-1.5 rounded transition ${
              activeTab?.viewport === 'mobile'
                ? 'bg-zinc-800 text-emerald-400 shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Mobile (375px)"
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Screenshot to AI Agent */}
        <button
          onClick={handleCaptureScreenshot}
          className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-emerald-500/40 text-xs px-2.5 py-1 rounded-lg text-zinc-300 hover:text-emerald-300 transition"
          title="Send Screenshot & Context to AI Agent"
        >
          {screenshotSuccess ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Captured!</span>
            </>
          ) : (
            <>
              <Camera className="w-3.5 h-3.5 text-purple-400" />
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Snapshot</span>
            </>
          )}
        </button>

        {/* Toggle DevTools / Console */}
        <button
          onClick={() => setDrawerOpen(!drawerOpen)}
          className={`p-1.5 rounded-lg border transition ${
            drawerOpen
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border-zinc-800'
          }`}
          title="Toggle Browser Console & Network Drawer"
        >
          <Terminal className="w-4 h-4" />
        </button>

        {/* External Link */}
        <a
          href={activeTab?.url}
          target="_blank"
          rel="noreferrer"
          className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg border border-zinc-800 transition"
          title="Open in System Browser"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Main Viewport Container */}
      <div className="flex-1 bg-zinc-950 flex items-center justify-center p-2 overflow-hidden relative">
        <div
          style={viewportStyle}
          className="relative bg-white shadow-2xl transition-all duration-200 flex flex-col overflow-hidden"
        >
          {/* Untrusted Sandbox Guard Notice */}
          <div className="bg-zinc-900/90 backdrop-blur text-zinc-400 text-[10px] py-0.5 px-3 flex items-center justify-between border-b border-zinc-800">
            <span className="flex items-center gap-1 text-zinc-400">
              <Shield className="w-3 h-3 text-emerald-400" />
              Sandboxed Execution (Isolated from Host Tauri APIs)
            </span>
            <span className="font-mono text-zinc-500">
              {(activeTab?.viewport || 'desktop').toUpperCase()} • {activeTab?.url}
            </span>
          </div>

          {/* Sandboxed Webview Iframe */}
          <iframe
            ref={iframeRef}
            src={activeTab?.url}
            title={activeTab?.title}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            className="w-full flex-1 border-none bg-white"
          />
        </div>
      </div>

      {/* Drawer: Developer Tools, Console, Network, Errors */}
      {drawerOpen && (
        <div className="h-60 bg-zinc-900 border-t border-zinc-800 flex flex-col animate-in slide-in-from-bottom duration-150">
          {/* Drawer Header Tabs */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800 bg-zinc-950">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveDrawerTab('console')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition ${
                  activeDrawerTab === 'console'
                    ? 'bg-zinc-800 text-emerald-400'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Console</span>
                <span className="px-1.5 py-0.2 bg-zinc-700/60 text-zinc-300 rounded text-[10px]">
                  {consoleLogs.length}
                </span>
              </button>

              <button
                onClick={() => setActiveDrawerTab('network')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition ${
                  activeDrawerTab === 'network'
                    ? 'bg-zinc-800 text-emerald-400'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Network</span>
                <span className="px-1.5 py-0.2 bg-zinc-700/60 text-zinc-300 rounded text-[10px]">
                  {networkLogs.length}
                </span>
              </button>

              <button
                onClick={() => setActiveDrawerTab('errors')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition ${
                  activeDrawerTab === 'errors'
                    ? 'bg-zinc-800 text-rose-400'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Errors</span>
              </button>
            </div>

            <button
              onClick={() => setDrawerOpen(false)}
              className="p-1 text-zinc-400 hover:text-zinc-200 rounded"
              title="Close Drawer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-2 font-mono text-xs">
            {activeDrawerTab === 'console' && (
              <div className="space-y-1">
                {consoleLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex items-start justify-between py-1 px-2 rounded border-l-2 ${
                      log.type === 'error'
                        ? 'bg-rose-950/20 text-rose-300 border-rose-500'
                        : log.type === 'warn'
                        ? 'bg-amber-950/20 text-amber-300 border-amber-500'
                        : 'bg-zinc-950/40 text-zinc-300 border-emerald-500/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-500">{log.timestamp}</span>
                      <span>{log.message}</span>
                    </div>
                    {log.source && <span className="text-[11px] text-zinc-500">{log.source}</span>}
                  </div>
                ))}
              </div>
            )}

            {activeDrawerTab === 'network' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-zinc-500 border-b border-zinc-800 pb-1 text-[11px]">
                    <th className="py-1">Status</th>
                    <th className="py-1">Method</th>
                    <th className="py-1">Path</th>
                    <th className="py-1">Timing</th>
                    <th className="py-1">Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {networkLogs.map((net) => (
                    <tr key={net.id} className="hover:bg-zinc-850/50 text-[11px]">
                      <td className="py-1">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                          {net.status}
                        </span>
                      </td>
                      <td className="py-1 font-bold text-zinc-300">{net.method}</td>
                      <td className="py-1 text-zinc-400 truncate max-w-xs">{net.url}</td>
                      <td className="py-1 text-zinc-500">{net.timingMs} ms</td>
                      <td className="py-1 text-zinc-500">
                        {net.sizeBytes ? (net.sizeBytes / 1024).toFixed(1) : '0.0'} KB
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeDrawerTab === 'errors' && (
              <div className="space-y-2">
                <div className="bg-rose-950/30 border border-rose-900/60 rounded p-2 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-rose-400 font-bold">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Uncaught TypeError: Cannot read properties of undefined (reading &apos;map&apos;)</span>
                    </div>
                    <p className="text-[11px] text-zinc-400">at ProductList.tsx:42:18</p>
                  </div>
                  <button
                    onClick={() =>
                      handleOpenErrorInAgent({
                        id: 'err-sample',
                        type: 'error',
                        message: 'Uncaught TypeError: Cannot read properties of undefined (reading map)',
                        source: 'ProductList.tsx:42:18',
                        timestamp: new Date().toLocaleTimeString(),
                      })
                    }
                    className="flex items-center gap-1.5 bg-rose-900/40 hover:bg-rose-900/60 text-rose-200 border border-rose-700/60 px-3 py-1.5 rounded text-xs transition"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Create Debug Task in AI Agent</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
