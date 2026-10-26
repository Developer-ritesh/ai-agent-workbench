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
