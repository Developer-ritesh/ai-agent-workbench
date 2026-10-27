# macOS AI Agent Workbench — UI/UX Repair Plan & Comprehensive Audit

## Executive Summary

This document outlines the detailed audit findings, root cause analyses, design system specifications, and implementation steps required to repair and elevate the user experience of the **macOS AI Agent Workbench**.

Based on empirical testing and review of the running application at 2560x1600 Retina resolution, four core problem areas were diagnosed:
1. **API Testing Studio**: Giant empty black voids below short query parameter tables and response payloads, cramped omnibox, non-resizable 50/50 split.
2. **Integrated Browser**: Underutilized viewport, status cards crowded at the top, console stream disconnected from the bottom drawer, lacks collapsible diagnostics panel and responsive device framing.
3. **Git & Code Review**: Harsh high-contrast neon diff highlights, massive 600px dead space below short diffs, cramped left sidebar, floating review box.
4. **Settings & MCP Server Management**: Wall of dense unformatted server rows, unstyled background colors inconsistent with the main IDE theme, missing categories/search grouping, no detail configuration drawer, and 413 skills dumped into a flat list.

---

## 1. Application-Wide Audit Findings & Root Causes

### 1.1 Global Layout & CSS Constraints
- **Typography Scale**: In `apps/desktop/src/index.css`, root font-size was previously set to `13px`, shrinking all Tailwind `rem` classes (`text-xs` evaluated to `9.75px`). On high-density Retina displays, controls became microscopic and illegible.
- **Empty Space Allocation**: Containers frequently set `flex-1` on an outer container, but child cards had no minimum heights or sensible flex distribution, leaving 60%–80% of widescreen displays as pitch-black empty space.
- **Missing Splitter Resizing**: Left sidebars and middle panes had fixed `w-64` or static `w-1/2` layouts with no mouse-drag splitters, preventing developers from adjusting the workspace to their task.
- **Inconsistent Theme Colors**: `McpSkillsManager.tsx` used custom hardcoded `#131824`, `#10141d`, and `#1a202e` backgrounds rather than the IDE's unified CSS variables (`--bg-app`, `--border-subtle`, `--bg-surface`, `border-white/[0.08]`).

### 1.2 API Testing Studio Audit
- **Cramped Request Omnibox**: URL input and method dropdown had thin padding and low visual hierarchy.
- **Dead Space in Request Pane**: In Side-by-Side mode, query params only have 2 rows, leaving 500px of dead space below the table.
- **Missing Request/Response Resizer**: The horizontal split between Request and Response was locked at `w-1/2`, with no drag handle.
- **Response Viewer Layout**: Plain JSON rendered against black background without line count badges, payload statistics cards, quick copy snippets, or collapsible section headers.

### 1.3 Integrated Web Browser Audit
- **Overcrowded Status & Underutilized Viewport**: Live metrics (API latency, RAM, dev ports) were taking up space above the canvas instead of residing in a collapsible drawer or status bar.
- **Viewport Framing**: The viewport lacked sleek device bezels (e.g. MacBook Pro frame in Desktop mode, iPhone frame in Mobile mode) to give visual grounding.
- **Console Output Placement**: The HMR console stream was rendered as a small box inside the simulated app rather than inside the workbench's dockable bottom drawer.

### 1.4 Git & Code Review Audit
- **Neon Line Blinding**: Diff additions/deletions used high-saturation green and red background fills with borderlines across the entire screen width, causing eye strain.
- **Massive Black Void**: When a diff has fewer than 40 lines (e.g. `src/auth/service.rs`), 70% of the screen below the diff remained completely empty.
- **Floating Review Box**: The sign-off card was detached at the bottom rather than integrated into a sticky review drawer with merge readiness criteria.
- **Sidebar Width**: The changed-files list was constrained to `w-76`, truncating file paths.

### 1.5 Settings & OpenCode MCP Management Audit
- **Dense Unformatted List**: 17 MCP servers were rendered in a monotonous list of flat cards with command strings overflowing.
- **Lack of Filtering & Categories**: No quick tabs for `All`, `Local`, `Remote`, `Active`, or `Inactive`.
- **No Detail / Edit Inspector**: Clicking a server did not open a dedicated side drawer or configuration view with secrets masking, environment variables editor, and diagnostics.
- **Skills Directory Overwhelm**: 413 pre-installed skills were rendered in a single flat list without pagination or category badges.

---

## 2. Design System Tokens & Visual Standardization

The workbench adopts a refined **macOS Developer Tool Aesthetic** (inspired by Linear, Xcode 16, and Cursor):

| Token | Dark Mode Value | Light Mode Value | Usage |
|---|---|---|---|
| `--bg-app` | `#08090d` | `#f8fafc` | Main application canvas |
| `--bg-surface` | `rgba(22, 26, 40, 0.65)` | `#ffffff` | Card surfaces, modals |
| `--bg-input` | `rgba(14, 17, 27, 0.85)` | `#ffffff` | Text fields, selectors |
| `--border-subtle` | `rgba(255, 255, 255, 0.08)` | `rgba(0, 0, 0, 0.08)` | Dividers, card borders |
| `--border-focus` | `#6366f1` | `#4f46e5` | Active inputs, primary focus |
| `--accent-primary` | `#6366f1` (Indigo) | `#4f46e5` | Primary actions, key badges |
| `--accent-cyan` | `#06b6d4` | `#0284c7` | Links, active tab indicators |
| `--status-emerald`| `#10b981` | `#059669` | Success, 200 OK, active VM |
| `--status-rose` | `#f43f5e` | `#e11d48` | Errors, deletions, stopped |

