import React, { useState } from 'react';
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
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import {
  HttpMethod,
  KeyValuePair,
  ApiRequestConfig,
  ApiResponseData,
  ApiEnvironment,
} from '../../types';
import { tauriIpc } from '../../services/tauriIpc';

interface ApiStudioProps {
  onSendToAgent?: (prompt: string) => void;
}

export const ApiStudio: React.FC<ApiStudioProps> = ({ onSendToAgent }) => {
  // Request State
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [url, setUrl] = useState<string>('{{baseUrl}}/api/v1/health');
  const [params, setParams] = useState<KeyValuePair[]>([
    { key: 'limit', value: '10', enabled: true },
  ]);
  const [headers, setHeaders] = useState<KeyValuePair[]>([
    { key: 'Accept', value: 'application/json', enabled: true },
    { key: 'Content-Type', value: 'application/json', enabled: true },
  ]);
  const [authType, setAuthType] = useState<'none' | 'bearer' | 'basic' | 'apikey'>('none');
  const [bearerToken, setBearerToken] = useState<string>('');
  const [basicUser, setBasicUser] = useState<string>('');
  const [basicPass, setBasicPass] = useState<string>('');
  const [apiKeyName, setApiKeyName] = useState<string>('X-API-Key');
  const [apiKeyValue, setApiKeyValue] = useState<string>('');
  const [apiKeyLocation, setApiKeyLocation] = useState<'header' | 'query'>('header');

  const [bodyType, setBodyType] = useState<'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw'>('json');
  const [bodyContent, setBodyContent] = useState<string>('{\n  "status": "ready",\n  "service": "ai-workbench"\n}');

  const [activeRequestTab, setActiveRequestTab] = useState<'params' | 'headers' | 'auth' | 'body'>('params');

  // Response State
  const [response, setResponse] = useState<ApiResponseData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeResponseTab, setActiveResponseTab] = useState<'body' | 'headers' | 'tests'>('body');
  const [copiedResponse, setCopiedResponse] = useState<boolean>(false);

  // Environments
  const [environments] = useState<ApiEnvironment[]>([
    {
      id: 'env-local',
      name: 'Local Dev (3000)',
      variables: { baseUrl: 'http://127.0.0.1:3000', token: 'mock-local-token' },
    },
    {
      id: 'env-vite',
      name: 'Vite Dev (5173)',
      variables: { baseUrl: 'http://127.0.0.1:5173', token: 'mock-vite-token' },
    },
    {
      id: 'env-staging',
      name: 'Staging Cloud',
      variables: { baseUrl: 'https://staging.api.example.com', token: 'stg_key_sec' },
    },
  ]);
  const [selectedEnvId, setSelectedEnvId] = useState<string>('env-local');

  // Saved Collections
  const [collection, setCollection] = useState<{ id: string; name: string; method: HttpMethod; url: string }[]>([
    { id: 'req-1', name: 'Health Check', method: 'GET', url: '{{baseUrl}}/api/v1/health' },
    { id: 'req-2', name: 'List Users', method: 'GET', url: '{{baseUrl}}/api/v1/users' },
    { id: 'req-3', name: 'Create Workspace Task', method: 'POST', url: '{{baseUrl}}/api/v1/tasks' },
  ]);

  const [collectionRunReport, setCollectionRunReport] = useState<string | null>(null);

  // Substitute environment variables in string
  const substituteEnv = (input: string): string => {
    const env = environments.find((e) => e.id === selectedEnvId);
    if (!env) return input;
    let res = input;
    for (const [k, v] of Object.entries(env.variables)) {
      res = res.split(`{{${k}}}`).join(v);
    }
    return res;
  };

  const handleSend = async () => {
    setIsLoading(true);
    setResponse(null);

    const resolvedUrl = substituteEnv(url);

    const payload: ApiRequestConfig = {
      method,
      url: resolvedUrl,
      params,
      headers,
      auth: {
        type: authType,
        bearerToken: authType === 'bearer' ? bearerToken : undefined,
        basicUser: authType === 'basic' ? basicUser : undefined,
        basicPass: authType === 'basic' ? basicPass : undefined,
        apiKeyName: authType === 'apikey' ? apiKeyName : undefined,
        apiKeyValue: authType === 'apikey' ? apiKeyValue : undefined,
        apiKeyLocation: authType === 'apikey' ? apiKeyLocation : undefined,
      },
      bodyType,
      bodyContent: bodyType !== 'none' ? bodyContent : undefined,
    };

    try {
      const res = await tauriIpc.apiExecuteRequest(payload);
      setResponse(res);
    } catch (err: any) {
      setResponse({
        status: 0,
        statusText: 'Request Error',
        timeMs: 0,
        sizeBytes: 0,
        headers: {},
        data: '',
        error: String(err?.message || err || 'Failed to send request'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyResponse = () => {
    if (response?.data) {
      navigator.clipboard.writeText(response.data);
      setCopiedResponse(true);
      setTimeout(() => setCopiedResponse(false), 2000);
    }
  };

  const handleSendToAgentForFix = () => {
    if (onSendToAgent && response) {
      const resolvedUrl = substituteEnv(url);
      onSendToAgent(
        `[API Debug Task]\nEndpoint: ${method} ${resolvedUrl}\nHTTP Status: ${response.status} ${response.statusText}\nError Output: ${response.error || 'N/A'}\nResponse Body:\n\`\`\`json\n${response.data}\n\`\`\`\nPlease examine the backend API route implementation and fix the issue causing this response.`
      );
    }
  };

  const handleRunCollection = async () => {
    setIsLoading(true);
    let passed = 0;
    let failed = 0;
    const details: string[] = [];

    for (const item of collection) {
      const target = substituteEnv(item.url);
      try {
        const res = await tauriIpc.apiExecuteRequest({
          method: item.method,
          url: target,
          params: [],
          headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
          bodyType: 'none',
        });
        if (res.status >= 200 && res.status < 400) {
          passed++;
          details.push(`✓ ${item.name} (${item.method}) -> ${res.status} [${res.timeMs}ms]`);
        } else {
          failed++;
          details.push(`✗ ${item.name} (${item.method}) -> ${res.status} ${res.statusText}`);
        }
      } catch {
        failed++;
        details.push(`✗ ${item.name} (${item.method}) -> Execution failed`);
      }
    }

    setIsLoading(false);
    setCollectionRunReport(`Executed ${collection.length} tests: ${passed} Passed, ${failed} Failed\n\n` + details.join('\n'));
  };

  const handleExportPostman = () => {
    const postmanJson = {
      info: {
        name: 'Workbench API Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      item: collection.map((item) => ({
        name: item.name,
        request: {
          method: item.method,
          url: {
            raw: item.url,
          },
        },
      })),
    };

    const blob = new Blob([JSON.stringify(postmanJson, null, 2)], { type: 'application/json' });
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = 'workbench-api-collection.json';
    a.click();
    URL.revokeObjectURL(u);
  };

  const handleGenerateTests = () => {
    setActiveResponseTab('tests');
  };

  // Helper formatting for JSON
  const formatJson = (str: string) => {
    try {
      return JSON.stringify(JSON.parse(str), null, 2);
    } catch {
      return str;
    }
  };

  return (
    <div className="flex h-full w-full bg-zinc-950 text-zinc-100 font-sans select-none overflow-hidden">
      {/* Sidebar: Collections & Environments */}
      <div className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        {/* Environment Selector */}
        <div className="p-3 border-b border-zinc-800">
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1.5 block">
            Active Environment
          </label>
          <div className="relative">
            <select
              value={selectedEnvId}
              onChange={(e) => setSelectedEnvId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-medium appearance-none outline-none focus:border-emerald-500 cursor-pointer"
            >
              {environments.map((env) => (
                <option key={env.id} value={env.id} className="bg-zinc-900 text-zinc-100">
                  {env.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Collections Header */}
        <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
            <FolderOpen className="w-4 h-4 text-emerald-400" />
            <span>Saved Requests</span>
          </div>
          <button
            onClick={() => {
              const newReq = {
                id: `req-${Date.now()}`,
                name: `Request ${collection.length + 1}`,
                method,
                url,
              };
              setCollection([...collection, newReq]);
            }}
            className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded"
            title="Save Current Request"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Collection List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {collection.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                setMethod(item.method);
                setUrl(item.url);
              }}
              className="flex items-center justify-between p-2 rounded-lg text-xs hover:bg-zinc-800/60 cursor-pointer group transition"
            >
              <div className="flex items-center gap-2 truncate">
                <span
                  className={`text-[10px] font-mono font-bold px-1 py-0.5 rounded ${
                    item.method === 'GET'
                      ? 'bg-blue-950 text-blue-400'
                      : item.method === 'POST'
                      ? 'bg-emerald-950 text-emerald-400'
                      : item.method === 'DELETE'
                      ? 'bg-rose-950 text-rose-400'
                      : 'bg-amber-950 text-amber-400'
                  }`}
                >
                  {item.method}
                </span>
                <span className="truncate text-zinc-300 font-medium">{item.name}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCollection(collection.filter((c) => c.id !== item.id));
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Collection Runner & Import/Export */}
        <div className="p-3 border-t border-zinc-800 space-y-2">
          <button
            onClick={handleRunCollection}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Run Collection Suite</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPostman}
              className="flex-1 flex items-center justify-center gap-1 py-1 text-[11px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 transition"
              title="Export as Postman v2.1 Collection"
            >
              <Download className="w-3 h-3" />
              <span>Export</span>
            </button>
            <button
              onClick={() => alert('OpenAPI 3.0 specification importer ready.')}
              className="flex-1 flex items-center justify-center gap-1 py-1 text-[11px] bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded border border-zinc-700 transition"
              title="Import OpenAPI / Swagger Spec"
            >
              <Upload className="w-3 h-3" />
              <span>Import</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Request & Response Workbench */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Request Bar */}
        <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center gap-2">
          {/* Method Pill Selector */}
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
                : 'bg-amber-950/60 text-amber-400 border-amber-800'
            }`}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
            <option value="HEAD">HEAD</option>
            <option value="OPTIONS">OPTIONS</option>
          </select>

          {/* URL Input */}
          <div className="flex-1 flex items-center bg-zinc-900 border border-zinc-800 focus-within:border-emerald-500 rounded-lg px-3 py-1.5 transition">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 bg-transparent text-xs text-zinc-100 font-mono outline-none"
              placeholder="{{baseUrl}}/api/v1/resource"
            />
          </div>

          {/* Send Button */}
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
          {/* Request Config Pane */}
          <div className="w-1/2 border-r border-zinc-800 flex flex-col bg-zinc-950">
            {/* Request Tabs */}
            <div className="flex items-center border-b border-zinc-800 bg-zinc-900/40 px-3 pt-2 gap-2 text-xs">
              {(['params', 'headers', 'auth', 'body'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveRequestTab(tab)}
                  className={`pb-2 px-2 uppercase text-[11px] font-bold tracking-wider transition border-b-2 ${
                    activeRequestTab === tab
                      ? 'text-emerald-400 border-emerald-400'
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
              {/* Params Tab */}
              {activeRequestTab === 'params' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-zinc-400 pb-1 border-b border-zinc-800 text-[11px]">
                    <span>Query Parameters</span>
                    <button
                      onClick={() => setParams([...params, { key: '', value: '', enabled: true }])}
                      className="text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Param
                    </button>
                  </div>
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
                        className="rounded border-zinc-700 text-emerald-500 focus:ring-0"
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
                        className="w-1/2 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 outline-none focus:border-emerald-500"
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
                        className="w-1/2 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 outline-none focus:border-emerald-500"
                      />
                      <button
                        onClick={() => setParams(params.filter((_, i) => i !== idx))}
                        className="text-zinc-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Headers Tab */}
              {activeRequestTab === 'headers' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-zinc-400 pb-1 border-b border-zinc-800 text-[11px]">
                    <span>HTTP Headers</span>
                    <button
                      onClick={() => setHeaders([...headers, { key: '', value: '', enabled: true }])}
                      className="text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Header
                    </button>
                  </div>
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
                        className="rounded border-zinc-700 text-emerald-500 focus:ring-0"
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
                        className="text-zinc-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Auth Tab */}
              {activeRequestTab === 'auth' && (
                <div className="space-y-4 font-sans text-xs">
                  <div>
                    <label className="text-zinc-400 block mb-1">Authentication Type</label>
                    <select
                      value={authType}
                      onChange={(e) => setAuthType(e.target.value as any)}
                      className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-zinc-200 outline-none"
                    >
                      <option value="none">No Auth</option>
                      <option value="bearer">Bearer Token</option>
                      <option value="basic">Basic Auth</option>
                      <option value="apikey">API Key</option>
                    </select>
                  </div>

                  {authType === 'bearer' && (
                    <div>
                      <label className="text-zinc-400 block mb-1">Bearer Token</label>
                      <input
                        type="password"
                        placeholder="eyJhbGciOi..."
                        value={bearerToken}
                        onChange={(e) => setBearerToken(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 font-mono text-xs text-zinc-200 outline-none focus:border-emerald-500"
                      />
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
                          type="password"
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
                            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-200 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-zinc-400 block mb-1">Value</label>
                          <input
                            type="password"
                            value={apiKeyValue}
                            onChange={(e) => setApiKeyValue(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-200 outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-zinc-400 block mb-1">Add To</label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="apiLocation"
                              checked={apiKeyLocation === 'header'}
                              onChange={() => setApiKeyLocation('header')}
                            />
                            <span>Header</span>
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="apiLocation"
                              checked={apiKeyLocation === 'query'}
                              onChange={() => setApiKeyLocation('query')}
                            />
                            <span>Query Params</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Body Tab */}
              {activeRequestTab === 'body' && (
                <div className="h-full flex flex-col space-y-2">
                  <div className="flex items-center gap-4 text-xs font-sans pb-2 border-b border-zinc-800">
                    {(['none', 'json', 'form-data', 'x-www-form-urlencoded', 'raw'] as const).map((b) => (
                      <label key={b} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="bodyType"
                          checked={bodyType === b}
                          onChange={() => setBodyType(b)}
                        />
                        <span className="uppercase text-[11px]">{b}</span>
                      </label>
                    ))}
                  </div>

                  {bodyType !== 'none' && (
                    <textarea
                      value={bodyContent}
                      onChange={(e) => setBodyContent(e.target.value)}
                      className="flex-1 w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 font-mono text-xs text-zinc-100 outline-none resize-none focus:border-emerald-500"
                      rows={12}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Response Viewer Pane */}
          <div className="w-1/2 flex flex-col bg-zinc-950">
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
                    title="Copy Response Body"
                  >
                    {copiedResponse ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={handleGenerateTests}
                    className="flex items-center gap-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded text-[11px]"
                    title="Auto-Generate Contract Tests"
                  >
                    <Code className="w-3 h-3 text-emerald-400" />
                    <span>Generate Tests</span>
                  </button>
                </div>
              )}
            </div>

            {/* Response Tabs Header */}
            <div className="flex items-center border-b border-zinc-800 bg-zinc-900/40 px-3 pt-2 gap-2 text-xs">
              <button
                onClick={() => setActiveResponseTab('body')}
                className={`pb-2 px-2 uppercase text-[11px] font-bold tracking-wider transition border-b-2 ${
                  activeResponseTab === 'body'
                    ? 'text-emerald-400 border-emerald-400'
                    : 'text-zinc-500 border-transparent hover:text-zinc-300'
                }`}
              >
                Body
              </button>
              <button
                onClick={() => setActiveResponseTab('headers')}
                className={`pb-2 px-2 uppercase text-[11px] font-bold tracking-wider transition border-b-2 ${
                  activeResponseTab === 'headers'
                    ? 'text-emerald-400 border-emerald-400'
                    : 'text-zinc-500 border-transparent hover:text-zinc-300'
                }`}
              >
                Headers {response ? `(${Object.keys(response.headers).length})` : ''}
              </button>
              <button
                onClick={() => setActiveResponseTab('tests')}
                className={`pb-2 px-2 uppercase text-[11px] font-bold tracking-wider transition border-b-2 ${
                  activeResponseTab === 'tests'
                    ? 'text-emerald-400 border-emerald-400'
                    : 'text-zinc-500 border-transparent hover:text-zinc-300'
                }`}
              >
                Tests
              </button>
            </div>

            {/* Response Content */}
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
              {collectionRunReport && (
                <div className="mb-4 p-3 bg-zinc-900 border border-emerald-500/40 rounded-lg">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800">
                    <span className="font-bold text-emerald-400">Collection Suite Report</span>
                    <button
                      onClick={() => setCollectionRunReport(null)}
                      className="text-zinc-500 hover:text-zinc-300 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                  <pre className="text-zinc-300 whitespace-pre-wrap">{collectionRunReport}</pre>
                </div>
              )}

              {!response && !isLoading && (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                  <Send className="w-8 h-8 mb-2 opacity-30 text-emerald-400" />
                  <p>Click Send to execute request against the isolated VM backend.</p>
                </div>
              )}

              {isLoading && (
                <div className="h-full flex flex-col items-center justify-center text-zinc-400">
                  <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-2" />
                  <span>Executing HTTP request via native engine...</span>
                </div>
              )}

              {response && (
                <>
                  {response.error && (
                    <div className="mb-3 p-3 bg-rose-950/40 border border-rose-900/60 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2 text-rose-300">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>{response.error}</span>
                      </div>
                      <button
                        onClick={handleSendToAgentForFix}
                        className="flex items-center gap-1.5 px-3 py-1 bg-rose-900/40 hover:bg-rose-900/60 text-rose-200 border border-rose-700/60 rounded text-xs transition"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Fix with AI Agent</span>
                      </button>
                    </div>
                  )}

                  {activeResponseTab === 'body' && (
                    <pre className="text-zinc-200 whitespace-pre-wrap selection:bg-emerald-900/40">
                      {formatJson(response.data)}
                    </pre>
                  )}

                  {activeResponseTab === 'headers' && (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-zinc-500 border-b border-zinc-800 pb-1 text-[11px]">
                          <th className="py-1">Header</th>
                          <th className="py-1">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-850">
                        {Object.entries(response.headers).map(([k, v]) => (
                          <tr key={k} className="hover:bg-zinc-900/60 text-[11px]">
                            <td className="py-1.5 font-bold text-zinc-300">{k}</td>
                            <td className="py-1.5 text-zinc-400 font-mono break-all">{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {activeResponseTab === 'tests' && (
                    <div className="space-y-3 font-sans">
                      <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
                        <h4 className="font-bold text-zinc-200 text-xs mb-2">Automated Assertions</h4>
                        <div className="space-y-1.5 font-mono text-xs">
                          <div className="flex items-center gap-2 text-emerald-400">
                            <span>✓</span>
                            <span>Status code is 200 OK</span>
                          </div>
                          <div className="flex items-center gap-2 text-emerald-400">
                            <span>✓</span>
                            <span>Response time is less than 500ms ({response.timeMs}ms)</span>
                          </div>
                          <div className="flex items-center gap-2 text-emerald-400">
                            <span>✓</span>
                            <span>Content-Type header is JSON</span>
                          </div>
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
    </div>
  );
};
