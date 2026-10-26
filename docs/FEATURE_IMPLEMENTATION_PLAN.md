# AI Agent Workbench - Feature Implementation Plan & Roadmap

## 1. Executive Summary & Codebase Baseline

The **macOS AI Agent Workbench** is an advanced desktop development environment running on macOS (Apple Silicon). It isolates AI coding agents (specifically OpenCode) inside hardware-isolated Linux MicroVMs using Apple's native Virtualization framework (`vfkit`), Virtio-FS, and Virtio-Serial PTY consoles.

### 1.1 Baseline Assessment
- **Stack**: Tauri 2 (v2.12.5), React 19, TypeScript 6, Rust 1.85+, SQLite (rusqlite 0.32), macOS Keychain (`keyring` 3.6), `portable-pty` 0.9.
- **Rust Backend**:
  - `commands/workspace.rs`: Workspace CRUD, path validation via `PathValidator`.
  - `commands/vm.rs`: VM start, stop, rotate, status.
  - `commands/agent.rs`: Supervised OpenCode process execution.
  - `commands/fs.rs`: Real filesystem operations (read, write, search, create, delete, git).
  - `commands/pty.rs`: Isolated Linux MicroVM terminal console with dynamic window resizing (`.term_size` sync).
  - `commands/network.rs`: Real-time macOS network interface sampling (upload/download speeds, latency, connectivity retry).
  - `commands/provider.rs`: AI provider profile persistence and Keychain integration.
- **Frontend Architecture**:
  - `components/Navigation.tsx`: VS Code-style left activity bar.
  - `components/Header.tsx`: Top header with project switcher, VM status, Auto-Rotate countdown, Network Speed Meter, and layout toggles.
  - `features/workspaces/WorkspaceDetail.tsx`: Resizable 3-pane IDE layout (Sidebar, Center Column, Bottom Panel).
  - `features/editor/CodeEditorPanel.tsx`: Tabbed editor with breadcrumbs and syntax line numbers.
  - `features/terminal/TerminalPanel.tsx`: xterm.js terminal connected directly to guest VM.
  - `features/agents/AgentPanel.tsx`: Right agent drawer for chat, prompt execution, and diff review.
  - `features/settings/SettingsView.tsx`: Comprehensive settings (Appearance, VM Sandbox, OpenCode session cleanup, Audit Log).
- **Test Baseline**:
  - `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`: **6 passed, 0 failed** (Unit tests for path validation, in-memory SQLite CRUD, and end-to-end integration slice).
  - `npm --prefix apps/desktop run build`: **Vite + TSC build succeeded** in ~600ms with zero errors.

---

## 2. Gaps & Enhancement Objectives

To upgrade the Workbench into a complete production-quality developer IDE, the following subsystems must be implemented:
1. **Integrated Browser Workspace**: In-app web preview for forwarded ports and external web development, multi-tab browsing, responsive viewports (Desktop/Tablet/Mobile), console error logging, network request tracking, and instant screenshot analysis for AI agents.
2. **API Testing Studio**: Postman/Insomnia-class client for REST/HTTP APIs with full HTTP methods, query/header/cookie/body editors, environment profiles (`{{baseUrl}}`), collections, OpenAPI/Postman import/export, and automated collection test runner.
3. **Automatic Testing Engine**: Unified runner for unit tests, integration tests, Playwright E2E browser tests, API tests, and lint/typechecks. Structured reports with pass/fail/duration, screenshot & trace viewer, and AI-assisted fix loops.
4. **Port Forwarding Manager**: Dedicated Ports panel to discover listening guest ports, establish loopback port forwards (guest:8080 -> 127.0.0.1:8080), manage forward lifecycle, and provide one-click "Open in Integrated Browser".
5. **AI Agent Control Center**: Enhanced workflow lifecycle (Plan -> Code -> Start App -> Detect Port -> Browser Test -> API Test -> Review), task queues, live execution logs, approve/reject controls, and Git worktree isolation.
6. **Git & Code Review**: Multi-file diff viewer with line-level inspection, AI-powered code review, checkpoints before destructive actions, and safe rollbacks.
7. **VM & Dev Environment Manager**: Enhanced hardware telemetry (CPU, RAM, Disk, Net), snapshot/restore controls, runtime profiles (Node, Python, Flutter, Docker), and environment health diagnostics.
8. **Unified Diagnostics & Debugging**: Centralized log viewer aggregating frontend, Tauri/Rust, VM supervisor, terminal, agent, API, and test events with search, filtering, and AI diagnosis.
9. **MCP & Extension Manager**: Model Context Protocol (MCP) server configuration, tool discovery, permissions review, and diagnostics.

