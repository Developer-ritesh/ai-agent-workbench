# API Testing Studio Security Model & Protections

## Executive Summary

The API Testing Studio operates with a defense-in-depth security architecture designed to prevent Server-Side Request Forgery (SSRF), safeguard sensitive credentials, isolate untrusted script execution, and protect AI agent interactions from credential leakage.

---

## 1. SSRF & Internal Network Safeguards

Because API testing clients execute outbound requests with native desktop privileges, strict validation boundaries are enforced on every request before child process execution:

### 1.1 Cloud Metadata Service Blocking
Any request targeting cloud provider instance metadata endpoints is immediately rejected with an `SSRF protection triggered` security violation error:
- `169.254.169.254` (AWS, Azure, GCP, DigitalOcean instance metadata service)
- `metadata.google.internal` (GCP metadata service)
- `169.254.170.2` (AWS task metadata service)

### 1.2 Protocol & Scheme Enforcement
- Requests are strictly restricted to `http://` and `https://`.
- Dangerous or non-web schemes (`file://`, `gopher://`, `ftp://`, `ldap://`, `dict://`) are rejected at the input boundary.

### 1.3 Safe Redirect Configuration
- Redirects are capped at a maximum of 10 (`--max-redirs 10`) to prevent infinite redirect loops and resource exhaustion attacks.
- SSL verification remains active by default unless explicitly toggled in per-request Settings.

---

## 2. Credential Security & Masking

### 2.1 UI Masking
- Environment variables marked with `isSecret: true` are visually masked with asterisks in the variable tables to prevent shoulder surfing and screen capture exposure.

### 2.2 Sanitized Exports
- When exporting collections or environment configurations to Postman-compatible JSON, secret values are excluded or redacted by default to avoid accidental commits to public version control.

### 2.3 Context Redaction for AI Diagnostics ("Ask AI to Debug")
When a failed or non-2xx request is sent to the AI Agent for diagnostic inspection, the payload undergoes automated redaction before being passed to the model:
1. `Authorization` headers (Bearer tokens, Basic auth credentials) are replaced with `[REDACTED]`.
2. Custom API key values and header secrets are replaced with `[REDACTED]`.
3. Cookie values in request and response cookies are replaced with `[REDACTED]`.
4. Password fields in JSON payloads are sanitized.

---

## 3. Sandboxed Scripting Environment

Imported Postman collections or third-party tests may contain arbitrary JavaScript. The script engine enforces strict containment:

1. **No Host Access**: Scripts do not have access to Node.js `process`, `fs`, `child_process`, or electron/tauri native bridges.
2. **DOM & Storage Isolation**:
   - Inside the script execution scope, global objects `window`, `document`, `fetch`, `XMLHttpRequest`, `localStorage`, and `sessionStorage` are shadowed as `undefined`.
   - Scripts are evaluated using a strict `Function` boundary:
     ```javascript
     const sandboxFn = new Function(
       'pm', 'console', 'window', 'document', 'fetch',
       'XMLHttpRequest', 'localStorage', 'sessionStorage',
       `"use strict"; ${userScript}`
     );
     sandboxFn(pm, customConsole, undefined, undefined, undefined, undefined, undefined, undefined);
     ```
3. **Controlled Scope**: The script can only interact with the provided `pm.*` API to read response data and modify scoped collection/environment variables.

---

## 4. Replay Safety

- Non-idempotent HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`) are never silently retried in the background. Retries must be triggered explicitly by the user.
- The Collection Runner provides a configurable stop-on-error toggle to halt batch execution when a request fails assertions.
