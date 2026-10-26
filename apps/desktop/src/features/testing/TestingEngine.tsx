import React, { useState } from 'react';
import {
  FlaskConical,
  Play,
  RotateCw,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { TestCaseResult } from '../../types';

interface TestingEngineProps {
  onSendToAgent?: (prompt: string) => void;
  workspacePath?: string;
}

export const TestingEngine: React.FC<TestingEngineProps> = () => {
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


  const filteredTests = tests.filter((t) => {
    const s = t.suiteName || t.suite || '';
    if (activeSuite === 'all') return true;
    if (activeSuite === 'unit') return s.startsWith('Unit');
    if (activeSuite === 'e2e') return s.includes('Playwright') || s.includes('E2E');
    if (activeSuite === 'typecheck') return s.includes('TypeCheck');
    return true;
  });

  return (
    <div
      className="testing-engine-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        background: 'var(--bg-app)',
        color: 'var(--text-primary)',
        padding: '24px 28px',
        overflowY: 'auto',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 16,
          borderBottom: '1px solid var(--border-panel)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              padding: 8,
              background: 'rgba(16, 185, 129, 0.1)',
              color: '#34d399',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FlaskConical size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Automatic Testing Engine
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
              Unit, Integration, Playwright E2E Browser & TypeCheck runner in isolated VM
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleRunTests}
            disabled={isRunning}
            className="btn btn-primary btn-sm"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}
          >
            {isRunning ? (
              <>
                <RotateCw size={14} className="animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play size={14} />
                <span>Run Test Suite</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 14,
          margin: '18px 0',
          flexShrink: 0,
        }}
      >
        <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total Tests
            </p>
            <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '2px 0 0' }}>
              {tests.length}
            </p>
          </div>
          <Layers size={22} color="var(--text-muted)" />
        </div>

        <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Passed
            </p>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#34d399', margin: '2px 0 0' }}>
              {passedCount}
            </p>
          </div>
          <CheckCircle2 size={22} color="#10b981" />
        </div>

        <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Failed
            </p>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#f87171', margin: '2px 0 0' }}>
              {failedCount}
            </p>
          </div>
          <XCircle size={22} color="#f43f5e" />
        </div>

        <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total Runtime
            </p>
            <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '2px 0 0' }}>
              3.17s
            </p>
          </div>
          <Clock size={22} color="var(--text-muted)" />
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          paddingBottom: 14,
          borderBottom: '1px solid var(--border-panel)',
          flexShrink: 0,
        }}
      >
        {(['all', 'unit', 'e2e', 'typecheck'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSuite(tab)}
            className={`btn btn-sm ${activeSuite === tab ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              fontSize: 11,
              padding: '4px 12px',
              borderRadius: 'var(--radius-full)',
              background: activeSuite === tab ? 'var(--accent-blue)' : undefined,
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Content: Test List & Execution Details */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: 18,
          marginTop: 18,
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Test List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
          {filteredTests.map((t) => {
            const isSelected = selectedTestId === t.id;
            return (
              <div
                key={t.id}
                onClick={() => setSelectedTestId(t.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: isSelected ? 'var(--bg-surface-active)' : 'var(--bg-surface)',
                  border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-panel)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {t.status === 'passed' ? (
                    <CheckCircle2 size={18} color="#34d399" />
                  ) : (
                    <XCircle size={18} color="#f87171" />
                  )}
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', margin: 0 }}>
                      {t.testName}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                      {t.suiteName} • <span style={{ fontFamily: 'var(--font-mono)' }}>{t.durationMs}ms</span>
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {isSelected ? <ChevronDown size={16} color="var(--accent-cyan)" /> : <ChevronRight size={16} color="var(--text-muted)" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Test Detail & Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
          {selectedTest && (
            <div
              className="card"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-panel)',
                borderRadius: 'var(--radius-md)',
                padding: 16,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: 10,
                  borderBottom: '1px solid var(--border-panel)',
                }}
              >
                <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Test Execution Details</h3>
              </div>

              <div style={{ marginTop: 12, fontSize: 12 }}>
                <p style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Suite:</strong> {selectedTest.suiteName}
                </p>
                <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Test:</strong> {selectedTest.testName}
                </p>

                {selectedTest.errorMessage && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: 10,
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      borderRadius: 6,
                      color: '#f87171',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11.5,
                    }}
                  >
                    {selectedTest.errorMessage}
                  </div>
                )}

                {selectedTest.stackTrace && (
                  <pre
                    style={{
                      marginTop: 8,
                      padding: 10,
                      background: '#05070d',
                      border: '1px solid #1a2234',
                      borderRadius: 6,
                      color: '#94a3b8',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      overflowX: 'auto',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {selectedTest.stackTrace}
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* MicroVM Runner Output Console */}
          <div
            style={{
              flex: 1,
              background: '#05070d',
              border: '1px solid #1a2234',
              borderRadius: 'var(--radius-md)',
              padding: 14,
              fontFamily: 'var(--font-mono)',
              fontSize: 11.5,
              lineHeight: 1.6,
              color: '#94a3b8',
              overflowY: 'auto',
              minHeight: 180,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                paddingBottom: 8,
                borderBottom: '1px solid #1a2234',
                marginBottom: 8,
                color: 'var(--accent-cyan)',
                fontWeight: 600,
                fontSize: 11,
              }}
            >
              <span>›_ Live Runner Output (Isolated Linux MicroVM)</span>
            </div>
            {streamLogs.map((log, idx) => (
              <div
                key={idx}
                style={{
                  color: log.includes('✓')
                    ? '#34d399'
                    : log.includes('✗') || log.includes('AssertionError')
                    ? '#f87171'
                    : undefined,
                }}
              >
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
