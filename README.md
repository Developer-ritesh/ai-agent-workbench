# macOS AI Agent Workbench

> Desktop development environment running **OpenCode** AI agents inside isolated Linux virtual machines on Apple Silicon.

[![Rust Tests](https://img.shields.io/badge/Rust%20Tests-Passed-success)](file:///Users/developerritesh/Dev-Action-2026/AI%20Agent%20Workbench/apps/desktop/src-tauri)
[![Tauri 2](https://img.shields.io/badge/Tauri-v2-blue)](https://tauri.app/)
[![Apple Silicon](https://img.shields.io/badge/Platform-macOS%20Apple%20Silicon-black)]()

---

## Highlights

- **Dedicated VM Isolation**: OpenCode coding agents execute inside dedicated Linux VMs via Apple Virtualization framework (`vfkit`), not directly on your Mac host.
- **Controlled Virtio-FS Mounts**: Only explicitly selected project folders are shared with the VM; user home directories, SSH keys, and system directories are strictly blocked.
- **macOS Keychain Secrets**: API keys for Anthropic, OpenAI, Gemini, etc. are stored directly in Keychain, referenced by opaque profile IDs, and never written to SQLite or application logs.
- **Integrated Guest Terminal**: Interactive shell connected to the guest VM with presets for `opencode --version`, `git status`, and command execution.
- **Git & Diff Review**: Inspect file changes made by OpenCode before accepting or committing.
- **SQLite Persistence**: Workspaces, sessions, and audit events stored in SQLite.

---

## Project Structure

```text
AI Agent Workbench/
├── apps/
│   └── desktop/
│       ├── src/                      # React 19 + TypeScript frontend
│       │   ├── components/           # Header, Navigation, StatusBadge, Modals
│       │   ├── features/
│       │   │   ├── workspaces/       # Workspace cards & detail workbench
│       │   │   ├── terminal/         # Interactive Linux guest terminal
│       │   │   ├── agents/           # OpenCode prompt execution & sessions
│       │   │   ├── providers/        # Keychain & provider profile manager
│       │   │   └── git/              # Git diff inspector & change acceptance
│       │   └── services/             # Tauri IPC service client
│       └── src-tauri/                # Tauri 2 Rust core controller
│           ├── src/
│           │   ├── security/         # PathValidator & boundary containment
│           │   ├── persistence/      # SQLite database & migrations
│           │   ├── credentials/      # macOS Keychain manager (keyring)
│           │   ├── vm/               # VmBackend trait & VfkitBackend
│           │   ├── agent/            # OpenCode agent supervisor
│           │   ├── workspace/        # Workspace manager coordinator
│           │   └── commands/         # Typed Tauri IPC command handlers
├── guest/
│   ├── supervisor/                   # Python guest daemon for Linux VM
│   └── provisioning/                 # VM setup script for Virtio-FS & OpenCode
├── packages/
│   └── shared-types/                 # Shared TypeScript models and contracts
└── docs/
    ├── PRD.md                        # Product Requirements Document
    └── ARCHITECTURE.md               # Architectural details & security model
```

---

## Quickstart

### Prerequisites
- macOS on Apple Silicon (M1/M2/M3/M4)
- Rust toolchain (`rustc`, `cargo`)
- Node.js (v20+) & npm
- `vfkit` (installed via `brew install vfkit`)
- `opencode` CLI

### Running the Desktop App

```bash
# 1. Install frontend dependencies
npm --prefix apps/desktop install

# 2. Run in desktop dev mode (Tauri 2 + Vite)
npm run dev

# 3. Or build production desktop bundle
npm run build
```

### Running Backend Tests

```bash
npm test
# Or directly with Cargo:
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
```
