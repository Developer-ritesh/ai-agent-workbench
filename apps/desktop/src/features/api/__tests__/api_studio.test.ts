import test from 'node:test';
import assert from 'node:assert/strict';

import { runPreRequestScript, runPostResponseTests } from '../scriptEngine.ts';
import { generateCodeSnippet } from '../codeGenerators.ts';
import { importPostmanCollection, exportPostmanCollection, importOpenApiSpec } from '../importers.ts';
import { ApiRequestConfig, ApiResponseData } from '../../../types/index.ts';

test('API Testing Studio - Script Engine Pre-Request Scripts', async (t) => {
  await t.test('sets variables and environments via pm.environment and pm.variables', () => {
    const script = `
      pm.environment.set("auth_token", "secret_jwt_token_123");
      pm.variables.set("timestamp", "2026-10-26");
      console.log("Pre-request script executed");
    `;

    const result = runPreRequestScript(script, { existingVar: 'test' });
    assert.equal(result.envUpdates['auth_token'], 'secret_jwt_token_123');
    assert.equal(result.localUpdates['timestamp'], '2026-10-26');
    assert.equal(result.logs.length, 1);
    assert.equal(result.logs[0], 'Pre-request script executed');
  });

  await t.test('safely handles runtime errors without throwing', () => {
    const brokenScript = `invalidSyntax.callUnknown();`;
    const result = runPreRequestScript(brokenScript);
    assert.ok(result.error);
    assert.ok(result.error.includes('ReferenceError') || result.error.includes('invalidSyntax'));
  });
});

test('API Testing Studio - Sandboxed Post-Response Test Runner', async (t) => {
  const dummyResponse: ApiResponseData = {
    status: 200,
    statusText: 'OK',
    timeMs: 85,
    sizeBytes: 128,
    headers: { 'content-type': 'application/json', 'x-request-id': 'req-987' },
    cookies: [{ name: 'session_id', value: 'sess_abc', domain: 'example.com', path: '/' }],
    body: JSON.stringify({
      user: { id: 42, name: 'Alice', active: true },
      items: [1, 2, 3],
    }),
    timing: {
      dnsLookupMs: 5,
      tcpConnectMs: 12,
      tlsHandshakeMs: 20,
      ttfbMs: 38,
      contentTransferMs: 10,
      totalMs: 85,
    },
  };

  await t.test('executes pm.test and pm.expect assertions accurately', () => {
    const script = `
      pm.test("Status is 200", () => {
        pm.response.to.have.status(200);
      });

      pm.test("Response time is under 200ms", () => {
        pm.expect(pm.response.responseTime).to.be.below(200);
      });

      pm.test("JSON payload has user Alice", () => {
        const jsonData = pm.response.json();
        pm.expect(jsonData.user.name).to.eql("Alice");
        pm.expect(jsonData.user.active).to.be.true();
        pm.expect(jsonData.items.length).to.equal(3);
      });

      pm.test("Header check", () => {
        pm.expect(pm.response.headers.get("x-request-id")).to.equal("req-987");
      });

      // Save user ID to environment for chaining
      const data = pm.response.json();
      pm.environment.set("userId", String(data.user.id));
    `;

    const result = runPostResponseTests(script, dummyResponse);
    assert.equal(result.testResults.length, 4);
    assert.equal(result.testResults.every((r) => r.status === 'passed'), true);
    assert.equal(result.envUpdates['userId'], '42');
  });

  await t.test('captures failed assertions with exact failure messages', () => {
    const script = `
      pm.test("Expected status 404", () => {
        pm.response.to.have.status(404);
      });
      pm.test("Expected user Bob", () => {
        const data = pm.response.json();
        pm.expect(data.user.name).to.equal("Bob");
      });
    `;

    const result = runPostResponseTests(script, dummyResponse);
    assert.equal(result.testResults.length, 2);
    assert.equal(result.testResults[0].status, 'failed');
    assert.ok(result.testResults[0].error?.includes('404'));
    assert.equal(result.testResults[1].status, 'failed');
    assert.ok(result.testResults[1].error?.includes('Bob'));
  });
});

