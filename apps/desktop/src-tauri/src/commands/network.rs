use serde::{Deserialize, Serialize};
use std::net::{SocketAddr, TcpStream};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkStats {
    pub is_online: bool,
    pub latency_ms: u64,
    pub download_speed_bps: f64,
    pub upload_speed_bps: f64,
    pub download_speed_formatted: String,
    pub upload_speed_formatted: String,
    pub total_download_bytes: u64,
    pub total_upload_bytes: u64,
    pub active_interface: String,
    pub status: String,
    pub retry_count: u32,
    pub last_checked_iso: String,
}

pub struct TrackerInner {
    pub last_sample: Instant,
    pub last_ibytes: u64,
    pub last_obytes: u64,
    pub last_down_speed: f64,
    pub last_up_speed: f64,
    pub is_online: bool,
    pub latency_ms: u64,
    pub active_interface: String,
    pub status: String,
    pub retry_count: u32,
    pub last_ping_sample: Instant,
}

#[derive(Clone)]
pub struct NetworkTracker {
    inner: Arc<Mutex<TrackerInner>>,
}

impl Default for NetworkTracker {
    fn default() -> Self {
        Self::new()
    }
}

impl NetworkTracker {
    pub fn new() -> Self {
        let (ibytes, obytes, iface) = read_mac_interface_bytes();
        let (online, latency) = test_connectivity();
        let status = if online { "online".to_string() } else { "offline".to_string() };

        Self {
            inner: Arc::new(Mutex::new(TrackerInner {
                last_sample: Instant::now(),
                last_ibytes: ibytes,
                last_obytes: obytes,
                last_down_speed: 0.0,
                last_up_speed: 0.0,
                is_online: online,
                latency_ms: latency,
                active_interface: iface,
                status,
                retry_count: 0,
                last_ping_sample: Instant::now(),
            })),
        }
    }
}

fn format_speed(bytes_per_sec: f64) -> String {
    if bytes_per_sec < 1024.0 {
        format!("{:.0} B/s", bytes_per_sec.max(0.0))
    } else if bytes_per_sec < 1024.0 * 1024.0 {
        format!("{:.1} KB/s", bytes_per_sec / 1024.0)
    } else if bytes_per_sec < 1024.0 * 1024.0 * 1024.0 {
        format!("{:.2} MB/s", bytes_per_sec / (1024.0 * 1024.0))
    } else {
        format!("{:.2} GB/s", bytes_per_sec / (1024.0 * 1024.0 * 1024.0))
    }
}

fn read_mac_interface_bytes() -> (u64, u64, String) {
    let output = match std::process::Command::new("netstat")
        .args(["-ibn"])
        .output()
    {
        Ok(out) => String::from_utf8_lossy(&out.stdout).to_string(),
        Err(_) => return (0, 0, "en0".to_string()),
    };

    let mut total_ibytes: u64 = 0;
    let mut total_obytes: u64 = 0;
    let mut primary_iface = "en0".to_string();
    let mut max_traffic: u64 = 0;

    for line in output.lines().skip(1) {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 10 {
            let iface = parts[0];
            let network = parts[2];
            if !iface.starts_with("lo") && network.starts_with("<Link#") {
                let ibytes = parts[6].parse::<u64>().unwrap_or(0);
                let obytes = parts[9].parse::<u64>().unwrap_or(0);
                total_ibytes = total_ibytes.saturating_add(ibytes);
                total_obytes = total_obytes.saturating_add(obytes);

                let traffic = ibytes.saturating_add(obytes);
                if traffic > max_traffic {
                    max_traffic = traffic;
                    primary_iface = iface.trim_end_matches('*').to_string();
                }
            }
        }
    }

    (total_ibytes, total_obytes, primary_iface)
}

fn test_connectivity() -> (bool, u64) {
    let endpoints = [
        "1.1.1.1:443",     // Cloudflare DNS HTTPS
        "8.8.8.8:53",      // Google DNS
        "208.67.222.222:53", // OpenDNS
    ];

    for endpoint in &endpoints {
        if let Ok(addr) = endpoint.parse::<SocketAddr>() {
            let start = Instant::now();
            if TcpStream::connect_timeout(&addr, Duration::from_millis(1500)).is_ok() {
                let elapsed = start.elapsed().as_millis() as u64;
                return (true, elapsed.max(1));
            }
        }
    }

    (false, 0)
}

