import React, { useState, useEffect } from 'react';
import {
  Send,
  Clock,
  Database,
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

interface ApiStudioProps {
  onSendToAgent?: (prompt: string) => void;
}

export const ApiStudio: React.FC<ApiStudioProps> = () => {
  // Navigation Tabs in Sidebar: 'collections' | 'history' | 'environments' | 'specs'
  const [sidebarTab, setSidebarTab] = useState<'collections' | 'history' | 'environments' | 'specs'>('collections');

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
  const [oauth2AuthUrl, setOauth2AuthUrl] = useState<string>('https://auth.example.com/oauth/authorize');
  const [oauth2TokenUrl, setOauth2TokenUrl] = useState<string>('https://auth.example.com/oauth/token');
  const [oauth2ClientId, setOauth2ClientId] = useState<string>('');
  const [oauth2ClientSecret, setOauth2ClientSecret] = useState<string>('');
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
  const [maxRedirects, setMaxRedirects] = useState<number>(5);
  const [verifySsl, setVerifySsl] = useState<boolean>(true);
  const [timeoutSeconds, setTimeoutSeconds] = useState<number>(20);
  const [proxyUrl, setProxyUrl] = useState<string>('');

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
              method: 'GET',
              url: '{{baseUrl}}/api/v1/health',
              params: [{ key: 'limit', value: '10', enabled: true }],
              headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
              bodyType: 'none',
              testScript: 'pm.test("Status is 200", () => pm.response.to.have.status(200));',
            },
            {
              id: 'req-2',
              name: 'Get User Profile',
              method: 'GET',
              url: '{{baseUrl}}/api/v1/user/profile',
              params: [],
              headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
              auth: { type: 'bearer', bearerToken: '{{token}}' },
              bodyType: 'none',
            },
          ],
        },
      ],
      requests: [
        {
          id: 'req-3',
          name: 'Create Workspace Task',
          method: 'POST',
          url: '{{baseUrl}}/api/v1/tasks',
          params: [],
          headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
          bodyType: 'json',
          bodyContent: '{\n  "title": "Build Test Suite",\n  "status": "pending"\n}',
        },
      ],
    },
  ]);

  // Request History
  const [historyItems, setHistoryItems] = useState<ApiHistoryItem[]>([
    {
      id: 'h-1',
      timestamp: 'Just now',
      method: 'GET',
      url: 'http://127.0.0.1:3000/api/v1/health',
      status: 200,
      timeMs: 24,
      sizeBytes: 154,
      requestConfig: {
        method: 'GET',
        url: 'http://127.0.0.1:3000/api/v1/health',
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
      // Update environment variables
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

    // Check if updating existing
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

    // Gather all requests from collection + folders
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
        const importedCol = importPostmanCollection(importText);
        persistCollections([...collections, importedCol]);
      } else if (importFormat === 'openapi') {
        const importedCol = importOpenApiSpec(importText);
        persistCollections([...collections, importedCol]);
      } else if (importFormat === 'curl') {
        tauriIpc
          .apiParseCurl(importText)
          .then((req) => {
            handleLoadRequest(req);
          })
          .catch((err) => alert(String(err)));
      }
      setShowImportModal(false);
      setImportText('');
    } catch (err: any) {
      alert(`Import failed: ${err?.message || err}`);
    }
  };

  // Helper formatting for JSON
  const formatJson = (str: string) => {
    try {
      return JSON.stringify(JSON.parse(str), null, 2);
    } catch {
      return str;
    }
  };

  // Copy Response Body
  const handleCopyResponse = () => {
    if (response?.data) {
      navigator.clipboard.writeText(response.data);
      setCopiedResponse(true);
      setTimeout(() => setCopiedResponse(false), 2000);
    }
  };

  // Save Response to File
  const handleSaveResponseFile = () => {
    if (!response) return;
    const blob = new Blob([response.data], { type: 'text/plain' });
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = `response-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(u);
  };


  const unresolvedTokens = findUnresolvedTokens(url);

  return (
    <div className="api-studio-container flex h-full w-full bg-zinc-950 text-zinc-100 font-sans select-none overflow-hidden">
      {/* 1. Left Sidebar: Collections, History, Environments, OpenAPI Specs */}
      <div className="w-72 bg-zinc-900 border-r border-zinc-800 flex flex-col flex-shrink-0">
        {/* Navigation Tabs in Sidebar */}
        <div className="flex items-center border-b border-zinc-800 bg-zinc-950 text-xs">
          <button
            onClick={() => setSidebarTab('collections')}
            className={`flex-1 py-2 text-center font-bold tracking-wider uppercase text-[10px] transition border-b-2 ${
              sidebarTab === 'collections'
                ? 'text-emerald-400 border-emerald-400 bg-zinc-900/60'
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            Collections
          </button>
          <button
            onClick={() => setSidebarTab('history')}
            className={`flex-1 py-2 text-center font-bold tracking-wider uppercase text-[10px] transition border-b-2 ${
              sidebarTab === 'history'
                ? 'text-emerald-400 border-emerald-400 bg-zinc-900/60'
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            History
          </button>
          <button
            onClick={() => setSidebarTab('environments')}
            className={`flex-1 py-2 text-center font-bold tracking-wider uppercase text-[10px] transition border-b-2 ${
              sidebarTab === 'environments'
                ? 'text-emerald-400 border-emerald-400 bg-zinc-900/60'
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            Envs
          </button>
          <button
            onClick={() => setSidebarTab('specs')}
            className={`flex-1 py-2 text-center font-bold tracking-wider uppercase text-[10px] transition border-b-2 ${
              sidebarTab === 'specs'
                ? 'text-emerald-400 border-emerald-400 bg-zinc-900/60'
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            Specs
          </button>
        </div>

        {/* Environment Quick Bar */}
        <div className="p-2.5 bg-zinc-950/80 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <select
              value={selectedEnvId}
              onChange={(e) => setSelectedEnvId(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-emerald-400 font-mono outline-none cursor-pointer"
            >
              {environments.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowEnvModal(true)}
            className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded"
            title="Configure Environments & Variables"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Sidebar Content Area */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {/* A. COLLECTIONS TAB */}
          {sidebarTab === 'collections' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1 text-xs text-zinc-400">
                <span className="font-bold text-[11px] uppercase tracking-wider text-zinc-500">Collections</span>
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
                    className="p-1 hover:text-zinc-100 rounded text-emerald-400"
                    title="New Collection"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {collections.map((col) => (
                <div key={col.id} className="bg-zinc-950/60 border border-zinc-850 rounded-lg p-2 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-zinc-200">
                    <span className="truncate flex items-center gap-1.5">
                      <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                      {col.name}
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
                      className="p-0.5 text-zinc-500 hover:text-emerald-400"
                      title="Add Request to Collection"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Requests in Collection */}
                  <div className="space-y-1 pl-2 font-mono text-[11px]">
                    {col.requests.map((req) => (
                      <div
                        key={req.id}
                        onClick={() => handleLoadRequest(req)}
                        className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition group ${
                          requestId === req.id ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30' : 'hover:bg-zinc-850 text-zinc-400'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className={`font-bold text-[9px] px-1 py-0.2 rounded ${
                              req.method === 'GET'
                                ? 'bg-blue-950 text-blue-400'
                                : req.method === 'POST'
                                ? 'bg-emerald-950 text-emerald-400'
                                : req.method === 'DELETE'
                                ? 'bg-rose-950 text-rose-400'
                                : 'bg-amber-950 text-amber-400'
                            }`}
                          >
                            {req.method}
                          </span>
                          <span className="truncate text-zinc-300 font-sans text-xs">{req.name || req.url}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const updated = collections.map((c) =>
                              c.id === col.id ? { ...c, requests: c.requests.filter((r) => r.id !== req.id) } : c
                            );
                            persistCollections(updated);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-400 p-0.5"
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
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter history..."
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-2 py-1.5 text-xs text-zinc-200 outline-none"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1">
                <span>{historyItems.length} Entries</span>
                <button onClick={() => persistHistory([])} className="hover:text-rose-400 transition">
                  Clear
                </button>
              </div>

              <div className="space-y-1 font-mono text-[11px]">
                {historyItems
                  .filter((h) => !historySearchQuery || h.url.toLowerCase().includes(historySearchQuery.toLowerCase()))
                  .map((h) => (
                    <div
                      key={h.id}
                      onClick={() => handleLoadRequest(h.requestConfig)}
                      className="p-2 bg-zinc-950 hover:bg-zinc-850 rounded-lg border border-zinc-850 cursor-pointer space-y-1 transition"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-bold text-[9px] px-1 py-0.2 rounded ${
                            h.method === 'GET'
                              ? 'bg-blue-950 text-blue-400'
                              : h.method === 'POST'
                              ? 'bg-emerald-950 text-emerald-400'
                              : 'bg-amber-950 text-amber-400'
                          }`}
                        >
                          {h.method}
                        </span>
                        <span
                          className={`text-[10px] font-bold ${
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
                      <div className="truncate text-zinc-300 text-[11px]">{h.url}</div>
                      <div className="text-[10px] text-zinc-500 flex items-center justify-between font-sans">
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
            <div className="space-y-3 font-sans text-xs">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="font-bold text-[11px] uppercase tracking-wider text-zinc-500">Variables</span>
                <button onClick={() => setShowEnvModal(true)} className="text-emerald-400 hover:underline">
                  Edit All
                </button>
              </div>

              {environments
                .find((e) => e.id === selectedEnvId)
                ?.variables && (
                <div className="bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 space-y-2 font-mono text-[11px]">
                  {Object.entries(
                    environments.find((e) => e.id === selectedEnvId)!.variables
                  ).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between pb-1 border-b border-zinc-850">
                      <span className="text-purple-400">{`{{${k}}}`}</span>
                      <span className="text-zinc-400 truncate max-w-28">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* D. SPECS TAB */}
          {sidebarTab === 'specs' && (
            <div className="space-y-3 font-sans text-xs">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="font-bold text-[11px] uppercase tracking-wider text-zinc-500">OpenAPI / Swagger</span>
                <button
                  onClick={() => {
                    setImportFormat('openapi');
                    setShowImportModal(true);
                  }}
                  className="text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <Upload className="w-3 h-3" /> Import
                </button>
              </div>

              <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-lg space-y-2">
                <p className="font-bold text-zinc-300">OpenAPI 3.x Specs</p>
                <p className="text-[11px] text-zinc-500">
                  Import OpenAPI or Swagger JSON specifications to automatically generate full request collections with typed parameters and schemas.
                </p>
                <button
                  onClick={() => {
                    setImportFormat('openapi');
                    setShowImportModal(true);
                  }}
                  className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 rounded text-xs font-semibold"
                >
                  Load API Spec
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Footer: Runner, Import & Export */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-950 space-y-2">
          <button
            onClick={() => setShowRunnerModal(true)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition"
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
              className="flex-1 flex items-center justify-center gap-1 py-1 text-[11px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 transition"
              title="Export Postman v2.1 Collection"
            >
              <Download className="w-3 h-3" />
              <span>Export</span>
            </button>
            <button
              onClick={() => {
                setImportFormat('postman');
                setShowImportModal(true);
              }}
              className="flex-1 flex items-center justify-center gap-1 py-1 text-[11px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 transition"
              title="Import Collection or Spec"
            >
              <Upload className="w-3 h-3" />
              <span>Import</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Request & Response Workbench */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Request Top Header: Name, Save, Code, AI Debug */}
        <div className="px-4 py-2 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={requestName}
              onChange={(e) => setRequestName(e.target.value)}
              className="bg-transparent font-bold text-sm text-zinc-100 outline-none border-b border-transparent hover:border-zinc-700 focus:border-emerald-500 w-64"
              placeholder="Request Name"
            />
            <span className="text-zinc-600">|</span>
            <span className="text-xs text-zinc-400 font-mono">
              Env: <strong className="text-emerald-400">{environments.find((e) => e.id === selectedEnvId)?.name}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveRequest}
              className="flex items-center gap-1 px-2.5 py-1 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded text-xs transition border border-zinc-750"
              title="Save Request"
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              <span>Save</span>
            </button>

            <button
              onClick={() => setShowCodeModal(true)}
              className="flex items-center gap-1 px-2.5 py-1 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded text-xs transition border border-zinc-750"
              title="Generate Client Code Snippets (cURL, JS, Python, Rust, Go)"
            >
              <Code className="w-3.5 h-3.5 text-blue-400" />
              <span>Code</span>
            </button>
          </div>
        </div>

        {/* Omnibox URL Bar */}
        <div className="p-3 bg-zinc-900/90 border-b border-zinc-800 flex items-center gap-2">
          {/* Method Selector */}
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as HttpMethod)}
            className={`font-mono font-bold text-xs px-3 py-2 rounded-lg border outline-none cursor-pointer ${
              method === 'GET'
                ? 'bg-blue-950/60 text-blue-400 border-blue-800'
                : method === 'POST'
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                : method === 'DELETE'
                ? 'bg-rose-950/60 text-rose-400 border-rose-800'
                : method === 'PUT' || method === 'PATCH'
                ? 'bg-amber-950/60 text-amber-400 border-amber-800'
                : 'bg-purple-950/60 text-purple-400 border-purple-800'
            }`}
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
              className="w-24 bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-purple-400 font-mono outline-none"
            />
          )}

          {/* URL Input */}
          <div className="flex-1 flex items-center bg-zinc-950 border border-zinc-800 focus-within:border-emerald-500 rounded-lg px-3 py-1.5 transition">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 bg-transparent text-xs text-zinc-100 font-mono outline-none"
              placeholder="{{baseUrl}}/api/v1/resource"
            />

            {unresolvedTokens.length > 0 && (
              <span
                className="text-[10px] text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40 ml-2 font-mono flex items-center gap-1"
                title={`Unresolved variable: ${unresolvedTokens.join(', ')}`}
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Unresolved: {unresolvedTokens[0]}</span>
              </span>
            )}
          </div>

          {/* Send / Cancel Button */}
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md transition disabled:opacity-50"
          >
            <Send className={`w-3.5 h-3.5 ${isLoading ? 'animate-pulse' : ''}`} />
            <span>{isLoading ? 'Sending...' : 'Send'}</span>
          </button>
        </div>

        {/* Two-Pane Body: Request Editor (Left) & Response Viewer (Right) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Pane: Request Editor */}
          <div className="w-1/2 border-r border-zinc-800 flex flex-col bg-zinc-950 overflow-hidden">
            {/* Request Tabs */}
            <div className="flex items-center border-b border-zinc-800 bg-zinc-900/40 px-3 pt-2 gap-1 overflow-x-auto no-scrollbar text-xs">
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
                  className={`pb-2 px-2.5 uppercase text-[11px] font-bold tracking-wider transition border-b-2 ${
                    activeRequestTab === tab
                      ? 'text-emerald-400 border-emerald-400 bg-zinc-900/40'
                      : 'text-zinc-500 border-transparent hover:text-zinc-300'
                  }`}
                >
                  {tab}
                  {tab === 'params' && ` (${params.filter((p) => p.enabled).length})`}
                  {tab === 'headers' && ` (${headers.filter((h) => h.enabled).length})`}
                </button>
              ))}
            </div>

            {/* Request Tab Contents */}
            <div className="flex-1 overflow-y-auto p-4 text-xs font-mono">
              {/* 1. PARAMS TAB */}
              {activeRequestTab === 'params' && (
                <div className="space-y-3 font-sans">
                  <div className="flex items-center justify-between text-zinc-400 pb-1 border-b border-zinc-800 text-[11px]">
                    <span className="font-bold uppercase tracking-wider text-zinc-500">Query Parameters</span>
                    <button
                      onClick={() => setParams([...params, { key: '', value: '', enabled: true, description: '' }])}
                      className="text-emerald-400 hover:underline flex items-center gap-1 font-sans"
                    >
                      <Plus className="w-3 h-3" /> Add Parameter
                    </button>
                  </div>

                  <div className="space-y-1.5 font-mono">
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
                          className="rounded border-zinc-700 text-emerald-500"
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
                          className="w-1/3 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 outline-none focus:border-emerald-500"
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
                          className="w-1/3 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 outline-none focus:border-emerald-500"
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
                          className="flex-1 bg-zinc-900/60 border border-zinc-800/80 rounded px-2 py-1 text-xs text-zinc-400 outline-none font-sans"
                        />
                        <button
                          onClick={() => setParams(params.filter((_, i) => i !== idx))}
                          className="text-zinc-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. AUTH TAB */}
              {activeRequestTab === 'auth' && (
                <div className="space-y-4 font-sans text-xs">
                  <div>
                    <label className="text-zinc-400 block mb-1">Authentication Type</label>
                    <select
                      value={authType}
                      onChange={(e) => setAuthType(e.target.value as any)}
                      className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-zinc-200 outline-none cursor-pointer"
                    >
                      <option value="none">No Auth</option>
                      <option value="bearer">Bearer Token</option>
                      <option value="basic">Basic Auth</option>
                      <option value="apikey">API Key</option>
                      <option value="oauth2">OAuth 2.0 (Bearer / Refresh)</option>
                      <option value="inherit">Inherit from Collection</option>
                    </select>
                  </div>

                  {authType === 'bearer' && (
                    <div className="space-y-2">
                      <label className="text-zinc-400 block">Bearer Token</label>
                      <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 focus-within:border-emerald-500">
                        <input
                          type={showSecrets ? 'text' : 'password'}
                          placeholder="eyJhbGciOi... or {{token}}"
                          value={bearerToken}
                          onChange={(e) => setBearerToken(e.target.value)}
                          className="flex-1 bg-transparent font-mono text-xs text-zinc-200 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecrets(!showSecrets)}
                          className="text-zinc-500 hover:text-zinc-300 ml-2"
                        >
                          {showSecrets ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {authType === 'basic' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-zinc-400 block mb-1">Username</label>
                        <input
                          type="text"
                          value={basicUser}
                          onChange={(e) => setBasicUser(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-200 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-zinc-400 block mb-1">Password</label>
                        <input
                          type={showSecrets ? 'text' : 'password'}
                          value={basicPass}
                          onChange={(e) => setBasicPass(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-200 outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {authType === 'apikey' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-zinc-400 block mb-1">Key Name</label>
                          <input
                            type="text"
                            value={apiKeyName}
                            onChange={(e) => setApiKeyName(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-200 outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-zinc-400 block mb-1">Value</label>
                          <input
                            type={showSecrets ? 'text' : 'password'}
                            value={apiKeyValue}
                            onChange={(e) => setApiKeyValue(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-200 outline-none font-mono"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="text-zinc-400">Add To:</label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="apiLoc"
                            checked={apiKeyLocation === 'header'}
                            onChange={() => setApiKeyLocation('header')}
                          />
                          <span>Header</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="apiLoc"
                            checked={apiKeyLocation === 'query'}
                            onChange={() => setApiKeyLocation('query')}
                          />
                          <span>Query Params</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {authType === 'oauth2' && (
                    <div className="space-y-3 bg-zinc-900/60 p-3 rounded-lg border border-zinc-800">
                      <div>
                        <label className="text-zinc-400 block mb-1">Access Token</label>
                        <input
                          type={showSecrets ? 'text' : 'password'}
                          value={oauth2Token}
                          onChange={(e) => setOauth2Token(e.target.value)}
                          placeholder="Bearer access token or {{oauth_token}}"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 font-mono text-xs text-zinc-200 outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-zinc-400 block mb-1">Auth URL</label>
                          <input
                            type="text"
                            value={oauth2AuthUrl}
                            onChange={(e) => setOauth2AuthUrl(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 font-mono text-xs text-zinc-200 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-zinc-400 block mb-1">Token URL</label>
                          <input
                            type="text"
                            value={oauth2TokenUrl}
                            onChange={(e) => setOauth2TokenUrl(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 font-mono text-xs text-zinc-200 outline-none"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-zinc-400 block mb-1">Client ID</label>
                          <input
                            type="text"
                            value={oauth2ClientId}
                            onChange={(e) => setOauth2ClientId(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 font-mono text-xs text-zinc-200 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-zinc-400 block mb-1">Client Secret</label>
                          <input
                            type="password"
                            value={oauth2ClientSecret}
                            onChange={(e) => setOauth2ClientSecret(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 font-mono text-xs text-zinc-200 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3. HEADERS TAB */}
              {activeRequestTab === 'headers' && (
                <div className="space-y-3 font-sans">
                  <div className="flex items-center justify-between text-zinc-400 pb-1 border-b border-zinc-800 text-[11px]">
                    <span className="font-bold uppercase tracking-wider text-zinc-500">Headers List</span>
                    <button
                      onClick={() => setHeaders([...headers, { key: '', value: '', enabled: true }])}
                      className="text-emerald-400 hover:underline flex items-center gap-1 font-sans"
                    >
                      <Plus className="w-3 h-3" /> Add Header
                    </button>
                  </div>

                  <div className="space-y-1.5 font-mono">
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
                          className="rounded border-zinc-700 text-emerald-500"
                        />
                        <input
                          type="text"
                          placeholder="Header"
                          value={h.key}
                          onChange={(e) => {
                            const updated = [...headers];
                            updated[idx].key = e.target.value;
                            setHeaders(updated);
                          }}
                          className="w-1/2 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 outline-none focus:border-emerald-500"
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          value={h.value}
                          onChange={(e) => {
                            const updated = [...headers];
                            updated[idx].value = e.target.value;
                            setHeaders(updated);
                          }}
                          className="w-1/2 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 outline-none focus:border-emerald-500"
                        />
                        <button
                          onClick={() => setHeaders(headers.filter((_, i) => i !== idx))}
                          className="text-zinc-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. BODY TAB */}
              {activeRequestTab === 'body' && (
                <div className="h-full flex flex-col space-y-2 font-sans">
                  {/* Body Type Radio Selector */}
                  <div className="flex items-center gap-4 text-xs pb-2 border-b border-zinc-800 overflow-x-auto no-scrollbar">
                    {(['none', 'json', 'xml', 'x-www-form-urlencoded', 'raw', 'graphql'] as const).map((b) => (
                      <label key={b} className="flex items-center gap-1.5 cursor-pointer uppercase text-[11px] font-bold">
                        <input
                          type="radio"
                          name="bodyType"
                          checked={bodyType === b}
                          onChange={() => setBodyType(b)}
                        />
                        <span className={bodyType === b ? 'text-emerald-400' : 'text-zinc-400'}>{b}</span>
                      </label>
                    ))}
                  </div>

                  {/* Body Editor depending on mode */}
                  {bodyType === 'graphql' ? (
                    <div className="flex-1 flex flex-col space-y-2 font-mono text-xs">
                      <label className="text-[11px] font-sans text-zinc-400">GraphQL Query</label>
                      <textarea
                        value={graphqlQuery}
                        onChange={(e) => setGraphqlQuery(e.target.value)}
                        className="h-44 w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-zinc-100 outline-none resize-none font-mono"
                      />
                      <label className="text-[11px] font-sans text-zinc-400">Variables (JSON)</label>
                      <textarea
                        value={graphqlVariables}
                        onChange={(e) => setGraphqlVariables(e.target.value)}
                        className="h-24 w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-zinc-100 outline-none resize-none font-mono"
                      />
                    </div>
                  ) : bodyType !== 'none' ? (
                    <div className="flex-1 flex flex-col space-y-2 font-mono text-xs">
                      <div className="flex items-center justify-between pb-1">
                        <span className="text-[10px] text-zinc-500 font-sans">
                          {bodyType === 'json' ? 'JSON Payload' : 'Raw Text Payload'}
                        </span>
                        {bodyType === 'json' && (
                          <button
                            type="button"
                            onClick={() => setBodyContent(formatJson(bodyContent))}
                            className="text-emerald-400 hover:underline text-[11px] font-sans"
                          >
                            Prettify JSON
                          </button>
                        )}
                      </div>
                      <textarea
                        value={bodyContent}
                        onChange={(e) => setBodyContent(e.target.value)}
                        className="flex-1 w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 font-mono text-xs text-zinc-100 outline-none resize-none focus:border-emerald-500"
                        rows={14}
                      />
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-zinc-500 text-xs">
                      No request body configured for this method.
                    </div>
                  )}
                </div>
              )}

              {/* 5. PRE-REQUEST SCRIPTS */}
              {activeRequestTab === 'scripts' && (
                <div className="h-full flex flex-col space-y-2 font-sans text-xs">
                  <div className="flex items-center justify-between text-zinc-400 pb-1 border-b border-zinc-800">
                    <span>Pre-Request Script (Postman Compatibility Sandbox)</span>
                    <button
                      onClick={() =>
                        setPreRequestScript(
                          preRequestScript + '\npm.environment.set("timestamp", new Date().toISOString());'
                        )
                      }
                      className="text-emerald-400 hover:underline text-[11px]"
                    >
                      + Insert Timestamp Snippet
                    </button>
                  </div>
                  <textarea
                    value={preRequestScript}
                    onChange={(e) => setPreRequestScript(e.target.value)}
                    className="flex-1 w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 font-mono text-xs text-zinc-100 outline-none resize-none"
                    rows={12}
                  />
                </div>
              )}

              {/* 6. TESTS TAB */}
              {activeRequestTab === 'tests' && (
                <div className="h-full flex flex-col space-y-2 font-sans text-xs">
                  <div className="flex items-center justify-between text-zinc-400 pb-1 border-b border-zinc-800">
                    <span>Response Test Scripts (`pm.test`, `pm.expect`)</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setTestScript(
                            testScript + '\npm.test("Status code is 200", () => pm.response.to.have.status(200));'
                          )
                        }
                        className="text-emerald-400 hover:underline text-[11px]"
                      >
                        + 200 OK
                      </button>
                      <button
                        onClick={() =>
                          setTestScript(
                            testScript + '\npm.test("Response time < 500ms", () => pm.expect(pm.response.responseTime).to.be.below(500));'
                          )
                        }
                        className="text-emerald-400 hover:underline text-[11px]"
                      >
                        + Speed Test
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={testScript}
                    onChange={(e) => setTestScript(e.target.value)}
                    className="flex-1 w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 font-mono text-xs text-zinc-100 outline-none resize-none"
                    rows={12}
                  />
                </div>
              )}

              {/* 7. SETTINGS TAB */}
              {activeRequestTab === 'settings' && (
                <div className="space-y-4 font-sans text-xs max-w-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-zinc-200">Follow HTTP Redirects</p>
                      <p className="text-[11px] text-zinc-500">Automatically follow 3xx redirects (up to max limit)</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={followRedirects}
                      onChange={(e) => setFollowRedirects(e.target.checked)}
                      className="rounded border-zinc-700 text-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">Max Redirects</label>
                    <input
                      type="number"
                      value={maxRedirects}
                      onChange={(e) => setMaxRedirects(Number(e.target.value))}
                      className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 font-mono text-xs text-zinc-200 outline-none w-32"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-zinc-200">SSL Certificate Verification</p>
                      <p className="text-[11px] text-zinc-500">Validate server TLS certificates against trusted roots</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={verifySsl}
                      onChange={(e) => setVerifySsl(e.target.checked)}
                      className="rounded border-zinc-700 text-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">Request Timeout (seconds)</label>
                    <input
                      type="number"
                      value={timeoutSeconds}
                      onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
                      className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 font-mono text-xs text-zinc-200 outline-none w-32"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">HTTP / SOCKS Proxy URL</label>
                    <input
                      type="text"
                      placeholder="http://127.0.0.1:8888"
                      value={proxyUrl}
                      onChange={(e) => setProxyUrl(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 font-mono text-xs text-zinc-200 outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Pane: Response Viewer */}
          <div className="w-1/2 flex flex-col bg-zinc-950 overflow-hidden">
            {/* Response Status Bar */}
            <div className="p-3 bg-zinc-900/60 border-b border-zinc-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="text-zinc-400 font-semibold uppercase text-[11px]">Response</span>
                {response && (
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                        response.status >= 200 && response.status < 300
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                          : response.status >= 400 && response.status < 500
                          ? 'bg-amber-950 text-amber-400 border border-amber-800/40'
                          : 'bg-rose-950 text-rose-400 border border-rose-800/40'
                      }`}
                    >
                      {response.status} {response.statusText}
                    </span>
                    <span className="flex items-center gap-1 text-zinc-400 font-mono text-[11px]">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      {response.timeMs} ms
                    </span>
                    <span className="flex items-center gap-1 text-zinc-400 font-mono text-[11px]">
                      <Database className="w-3 h-3 text-zinc-500" />
                      {(response.sizeBytes / 1024).toFixed(1)} KB
                    </span>
                  </div>
                )}
              </div>

              {response && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCopyResponse}
                    className="p-1 text-zinc-400 hover:text-zinc-200 rounded"
                    title="Copy Body"
                  >
                    {copiedResponse ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={handleSaveResponseFile}
                    className="p-1 text-zinc-400 hover:text-zinc-200 rounded"
                    title="Download Response to File"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Response Tabs Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/40 px-3 pt-2 text-xs">
              <div className="flex items-center gap-2">
                {(['body', 'headers', 'cookies', 'tests', 'timeline'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveResponseTab(tab)}
                    className={`pb-2 px-2 uppercase text-[11px] font-bold tracking-wider transition border-b-2 ${
                      activeResponseTab === tab
                        ? 'text-emerald-400 border-emerald-400 bg-zinc-900/40'
                        : 'text-zinc-500 border-transparent hover:text-zinc-300'
                    }`}
                  >
                    {tab}
                    {tab === 'headers' && response && ` (${Object.keys(response.headers).length})`}
                    {tab === 'cookies' && response && ` (${response.cookies?.length || 0})`}
                    {tab === 'tests' && response?.testResults && ` (${response.testResults.filter((t) => t.status === 'passed').length}/${response.testResults.length})`}
                  </button>
                ))}
              </div>

              {activeResponseTab === 'body' && (
                <div className="flex items-center gap-2 pb-1">
                  <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5">
                    <Search className="w-3 h-3 text-zinc-500 mr-1" />
                    <input
                      type="text"
                      placeholder="Search response..."
                      value={responseSearchQuery}
                      onChange={(e) => setResponseSearchQuery(e.target.value)}
                      className="bg-transparent text-[10px] text-zinc-200 outline-none w-24 font-sans"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    {(['pretty', 'raw', 'preview'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setResponseViewMode(mode)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition ${
                          responseViewMode === mode ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Response Body & Panels */}
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
              {!response && !isLoading && (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500 font-sans">
                  <Send className="w-8 h-8 mb-2 opacity-30 text-emerald-400" />
                  <p>Click Send to execute request against local VM or external API.</p>
                </div>
              )}

              {isLoading && (
                <div className="h-full flex flex-col items-center justify-center text-zinc-400 font-sans">
                  <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-2" />
                  <span>Executing HTTP request via native engine...</span>
                </div>
              )}

              {response && (
                <>
                  {response.error && (
                    <div className="mb-3 p-3 bg-rose-950/40 border border-rose-900/60 rounded-lg flex items-center gap-2 text-rose-300 font-sans">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>{response.error}</span>
                    </div>
                  )}

                  {/* 1. BODY TAB */}
                  {activeResponseTab === 'body' && (
                    <div className="h-full">
                      {responseViewMode === 'preview' ? (
                        <iframe
                          srcDoc={response.data}
                          title="Preview"
                          sandbox="allow-same-origin"
                          className="w-full h-full bg-white rounded border border-zinc-800"
                        />
                      ) : (
                        <pre className="text-zinc-200 whitespace-pre-wrap selection:bg-emerald-900/40 leading-relaxed font-mono">
                          {responseViewMode === 'pretty' ? formatJson(response.data) : response.data}
                        </pre>
                      )}
                    </div>
                  )}

                  {/* 2. HEADERS TAB */}
                  {activeResponseTab === 'headers' && (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-zinc-500 border-b border-zinc-800 pb-1 text-[11px] font-sans">
                          <th className="py-1">Header Name</th>
                          <th className="py-1">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-850">
                        {Object.entries(response.headers).map(([k, v]) => (
                          <tr key={k} className="hover:bg-zinc-900/60 text-[11px]">
                            <td className="py-1.5 font-bold text-zinc-300 font-mono">{k}</td>
                            <td className="py-1.5 text-zinc-400 font-mono break-all">{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* 3. COOKIES TAB */}
                  {activeResponseTab === 'cookies' && (
                    <div className="space-y-2">
                      {response.cookies && response.cookies.length > 0 ? (
                        <table className="w-full text-left border-collapse font-mono text-[11px]">
                          <thead>
                            <tr className="text-zinc-500 border-b border-zinc-800 font-sans">
                              <th className="py-1">Name</th>
                              <th className="py-1">Value</th>
                              <th className="py-1">Domain</th>
                              <th className="py-1">Path</th>
                              <th className="py-1">Flags</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-850">
                            {response.cookies.map((c, i) => (
                              <tr key={i} className="hover:bg-zinc-900/40">
                                <td className="py-1.5 font-bold text-emerald-400">{c.name}</td>
                                <td className="py-1.5 text-zinc-300 truncate max-w-32">{c.value}</td>
                                <td className="py-1.5 text-zinc-400">{c.domain || 'Host'}</td>
                                <td className="py-1.5 text-zinc-400">{c.path}</td>
                                <td className="py-1.5 text-zinc-500 text-[10px]">
                                  {c.secure ? 'Secure ' : ''}
                                  {c.httpOnly ? 'HttpOnly' : ''}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="text-zinc-500 font-sans text-xs">No response cookies received.</p>
                      )}
                    </div>
                  )}

                  {/* 4. TESTS TAB */}
                  {activeResponseTab === 'tests' && (
                    <div className="space-y-3 font-sans">
                      <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg space-y-2">
                        <div className="flex items-center justify-between pb-1 border-b border-zinc-800 text-xs">
                          <span className="font-bold text-zinc-200">Postman Test Execution Summary</span>
                          <span className="font-mono text-emerald-400 text-xs">
                            {response.testResults?.filter((t) => t.status === 'passed').length} /{' '}
                            {response.testResults?.length || 0} Passed
                          </span>
                        </div>

                        <div className="space-y-1.5 font-mono text-xs">
                          {response.testResults?.map((t, idx) => (
                            <div
                              key={idx}
                              className={`flex items-start gap-2 p-2 rounded ${
                                t.status === 'passed' ? 'bg-emerald-950/20 text-emerald-300' : 'bg-rose-950/20 text-rose-300'
                              }`}
                            >
                              <span>{t.status === 'passed' ? '✓' : '✗'}</span>
                              <div className="space-y-0.5">
                                <p className="font-bold">{t.name}</p>
                                {t.error && <p className="text-[10px] text-rose-400 font-sans">{t.error}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 5. TIMELINE TAB */}
                  {activeResponseTab === 'timeline' && (
                    <div className="space-y-3 font-sans">
                      <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg space-y-3">
                        <h4 className="font-bold text-zinc-200 text-xs">Network Timing Breakdown</h4>

                        {response.timing ? (
                          <div className="space-y-2 font-mono text-[11px]">
                            <div className="flex items-center justify-between">
                              <span className="text-zinc-400">DNS Lookup:</span>
                              <span className="text-blue-400">{response.timing.dnsLookupMs ?? response.timing.dns_lookup_ms ?? 0} ms</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-zinc-400">TCP Handshake:</span>
                              <span className="text-emerald-400">{response.timing.tcpConnectMs ?? response.timing.tcp_connect_ms ?? 0} ms</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-zinc-400">TLS Negotiation:</span>
                              <span className="text-amber-400">{response.timing.tlsHandshakeMs ?? response.timing.tls_handshake_ms ?? 0} ms</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-zinc-400">Time to First Byte (TTFB):</span>
                              <span className="text-purple-400">{response.timing.ttfbMs ?? response.timing.ttfb_ms ?? 0} ms</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-zinc-400">Content Transfer:</span>
                              <span className="text-teal-400">{response.timing.contentTransferMs ?? response.timing.content_transfer_ms ?? 0} ms</span>
                            </div>
                            <div className="pt-2 border-t border-zinc-800 flex items-center justify-between font-bold text-zinc-100">
                              <span>Total Duration:</span>
                              <span className="text-emerald-400">{response.timeMs} ms</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-zinc-500 text-xs">Detailed timing not reported for this protocol.</p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. CODE SNIPPET MODAL */}
      {showCodeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <span className="font-bold text-zinc-100 text-sm flex items-center gap-2">
                <Code className="w-4 h-4 text-emerald-400" />
                Generate Client Code
              </span>
              <button onClick={() => setShowCodeModal(false)} className="text-zinc-400 hover:text-zinc-200">
                ✕
              </button>
            </div>

            <div className="flex items-center gap-2">
              {(['curl', 'javascript', 'python', 'rust', 'go'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setSelectedLanguage(lang)}
                  className={`px-3 py-1 rounded text-xs font-semibold uppercase transition ${
                    selectedLanguage === lang ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>

            <pre className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg font-mono text-xs text-zinc-200 max-h-80 overflow-y-auto whitespace-pre-wrap selection:bg-emerald-900/40">
              {generateCodeSnippet(
                {
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
                  },
                  bodyType,
                  bodyContent,
                  graphqlQuery,
                  graphqlVariables,
                },
                substituteEnv(url),
                selectedLanguage
              )}
            </pre>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  const snip = generateCodeSnippet(
                    {
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
                      },
                      bodyType,
                      bodyContent,
                      graphqlQuery,
                      graphqlVariables,
                    },
                    substituteEnv(url),
                    selectedLanguage
                  );
                  navigator.clipboard.writeText(snip);
                  alert('Code snippet copied to clipboard');
                }}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. COLLECTION RUNNER MODAL */}
      {showRunnerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <span className="font-bold text-zinc-100 text-sm flex items-center gap-2">
                <Play className="w-4 h-4 text-emerald-400" />
                Collection Runner Suite
              </span>
              <button onClick={() => setShowRunnerModal(false)} className="text-zinc-400 hover:text-zinc-200">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1">Target Collection</label>
                <select
                  value={runnerCollectionId}
                  onChange={(e) => setRunnerCollectionId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-zinc-200 outline-none"
                >
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-zinc-400 block mb-1">Iterations</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={runnerIterations}
                  onChange={(e) => setRunnerIterations(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 font-mono text-zinc-200 outline-none"
                />
              </div>
              <div>
                <label className="text-zinc-400 block mb-1">Delay (ms)</label>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={runnerDelayMs}
                  onChange={(e) => setRunnerDelayMs(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 font-mono text-zinc-200 outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleRunCollectionSuite}
              disabled={isRunnerActive}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isRunnerActive ? 'Executing Collection Suite...' : 'Start Execution Run'}</span>
            </button>

            {runnerReport && (
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 space-y-2 max-h-60 overflow-y-auto">
                <div className="flex items-center justify-between text-xs font-bold pb-1 border-b border-zinc-850">
                  <span className="text-zinc-300">Run Results:</span>
                  <span className="text-emerald-400 font-mono">
                    {runnerReport.passedRequests} Passed / {runnerReport.failedRequests} Failed ({runnerReport.totalDurationMs}ms)
                  </span>
                </div>
                <div className="space-y-1 font-mono text-[11px]">
                  {runnerReport.results.map((r, i) => (
                    <div key={i} className="flex items-center justify-between p-1 bg-zinc-900/60 rounded">
                      <div className="flex items-center gap-2 truncate">
                        <span className={r.status >= 200 && r.status < 400 ? 'text-emerald-400' : 'text-rose-400'}>
                          {r.status >= 200 && r.status < 400 ? '✓' : '✗'}
                        </span>
                        <span className="text-zinc-300 font-bold">{r.method}</span>
                        <span className="text-zinc-400 truncate max-w-64">{r.name}</span>
                      </div>
                      <span className="text-zinc-500">{r.timeMs}ms</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <span className="font-bold text-zinc-100 text-sm flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-400" />
                Import APIs & Collections
              </span>
              <button onClick={() => setShowImportModal(false)} className="text-zinc-400 hover:text-zinc-200">
                ✕
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => setImportFormat('postman')}
                className={`flex-1 py-1.5 rounded font-bold uppercase transition ${
                  importFormat === 'postman' ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                Postman v2.1
              </button>
              <button
                onClick={() => setImportFormat('openapi')}
                className={`flex-1 py-1.5 rounded font-bold uppercase transition ${
                  importFormat === 'openapi' ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                OpenAPI 3.x
              </button>
              <button
                onClick={() => setImportFormat('curl')}
                className={`flex-1 py-1.5 rounded font-bold uppercase transition ${
                  importFormat === 'curl' ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                cURL Command
              </button>
            </div>

            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={
                importFormat === 'curl'
                  ? 'curl -X POST https://api.example.com/users -H "Content-Type: application/json" -d \'{"name":"Alice"}\''
                  : 'Paste JSON specification content here...'
              }
              rows={8}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 font-mono text-xs text-zinc-100 outline-none resize-none"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteImport}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold"
              >
                Import into Workbench
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MANAGE ENVIRONMENTS MODAL */}
      {showEnvModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-xl p-5 shadow-2xl space-y-4 font-sans">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <span className="font-bold text-zinc-100 text-sm flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-400" />
                Manage Environments & Variables
              </span>
              <button onClick={() => setShowEnvModal(false)} className="text-zinc-400 hover:text-zinc-200">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300">
                  Active: {environments.find((e) => e.id === selectedEnvId)?.name}
                </span>
                <button
                  onClick={() => {
                    const env = environments.find((e) => e.id === selectedEnvId);
                    if (!env) return;
                    const updated = environments.map((e) =>
                      e.id === selectedEnvId
                        ? { ...e, variables: { ...e.variables, new_var: 'value' } }
                        : e
                    );
                    persistEnvironments(updated);
                  }}
                  className="text-emerald-400 hover:underline text-xs flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Variable
                </button>
              </div>

              <div className="space-y-1.5 font-mono text-xs max-h-60 overflow-y-auto">
                {Object.entries(
                  environments.find((e) => e.id === selectedEnvId)?.variables || {}
                ).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2">
                    <input
                      type="text"
                      defaultValue={k}
                      onBlur={(e) => {
                        const newKey = e.target.value.trim();
                        if (newKey && newKey !== k) {
                          const env = environments.find((en) => en.id === selectedEnvId);
                          if (!env) return;
                          const vars = { ...env.variables };
                          delete vars[k];
                          vars[newKey] = v;
                          persistEnvironments(
                            environments.map((en) => (en.id === selectedEnvId ? { ...en, variables: vars } : en))
                          );
                        }
                      }}
                      className="w-1/2 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-purple-400"
                    />
                    <input
                      type="text"
                      defaultValue={v}
                      onBlur={(e) => {
                        const newVal = e.target.value;
                        const env = environments.find((en) => en.id === selectedEnvId);
                        if (!env) return;
                        const vars = { ...env.variables, [k]: newVal };
                        persistEnvironments(
                          environments.map((en) => (en.id === selectedEnvId ? { ...en, variables: vars } : en))
                        );
                      }}
                      className="w-1/2 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-200"
                    />
                    <button
                      onClick={() => {
                        const env = environments.find((en) => en.id === selectedEnvId);
                        if (!env) return;
                        const vars = { ...env.variables };
                        delete vars[k];
                        persistEnvironments(
                          environments.map((en) => (en.id === selectedEnvId ? { ...en, variables: vars } : en))
                        );
                      }}
                      className="p-1 text-zinc-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                onClick={() => setShowEnvModal(false)}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold"
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
