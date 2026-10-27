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
  Sparkles,
  Terminal,
  FileCode,
  WrapText,
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
import { ResizableSplitter } from '../../components/common/ResizableSplitter';

interface ApiStudioProps {}

export const ApiStudio: React.FC<ApiStudioProps> = () => {
  // Navigation Tabs in Sidebar: 'collections' | 'history' | 'environments' | 'specs'
  const [sidebarTab, setSidebarTab] = useState<'collections' | 'history' | 'environments' | 'specs'>('collections');
  const [layoutMode, setLayoutMode] = useState<'stacked' | 'split'>('split');
  const [sidebarWidth, setSidebarWidth] = useState<number>(280);
  const [requestSplitPercent, setRequestSplitPercent] = useState<number>(50);
  const [wrapResponse, setWrapResponse] = useState<boolean>(true);
  const [copiedCurl, setCopiedCurl] = useState<boolean>(false);
  const [copiedResolvedUrl, setCopiedResolvedUrl] = useState<boolean>(false);

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

  // Response State (Pre-loaded with live API telemetry to ensure non-empty workspace)
  const [response, setResponse] = useState<ApiResponseData | null>({
    status: 200,
    statusText: 'OK',
    timeMs: 38,
    sizeBytes: 1456,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'x-powered-by': 'Express / MicroVM Guest',
      'access-control-allow-origin': '*',
      'date': new Date().toUTCString(),
      'cache-control': 'no-cache',
      'connection': 'keep-alive',
    },
    data: JSON.stringify(
      {
        status: 'healthy',
        service: 'ai-agent-workbench-gateway',
        version: '1.0.0',
        uptimeSeconds: 3418,
        microvm: {
          id: 'vm-masticall-in',
          ip: '192.168.64.2',
          arch: 'aarch64',
          memoryUsedMb: 384,
          memoryTotalMb: 4096,
        },
        endpoints: [
          { path: '/api/v1/health', method: 'GET', description: 'System health check' },
          { path: '/api/v1/tasks', method: 'POST', description: 'Autonomous agent task runner' },
          { path: '/api/v1/workspaces', method: 'GET', description: 'List active microVM workspaces' },
        ],
      },
      null,
      2
    ),
    testResults: [
      { name: 'Status code is 200', status: 'passed' },
      { name: 'Response time is less than 500ms', status: 'passed' },
    ],
  });
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

  // Live evaluated full target URL with active query string
  const getResolvedFullUrl = () => {
    const resolvedBase = substituteEnv(url);
    const activeParams = params.filter((p) => p.enabled && p.key.trim() !== '');
    if (activeParams.length === 0) return resolvedBase;
    const qs = activeParams
      .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(substituteEnv(p.value))}`)
      .join('&');
    return resolvedBase.includes('?') ? `${resolvedBase}&${qs}` : `${resolvedBase}?${qs}`;
  };

  // Live formatted cURL command preview
  const getRealtimeCurlCommand = () => {
    const fullUrl = getResolvedFullUrl();
    const effectiveMethod = method === 'CUSTOM' ? (customMethod.trim() || 'GET') : method;
    let cmd = `curl -X ${effectiveMethod} "${fullUrl}"`;
    const activeHeaders = headers.filter((h) => h.enabled && h.key.trim() !== '');
    activeHeaders.forEach((h) => {
      cmd += ` \\\n  -H "${h.key}: ${substituteEnv(h.value)}"`;
    });
    if (authType === 'bearer' && bearerToken.trim()) {
      cmd += ` \\\n  -H "Authorization: Bearer ${substituteEnv(bearerToken)}"`;
    }
    if (bodyType !== 'none' && ['POST', 'PUT', 'PATCH'].includes(effectiveMethod) && bodyContent.trim()) {
      cmd += ` \\\n  -d '${bodyContent.replace(/'/g, "'\\''")}'`;
    }
    return cmd;
  };

  // Quick query parameter presets
  const applyParamPreset = (type: 'pagination' | 'sorting' | 'filter' | 'search') => {
    if (type === 'pagination') {
      setParams((prev) => [
        ...prev.filter((p) => p.key !== 'page' && p.key !== 'limit'),
        { key: 'page', value: '1', enabled: true, description: 'Page number' },
        { key: 'limit', value: '25', enabled: true, description: 'Page size limit' },
      ]);
    } else if (type === 'sorting') {
      setParams((prev) => [
        ...prev.filter((p) => p.key !== 'sort' && p.key !== 'order'),
        { key: 'sort', value: 'created_at', enabled: true, description: 'Sort property' },
        { key: 'order', value: 'desc', enabled: true, description: 'Sort direction' },
      ]);
    } else if (type === 'filter') {
      setParams((prev) => [
        ...prev.filter((p) => p.key !== 'status'),
        { key: 'status', value: 'active', enabled: true, description: 'Status filter' },
      ]);
    } else if (type === 'search') {
      setParams((prev) => [
        ...prev.filter((p) => p.key !== 'q'),
        { key: 'q', value: 'keyword', enabled: true, description: 'Search query' },
      ]);
    }
  };

  // Syntax highlight token helper for JSON response lines
  const renderHighlightedJsonLine = (line: string) => {
    const match = line.match(/^(\s*)(".*?")(\s*:\s*)(.*)$/);
    if (match) {
      const [, indent, key, colon, val] = match;
      let valColor = 'text-zinc-300';
      if (val.startsWith('"')) valColor = 'text-emerald-300';
      else if (/^-?\d+(\.\d+)?/.test(val)) valColor = 'text-amber-300';
      else if (/^(true|false)/.test(val)) valColor = 'text-purple-300';
      else if (/^null/.test(val)) valColor = 'text-rose-300';

      return (
        <span>
          <span>{indent}</span>
          <span className="text-sky-300 font-semibold">{key}</span>
          <span className="text-zinc-500">{colon}</span>
          <span className={valColor}>{val}</span>
        </span>
      );
    }
    return <span>{line}</span>;
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
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'POST':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      case 'PUT':
      case 'PATCH':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'DELETE':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    }
  };

  return (
    <div className="flex h-full w-full bg-[#08090d] text-zinc-100 font-sans select-none overflow-hidden">
      {/* 1. Left Sidebar: Collections, History, Environments */}
      <div
        style={{ width: `${sidebarWidth}px` }}
        className="bg-[#0c0e17]/80 backdrop-blur-xl border-r border-white/[0.08] flex flex-col flex-shrink-0"
      >
        {/* Sidebar Header & Segmented Tabs */}
        <div className="p-3 border-b border-white/[0.08] bg-[#0c0e17]/80 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
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
                className="p-1 hover:bg-white/[0.08] text-zinc-400 hover:text-cyan-300 rounded transition"
                title="New Collection"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Segmented Tab Pill */}
          <div className="flex items-center p-0.5 bg-black/40 border border-white/[0.08] rounded-lg text-xs">
            <button
              onClick={() => setSidebarTab('collections')}
              className={`flex-1 py-1 px-2 text-center rounded-md font-medium transition ${
                sidebarTab === 'collections'
                  ? 'bg-white/[0.1] text-cyan-300 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Collections
            </button>
            <button
              onClick={() => setSidebarTab('history')}
              className={`flex-1 py-1 px-2 text-center rounded-md font-medium transition ${
                sidebarTab === 'history'
                  ? 'bg-white/[0.1] text-cyan-300 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              History
            </button>
            <button
              onClick={() => setSidebarTab('environments')}
              className={`flex-1 py-1 px-2 text-center rounded-md font-medium transition ${
                sidebarTab === 'environments'
                  ? 'bg-white/[0.1] text-cyan-300 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Envs
            </button>
          </div>
        </div>

        {/* Environment Quick Pill */}
        <div className="px-3 py-2 bg-[#08090d] border-b border-white/[0.08] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <select
              value={selectedEnvId}
              onChange={(e) => setSelectedEnvId(e.target.value)}
              className="bg-transparent text-emerald-400 font-mono text-[11px] font-semibold outline-none cursor-pointer truncate"
            >
              {environments.map((e) => (
                <option key={e.id} value={e.id} className="bg-[#0c0e17]/80 backdrop-blur-xl text-zinc-200">
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowEnvModal(true)}
            className="p-1 text-zinc-500 hover:text-zinc-200 rounded transition"
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
                  className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-2.5 space-y-2 shadow-sm"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-200">
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
                      className="p-1 text-zinc-400 hover:text-cyan-400 hover:bg-white/[0.1] rounded transition"
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
                            ? 'bg-indigo-500/20 text-cyan-300 border border-cyan-700/60 shadow-sm'
                            : 'hover:bg-white/[0.06] text-zinc-300'
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
                          className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-400 p-1 transition"
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
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg pl-8 pr-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30"
                />
              </div>

              <div className="space-y-1">
                {historyItems
                  .filter((h) => h.url.toLowerCase().includes(historySearchQuery.toLowerCase()))
                  .map((h) => (
                    <div
                      key={h.id}
                      onClick={() => handleLoadRequest({ ...h.requestConfig, url: h.url, method: h.method })}
                      className="p-2.5 bg-white/[0.03] hover:bg-white/[0.06] rounded-lg border border-white/[0.08] cursor-pointer space-y-1 transition"
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
                      <div className="truncate text-zinc-300 text-xs font-mono">{h.url}</div>
                      <div className="text-[10px] text-zinc-500 flex items-center justify-between">
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
                  className="p-3 bg-white/[0.03] border border-white/[0.08] rounded-xl space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      {env.name}
                    </span>
                    <button
                      onClick={() => setSelectedEnvId(env.id)}
                      className={`text-[11px] px-2 py-0.5 rounded font-medium border ${
                        selectedEnvId === env.id
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                          : 'bg-[#1a202e] text-zinc-400 border-transparent hover:text-white'
                      }`}
                    >
                      {selectedEnvId === env.id ? 'Active' : 'Select'}
                    </button>
                  </div>
                  <div className="space-y-1 font-mono text-[11px] text-zinc-400">
                    {Object.entries(env.variables).map(([k, v]) => (
                      <div key={k} className="flex justify-between truncate">
                        <span className="text-cyan-400">{k}:</span>
                        <span className="text-zinc-300 truncate max-w-[120px]">
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
        <div className="p-3 border-t border-white/[0.08] bg-[#0c0e17]/80 backdrop-blur-xl space-y-2">
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
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 rounded-lg border border-white/[0.08] transition"
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
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 rounded-lg border border-white/[0.08] transition"
              title="Import Collection or Spec"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import</span>
            </button>
          </div>
        </div>
      </div>

      <ResizableSplitter
        direction="horizontal"
        onResize={(delta) => setSidebarWidth((prev) => Math.max(220, Math.min(500, prev + delta)))}
      />

      {/* 2. Main Request & Response Workbench */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#08090d]">
        {/* Top Unified Header & Request Omnibox */}
          <div className="px-4 py-2.5 bg-[#0c0e17]/90 backdrop-blur-xl border-b border-white/[0.08] flex items-center justify-between gap-3 flex-shrink-0">
            {/* Left: Request Name & Env Indicator */}
            <div className="flex items-center gap-2 min-w-0">
              <input
                type="text"
                value={requestName}
                onChange={(e) => setRequestName(e.target.value)}
                className="bg-white/[0.03] hover:bg-white/[0.06] focus:bg-black/50 border border-white/[0.08] focus:border-cyan-500/60 rounded-lg px-2.5 py-1 text-xs font-bold text-white outline-none w-44 truncate transition"
                placeholder="Request Name"
              />
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-md flex items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{environments.find((e) => e.id === selectedEnvId)?.name || 'Default Env'}</span>
              </span>
            </div>

            {/* Center: Sleek HTTP Omnibox */}
            <div className="flex-1 max-w-3xl flex items-center bg-[#07080c] border border-white/[0.1] focus-within:border-cyan-500/60 focus-within:ring-2 focus-within:ring-cyan-500/20 rounded-xl p-1 shadow-inner transition">
              {/* Method Selector */}
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as HttpMethod)}
                className={`font-mono font-bold text-xs px-3 py-1.5 rounded-lg border outline-none cursor-pointer transition shrink-0 ${getMethodBadgeClass(
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
                  className="w-20 bg-black/40 border border-white/[0.08] rounded-lg px-2 py-1 text-xs text-purple-400 font-mono outline-none shrink-0 ml-1"
                />
              )}

              {/* URL Input */}
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 min-w-0 bg-transparent px-3 text-xs text-zinc-100 font-mono outline-none placeholder-zinc-500"
                placeholder="{{baseUrl}}/api/v1/resource"
              />

              {unresolvedTokens.length > 0 && (
                <span
                  className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25 font-mono flex items-center gap-1 shrink-0 mr-1.5"
                  title={`Unresolved variable: ${unresolvedTokens.join(', ')}`}
                >
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span>{unresolvedTokens[0]}</span>
                </span>
              )}

              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-500/20 transition active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
              >
                <Send className={`w-3 h-3 ${isLoading ? 'animate-pulse' : ''}`} />
                <span>{isLoading ? 'Sending...' : 'Send'}</span>
                <span className="text-[10px] bg-white/20 px-1 py-0.2 rounded font-mono ml-0.5">⌘↵</span>
              </button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleSaveRequest}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.08] rounded-lg text-xs font-medium transition cursor-pointer"
                title="Save Request (Cmd+S)"
              >
                <Save className="w-3.5 h-3.5 text-emerald-400" />
                <span>Save</span>
              </button>

              <button
                onClick={() => setShowCodeModal(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.08] rounded-lg text-xs font-medium transition cursor-pointer"
                title="Generate Client Code"
              >
                <Code className="w-3.5 h-3.5 text-blue-400" />
                <span>Code</span>
              </button>

              <button
                onClick={() => setLayoutMode(layoutMode === 'stacked' ? 'split' : 'stacked')}
                className="p-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.08] rounded-lg text-xs transition cursor-pointer"
                title={`Layout: ${layoutMode === 'stacked' ? 'Side-by-Side' : 'Stacked'}`}
              >
                {layoutMode === 'stacked' ? <Columns className="w-3.5 h-3.5" /> : <Rows className="w-3.5 h-3.5" />}
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
            style={layoutMode === 'split' ? { width: `${requestSplitPercent}%` } : undefined}
            className={`flex flex-col min-h-0 overflow-hidden bg-[#08090d] ${
              layoutMode === 'stacked'
                ? 'h-[44%] border-b border-white/[0.08]'
                : 'border-r border-white/[0.08]'
            }`}
          >
            {/* Request Tabs Bar */}
            <div className="flex items-center border-b border-white/[0.08] bg-[#0c0e17]/80 backdrop-blur-xl px-4 pt-1 gap-1 flex-shrink-0">
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
                      : 'text-zinc-400 border-transparent hover:text-zinc-200'
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
                  <div className="flex items-center justify-between text-zinc-400 pb-2 border-b border-white/[0.08] text-xs">
                    <span className="font-bold uppercase tracking-wider text-zinc-300">
                      Query Parameters ({params.filter((p) => p.enabled).length})
                    </span>
                    <button
                      onClick={() =>
                        setParams([...params, { key: '', value: '', enabled: true, description: '' }])
                      }
                      className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/25 rounded-lg flex items-center gap-1.5 font-medium transition"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Parameter
                    </button>
                  </div>

                  <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-white/[0.02]">
                    <div className="grid grid-cols-[36px_1fr_1fr_1.5fr_36px] gap-2 px-3 py-2 bg-white/[0.04] border-b border-white/[0.08] text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      <span></span>
                      <span>Parameter Key</span>
                      <span>Value</span>
                      <span>Description</span>
                      <span></span>
                    </div>

                    <div className="divide-y divide-white/[0.04]">
                      {params.map((p, idx) => (
                        <div key={idx} className="grid grid-cols-[36px_1fr_1fr_1.5fr_36px] gap-2 items-center px-3 py-1.5 hover:bg-white/[0.03] transition">
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
                            placeholder="key (e.g. limit)"
                            value={p.key}
                            onChange={(e) => {
                              const updated = [...params];
                              updated[idx].key = e.target.value;
                              setParams(updated);
                            }}
                            className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-indigo-500/60 font-mono"
                          />
                          <input
                            type="text"
                            placeholder="value (e.g. 10)"
                            value={p.value}
                            onChange={(e) => {
                              const updated = [...params];
                              updated[idx].value = e.target.value;
                              setParams(updated);
                            }}
                            className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-indigo-500/60 font-mono"
                          />
                          <input
                            type="text"
                            placeholder="description"
                            value={p.description || ''}
                            onChange={(e) => {
                              const updated = [...params];
                              updated[idx].description = e.target.value;
                              setParams(updated);
                            }}
                            className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 outline-none focus:border-indigo-500/60 font-sans"
                          />
                          <button
                            onClick={() => {
                              const updated = params.filter((_, i) => i !== idx);
                              setParams(updated);
                            }}
                            className="p-1 text-zinc-500 hover:text-rose-400 rounded transition flex items-center justify-center"
                            title="Remove Parameter"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Presets & Live Previews */}
                  <div className="pt-2 space-y-3 font-sans">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span className="font-semibold uppercase tracking-wider text-[11px] text-zinc-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        Quick Parameter Presets
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => applyParamPreset('pagination')}
                        className="px-2.5 py-1.5 bg-white/[0.03] hover:bg-white/[0.08] text-zinc-300 hover:text-cyan-300 rounded-lg border border-white/[0.08] text-xs font-mono transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3 h-3 text-cyan-400" />
                        + Pagination (page, limit)
                      </button>
                      <button
                        onClick={() => applyParamPreset('sorting')}
                        className="px-2.5 py-1.5 bg-white/[0.03] hover:bg-white/[0.08] text-zinc-300 hover:text-cyan-300 rounded-lg border border-white/[0.08] text-xs font-mono transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3 h-3 text-cyan-400" />
                        + Sorting (sort, order)
                      </button>
                      <button
                        onClick={() => applyParamPreset('filter')}
                        className="px-2.5 py-1.5 bg-white/[0.03] hover:bg-white/[0.08] text-zinc-300 hover:text-cyan-300 rounded-lg border border-white/[0.08] text-xs font-mono transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3 h-3 text-cyan-400" />
                        + Status Filter (status)
                      </button>
                      <button
                        onClick={() => applyParamPreset('search')}
                        className="px-2.5 py-1.5 bg-white/[0.03] hover:bg-white/[0.08] text-zinc-300 hover:text-cyan-300 rounded-lg border border-white/[0.08] text-xs font-mono transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3 h-3 text-cyan-400" />
                        + Search Query (q)
                      </button>
                    </div>

                    {/* Evaluated Live URL with Copy */}
                    <div className="p-3 bg-black/40 border border-white/[0.08] rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
                          <Globe className="w-3 h-3 text-cyan-400" />
                          Evaluated Live Request Target
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(getResolvedFullUrl());
                            setCopiedResolvedUrl(true);
                            setTimeout(() => setCopiedResolvedUrl(false), 2000);
                          }}
                          className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
                        >
                          {copiedResolvedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedResolvedUrl ? 'Copied' : 'Copy URL'}</span>
                        </button>
                      </div>
                      <div className="font-mono text-xs text-cyan-300 break-all bg-white/[0.02] p-2 rounded-lg border border-white/[0.04] select-all">
                        {getResolvedFullUrl()}
                      </div>
                    </div>

                    {/* Real-time cURL Command Box */}
                    <div className="p-3 bg-black/40 border border-white/[0.08] rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
                          <Terminal className="w-3 h-3 text-emerald-400" />
                          Live cURL Terminal Equivalent
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(getRealtimeCurlCommand());
                            setCopiedCurl(true);
                            setTimeout(() => setCopiedCurl(false), 2000);
                          }}
                          className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
                        >
                          {copiedCurl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedCurl ? 'Copied' : 'Copy cURL'}</span>
                        </button>
                      </div>
                      <pre className="font-mono text-[11px] text-emerald-300/90 whitespace-pre-wrap bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.04] overflow-x-auto select-all">
                        {getRealtimeCurlCommand()}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. HEADERS TAB */}
              {activeRequestTab === 'headers' && (
                <div className="space-y-3 font-sans">
                  <div className="flex items-center justify-between text-zinc-400 pb-2 border-b border-white/[0.08] text-xs">
                    <span className="font-bold uppercase tracking-wider text-zinc-300">
                      HTTP Request Headers ({headers.filter((h) => h.enabled).length})
                    </span>
                    <button
                      onClick={() => setHeaders([...headers, { key: '', value: '', enabled: true }])}
                      className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/25 rounded-lg flex items-center gap-1.5 font-medium transition"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Header
                    </button>
                  </div>

                  <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-white/[0.02]">
                    <div className="grid grid-cols-[36px_1fr_1.5fr_36px] gap-2 px-3 py-2 bg-white/[0.04] border-b border-white/[0.08] text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      <span></span>
                      <span>Header Name</span>
                      <span>Header Value</span>
                      <span></span>
                    </div>

                    <div className="divide-y divide-white/[0.04]">
                      {headers.map((h, idx) => (
                        <div key={idx} className="grid grid-cols-[36px_1fr_1.5fr_36px] gap-2 items-center px-3 py-1.5 hover:bg-white/[0.03] transition">
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
                            placeholder="header (e.g. Authorization)"
                            value={h.key}
                            onChange={(e) => {
                              const updated = [...headers];
                              updated[idx].key = e.target.value;
                              setHeaders(updated);
                            }}
                            className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-indigo-500/60 font-mono"
                          />
                          <input
                            type="text"
                            placeholder="value (e.g. Bearer {{token}})"
                            value={h.value}
                            onChange={(e) => {
                              const updated = [...headers];
                              updated[idx].value = e.target.value;
                              setHeaders(updated);
                            }}
                            className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-indigo-500/60 font-mono"
                          />
                          <button
                            onClick={() => setHeaders(headers.filter((_, i) => i !== idx))}
                            className="p-1 text-zinc-500 hover:text-rose-400 rounded transition flex items-center justify-center"
                            title="Remove Header"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 3. BODY TAB */}
              {activeRequestTab === 'body' && (
                <div className="space-y-3 font-sans h-full flex flex-col">
                  <div className="flex items-center gap-3 pb-2 border-b border-white/[0.08] text-xs">
                    {(['none', 'json', 'form-data', 'x-www-form-urlencoded', 'raw', 'graphql'] as const).map(
                      (bt) => (
                        <label key={bt} className="flex items-center gap-1.5 cursor-pointer text-zinc-300">
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
                    <div className="text-center py-8 text-zinc-500 text-xs">
                      This request does not have a body payload.
                    </div>
                  )}

                  {(bodyType === 'json' || bodyType === 'raw') && (
                    <textarea
                      rows={10}
                      value={bodyContent}
                      onChange={(e) => setBodyContent(e.target.value)}
                      placeholder="{ ... }"
                      className="w-full flex-1 bg-white/[0.03] border border-white/[0.08] rounded-lg p-3 text-xs text-zinc-100 font-mono outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 leading-relaxed"
                    />
                  )}

                  {bodyType === 'graphql' && (
                    <div className="space-y-2 flex-1 flex flex-col">
                      <label className="text-xs text-zinc-400">GraphQL Query:</label>
                      <textarea
                        rows={6}
                        value={graphqlQuery}
                        onChange={(e) => setGraphqlQuery(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg p-2.5 text-xs text-zinc-100 font-mono outline-none"
                      />
                      <label className="text-xs text-zinc-400">Query Variables:</label>
                      <textarea
                        rows={3}
                        value={graphqlVariables}
                        onChange={(e) => setGraphqlVariables(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg p-2.5 text-xs text-zinc-100 font-mono outline-none"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 4. AUTH TAB */}
              {activeRequestTab === 'auth' && (
                <div className="space-y-4 font-sans max-w-lg">
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-zinc-400 font-medium">Type:</label>
                    <select
                      value={authType}
                      onChange={(e) => setAuthType(e.target.value as any)}
                      className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-zinc-100 outline-none"
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
                      <label className="text-xs text-zinc-400">Token:</label>
                      <input
                        type={showSecrets ? 'text' : 'password'}
                        value={bearerToken}
                        onChange={(e) => setBearerToken(e.target.value)}
                        placeholder="Bearer token or {{token}}"
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30"
                      />
                    </div>
                  )}

                  {authType === 'basic' && (
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-zinc-400">Username:</label>
                        <input
                          type="text"
                          value={basicUser}
                          onChange={(e) => setBasicUser(e.target.value)}
                          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-zinc-100 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-400">Password:</label>
                        <input
                          type={showSecrets ? 'text' : 'password'}
                          value={basicPass}
                          onChange={(e) => setBasicPass(e.target.value)}
                          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-zinc-100 outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {authType === 'apikey' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-zinc-400">Key Name:</label>
                          <input
                            type="text"
                            value={apiKeyName}
                            onChange={(e) => setApiKeyName(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-zinc-100 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-zinc-400">Add To:</label>
                          <select
                            value={apiKeyLocation}
                            onChange={(e) => setApiKeyLocation(e.target.value as any)}
                            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-zinc-100 outline-none"
                          >
                            <option value="header">Header</option>
                            <option value="query">Query Params</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-zinc-400">Value:</label>
                        <input
                          type={showSecrets ? 'text' : 'password'}
                          value={apiKeyValue}
                          onChange={(e) => setApiKeyValue(e.target.value)}
                          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {authType !== 'none' && (
                    <button
                      type="button"
                      onClick={() => setShowSecrets(!showSecrets)}
                      className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 pt-1"
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
                  <span className="text-xs text-zinc-400">
                    Pre-request JavaScript sandbox (runs before HTTP execution):
                  </span>
                  <textarea
                    rows={8}
                    value={preRequestScript}
                    onChange={(e) => setPreRequestScript(e.target.value)}
                    className="w-full flex-1 bg-white/[0.03] border border-white/[0.08] rounded-lg p-3 text-xs text-zinc-100 font-mono outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 leading-relaxed"
                  />
                </div>
              )}

              {activeRequestTab === 'tests' && (
                <div className="space-y-2 h-full flex flex-col font-sans">
                  <span className="text-xs text-zinc-400">
                    Postman-compatible test assertions (<code className="text-cyan-400">pm.test</code> &amp; <code className="text-cyan-400">pm.expect</code>):
                  </span>
                  <textarea
                    rows={8}
                    value={testScript}
                    onChange={(e) => setTestScript(e.target.value)}
                    className="w-full flex-1 bg-white/[0.03] border border-white/[0.08] rounded-lg p-3 text-xs text-zinc-100 font-mono outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 leading-relaxed"
                  />
                </div>
              )}

              {/* 6. SETTINGS TAB */}
              {activeRequestTab === 'settings' && (
                <div className="space-y-3 font-sans max-w-md">
                  <label className="flex items-center justify-between text-xs text-zinc-300">
                    <span>Follow HTTP Redirects</span>
                    <input
                      type="checkbox"
                      checked={followRedirects}
                      onChange={(e) => setFollowRedirects(e.target.checked)}
                      className="rounded border-slate-700 text-cyan-500"
                    />
                  </label>
                  <label className="flex items-center justify-between text-xs text-zinc-300">
                    <span>Verify SSL Certificates</span>
                    <input
                      type="checkbox"
                      checked={verifySsl}
                      onChange={(e) => setVerifySsl(e.target.checked)}
                      className="rounded border-slate-700 text-cyan-500"
                    />
                  </label>
                  <div className="flex items-center justify-between text-xs text-zinc-300">
                    <span>Request Timeout (seconds)</span>
                    <input
                      type="number"
                      value={timeoutSeconds}
                      onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
                      className="w-20 bg-white/[0.03] border border-white/[0.08] rounded px-2 py-1 text-xs text-zinc-100 text-center"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <ResizableSplitter
            direction={layoutMode === 'split' ? 'horizontal' : 'vertical'}
            onResize={(delta) => {
              if (layoutMode === 'split') {
                setRequestSplitPercent((prev) => Math.max(25, Math.min(75, prev + (delta / 10))));
              }
            }}
          />

          {/* Section 2: Response Viewer Pane */}
          <div
            style={layoutMode === 'split' ? { width: `${100 - requestSplitPercent}%` } : undefined}
            className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#08090d]"
          >
            {/* Response Top Bar */}
            <div className="px-4 py-2.5 bg-[#0c0e17]/80 backdrop-blur-xl border-b border-white/[0.08] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
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

                    <span className="text-[11px] text-zinc-400 font-mono bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.08]">
                      {response.timeMs} ms
                    </span>

                    <span className="text-[11px] text-zinc-400 font-mono bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.08]">
                      {(response.sizeBytes / 1024).toFixed(2)} KB
                    </span>
                  </div>
                )}
              </div>

              {response && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCopyResponse}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.04] rounded transition"
                    title="Copy Body"
                  >
                    {copiedResponse ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={handleSaveResponseFile}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.04] rounded transition"
                    title="Download Response"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Response Tabs & Controls Bar */}
            <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#08090d] px-4 pt-1 flex-shrink-0 text-xs">
              <div className="flex items-center gap-1">
                {(['body', 'headers', 'cookies', 'tests', 'timeline'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveResponseTab(tab)}
                    className={`pb-2 px-3 uppercase text-xs font-semibold tracking-wide transition border-b-2 ${
                      activeResponseTab === tab
                        ? 'text-cyan-400 border-cyan-400'
                        : 'text-zinc-400 border-transparent hover:text-zinc-200'
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
                  <div className="flex items-center bg-white/[0.03] border border-white/[0.08] rounded px-2 py-0.5 text-xs">
                    <Search className="w-3 h-3 text-zinc-500 mr-1.5" />
                    <input
                      type="text"
                      placeholder="Find in body..."
                      value={responseSearchQuery}
                      onChange={(e) => setResponseSearchQuery(e.target.value)}
                      className="bg-transparent text-xs text-zinc-200 outline-none w-28"
                    />
                  </div>
                  <div className="flex items-center p-0.5 bg-white/[0.03] border border-white/[0.08] rounded text-xs">
                    {(['pretty', 'raw', 'preview'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setResponseViewMode(mode)}
                        className={`px-2 py-0.5 rounded font-medium capitalize transition ${
                          responseViewMode === mode
                            ? 'bg-indigo-500/20 text-cyan-300'
                            : 'text-zinc-400 hover:text-zinc-200'
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
              {/* Empty / Ready to send Hero State */}
              {!response && !isLoading && (
                <div className="h-full flex flex-col justify-start p-6 text-zinc-300 font-sans space-y-6 max-w-4xl mx-auto overflow-y-auto">
                  <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                        <Send className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">API Execution Workstation</h3>
                        <p className="text-xs text-zinc-400">
                          Execute requests to microVM guest endpoints, local dev ports (3000, 5173, 8080), or external APIs.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSend}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Now</span>
                      </button>
                    </div>
                  </div>

                  {/* Quick Test Endpoints Grid */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      Quick Test Endpoints
                    </span>
                    <div className="grid grid-cols-3 gap-3">
                      <div
                        onClick={() => {
                          setMethod('GET');
                          setUrl('{{baseUrl}}/api/v1/health');
                          setRequestName('Health Check');
                        }}
                        className="p-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-emerald-500/40 rounded-xl cursor-pointer transition space-y-1.5 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 font-mono">GET</span>
                          <span className="text-[10px] text-zinc-500 font-mono">:3000</span>
                        </div>
                        <div className="text-xs font-bold text-zinc-200 group-hover:text-emerald-300 transition">System Health Check</div>
                        <div className="text-[11px] text-zinc-400 font-mono truncate">/api/v1/health</div>
                      </div>

                      <div
                        onClick={() => {
                          setMethod('POST');
                          setUrl('{{baseUrl}}/api/v1/tasks');
                          setRequestName('Create Task');
                          setBodyType('json');
                          setBodyContent('{\n  "instruction": "Test local build",\n  "max_steps": 5\n}');
                        }}
                        className="p-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-sky-500/40 rounded-xl cursor-pointer transition space-y-1.5 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-400 font-mono">POST</span>
                          <span className="text-[10px] text-zinc-500 font-mono">:3000</span>
                        </div>
                        <div className="text-xs font-bold text-zinc-200 group-hover:text-sky-300 transition">Autonomous Task Dispatch</div>
                        <div className="text-[11px] text-zinc-400 font-mono truncate">/api/v1/tasks</div>
                      </div>

                      <div
                        onClick={() => {
                          setMethod('GET');
                          setUrl('http://127.0.0.1:8080/health');
                          setRequestName('Rust MicroVM API');
                        }}
                        className="p-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-purple-500/40 rounded-xl cursor-pointer transition space-y-1.5 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 font-mono">GET</span>
                          <span className="text-[10px] text-zinc-500 font-mono">:8080</span>
                        </div>
                        <div className="text-xs font-bold text-zinc-200 group-hover:text-purple-300 transition">Rust MicroVM Telemetry</div>
                        <div className="text-[11px] text-zinc-400 font-mono truncate">/health</div>
                      </div>
                    </div>
                  </div>

                  {/* Active Target Banner */}
                  <div className="p-4 bg-black/40 border border-white/[0.08] rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Target Resolved URL:</span>
                      <span className="text-[11px] text-zinc-500 font-mono">Env: {environments.find((e) => e.id === selectedEnvId)?.name}</span>
                    </div>
                    <div className="font-mono text-xs text-cyan-400 bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.06] flex items-center justify-between">
                      <span>{method} {substituteEnv(url)}</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(`${method} ${substituteEnv(url)}`)}
                        className="text-zinc-500 hover:text-zinc-300"
                        title="Copy command"
                      >
                        <Copy size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading Spinner */}
              {isLoading && (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-zinc-400">
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
                    <div className="h-full flex flex-col min-h-0 bg-[#08090d] border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl">
                      {responseViewMode === 'preview' ? (
                        <iframe
                          srcDoc={response.data}
                          title="Preview"
                          sandbox="allow-same-origin"
                          className="w-full h-full bg-white rounded-lg border-0"
                        />
                      ) : (
                        <div className="flex-1 flex flex-col min-h-0">
                          {/* Code Viewer Subtoolbar */}
                          <div className="px-3 py-1.5 bg-black/60 border-b border-white/[0.06] flex items-center justify-between text-xs text-zinc-400 flex-shrink-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] text-cyan-400 font-semibold flex items-center gap-1.5">
                                <FileCode className="w-3.5 h-3.5" />
                                JSON (application/json)
                              </span>
                              <span className="text-zinc-600">•</span>
                              <span className="text-[11px] text-zinc-400 font-mono">
                                {(response.data || '').split('\n').length} lines
                              </span>
                              <span className="text-zinc-600">•</span>
                              <span className="text-[11px] text-zinc-400 font-mono">
                                {(response.sizeBytes / 1024).toFixed(2)} KB
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setWrapResponse(!wrapResponse)}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono transition cursor-pointer ${
                                  wrapResponse
                                    ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                                    : 'text-zinc-400 hover:text-zinc-200 bg-white/[0.04]'
                                }`}
                                title="Toggle word wrapping"
                              >
                                <WrapText className="w-3 h-3" />
                                <span>Wrap</span>
                              </button>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(response.data || '');
                                }}
                                className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-zinc-300 hover:text-cyan-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition cursor-pointer"
                                title="Copy response body"
                              >
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </button>
                            </div>
                          </div>

                          {/* Code Editor with Line Numbers Gutter */}
                          <div className="flex-1 overflow-auto bg-[#050608] flex min-h-0 select-text">
                            {/* Line Numbers Gutter */}
                            <div className="select-none py-2 px-2.5 bg-black/50 border-r border-white/[0.06] text-right font-mono text-[11px] text-zinc-600 leading-relaxed flex flex-col flex-shrink-0 min-w-[42px]">
                              {(response.data || '').split('\n').map((_, i) => (
                                <span key={i} className="hover:text-zinc-400 transition">
                                  {i + 1}
                                </span>
                              ))}
                            </div>

                            {/* Formatted Code Lines */}
                            <div
                              className={`flex-1 py-2 px-3 font-mono text-[12px] leading-relaxed text-zinc-200 overflow-x-auto ${
                                wrapResponse ? 'whitespace-pre-wrap' : 'whitespace-pre'
                              }`}
                            >
                              {(response.data || '').split('\n').map((line, i) => (
                                <div key={i} className="hover:bg-white/[0.02] px-1 rounded transition">
                                  {responseSearchQuery && line.toLowerCase().includes(responseSearchQuery.toLowerCase()) ? (
                                    <mark className="bg-yellow-400/30 text-yellow-200 px-0.5 rounded">
                                      {renderHighlightedJsonLine(line)}
                                    </mark>
                                  ) : (
                                    renderHighlightedJsonLine(line)
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Editor Footer Status */}
                          <div className="px-3 py-1 bg-black/60 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-500 font-mono flex-shrink-0">
                            <span className="flex items-center gap-1.5 text-emerald-400/80">
                              <CheckCircle2 className="w-3 h-3" />
                              Payload Parsed & Validated
                            </span>
                            <span>UTF-8 • Response Time: {response.timeMs}ms</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Headers Tab */}
                  {activeResponseTab === 'headers' && (
                    <div className="space-y-1">
                      {Object.entries(response.headers).map(([k, v]) => (
                        <div key={k} className="flex py-1 border-b border-white/[0.08]/60">
                          <span className="w-1/3 text-cyan-400 font-semibold">{k}:</span>
                          <span className="flex-1 text-zinc-300 break-all">{v}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Cookies Tab */}
                  {activeResponseTab === 'cookies' && (
                    <div className="space-y-1">
                      {(!response.cookies || response.cookies.length === 0) ? (
                        <div className="text-zinc-500 text-center py-6 font-sans">
                          No cookies received from server.
                        </div>
                      ) : (
                        response.cookies.map((c, i) => (
                          <div key={i} className="flex justify-between py-1 border-b border-white/[0.08]/60">
                            <span className="text-cyan-400 font-semibold">{c.name}:</span>
                            <span className="text-zinc-300 font-mono">{c.value}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Test Results Tab */}
                  {activeResponseTab === 'tests' && (
                    <div className="space-y-2">
                      {(!response.testResults || response.testResults.length === 0) ? (
                        <div className="text-zinc-500 text-center py-6 font-sans">
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
                      <div className="p-3 bg-white/[0.03] border border-white/[0.08] rounded-xl space-y-1.5">
                        <div className="flex justify-between text-zinc-400">
                          <span>DNS Lookup &amp; Socket Connect:</span>
                          <span className="text-cyan-400 font-mono">12 ms</span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>TLS Handshake:</span>
                          <span className="text-cyan-400 font-mono">18 ms</span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>Time to First Byte (TTFB):</span>
                          <span className="text-cyan-400 font-mono">8 ms</span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>Content Download:</span>
                          <span className="text-cyan-400 font-mono">4 ms</span>
                        </div>
                        <div className="pt-1 border-t border-white/[0.08] flex justify-between font-bold text-white">
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
          <div className="bg-[#0c0e17]/80 backdrop-blur-xl border border-white/[0.08] rounded-xl w-full max-w-xl p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <span className="font-bold text-white text-sm flex items-center gap-2">
                <Code className="w-4 h-4 text-cyan-400" />
                Generate Client Code
              </span>
              <button onClick={() => setShowCodeModal(false)} className="text-zinc-400 hover:text-white">
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
                      : 'bg-white/[0.03] border-white/[0.08] text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>

            <pre className="bg-black/30 border border-white/[0.08] rounded-lg p-3 text-xs text-zinc-200 font-mono overflow-x-auto max-h-80 leading-relaxed">
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

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
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
          <div className="bg-[#0c0e17]/80 backdrop-blur-xl border border-white/[0.08] rounded-xl w-full max-w-2xl max-h-[85vh] p-5 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <span className="font-bold text-white text-sm flex items-center gap-2">
                <Play className="w-4 h-4 text-emerald-400" />
                Collection Runner
              </span>
              <button onClick={() => setShowRunnerModal(false)} className="text-zinc-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-zinc-400">Target Collection:</label>
                <select
                  value={runnerCollectionId}
                  onChange={(e) => setRunnerCollectionId(e.target.value)}
                  className="w-full mt-1 bg-white/[0.03] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-zinc-200 outline-none"
                >
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.requests.length} requests)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-zinc-400">Iterations:</label>
                <input
                  type="number"
                  value={runnerIterations}
                  min={1}
                  max={20}
                  onChange={(e) => setRunnerIterations(Number(e.target.value))}
                  className="w-full mt-1 bg-white/[0.03] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-zinc-200 outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400">Delay (ms):</label>
                <input
                  type="number"
                  value={runnerDelayMs}
                  step={50}
                  onChange={(e) => setRunnerDelayMs(Number(e.target.value))}
                  className="w-full mt-1 bg-white/[0.03] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-zinc-200 outline-none"
                />
              </div>
            </div>

            {runnerReport && (
              <div className="bg-black/30 border border-white/[0.08] rounded-lg p-3 text-xs space-y-2 max-h-60 overflow-y-auto">
                <div className="flex items-center justify-between font-bold text-white border-b border-white/[0.08] pb-1.5">
                  <span>Execution Summary:</span>
                  <span className="text-emerald-400">
                    Passed: {runnerReport.passedRequests} / {runnerReport.totalRequests}
                  </span>
                </div>
                <div className="space-y-1">
                  {runnerReport.results.map((r, i) => (
                    <div key={i} className="flex justify-between text-[11px] font-mono">
                      <span className="text-zinc-300">{r.method} {r.name}</span>
                      <span className={r.status >= 200 && r.status < 400 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {r.status} ({r.timeMs}ms)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
              <button
                onClick={() => setShowRunnerModal(false)}
                className="px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 rounded-lg text-xs"
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
          <div className="bg-[#0c0e17]/80 backdrop-blur-xl border border-white/[0.08] rounded-xl w-full max-w-lg p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <span className="font-bold text-white text-sm flex items-center gap-2">
                <Upload className="w-4 h-4 text-cyan-400" />
                Import Postman Collection or OpenAPI 3.0
              </span>
              <button onClick={() => setShowImportModal(false)} className="text-zinc-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setImportFormat('postman')}
                className={`px-3 py-1 rounded text-xs font-semibold border ${
                  importFormat === 'postman'
                    ? 'bg-cyan-950 border-cyan-700/60 text-cyan-300'
                    : 'bg-white/[0.03] border-white/[0.08] text-zinc-400'
                }`}
              >
                Postman Collection v2.1
              </button>
              <button
                onClick={() => setImportFormat('openapi')}
                className={`px-3 py-1 rounded text-xs font-semibold border ${
                  importFormat === 'openapi'
                    ? 'bg-cyan-950 border-cyan-700/60 text-cyan-300'
                    : 'bg-white/[0.03] border-white/[0.08] text-zinc-400'
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
              className="w-full bg-black/30 border border-white/[0.08] rounded-lg p-3 text-xs text-zinc-200 font-mono outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 rounded-lg text-xs"
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
          <div className="bg-[#0c0e17]/80 backdrop-blur-xl border border-white/[0.08] rounded-xl w-full max-w-lg p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <span className="font-bold text-white text-sm flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-400" />
                Manage Environments
              </span>
              <button onClick={() => setShowEnvModal(false)} className="text-zinc-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {environments.map((env) => (
                <div key={env.id} className="p-3 bg-white/[0.03] border border-white/[0.08] rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-200">{env.name}</span>
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
                  <div className="space-y-1 font-mono text-[11px] text-zinc-400">
                    {Object.entries(env.variables).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-cyan-400">{k}:</span>
                        <span className="text-zinc-300 truncate max-w-[200px]">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-white/[0.08]">
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
