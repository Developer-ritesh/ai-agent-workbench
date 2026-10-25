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
    ├── ARCHITECTURE.md               # Architectural details & security model
    ├── UI_UX_IMPLEMENTATION.md       # Multi-panel IDE design & shortcuts
    └── UI_BUG_FIX_REPORT.md          # Diagnostic report & CSS loading fix
```

---

## Quickstart

### Prerequisites
- macOS on Apple Silicon (M1/M2/M3/M4)
- Rust toolchain (`rustc`, `cargo`)
- Node.js (v20+) & npm
- `vfkit` (installed via `brew install vfkit`)
- `opencode` CLI

---

## Commands: Build, Run, Install & Launch

### 1. Build Commands

#### A. Build Frontend Only (Vite + TypeScript)
```bash
npm --prefix apps/desktop run build
```

#### B. Build Desktop App Bundle (Fast / Debug)
```bash
npm --prefix apps/desktop run tauri build -- -d --bundles app --no-sign
```
*Output artifact:* `apps/desktop/src-tauri/target/debug/bundle/macos/AI Agent Workbench.app`

#### C. Build Desktop App Bundle (Optimized Production Release)
```bash
npm --prefix apps/desktop run tauri build -- --bundles app --no-sign
```
*Output artifact:* `apps/desktop/src-tauri/target/release/bundle/macos/AI Agent Workbench.app`

---

### 2. Run Commands

#### A. Run in Desktop Dev Mode (Tauri 2 + Vite HMR)
```bash
npm run dev
```

#### B. Run Web Preview Server
```bash
npm --prefix apps/desktop run preview -- --port 4173
```

#### C. Run Rust Unit & Integration Tests
```bash
npm test
# Or directly with Cargo:
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
```

---

### 3. Install in System

To install the application into macOS `/Applications` and link the CLI executable into your `$PATH`:

```bash
# 1. Remove any previous bundle and install the fresh application
rm -rf "/Applications/AI Agent Workbench.app"
cp -R "apps/desktop/src-tauri/target/debug/bundle/macos/AI Agent Workbench.app" /Applications/

# 2. Register with macOS LaunchServices (Spotlight & Launchpad indexing)
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "/Applications/AI Agent Workbench.app"

# 3. Create global CLI symlink in $PATH
ln -sf "/Applications/AI Agent Workbench.app/Contents/MacOS/ai-agent-workbench" /opt/homebrew/bin/ai-agent-workbench
```

---

### 4. Launch Commands

You can launch the installed workbench using any of the following methods:

#### A. Launch from Terminal (CLI)
```bash
ai-agent-workbench
```

#### B. Launch via macOS `open`
```bash
open -a "AI Agent Workbench"
```

#### C. Launch via Spotlight
Press <kbd>Cmd</kbd> + <kbd>Space</kbd>, type `AI Agent Workbench`, and press <kbd>Enter</kbd>.

#### D. Launch via Finder
Open [`/Applications`](file:///Applications) in Finder and double-click **AI Agent Workbench**.

