use tauri::State;
use crate::commands::workspace::TerminalExecResult;
use crate::vm::backend::VmStatusResponse;
use crate::workspace::manager::WorkspaceManager;

#[tauri::command]
pub fn vm_start(
    manager: State<'_, WorkspaceManager>,
    workspace_id: String,
) -> Result<VmStatusResponse, String> {
    manager.start_vm(&workspace_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn vm_stop(
    manager: State<'_, WorkspaceManager>,
    workspace_id: String,
) -> Result<(), String> {
    manager.stop_vm(&workspace_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn vm_status(
    manager: State<'_, WorkspaceManager>,
    workspace_id: String,
) -> Result<VmStatusResponse, String> {
    manager.get_vm_status(&workspace_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn vm_rotate(
    manager: State<'_, WorkspaceManager>,
    workspace_id: String,
) -> Result<VmStatusResponse, String> {
    manager.rotate_vm(&workspace_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn drag_window(window: tauri::Window) -> Result<(), String> {
    window.start_dragging().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn toggle_maximize_window(window: tauri::Window) -> Result<(), String> {
    let is_maximized = window.is_maximized().map_err(|e| e.to_string())?;
    if is_maximized {
        window.unmaximize().map_err(|e| e.to_string())?;
    } else {
        window.maximize().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn terminal_execute(
    manager: State<'_, WorkspaceManager>,
    workspace_id: String,
    command: String,
) -> Result<TerminalExecResult, String> {
    let (code, stdout, stderr) = manager
        .execute_terminal_command(&workspace_id, &command)
        .map_err(|e| e.to_string())?;

    Ok(TerminalExecResult {
        exit_code: code,
        stdout,
        stderr,
    })
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HostSystemInfo {
    pub os_name: String,
    pub os_version: String,
    pub kernel_release: String,
    pub uname_full: String,
    pub device_model: String,
    pub cpu_brand: String,
    pub cpu_arch: String,
    pub cpu_cores: u32,
    pub total_memory_bytes: u64,
    pub host_ip: String,
    pub active_interface: String,
    pub disk_total_gb: f64,
    pub disk_free_gb: f64,
    pub virtualization_support: String,
}

#[tauri::command]
pub fn system_get_host_info() -> Result<HostSystemInfo, String> {
    let os_name = std::process::Command::new("sw_vers")
        .arg("-productName")
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_else(|_| "macOS".to_string());

    let os_version = std::process::Command::new("sw_vers")
        .arg("-productVersion")
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_else(|_| "26.6.2".to_string());

    let uname_full = std::process::Command::new("uname")
        .arg("-a")
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_else(|_| "Darwin arm64".to_string());

    let kernel_release = std::process::Command::new("uname")
        .arg("-r")
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_else(|_| "25.6.0".to_string());

    let device_model = std::process::Command::new("sysctl")
        .args(["-n", "hw.model"])
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_else(|_| "Mac14,15".to_string());

    let cpu_brand = std::process::Command::new("sysctl")
        .args(["-n", "machdep.cpu.brand_string"])
        .output()
        .map(|o| {
            let s = String::from_utf8_lossy(&o.stdout).trim().to_string();
            if s.is_empty() { "Apple Silicon".to_string() } else { s }
        })
        .unwrap_or_else(|_| "Apple M2".to_string());

    let cpu_arch = std::process::Command::new("uname")
        .arg("-m")
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_else(|_| "arm64".to_string());

    let cpu_cores = std::process::Command::new("sysctl")
        .args(["-n", "hw.ncpu"])
        .output()
        .ok()
        .and_then(|o| String::from_utf8_lossy(&o.stdout).trim().parse::<u32>().ok())
        .unwrap_or(8);

    let total_memory_bytes = std::process::Command::new("sysctl")
        .args(["-n", "hw.memsize"])
        .output()
        .ok()
        .and_then(|o| String::from_utf8_lossy(&o.stdout).trim().parse::<u64>().ok())
        .unwrap_or(8589934592);

    let active_interface = std::process::Command::new("sh")
        .arg("-c")
        .arg("route get default 2>/dev/null | grep interface | awk '{print $2}'")
        .output()
        .map(|o| {
            let s = String::from_utf8_lossy(&o.stdout).trim().to_string();
            if s.is_empty() { "en0".to_string() } else { s }
        })
        .unwrap_or_else(|_| "en0".to_string());

    let host_ip = std::process::Command::new("ipconfig")
        .args(["getifaddr", &active_interface])
        .output()
        .map(|o| {
            let s = String::from_utf8_lossy(&o.stdout).trim().to_string();
            if s.is_empty() { "192.168.1.2".to_string() } else { s }
        })
        .unwrap_or_else(|_| "192.168.1.2".to_string());

    let (disk_total_gb, disk_free_gb) = std::process::Command::new("df")
        .args(["-k", "/"])
        .output()
        .ok()
        .map(|o| {
            let out = String::from_utf8_lossy(&o.stdout);
            let lines: Vec<&str> = out.lines().collect();
            if lines.len() >= 2 {
                let parts: Vec<&str> = lines[1].split_whitespace().collect();
                if parts.len() >= 4 {
                    let total_kb = parts[1].parse::<f64>().unwrap_or(0.0);
                    let free_kb = parts[3].parse::<f64>().unwrap_or(0.0);
                    return (
                        (total_kb / 1024.0 / 1024.0 * 10.0).round() / 10.0,
                        (free_kb / 1024.0 / 1024.0 * 10.0).round() / 10.0,
                    );
                }
            }
            (228.0, 4.5)
        })
        .unwrap_or((228.0, 4.5));

    Ok(HostSystemInfo {
        os_name,
        os_version,
        kernel_release,
        uname_full,
        device_model,
        cpu_brand,
        cpu_arch,
        cpu_cores,
        total_memory_bytes,
        host_ip,
        active_interface,
        disk_total_gb,
        disk_free_gb,
        virtualization_support: "Apple Virtualization.framework (Hypervisor Entitled)".to_string(),
    })
}
