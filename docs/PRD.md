# macOS AI Agent Workbench
## Product Requirements Document (PRD) & System Architecture

**Version:** 1.0  
**Status:** In Progress / Implementing Milestone 1  
**Target platform:** macOS on Apple Silicon  
**Primary agent:** OpenCode  
**Execution model:** Dedicated Linux virtual machines  
**Desktop stack:** Tauri 2, React, TypeScript, Rust  
**VM orchestration:** Apple Virtualization framework / vfkit  
**Document purpose:** Product planning, technical implementation, and AI-assisted development

---

## 1. Executive Summary

The macOS AI Agent Workbench is a desktop development environment that runs coding agents inside dedicated virtual machines (VMs). It provides an integrated terminal, project explorer, file editor, Git tools, agent session management, provider configuration, credential management, and VM lifecycle controls.

The application should feel like a combination of a coding IDE, a terminal multiplexer, a VM manager, and an AI-agent control plane.

Unlike a conventional terminal wrapper, the Workbench makes the virtual machine the default execution boundary for AI agents.

### Core value proposition

- Run OpenCode inside a disposable or persistent Linux VM.
- Give agents read/write access to explicitly selected project directories.
- Execute shell commands inside the VM without exposing the host shell by default.
- Switch between authorized provider profiles without exposing credentials to agent prompts or logs.
- Start, stop, snapshot, restore, and delete workspaces.
- Review file changes, terminal output, and Git diffs before accepting modifications.
- Support multiple independent projects and agent sessions.

### Product boundaries

The initial release is a local-first developer tool. It does not require a cloud control plane, user account, or hosted application backend.

The product will not implement credential spoofing, hardware identity rotation to evade provider limits, or automated circumvention of service quotas. It will support legitimate credential selection, provider-specific usage limits, local models, and transparent error handling.

---

## 2. Goals and Non-Goals

### 2.1 Goals

1. Provide a reliable macOS desktop application.
2. Isolate agent execution within Linux VMs.
3. Support OpenCode CLI execution and session lifecycle management.
4. Allow controlled host-to-guest project file access.
5. Provide an interactive terminal with streaming output and input.
6. Store authorized provider credentials securely.
7. Support multiple workspaces, VM configurations, and agent sessions.
8. Provide Git status, diffs, change review, and recovery options.
9. Enforce resource limits and configurable network policies.
10. Make errors, permissions, and VM status observable to the developer.

### 2.2 Non-goals for MVP

- A complete replacement for Xcode, VS Code, or another IDE.
- Running arbitrary macOS guest VMs on every supported Mac configuration.
- A remote multi-user VM hosting platform.
- Guaranteed compatibility with every AI provider.
- Automatic circumvention of free-tier quotas.
- Unrestricted access to the host filesystem.
- Fully autonomous execution of destructive host operations.
- A proprietary foundation model or inference engine.

---

## 3. Recommended Technology Stack

| Layer | Technology | Responsibility |
|---|---|---|
| Desktop shell | Tauri 2 | Application window, packaging, native integration |
| Frontend | React + TypeScript | UI and workspace interactions |
| Native core | Rust | Permissions, orchestration, IPC, process supervision |
| VM backend | Apple Virtualization framework / vfkit | Linux VM lifecycle on Apple Silicon |
| Guest OS | Ubuntu LTS / Minimal Linux | Agent execution |
| Guest supervisor | Small Rust/Python service | Authenticated guest commands and health reporting |
| Agent runtime | OpenCode CLI | AI coding workflow |
| Terminal frontend | xterm.js | Terminal rendering and interaction |
| Terminal backend | Guest PTY / vsock service | Interactive shell and process I/O |
| Editor | Monaco Editor | Code editing and diff presentation |
| Persistence | SQLite | Workspace and session metadata |
| Secret storage | macOS Keychain | Provider credential storage |
| Version control | Git CLI | Repository operations and recovery |

---

## 4. First Milestone Implementation: Core Slice

1. Launch a Tauri 2 desktop window with workspaces and VM controls.
2. Create/provision Linux VMs using `VmBackend` trait and `vfkit`.
3. Guest supervisor interface with command execution and health checks.
4. Project mount via virtio-fs with path sanitization and boundary checking.
5. Workspace persistence in SQLite with audit events.
6. Interactive terminal & agent monitoring panel with real-time status.