#[tauri::command]
pub fn network_get_stats(state: State<'_, NetworkTracker>) -> Result<NetworkStats, String> {
    let mut tracker = state.inner.lock().map_err(|e| e.to_string())?;
    let (curr_ibytes, curr_obytes, iface) = read_mac_interface_bytes();
    tracker.active_interface = iface;

    let now = Instant::now();
    let elapsed = tracker.last_sample.elapsed().as_secs_f64();

    if elapsed >= 0.6 {
        let delta_i = curr_ibytes.saturating_sub(tracker.last_ibytes);
        let delta_o = curr_obytes.saturating_sub(tracker.last_obytes);

        let down_bps = (delta_i as f64) / elapsed;
        let up_bps = (delta_o as f64) / elapsed;

        // Smooth with light exponential decay to avoid visual jumping
        tracker.last_down_speed = (tracker.last_down_speed * 0.2) + (down_bps * 0.8);
        tracker.last_up_speed = (tracker.last_up_speed * 0.2) + (up_bps * 0.8);

        tracker.last_ibytes = curr_ibytes;
        tracker.last_obytes = curr_obytes;
        tracker.last_sample = now;
    }

    // Ping check every ~3 seconds
    if tracker.last_ping_sample.elapsed() >= Duration::from_secs(3) {
        let (online, latency) = test_connectivity();
        tracker.is_online = online;
        tracker.latency_ms = latency;
        tracker.status = if online {
            tracker.retry_count = 0;
            "online".to_string()
        } else {
            "offline".to_string()
        };
        tracker.last_ping_sample = now;
    }

    let iso_now = chrono::Utc::now().to_rfc3339();

    Ok(NetworkStats {
        is_online: tracker.is_online,
        latency_ms: tracker.latency_ms,
        download_speed_bps: tracker.last_down_speed,
        upload_speed_bps: tracker.last_up_speed,
        download_speed_formatted: format_speed(tracker.last_down_speed),
        upload_speed_formatted: format_speed(tracker.last_up_speed),
        total_download_bytes: curr_ibytes,
        total_upload_bytes: curr_obytes,
        active_interface: tracker.active_interface.clone(),
        status: tracker.status.clone(),
        retry_count: tracker.retry_count,
        last_checked_iso: iso_now,
    })
}

#[tauri::command]
pub fn network_retry_connection(state: State<'_, NetworkTracker>) -> Result<NetworkStats, String> {
    let mut tracker = state.inner.lock().map_err(|e| e.to_string())?;
    tracker.status = "reconnecting".to_string();

    let (online, latency) = test_connectivity();
    tracker.is_online = online;
    tracker.latency_ms = latency;
    tracker.last_ping_sample = Instant::now();

    if online {
        tracker.status = "online".to_string();
        tracker.retry_count = 0;
    } else {
        tracker.retry_count = tracker.retry_count.saturating_add(1);
        tracker.status = "offline".to_string();
    }

    let (curr_ibytes, curr_obytes, iface) = read_mac_interface_bytes();
    tracker.active_interface = iface;
    let iso_now = chrono::Utc::now().to_rfc3339();

    Ok(NetworkStats {
        is_online: tracker.is_online,
        latency_ms: tracker.latency_ms,
        download_speed_bps: tracker.last_down_speed,
        upload_speed_bps: tracker.last_up_speed,
        download_speed_formatted: format_speed(tracker.last_down_speed),
        upload_speed_formatted: format_speed(tracker.last_up_speed),
        total_download_bytes: curr_ibytes,
        total_upload_bytes: curr_obytes,
        active_interface: tracker.active_interface.clone(),
        status: tracker.status.clone(),
        retry_count: tracker.retry_count,
        last_checked_iso: iso_now,
    })
}

#[tauri::command]
pub fn network_run_speed_test(state: State<'_, NetworkTracker>) -> Result<NetworkStats, String> {
    let mut tracker = state.inner.lock().map_err(|e| e.to_string())?;
    tracker.status = "testing".to_string();

    // 1. Benchmark download
    let down_out = std::process::Command::new("curl")
        .args([
            "-s",
            "-w",
            "%{speed_download} %{time_total}",
            "-o",
            "/dev/null",
            "--connect-timeout",
            "3",
            "--max-time",
            "5",
            "https://speed.cloudflare.com/__down?bytes=300000",
        ])
        .output();

    if let Ok(out) = down_out {
        let text = String::from_utf8_lossy(&out.stdout);
        let parts: Vec<&str> = text.split_whitespace().collect();
        if let Some(spd_str) = parts.first() {
            if let Ok(spd) = spd_str.parse::<f64>() {
                if spd > 0.0 {
                    tracker.last_down_speed = spd;
                }
            }
        }
    }

    // 2. Benchmark upload
    let up_out = std::process::Command::new("curl")
        .args([
            "-s",
            "-w",
            "%{speed_upload} %{time_total}",
            "-o",
            "/dev/null",
            "--connect-timeout",
            "3",
            "--max-time",
            "5",
            "--data",
            "workbench_network_speed_probe_data_packet_test_run",
            "https://speed.cloudflare.com/__up",
        ])
        .output();

    if let Ok(out) = up_out {
        let text = String::from_utf8_lossy(&out.stdout);
        let parts: Vec<&str> = text.split_whitespace().collect();
        if let Some(spd_str) = parts.first() {
            if let Ok(spd) = spd_str.parse::<f64>() {
                if spd > 0.0 {
                    tracker.last_up_speed = spd;
                }
            }
        }
    }

    let (online, latency) = test_connectivity();
    tracker.is_online = online;
    tracker.latency_ms = latency;
    tracker.status = if online { "online".to_string() } else { "offline".to_string() };
    tracker.last_ping_sample = Instant::now();

    let (curr_ibytes, curr_obytes, iface) = read_mac_interface_bytes();
    tracker.active_interface = iface;
    let iso_now = chrono::Utc::now().to_rfc3339();

    Ok(NetworkStats {
        is_online: tracker.is_online,
        latency_ms: tracker.latency_ms,
        download_speed_bps: tracker.last_down_speed,
        upload_speed_bps: tracker.last_up_speed,
        download_speed_formatted: format_speed(tracker.last_down_speed),
        upload_speed_formatted: format_speed(tracker.last_up_speed),
        total_download_bytes: curr_ibytes,
        total_upload_bytes: curr_obytes,
        active_interface: tracker.active_interface.clone(),
        status: tracker.status.clone(),
        retry_count: tracker.retry_count,
        last_checked_iso: iso_now,
    })
}