test('API Testing Studio - Client Code Generators', async (t) => {
  const req: ApiRequestConfig = {
    id: 'req-1',
    name: 'Get User Profile',
    method: 'POST',
    url: 'https://api.example.com/v1/users',
    params: [{ key: 'dryRun', value: 'true', enabled: true }],
    headers: [{ key: 'X-Client', value: 'Workbench', enabled: true }],
    auth: { type: 'bearer', bearerToken: 'my_secret_token' },
    bodyType: 'json',
    bodyJson: '{"name":"Tester"}',
  };

  await t.test('generates valid cURL command', () => {
    const curl = generateCodeSnippet(req, 'curl');
    assert.ok(curl.includes("curl -X POST 'https://api.example.com/v1/users?dryRun=true'"));
    assert.ok(curl.includes("-H 'Authorization: Bearer my_secret_token'"));
    assert.ok(curl.includes("-H 'Content-Type: application/json'"));
    assert.ok(curl.includes("--data '{\"name\":\"Tester\"}'"));
  });

  await t.test('generates valid JavaScript fetch snippet', () => {
    const js = generateCodeSnippet(req, 'javascript');
    assert.ok(js.includes('fetch('));
    assert.ok(js.includes('"Authorization": "Bearer my_secret_token"'));
    assert.ok(js.includes('method: "POST"'));
  });

  await t.test('generates valid Python requests snippet', () => {
    const py = generateCodeSnippet(req, 'python');
    assert.ok(py.includes('import requests'));
    assert.ok(py.includes('requests.request('));
    assert.ok(py.includes('"Authorization": "Bearer my_secret_token"'));
  });

  await t.test('generates valid Rust reqwest snippet', () => {
    const rs = generateCodeSnippet(req, 'rust');
    assert.ok(rs.includes('reqwest::Client::new()'));
    assert.ok(rs.includes('.post('));
    assert.ok(rs.includes('.bearer_auth("my_secret_token")'));
  });

  await t.test('generates valid Go net/http snippet', () => {
    const go = generateCodeSnippet(req, 'go');
    assert.ok(go.includes('http.NewRequest(method, url, payload)'));
    assert.ok(go.includes('req.Header.Add("Authorization", "Bearer my_secret_token")'));
  });
});

test('API Testing Studio - Postman & OpenAPI Importers/Exporters', async (t) => {
  await t.test('imports and exports Postman v2.1 collection format', () => {
    const postmanJson = JSON.stringify({
      info: {
        name: 'Sample API Collection',
        description: 'Test collection description',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      item: [
        {
          name: 'Authentication Folder',
          item: [
            {
              name: 'Login User',
              request: {
                method: 'POST',
                url: {
                  raw: 'https://api.example.com/login',
                },
                header: [
                  { key: 'Accept', value: 'application/json' },
                ],
                body: {
                  mode: 'raw',
                  raw: '{"username":"dev"}',
                },
              },
            },
          ],
        },
        {
          name: 'Get Current Status',
          request: {
            method: 'GET',
            url: {
              raw: 'https://api.example.com/status',
            },
          },
        },
      ],
      variable: [
        { key: 'baseUrl', value: 'https://api.example.com' },
      ],
    });

    const collection = importPostmanCollection(postmanJson);
    assert.equal(collection.name, 'Sample API Collection');
    assert.equal(collection.folders.length, 1);
    assert.equal(collection.folders[0].name, 'Authentication Folder');
    assert.equal(collection.folders[0].requests.length, 1);
    assert.equal(collection.folders[0].requests[0].name, 'Login User');
    assert.equal(collection.folders[0].requests[0].method, 'POST');
    assert.equal(collection.requests.length, 1);
    assert.equal(Object.keys(collection.variables || {}).length, 1);
    assert.equal(collection.variables?.['baseUrl'], 'https://api.example.com');

    // Roundtrip export
    const exportedStr = exportPostmanCollection(collection);
    const parsedBack = JSON.parse(exportedStr);
    assert.equal(parsedBack.info.name, 'Sample API Collection');
    assert.equal(parsedBack.item.length, 2);
  });

  await t.test('imports OpenAPI 3.0 specification documents', () => {
    const openApiJson = JSON.stringify({
      openapi: '3.0.0',
      info: {
        title: 'Pet Store API',
        version: '1.0.0',
        description: 'OpenAPI test spec',
      },
      servers: [{ url: 'https://petstore.example.com/v1' }],
      paths: {
        '/pets': {
          get: {
            summary: 'List all pets',
            parameters: [
              { name: 'limit', in: 'query', schema: { type: 'integer' } },
            ],
          },
          post: {
            summary: 'Create a pet',
            requestBody: {
              content: {
                'application/json': {
                  schema: { type: 'object' },
                },
              },
            },
          },
        },
        '/store/inventory': {
          get: {
            summary: 'Get store inventory',
            tags: ['Store'],
          },
          post: {
            summary: 'Order pet supplies',
            tags: ['Store'],
          },
        },
      },
    });

    const collection = importOpenApiSpec(openApiJson);
    assert.equal(collection.name, 'Pet Store API');
    assert.equal(collection.folders.length, 2);
    // Total requests across folders
    const totalRequests = collection.folders.reduce((acc, f) => acc + f.requests.length, 0);
    assert.equal(totalRequests, 4);
  });
});
