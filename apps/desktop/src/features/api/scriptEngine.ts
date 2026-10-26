import { ApiResponseData, ApiTestResult } from '../../types';

export interface ScriptExecutionResult {
  testResults: ApiTestResult[];
  envUpdates: Record<string, string>;
  localUpdates: Record<string, string>;
  logs: string[];
  error?: string;
}

/**
 * Sandboxed Postman-compatible Test and Script Runner
 */
export function runPostResponseTests(
  script: string,
  response: ApiResponseData,
  initialEnv: Record<string, string> = {},
  initialLocals: Record<string, string> = {}
): ScriptExecutionResult {
  const testResults: ApiTestResult[] = [];
  const envUpdates: Record<string, string> = { ...initialEnv };
  const localUpdates: Record<string, string> = { ...initialLocals };
  const logs: string[] = [];

  if (!script || !script.trim()) {
    // If no test script is written, generate a default status check if response received
    if (response.status > 0) {
      testResults.push({
        name: `Status code is ${response.status}`,
        status: response.status >= 200 && response.status < 400 ? 'passed' : 'failed',
        error: response.status >= 400 ? `Returned HTTP ${response.status} ${response.statusText}` : undefined,
      });
      testResults.push({
        name: 'Response time is acceptable (< 2000ms)',
        status: response.timeMs < 2000 ? 'passed' : 'failed',
        error: response.timeMs >= 2000 ? `Execution took ${response.timeMs}ms` : undefined,
      });
    }
    return { testResults, envUpdates, localUpdates, logs };
  }

  // Create Chai/Postman-style assertion builder
  const createExpect = (actual: any) => {
    const assertion = {
      to: {
        be: {
          ok: () => {
            if (!actual) throw new Error(`Expected truthy value, got ${JSON.stringify(actual)}`);
          },
          true: () => {
            if (actual !== true) throw new Error(`Expected true, got ${JSON.stringify(actual)}`);
          },
          false: () => {
            if (actual !== false) throw new Error(`Expected false, got ${JSON.stringify(actual)}`);
          },
          below: (limit: number) => {
            if (typeof actual !== 'number' || actual >= limit) {
              throw new Error(`Expected ${actual} to be below ${limit}`);
            }
          },
          lessThan: (limit: number) => {
            if (typeof actual !== 'number' || actual >= limit) {
              throw new Error(`Expected ${actual} to be less than ${limit}`);
            }
          },
          above: (limit: number) => {
            if (typeof actual !== 'number' || actual <= limit) {
              throw new Error(`Expected ${actual} to be above ${limit}`);
            }
          },
          oneOf: (list: any[]) => {
            if (!list.includes(actual)) {
              throw new Error(`Expected ${JSON.stringify(actual)} to be one of ${JSON.stringify(list)}`);
            }
          },
        },
        eql: (expected: any) => {
          if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(`Expected ${JSON.stringify(actual)} to deeply equal ${JSON.stringify(expected)}`);
          }
        },
        equal: (expected: any) => {
          if (actual !== expected) {
            throw new Error(`Expected ${actual} to equal ${expected}`);
          }
        },
        have: {
          property: (prop: string) => {
            if (actual === null || actual === undefined || !(prop in actual)) {
              throw new Error(`Expected object to have property '${prop}'`);
            }
          },
          status: (code: number) => {
            if (response.status !== code) {
              throw new Error(`Expected status code ${code}, but got ${response.status}`);
            }
          },
          header: (name: string) => {
            const hasHdr = Object.keys(response.headers).some(
              (h) => h.toLowerCase() === name.toLowerCase()
            );
            if (!hasHdr) {
              throw new Error(`Expected response header '${name}' to exist`);
            }
          },
        },
        include: (sub: any) => {
          if (typeof actual === 'string' && !actual.includes(String(sub))) {
            throw new Error(`Expected string to include '${sub}'`);
          } else if (Array.isArray(actual) && !actual.includes(sub)) {
            throw new Error(`Expected array to include ${JSON.stringify(sub)}`);
          }
        },
      },
    };
    return assertion;
  };

  // Mock Postman "pm" runtime object
  const pm = {
    test: (name: string, fn: () => void) => {
      try {
        fn();
        testResults.push({ name, status: 'passed' });
      } catch (err: any) {
        testResults.push({ name, status: 'failed', error: err?.message || String(err) });
      }
    },
    expect: createExpect,
    response: {
      code: response.status,
      status: response.statusText,
      responseTime: response.timeMs,
      responseSize: response.sizeBytes,
      headers: {
        get: (name: string) => {
          const match = Object.entries(response.headers).find(
            ([k]) => k.toLowerCase() === name.toLowerCase()
          );
          return match ? match[1] : undefined;
        },
        has: (name: string) => {
          return Object.keys(response.headers).some(
            (k) => k.toLowerCase() === name.toLowerCase()
          );
        },
      },
      text: () => response.data ?? (response as any).body ?? '',
      json: () => {
        try {
          return JSON.parse(response.data ?? (response as any).body ?? '{}');
        } catch {
          throw new Error('Response is not valid JSON');
        }
      },
      to: {
        have: {
          status: (code: number) => {
            if (response.status !== code) {
              throw new Error(`Expected status code ${code}, but got ${response.status}`);
            }
          },
        },
        be: {
          ok: () => {
            if (response.status < 200 || response.status >= 300) {
              throw new Error(`Expected 2xx OK status, got ${response.status}`);
            }
          },
          error: () => {
            if (response.status < 400) {
              throw new Error(`Expected error status (>=400), got ${response.status}`);
            }
          },
        },
      },
    },
    environment: {
      set: (key: string, value: any) => {
        envUpdates[key] = String(value);
      },
      get: (key: string) => envUpdates[key],
      unset: (key: string) => {
        delete envUpdates[key];
      },
      has: (key: string) => key in envUpdates,
    },
    variables: {
      set: (key: string, value: any) => {
        localUpdates[key] = String(value);
      },
      get: (key: string) => localUpdates[key] || envUpdates[key],
    },
    collectionVariables: {
      set: (key: string, value: any) => {
        localUpdates[key] = String(value);
      },
      get: (key: string) => localUpdates[key],
    },
  };

  const customConsole = {
    log: (...args: any[]) => logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
    warn: (...args: any[]) => logs.push('[WARN] ' + args.join(' ')),
    error: (...args: any[]) => logs.push('[ERROR] ' + args.join(' ')),
  };

  try {
    // Run sandbox execution
    const sandboxFn = new Function(
      'pm',
      'console',
      'window',
      'document',
      'fetch',
      'XMLHttpRequest',
      'localStorage',
      'sessionStorage',
      `"use strict";
      try {
        ${script}
      } catch (e) {
        throw e;
      }`
    );

    sandboxFn(
      pm,
      customConsole,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    );
  } catch (err: any) {
    return {
      testResults,
      envUpdates,
      localUpdates,
      logs,
      error: String(err?.message || err),
    };
  }

  return { testResults, envUpdates, localUpdates, logs };
}

