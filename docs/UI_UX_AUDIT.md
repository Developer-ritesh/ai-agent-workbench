# macOS AI Agent Workbench — UI/UX Audit & Redesign Plan

**Date:** 2026-10-25  
**Version:** 2.0  
**Status:** In Progress / Implementation Phase  

---

## 1. Executive Summary

The current UI implementation provides a functional baseline for Milestone 1, but lacks the refinement, layout flexibility, visual hierarchy, and cohesive feel of modern macOS developer tools (such as VS Code, Linear, and Raycast). 

This document outlines the findings of our UI/UX audit and provides the architectural redesign plan to transform the Workbench into a production-grade macOS developer environment.

---

## 2. Comprehensive Screen & Component Audit

| Area | Current State | Issues Identified | Target State (Redesign) |
|---|---|---|---|
| **Theme & Design System** | Fixed dark theme variables only; high contrast neon cyan. | No light theme, no system appearance support (`prefers-color-scheme`). Inconsistent borders, radii, and typography. | Complete dual-theme design system (Light / Dark / System), refined macOS tokens, subtle glass and border hierarchy, accessible contrast. |
| **Global Navigation & Shell** | Simple left sidebar with vertical buttons; basic header with limited controls. | No command palette (`Cmd+K`), no panel toggle shortcuts (`Cmd+B`, `Cmd+J`), missing Settings & Diagnostics view. | Native macOS style toolbar, quick workspace switcher, Command Palette (`Cmd+K`), layout panel toggles, theme switcher. |
| **Workspace Dashboard** | Basic card grid with 3 stat widgets. | No search, no filter (All/Running/Stopped), no sort (Name, Status, Recent), no project templates or quick cloning. | Production workspace dashboard with live search, filters, sorting, quick clone/open actions, and actionable empty states. |
| **Coding Workspace (IDE)** | Stacked view with top bar, single center tab, and bottom terminal. | Not an IDE layout. No file tree sidebar, no resizable split panes, no persistent panel states. | Professional 3-pane IDE layout: collapsible File Explorer / Git sidebar, center Code / Agent Editor, collapsible right Agent inspector, and collapsible bottom Terminal. |
| **Agent Task Panel** | Textarea with basic start/stop button and past sessions list. | No step-by-step tool timeline, no execution progress indicator, no tool call transparency. | Visual execution timeline with steps (Starting, Running, Tool execution, Code modification, Verification), stats, and cancellation. |
| **Integrated Terminal** | Basic text box with command execution and presets. | Tabs do not change streams, no session badge distinguishing guest VM from host, no copy/clear controls. | Multi-tab terminal (Linux Guest Shell vs OpenCode Agent Logs vs Diagnostics), connection status badge, copy/search/clear actions. |
| **File Explorer & Git** | Static mock diff text and command output. | Cannot explore files or directories in project; no file creation or inspection. | Interactive file tree explorer with file type icons, status badges (`M`, `U`, `A`), and interactive Git diff viewer. |
| **Provider & Keychain Profiles** | Simple form and card list. | Secrets not masked with toggle, no "Test Connection" action, no error categorization. | Masked API keys with reveal toggle, provider test button, macOS Keychain status badge, model selection. |
| **Settings & Diagnostics** | Missing entirely. | Users cannot configure preferences, themes, VM defaults, or inspect SQLite audit events. | Full Settings view: Appearance, VM Resources, Terminal Preferences, Security, and live SQLite Audit Log viewer. |

---

## 3. Design System Specifications

### 3.1 Design Principles
1. **Native macOS Developer Feel**: High information density without clutter, clean typography (`Geist` / Apple SF Pro / `JetBrains Mono`), consistent 4px/8px grid.
2. **Restrained Elegance**: Prioritize readability over flashy gradients. Subtle 1px borders, gentle surface elevations, and refined focus rings.
3. **Accessibility & Usability**: Full keyboard navigation, visible focus indicators, screen reader accessibility, and support for system theme switching.

### 3.2 Themes
- **Dark Mode**: Neutral slate backgrounds (`#0f1117`, `#161922`, `#1e222d`), crisp borders (`rgba(255, 255, 255, 0.08)`), muted text (`#8b949e`), active text (`#f0f6fc`).
- **Light Mode**: Clean macOS window backgrounds (`#f6f8fa`, `#ffffff`, `#eaeef2`), crisp borders (`rgba(0, 0, 0, 0.08)`), high readability text (`#1f2328`, `#656d76`).
- **Accent Palette**: 
  - Accent Primary: `#0284c7` (Sky / macOS Blue)
  - Success: `#10b981` (Emerald)
  - Warning: `#f59e0b` (Amber)
  - Danger: `#f43f5e` (Rose)

---

## 4. Implementation Plan

1. **Tokens & Theme Architecture**: Implement complete CSS token system in `src/index.css` supporting `data-theme="light"` and `data-theme="dark"`.
2. **Shared UI Components**:
   - `Button`, `Input`, `Select`, `Modal`, `StatusBadge`, `Dropdown`, `Tooltip`, `CommandPalette`.
3. **Redesigned Navigation & Shell**:
   - Top Header with workspace switcher, theme toggle, Command Palette button, layout toggles.
   - Left Activity Bar with quick view switching and keyboard shortcuts.
4. **Enhanced Features**:
   - `WorkspaceList`: Search, filters, sort, project templates, quick action buttons.
   - `WorkspaceDetail`: Multi-panel resizable IDE layout with Collapsible File Explorer, Center Code/Agent tabs, Right Agent detail inspector, and Bottom Terminal.
   - `AgentPanel`: Interactive prompt composer, tool execution timeline, status indicators.
   - `TerminalPanel`: Multi-tab terminal with clear connection state and presets.
   - `GitDiffViewer`: File changes list with diff lines and accept/revert actions.
   - `ProviderManager`: Masked keys, connection test, Keychain verification.
   - `SettingsView`: Full settings and live audit log inspector.
5. **Quality Assurance**:
   - Verify `cargo test` and `npm run build` pass with zero errors.
   - Test responsive layout and theme switching.
