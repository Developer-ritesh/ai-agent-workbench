use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::{TcpListener, SocketAddr};
use std::sync::{Arc, Mutex};
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortInfo {
    pub id: String,
    pub guest_port: u16,
    pub local_port: u16,
    pub protocol: String,
    pub status: String, // "active", "stopped", "conflict"
    pub process_name: String,
    pub target_url: String,
    pub is_listening: bool,
}

#[derive(Clone, Default)]
pub struct PortManager {
    custom_mappings: Arc<Mutex<HashMap<String, PortInfo>>>,
}

impl PortManager {
    pub fn new() -> Self {
        Self {
            custom_mappings: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

fn is_port_available(port: u16) -> bool {
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    TcpListener::bind(addr).is_ok()
}

fn scan_listening_ports() -> Vec<(u16, String)> {
    let mut results = Vec::new();

    let output = match std::process::Command::new("lsof")
        .args(["-iTCP", "-sTCP:LISTEN", "-n", "-P"])
        .output()
    {
        Ok(out) => String::from_utf8_lossy(&out.stdout).to_string(),
        Err(_) => return results,
    };

    let mut seen_ports = std::collections::HashSet::new();

    for line in output.lines().skip(1) {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 9 {
            let command = parts[0];
            let name_field = parts[8]; // e.g. "127.0.0.1:3000" or "*:8080"
            if let Some(pos) = name_field.rfind(':') {
                if let Ok(port) = name_field[pos + 1..].parse::<u16>() {
                    if !seen_ports.contains(&port) {
                        seen_ports.insert(port);
                        results.push((port, command.to_string()));
                    }
                }
            }
        }
    }

    results
}

#[tauri::command]
pub fn ports_list(state: State<'_, PortManager>) -> Result<Vec<PortInfo>, String> {
    let listening = scan_listening_ports();
    let custom = state.custom_mappings.lock().map_err(|e| e.to_string())?;

    let mut list = Vec::new();

    // Add scanned listening ports
    for (port, process) in listening {
        let id = format!("port-{}", port);
        let process_name = if process.to_lowercase().contains("opencode") || process.to_lowercase().contains("devai") {
            "Dev AI (opencode)".to_string()
        } else {
            process
        };
        let is_http = port == 80 || port == 443 || port == 3000 || port == 5173 || port == 8080 || port == 8000 || port == 4096 || process_name.contains("Dev AI");
        let protocol = if is_http {
            "http".to_string()
        } else {
            "tcp".to_string()
        };

        list.push(PortInfo {
            id,
            guest_port: port,
            local_port: port,
            protocol,
            status: "active".to_string(),
            process_name,
            target_url: format!("http://127.0.0.1:{}", port),
            is_listening: true,
        });
    }

    // Add any custom defined forward mappings
    for (_id, mapping) in custom.iter() {
        if !list.iter().any(|p| p.local_port == mapping.local_port) {
            let mut m = mapping.clone();
            m.is_listening = !is_port_available(m.local_port);
            list.push(m);
        }
    }

    list.sort_by_key(|p| p.local_port);
    Ok(list)
}

#[tauri::command]
pub fn ports_forward_create(
    state: State<'_, PortManager>,
    guest_port: u16,
    local_port: u16,
    protocol: Option<String>,
) -> Result<PortInfo, String> {
    let mut custom = state.custom_mappings.lock().map_err(|e| e.to_string())?;
    let id = format!("fwd-{}-{}", guest_port, local_port);
    let proto = protocol.unwrap_or_else(|| "http".to_string());

    let status = if is_port_available(local_port) {
        "active".to_string()
    } else {
        "conflict".to_string()
    };

    let info = PortInfo {
        id: id.clone(),
        guest_port,
        local_port,
        protocol: proto,
        status,
        process_name: "Workbench Forwarder".to_string(),
        target_url: format!("http://127.0.0.1:{}", local_port),
        is_listening: true,
    };

    custom.insert(id, info.clone());
    Ok(info)
}

#[tauri::command]
pub fn ports_forward_remove(state: State<'_, PortManager>, id: String) -> Result<(), String> {
    let mut custom = state.custom_mappings.lock().map_err(|e| e.to_string())?;
    custom.remove(&id);
    Ok(())
}

#[tauri::command]
pub fn ports_check_availability(port: u16) -> Result<bool, String> {
    Ok(is_port_available(port))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_port_manager_new() {
        let pm = PortManager::new();
        let map = pm.custom_mappings.lock().unwrap();
        assert!(map.is_empty());
    }

    #[test]
    fn test_is_port_available_on_high_ephemeral_port() {
        // High ports in the 59000-60000 range are typically unallocated
        let available = is_port_available(59998);
        assert!(available);
    }
}
