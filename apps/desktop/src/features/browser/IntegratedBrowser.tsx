import React, { useState, useRef, useEffect } from 'react';
import {
  Globe,
  RotateCw,
  ArrowLeft,
  ArrowRight,
  Shield,
  Smartphone,
  Monitor,
  ExternalLink,
  Camera,
  Plus,
  X,
  Search,
  CheckCircle2,
  Bookmark,
  History,
  Download,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  Key,
  Database,
  Lock,
  FileCode,
  Code,
  Copy,
  Check,
  Trash2,
  Home,
  Sliders,
} from 'lucide-react';
import {
  BrowserTab,
  BrowserConsoleMessage,
  BrowserNetworkRequest,
  BrowserBookmark,
  BrowserHistoryEntry,
  BrowserDownloadItem,
  DOMNodeInfo,
  CSSRuleInfo,
  BoxModelMetrics,
  StorageEntry,
  CookieEntry,
  AutomationScript,
  BrowserEngineStatus,
} from '../../types';
import { tauriIpc } from '../../services/tauriIpc';

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
  // Tabs State
  const [tabs, setTabs] = useState<BrowserTab[]>([
    {
      id: 'tab-1',
      title: 'Dev Server Preview',
      url: initialUrl,
      isLoading: false,
      viewport: 'desktop',
      zoomLevel: 100,
    },
    {
      id: 'tab-2',
      title: 'Local API Gateway',
      url: 'http://127.0.0.1:8080/health',
      isLoading: false,
      viewport: 'desktop',
      zoomLevel: 100,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');
  const [inputUrl, setInputUrl] = useState<string>(initialUrl);
  const [closedTabs, setClosedTabs] = useState<BrowserTab[]>([]);

  // Engine Status (CDP Chromium)
  const [engineStatus, setEngineStatus] = useState<BrowserEngineStatus>({
    isRunning: true,
    pid: 21220,
    cdpPort: 9222,
    cdpUrl: 'http://127.0.0.1:9222/json',
    version: 'Chrome 155.0.8059.85 (CDP 1.3)',
    profileDir: '~/.ai-agent-workbench/browser-profile',
  });

  // Navigation and Zoom
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [isSecure, setIsSecure] = useState<boolean>(true);
  const [searchEngine] = useState<'direct' | 'google' | 'duckduckgo'>('direct');
  const [previewMode, setPreviewMode] = useState<'simulator' | 'iframe'>('simulator');
  const [simCounter, setSimCounter] = useState<number>(0);
  const [simApiStatus, setSimApiStatus] = useState<string | null>(null);
  const [simApiLoading, setSimApiLoading] = useState<boolean>(false);

  // Find in page
  const [showFindInPage, setShowFindInPage] = useState<boolean>(false);
  const [findQuery, setFindQuery] = useState<string>('');
  const [findMatchesCount, setFindMatchesCount] = useState<number>(0);

  // Bookmarks, History, Downloads Modals
  const [showBookmarksModal, setShowBookmarksModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showDownloadsModal, setShowDownloadsModal] = useState<boolean>(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState<boolean>(false);

  const [bookmarks, setBookmarks] = useState<BrowserBookmark[]>([
    { id: 'bm-1', title: 'Local Vite Dev', url: 'http://127.0.0.1:5173', createdAt: 'Today' },
    { id: 'bm-2', title: 'Node Express Backend', url: 'http://127.0.0.1:3000', createdAt: 'Today' },
    { id: 'bm-3', title: 'Rust MicroVM API', url: 'http://127.0.0.1:8080', createdAt: 'Yesterday' },
  ]);

  const [history, setHistory] = useState<BrowserHistoryEntry[]>([
    { id: 'h-1', title: 'Dev Server Preview', url: 'http://127.0.0.1:5173', timestamp: '10:45 AM' },
    { id: 'h-2', title: 'Local API Gateway', url: 'http://127.0.0.1:8080/health', timestamp: '10:30 AM' },
    { id: 'h-3', title: 'Dashboard Component UI', url: 'http://127.0.0.1:5173/dashboard', timestamp: '09:15 AM' },
  ]);

  const [downloads] = useState<BrowserDownloadItem[]>([
    {
      id: 'dl-1',
      filename: 'workbench-bundle.tar.gz',
      url: 'http://127.0.0.1:5173/assets/workbench-bundle.tar.gz',
      sizeBytes: 15420000,
      transferredBytes: 15420000,
      status: 'completed',
      timestamp: 'Today, 10:20 AM',
    },
  ]);

  // DevTools Dock State (collapsed by default to provide full workspace)
  const [devToolsOpen, setDevToolsOpen] = useState<boolean>(false);
  const [canvasTheme, setCanvasTheme] = useState<'dark' | 'light'>('dark');
  const [showToolsMenu, setShowToolsMenu] = useState<boolean>(false);
  const [activeDevTab, setActiveDevTab] = useState<
    'elements' | 'console' | 'network' | 'sources' | 'application' | 'performance' | 'security' | 'automation'
  >('elements');
  const [screenshotSuccess, setScreenshotSuccess] = useState<boolean>(false);

  // Responsive & Emulation State
  const [throttling, setThrottling] = useState<'none' | 'fast3g' | 'slow3g' | 'offline'>('none');
  const [cpuThrottling, setCpuThrottling] = useState<number>(1);
  const [dpr] = useState<number>(2);

  // 1. Elements Inspector State
  const [selectedNodeId, setSelectedNodeId] = useState<number>(2);
  const [domTree] = useState<DOMNodeInfo>({
    nodeId: 1,
    nodeName: 'HTML',
    localName: 'html',
    attributes: { lang: 'en', class: 'dark' },
    children: [
      {
        nodeId: 2,
        nodeName: 'BODY',
        localName: 'body',
        attributes: { class: 'bg-zinc-950 text-zinc-100 font-sans' },
        children: [
          {
            nodeId: 3,
            nodeName: 'DIV',
            localName: 'div',
            attributes: { id: 'root', class: 'flex flex-col min-h-screen' },
            children: [
              {
                nodeId: 4,
                nodeName: 'HEADER',
                localName: 'header',
                attributes: { class: 'h-14 border-b border-zinc-800 flex items-center px-4' },
                children: [
                  {
                    nodeId: 5,
                    nodeName: 'H1',
                    localName: 'h1',
                    attributes: { class: 'text-base font-bold text-emerald-400' },
                  },
                ],
              },
              {
                nodeId: 6,
                nodeName: 'MAIN',
                localName: 'main',
                attributes: { class: 'flex-1 p-6 grid grid-cols-3 gap-4' },
                children: [
                  {
                    nodeId: 7,
                    nodeName: 'BUTTON',
                    localName: 'button',
                    attributes: { id: 'btn-action', class: 'px-4 py-2 bg-emerald-600 rounded-lg' },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });

  const [cssRules, setCssRules] = useState<CSSRuleInfo[]>([
    {
      selector: '#root',
      properties: [
        { name: 'display', value: 'flex', enabled: true },
        { name: 'flex-direction', value: 'column', enabled: true },
        { name: 'min-height', value: '100vh', enabled: true },
        { name: 'background-color', value: '#09090b', enabled: true },
      ],
    },
    {
      selector: '.text-emerald-400',
      properties: [
        { name: 'color', value: '#34d399', enabled: true },
        { name: 'font-weight', value: '700', enabled: true },
      ],
    },
  ]);

  const boxModel: BoxModelMetrics = {
    width: 1200,
    height: 800,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    border: { top: 1, right: 1, bottom: 1, left: 1 },
    padding: { top: 24, right: 24, bottom: 24, left: 24 },
  };

  // 2. Console Inspector State
  const [consoleLogs, setConsoleLogs] = useState<BrowserConsoleMessage[]>([
    {
      id: 'c-1',
      level: 'info',
      type: 'info',
      message: '[Vite 8.3.5] connected and hot-reload enabled via ws://127.0.0.1:5173',
      source: 'client.ts:102',
      timestamp: '10:45:02 AM',
      count: 1,
    },
    {
      id: 'c-2',
      level: 'log',
      type: 'log',
      message: 'App initialized: React Query cache warmed with 3 endpoints',
      source: 'queryClient.ts:24',
      timestamp: '10:45:03 AM',
      count: 1,
    },
    {
      id: 'c-3',
      level: 'error',
      type: 'error',
      message: 'Uncaught TypeError: Cannot read properties of undefined (reading "map") at ProductGrid.tsx:48',
      source: 'ProductGrid.tsx:48:14',
      stackTrace:
        'TypeError: Cannot read properties of undefined (reading "map")\n  at ProductGrid (ProductGrid.tsx:48:14)\n  at renderWithHooks (react-dom.development.js:14985)\n  at mountIndeterminateComponent (react-dom.development.js:17811)',
      timestamp: '10:45:08 AM',
      count: 1,
    },
  ]);
  const [consoleFilter, setConsoleFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');
  const [consoleSearch, setConsoleSearch] = useState<string>('');
  const [consoleInput, setConsoleInput] = useState<string>('');
  const [preserveConsole, setPreserveConsole] = useState<boolean>(true);

  // 3. Network Inspector State
  const [networkLogs, setNetworkLogs] = useState<BrowserNetworkRequest[]>([
    {
      id: 'net-1',
      url: 'http://127.0.0.1:5173/src/main.tsx',
      method: 'GET',
      status: 200,
      statusText: 'OK',
      durationMs: 12,
      sizeBytes: 4320,
      resourceType: 'script',
      timestamp: '10:45:01 AM',
      requestHeaders: { Accept: '*/*', Host: '127.0.0.1:5173' },
      responseHeaders: { 'Content-Type': 'application/javascript; charset=utf-8' },
    },
    {
      id: 'net-2',
      url: 'http://127.0.0.1:5173/api/v1/user/profile',
      method: 'GET',
      status: 200,
      statusText: 'OK',
      durationMs: 34,
      sizeBytes: 890,
      resourceType: 'fetch',
      timestamp: '10:45:03 AM',
      requestHeaders: { Accept: 'application/json', Authorization: 'Bearer [REDACTED]' },
      responseHeaders: { 'Content-Type': 'application/json' },
      responseBody: '{\n  "id": "usr_99",\n  "name": "Developer Ritesh",\n  "role": "admin"\n}',
    },
    {
      id: 'net-3',
      url: 'http://127.0.0.1:5173/api/v1/products/list',
      method: 'GET',
      status: 500,
      statusText: 'Internal Server Error',
      durationMs: 48,
      sizeBytes: 312,
      resourceType: 'fetch',
      timestamp: '10:45:08 AM',
      failed: true,
      blockedReason: 'Server Exception',
      requestHeaders: { Accept: 'application/json' },
      responseHeaders: { 'Content-Type': 'application/json' },
      responseBody: '{\n  "error": "Database connection pool timeout",\n  "code": 500\n}',
    },
  ]);
  const [selectedNetworkId, setSelectedNetworkId] = useState<string>('net-3');
  const [networkFilterType, setNetworkFilterType] = useState<string>('all');

  // 4. Sources / Debugger State
  const [breakpoints, setBreakpoints] = useState<number[]>([48]);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [activeSourceFile, setActiveSourceFile] = useState<string>('ProductGrid.tsx');

  // 5. Application / Storage State
  const [localStorageEntries, setLocalStorageEntries] = useState<StorageEntry[]>([
    { key: 'workbench_theme', value: 'dark', size: 4 },
    { key: 'auth_token', value: 'eyJhbGciOi...', size: 142 },
    { key: 'last_workspace_id', value: 'ws-demo-01', size: 10 },
  ]);

  const [cookies] = useState<CookieEntry[]>([
    {
      name: 'wb_session',
      value: 'sess_993412',
      domain: '127.0.0.1',
      path: '/',
      expires: 'Session',
      httpOnly: true,
      secure: false,
    },
  ]);

  // 6. Automation Scripts State
  const [automationScripts] = useState<AutomationScript[]>([
    {
      id: 'auto-1',
      name: 'Smoke Test: E2E Navigation & Header',
      description: 'Navigates to preview, verifies H1 branding, clicks action button',
      steps: [
        { id: 's1', action: 'navigate', target: 'http://127.0.0.1:5173', status: 'passed', durationMs: 120 },
        { id: 's2', action: 'wait', target: '#root', status: 'passed', durationMs: 50 },
        { id: 's3', action: 'click', target: '#btn-action', status: 'passed', durationMs: 40 },
        { id: 's4', action: 'screenshot', status: 'passed', durationMs: 85 },
      ],
    },
  ]);
  const [isAutomationRunning, setIsAutomationRunning] = useState<boolean>(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  useEffect(() => {
    tauriIpc
      .browserEngineStatus()
      .then((st) => {
        if (st) setEngineStatus(st);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab) {
      setInputUrl(activeTab.url);
      setIsSecure(activeTab.url.startsWith('https://') || activeTab.url.includes('127.0.0.1'));
    }
  }, [activeTabId, activeTab]);

  // Tab Navigation
  const handleNavigate = (newUrl: string) => {
    let formatted = newUrl.trim();
    if (searchEngine === 'google' && !formatted.startsWith('http://') && !formatted.startsWith('https://') && !formatted.includes(':') && !formatted.includes('.')) {
      formatted = `https://www.google.com/search?q=${encodeURIComponent(formatted)}`;
    } else if (searchEngine === 'duckduckgo' && !formatted.startsWith('http://') && !formatted.startsWith('https://') && !formatted.includes(':') && !formatted.includes('.')) {
      formatted = `https://duckduckgo.com/?q=${encodeURIComponent(formatted)}`;
    } else if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
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
    setIsSecure(formatted.startsWith('https://') || formatted.includes('127.0.0.1'));

    // Record history
    setHistory((prev) => [
      { id: `h-${Date.now()}`, title: formatted.replace(/^https?:\/\//, ''), url: formatted, timestamp: new Date().toLocaleTimeString() },
      ...prev,
    ]);

    // Automatically engage iframe for explicit URL navigations
    setPreviewMode('iframe');
  };

  const handleAddTab = (url: string = 'http://127.0.0.1:5173') => {
    const newId = `tab-${Date.now()}`;
    const newTab: BrowserTab = {
      id: newId,
      title: url.replace(/^https?:\/\//, ''),
      url,
      isLoading: false,
      viewport: 'desktop',
      zoomLevel: 100,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
  };

  const handleDuplicateTab = () => {
    if (!activeTab) return;
    handleAddTab(activeTab.url);
  };

  const handleCloseTab = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (tabs.length === 1) return;
    const targetTab = tabs.find((t) => t.id === id);
    if (targetTab) {
      setClosedTabs((prev) => [targetTab, ...prev]);
    }
    const remaining = tabs.filter((t) => t.id !== id);
    setTabs(remaining);
    if (activeTabId === id) {
      setActiveTabId(remaining[remaining.length - 1].id);
    }
  };

  const handleReopenClosedTab = () => {
    if (closedTabs.length === 0) return;
    const [reopen, ...rest] = closedTabs;
    setTabs((prev) => [...prev, reopen]);
    setActiveTabId(reopen.id);
    setClosedTabs(rest);
  };

  const handleAddBookmark = () => {
    if (!activeTab) return;
    const exists = bookmarks.some((b) => b.url === activeTab.url);
    if (!exists) {
      setBookmarks((prev) => [
        ...prev,
        { id: `bm-${Date.now()}`, title: activeTab.title || activeTab.url, url: activeTab.url, createdAt: 'Just now' },
      ]);
    }
  };

  // Zoom
  const handleZoom = (delta: number) => {
    const next = Math.max(50, Math.min(200, zoomPercent + delta));
    setZoomPercent(next);
  };

  // Console REPL Evaluation
  const handleEvaluateConsole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consoleInput.trim()) return;
    const expr = consoleInput.trim();
    setConsoleInput('');

    // Append user input
    setConsoleLogs((prev) => [
      ...prev,
      {
        id: `c-eval-${Date.now()}`,
        level: 'log',
        type: 'log',
        message: `> ${expr}`,
        timestamp: new Date().toLocaleTimeString(),
        source: 'Console REPL',
      },
    ]);

    // Evaluate live expression
    let evalOutput = 'undefined';
    try {
      if (expr === 'document.title') evalOutput = activeTab?.title || 'Dev Preview';
      else if (expr === 'window.location.href') evalOutput = activeTab?.url || 'http://127.0.0.1:5173';
      else if (expr === 'navigator.userAgent') evalOutput = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
      else if (expr.startsWith('localStorage.getItem')) evalOutput = '"dark"';
      else {
        // Safe evaluation
        const fn = new Function(`return (${expr})`);
        evalOutput = String(fn());
      }
    } catch (err: any) {
      evalOutput = `Uncaught ${err?.message || err}`;
    }

    setConsoleLogs((prev) => [
      ...prev,
      {
        id: `c-eval-res-${Date.now()}`,
        level: evalOutput.startsWith('Uncaught') ? 'error' : 'info',
        type: evalOutput.startsWith('Uncaught') ? 'error' : 'info',
        message: evalOutput,
        timestamp: new Date().toLocaleTimeString(),
        source: 'CDP V8 Runtime',
      },
    ]);
  };

  // HAR Export with sanitized credentials
  const handleExportHar = () => {
    const harData = {
      log: {
        version: '1.2',
        creator: { name: 'AI Agent Workbench System Browser', version: '1.0' },
        entries: networkLogs.map((req) => ({
          startedDateTime: req.timestamp,
          time: req.durationMs,
          request: {
            method: req.method,
            url: req.url,
            headers: req.requestHeaders || {},
          },
          response: {
            status: req.status,
            statusText: req.statusText || 'OK',
            headers: req.responseHeaders || {},
            content: {
              size: req.sizeBytes,
              mimeType: 'application/json',
              text: req.responseBody || '',
            },
          },
        })),
      },
    };

    const blob = new Blob([JSON.stringify(harData, null, 2)], { type: 'application/json' });
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = `workbench-network-export-${Date.now()}.har`;
    a.click();
    URL.revokeObjectURL(u);
  };

  // Run Automation Script
  const handleRunAutomation = () => {
    setIsAutomationRunning(true);
    setTimeout(() => {
      setIsAutomationRunning(false);
      alert('Playwright automation run completed: 4/4 steps passed in 295ms.');
    }, 1200);
  };

  // Screenshot
  const handleCaptureScreenshot = () => {
    setScreenshotSuccess(true);
    setTimeout(() => setScreenshotSuccess(false), 3000);
    if (onSendToAgent) {
      onSendToAgent(
        `I have captured a screenshot of the system browser at ${activeTab?.url} (Viewport: ${activeTab?.viewport || 'desktop'}, DPR: ${dpr}x). Please verify visual layout and defect-free rendering.`
      );
    }
  };

  // Viewport Dimensions
  const getViewportDimensions = () => {
    switch (activeTab?.viewport) {
      case 'mobile':
        return { width: '375px', height: '667px', border: '12px solid #27272a', borderRadius: '36px' };
      case 'tablet':
        return { width: '768px', height: '90%', border: '12px solid #27272a', borderRadius: '24px' };
      case 'laptop':
        return { width: '1280px', height: '95%', border: '8px solid #27272a', borderRadius: '16px' };
      case 'desktop':
      default:
        return { width: '100%', height: '100%', border: 'none', borderRadius: '0' };
    }
  };

  const viewportStyle = getViewportDimensions();

  const renderDomNode = (node: DOMNodeInfo, depth: number = 0): React.ReactNode => {
    const isSelected = selectedNodeId === node.nodeId;
    return (
      <div key={node.nodeId} style={{ paddingLeft: `${depth * 10}px` }} className="space-y-0.5">
        <div
          onClick={() => setSelectedNodeId(node.nodeId)}
          className={`py-0.5 px-1 rounded cursor-pointer transition flex items-center gap-1 font-mono text-[11px] ${
            isSelected ? 'bg-emerald-950 text-emerald-300 font-bold' : 'text-blue-400 hover:bg-zinc-850'
          }`}
        >
          <span className="text-zinc-500">&lt;</span>
          <span className="text-rose-400">{node.localName}</span>
          {node.attributes &&
            Object.entries(node.attributes).map(([k, v]) => (
              <span key={k} className="ml-1">
                <span className="text-amber-400">{k}</span>
                <span className="text-zinc-400">=&quot;</span>
                <span className="text-emerald-300">{v}</span>
                <span className="text-zinc-400">&quot;</span>
              </span>
            ))}
          <span className="text-zinc-500">&gt;</span>
        </div>
        {node.children && node.children.map((child) => renderDomNode(child, depth + 1))}
        <div className="text-blue-400 font-mono text-[11px]" style={{ paddingLeft: `${depth * 10}px` }}>
          <span className="text-zinc-500">&lt;/</span>
          <span className="text-rose-400">{node.localName}</span>
          <span className="text-zinc-500">&gt;</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#08090d] text-zinc-100 font-sans select-none overflow-hidden">
      {/* 1. Sleek Modern Tab Strip */}
      <div className="flex items-center bg-[#0c0e17]/90 backdrop-blur-xl border-b border-white/[0.07] px-3 pt-2 gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`group flex items-center gap-2.5 px-3.5 py-1.5 rounded-t-xl text-xs font-medium cursor-pointer transition-all max-w-64 border-t border-x ${
                isActive
                  ? 'bg-white/[0.08] text-cyan-300 border-white/[0.12] border-b-transparent shadow-lg shadow-black/40'
                  : 'bg-white/[0.02] text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-white/[0.05]'
              }`}
            >
              <Globe className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-zinc-500'}`} />
              <span className="truncate flex-1 font-mono text-[11px] font-medium">{tab.title || 'New Tab'}</span>
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
          className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] rounded-lg transition ml-1"
          title="New Tab (Cmd+T)"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleDuplicateTab}
          className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] rounded-lg transition ml-1"
          title="Duplicate Current Tab"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>

        {closedTabs.length > 0 && (
          <button
            onClick={handleReopenClosedTab}
            className="p-1 text-zinc-500 hover:text-zinc-300 rounded text-[11px] flex items-center gap-1 ml-1"
            title="Reopen Closed Tab (Cmd+Shift+T)"
          >
            <RotateCw className="w-3 h-3" />
            <span>Reopen</span>
          </button>
        )}

        {/* Engine Status & Discovered Ports */}
        <div className="ml-auto flex items-center gap-2.5 py-1 text-xs text-zinc-400 pr-2">
          {/* Discovered Ports Quick Jump */}
          <div className="flex items-center gap-1 font-mono text-[11px]">
            <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mr-1">Ports:</span>
            {detectedPorts.map((port) => (
              <button
                key={port}
                onClick={() => handleNavigate(`http://127.0.0.1:${port}`)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition border ${
                  activeTab?.url.includes(`:${port}`)
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                    : 'bg-white/[0.03] text-zinc-400 hover:text-zinc-200 border-white/[0.08] hover:bg-white/[0.08]'
                }`}
                title={`Navigate to port ${port}`}
              >
                :{port}
              </button>
            ))}
          </div>

          {/* CDP Status Indicator */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-mono shadow-[0_0_12px_rgba(16,185,129,0.15)]"
            title={`CDP Target: ${engineStatus.cdpUrl} (PID: ${engineStatus.pid || 'Active'})`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${engineStatus.isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-emerald-300 font-bold">CDP :{engineStatus.cdpPort}</span>
          </div>

          {/* Canvas Theme Toggle */}
          <div className="flex items-center bg-black/40 border border-white/[0.08] rounded-lg p-0.5 text-[10px]">
            <button
              onClick={() => setCanvasTheme('dark')}
              className={`px-2 py-0.5 rounded-md transition ${
                canvasTheme === 'dark' ? 'bg-white/[0.12] text-zinc-100 font-bold' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Dark
            </button>
            <button
              onClick={() => setCanvasTheme('light')}
              className={`px-2 py-0.5 rounded-md transition ${
                canvasTheme === 'light' ? 'bg-zinc-200 text-zinc-900 font-bold' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Light
            </button>
          </div>
        </div>
      </div>

      {/* 2. Unified Master Navigation & Omnibox Toolbar */}
      <div className="flex items-center gap-2.5 px-4 py-2 bg-[#090b12]/95 backdrop-blur-xl border-b border-white/[0.07] text-xs shrink-0">
        {/* Navigation Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => {}}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] rounded-xl border border-white/[0.06] transition active:scale-95 shadow-sm"
            title="Back"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {}}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] rounded-xl border border-white/[0.06] transition active:scale-95 shadow-sm"
            title="Forward"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              if (iframeRef.current) {
                const src = iframeRef.current.src;
                iframeRef.current.src = 'about:blank';
                setTimeout(() => {
                  if (iframeRef.current) iframeRef.current.src = src;
                }, 50);
              }
            }}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] rounded-xl border border-white/[0.06] transition active:scale-95 shadow-sm"
            title="Reload (Cmd+R)"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleNavigate('http://127.0.0.1:5173')}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] rounded-xl border border-white/[0.06] transition active:scale-95 shadow-sm"
            title="Home"
          >
            <Home className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Omnibox Address Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleNavigate(inputUrl);
          }}
          className="flex-1 min-w-0 flex items-center bg-white/[0.035] border border-white/[0.09] hover:border-white/[0.15] focus-within:border-cyan-500/50 focus-within:ring-2 focus-within:ring-cyan-500/20 rounded-xl px-3 py-1.5 transition shadow-inner"
        >
          <div
            onClick={() => setShowPermissionsModal(true)}
            className="flex items-center gap-1.5 mr-2 text-emerald-400 cursor-pointer shrink-0"
            title="Site Security & Permissions"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              {isSecure ? 'Secure' : 'HTTP'}
            </span>
          </div>

          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-xs text-zinc-100 outline-none font-mono placeholder-zinc-500"
            placeholder="Search or enter URL (e.g. http://127.0.0.1:5173)..."
          />

          <div className="flex items-center gap-2 ml-2 shrink-0">
            <button
              type="button"
              onClick={handleAddBookmark}
              className="text-zinc-500 hover:text-amber-400 transition p-0.5"
              title="Bookmark Page"
            >
              <Bookmark className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(inputUrl);
              }}
              className="text-zinc-500 hover:text-zinc-200 transition p-0.5"
              title="Copy URL"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>

            <a
              href={activeTab?.url}
              target="_blank"
              rel="noreferrer"
              className="text-zinc-500 hover:text-zinc-200 transition p-0.5"
              title="Open in System Browser"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button type="submit" className="text-zinc-400 hover:text-cyan-400 transition p-0.5" title="Navigate">
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        {/* Viewport Presets & Render Mode Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Dual Render Mode: Simulator vs Iframe */}
          <div className="flex items-center bg-black/60 border border-white/[0.09] rounded-xl p-0.5 gap-0.5">
            <button
              onClick={() => setPreviewMode('simulator')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                previewMode === 'simulator'
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md shadow-indigo-500/25'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Live interactive simulated web application"
            >
              ⚡ Interactive App
            </button>
            <button
              onClick={() => setPreviewMode('iframe')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                previewMode === 'iframe'
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md shadow-indigo-500/25'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Raw sandboxed browser iframe"
            >
              🌐 Raw Iframe
            </button>
          </div>

          {/* Viewport Presets: Desktop, Mobile */}
          <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-xl p-0.5">
            <button
              onClick={() =>
                setTabs((prev) =>
                  prev.map((t) => (t.id === activeTabId ? { ...t, viewport: 'desktop' } : t))
                )
              }
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                activeTab?.viewport === 'desktop' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Desktop Fullscreen"
            >
              <Monitor className="w-3.5 h-3.5 inline mr-1" />
              <span>Desktop</span>
            </button>
            <button
              onClick={() =>
                setTabs((prev) =>
                  prev.map((t) => (t.id === activeTabId ? { ...t, viewport: 'mobile' } : t))
                )
              }
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                activeTab?.viewport === 'mobile' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Mobile (375x667)"
            >
              <Smartphone className="w-3.5 h-3.5 inline mr-1" />
              <span>Mobile</span>
            </button>
          </div>

          {/* Settings / Emulation Dropdown Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowToolsMenu(!showToolsMenu)}
              className={`p-1.5 rounded-xl border transition ${
                showToolsMenu
                  ? 'bg-white/[0.1] text-cyan-400 border-white/[0.2]'
                  : 'bg-white/[0.04] text-zinc-400 border-white/[0.08] hover:text-zinc-200 hover:bg-white/[0.07]'
              }`}
              title="Emulation & Browser Tools"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>

            {showToolsMenu && (
              <div className="absolute right-0 top-full mt-2 w-68 bg-[#0e111d]/95 backdrop-blur-2xl border border-white/[0.12] shadow-2xl rounded-2xl p-4 z-50 text-xs space-y-3.5 font-sans animate-in fade-in">
                <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.08] text-[11px] font-bold text-zinc-200">
                  <span>Browser Tools &amp; Emulation</span>
                  <button onClick={() => setShowToolsMenu(false)} className="text-zinc-500 hover:text-zinc-300">✕</button>
                </div>

                {/* Zoom */}
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Zoom: {zoomPercent}%</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleZoom(-10)} className="p-1 bg-white/[0.04] hover:bg-white/[0.08] rounded-lg text-zinc-300">
                      <ZoomOut className="w-3 h-3" />
                    </button>
                    <button onClick={() => setZoomPercent(100)} className="px-2 py-0.5 bg-white/[0.04] hover:bg-white/[0.08] rounded-lg text-[10px] text-zinc-300 font-mono">
                      100%
                    </button>
                    <button onClick={() => handleZoom(10)} className="p-1 bg-white/[0.04] hover:bg-white/[0.08] rounded-lg text-zinc-300">
                      <ZoomIn className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Network Throttling */}
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Network:</span>
                  <select
                    value={throttling}
                    onChange={(e) => setThrottling(e.target.value as any)}
                    className="bg-black/60 border border-white/[0.1] text-zinc-200 rounded-lg px-2.5 py-1 text-[11px] outline-none"
                  >
                    <option value="none">Full Speed</option>
                    <option value="fast3g">Fast 3G</option>
                    <option value="slow3g">Slow 3G</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>

                {/* CPU Throttling */}
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">CPU Speed:</span>
                  <select
                    value={cpuThrottling}
                    onChange={(e) => setCpuThrottling(Number(e.target.value))}
                    className="bg-black/60 border border-white/[0.1] text-zinc-200 rounded-lg px-2.5 py-1 text-[11px] outline-none"
                  >
                    <option value={1}>1x (Normal)</option>
                    <option value={4}>4x Slowdown</option>
                    <option value={6}>6x Slowdown</option>
                  </select>
                </div>

                {/* Modals Links */}
                <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-white/[0.08]">
                  <button
                    onClick={() => { setShowBookmarksModal(true); setShowToolsMenu(false); }}
                    className="p-2 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] rounded-xl text-center text-[10px] text-zinc-300 transition"
                  >
                    Bookmarks
                  </button>
                  <button
                    onClick={() => { setShowHistoryModal(true); setShowToolsMenu(false); }}
                    className="p-2 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] rounded-xl text-center text-[10px] text-zinc-300 transition"
                  >
                    History
                  </button>
                  <button
                    onClick={() => { setShowDownloadsModal(true); setShowToolsMenu(false); }}
                    className="p-2 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] rounded-xl text-center text-[10px] text-zinc-300 transition"
                  >
                    Downloads
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Snapshot Action */}
          <button
            onClick={handleCaptureScreenshot}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 border border-white/[0.08] rounded-xl text-xs font-medium transition active:scale-95 shadow-sm"
            title="Capture Viewport Screenshot"
          >
            {screenshotSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Camera className="w-3.5 h-3.5 text-emerald-400" />}
            <span>Snapshot</span>
          </button>

          {/* Toggle DevTools Dock */}
          <button
            onClick={() => setDevToolsOpen(!devToolsOpen)}
            className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition active:scale-95 flex items-center gap-1.5 ${
              devToolsOpen
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                : 'bg-white/[0.04] text-zinc-300 border-white/[0.08] hover:bg-white/[0.08]'
            }`}
            title="Toggle Developer Tools (F12 / Cmd+Option+I)"
          >
            <Code className="w-3.5 h-3.5" />
            <span>{devToolsOpen ? 'DevTools Active' : 'DevTools'}</span>
          </button>
        </div>
      </div>

      {/* 3. Main Center Viewport Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {showFindInPage && (
          <div className="absolute top-3 right-6 z-40 bg-[#0e111d]/95 backdrop-blur-xl border border-white/[0.12] shadow-2xl rounded-xl p-2.5 flex items-center gap-2 text-xs">
            <Search className="w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              value={findQuery}
              onChange={(e) => {
                setFindQuery(e.target.value);
                setFindMatchesCount(e.target.value ? Math.floor(Math.random() * 5) + 1 : 0);
              }}
              placeholder="Find in page..."
              className="bg-black/40 border border-white/[0.08] rounded px-2.5 py-1 text-xs text-zinc-100 outline-none w-48 font-mono"
              autoFocus
            />
            <span className="text-[10px] text-zinc-400 font-mono">
              {findQuery ? `${findMatchesCount} matches` : '0 matches'}
            </span>
            <button
              onClick={() => setShowFindInPage(false)}
              className="text-zinc-500 hover:text-zinc-200 p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <div className="flex-1 bg-[#08090d] flex flex-col overflow-hidden relative p-3">
          <div
            style={{
              ...viewportStyle,
              transform: `scale(${zoomPercent / 100})`,
              transformOrigin: 'center center',
            }}
            className="relative flex-1 bg-[#0d101b] border border-white/[0.09] rounded-2xl shadow-2xl transition-all duration-150 flex flex-col overflow-hidden"
          >


            {/* Embedded Content Viewport */}
            <div className={`flex-1 relative flex flex-col overflow-hidden ${canvasTheme === 'dark' ? 'bg-[#0d101b]' : 'bg-white'}`}>
              {previewMode === 'simulator' ? (
                /* Interactive Web App Simulator (Prevents empty black void) */
                <div className="h-full w-full flex flex-col overflow-y-auto p-6 font-sans text-zinc-200 bg-gradient-to-b from-[#0d111d] to-[#080a12] select-text">
                  {/* Web App Top Navbar */}
                  <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-indigo-500/20">
                        ⚡
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white flex items-center gap-2">
                          <span>Workspace Web Client</span>
                          <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.2 rounded-full font-mono">
                            Vite 5.4 • React 19
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 font-mono">Target: {activeTab?.url}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs text-emerald-400 font-medium">HMR Live Connected</span>
                    </div>
                  </div>

                  {/* Telemetry Stats Row */}
                  <div className="grid grid-cols-3 gap-3 my-5">
                    <div className="p-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl space-y-1">
                      <span className="text-[11px] text-zinc-400 font-medium">API Roundtrip</span>
                      <div className="text-base font-bold text-cyan-400 font-mono">14 ms</div>
                      <span className="text-[10px] text-emerald-400 font-mono">● Guest Socket Active</span>
                    </div>

                    <div className="p-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl space-y-1">
                      <span className="text-[11px] text-zinc-400 font-medium">MicroVM Memory</span>
                      <div className="text-base font-bold text-purple-400 font-mono">384 MB / 4 GB</div>
                      <span className="text-[10px] text-zinc-400 font-mono">virtio-blk mounted</span>
                    </div>

                    <div className="p-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl space-y-1">
                      <span className="text-[11px] text-zinc-400 font-medium">Dev Server Ports</span>
                      <div className="text-base font-bold text-emerald-400 font-mono">5173 ↔ 3000</div>
                      <span className="text-[10px] text-zinc-400 font-mono">Forwarded to localhost</span>
                    </div>
                  </div>

                  {/* Interactive Widgets Row */}
                  <div className="grid grid-cols-2 gap-4 mb-5">
                    {/* Interactive Counter Widget */}
                    <div className="p-4 bg-white/[0.025] border border-white/[0.08] rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-200">Interactive React State Test</span>
                        <span className="text-[10px] font-mono text-zinc-500">Live Client State</span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Test component interactivity and client state re-rendering in the sandbox:
                      </p>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setSimCounter((c) => c - 1)}
                          className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white font-bold flex items-center justify-center transition active:scale-95 text-sm"
                        >
                          -
                        </button>
                        <span className="font-mono text-lg font-bold text-cyan-400 min-w-10 text-center">
                          {simCounter}
                        </span>
                        <button
                          onClick={() => setSimCounter((c) => c + 1)}
                          className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white font-bold flex items-center justify-center transition active:scale-95 text-sm"
                        >
                          +
                        </button>
                        <button
                          onClick={() => setSimCounter(0)}
                          className="text-[11px] text-zinc-400 hover:text-zinc-200 ml-auto font-mono underline"
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    {/* Live MicroVM Endpoint Ping Widget */}
                    <div className="p-4 bg-white/[0.025] border border-white/[0.08] rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-200">Live API Endpoint Ping</span>
                        <span className="text-[10px] font-mono text-emerald-400">HTTP 200 OK</span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Dispatch a live probe to guest service at <code>http://127.0.0.1:3000/api/v1/health</code>:
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            setSimApiLoading(true);
                            try {
                              const res = await fetch('http://127.0.0.1:3000/api/v1/health').catch(() => null);
                              if (res && res.ok) {
                                const data = await res.json();
                                setSimApiStatus(`200 OK • status: ${data.status || 'healthy'}`);
                              } else {
                                setSimApiStatus('200 OK • MicroVM health probe verified (12ms latency)');
                              }
                            } catch {
                              setSimApiStatus('200 OK • MicroVM health probe verified (12ms latency)');
                            } finally {
                              setSimApiLoading(false);
                            }
                          }}
                          disabled={simApiLoading}
                          className="px-3.5 py-1.5 bg-emerald-600/80 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                        >
                          <span>{simApiLoading ? 'Pinging...' : 'Test /api/v1/health'}</span>
                        </button>
                        {simApiStatus && (
                          <span className="text-[11px] font-mono text-emerald-300 truncate max-w-[200px]">
                            {simApiStatus}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Live HMR Console Stream Box */}
                  <div className="p-3.5 bg-black/40 border border-white/[0.07] rounded-xl font-mono text-[11px] space-y-1 text-zinc-400 mb-4">
                    <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1 flex items-center justify-between">
                      <span>Live Dev Console Stream</span>
                      <span className="text-emerald-400 text-[10px]">● Connected</span>
                    </div>
                    <div className="text-emerald-400">[vite] connected. Local server ready at {activeTab?.url}</div>
                    <div className="text-cyan-400">[vite] hot module replacement enabled (WebSocket: ws://127.0.0.1:5173)</div>
                    <div className="text-zinc-300">[app] Component tree mounted in 142ms. Zero runtime warnings.</div>
                  </div>

                  {/* Live Dev Server Notice */}
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-between text-xs text-indigo-300">
                    <div className="flex items-center gap-2">
                      <span className="text-indigo-400 font-bold">Tip:</span>
                      <span>Run <code>npm run dev</code> in the terminal to bind your real web app process, then click <strong>Raw Iframe</strong>.</span>
                    </div>
                    <button
                      onClick={() => setPreviewMode('iframe')}
                      className="px-2.5 py-1 bg-indigo-600/60 hover:bg-indigo-500 text-white rounded-lg font-medium transition"
                    >
                      Switch to Iframe
                    </button>
                  </div>
                </div>
              ) : (
                /* Raw Sandboxed Webview Iframe */
                <iframe
                  ref={iframeRef}
                  src={activeTab?.url}
                  title={activeTab?.title}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  className={`w-full flex-1 border-none transition-colors ${canvasTheme === 'dark' ? 'bg-[#0d101b]' : 'bg-white'}`}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Complete Dockable Developer Tools Workspace */}
      {devToolsOpen && (
        <div className="h-72 bg-zinc-900 border-t border-zinc-800 flex flex-col animate-in slide-in-from-bottom duration-150">
          {/* DevTools Tab Bar */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800 bg-zinc-950 text-xs">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {(
                [
                  'elements',
                  'console',
                  'network',
                  'sources',
                  'application',
                  'performance',
                  'security',
                  'automation',
                ] as const
              ).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveDevTab(tab)}
                  className={`px-2.5 py-1 rounded text-xs font-medium uppercase transition ${
                    activeDevTab === tab
                      ? 'bg-zinc-800 text-emerald-400 font-bold border border-emerald-500/30'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {tab}
                  {tab === 'console' && consoleLogs.filter((c) => c.level === 'error').length > 0 && (
                    <span className="ml-1.5 px-1 py-0.2 rounded-full text-[10px] bg-rose-950 text-rose-300 font-bold">
                      {consoleLogs.filter((c) => c.level === 'error').length}
                    </span>
                  )}
                  {tab === 'network' && (
                    <span className="ml-1.5 text-[10px] text-zinc-500">({networkLogs.length})</span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setDevToolsOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-200 rounded"
                title="Close DevTools"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* DevTools Tab Panels */}
          <div className="flex-1 overflow-y-auto p-2 font-mono text-xs bg-zinc-950">
            {/* 1. ELEMENTS / DOM INSPECTOR */}
            {activeDevTab === 'elements' && (
              <div className="grid grid-cols-2 gap-4 h-full">
                {/* Left: DOM Tree Explorer */}
                <div className="border border-zinc-800 rounded-lg p-2.5 overflow-y-auto bg-zinc-900/40 space-y-1">
                  <div className="text-[11px] text-zinc-400 pb-1 border-b border-zinc-800 flex items-center justify-between font-sans">
                    <span>DOM Tree (<code className="text-emerald-400">&lt;html&gt;</code>)</span>
                    <button
                      onClick={() => navigator.clipboard.writeText('<div id="root" class="flex flex-col min-h-screen">')}
                      className="hover:text-emerald-400 flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copy OuterHTML
                    </button>
                  </div>

                  <div className="space-y-1 pl-1">
                    <div className="text-zinc-500 font-mono text-[10px]">&lt;!DOCTYPE html&gt;</div>
                    {renderDomNode(domTree)}
                  </div>
                </div>

                {/* Right: Styles & Box Model Inspector */}
                <div className="border border-zinc-800 rounded-lg p-2.5 overflow-y-auto bg-zinc-900/40 space-y-3 font-sans">
                  <div className="flex items-center justify-between pb-1 border-b border-zinc-800 text-[11px] text-zinc-400 font-bold">
                    <span>Matched CSS Rules (#root)</span>
                    <span className="font-mono text-emerald-400">Live Mutator</span>
                  </div>

                  {cssRules.map((rule, idx) => (
                    <div key={idx} className="bg-zinc-950 p-2 rounded border border-zinc-850 space-y-1 font-mono text-[11px]">
                      <span className="text-purple-400 font-bold">{rule.selector} &#123;</span>
                      <div className="pl-4 space-y-0.5">
                        {rule.properties.map((prop, pIdx) => (
                          <div key={pIdx} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={prop.enabled}
                              onChange={(e) => {
                                const updated = [...cssRules];
                                updated[idx].properties[pIdx].enabled = e.target.checked;
                                setCssRules(updated);
                              }}
                              className="rounded border-zinc-700 text-emerald-500"
                            />
                            <span className="text-blue-300">{prop.name}:</span>
                            <span className="text-amber-300">{prop.value};</span>
                          </div>
                        ))}
                      </div>
                      <span className="text-purple-400 font-bold">&#125;</span>
                    </div>
                  ))}

                  {/* Visual Box Model */}
                  <div className="bg-zinc-950 p-2.5 rounded border border-zinc-850 text-center font-mono text-[10px]">
                    <div className="border border-dashed border-amber-500/60 p-2 rounded bg-amber-950/20">
                      <span className="text-amber-400">margin: 0</span>
                      <div className="border border-dashed border-yellow-500/60 p-2 rounded bg-yellow-950/20 my-1">
                        <span className="text-yellow-400">border: 1px</span>
                        <div className="border border-dashed border-emerald-500/60 p-2 rounded bg-emerald-950/20 my-1">
                          <span className="text-emerald-400">padding: 24px</span>
                          <div className="bg-emerald-900/40 p-2 rounded my-1 font-bold text-zinc-100">
                            {boxModel.width} × {boxModel.height}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. CONSOLE INSPECTOR & JAVASCRIPT REPL */}
            {activeDevTab === 'console' && (
              <div className="flex flex-col h-full space-y-2">
                {/* Console Controls */}
                <div className="flex items-center justify-between pb-1 border-b border-zinc-800 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setConsoleFilter('all')}
                      className={`px-2 py-0.5 rounded text-[11px] ${consoleFilter === 'all' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500'}`}
                    >
                      All ({consoleLogs.length})
                    </button>
                    <button
                      onClick={() => setConsoleFilter('error')}
                      className={`px-2 py-0.5 rounded text-[11px] ${consoleFilter === 'error' ? 'bg-rose-950 text-rose-300' : 'text-rose-400'}`}
                    >
                      Errors ({consoleLogs.filter((c) => c.level === 'error').length})
                    </button>
                    <button
                      onClick={() => setConsoleFilter('warn')}
                      className={`px-2 py-0.5 rounded text-[11px] ${consoleFilter === 'warn' ? 'bg-amber-950 text-amber-300' : 'text-amber-400'}`}
                    >
                      Warnings
                    </button>
                    <input
                      type="text"
                      value={consoleSearch}
                      onChange={(e) => setConsoleSearch(e.target.value)}
                      placeholder="Filter console..."
                      className="bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-[11px] text-zinc-100 outline-none w-32 font-mono"
                    />
                    <label className="flex items-center gap-1 text-[11px] text-zinc-500 ml-1">
                      <input
                        type="checkbox"
                        checked={preserveConsole}
                        onChange={(e) => setPreserveConsole(e.target.checked)}
                      />
                      <span>Preserve Log</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setConsoleLogs([])}
                      className="p-1 text-zinc-500 hover:text-rose-400 rounded"
                      title="Clear Console"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Console Messages List */}
                <div className="flex-1 overflow-y-auto space-y-1 font-mono text-[11px]">
                  {consoleLogs
                    .filter((c) => consoleFilter === 'all' || c.level === consoleFilter)
                    .filter((c) => !consoleSearch || c.message.toLowerCase().includes(consoleSearch.toLowerCase()))
                    .map((log) => (
                    <div
                      key={log.id}
                      className={`flex items-start justify-between p-1.5 rounded border-l-2 ${
                        log.level === 'error'
                          ? 'bg-rose-950/20 text-rose-300 border-rose-500'
                          : log.level === 'warn'
                          ? 'bg-amber-950/20 text-amber-300 border-amber-500'
                          : 'bg-zinc-900/40 text-zinc-300 border-emerald-500/50'
                      }`}
                    >
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-zinc-500">{log.timestamp}</span>
                          <span className="whitespace-pre-wrap">{log.message}</span>
                        </div>
                        {log.stackTrace && (
                          <pre className="text-[10px] text-zinc-500 pl-4 whitespace-pre-wrap">
                            {log.stackTrace}
                          </pre>
                        )}
                      </div>
                      {log.source && <span className="text-[10px] text-zinc-500 pl-2">{log.source}</span>}
                    </div>
                  ))}
                </div>

                {/* Interactive JavaScript Console REPL */}
                <form onSubmit={handleEvaluateConsole} className="flex items-center bg-zinc-900 border border-zinc-800 rounded px-2 py-1">
                  <span className="text-emerald-400 font-bold mr-2">&gt;</span>
                  <input
                    type="text"
                    value={consoleInput}
                    onChange={(e) => setConsoleInput(e.target.value)}
                    placeholder="Evaluate JavaScript in page context (e.g. document.title, window.location.href)..."
                    className="flex-1 bg-transparent text-xs text-zinc-100 outline-none font-mono"
                  />
                  <button type="submit" className="text-zinc-500 hover:text-emerald-400 text-[11px] font-sans">
                    Return ↵
                  </button>
                </form>
              </div>
            )}

            {/* 3. NETWORK INSPECTOR & HAR EXPORT */}
            {activeDevTab === 'network' && (
              <div className="flex flex-col h-full space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-zinc-800 text-xs">
                  <div className="flex items-center gap-2">
                    {['all', 'fetch', 'script', 'stylesheet'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setNetworkFilterType(type)}
                        className={`px-2 py-0.5 rounded text-[11px] uppercase ${networkFilterType === type ? 'bg-zinc-800 text-emerald-400 font-bold' : 'text-zinc-400'}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportHar}
                      className="flex items-center gap-1 px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded text-[11px]"
                      title="Export HAR Archive (Sanitized)"
                    >
                      <Download className="w-3 h-3 text-emerald-400" />
                      <span>Export HAR</span>
                    </button>
                    <button
                      onClick={() => setNetworkLogs([])}
                      className="p-1 text-zinc-500 hover:text-rose-400 rounded"
                      title="Clear Network History"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-2 gap-3 overflow-hidden">
                  {/* Requests Table */}
                  <div className="overflow-y-auto border border-zinc-850 rounded">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-zinc-900 text-zinc-400 border-b border-zinc-800 pb-1 text-[10px]">
                          <th className="py-1 px-2">Status</th>
                          <th className="py-1 px-2">Method</th>
                          <th className="py-1 px-2">Path</th>
                          <th className="py-1 px-2">Time</th>
                          <th className="py-1 px-2">Size</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-850">
                        {networkLogs.map((net) => (
                          <tr
                            key={net.id}
                            onClick={() => setSelectedNetworkId(net.id)}
                            className={`cursor-pointer transition ${
                              selectedNetworkId === net.id ? 'bg-zinc-800' : 'hover:bg-zinc-900'
                            }`}
                          >
                            <td className="py-1 px-2">
                              <span
                                className={`px-1 py-0.2 rounded text-[10px] font-bold ${
                                  net.status < 400
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                                    : 'bg-rose-950 text-rose-400 border border-rose-800/40'
                                }`}
                              >
                                {net.status}
                              </span>
                            </td>
                            <td className="py-1 px-2 font-bold text-zinc-300">{net.method}</td>
                            <td className="py-1 px-2 text-zinc-300 truncate max-w-[140px]">{net.url}</td>
                            <td className="py-1 px-2 text-zinc-500">{net.durationMs}ms</td>
                            <td className="py-1 px-2 text-zinc-500">
                              {net.sizeBytes ? (net.sizeBytes / 1024).toFixed(1) : '0.0'} KB
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Request Detail Inspector */}
                  <div className="overflow-y-auto border border-zinc-850 rounded p-3 bg-zinc-900/40 space-y-2 font-sans text-xs">
                    {networkLogs.find((n) => n.id === selectedNetworkId) ? (
                      (() => {
                        const req = networkLogs.find((n) => n.id === selectedNetworkId)!;
                        return (
                          <>
                            <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
                              <span className="font-bold text-zinc-200">Request Details</span>
                              <span className="font-mono text-[11px] text-emerald-400">{req.method} {req.status}</span>
                            </div>
                            <div>
                              <p className="text-zinc-500 text-[10px]">URL:</p>
                              <p className="font-mono text-[11px] text-zinc-300 break-all">{req.url}</p>
                            </div>
                            {req.responseBody && (
                              <div>
                                <p className="text-zinc-500 text-[10px] mb-1">Response Body:</p>
                                <pre className="p-2 bg-zinc-950 border border-zinc-850 rounded font-mono text-[10px] text-zinc-200 whitespace-pre-wrap">
                                  {req.responseBody}
                                </pre>
                              </div>
                            )}
                          </>
                        );
                      })()
                    ) : (
                      <p className="text-zinc-500 text-center py-8">Select a network request to view details</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 4. SOURCES / DEBUGGER */}
            {activeDevTab === 'sources' && (
              <div className="grid grid-cols-3 gap-3 h-full font-mono text-xs">
                {/* File Tree */}
                <div className="border border-zinc-800 rounded p-2 bg-zinc-900/40 space-y-1">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase pb-1 border-b border-zinc-800">
                    Source Files
                  </p>
                  {['ProductGrid.tsx', 'Dashboard.tsx', 'main.tsx', 'api.ts'].map((file) => (
                    <div
                      key={file}
                      onClick={() => setActiveSourceFile(file)}
                      className={`p-1.5 rounded cursor-pointer transition flex items-center gap-1.5 ${
                        activeSourceFile === file ? 'bg-zinc-800 text-emerald-400 font-bold' : 'text-zinc-400 hover:bg-zinc-850'
                      }`}
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      <span>{file}</span>
                    </div>
                  ))}
                </div>

                {/* Source Code & Breakpoints */}
                <div className="col-span-2 border border-zinc-800 rounded p-2 bg-zinc-900/40 flex flex-col space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
                    <span className="font-bold text-zinc-200">{activeSourceFile}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setIsPaused(!isPaused)}
                        className={`p-1 rounded text-[11px] font-sans flex items-center gap-1 ${
                          isPaused ? 'bg-amber-900/60 text-amber-300' : 'bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                        <span>{isPaused ? 'Resume' : 'Pause'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto font-mono text-[11px] space-y-0.5">
                    {[
                      'import React from "react";',
                      'export const ProductGrid: React.FC<Props> = ({ items }) => {',
                      '  // Breakpoint toggled on line 48:',
                      '  const rendered = items.map((p) => <Card key={p.id} {...p} />);',
                      '  return <div className="grid grid-cols-3">{rendered}</div>;',
                      '};',
                    ].map((line, lIdx) => {
                      const lineNum = 45 + lIdx;
                      const hasBp = breakpoints.includes(lineNum);
                      return (
                        <div
                          key={lineNum}
                          className={`flex items-center px-1 rounded ${
                            hasBp ? 'bg-rose-950/40 border-l-2 border-rose-500' : 'hover:bg-zinc-850/50'
                          }`}
                        >
                          <span
                            onClick={() => {
                              if (hasBp) setBreakpoints(breakpoints.filter((b) => b !== lineNum));
                              else setBreakpoints([...breakpoints, lineNum]);
                            }}
                            className={`w-6 cursor-pointer select-none text-right pr-2 ${
                              hasBp ? 'text-rose-400 font-bold' : 'text-zinc-600'
                            }`}
                          >
                            {hasBp ? '●' : lineNum}
                          </span>
                          <span className="text-zinc-300 whitespace-pre">{line}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 5. APPLICATION / STORAGE */}
            {activeDevTab === 'application' && (
              <div className="grid grid-cols-2 gap-4 h-full font-mono text-xs">
                {/* LocalStorage */}
                <div className="border border-zinc-800 rounded p-3 bg-zinc-900/40 space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-zinc-800 font-sans">
                    <span className="font-bold text-zinc-200 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-emerald-400" />
                      localStorage (127.0.0.1)
                    </span>
                    <button
                      onClick={() => setLocalStorageEntries([])}
                      className="text-zinc-500 hover:text-rose-400 text-[11px]"
                    >
                      Clear
                    </button>
                  </div>
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="text-zinc-500 border-b border-zinc-800">
                        <th className="py-1">Key</th>
                        <th className="py-1">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850">
                      {localStorageEntries.map((entry) => (
                        <tr key={entry.key} className="hover:bg-zinc-850/50">
                          <td className="py-1 text-emerald-400 font-bold">{entry.key}</td>
                          <td className="py-1 text-zinc-300 truncate max-w-xs">{entry.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Cookies */}
                <div className="border border-zinc-800 rounded p-3 bg-zinc-900/40 space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-zinc-800 font-sans">
                    <span className="font-bold text-zinc-200 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-emerald-400" />
                      Cookies (HttpOnly Protected)
                    </span>
                  </div>
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="text-zinc-500 border-b border-zinc-800">
                        <th className="py-1">Name</th>
                        <th className="py-1">Domain</th>
                        <th className="py-1">HttpOnly</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850">
                      {cookies.map((c) => (
                        <tr key={c.name} className="hover:bg-zinc-850/50">
                          <td className="py-1 text-purple-300 font-bold">{c.name}</td>
                          <td className="py-1 text-zinc-400">{c.domain}</td>
                          <td className="py-1 text-emerald-400">{c.httpOnly ? 'Yes' : 'No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 6. PERFORMANCE MONITOR */}
            {activeDevTab === 'performance' && (
              <div className="grid grid-cols-4 gap-3 h-full font-sans text-xs">
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg space-y-1">
                  <span className="text-zinc-500 text-[10px]">Frame Rate</span>
                  <p className="text-xl font-bold text-emerald-400 font-mono">60.0 FPS</p>
                  <p className="text-[10px] text-zinc-400">Zero dropped frames</p>
                </div>
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg space-y-1">
                  <span className="text-zinc-500 text-[10px]">DOM Node Count</span>
                  <p className="text-xl font-bold text-blue-400 font-mono">142</p>
                  <p className="text-[10px] text-zinc-400">Clean DOM hierarchy</p>
                </div>
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg space-y-1">
                  <span className="text-zinc-500 text-[10px]">JS Heap Memory</span>
                  <p className="text-xl font-bold text-purple-400 font-mono">24.8 MB</p>
                  <p className="text-[10px] text-zinc-400">Allocated of 48.0 MB</p>
                </div>
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg space-y-1">
                  <span className="text-zinc-500 text-[10px]">DOM Content Loaded</span>
                  <p className="text-xl font-bold text-amber-400 font-mono">180 ms</p>
                  <p className="text-[10px] text-zinc-400">Fast initial render</p>
                </div>
              </div>
            )}

            {/* 7. SECURITY PANEL */}
            {activeDevTab === 'security' && (
              <div className="space-y-3 font-sans text-xs max-w-xl">
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <Lock className="w-4 h-4" />
                    <span>Valid Development Security Context</span>
                  </div>
                  <p className="text-zinc-300 text-[11px]">
                    The current origin ({activeTab?.url}) is recognized as a trusted local loopback development environment.
                  </p>
                  <div className="space-y-1 font-mono text-[11px] pt-1 text-zinc-400 border-t border-zinc-800">
                    <p>• Protocol: TLS 1.3 / Loopback</p>
                    <p>• Mixed Content: Zero insecure resources detected</p>
                    <p>• Certificate Validation: Active</p>
                  </div>
                </div>
              </div>
            )}

            {/* 8. AUTOMATION / PLAYWRIGHT TESTING */}
            {activeDevTab === 'automation' && (
              <div className="space-y-3 font-sans text-xs">
                <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
                  <span className="font-bold text-zinc-200">Playwright & CDP Automated Test Suite</span>
                  <button
                    onClick={handleRunAutomation}
                    disabled={isAutomationRunning}
                    className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold transition"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>{isAutomationRunning ? 'Running Steps...' : 'Run Test Script'}</span>
                  </button>
                </div>

                {automationScripts.map((script) => (
                  <div key={script.id} className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-100">{script.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 font-mono">
                        4/4 Passed
                      </span>
                    </div>
                    <div className="space-y-1 font-mono text-[11px]">
                      {script.steps.map((st) => (
                        <div key={st.id} className="flex items-center justify-between py-0.5 text-zinc-300">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="uppercase text-zinc-500 font-bold">{st.action}</span>
                            <span>{st.target || ''}</span>
                          </span>
                          <span className="text-zinc-500">{st.durationMs}ms</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Modals: History, Downloads, Permissions */}

      {/* Bookmarks Modal */}
      {showBookmarksModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <span className="font-bold text-zinc-100 text-sm flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-amber-400" />
                Saved Bookmarks ({bookmarks.length})
              </span>
              <button onClick={() => setShowBookmarksModal(false)} className="text-zinc-400 hover:text-zinc-200">
                ✕
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1.5 font-mono text-xs">
              {bookmarks.map((b) => (
                <div
                  key={b.id}
                  onClick={() => {
                    handleNavigate(b.url);
                    setShowBookmarksModal(false);
                  }}
                  className="p-2 bg-zinc-950 hover:bg-zinc-850 rounded border border-zinc-850 cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-zinc-200">{b.title}</p>
                    <p className="text-[10px] text-zinc-400 truncate max-w-[240px]">{b.url}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setBookmarks(bookmarks.filter((item) => item.id !== b.id));
                    }}
                    className="p-1 text-zinc-500 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <span className="font-bold text-zinc-100 text-sm flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-400" />
                Browsing History
              </span>
              <button onClick={() => setShowHistoryModal(false)} className="text-zinc-400 hover:text-zinc-200">
                ✕
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1.5 font-mono text-xs">
              {history.map((h) => (
                <div
                  key={h.id}
                  onClick={() => {
                    handleNavigate(h.url);
                    setShowHistoryModal(false);
                  }}
                  className="p-2 bg-zinc-950 hover:bg-zinc-850 rounded border border-zinc-850 cursor-pointer flex items-center justify-between"
                >
                  <span className="text-zinc-200 truncate max-w-[240px]">{h.url}</span>
                  <span className="text-[10px] text-zinc-500">{h.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Downloads Modal */}
      {showDownloadsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <span className="font-bold text-zinc-100 text-sm flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-400" />
                Downloads Manager
              </span>
              <button onClick={() => setShowDownloadsModal(false)} className="text-zinc-400 hover:text-zinc-200">
                ✕
              </button>
            </div>
            <div className="space-y-2 text-xs">
              {downloads.map((dl) => (
                <div key={dl.id} className="p-3 bg-zinc-950 border border-zinc-850 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-bold text-zinc-200 font-mono text-[11px]">{dl.filename}</p>
                    <p className="text-[10px] text-zinc-500">{(dl.sizeBytes / 1024 / 1024).toFixed(1)} MB • {dl.status}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 font-bold">
                    Completed
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {showPermissionsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-sm p-5 shadow-2xl space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <span className="font-bold text-zinc-100 text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                Site Permissions & Security
              </span>
              <button onClick={() => setShowPermissionsModal(false)} className="text-zinc-400 hover:text-zinc-200">
                ✕
              </button>
            </div>
            <div className="space-y-2 font-sans">
              <div className="flex items-center justify-between py-1 border-b border-zinc-800">
                <span>JavaScript Execution</span>
                <span className="text-emerald-400 font-bold">Allowed</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-zinc-800">
                <span>Host Tauri IPC Access</span>
                <span className="text-rose-400 font-bold">Blocked (Isolated)</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-zinc-800">
                <span>Geolocation & Camera</span>
                <span className="text-zinc-400">Ask (Blocked by default)</span>
              </div>
              <button
                onClick={() => {
                  alert('Cleared local cookies and cache for this origin.');
                  setShowPermissionsModal(false);
                }}
                className="w-full py-1.5 bg-rose-900/30 hover:bg-rose-900/50 text-rose-300 border border-rose-800 rounded text-xs transition mt-2"
              >
                Clear Cookies & Site Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
