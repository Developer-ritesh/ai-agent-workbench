import { ApiCollection, ApiFolder, ApiRequestConfig, HttpMethod, KeyValuePair } from '../../types';

/**
 * Import Postman Collection v2.0 or v2.1.0 JSON format
 */
export function importPostmanCollection(jsonString: string): ApiCollection {
  const parsed = JSON.parse(jsonString);
  const name = parsed.info?.name || 'Imported Postman Collection';
  const description = parsed.info?.description || '';

  const rootRequests: ApiRequestConfig[] = [];
  const folders: ApiFolder[] = [];

  const parseRequestItem = (item: any): ApiRequestConfig => {
    const methodStr = (item.request?.method || 'GET').toUpperCase();
    const validMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
    const method: HttpMethod = validMethods.includes(methodStr as HttpMethod) ? (methodStr as HttpMethod) : 'GET';

    let url = '';
    if (typeof item.request?.url === 'string') {
      url = item.request.url;
    } else if (item.request?.url?.raw) {
      url = item.request.url.raw;
    }

    const headers: KeyValuePair[] = [];
    if (Array.isArray(item.request?.header)) {
      for (const h of item.request.header) {
        headers.push({
          key: h.key || '',
          value: h.value || '',
          enabled: h.disabled !== true,
          description: h.description,
        });
      }
    }

    const params: KeyValuePair[] = [];
    if (Array.isArray(item.request?.url?.query)) {
      for (const q of item.request.url.query) {
        params.push({
          key: q.key || '',
          value: q.value || '',
          enabled: q.disabled !== true,
          description: q.description,
        });
      }
    }

    let bodyType: any = 'none';
    let bodyContent = '';
    if (item.request?.body) {
      const mode = item.request.body.mode;
      if (mode === 'raw') {
        bodyType = item.request.body.options?.raw?.language === 'json' ? 'json' : 'raw';
        bodyContent = item.request.body.raw || '';
      } else if (mode === 'urlencoded') {
        bodyType = 'x-www-form-urlencoded';
        bodyContent = (item.request.body.urlencoded || [])
          .map((u: any) => `${encodeURIComponent(u.key)}=${encodeURIComponent(u.value)}`)
          .join('&');
      }
    }

    return {
      id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: item.name || url || 'Untitled Request',
      description: item.request?.description || '',
      method,
      url,
      params,
      headers,
      bodyType,
      bodyContent,
      bodyJson: bodyType === 'json' ? bodyContent : undefined,
    };
  };

  const variables: Record<string, string> = {};
  if (Array.isArray(parsed.variable)) {
    for (const v of parsed.variable) {
      if (v.key) {
        variables[v.key] = v.value || '';
      }
    }
  }

  for (const item of parsed.item || []) {
    if (item.request) {
      rootRequests.push(parseRequestItem(item));
    } else if (item.item && Array.isArray(item.item)) {
      const folderRequests: ApiRequestConfig[] = [];
      for (const subItem of item.item) {
        if (subItem.request) {
          folderRequests.push(parseRequestItem(subItem));
        }
      }
      folders.push({
        id: `folder-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: item.name || 'Folder',
        requests: folderRequests,
      });
    }
  }

  return {
    id: `col-${Date.now()}`,
    name,
    description,
    requests: rootRequests,
    folders,
    variables,
  };
}

/**
 * Export collection as Postman v2.1.0 compatible JSON
 */
export function exportPostmanCollection(collection: ApiCollection): string {
  const mapReqToPostman = (req: ApiRequestConfig) => ({
    name: req.name || req.url,
    request: {
      method: req.method,
      header: (req.headers || []).map((h) => ({
        key: h.key,
        value: h.value,
        disabled: !h.enabled,
      })),
      url: {
        raw: req.url,
        query: (req.params || []).map((p) => ({
          key: p.key,
          value: p.value,
          disabled: !p.enabled,
        })),
      },
      body:
        req.bodyType !== 'none' && (req.bodyContent || req.bodyJson)
          ? {
              mode: 'raw',
              raw: req.bodyContent || req.bodyJson,
              options: {
                raw: {
                  language: req.bodyType === 'json' ? 'json' : 'text',
                },
              },
            }
          : undefined,
    },
  });

  const items: any[] = [];

  // Export folders
  if (collection.folders && collection.folders.length > 0) {
    for (const folder of collection.folders) {
      items.push({
        name: folder.name,
        item: folder.requests.map(mapReqToPostman),
      });
    }
  }

  // Export root requests
  for (const req of collection.requests || []) {
    items.push(mapReqToPostman(req));
  }

  const postmanObj = {
    info: {
      name: collection.name,
      description: collection.description || '',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: items,
    variable: Array.isArray(collection.variables)
      ? collection.variables.map((v) => ({ key: v.key, value: v.value }))
      : typeof collection.variables === 'object' && collection.variables !== null
      ? Object.entries(collection.variables).map(([key, value]) => ({ key, value }))
      : [],
  };

  return JSON.stringify(postmanObj, null, 2);
}

/**
 * Import OpenAPI 3.0 / Swagger JSON specifications into an ApiCollection
 */
export function importOpenApiSpec(specString: string): ApiCollection {
  const parsed = JSON.parse(specString);
  const name = parsed.info?.title || 'OpenAPI Import';
  const description = parsed.info?.description || '';
  const baseUrl = parsed.servers?.[0]?.url || '{{baseUrl}}';

  const folderMap = new Map<string, ApiRequestConfig[]>();
  const rootRequests: ApiRequestConfig[] = [];
  const validMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

  if (parsed.paths) {
    for (const [pathKey, pathObj] of Object.entries<any>(parsed.paths)) {
      for (const [methodKey, endpoint] of Object.entries<any>(pathObj)) {
        const methodUpper = methodKey.toUpperCase() as HttpMethod;
        if (validMethods.includes(methodUpper)) {
          const summary = endpoint.summary || endpoint.operationId || `${methodUpper} ${pathKey}`;
          const params: KeyValuePair[] = [];

          if (Array.isArray(endpoint.parameters)) {
            for (const p of endpoint.parameters) {
              if (p.in === 'query') {
                params.push({
                  key: p.name,
                  value: p.schema?.default || p.example || '',
                  enabled: p.required || false,
                  description: p.description,
                });
              }
            }
          }

          let bodyContent = '';
          let bodyType: any = 'none';

          if (endpoint.requestBody?.content?.['application/json']) {
            bodyType = 'json';
            const schema = endpoint.requestBody.content['application/json'].schema;
            if (endpoint.requestBody.content['application/json'].example) {
              bodyContent = JSON.stringify(endpoint.requestBody.content['application/json'].example, null, 2);
            } else if (schema) {
              bodyContent = '{\n  // Generated from schema\n}';
            }
          }

          const fullUrl = baseUrl.endsWith('/') && pathKey.startsWith('/')
            ? `${baseUrl.slice(0, -1)}${pathKey}`
            : `${baseUrl}${pathKey}`;

          const requestConfig: ApiRequestConfig = {
            id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: summary,
            description: endpoint.description || '',
            method: methodUpper,
            url: fullUrl,
            params,
            headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
            bodyType,
            bodyContent,
            bodyJson: bodyType === 'json' ? bodyContent : undefined,
          };

          // Group by tag or primary path segment
          let folderName = '';
          if (Array.isArray(endpoint.tags) && endpoint.tags.length > 0 && endpoint.tags[0]) {
            folderName = endpoint.tags[0];
          } else {
            const segments = pathKey.split('/').filter(Boolean);
            folderName = segments.length > 0 ? `/${segments[0]}` : 'General';
          }

          if (folderName) {
            if (!folderMap.has(folderName)) {
              folderMap.set(folderName, []);
            }
            folderMap.get(folderName)!.push(requestConfig);
          } else {
            rootRequests.push(requestConfig);
          }
        }
      }
    }
  }

  const folders: ApiFolder[] = [];
  for (const [folderName, reqs] of folderMap.entries()) {
    folders.push({
      id: `folder-${Date.now()}-${folderName.replace(/\W+/g, '_')}`,
      name: folderName,
      requests: reqs,
    });
  }

  return {
    id: `col-oas-${Date.now()}`,
    name,
    description,
    requests: rootRequests,
    folders,
  };
}
