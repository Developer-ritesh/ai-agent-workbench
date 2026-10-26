import { ApiRequestConfig } from '../../types';

export type CodeLanguage = 'curl' | 'javascript' | 'python' | 'rust' | 'go';

export function generateCodeSnippet(
  request: ApiRequestConfig,
  resolvedUrlOrLanguage?: string,
  maybeLanguage?: CodeLanguage
): string {
  const languages: CodeLanguage[] = ['curl', 'javascript', 'python', 'rust', 'go'];
  let resolvedUrl = request.url || '';
  let language: CodeLanguage = 'curl';

  if (maybeLanguage && languages.includes(maybeLanguage)) {
    resolvedUrl = resolvedUrlOrLanguage || request.url || '';
    language = maybeLanguage;
  } else if (resolvedUrlOrLanguage && languages.includes(resolvedUrlOrLanguage as CodeLanguage)) {
    language = resolvedUrlOrLanguage as CodeLanguage;
    resolvedUrl = request.url || '';
  } else if (resolvedUrlOrLanguage) {
    resolvedUrl = resolvedUrlOrLanguage;
  }

  // Append query params if present and not already in URL
  if (request.params && request.params.length > 0) {
    const activeParams = request.params.filter((p) => p.enabled && p.key.trim() !== '');
    if (activeParams.length > 0 && !resolvedUrl.includes('?')) {
      const qs = activeParams
        .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
        .join('&');
      resolvedUrl = `${resolvedUrl}?${qs}`;
    }
  }

  const method = request.method === 'CUSTOM' ? (request.customMethod || 'GET').toUpperCase() : request.method.toUpperCase();
  const headers = (request.headers || []).filter((h) => h.enabled && h.key.trim() !== '');
  const bodyContent =
    request.bodyContent ||
    (request.bodyType === 'json' ? request.bodyJson : undefined) ||
    '';

  switch (language) {
    case 'curl': {
      let lines = [`curl -X ${method} '${resolvedUrl}'`];
      for (const h of headers) {
        lines.push(`  -H '${h.key}: ${h.value}'`);
      }
      if (request.auth?.type === 'bearer' && request.auth.bearerToken) {
        lines.push(`  -H 'Authorization: Bearer ${request.auth.bearerToken}'`);
      } else if (request.auth?.type === 'basic') {
        lines.push(`  -u '${request.auth.basicUser || ''}:${request.auth.basicPass || ''}'`);
      } else if (request.auth?.type === 'apikey' && request.auth.apiKeyLocation !== 'query') {
        lines.push(`  -H '${request.auth.apiKeyName}: ${request.auth.apiKeyValue}'`);
      }

      if (request.bodyType === 'graphql') {
        const query = request.graphqlQuery || '';
        const vars = request.graphqlVariables || '{}';
        const payload = JSON.stringify({ query, variables: JSON.parse(vars || '{}') });
        lines.push(`  -H 'Content-Type: application/json'`);
        lines.push(`  --data '${payload.replace(/'/g, `'\\''`)}'`);
      } else if (bodyContent && method !== 'GET' && method !== 'HEAD') {
        if (request.bodyType === 'json') lines.push(`  -H 'Content-Type: application/json'`);
        else if (request.bodyType === 'xml') lines.push(`  -H 'Content-Type: application/xml'`);
        else if (request.bodyType === 'x-www-form-urlencoded') lines.push(`  -H 'Content-Type: application/x-www-form-urlencoded'`);
        lines.push(`  --data '${bodyContent.replace(/'/g, `'\\''`)}'`);
      }
      return lines.join(' \\\n');
    }

    case 'javascript': {
      const headerObj: Record<string, string> = {};
      headers.forEach((h) => (headerObj[h.key] = h.value));
      if (request.auth?.type === 'bearer' && request.auth.bearerToken) {
        headerObj['Authorization'] = `Bearer ${request.auth.bearerToken}`;
      }

      let bodyExpr = 'undefined';
      if (request.bodyType === 'graphql') {
        headerObj['Content-Type'] = 'application/json';
        bodyExpr = `JSON.stringify({\n    query: ${JSON.stringify(request.graphqlQuery || '')},\n    variables: ${request.graphqlVariables || '{}'}\n  })`;
      } else if (bodyContent && method !== 'GET' && method !== 'HEAD') {
        if (request.bodyType === 'json') {
          headerObj['Content-Type'] = 'application/json';
          bodyExpr = JSON.stringify(bodyContent);
        } else {
          bodyExpr = JSON.stringify(bodyContent);
        }
      }

      return `// JavaScript (Fetch API)
async function sendRequest() {
  const url = "${resolvedUrl}";
  const options = {
    method: "${method}",
    headers: ${JSON.stringify(headerObj, null, 4)},
    ${bodyExpr !== 'undefined' ? `body: ${bodyExpr}` : ''}
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.error("Request failed:", error);
  }
}

sendRequest();`;
    }

    case 'python': {
      const headerObj: Record<string, string> = {};
      headers.forEach((h) => (headerObj[h.key] = h.value));
      if (request.auth?.type === 'bearer' && request.auth.bearerToken) {
        headerObj['Authorization'] = `Bearer ${request.auth.bearerToken}`;
      }

      let dataLine = '';
      if (request.bodyType === 'graphql') {
        headerObj['Content-Type'] = 'application/json';
        dataLine = `payload = {\n    "query": """${request.graphqlQuery || ''}""",\n    "variables": ${request.graphqlVariables || '{}'}\n}\n`;
      } else if (bodyContent && method !== 'GET' && method !== 'HEAD') {
        dataLine = `payload = """${bodyContent}"""\n`;
      }

      return `# Python (requests)
import requests

url = "${resolvedUrl}"
headers = ${JSON.stringify(headerObj, null, 4)}
${dataLine ? dataLine : ''}
response = requests.request(
    method="${method}",
    url=url,
    headers=headers,
    ${dataLine ? 'data=payload' : ''}
)

print(response.status_code)
print(response.text)
`;
    }

    case 'rust': {
      return `// Rust (reqwest)
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use std::error::Error;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let client = reqwest::Client::new();
    let res = client
        .${method.toLowerCase()}("${resolvedUrl}")
        ${request.auth?.type === 'bearer' ? `.bearer_auth("${request.auth.bearerToken || ''}")` : ''}
        ${bodyContent && method !== 'GET' ? `.body(r#"""${bodyContent}"""#)` : ''}
        .send()
        .await?;

    println!("Status: {}", res.status());
    let body = res.text().await?;
    println!("Body: {}", body);
    Ok(())
}
`;
    }

    case 'go': {
      return `// Go (net/http)
package main

import (
	"fmt"
	"io"
	"net/http"
	"strings"
)

func main() {
	url := "${resolvedUrl}"
	method := "${method}"

	${bodyContent && method !== 'GET' ? `payload := strings.NewReader(\`${bodyContent}\`)` : 'var payload io.Reader = nil'}

	client := &http.Client{}
	req, err := http.NewRequest(method, url, payload)
	if err != nil {
		fmt.Println(err)
		return
	}

	${headers.map((h) => `req.Header.Add("${h.key}", "${h.value}")`).join('\n\t')}
	${request.auth?.type === 'bearer' ? `req.Header.Add("Authorization", "Bearer ${request.auth.bearerToken || ''}")` : ''}

	res, err := client.Do(req)
	if err != nil {
		fmt.Println(err)
		return
	}
	defer res.Body.Close()

	body, err := io.ReadAll(res.Body)
	if err != nil {
		fmt.Println(err)
		return
	}
	fmt.Println(string(body))
}
`;
    }
  }
}
