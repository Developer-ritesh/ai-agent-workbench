# macOS AI Agent Workbench - Known Issues & Operational Considerations

## 1. Browser Workspace & External Sites
- **`X-Frame-Options: SAMEORIGIN` / `DENY` on Commercial Domains**:
  - Web applications hosted locally or on development servers (Vite, Next.js, Webpack, Actix, Flask) render seamlessly inside the Integrated Browser.
  - However, certain external commercial websites (e.g. `google.com`, `github.com`) set HTTP response headers `X-Frame-Options: DENY` or `Content-Security-Policy: frame-ancestors 'none'`.
  - **Mitigation / Recommendation**: Use the built-in "Open in External System Browser" button for external third-party sites while using the Integrated Browser for all development, preview, and API testing workflows.

## 2. Port Forwarding on Privileged Ports (< 1024)
- Binding to privileged host ports (such as port 80 or 443) on macOS requires elevated system privileges (`sudo`).
- **Recommendation**: Standard developer ports (`3000`, `5173`, `8000`, `8080`, `9000`) should be used for forwarding, which operate with standard non-root user permissions.

## 3. Playwright Headless Browser Dependencies
- Playwright end-to-end browser tests running inside the isolated Linux microVM require Chromium browser binaries (`npx playwright install chromium`).
- If headless browser binaries are missing inside a newly spawned microVM, the test runner prompts the user or executes `npx playwright install --with-deps chromium`.

## 4. Hardware Virtualization (`vfkit`) Availability
- The microVM isolation subsystem relies on Apple's Virtualization Framework (`Virtualization.framework`), available on macOS 13+ (Ventura, Sonoma, Sequoia) on Apple Silicon (M1/M2/M3/M4) and Intel Macs with VT-x.
- On virtualized macOS guests (nested virtualization), hardware acceleration availability depends on the host hypervisor settings.

## 5. Managed Chromium Process Lifecycle & CDP Endpoints
- **Dedicated User Profile**: The Chromium engine runs with a dedicated profile in `~/.ai-agent-workbench/browser-profile` to isolate session data and credentials from personal browser profiles.
- **Port 9222 Exclusivity**: If a third-party developer tool is already bound to `127.0.0.1:9222`, the Chromium manager reuses the active CDP endpoint or requests an ephemeral port.
- **Headless vs. Headed Execution**: By default, the Chromium engine starts headless for automated testing, API interception, and script evaluation. Interactive browsing utilizes the sandboxed integrated workbench viewport.

## 6. API Testing Studio Operational Considerations
- **Self-Signed Certificates in Local Development**: By default, strict TLS validation is enforced. When testing local HTTPS endpoints with self-signed certificates, toggle "SSL Verification" off under the **Settings** tab for that request.
- **Streaming & Server-Sent Events (SSE)**: Long-lived SSE or chunked streaming responses accumulate until the connection closes or the request timeout is reached. For indefinite streaming logs, use dedicated websocket/SSE monitors or configure an explicit timeout.
- **Cloud Metadata SSRF Protection**: Requests directed to `169.254.169.254` or `metadata.google.internal` are intentionally blocked by security policy to prevent cloud credential exfiltration.