### Typography Scale
- **Root Scale**: `14px` (`html, body { font-size: 14px; }`).
- **Base UI Text**: `text-sm` (14px) with `leading-relaxed`.
- **Labels & Badges**: `text-xs` (12px) with medium/bold weight.
- **Code & Monospace**: `13px` JetBrains Mono with 1.6 line height.
- **Headers**: `text-base` (16px) font-bold for section headers, `text-lg` (18px) for modal headers.

---

## 3. Module-by-Module Implementation Plan

### Phase 1: Shared Layout & Resizable Splitter Architecture
1. Implement a reusable, smooth mouse-drag splitter component (`ResizableSplitter.tsx`) for sidebars and two-column panes.
2. Standardize panel proportions across the workbench:
   - Left navigation rail: 56px fixed.
   - Left secondary sidebars: Default 280px, resizable between 220px and 480px.
   - Main content canvas: Fills 100% remaining width and height (`min-w-0`, `min-h-0`).

### Phase 2: API Testing Studio Overhaul
1. **Omnibox Modernization**: Floating 50px pill omnibox with high-contrast method pill, spacious URL input, keyboard shortcut badge (`⌘↵`), and Send/Save actions.
2. **Resizable Request vs. Response Split**: Horizontal mouse-drag divider between Request Builder (left) and Response Viewer (right).
3. **Workspace Space Fillers**:
   - In Request pane: Under query parameters, provide quick presets (JSON body generator, authorization helpers, environment variable picker).
   - In Response pane: Prominent status banner (Status code pill, latency, size), tabbed response body (Pretty JSON, Raw, Headers, Tests), and integrated search bar.
4. **Empty State & Workstation Hub**: When no response is active, display a structured grid of Quick Test Endpoints, microVM API health checks, and cURL import shortcuts.

### Phase 3: Integrated Web Browser Overhaul
1. **Unified Two-Row Navigation**:
   - Row 1: Chrome/Arc tab strip with close buttons, port badges, CDP indicator, and dark/light canvas switch.
   - Row 2: Omnibox toolbar with navigation controls, SSL status, URL input, Desktop/Mobile device toggle, and mode switcher.
2. **Maximized Viewport Canvas**:
   - Expand viewport to fill 100% height.
   - In `simulator` mode, render a clean device preview frame with responsive controls.
   - Move diagnostics (API ping, memory ballooning, ports) into a slide-out drawer or right-side inspector.
   - Move live HMR console stream into the bottom dockable drawer.

### Phase 4: Git & Code Review Overhaul
1. **Diff Typography & Styling**:
   - Subtle, modern background tints for additions (`rgba(16, 185, 129, 0.08)`) and deletions (`rgba(244, 63, 94, 0.08)`).
   - Crisp 13px JetBrains Mono with dedicated line-number gutters.
2. **Zero Empty Space**:
   - When a diff is shorter than the viewport, render the **Repository Commit History Graph** and **Automated Security Audit Report** below it in a cohesive two-tier layout.
   - Integrated **Code Review & Sign-Off Station** with review notes, approval button, and merge readiness checklist.
3. **Resizable Source Control Sidebar**:
   - Allow dragging the sidebar width (default 320px).
   - Clear grouping for Staged Changes and Working Tree Changes with additions/deletions counts.

### Phase 5: Settings & MCP Server Management Overhaul
1. **Color & Theme Unification**: Replace ad-hoc dark blue `#131824` with standard `--bg-app` and glassmorphic panels.
2. **Category & Status Filtering**:
   - Filter pills: `All Servers`, `Local (stdio)`, `Remote (SSE/HTTP)`, `Active`, `Disabled`.
   - Real-time search by name, package, or endpoint.
3. **Dedicated Configuration Detail Drawer / Modal**:
   - Clicking any server opens an inspector drawer with masked secrets, environment variables, command arguments, and connection test button.
4. **Skills Directory Categorization**:
   - Group skills into categories (Security, Agent Autonomy, Frontend, Backend, Tools).
   - Paginated or virtualized list with instant search and markdown preview drawer.
5. **Confirmation Dialogs**: Custom modal confirmations for destructive actions (Delete MCP Server, Purge Cache).

---

## 4. Verification & Testing Matrix

| Component | Test Scenarios | Verification Method |
|---|---|---|
| **API Studio** | Send request, edit query params, toggle tabs, test JSON search, drag resizer | Cargo tests + TS tests + Desktop app UI |
| **Integrated Browser** | Navigate to `localhost:5173`, switch simulator/iframe, resize to Mobile (375px), toggle DevTools | Desktop app UI verification |
| **Git Diff Viewer** | Select changed files, switch Unified/Split, approve review, copy commit SHA | Desktop app UI verification |
| **Settings & MCP** | Filter local/remote, toggle server, edit config, search 400+ skills, preview SKILL.md | Desktop app UI verification |
| **Build & Bundle** | Verify 0 TypeScript errors, 16 Rust cargo tests pass, build Tauri release `.app` | `npm test && npm run tauri build` |
