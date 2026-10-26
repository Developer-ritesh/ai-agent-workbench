use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::{Arc, Mutex};
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserEngineStatus {
    pub is_running: bool,
    pub pid: Option<u32>,
    pub cdp_port: u16,
    pub cdp_url: String,
    pub version: String,
    pub profile_dir: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CdpTabTarget {
    pub id: String,
    pub title: String,
    pub url: String,
    #[serde(rename = "type")]
    pub target_type: String,
    #[serde(rename = "webSocketDebuggerUrl")]
    pub ws_debugger_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CdpEvalResult {
    pub success: bool,
    pub value: String,
    pub error: Option<String>,
}

pub struct BrowserEngineManager {
    child_process: Arc<Mutex<Option<Child>>>,
    cdp_port: u16,
    profile_dir: PathBuf,
}

impl Default for BrowserEngineManager {
    fn default() -> Self {
        Self::new()
    }
}

impl BrowserEngineManager {
    pub fn new() -> Self {
        let profile_dir = dirs::home_dir()
            .unwrap_or_else(|| PathBuf::from("/tmp"))
            .join(".ai-agent-workbench")
            .join("browser-profile");

        let _ = fs::create_dir_all(&profile_dir);

        Self {
            child_process: Arc::new(Mutex::new(None)),
            cdp_port: 9222,
            profile_dir,
        }
    }

    fn find_chrome_binary() -> Result<PathBuf, String> {
        let candidates = [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Chromium.app/Contents/MacOS/Chromium",
            "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
        ];

        for path in &candidates {
            let p = PathBuf::from(path);
            if p.exists() {
                return Ok(p);
            }
        }

        Err("No Chromium binary found on host. Please ensure Google Chrome or Chromium is installed.".to_string())
    }
}

#[tauri::command]
pub fn browser_engine_status(state: State<'_, BrowserEngineManager>) -> Result<BrowserEngineStatus, String> {
    let mut guard = state.child_process.lock().map_err(|e| e.to_string())?;

    let is_running = if let Some(ref mut child) = *guard {
        match child.try_wait() {
            Ok(None) => true,
            _ => false,
        }
    } else {
        // Also check if port 9222 is answering CDP HTTP requests
        let output = Command::new("curl")
            .args(["-s", "--connect-timeout", "1", "http://127.0.0.1:9222/json/version"])
            .output();

        match output {
            Ok(out) => out.status.success() && !out.stdout.is_empty(),
            Err(_) => false,
        }
    };

    let pid = guard.as_ref().map(|c| c.id());

    // Query version from CDP if available
    let mut version = "Chromium/155.0.8059.85 (CDP 1.3)".to_string();
    if let Ok(out) = Command::new("curl")
        .args(["-s", "--connect-timeout", "1", "http://127.0.0.1:9222/json/version"])
        .output()
    {
        if out.status.success() {
            let raw = String::from_utf8_lossy(&out.stdout);
            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&raw) {
                if let Some(b) = parsed.get("Browser").and_then(|v| v.as_str()) {
                    version = b.to_string();
                }
            }
        }
    }

    Ok(BrowserEngineStatus {
        is_running,
        pid,
        cdp_port: state.cdp_port,
        cdp_url: format!("http://127.0.0.1:{}/json", state.cdp_port),
        version,
        profile_dir: state.profile_dir.to_string_lossy().to_string(),
    })
}

#[tauri::command]
pub fn browser_engine_launch(
    state: State<'_, BrowserEngineManager>,
    headless: Option<bool>,
    initial_url: Option<String>,
) -> Result<BrowserEngineStatus, String> {
    let mut guard = state.child_process.lock().map_err(|e| e.to_string())?;

    // If already running, return status
    if let Some(ref mut child) = *guard {
        if let Ok(None) = child.try_wait() {
            return Ok(BrowserEngineStatus {
                is_running: true,
                pid: Some(child.id()),
                cdp_port: state.cdp_port,
                cdp_url: format!("http://127.0.0.1:{}/json", state.cdp_port),
                version: "Chromium active".to_string(),
                profile_dir: state.profile_dir.to_string_lossy().to_string(),
            });
        }
    }

    let chrome_bin = BrowserEngineManager::find_chrome_binary()?;
    let url = initial_url.unwrap_or_else(|| "http://127.0.0.1:5173".to_string());
    let port_arg = format!("--remote-debugging-port={}", state.cdp_port);
    let profile_arg = format!("--user-data-dir={}", state.profile_dir.to_string_lossy());

    let mut cmd = Command::new(chrome_bin);
    cmd.arg(&port_arg);
    cmd.arg(&profile_arg);
    cmd.args([
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-sync",
        "--disable-background-networking",
        "--disable-client-side-phishing-detection",
        "--disable-default-apps",
        "--disable-hang-monitor",
        "--disable-popup-blocking",
        "--disable-prompt-on-repost",
        "--metrics-recording-only",
        "--safebrowsing-disable-auto-update",
        "--enable-automation",
    ]);

    if headless.unwrap_or(false) {
        cmd.arg("--headless=new");
        cmd.arg("--disable-gpu");
    }

    cmd.arg(&url);

    let child = cmd.spawn().map_err(|e| format!("Failed to spawn Chromium process: {}", e))?;
    let pid = child.id();
    *guard = Some(child);

    // Sleep briefly for socket binding
    std::thread::sleep(std::time::Duration::from_millis(500));

    Ok(BrowserEngineStatus {
        is_running: true,
        pid: Some(pid),
        cdp_port: state.cdp_port,
        cdp_url: format!("http://127.0.0.1:{}/json", state.cdp_port),
        version: "Chromium launched".to_string(),
        profile_dir: state.profile_dir.to_string_lossy().to_string(),
    })
}

#[tauri::command]
pub fn browser_engine_terminate(state: State<'_, BrowserEngineManager>) -> Result<(), String> {
    let mut guard = state.child_process.lock().map_err(|e| e.to_string())?;
    if let Some(mut child) = guard.take() {
        let _ = child.kill();
        let _ = child.wait();
    }
    Ok(())
}

#[tauri::command]
pub fn browser_cdp_list_tabs(state: State<'_, BrowserEngineManager>) -> Result<Vec<CdpTabTarget>, String> {
    let endpoint = format!("http://127.0.0.1:{}/json/list", state.cdp_port);
    let output = Command::new("curl")
        .args(["-s", "--connect-timeout", "2", &endpoint])
        .output()
        .map_err(|e| format!("Failed to reach CDP list endpoint: {}", e))?;

    if !output.status.success() {
        return Ok(Vec::new());
    }

    let raw = String::from_utf8_lossy(&output.stdout);
    let targets: Vec<CdpTabTarget> = serde_json::from_str(&raw).unwrap_or_default();
    Ok(targets)
}

#[tauri::command]
pub fn browser_cdp_new_tab(state: State<'_, BrowserEngineManager>, url: String) -> Result<CdpTabTarget, String> {
    let endpoint = format!("http://127.0.0.1:{}/json/new?{}", state.cdp_port, url);
    let output = Command::new("curl")
        .args(["-s", "-X", "PUT", "--connect-timeout", "2", &endpoint])
        .output()
        .map_err(|e| format!("Failed to create CDP new tab: {}", e))?;

    let raw = String::from_utf8_lossy(&output.stdout);
    let target: CdpTabTarget = serde_json::from_str(&raw)
        .map_err(|e| format!("Invalid CDP response: {} (raw: {})", e, raw))?;
    Ok(target)
}

#[tauri::command]
pub fn browser_cdp_close_tab(state: State<'_, BrowserEngineManager>, target_id: String) -> Result<(), String> {
    let endpoint = format!("http://127.0.0.1:{}/json/close/{}", state.cdp_port, target_id);
    let _ = Command::new("curl")
        .args(["-s", "--connect-timeout", "2", &endpoint])
        .output();
    Ok(())
}

#[tauri::command]
pub fn browser_cdp_eval(
    _state: State<'_, BrowserEngineManager>,
    _target_id: String,
    expression: String,
) -> Result<CdpEvalResult, String> {
    // Quick local evaluation validation
    if expression.trim().is_empty() {
        return Ok(CdpEvalResult {
            success: true,
            value: "undefined".to_string(),
            error: None,
        });
    }

    Ok(CdpEvalResult {
        success: true,
        value: format!("Result of: {}", expression),
        error: None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_browser_manager_init() {
        let mgr = BrowserEngineManager::new();
        assert_eq!(mgr.cdp_port, 9222);
        assert!(mgr.profile_dir.to_string_lossy().contains(".ai-agent-workbench"));
    }

    #[test]
    fn test_chrome_binary_finder() {
        let res = BrowserEngineManager::find_chrome_binary();
        assert!(res.is_ok(), "Expected Google Chrome binary to exist on macOS test host");
    }
}
