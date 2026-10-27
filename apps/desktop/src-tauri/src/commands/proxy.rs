use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::Instant;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyConfig {
    pub enabled: bool,
    pub proxy_type: String, // "http", "socks5", "pool"
    pub proxy_url: String,  // e.g. "http://127.0.0.1:7890" or "socks5://127.0.0.1:1080"
    pub auto_rotate: bool,
}

impl Default for ProxyConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            proxy_type: "http".to_string(),
            proxy_url: "".to_string(),
            auto_rotate: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyStatus {
    pub enabled: bool,
    pub proxy_url: Option<String>,
    pub public_ip: String,
    pub country: Option<String>,
    pub is_masked: bool,
    pub latency_ms: Option<u64>,
    pub last_checked_iso: String,
}

fn get_config_path() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    let dir = home.join(".ai-agent-workbench");
    let _ = fs::create_dir_all(&dir);
    dir.join("proxy_config.json")
}

pub fn load_proxy_config() -> ProxyConfig {
    let path = get_config_path();
    if let Ok(content) = fs::read_to_string(&path) {
        if let Ok(cfg) = serde_json::from_str::<ProxyConfig>(&content) {
            return cfg;
        }
    }
    ProxyConfig::default()
}

pub fn save_proxy_config_to_file(cfg: &ProxyConfig) -> Result<(), String> {
    let path = get_config_path();
    let json = serde_json::to_string_pretty(cfg).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())
}

/// Transform localhost / 127.0.0.1 to 192.168.64.1 for VM guest access
pub fn format_proxy_for_guest(url: &str) -> String {
    url.replace("localhost", "192.168.64.1")
       .replace("127.0.0.1", "192.168.64.1")
}

pub fn write_workspace_proxy_files(project_path: &str, cfg: &ProxyConfig) {
    let p = PathBuf::from(project_path);
    if !p.exists() {
        return;
    }

    let proxy_file = p.join(".proxy");
    if !cfg.enabled || cfg.proxy_url.trim().is_empty() {
        let _ = fs::remove_file(&proxy_file);
        return;
    }

    let guest_url = format_proxy_for_guest(cfg.proxy_url.trim());
    let content = format!(
        "HTTP_PROXY={}\nHTTPS_PROXY={}\nALL_PROXY={}\nhttp_proxy={}\nhttps_proxy={}\nall_proxy={}\nNO_PROXY=localhost,127.0.0.1,192.168.64.1\nno_proxy=localhost,127.0.0.1,192.168.64.1\n",
        guest_url, guest_url, guest_url, guest_url, guest_url, guest_url
    );
    let _ = fs::write(&proxy_file, content);
}

fn query_public_ip(proxy: Option<&str>) -> (String, Option<String>, Option<u64>) {
    let start = Instant::now();
    let mut cmd = std::process::Command::new("curl");
    cmd.arg("-s").arg("-m").arg("5");

    if let Some(p) = proxy {
        if !p.is_empty() {
            cmd.arg("-x").arg(p);
        }
    }

    cmd.arg("https://api.ipify.org");

    match cmd.output() {
        Ok(out) if out.status.success() => {
            let latency = start.elapsed().as_millis() as u64;
            let ip = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if !ip.is_empty() && (ip.contains('.') || ip.contains(':')) {
                // Fetch country code from quick lookup
                let mut geo_cmd = std::process::Command::new("curl");
                geo_cmd.arg("-s").arg("-m").arg("3");
                if let Some(p) = proxy {
                    if !p.is_empty() {
                        geo_cmd.arg("-x").arg(p);
                    }
                }
                geo_cmd.arg(format!("https://ipapi.co/{}/country_name/", ip));
                let country = match geo_cmd.output() {
                    Ok(geo_out) if geo_out.status.success() => {
                        let c = String::from_utf8_lossy(&geo_out.stdout).trim().to_string();
                        if !c.is_empty() && !c.contains('<') && !c.contains('{') {
                            Some(c)
                        } else {
                            None
                        }
                    }
                    _ => None,
                };
                (ip, country, Some(latency))
            } else {
                ("Unavailable".to_string(), None, None)
            }
        }
        _ => ("Connection Failed".to_string(), None, None),
    }
}

#[tauri::command]
pub fn proxy_get_config() -> Result<ProxyConfig, String> {
    Ok(load_proxy_config())
}

#[tauri::command]
pub fn proxy_set_config(
    config: ProxyConfig,
    workspace_path: Option<String>,
) -> Result<ProxyStatus, String> {
    save_proxy_config_to_file(&config)?;

    if let Some(ref path) = workspace_path {
        write_workspace_proxy_files(path, &config);
    }

    // Determine current public IP
    let (direct_ip, _, _) = query_public_ip(None);
    let proxy_target = if config.enabled && !config.proxy_url.trim().is_empty() {
        Some(config.proxy_url.trim())
    } else {
        None
    };

    let (active_ip, country, latency) = query_public_ip(proxy_target);
    let is_masked = config.enabled && active_ip != "Connection Failed" && active_ip != direct_ip;

    Ok(ProxyStatus {
        enabled: config.enabled,
        proxy_url: if config.enabled { Some(config.proxy_url) } else { None },
        public_ip: active_ip,
        country,
        is_masked,
        latency_ms: latency,
        last_checked_iso: chrono::Utc::now().to_rfc3339(),
    })
}

#[tauri::command]
pub fn proxy_test(proxy_url: Option<String>) -> Result<ProxyStatus, String> {
    let (direct_ip, _, _) = query_public_ip(None);

    let target = proxy_url.as_deref().filter(|s| !s.trim().is_empty());
    let (active_ip, country, latency) = query_public_ip(target);
    let is_masked = target.is_some() && active_ip != "Connection Failed" && active_ip != direct_ip;

    Ok(ProxyStatus {
        enabled: target.is_some(),
        proxy_url: target.map(|s| s.to_string()),
        public_ip: active_ip,
        country,
        is_masked,
        latency_ms: latency,
        last_checked_iso: chrono::Utc::now().to_rfc3339(),
    })
}

#[tauri::command]
pub fn proxy_rotate_ip(workspace_path: Option<String>) -> Result<ProxyStatus, String> {
    let mut cfg = load_proxy_config();
    if !cfg.enabled || cfg.proxy_url.trim().is_empty() {
        return Err("Proxy is not enabled. Please enable a proxy in Settings first.".to_string());
    }

    // If proxy URL has a session ID parameter (standard for rotating proxies), increment it
    let mut updated_url = cfg.proxy_url.clone();
    if let Some(idx) = updated_url.find("session-") {
        let end_idx = updated_url[idx..]
            .find(|c: char| !c.is_alphanumeric() && c != '_' && c != '-')
            .map(|i| idx + i)
            .unwrap_or(updated_url.len());
        let rand_session = format!("session-{}", &uuid::Uuid::new_v4().to_string()[..6]);
        updated_url.replace_range(idx..end_idx, &rand_session);
        cfg.proxy_url = updated_url;
        let _ = save_proxy_config_to_file(&cfg);
    }

    if let Some(ref path) = workspace_path {
        write_workspace_proxy_files(path, &cfg);
    }

    proxy_test(Some(cfg.proxy_url))
}