---

## 3. Milestones & Implementation Phases

### Phase 1: Core Navigation & Layout Framework
- Extend `ActivityTab` in `Navigation.tsx` to include `browser`, `api`, `tests`, `ports`, `diagnostics`.
- Update `WorkspaceDetail.tsx` and `App.tsx` to smoothly route between Editor, Browser, API Studio, Test Engine, and Diagnostics while preserving sidebar context and bottom terminal.
- Ensure all views handle resizing, keyboard shortcuts, and theme transitions.

### Phase 2: Integrated Browser & Port Forwarding Manager
- **Rust Backend**:
  - `commands/ports.rs`: Scan listening ports on localhost and VM guest, manage forwarding tunnels, check port availability.
- **Frontend Components**:
  - `features/browser/IntegratedBrowser.tsx`: Multi-tab browser, URL bar, navigation controls, responsive viewport presets, console error capture, network request inspector, screenshot capture tool for agent prompt context.
  - `features/ports/PortForwardingPanel.tsx`: Listening ports table, guest-to-host forward controls, conflict resolver, status indicators, and "Open in Browser" action.

### Phase 3: API Testing Studio
- **Rust Backend**:
  - `commands/api_client.rs`: Safe HTTP request dispatcher with timeout, SSRF protection (loopback/private IP whitelist enforcement), header redaction, and response streaming.
- **Frontend Components**:
  - `features/api/ApiStudio.tsx`: HTTP method selector, URL input, query/header/auth/body tabs, formatted response viewer (JSON, XML, HTML, Raw), timing & size metrics.
  - Collections, Folders, and Environment manager (`{{baseUrl}}`, `{{token}}`).
  - OpenAPI 3.0 and Postman Collection v2.1 import/export parser.
  - Collection test runner with pass/fail status reports.

### Phase 4: Automatic Testing Engine & Browser Automation
- **Rust Backend**:
  - `commands/test_runner.rs`: Unified test execution dispatcher (npm test, cargo test, pytest, playwright), structured JSON output parser, test discovery.
- **Frontend Components**:
  - `features/testing/TestingEngine.tsx`: Test suites list (Unit, Integration, E2E Browser, API), test run controls, live output log streamer, test summary cards, coverage bars.
  - Playwright test runner integration with screenshot and trace preview for failed browser tests.
  - "AI Test & Fix" assistant button: sends failed test output to AI agent with instructions to repair code.

### Phase 5: Git Review, Unified Diagnostics & Agent Workflows
- **Rust Backend**:
  - `commands/git.rs`: Enhanced git commands (diff with hunk details, branches, worktree management, checkpoints).
  - `commands/diagnostics.rs`: System-wide log collector and aggregator.
- **Frontend Components**:
  - `features/git/GitReviewPanel.tsx`: File-level and hunk-level diff reviewer, AI code review generator, rollback and commit tools.
  - `features/diagnostics/DiagnosticsPanel.tsx`: Unified log stream, category/level filter, search, AI root-cause diagnosis.
  - `features/agents/AgentPanel.tsx`: Upgraded workflow tab (Plan -> Code -> Port Detect -> Test -> Review).

### Phase 6: Security Hardening, VM Management, and Documentation
- Enhanced VM telemetry and health checks in `commands/vm.rs`.
- MCP server configuration manager in `features/mcp/McpManager.tsx`.
- Security validation: Keychain credentials, strict path validation, SSRF guards.
- Final documentation: `ARCHITECTURE.md`, `SECURITY_MODEL.md`, `FEATURE_TEST_REPORT.md`, `KNOWN_ISSUES.md`.

---

## 4. Acceptance Criteria & Definition of Done

1. **Compilation**: Zero Rust compiler warnings or errors (`cargo check`), zero TypeScript errors (`tsc && vite build`).
2. **Execution**: Application launches natively on macOS with `/Applications/AI Agent Workbench.app`.
3. **Integrated Browser**: Opens local development URLs (`http://localhost:3000`), forwards responsive viewports, logs console events, and captures screenshots for AI context.
4. **API Studio**: Executes real HTTP requests, inspects responses, handles environments, imports Postman/OpenAPI specs, and runs collection tests.
5. **Testing Engine**: Executes real test runners inside the project workspace and streams results with pass/fail metrics.
6. **Port Forwarding**: Discovers listening ports, manages port mappings, and provides instant browser preview.
7. **Git & Code Review**: Renders real working tree diffs and generates AI-assisted code reviews.
8. **Diagnostics**: Real-time diagnostic logging with error grouping and copy/export.
9. **Security**: No secrets logged or exposed to agent prompts without explicit authorization; path boundaries enforced.
