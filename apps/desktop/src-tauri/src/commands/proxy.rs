use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{Read, Write};
use std::net::TcpStream;
use std::path::PathBuf;
use std::time::{Duration, Instant};

fn default_mode() -> String {
    "auto".to_string()
}

fn default_enabled() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyConfig {
    #[serde(default = "default_enabled")]
    pub enabled: bool,
    #[serde(default = "default_mode")]
    pub mode: String, // "auto" (Internal Tor / Zero-config) or "custom"
    pub proxy_type: String, // "socks5", "http", "pool"
    pub proxy_url: String,  // e.g. "socks5://127.0.0.1:9050" or custom
    pub auto_rotate: bool,
}

impl Default for ProxyConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            mode: "auto".to_string(),
            proxy_type: "socks5".to_string(),
            proxy_url: "socks5://127.0.0.1:9050".to_string(),
            auto_rotate: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyStatus {
    pub enabled: bool,
    pub mode: String,
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
        if let Ok(mut cfg) = serde_json::from_str::<ProxyConfig>(&content) {
            if cfg.mode == "auto" && (cfg.proxy_url.trim().is_empty() || cfg.proxy_url.contains(":7890") || cfg.proxy_url.contains(":1080")) {
                cfg.proxy_url = "socks5://127.0.0.1:9050".to_string();
            }
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

/// Ensure Tor daemon is configured to listen on 0.0.0.0:9050 (SOCKS) & 0.0.0.0:9080 (HTTP CONNECT) and running
pub fn ensure_tor_service_running() {
    let torrc_path = PathBuf::from("/opt/homebrew/etc/tor/torrc");
    let desired_config = "SocksPort 0.0.0.0:9050\nHTTPTunnelPort 0.0.0.0:9080\nControlPort 127.0.0.1:9051\nCookieAuthentication 0\n";
    
    let needs_write = match fs::read_to_string(&torrc_path) {
        Ok(c) => !c.contains("HTTPTunnelPort 0.0.0.0:9080"),
        Err(_) => true,
    };

    if needs_write {
        if let Some(parent) = torrc_path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        let _ = fs::write(&torrc_path, desired_config);
        let _ = std::process::Command::new("brew")
            .args(["services", "restart", "tor"])
            .output();
    } else {
        // Quick check if HTTP tunnel port 9080 is responsive
        if TcpStream::connect_timeout(&"127.0.0.1:9080".parse().unwrap(), Duration::from_millis(150)).is_err() {
            let _ = std::process::Command::new("brew")
                .args(["services", "restart", "tor"])
                .output();
        }
    }
}

/// Rotate Tor IP using ControlPort 9051 (SIGNAL NEWNYM)
pub fn rotate_tor_ip() -> Result<(), String> {
    ensure_tor_service_running();
    let addr = "127.0.0.1:9051".parse().map_err(|e| format!("Invalid Tor control address: {}", e))?;
    let mut stream = TcpStream::connect_timeout(&addr, Duration::from_secs(3))
        .map_err(|e| format!("Could not connect to Tor control port 9051: {}", e))?;

    stream.set_read_timeout(Some(Duration::from_secs(3))).ok();
    stream.set_write_timeout(Some(Duration::from_secs(3))).ok();

    // Authenticate (CookieAuthentication 0)
    stream.write_all(b"AUTHENTICATE \"\"\r\n").map_err(|e| e.to_string())?;
    let mut buf = [0u8; 128];
    let n = stream.read(&mut buf).map_err(|e| e.to_string())?;
    let resp = String::from_utf8_lossy(&buf[..n]);
    if !resp.starts_with("250") {
        return Err(format!("Tor auth failed: {}", resp.trim()));
    }

    // Signal new circuit
    stream.write_all(b"SIGNAL NEWNYM\r\n").map_err(|e| e.to_string())?;
    let n = stream.read(&mut buf).map_err(|e| e.to_string())?;
    let resp = String::from_utf8_lossy(&buf[..n]);
    if !resp.starts_with("250") {
        return Err(format!("Tor NEWNYM signal failed: {}", resp.trim()));
    }

    // Brief pause to allow circuit switch
    std::thread::sleep(Duration::from_millis(1500));
    Ok(())
}

/// Transform localhost / 127.0.0.1 to 192.168.64.1 for VM guest access
pub fn format_proxy_for_guest(url: &str) -> String {
    let clean = url.trim();
    if clean.is_empty() || clean.contains(":9050") || clean.contains(":9080") {
        return "http://192.168.64.1:9080".to_string();
    }
    clean
        .replace("localhost", "192.168.64.1")
        .replace("127.0.0.1", "192.168.64.1")
}

pub fn write_workspace_proxy_files(project_path: &str, cfg: &ProxyConfig) {
    let p = PathBuf::from(project_path);
    if !p.exists() {
        return;
    }

    let proxy_file = p.join(".proxy");
    if !cfg.enabled {
        let _ = fs::remove_file(&proxy_file);
        return;
    }

    // Use Tor's native HTTP tunnel (port 9080) for HTTP/HTTPS_PROXY so Bun/Node fetch works seamlessly without UnsupportedProxyProtocol
    let (http_target, all_target) = if cfg.mode == "auto" || cfg.proxy_url.trim().is_empty() || cfg.proxy_url.contains(":9050") || cfg.proxy_url.contains(":9080") {
        ("http://192.168.64.1:9080".to_string(), "http://192.168.64.1:9080".to_string())
    } else {
        let guest_url = format_proxy_for_guest(&cfg.proxy_url);
        (guest_url.clone(), guest_url)
    };

    let content = format!(
        "HTTP_PROXY={}\nHTTPS_PROXY={}\nhttp_proxy={}\nhttps_proxy={}\nALL_PROXY={}\nall_proxy={}\nNO_PROXY=localhost,127.0.0.1,192.168.64.1,192.168.64.*\nno_proxy=localhost,127.0.0.1,192.168.64.1,192.168.64.*\n",
        http_target, http_target, http_target, http_target, all_target, all_target
    );
    let _ = fs::write(&proxy_file, content);
}

fn query_public_ip(proxy: Option<&str>) -> (String, Option<String>, Option<u64>) {
    let start = Instant::now();
    let mut cmd = std::process::Command::new("curl");
    cmd.arg("-s").arg("-m").arg("7");

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
                // Fetch country code from lookup
                let mut geo_cmd = std::process::Command::new("curl");
                geo_cmd.arg("-s").arg("-m").arg("4");
                geo_cmd.arg(format!("http://ip-api.com/line/{}?fields=country", ip));
                let country = match geo_cmd.output() {
                    Ok(geo_out) if geo_out.status.success() => {
                        let c = String::from_utf8_lossy(&geo_out.stdout).trim().to_string();
                        if !c.is_empty() && !c.contains('<') && !c.contains('{') && !c.contains("fail") {
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
    ensure_tor_service_running();
    Ok(load_proxy_config())
}

#[tauri::command]
pub fn proxy_set_config(
    mut config: ProxyConfig,
    workspace_path: Option<String>,
) -> Result<ProxyStatus, String> {
    if config.mode == "auto" {
        ensure_tor_service_running();
        config.proxy_url = "socks5://127.0.0.1:9050".to_string();
        config.proxy_type = "socks5".to_string();
    }

    save_proxy_config_to_file(&config)?;

    if let Some(ref path) = workspace_path {
        write_workspace_proxy_files(path, &config);
    }

    // Determine current public IP
    let (direct_ip, _, _) = query_public_ip(None);
    let proxy_target = if config.enabled {
        if config.mode == "auto" || config.proxy_url.trim().is_empty() {
            Some("http://127.0.0.1:9080")
        } else {
            Some(config.proxy_url.trim())
        }
    } else {
        None
    };

    let (active_ip, country, latency) = query_public_ip(proxy_target);
    let is_masked = config.enabled && active_ip != "Connection Failed" && active_ip != direct_ip;

    Ok(ProxyStatus {
        enabled: config.enabled,
        mode: config.mode,
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
    ensure_tor_service_running();
    let (direct_ip, _, _) = query_public_ip(None);

    let cfg = load_proxy_config();
    let target_str: Option<String> = if let Some(u) = proxy_url.filter(|s| !s.trim().is_empty()) {
        Some(u)
    } else if cfg.enabled {
        if cfg.mode == "auto" || cfg.proxy_url.trim().is_empty() {
            Some("http://127.0.0.1:9080".to_string())
        } else {
            Some(cfg.proxy_url.clone())
        }
    } else {
        None
    };

    let target_ref = target_str.as_deref();
    let (active_ip, country, latency) = query_public_ip(target_ref);
    let is_masked = target_ref.is_some() && active_ip != "Connection Failed" && active_ip != direct_ip;

    Ok(ProxyStatus {
        enabled: target_ref.is_some(),
        mode: if target_ref == Some("http://127.0.0.1:9080") || target_ref.unwrap_or("").contains(":9080") || target_ref.unwrap_or("").contains(":9050") {
            "auto".to_string()
        } else {
            "custom".to_string()
        },
        proxy_url: target_str,
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
    if !cfg.enabled {
        cfg.enabled = true;
    }

    if cfg.mode == "auto" || cfg.proxy_url.contains(":9050") || cfg.proxy_url.trim().is_empty() {
        let _ = rotate_tor_ip();
        cfg.proxy_url = "socks5://127.0.0.1:9050".to_string();
        let _ = save_proxy_config_to_file(&cfg);
    } else {
        // If custom proxy URL has session ID parameter, rotate it
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
    }

    if let Some(ref path) = workspace_path {
        write_workspace_proxy_files(path, &cfg);
    }

    let target = if cfg.mode == "auto" || cfg.proxy_url.contains(":9050") || cfg.proxy_url.contains(":9080") {
        Some("http://127.0.0.1:9080".to_string())
    } else {
        Some(cfg.proxy_url)
    };

    proxy_test(target)
}
