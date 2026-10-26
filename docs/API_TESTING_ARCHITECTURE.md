# API Testing Studio Architecture & Implementation Guide

## Overview

The **API Testing Studio** is a fully functional, production-grade API testing suite built directly inside the macOS AI Agent Workbench. It serves as an embedded alternative to Postman, Insomnia, and Paw for core API development, request crafting, automated assertions, and collection workflows.

The system executes **real HTTP requests** through a secure, native Rust/Tauri execution pipeline. It avoids mock responses, static layouts, or placeholder buttons.

---

## 1. Architectural Model

```
+-----------------------------------------------------------------------------------------+
|                                    React 19 Frontend                                    |
|                                                                                         |
|  +--------------------+  +-----------------------------------------------------------+  |
|  |    Left Sidebar    |  |                       Workspace                           |  |
|  | - Collections      |  | - Method Selector & URL Omnibox with {{var}} resolution   |  |
|  | - Folders          |  | - Actions: Send, Cancel, Save, Code Gen, AI Debug         |  |
|  | - Request History  |  | - Request Tabs: Params, Auth, Headers, Body, Scripts,     |  |
|  | - Environments     |  |                 Settings                                  |  |
|  | - OpenAPI Specs    |  | - Response Tabs: Body (Pretty/Raw/Preview), Headers,      |  |
|  +--------------------+  |                  Cookies, Tests, Timing Waterfall         |  |
|                          +-----------------------------------------------------------+  |
|                                                      |                                  |
|  +---------------------------------------------------+-------------------------------+  |
|  | Sandboxed Script Engine (scriptEngine.ts)         | Importers & Code Generators   |  |
|  | - Postman pm.test / pm.expect Chai runner         | - Postman v2.1 Import/Export  |  |
|  | - Pre-request variable generators                 | - OpenAPI 3.0 / Swagger       |  |
|  | - Isolated Function execution sandbox             | - cURL, Fetch, Python, Rust,  |  |
|  |                                                   |   Go snippet engines          |  |
|  +---------------------------------------------------+-------------------------------+  |
+-------------------------------------------|---------------------------------------------+
                                            | Tauri IPC (`invoke`)
                                            v
+-----------------------------------------------------------------------------------------+
|                                    Rust / Tauri Core                                    |
|                                                                                         |
|  +-----------------------------------------------------------------------------------+  |
|  | `api_execute_request` & `api_parse_curl` (commands/api_client.rs)                 |  |
|  | - SSRF & Cloud Metadata Blocking (169.254.169.254, metadata.google.internal)     |  |
|  | - Safe Protocol Enforcement (http:// and https:// only)                           |  |
|  | - Zero-dependency Tokenizing cURL Parser                                          |  |
|  | - Child Process Spawning (`/usr/bin/curl`) with High-Precision Timing Writeouts   |  |
|  | - Cookie Header Extraction & Parsing (`Set-Cookie`)                               |  |
|  | - Header Decomposition & Delimited Multi-Segment Output Parsing                   |  |
|  +-----------------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Component Breakdown

### 2.1 Backend Pipeline (`apps/desktop/src-tauri/src/commands/api_client.rs`)

1. **Safety & SSRF Enforcement**:
   - Rejects non-HTTP(S) URIs (blocks `file://`, `gopher://`, `ftp://`).
   - Rejects cloud metadata addresses (`169.254.169.254`, `metadata.google.internal`).
2. **Network Execution**:
   - Utilizes macOS's native `/usr/bin/curl` with low-level execution parameters:
     - Header injection (`-H`).
     - Request body piping (`--data`, `--data-raw`, form data, GraphQL).
     - SSL verification toggle (`-k` / `--insecure`).
     - Follow-redirect configuration (`-L --max-redirs <N>`).
     - Proxy routing (`-x <proxy_url>`).
     - Connect and execution timeouts (`--connect-timeout`, `--max-time`).
3. **High-Precision Timing Waterfall**:
   - Built via curl formatting tokens:
     ```text
     %{time_namelookup} -> DNS Lookup Duration
     %{time_connect}    -> TCP Connect Duration
     %{time_appconnect} -> TLS Handshake Duration
     %{time_starttransfer} -> Time to First Byte (TTFB)
     %{time_total}      -> Complete Request Duration
     ```
   - Computed into `ApiTimingMetrics` (DNS, TCP, TLS, TTFB, Content Transfer, Total).
4. **Cookie Parser**:
   - Extracts all `Set-Cookie` response headers.
   - Decomposes into structured `ApiCookie` objects: name, value, domain, path, expires, httpOnly, and secure.

### 2.2 Frontend Architecture (`apps/desktop/src/features/api/`)

- **`ApiStudio.tsx`**:
  - Main interactive IDE pane for request building and response inspection.
  - Tabbed sub-views: Params, Authorization, Headers, Body, Pre-request Scripts, Tests, Settings.
  - Multi-tab response pane: Body (with JSON syntax highlighting, search, and formatted view), Headers, Cookies, Test Results, and Timing Waterfall.
  - Modals for Collection Runner, Code Generator, Import/Export, Environment Variables, and AI Diagnostics.
- **`scriptEngine.ts`**:
  - Sandboxed execution engine providing full Chai-style assertion syntax (`pm.test`, `pm.expect`, `pm.response`, `pm.environment`, `pm.variables`).
  - Pre-request script variable expansion and environment updates.
  - Hardened execution boundary isolating host, DOM, and network.
- **`codeGenerators.ts`**:
  - Generates production-ready snippets in 5 targets: cURL, JavaScript (Fetch), Python (requests), Rust (reqwest), and Go (net/http).
- **`importers.ts`**:
  - Bidirectional Postman Collection v2.1.0 JSON converter preserving folders, items, query parameters, headers, and variables.
  - OpenAPI 3.0 / Swagger JSON converter organizing endpoints into folders based on API tags and route hierarchies.

---

## 3. Data Persistence & State Model

The studio state persists automatically across application restarts in local structured storage:
- **Collections (`ApiCollection[]`)**: Hierarchical folders, requests, descriptions, and collection-level variables.
- **History (`ApiHistoryItem[]`)**: Sequential log of past executed requests with timestamps, HTTP status, and duration.
- **Environments (`ApiEnvironment[]`)**: Named variable sets (Local, Staging, Production) with public values and secret-masked entries.
- **Active Workspace Request**: Preserves active tab, pending edits, and last-received response.
