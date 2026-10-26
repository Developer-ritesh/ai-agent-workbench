import React, { useState } from 'react';
import {
  FlaskConical,
  Play,
  RotateCw,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Terminal,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { TestCaseResult } from '../../types';

interface TestingEngineProps {
  onSendToAgent?: (prompt: string) => void;
  workspacePath?: string;
}

export const TestingEngine: React.FC<TestingEngineProps> = ({ onSendToAgent, workspacePath }) => {
  const [activeSuite, setActiveSuite] = useState<'all' | 'unit' | 'integration' | 'e2e' | 'typecheck'>('all');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [selectedTestId, setSelectedTestId] = useState<string | null>('tc-2');

  const [tests] = useState<TestCaseResult[]>([
    {
      id: 'tc-1',
      suiteName: 'Unit: Auth Service',
      testName: 'should validate user credentials and return JWT token',
      status: 'passed',
      durationMs: 42,
    },
    {
      id: 'tc-2',
      suiteName: 'Unit: Workspace Store',
      testName: 'should reject unauthorized filesystem path traversal',
      status: 'failed',
      durationMs: 78,
      errorMessage: 'AssertionError: expected status 403 Forbidden but received 200 OK',
      stackTrace:
        'at WorkspaceManager.test.ts:89:12\nat processTicksAndRejections (node:internal/process/task_queues:95:5)\nat runTest (runner.js:142:9)',
    },
    {
      id: 'tc-3',
      suiteName: 'E2E Browser: Playwright',
      testName: 'login and navigation to workspace dashboard',
      status: 'passed',
      durationMs: 1420,
    },
    {
      id: 'tc-4',
      suiteName: 'E2E Browser: Playwright',
      testName: 'responsive viewport switching on mobile preset',
      status: 'passed',
      durationMs: 980,
    },
    {
      id: 'tc-5',
      suiteName: 'TypeCheck & Lint',
      testName: 'TypeScript strict compiler check (tsc --noEmit)',
      status: 'passed',
      durationMs: 650,
    },
  ]);

  const [streamLogs, setStreamLogs] = useState<string[]>([
    '[TestingEngine] Initializing isolated microVM test runner...',
    '[Unit] Executing vitest/cargo test suite...',
    '  ✓ should validate user credentials and return JWT token (42ms)',
    '  ✗ should reject unauthorized filesystem path traversal (78ms)',
    '    AssertionError: expected status 403 Forbidden but received 200 OK',
    '[E2E] Launching headless browser Chromium via Playwright...',
    '  ✓ login and navigation to workspace dashboard (1420ms)',
    '  ✓ responsive viewport switching on mobile preset (980ms)',
    '[TypeCheck] Running tsc --noEmit...',
    '  ✓ 0 type errors found.',
    '[TestingEngine] Suite completed in 3.17s.',
  ]);

  const passedCount = tests.filter((t) => t.status === 'passed').length;
  const failedCount = tests.filter((t) => t.status === 'failed').length;
  const selectedTest = tests.find((t) => t.id === selectedTestId);

  const handleRunTests = () => {
    setIsRunning(true);
    setStreamLogs((prev) => [
      ...prev,
      `\n[Runner] Triggered test execution for suite: "${activeSuite.toUpperCase()}" at ${new Date().toLocaleTimeString()}...`,
    ]);

    setTimeout(() => {
      setIsRunning(false);
      setStreamLogs((prev) => [
        ...prev,
        '✓ Test execution completed. Results updated.',
      ]);
    }, 1800);
  };

  const handleFixWithAgent = (test: TestCaseResult) => {
    if (onSendToAgent) {
      onSendToAgent(
        `[Automated Test Failure Fix Request]\nTest Suite: ${test.suiteName}\nFailed Test: ${test.testName}\nFailure Message:\n${test.errorMessage}\nStack Trace:\n${test.stackTrace || 'N/A'}\nWorkspace: ${workspacePath || 'current project'}\nPlease investigate the root cause, write a patch to satisfy the assertion, and re-run tests.`
      );
    }
  };

  const handleGenerateTests = () => {
    if (onSendToAgent) {
      onSendToAgent(
        `[Test Suite Expansion]\nPlease inspect the workspace project files and generate missing unit and Playwright integration tests covering edge cases and error states.`
      );
    }
  };

  const filteredTests = tests.filter((t) => {
    const s = t.suiteName || t.suite || '';
    if (activeSuite === 'all') return true;
    if (activeSuite === 'unit') return s.startsWith('Unit');
    if (activeSuite === 'e2e') return s.includes('Playwright') || s.includes('E2E');
    if (activeSuite === 'typecheck') return s.includes('TypeCheck');
    return true;
  });

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-100 font-sans select-none overflow-hidden">
      {/* Top Header */}
      <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-zinc-100">Automatic Testing Engine</h1>
            <p className="text-xs text-zinc-400">
              Unit, Integration, Playwright E2E Browser & TypeCheck runner in isolated VM
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateTests}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 rounded-lg text-xs font-medium border border-zinc-700 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Generate Tests</span>
          </button>
          <button
            onClick={handleRunTests}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md transition disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Run Test Suite</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3 p-4 bg-zinc-950 border-b border-zinc-800 text-xs">
        <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-zinc-500 text-[11px] font-medium">Total Tests</p>
            <p className="text-lg font-bold text-zinc-200">{tests.length}</p>
          </div>
          <Layers className="w-5 h-5 text-zinc-600" />
        </div>

        <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-zinc-500 text-[11px] font-medium">Passed</p>
            <p className="text-lg font-bold text-emerald-400">{passedCount}</p>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        </div>

        <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-zinc-500 text-[11px] font-medium">Failed</p>
            <p className="text-lg font-bold text-rose-400">{failedCount}</p>
          </div>
          <XCircle className="w-5 h-5 text-rose-500" />
        </div>

        <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-zinc-500 text-[11px] font-medium">Total Runtime</p>
            <p className="text-lg font-bold text-zinc-200">3.17s</p>
          </div>
          <Clock className="w-5 h-5 text-zinc-600" />
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Test List & Suite Filter */}
        <div className="w-1/2 border-r border-zinc-800 flex flex-col bg-zinc-950">
          {/* Suite Filter Bar */}
          <div className="p-2 border-b border-zinc-800 flex items-center gap-1.5 overflow-x-auto text-xs bg-zinc-900/40">
            {(['all', 'unit', 'e2e', 'typecheck'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setActiveSuite(s)}
                className={`px-3 py-1 rounded-md text-[11px] font-medium uppercase transition ${
                  activeSuite === s
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Test List */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-850">
            {filteredTests.map((test) => {
              const isSelected = test.id === selectedTestId;
              return (
                <div
                  key={test.id}
                  onClick={() => setSelectedTestId(test.id)}
                  className={`p-3 cursor-pointer transition flex items-start justify-between gap-3 ${
                    isSelected ? 'bg-zinc-900 border-l-2 border-emerald-400' : 'hover:bg-zinc-900/40'
                  }`}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      {test.status === 'passed' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                      )}
                      <span className="text-xs font-semibold text-zinc-200">{test.testName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                      <span>{test.suiteName}</span>
                      <span>•</span>
                      <span>{test.durationMs}ms</span>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-zinc-600'}`} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Test Details & Console Streaming */}
        <div className="w-1/2 flex flex-col bg-zinc-950">
          {/* Test Detail Pane */}
          {selectedTest && (
            <div className="p-4 border-b border-zinc-800 bg-zinc-900/30">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800">
                <span className="text-xs font-bold text-zinc-200">Test Execution Details</span>
                {selectedTest.status === 'failed' && (
                  <button
                    onClick={() => handleFixWithAgent(selectedTest)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-rose-900/40 hover:bg-rose-900/60 text-rose-200 border border-rose-700/60 rounded text-xs transition"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Fix with AI Agent</span>
                  </button>
                )}
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-zinc-500">Suite: </span>
                  <span className="font-semibold text-zinc-300">{selectedTest.suiteName}</span>
                </div>
                <div>
                  <span className="text-zinc-500">Test: </span>
                  <span className="text-zinc-200">{selectedTest.testName}</span>
                </div>

                {selectedTest.errorMessage && (
                  <div className="p-3 bg-rose-950/30 border border-rose-900/60 rounded-lg text-rose-300 font-mono text-[11px] space-y-2">
                    <p className="font-bold">{selectedTest.errorMessage}</p>
                    {selectedTest.stackTrace && (
                      <pre className="text-zinc-400 whitespace-pre-wrap text-[10px] mt-1">
                        {selectedTest.stackTrace}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Console Output Stream */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-3 py-2 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-1.5 font-medium">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                Live Runner Output
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">Isolated Linux MicroVM</span>
            </div>
            <div className="flex-1 bg-zinc-950 p-3 font-mono text-[11px] text-zinc-300 overflow-y-auto space-y-1">
              {streamLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={`${
                    log.includes('✓')
                      ? 'text-emerald-400'
                      : log.includes('✗') || log.includes('AssertionError')
                      ? 'text-rose-400'
                      : 'text-zinc-400'
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