/**
 * Sandboxed Pre-Request Script Runner
 */
export function runPreRequestScript(
  script: string,
  initialEnv: Record<string, string> = {},
  initialLocals: Record<string, string> = {}
): { envUpdates: Record<string, string>; localUpdates: Record<string, string>; logs: string[]; error?: string } {
  const envUpdates: Record<string, string> = { ...initialEnv };
  const localUpdates: Record<string, string> = { ...initialLocals };
  const logs: string[] = [];

  if (!script || !script.trim()) {
    return { envUpdates, localUpdates, logs };
  }

  const pm = {
    environment: {
      set: (key: string, value: any) => {
        envUpdates[key] = String(value);
      },
      get: (key: string) => envUpdates[key],
    },
    variables: {
      set: (key: string, value: any) => {
        localUpdates[key] = String(value);
      },
      get: (key: string) => localUpdates[key] || envUpdates[key],
    },
  };

  const customConsole = {
    log: (...args: any[]) => logs.push(args.join(' ')),
    warn: (...args: any[]) => logs.push('[WARN] ' + args.join(' ')),
    error: (...args: any[]) => logs.push('[ERROR] ' + args.join(' ')),
  };

  try {
    const sandboxFn = new Function(
      'pm',
      'console',
      'window',
      'document',
      'fetch',
      'XMLHttpRequest',
      `"use strict";
      ${script}`
    );

    sandboxFn(pm, customConsole, undefined, undefined, undefined, undefined);
  } catch (err: any) {
    return { envUpdates, localUpdates, logs, error: String(err?.message || err) };
  }

  return { envUpdates, localUpdates, logs };
}
