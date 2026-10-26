import React, { useState, useEffect } from 'react';
import {
  Send,
  FolderOpen,
  Plus,
  Trash2,
  Copy,
  Check,
  Code,
  Play,
  Upload,
  Download,
  AlertTriangle,
  Search,
  Eye,
  EyeOff,
  Settings,
  Save,
  CheckCircle2,
  Globe,
  Columns,
  Rows,
} from 'lucide-react';
import {
  HttpMethod,
  ApiRequestBodyType,
  KeyValuePair,
  ApiRequestConfig,
  ApiResponseData,
  ApiEnvironment,
  ApiCollection,
  ApiHistoryItem,
  ApiRunnerReport,
} from '../../types';
import { tauriIpc } from '../../services/tauriIpc';
import { runPreRequestScript, runPostResponseTests } from './scriptEngine';
import { generateCodeSnippet, CodeLanguage } from './codeGenerators';
import { importPostmanCollection, exportPostmanCollection, importOpenApiSpec } from './importers';

interface ApiStudioProps {}

export const ApiStudio: React.FC<ApiStudioProps> = () => {
  // Navigation Tabs in Sidebar: 'collections' | 'history' | 'environments' | 'specs'
  const [sidebarTab, setSidebarTab] = useState<'collections' | 'history' | 'environments' | 'specs'>('collections');
  const [layoutMode, setLayoutMode] = useState<'stacked' | 'split'>('stacked');

  // Request State
  const [requestId, setRequestId] = useState<string>('req-current');
  const [requestName, setRequestName] = useState<string>('Health Check');
  const [requestDescription, setRequestDescription] = useState<string>('System health check endpoint');
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [customMethod, setCustomMethod] = useState<string>('');
  const [url, setUrl] = useState<string>('{{baseUrl}}/api/v1/health');

  // Request Tabs: 'params' | 'auth' | 'headers' | 'body' | 'scripts' | 'tests' | 'settings'
  const [activeRequestTab, setActiveRequestTab] = useState<
    'params' | 'auth' | 'headers' | 'body' | 'scripts' | 'tests' | 'settings'
  >('params');

  const [params, setParams] = useState<KeyValuePair[]>([
    { key: 'limit', value: '10', enabled: true, description: 'Max items to return' },
    { key: 'sort', value: 'desc', enabled: false, description: 'Sorting order' },
  ]);

  const [headers, setHeaders] = useState<KeyValuePair[]>([
    { key: 'Accept', value: 'application/json', enabled: true },
    { key: 'Content-Type', value: 'application/json', enabled: true },
  ]);

  // Auth State
  const [authType, setAuthType] = useState<'none' | 'bearer' | 'basic' | 'apikey' | 'oauth2' | 'inherit'>('none');
  const [bearerToken, setBearerToken] = useState<string>('');
  const [basicUser, setBasicUser] = useState<string>('');
  const [basicPass, setBasicPass] = useState<string>('');
  const [apiKeyName, setApiKeyName] = useState<string>('X-API-Key');
  const [apiKeyValue, setApiKeyValue] = useState<string>('');
  const [apiKeyLocation, setApiKeyLocation] = useState<'header' | 'query'>('header');
  const [oauth2Token, setOauth2Token] = useState<string>('');
  const [showSecrets, setShowSecrets] = useState<boolean>(false);

  // Body State
  const [bodyType, setBodyType] = useState<ApiRequestBodyType>('json');
  const [bodyContent, setBodyContent] = useState<string>('{\n  "service": "ai-workbench",\n  "status": "ready"\n}');
  const [graphqlQuery, setGraphqlQuery] = useState<string>('query GetWorkspaceInfo {\n  workspace(id: "default") {\n    id\n    name\n  }\n}');
  const [graphqlVariables, setGraphqlVariables] = useState<string>('{\n  "id": "ws-1"\n}');

  // Scripts & Tests
  const [preRequestScript, setPreRequestScript] = useState<string>(
    '// Pre-request script example\n// pm.environment.set("current_time", new Date().toISOString());'
  );
  const [testScript, setTestScript] = useState<string>(
    '// Postman-compatible test script\npm.test("Status code is 200", function () {\n  pm.response.to.have.status(200);\n});\n\npm.test("Response time is less than 500ms", function () {\n  pm.expect(pm.response.responseTime).to.be.below(500);\n});'
  );

  // Settings
  const [followRedirects, setFollowRedirects] = useState<boolean>(true);
  const [maxRedirects] = useState<number>(5);
  const [verifySsl, setVerifySsl] = useState<boolean>(true);
  const [timeoutSeconds, setTimeoutSeconds] = useState<number>(20);
  const [proxyUrl] = useState<string>('');

  // Response State
  const [response, setResponse] = useState<ApiResponseData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeResponseTab, setActiveResponseTab] = useState<'body' | 'headers' | 'cookies' | 'tests' | 'timeline'>('body');
  const [responseViewMode, setResponseViewMode] = useState<'pretty' | 'raw' | 'preview'>('pretty');
  const [responseSearchQuery, setResponseSearchQuery] = useState<string>('');
  const [copiedResponse, setCopiedResponse] = useState<boolean>(false);

  // Environments
  const [environments, setEnvironments] = useState<ApiEnvironment[]>([
    {
      id: 'env-local',
      name: 'Local Dev (3000)',
      variables: { baseUrl: 'http://127.0.0.1:3000', token: 'mock-local-token' },
      isSecret: { token: true },
    },
    {
      id: 'env-vite',
      name: 'Vite Dev (5173)',
      variables: { baseUrl: 'http://127.0.0.1:5173', token: 'mock-vite-token' },
      isSecret: { token: true },
    },
    {
      id: 'env-staging',
      name: 'Staging Cloud',
      variables: { baseUrl: 'https://staging.api.example.com', token: 'stg_key_sec' },
      isSecret: { token: true },
    },
  ]);
  const [selectedEnvId, setSelectedEnvId] = useState<string>('env-local');
  const [showEnvModal, setShowEnvModal] = useState<boolean>(false);

  // Collections & Hierarchy
  const [collections, setCollections] = useState<ApiCollection[]>([
    {
      id: 'col-main',
      name: 'Workbench Core APIs',
      description: 'Default collection for local services and microVM endpoints',
      folders: [
        {
          id: 'fld-system',
          name: 'System Services',
          requests: [
            {
              id: 'req-1',
              name: 'Health Check',
              description: 'Check workbench microVM supervisor health',
              method: 'GET',
              url: '{{baseUrl}}/api/v1/health',
              params: [{ key: 'limit', value: '10', enabled: true, description: 'Max items to return' }],
              headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
              auth: { type: 'none' },
              bodyType: 'none',
            },
          ],
        },
      ],
      requests: [
        {
          id: 'req-2',
          name: 'Create Workspace Task',
          description: 'Submit an autonomous task to the isolated microVM',
          method: 'POST',
          url: '{{baseUrl}}/api/v1/tasks',
          params: [],
          headers: [
            { key: 'Content-Type', value: 'application/json', enabled: true },
            { key: 'Authorization', value: 'Bearer {{token}}', enabled: true },
          ],
          auth: { type: 'bearer', bearerToken: '{{token}}' },
          bodyType: 'json',
          bodyContent: '{\n  "instruction": "Run tests across all workspaces",\n  "max_steps": 10\n}',
        },
      ],
    },
  ]);

  // Request History
  const [historyItems, setHistoryItems] = useState<ApiHistoryItem[]>([
    {
      id: 'h-1',
      timestamp: 'Today, 19:42',
      method: 'GET',
      url: 'http://127.0.0.1:3000/api/v1/health',
      status: 200,
      timeMs: 42,
      sizeBytes: 154,
      requestConfig: {
        method: 'GET',
        url: 'http://127.0.0.1:3000/api/v1/health',
        name: 'Health Check',
      },
    },
    {
      id: 'h-2',
      timestamp: 'Today, 19:40',
      method: 'POST',
      url: 'http://127.0.0.1:3000/api/v1/tasks',
      status: 201,
      timeMs: 88,
      sizeBytes: 412,
      requestConfig: {
        method: 'POST',
        url: 'http://127.0.0.1:3000/api/v1/tasks',
        name: 'Create Workspace Task',
      },
    },
  ]);
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');

  // Modals & Panels
  const [showCodeModal, setShowCodeModal] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguage] = useState<CodeLanguage>('curl');
  const [showRunnerModal, setShowRunnerModal] = useState<boolean>(false);
  const [runnerCollectionId, setRunnerCollectionId] = useState<string>('col-main');
  const [runnerIterations, setRunnerIterations] = useState<number>(1);
  const [runnerDelayMs, setRunnerDelayMs] = useState<number>(100);
  const [isRunnerActive, setIsRunnerActive] = useState<boolean>(false);
  const [runnerReport, setRunnerReport] = useState<ApiRunnerReport | null>(null);

  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importFormat, setImportFormat] = useState<'postman' | 'openapi' | 'curl'>('postman');
  const [importText, setImportText] = useState<string>('');

  // Persistence (Load & Save)
  useEffect(() => {
    try {
      const savedCols = localStorage.getItem('wb_api_collections');
      if (savedCols) setCollections(JSON.parse(savedCols));
      const savedEnvs = localStorage.getItem('wb_api_environments');
      if (savedEnvs) setEnvironments(JSON.parse(savedEnvs));
      const savedHist = localStorage.getItem('wb_api_history');
      if (savedHist) setHistoryItems(JSON.parse(savedHist));
    } catch {}
  }, []);

  const persistCollections = (cols: ApiCollection[]) => {
    setCollections(cols);
    localStorage.setItem('wb_api_collections', JSON.stringify(cols));
  };

  const persistEnvironments = (envs: ApiEnvironment[]) => {
    setEnvironments(envs);
    localStorage.setItem('wb_api_environments', JSON.stringify(envs));
  };

  const persistHistory = (hist: ApiHistoryItem[]) => {
    setHistoryItems(hist);
    localStorage.setItem('wb_api_history', JSON.stringify(hist));
  };

  // Environment Variable Substitution
  const substituteEnv = (input: string): string => {
    const env = environments.find((e) => e.id === selectedEnvId);
    if (!env) return input;
    let res = input;
    for (const [k, v] of Object.entries(env.variables)) {
      res = res.split(`{{${k}}}`).join(v);
    }
    return res;
  };

  // Find unresolved variable tokens
  const findUnresolvedTokens = (str: string): string[] => {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches: string[] = [];
    const env = environments.find((e) => e.id === selectedEnvId);
    let m;
    while ((m = regex.exec(str)) !== null) {
      const varName = m[1].trim();
      if (!env || !(varName in env.variables)) {
        matches.push(varName);
      }
    }
    return matches;
  };

  // Execute Request Handler
  const handleSend = async () => {
    setIsLoading(true);
    setResponse(null);

    // 1. Run Pre-Request Script
    const activeEnv = environments.find((e) => e.id === selectedEnvId)?.variables || {};
    const preResult = runPreRequestScript(preRequestScript, activeEnv);
    if (Object.keys(preResult.envUpdates).length > 0) {
      const updatedEnvs = environments.map((e) =>
        e.id === selectedEnvId ? { ...e, variables: { ...e.variables, ...preResult.envUpdates } } : e
      );
      persistEnvironments(updatedEnvs);
    }

    // 2. Resolve Environment Variables
    const resolvedUrl = substituteEnv(url);

    // 3. Prepare Payload
    const payload: ApiRequestConfig = {
      method,
      customMethod: method === 'CUSTOM' ? customMethod : undefined,
      url: resolvedUrl,
      params: params.filter((p) => p.enabled && p.key.trim() !== ''),
      headers: headers.filter((h) => h.enabled && h.key.trim() !== ''),
      auth: {
        type: authType,
        bearerToken: authType === 'bearer' ? substituteEnv(bearerToken) : undefined,
        basicUser: authType === 'basic' ? substituteEnv(basicUser) : undefined,
        basicPass: authType === 'basic' ? basicPass : undefined,
        apiKeyName: authType === 'apikey' ? apiKeyName : undefined,
        apiKeyValue: authType === 'apikey' ? substituteEnv(apiKeyValue) : undefined,
        apiKeyLocation: authType === 'apikey' ? apiKeyLocation : undefined,
        oauth2Token: authType === 'oauth2' ? substituteEnv(oauth2Token) : undefined,
      },
      bodyType,
      bodyContent: bodyType !== 'none' ? substituteEnv(bodyContent) : undefined,
      graphqlQuery: bodyType === 'graphql' ? graphqlQuery : undefined,
      graphqlVariables: bodyType === 'graphql' ? substituteEnv(graphqlVariables) : undefined,
      timeoutSeconds,
      followRedirects,
      maxRedirects,
      verifySsl,
      proxyUrl: proxyUrl.trim() || undefined,
    };

    try {
      const res = await tauriIpc.apiExecuteRequest(payload);

      // 4. Run Post-Response Tests
      const testOutcome = runPostResponseTests(testScript, res, activeEnv);
      res.testResults = testOutcome.testResults;

      setResponse(res);

      // 5. Append to History
      const histItem: ApiHistoryItem = {
        id: `h-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        method,
        url: resolvedUrl,
        status: res.status,
        timeMs: res.timeMs,
        sizeBytes: res.sizeBytes,
        requestConfig: { ...payload, name: requestName },
      };
      persistHistory([histItem, ...historyItems.slice(0, 49)]);
    } catch (err: any) {
      setResponse({
        status: 0,
        statusText: 'Execution Error',
        timeMs: 0,
        sizeBytes: 0,
        headers: {},
        data: '',
        error: String(err?.message || err || 'Network transport failure'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Save Request to Collection
  const handleSaveRequest = () => {
    const newReq: ApiRequestConfig = {
      id: requestId.startsWith('req-') ? requestId : `req-${Date.now()}`,
      name: requestName,
      description: requestDescription,
      method,
      customMethod,
      url,
      params,
      headers,
      auth: {
        type: authType,
        bearerToken,
        basicUser,
        basicPass,
        apiKeyName,
        apiKeyValue,
        apiKeyLocation,
        oauth2Token,
      },
      bodyType,
      bodyContent,
      graphqlQuery,
      graphqlVariables,
      preRequestScript,
      testScript,
    };

    const targetCol = collections[0];
    if (!targetCol) return;

    let updated = false;
    const updatedReqs = targetCol.requests.map((r) => {
      if (r.id === newReq.id) {
        updated = true;
        return newReq;
      }
      return r;
    });

    if (!updated) {
      updatedReqs.push(newReq);
    }

    const updatedCols = collections.map((c) => (c.id === targetCol.id ? { ...c, requests: updatedReqs } : c));
    persistCollections(updatedCols);
  };

  // Load Request into Workspace
  const handleLoadRequest = (req: ApiRequestConfig) => {
    setRequestId(req.id || `req-${Date.now()}`);
    setRequestName(req.name || 'Untitled Request');
    setRequestDescription(req.description || '');
    setMethod(req.method);
    if (req.customMethod) setCustomMethod(req.customMethod);
    setUrl(req.url);
    if (req.params) setParams(req.params);
    if (req.headers) setHeaders(req.headers);
    if (req.auth) {
      setAuthType(req.auth.type);
      if (req.auth.bearerToken) setBearerToken(req.auth.bearerToken);
      if (req.auth.basicUser) setBasicUser(req.auth.basicUser);
      if (req.auth.basicPass) setBasicPass(req.auth.basicPass);
      if (req.auth.apiKeyName) setApiKeyName(req.auth.apiKeyName);
      if (req.auth.apiKeyValue) setApiKeyValue(req.auth.apiKeyValue);
      if (req.auth.apiKeyLocation) setApiKeyLocation(req.auth.apiKeyLocation);
      if (req.auth.oauth2Token) setOauth2Token(req.auth.oauth2Token);
    }
    if (req.bodyType) setBodyType(req.bodyType);
    if (req.bodyContent) setBodyContent(req.bodyContent);
    if (req.graphqlQuery) setGraphqlQuery(req.graphqlQuery);
    if (req.graphqlVariables) setGraphqlVariables(req.graphqlVariables);
    if (req.preRequestScript) setPreRequestScript(req.preRequestScript);
    if (req.testScript) setTestScript(req.testScript);
  };

  // Run Collection Suite
  const handleRunCollectionSuite = async () => {
    const col = collections.find((c) => c.id === runnerCollectionId) || collections[0];
    if (!col) return;

    setIsRunnerActive(true);
    const startTime = new Date().toLocaleTimeString();
    const results: any[] = [];
    let totalReqCount = 0;
    let passedCount = 0;
    let failedCount = 0;
    let totalTestCount = 0;
    let passedTestCount = 0;
    let totalTime = 0;

    const allRequests: ApiRequestConfig[] = [...col.requests];
    (col.folders || []).forEach((f) => allRequests.push(...f.requests));

    for (let iter = 0; iter < runnerIterations; iter++) {
      for (const req of allRequests) {
        totalReqCount++;
        const targetUrl = substituteEnv(req.url);

        try {
          const res = await tauriIpc.apiExecuteRequest({
            ...req,
            url: targetUrl,
          });

          totalTime += res.timeMs;
          const testOutcome = runPostResponseTests(req.testScript || '', res);
          const testsPassed = testOutcome.testResults.every((t) => t.status === 'passed');

          totalTestCount += testOutcome.testResults.length;
          passedTestCount += testOutcome.testResults.filter((t) => t.status === 'passed').length;

          if (res.status >= 200 && res.status < 400 && testsPassed) {
            passedCount++;
          } else {
            failedCount++;
          }

          results.push({
            requestId: req.id || `r-${totalReqCount}`,
            name: req.name || req.url,
            method: req.method,
            url: targetUrl,
            status: res.status,
            timeMs: res.timeMs,
            tests: testOutcome.testResults,
          });

          if (runnerDelayMs > 0) {
            await new Promise((r) => setTimeout(r, runnerDelayMs));
          }
        } catch {
          failedCount++;
          results.push({
            requestId: req.id || `r-${totalReqCount}`,
            name: req.name || req.url,
            method: req.method,
            url: targetUrl,
            status: 0,
            timeMs: 0,
            tests: [{ name: 'Transport', status: 'failed', error: 'Connection failed' }],
          });
        }
      }
    }

    setIsRunnerActive(false);
    setRunnerReport({
      id: `rep-${Date.now()}`,
      startTime,
      totalDurationMs: totalTime,
      totalRequests: totalReqCount,
      passedRequests: passedCount,
      failedRequests: failedCount,
      totalTests: totalTestCount,
      passedTests: passedTestCount,
      failedTests: totalTestCount - passedTestCount,
      results,
    });
  };

  // Import Action
  const handleExecuteImport = () => {
    if (!importText.trim()) return;

    try {
      if (importFormat === 'postman') {
        const parsedCol = importPostmanCollection(importText);
        persistCollections([...collections, parsedCol]);
      } else if (importFormat === 'openapi') {
        const parsedCol = importOpenApiSpec(importText);
        persistCollections([...collections, parsedCol]);
      }
      setShowImportModal(false);
      setImportText('');
    } catch (err: any) {
      alert(`Import error: ${err?.message || err}`);
    }
  };

  const handleCopyResponse = () => {
    if (response) {
      navigator.clipboard.writeText(response.data);
      setCopiedResponse(true);
      setTimeout(() => setCopiedResponse(false), 2000);
    }
  };

  const handleSaveResponseFile = () => {
    if (!response) return;
    const blob = new Blob([response.data], { type: 'application/json' });
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = `response-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(u);
  };

  const unresolvedTokens = findUnresolvedTokens(url);

  // Method color helper
  const getMethodBadgeClass = (m: string) => {
    switch (m) {
      case 'GET':
        return 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60';
      case 'POST':
        return 'bg-sky-950/80 text-sky-400 border-sky-800/60';
      case 'PUT':
      case 'PATCH':
        return 'bg-amber-950/80 text-amber-400 border-amber-800/60';
      case 'DELETE':
        return 'bg-rose-950/80 text-rose-400 border-rose-800/60';
      default:
        return 'bg-purple-950/80 text-purple-400 border-purple-800/60';
    }
  };

  return (
    <div className="flex h-full w-full bg-[#0c0f17] text-slate-100 font-sans select-none overflow-hidden">
      {/* 1. Left Sidebar: Collections, History, Environments */}
      <div className="w-64 bg-[#0e121b] border-r border-[#1a202e] flex flex-col flex-shrink-0">
        {/* Sidebar Header & Segmented Tabs */}
        <div className="p-3 border-b border-[#1a202e] bg-[#10141d]">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              API Studio
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const newCol: ApiCollection = {
                    id: `col-${Date.now()}`,
                    name: `Collection ${collections.length + 1}`,
                    requests: [],
                    folders: [],
                  };
                  persistCollections([...collections, newCol]);
                }}
                className="p-1 hover:bg-[#1f283d] text-slate-400 hover:text-cyan-300 rounded transition"
                title="New Collection"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Segmented Tab Pill */}
          <div className="flex items-center p-0.5 bg-[#080b11] border border-[#1a202e] rounded-lg text-xs">
            <button
              onClick={() => setSidebarTab('collections')}
              className={`flex-1 py-1 px-2 text-center rounded-md font-medium transition ${
                sidebarTab === 'collections'
                  ? 'bg-[#1a2335] text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Collections
            </button>
            <button
              onClick={() => setSidebarTab('history')}
              className={`flex-1 py-1 px-2 text-center rounded-md font-medium transition ${
                sidebarTab === 'history'
                  ? 'bg-[#1a2335] text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              History
            </button>
            <button
              onClick={() => setSidebarTab('environments')}
              className={`flex-1 py-1 px-2 text-center rounded-md font-medium transition ${
                sidebarTab === 'environments'
                  ? 'bg-[#1a2335] text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Envs
            </button>
          </div>
        </div>

        {/* Environment Quick Pill */}
        <div className="px-3 py-2 bg-[#0c0f17] border-b border-[#1a202e] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <select
              value={selectedEnvId}
              onChange={(e) => setSelectedEnvId(e.target.value)}
              className="bg-transparent text-emerald-400 font-mono text-[11px] font-semibold outline-none cursor-pointer truncate"
            >
              {environments.map((e) => (
                <option key={e.id} value={e.id} className="bg-[#0e121b] text-slate-200">
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowEnvModal(true)}
            className="p-1 text-slate-500 hover:text-slate-200 rounded transition"
            title="Manage Environments"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Sidebar Content Area */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {/* A. COLLECTIONS TAB */}
          {sidebarTab === 'collections' && (
            <div className="space-y-2">
              {collections.map((col) => (
                <div
                  key={col.id}
                  className="bg-[#131824] border border-[#1a202e] rounded-xl p-2.5 space-y-2 shadow-sm"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                    <span className="truncate flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <span className="truncate">{col.name}</span>
                    </span>
                    <button
                      onClick={() => {
                        const newReq: ApiRequestConfig = {
                          id: `req-${Date.now()}`,
                          name: 'New Request',
                          method: 'GET',
                          url: '{{baseUrl}}/api/v1',
                        };
                        const updated = collections.map((c) =>
                          c.id === col.id ? { ...c, requests: [...c.requests, newReq] } : c
                        );
                        persistCollections(updated);
                      }}
                      className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-[#1a2335] rounded transition"
                      title="Add Request"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Requests in Collection */}
                  <div className="space-y-1 pl-1">
                    {col.requests.map((req) => (
                      <div
                        key={req.id}
                        onClick={() => handleLoadRequest(req)}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition group ${
                          requestId === req.id
                            ? 'bg-[#1c2840] text-cyan-300 border border-cyan-700/60 shadow-sm'
                            : 'hover:bg-[#181f2f] text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded border ${getMethodBadgeClass(
                              req.method
                            )}`}
                          >
                            {req.method}
                          </span>
                          <span className="truncate text-xs">{req.name || req.url}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const updated = collections.map((c) =>
                              c.id === col.id ? { ...c, requests: c.requests.filter((r) => r.id !== req.id) } : c
                            );
                            persistCollections(updated);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* B. HISTORY TAB */}
          {sidebarTab === 'history' && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter history..."
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  className="w-full bg-[#10141e] border border-[#1a202e] rounded-lg pl-8 pr-2 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                {historyItems
                  .filter((h) => h.url.toLowerCase().includes(historySearchQuery.toLowerCase()))
                  .map((h) => (
                    <div
                      key={h.id}
                      onClick={() => handleLoadRequest({ ...h.requestConfig, url: h.url, method: h.method })}
                      className="p-2.5 bg-[#131824] hover:bg-[#181f2f] rounded-lg border border-[#1a202e] cursor-pointer space-y-1 transition"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded border ${getMethodBadgeClass(
                            h.method
                          )}`}
                        >
                          {h.method}
                        </span>
                        <span
                          className={`text-[11px] font-bold ${
                            h.status >= 200 && h.status < 300
                              ? 'text-emerald-400'
                              : h.status >= 400
                              ? 'text-rose-400'
                              : 'text-amber-400'
                          }`}
                        >
                          {h.status || 'ERR'}
                        </span>
                      </div>
                      <div className="truncate text-slate-300 text-xs font-mono">{h.url}</div>
                      <div className="text-[10px] text-slate-500 flex items-center justify-between">
                        <span>{h.timeMs}ms</span>
                        <span>{h.timestamp}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* C. ENVIRONMENTS TAB */}
          {sidebarTab === 'environments' && (
            <div className="space-y-3 p-1">
              {environments.map((env) => (
                <div
                  key={env.id}
                  className="p-3 bg-[#131824] border border-[#1a202e] rounded-xl space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      {env.name}
                    </span>
                    <button
                      onClick={() => setSelectedEnvId(env.id)}
                      className={`text-[11px] px-2 py-0.5 rounded font-medium border ${
                        selectedEnvId === env.id
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                          : 'bg-[#1a202e] text-slate-400 border-transparent hover:text-white'
                      }`}
                    >
                      {selectedEnvId === env.id ? 'Active' : 'Select'}
                    </button>
                  </div>
                  <div className="space-y-1 font-mono text-[11px] text-slate-400">
                    {Object.entries(env.variables).map(([k, v]) => (
                      <div key={k} className="flex justify-between truncate">
                        <span className="text-cyan-400">{k}:</span>
                        <span className="text-slate-300 truncate max-w-[120px]">
                          {env.isSecret?.[k] ? '••••••••' : v}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Footer: Runner, Import & Export */}
        <div className="p-3 border-t border-[#1a202e] bg-[#10141d] space-y-2">
          <button
            onClick={() => setShowRunnerModal(true)}
            className="w-full flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-semibold transition shadow-sm"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Collection Runner</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const targetCol = collections[0];
                if (targetCol) {
                  const jsonStr = exportPostmanCollection(targetCol);
                  const blob = new Blob([jsonStr], { type: 'application/json' });
                  const u = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = u;
                  a.download = `${targetCol.name.toLowerCase().replace(/\s+/g, '-')}-postman.json`;
                  a.click();
                  URL.revokeObjectURL(u);
                }
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs bg-[#171e2e] hover:bg-[#1f283d] text-slate-300 rounded-lg border border-[#1a202e] transition"
              title="Export Postman v2.1 Collection"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
            <button
              onClick={() => {
                setImportFormat('postman');
                setShowImportModal(true);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs bg-[#171e2e] hover:bg-[#1f283d] text-slate-300 rounded-lg border border-[#1a202e] transition"
              title="Import Collection or Spec"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Request & Response Workbench */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0c0f17]">
        {/* Request Top Header: Name, Breadcrumb, Actions */}
        <div className="px-5 py-3 bg-[#10141d] border-b border-[#1a202e] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={requestName}
              onChange={(e) => setRequestName(e.target.value)}
              className="bg-transparent font-bold text-sm text-white outline-none border-b border-transparent hover:border-slate-700 focus:border-cyan-500 w-64 transition"
              placeholder="Request Name"
            />
            <span className="text-slate-600">/</span>
            <span className="text-xs text-slate-400 font-mono">
              Env: <strong className="text-emerald-400">{environments.find((e) => e.id === selectedEnvId)?.name}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLayoutMode(layoutMode === 'stacked' ? 'split' : 'stacked')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#171e2e] hover:bg-[#1f283d] text-slate-300 border border-[#1a202e] rounded-lg text-xs font-medium transition"
              title={`Toggle layout (Currently: ${layoutMode})`}
            >
              {layoutMode === 'stacked' ? <Columns className="w-3.5 h-3.5" /> : <Rows className="w-3.5 h-3.5" />}
              <span>{layoutMode === 'stacked' ? 'Side-by-Side' : 'Stacked'}</span>
            </button>

            <button
              onClick={handleSaveRequest}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#171e2e] hover:bg-[#1f283d] text-slate-300 border border-[#1a202e] rounded-lg text-xs font-medium transition"
              title="Save Request (Cmd+S)"
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              <span>Save</span>
            </button>

            <button
              onClick={() => setShowCodeModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#171e2e] hover:bg-[#1f283d] text-slate-300 border border-[#1a202e] rounded-lg text-xs font-medium transition"
              title="Generate Client Code (cURL, JS, Python, Rust, Go)"
            >
              <Code className="w-3.5 h-3.5 text-blue-400" />
              <span>Code</span>
            </button>
          </div>
        </div>

        {/* HTTP Omnibox URL Bar */}
        <div className="p-4 bg-[#0e121b] border-b border-[#1a202e] flex-shrink-0">
          <div className="bg-[#131824] border border-[#1a202e] focus-within:border-cyan-500 rounded-xl p-1.5 shadow-md flex items-center gap-2 transition">
            {/* Method Selector */}
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as HttpMethod)}
              className={`font-mono font-bold text-xs px-3.5 py-2 rounded-lg border outline-none cursor-pointer transition ${getMethodBadgeClass(
                method
              )}`}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
              <option value="HEAD">HEAD</option>
              <option value="OPTIONS">OPTIONS</option>
              <option value="CUSTOM">CUSTOM</option>
            </select>

            {method === 'CUSTOM' && (
              <input
                type="text"
                placeholder="METHOD"
                value={customMethod}
                onChange={(e) => setCustomMethod(e.target.value)}
                className="w-24 bg-[#090d16] border border-[#1a202e] rounded-lg px-2.5 py-1.5 text-xs text-purple-400 font-mono outline-none"
              />
            )}

            {/* URL Input */}
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 bg-transparent px-2 text-sm text-slate-100 font-mono outline-none placeholder-slate-500"
              placeholder="{{baseUrl}}/api/v1/resource"
            />

            {unresolvedTokens.length > 0 && (
              <span
                className="text-[11px] text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-800/40 font-mono flex items-center gap-1 flex-shrink-0"
                title={`Unresolved variable: ${unresolvedTokens.join(', ')}`}
              >
                <AlertTriangle className="w-3 h-3" />
                <span>{unresolvedTokens[0]}</span>
              </span>
            )}

            {/* Send / Cancel Button */}
            <button
              onClick={handleSend}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-500/20 transition active:scale-95 disabled:opacity-50 flex-shrink-0"
            >
              <Send className={`w-3.5 h-3.5 ${isLoading ? 'animate-pulse' : ''}`} />
              <span>{isLoading ? 'Executing...' : 'Send'}</span>
            </button>
          </div>
        </div>

        {/* Dynamic Layout: Stacked vs Split */}
        <div
          className={`flex-1 flex min-h-0 overflow-hidden ${
            layoutMode === 'stacked' ? 'flex-col' : 'flex-row'
          }`}
        >
          {/* Section 1: Request Editor Pane */}
          <div
            className={`flex flex-col min-h-0 overflow-hidden bg-[#0c0f17] ${
              layoutMode === 'stacked'
                ? 'h-[45%] border-b border-[#1a202e]'
                : 'w-1/2 border-r border-[#1a202e]'
            }`}
          >
            {/* Request Tabs Bar */}
            <div className="flex items-center border-b border-[#1a202e] bg-[#10141d] px-4 pt-1 gap-1 flex-shrink-0">
              {(
                [
                  'params',
                  'auth',
                  'headers',
                  'body',
                  'scripts',
                  'tests',
                  'settings',
                ] as const
              ).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveRequestTab(tab)}
                  className={`pb-2.5 px-3 uppercase text-xs font-semibold tracking-wide transition border-b-2 ${
                    activeRequestTab === tab
                      ? 'text-cyan-400 border-cyan-400'
                      : 'text-slate-400 border-transparent hover:text-slate-200'
                  }`}
                >
                  {tab}
                  {tab === 'params' && ` (${params.filter((p) => p.enabled).length})`}
                  {tab === 'headers' && ` (${headers.filter((h) => h.enabled).length})`}
                </button>
              ))}
            </div>

            {/* Request Tab Contents Area */}
            <div className="flex-1 overflow-y-auto p-4 text-xs font-mono">
              {/* 1. PARAMS TAB */}
              {activeRequestTab === 'params' && (
                <div className="space-y-3 font-sans">
                  <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-[#1a202e] text-xs">
                    <span className="font-semibold uppercase tracking-wider text-slate-400">
                      Query Parameters
                    </span>
                    <button
                      onClick={() =>
                        setParams([...params, { key: '', value: '', enabled: true, description: '' }])
                      }
                      className="text-cyan-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Parameter
                    </button>
                  </div>

                  <div className="space-y-2 font-mono">
                    {params.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={p.enabled}
                          onChange={(e) => {
                            const updated = [...params];
                            updated[idx].enabled = e.target.checked;
                            setParams(updated);
                          }}
                          className="rounded border-slate-700 text-cyan-500 w-4 h-4 cursor-pointer"
                        />
                        <input
                          type="text"
                          placeholder="Key"
                          value={p.key}
                          onChange={(e) => {
                            const updated = [...params];
                            updated[idx].key = e.target.value;
                            setParams(updated);
                          }}
                          className="w-1/3 bg-[#131824] border border-[#1a202e] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500"
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          value={p.value}
                          onChange={(e) => {
                            const updated = [...params];
                            updated[idx].value = e.target.value;
                            setParams(updated);
                          }}
                          className="w-1/3 bg-[#131824] border border-[#1a202e] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500"
                        />
                        <input
                          type="text"
                          placeholder="Description"
                          value={p.description || ''}
                          onChange={(e) => {
                            const updated = [...params];
                            updated[idx].description = e.target.value;
                            setParams(updated);
                          }}
                          className="flex-1 bg-[#131824] border border-[#1a202e] rounded-lg px-2.5 py-1.5 text-xs text-slate-400 outline-none focus:border-cyan-500 font-sans"
                        />
                        <button
                          onClick={() => setParams(params.filter((_, i) => i !== idx))}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. HEADERS TAB */}
              {activeRequestTab === 'headers' && (
                <div className="space-y-3 font-sans">
                  <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-[#1a202e] text-xs">
                    <span className="font-semibold uppercase tracking-wider text-slate-400">
                      HTTP Request Headers
                    </span>
                    <button
                      onClick={() => setHeaders([...headers, { key: '', value: '', enabled: true }])}
                      className="text-cyan-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Header
                    </button>
                  </div>

                  <div className="space-y-2 font-mono">
                    {headers.map((h, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={h.enabled}
                          onChange={(e) => {
                            const updated = [...headers];
                            updated[idx].enabled = e.target.checked;
                            setHeaders(updated);
                          }}
                          className="rounded border-slate-700 text-cyan-500 w-4 h-4 cursor-pointer"
                        />
                        <input
                          type="text"
                          placeholder="Header Name"
                          value={h.key}
                          onChange={(e) => {
                            const updated = [...headers];
                            updated[idx].key = e.target.value;
                            setHeaders(updated);
                          }}
                          className="w-1/2 bg-[#131824] border border-[#1a202e] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500"
                        />
                        <input
                          type="text"
                          placeholder="Header Value"
                          value={h.value}
                          onChange={(e) => {
                            const updated = [...headers];
                            updated[idx].value = e.target.value;
                            setHeaders(updated);
                          }}
                          className="flex-1 bg-[#131824] border border-[#1a202e] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500"
                        />
                        <button
                          onClick={() => setHeaders(headers.filter((_, i) => i !== idx))}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. BODY TAB */}
              {activeRequestTab === 'body' && (
                <div className="space-y-3 font-sans h-full flex flex-col">
                  <div className="flex items-center gap-3 pb-2 border-b border-[#1a202e] text-xs">
                    {(['none', 'json', 'form-data', 'x-www-form-urlencoded', 'raw', 'graphql'] as const).map(
                      (bt) => (
                        <label key={bt} className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                          <input
                            type="radio"
                            name="bodyType"
                            checked={bodyType === bt}
                            onChange={() => setBodyType(bt)}
                            className="text-cyan-500"
                          />
                          <span className="uppercase text-[11px] font-semibold">{bt}</span>
                        </label>
                      )
                    )}
                  </div>

                  {bodyType === 'none' && (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      This request does not have a body payload.
                    </div>
                  )}

                  {(bodyType === 'json' || bodyType === 'raw') && (
                    <textarea
                      rows={10}
                      value={bodyContent}
                      onChange={(e) => setBodyContent(e.target.value)}
                      placeholder="{ ... }"
                      className="w-full flex-1 bg-[#10141e] border border-[#1a202e] rounded-lg p-3 text-xs text-slate-100 font-mono outline-none focus:border-cyan-500 leading-relaxed"
                    />
                  )}

                  {bodyType === 'graphql' && (
                    <div className="space-y-2 flex-1 flex flex-col">
                      <label className="text-xs text-slate-400">GraphQL Query:</label>
                      <textarea
                        rows={6}
                        value={graphqlQuery}
                        onChange={(e) => setGraphqlQuery(e.target.value)}
                        className="w-full bg-[#10141e] border border-[#1a202e] rounded-lg p-2.5 text-xs text-slate-100 font-mono outline-none"
                      />
                      <label className="text-xs text-slate-400">Query Variables:</label>
                      <textarea
                        rows={3}
                        value={graphqlVariables}
                        onChange={(e) => setGraphqlVariables(e.target.value)}
                        className="w-full bg-[#10141e] border border-[#1a202e] rounded-lg p-2.5 text-xs text-slate-100 font-mono outline-none"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 4. AUTH TAB */}
              {activeRequestTab === 'auth' && (
                <div className="space-y-4 font-sans max-w-lg">
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-slate-400 font-medium">Type:</label>
                    <select
                      value={authType}
                      onChange={(e) => setAuthType(e.target.value as any)}
                      className="bg-[#131824] border border-[#1a202e] rounded-lg px-3 py-1.5 text-xs text-slate-100 outline-none"
                    >
                      <option value="none">No Auth</option>
                      <option value="bearer">Bearer Token</option>
                      <option value="basic">Basic Auth</option>
                      <option value="apikey">API Key</option>
                      <option value="oauth2">OAuth 2.0</option>
                    </select>
                  </div>

                  {authType === 'bearer' && (
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400">Token:</label>
                      <input
                        type={showSecrets ? 'text' : 'password'}
                        value={bearerToken}
                        onChange={(e) => setBearerToken(e.target.value)}
                        placeholder="Bearer token or {{token}}"
                        className="w-full bg-[#131824] border border-[#1a202e] rounded-lg px-3 py-2 text-xs text-slate-100 font-mono outline-none focus:border-cyan-500"
                      />
                    </div>
                  )}

                  {authType === 'basic' && (
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-slate-400">Username:</label>
                        <input
                          type="text"
                          value={basicUser}
                          onChange={(e) => setBasicUser(e.target.value)}
                          className="w-full bg-[#131824] border border-[#1a202e] rounded-lg px-3 py-2 text-xs text-slate-100 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400">Password:</label>
                        <input
                          type={showSecrets ? 'text' : 'password'}
                          value={basicPass}
                          onChange={(e) => setBasicPass(e.target.value)}
                          className="w-full bg-[#131824] border border-[#1a202e] rounded-lg px-3 py-2 text-xs text-slate-100 outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {authType === 'apikey' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-slate-400">Key Name:</label>
                          <input
                            type="text"
                            value={apiKeyName}
                            onChange={(e) => setApiKeyName(e.target.value)}
                            className="w-full bg-[#131824] border border-[#1a202e] rounded-lg px-3 py-2 text-xs text-slate-100 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400">Add To:</label>
                          <select
                            value={apiKeyLocation}
                            onChange={(e) => setApiKeyLocation(e.target.value as any)}
                            className="w-full bg-[#131824] border border-[#1a202e] rounded-lg px-3 py-2 text-xs text-slate-100 outline-none"
                          >
                            <option value="header">Header</option>
                            <option value="query">Query Params</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400">Value:</label>
                        <input
                          type={showSecrets ? 'text' : 'password'}
                          value={apiKeyValue}
                          onChange={(e) => setApiKeyValue(e.target.value)}
                          className="w-full bg-[#131824] border border-[#1a202e] rounded-lg px-3 py-2 text-xs text-slate-100 font-mono outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {authType !== 'none' && (
                    <button
                      type="button"
                      onClick={() => setShowSecrets(!showSecrets)}
                      className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 pt-1"
                    >
                      {showSecrets ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showSecrets ? 'Hide sensitive credentials' : 'Show sensitive credentials'}</span>
                    </button>
                  )}
                </div>
              )}

              {/* 5. SCRIPTS & TESTS TABS */}
              {activeRequestTab === 'scripts' && (
                <div className="space-y-2 h-full flex flex-col font-sans">
                  <span className="text-xs text-slate-400">
                    Pre-request JavaScript sandbox (runs before HTTP execution):
                  </span>
                  <textarea
                    rows={8}
                    value={preRequestScript}
                    onChange={(e) => setPreRequestScript(e.target.value)}
                    className="w-full flex-1 bg-[#10141e] border border-[#1a202e] rounded-lg p-3 text-xs text-slate-100 font-mono outline-none focus:border-cyan-500 leading-relaxed"
                  />
                </div>
              )}

              {activeRequestTab === 'tests' && (
                <div className="space-y-2 h-full flex flex-col font-sans">
                  <span className="text-xs text-slate-400">
                    Postman-compatible test assertions (<code className="text-cyan-400">pm.test</code> &amp; <code className="text-cyan-400">pm.expect</code>):
                  </span>
                  <textarea
                    rows={8}
                    value={testScript}
                    onChange={(e) => setTestScript(e.target.value)}
                    className="w-full flex-1 bg-[#10141e] border border-[#1a202e] rounded-lg p-3 text-xs text-slate-100 font-mono outline-none focus:border-cyan-500 leading-relaxed"
                  />
                </div>
              )}

              {/* 6. SETTINGS TAB */}
              {activeRequestTab === 'settings' && (
                <div className="space-y-3 font-sans max-w-md">
                  <label className="flex items-center justify-between text-xs text-slate-300">
                    <span>Follow HTTP Redirects</span>
                    <input
                      type="checkbox"
                      checked={followRedirects}
                      onChange={(e) => setFollowRedirects(e.target.checked)}
                      className="rounded border-slate-700 text-cyan-500"
                    />
                  </label>
                  <label className="flex items-center justify-between text-xs text-slate-300">
                    <span>Verify SSL Certificates</span>
                    <input
                      type="checkbox"
                      checked={verifySsl}
                      onChange={(e) => setVerifySsl(e.target.checked)}
                      className="rounded border-slate-700 text-cyan-500"
                    />
                  </label>
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Request Timeout (seconds)</span>
                    <input
                      type="number"
                      value={timeoutSeconds}
                      onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
                      className="w-20 bg-[#131824] border border-[#1a202e] rounded px-2 py-1 text-xs text-slate-100 text-center"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Response Viewer Pane */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#0a0d14]">
            {/* Response Top Bar */}
            <div className="px-4 py-2.5 bg-[#10141d] border-b border-[#1a202e] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Response
                </span>

                {response && (
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded-full flex items-center gap-1.5 ${
                        response.status >= 200 && response.status < 300
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/60'
                          : response.status >= 400
                          ? 'bg-rose-950/80 text-rose-400 border border-rose-700/60'
                          : 'bg-amber-950/80 text-amber-400 border border-amber-700/60'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {response.status} {response.statusText}
                    </span>

                    <span className="text-[11px] text-slate-400 font-mono bg-[#171e2e] px-2 py-0.5 rounded border border-[#1a202e]">
                      {response.timeMs} ms
                    </span>

                    <span className="text-[11px] text-slate-400 font-mono bg-[#171e2e] px-2 py-0.5 rounded border border-[#1a202e]">
                      {(response.sizeBytes / 1024).toFixed(2)} KB
                    </span>
                  </div>
                )}
              </div>

              {response && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCopyResponse}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-[#171e2e] rounded transition"
                    title="Copy Body"
                  >
                    {copiedResponse ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={handleSaveResponseFile}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-[#171e2e] rounded transition"
                    title="Download Response"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Response Tabs & Controls Bar */}
            <div className="flex items-center justify-between border-b border-[#1a202e] bg-[#0c0f17] px-4 pt-1 flex-shrink-0 text-xs">
              <div className="flex items-center gap-1">
                {(['body', 'headers', 'cookies', 'tests', 'timeline'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveResponseTab(tab)}
                    className={`pb-2 px-3 uppercase text-xs font-semibold tracking-wide transition border-b-2 ${
                      activeResponseTab === tab
                        ? 'text-cyan-400 border-cyan-400'
                        : 'text-slate-400 border-transparent hover:text-slate-200'
                    }`}
                  >
                    {tab}
                    {tab === 'headers' && response && ` (${Object.keys(response.headers).length})`}
                    {tab === 'tests' &&
                      response?.testResults &&
                      ` (${response.testResults.filter((t) => t.status === 'passed').length}/${
                        response.testResults.length
                      })`}
                  </button>
                ))}
              </div>

              {activeResponseTab === 'body' && response && (
                <div className="flex items-center gap-2 pb-1.5">
                  <div className="flex items-center bg-[#131824] border border-[#1a202e] rounded px-2 py-0.5 text-xs">
                    <Search className="w-3 h-3 text-slate-500 mr-1.5" />
                    <input
                      type="text"
                      placeholder="Find in body..."
                      value={responseSearchQuery}
                      onChange={(e) => setResponseSearchQuery(e.target.value)}
                      className="bg-transparent text-xs text-slate-200 outline-none w-28"
                    />
                  </div>
                  <div className="flex items-center p-0.5 bg-[#131824] border border-[#1a202e] rounded text-xs">
                    {(['pretty', 'raw', 'preview'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setResponseViewMode(mode)}
                        className={`px-2 py-0.5 rounded font-medium capitalize transition ${
                          responseViewMode === mode
                            ? 'bg-[#1c2840] text-cyan-300'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Response Display Area */}
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
              {/* Empty / Ready to send Hero State */}
              {!response && !isLoading && (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                  <div className="max-w-md bg-[#131824] border border-[#1a202e] rounded-2xl p-6 shadow-xl space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-950/80 border border-blue-800/40 flex items-center justify-center text-cyan-400 mx-auto shadow-inner">
                      <Send className="w-6 h-6" />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white">Endpoint Ready to Execute</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Send requests directly to your local microVM Linux services or external APIs.
                      </p>
                    </div>

                    <div className="bg-[#090d16] border border-[#1a202e] rounded-lg p-3 text-left font-mono text-[11px] text-slate-300 space-y-1">
                      <div className="text-cyan-400 font-semibold">{method} {substituteEnv(url)}</div>
                      <div className="text-slate-500 text-[10px]">Environment: {environments.find((e) => e.id === selectedEnvId)?.name}</div>
                      {params.filter((p) => p.enabled).length > 0 && (
                        <div className="text-slate-400 text-[10px]">
                          Params: {params.filter((p) => p.enabled).map((p) => `${p.key}=${p.value}`).join('&')}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button
                        onClick={handleSend}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition flex items-center gap-2"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Request</span>
                      </button>

                      <button
                        onClick={() => setShowCodeModal(true)}
                        className="px-3 py-2 bg-[#171e2e] hover:bg-[#1f283d] text-slate-300 border border-[#1a202e] rounded-lg text-xs font-medium transition"
                      >
                        Export cURL
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading Spinner */}
              {isLoading && (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400">
                  <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
                  <span className="text-xs">Dispatching HTTP request to {substituteEnv(url)}...</span>
                </div>
              )}

              {/* Active Response Contents */}
              {response && (
                <>
                  {response.error && (
                    <div className="mb-4 p-3 bg-rose-950/40 border border-rose-900/60 rounded-xl flex items-center gap-2 text-rose-300 font-sans">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>{response.error}</span>
                    </div>
                  )}

                  {/* Body Tab */}
                  {activeResponseTab === 'body' && (
                    <div className="h-full">
                      {responseViewMode === 'preview' ? (
                        <iframe
                          srcDoc={response.data}
                          title="Preview"
                          sandbox="allow-same-origin"
                          className="w-full h-full bg-white rounded-lg border border-[#1a202e]"
                        />
                      ) : (
                        <pre className="text-slate-200 leading-relaxed whitespace-pre-wrap">
                          {response.data || '(Empty response body)'}
                        </pre>
                      )}
                    </div>
                  )}

                  {/* Headers Tab */}
                  {activeResponseTab === 'headers' && (
                    <div className="space-y-1">
                      {Object.entries(response.headers).map(([k, v]) => (
                        <div key={k} className="flex py-1 border-b border-[#1a202e]/60">
                          <span className="w-1/3 text-cyan-400 font-semibold">{k}:</span>
                          <span className="flex-1 text-slate-300 break-all">{v}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Cookies Tab */}
                  {activeResponseTab === 'cookies' && (
                    <div className="space-y-1">
                      {(!response.cookies || response.cookies.length === 0) ? (
                        <div className="text-slate-500 text-center py-6 font-sans">
                          No cookies received from server.
                        </div>
                      ) : (
                        response.cookies.map((c, i) => (
                          <div key={i} className="flex justify-between py-1 border-b border-[#1a202e]/60">
                            <span className="text-cyan-400 font-semibold">{c.name}:</span>
                            <span className="text-slate-300 font-mono">{c.value}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Test Results Tab */}
                  {activeResponseTab === 'tests' && (
                    <div className="space-y-2">
                      {(!response.testResults || response.testResults.length === 0) ? (
                        <div className="text-slate-500 text-center py-6 font-sans">
                          No test assertions evaluated. Write test scripts in the &quot;Tests&quot; tab.
                        </div>
                      ) : (
                        response.testResults.map((t, idx) => (
                          <div
                            key={idx}
                            className={`p-2.5 rounded-lg border flex items-center justify-between font-sans ${
                              t.status === 'passed'
                                ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                                : 'bg-rose-950/30 border-rose-800/40 text-rose-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {t.status === 'passed' ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-rose-400" />
                              )}
                              <span>{t.name}</span>
                            </div>
                            {t.error && <span className="text-xs text-rose-400 font-mono">{t.error}</span>}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Timeline Tab */}
                  {activeResponseTab === 'timeline' && (
                    <div className="space-y-2 font-sans text-xs">
                      <div className="p-3 bg-[#131824] border border-[#1a202e] rounded-xl space-y-1.5">
                        <div className="flex justify-between text-slate-400">
                          <span>DNS Lookup &amp; Socket Connect:</span>
                          <span className="text-cyan-400 font-mono">12 ms</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>TLS Handshake:</span>
                          <span className="text-cyan-400 font-mono">18 ms</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Time to First Byte (TTFB):</span>
                          <span className="text-cyan-400 font-mono">8 ms</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Content Download:</span>
                          <span className="text-cyan-400 font-mono">4 ms</span>
                        </div>
                        <div className="pt-1 border-t border-[#1a202e] flex justify-between font-bold text-white">
                          <span>Total Round-Trip Time:</span>
                          <span className="text-emerald-400 font-mono">{response.timeMs} ms</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CODE SNIPPET MODAL */}
      {showCodeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#10141d] border border-[#1a202e] rounded-xl w-full max-w-xl p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#1a202e]">
              <span className="font-bold text-white text-sm flex items-center gap-2">
                <Code className="w-4 h-4 text-cyan-400" />
                Generate Client Code
              </span>
              <button onClick={() => setShowCodeModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="flex items-center gap-1.5 pb-2">
              {(['curl', 'javascript', 'python', 'rust', 'go'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setSelectedLanguage(lang)}
                  className={`px-3 py-1 rounded text-xs font-semibold uppercase transition border ${
                    selectedLanguage === lang
                      ? 'bg-cyan-950 border-cyan-700/60 text-cyan-300'
                      : 'bg-[#131824] border-[#1a202e] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>

            <pre className="bg-[#090d16] border border-[#1a202e] rounded-lg p-3 text-xs text-slate-200 font-mono overflow-x-auto max-h-80 leading-relaxed">
              {generateCodeSnippet(
                {
                  method,
                  url: substituteEnv(url),
                  headers: headers.filter((h) => h.enabled),
                  params: params.filter((p) => p.enabled),
                  bodyType,
                  bodyContent,
                },
                selectedLanguage
              )}
            </pre>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1a202e]">
              <button
                onClick={() => {
                  const snippet = generateCodeSnippet(
                    {
                      method,
                      url: substituteEnv(url),
                      headers: headers.filter((h) => h.enabled),
                      params: params.filter((p) => p.enabled),
                      bodyType,
                      bodyContent,
                    },
                    selectedLanguage
                  );
                  navigator.clipboard.writeText(snippet);
                  setShowCodeModal(false);
                }}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COLLECTION RUNNER MODAL */}
      {showRunnerModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#10141d] border border-[#1a202e] rounded-xl w-full max-w-2xl max-h-[85vh] p-5 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#1a202e]">
              <span className="font-bold text-white text-sm flex items-center gap-2">
                <Play className="w-4 h-4 text-emerald-400" />
                Collection Runner
              </span>
              <button onClick={() => setShowRunnerModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-slate-400">Target Collection:</label>
                <select
                  value={runnerCollectionId}
                  onChange={(e) => setRunnerCollectionId(e.target.value)}
                  className="w-full mt-1 bg-[#131824] border border-[#1a202e] rounded-lg px-2.5 py-1.5 text-slate-200 outline-none"
                >
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.requests.length} requests)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400">Iterations:</label>
                <input
                  type="number"
                  value={runnerIterations}
                  min={1}
                  max={20}
                  onChange={(e) => setRunnerIterations(Number(e.target.value))}
                  className="w-full mt-1 bg-[#131824] border border-[#1a202e] rounded-lg px-2.5 py-1.5 text-slate-200 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400">Delay (ms):</label>
                <input
                  type="number"
                  value={runnerDelayMs}
                  step={50}
                  onChange={(e) => setRunnerDelayMs(Number(e.target.value))}
                  className="w-full mt-1 bg-[#131824] border border-[#1a202e] rounded-lg px-2.5 py-1.5 text-slate-200 outline-none"
                />
              </div>
            </div>

            {runnerReport && (
              <div className="bg-[#090d16] border border-[#1a202e] rounded-lg p-3 text-xs space-y-2 max-h-60 overflow-y-auto">
                <div className="flex items-center justify-between font-bold text-white border-b border-[#1a202e] pb-1.5">
                  <span>Execution Summary:</span>
                  <span className="text-emerald-400">
                    Passed: {runnerReport.passedRequests} / {runnerReport.totalRequests}
                  </span>
                </div>
                <div className="space-y-1">
                  {runnerReport.results.map((r, i) => (
                    <div key={i} className="flex justify-between text-[11px] font-mono">
                      <span className="text-slate-300">{r.method} {r.name}</span>
                      <span className={r.status >= 200 && r.status < 400 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {r.status} ({r.timeMs}ms)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1a202e]">
              <button
                onClick={() => setShowRunnerModal(false)}
                className="px-3 py-1.5 bg-[#171e2e] hover:bg-[#1f283d] text-slate-300 rounded-lg text-xs"
              >
                Close
              </button>
              <button
                onClick={handleRunCollectionSuite}
                disabled={isRunnerActive}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{isRunnerActive ? 'Running Suite...' : 'Run Test Suite'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT COLLECTION / SPEC MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#10141d] border border-[#1a202e] rounded-xl w-full max-w-lg p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#1a202e]">
              <span className="font-bold text-white text-sm flex items-center gap-2">
                <Upload className="w-4 h-4 text-cyan-400" />
                Import Postman Collection or OpenAPI 3.0
              </span>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setImportFormat('postman')}
                className={`px-3 py-1 rounded text-xs font-semibold border ${
                  importFormat === 'postman'
                    ? 'bg-cyan-950 border-cyan-700/60 text-cyan-300'
                    : 'bg-[#131824] border-[#1a202e] text-slate-400'
                }`}
              >
                Postman Collection v2.1
              </button>
              <button
                onClick={() => setImportFormat('openapi')}
                className={`px-3 py-1 rounded text-xs font-semibold border ${
                  importFormat === 'openapi'
                    ? 'bg-cyan-950 border-cyan-700/60 text-cyan-300'
                    : 'bg-[#131824] border-[#1a202e] text-slate-400'
                }`}
              >
                OpenAPI 3.0 (JSON)
              </button>
            </div>

            <textarea
              rows={8}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste raw collection or spec JSON string here..."
              className="w-full bg-[#090d16] border border-[#1a202e] rounded-lg p-3 text-xs text-slate-200 font-mono outline-none focus:border-cyan-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1a202e]">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-3 py-1.5 bg-[#171e2e] hover:bg-[#1f283d] text-slate-300 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteImport}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow-sm"
              >
                Import Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ENVIRONMENT VARIABLES MODAL */}
      {showEnvModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#10141d] border border-[#1a202e] rounded-xl w-full max-w-lg p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#1a202e]">
              <span className="font-bold text-white text-sm flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-400" />
                Manage Environments
              </span>
              <button onClick={() => setShowEnvModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {environments.map((env) => (
                <div key={env.id} className="p-3 bg-[#131824] border border-[#1a202e] rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">{env.name}</span>
                    <button
                      onClick={() => {
                        setSelectedEnvId(env.id);
                        setShowEnvModal(false);
                      }}
                      className="px-2.5 py-0.5 rounded text-xs bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-medium"
                    >
                      Use Environment
                    </button>
                  </div>
                  <div className="space-y-1 font-mono text-[11px] text-slate-400">
                    {Object.entries(env.variables).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-cyan-400">{k}:</span>
                        <span className="text-slate-300 truncate max-w-[200px]">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-[#1a202e]">
              <button
                onClick={() => setShowEnvModal(false)}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
