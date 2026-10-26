use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyValuePair {
    pub key: String,
    pub value: String,
    pub enabled: bool,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiAuthInput {
    #[serde(rename = "type")]
    pub auth_type: String,
    pub bearer_token: Option<String>,
    pub basic_user: Option<String>,
    pub basic_pass: Option<String>,
    pub api_key_name: Option<String>,
    pub api_key_value: Option<String>,
    pub api_key_location: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiExecutePayload {
    pub method: String,
    pub url: String,
    pub params: Vec<KeyValuePair>,
    pub headers: Vec<KeyValuePair>,
    pub auth: Option<ApiAuthInput>,
    pub body_type: String,
    pub body_content: Option<String>,
    pub timeout_seconds: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiResponseResult {
    pub status: u16,
    pub status_text: String,
    pub time_ms: u64,
    pub size_bytes: usize,
    pub headers: HashMap<String, String>,
    pub data: String,
    pub error: Option<String>,
}

fn validate_destination(url: &str) -> Result<(), String> {
    let lower = url.to_lowercase();
    if !lower.starts_with("http://") && !lower.starts_with("https://") {
        return Err("Only HTTP and HTTPS URLs are permitted".to_string());
    }

    // SSRF protection: block cloud metadata services
    if lower.contains("169.254.169.254") || lower.contains("metadata.google.internal") {
        return Err("Requests to cloud instance metadata services are prohibited for security".to_string());
    }

    Ok(())
}

fn percent_encode(input: &str) -> String {
    let mut encoded = String::new();
    for byte in input.bytes() {
        if byte.is_ascii_alphanumeric() || byte == b'-' || byte == b'_' || byte == b'.' || byte == b'~' {
            encoded.push(byte as char);
        } else {
            encoded.push_str(&format!("%{:02X}", byte));
        }
    }
    encoded
}

fn status_code_to_text(code: u16) -> &'static str {
    match code {
        200 => "OK",
        201 => "Created",
        202 => "Accepted",
        204 => "No Content",
        301 => "Moved Permanently",
        302 => "Found",
        304 => "Not Modified",
        400 => "Bad Request",
        401 => "Unauthorized",
        403 => "Forbidden",
        404 => "Not Found",
        405 => "Method Not Allowed",
        408 => "Request Timeout",
        422 => "Unprocessable Entity",
        429 => "Too Many Requests",
        500 => "Internal Server Error",
        502 => "Bad Gateway",
        503 => "Service Unavailable",
        504 => "Gateway Timeout",
        _ => "HTTP Response",
    }
}

#[tauri::command]
pub fn api_execute_request(payload: ApiExecutePayload) -> Result<ApiResponseResult, String> {
    validate_destination(&payload.url)?;

    let mut full_url = payload.url.clone();
    let mut query_params: Vec<String> = Vec::new();

    for p in &payload.params {
        if p.enabled && !p.key.trim().is_empty() {
            let encoded_k = percent_encode(&p.key);
            let encoded_v = percent_encode(&p.value);
            query_params.push(format!("{}={}", encoded_k, encoded_v));
        }
    }

    // Handle API Key query param
    if let Some(ref auth) = payload.auth {
        if auth.auth_type == "apikey" && auth.api_key_location.as_deref() == Some("query") {
            if let (Some(k), Some(v)) = (&auth.api_key_name, &auth.api_key_value) {
                query_params.push(format!("{}={}", percent_encode(k), percent_encode(v)));
            }
        }
    }

    if !query_params.is_empty() {
        let separator = if full_url.contains('?') { "&" } else { "?" };
        full_url.push_str(separator);
        full_url.push_str(&query_params.join("&"));
    }

    let header_temp = std::env::temp_dir().join(format!("wb-api-hdr-{}.tmp", uuid::Uuid::new_v4().simple()));
    let timeout = payload.timeout_seconds.unwrap_or(20).to_string();

    let mut cmd = Command::new("curl");
    cmd.args(["-s", "-S", "-i"]); // Include response headers and body
    cmd.args(["-X", &payload.method.to_uppercase()]);
    cmd.args(["--connect-timeout", "5", "--max-time", &timeout]);
    cmd.args(["-D", &header_temp.to_string_lossy()]);
    cmd.args(["-w", "\n__WB_DELIM__\n%{http_code}\n%{time_total}"]);

    // Custom Headers
    for h in &payload.headers {
        if h.enabled && !h.key.trim().is_empty() {
            cmd.arg("-H").arg(format!("{}: {}", h.key.trim(), h.value.trim()));
        }
    }

    // Auth Headers
    if let Some(ref auth) = payload.auth {
        match auth.auth_type.as_str() {
            "bearer" => {
                if let Some(ref tok) = auth.bearer_token {
                    cmd.arg("-H").arg(format!("Authorization: Bearer {}", tok.trim()));
                }
            }
            "basic" => {
                let u = auth.basic_user.as_deref().unwrap_or("");
                let p = auth.basic_pass.as_deref().unwrap_or("");
                cmd.args(["-u", &format!("{}:{}", u, p)]);
            }
            "apikey" => {
                if auth.api_key_location.as_deref() != Some("query") {
                    if let (Some(k), Some(v)) = (&auth.api_key_name, &auth.api_key_value) {
                        cmd.arg("-H").arg(format!("{}: {}", k.trim(), v.trim()));
                    }
                }
            }
            _ => {}
        }
    }

    // Body
    if let Some(ref body) = payload.body_content {
        if !body.is_empty() && payload.method.to_uppercase() != "GET" && payload.method.to_uppercase() != "HEAD" {
            if payload.body_type == "json" {
                cmd.arg("-H").arg("Content-Type: application/json");
            } else if payload.body_type == "x-www-form-urlencoded" {
                cmd.arg("-H").arg("Content-Type: application/x-www-form-urlencoded");
            }
            cmd.args(["--data-raw", body]);
        }
    }

    cmd.arg(&full_url);

    let output = match cmd.output() {
        Ok(out) => out,
        Err(e) => {
            let _ = fs::remove_file(&header_temp);
            return Err(format!("Failed to execute API request: {}", e));
        }
    };

    let raw_out = String::from_utf8_lossy(&output.stdout).to_string();
    let raw_err = String::from_utf8_lossy(&output.stderr).to_string();

    // Parse status and timing from curl output
    let mut status_code: u16 = 0;
    let mut duration_ms: u64 = 0;
    let mut body_str = raw_out.clone();

    if let Some(delim_idx) = raw_out.rfind("\n__WB_DELIM__\n") {
        body_str = raw_out[..delim_idx].to_string();
        let meta_part = &raw_out[delim_idx + "\n__WB_DELIM__\n".len()..];
        let lines: Vec<&str> = meta_part.lines().collect();
        if let Some(code_s) = lines.first() {
            status_code = code_s.trim().parse::<u16>().unwrap_or(0);
        }
        if let Some(time_s) = lines.get(1) {
            if let Ok(secs) = time_s.trim().parse::<f64>() {
                duration_ms = (secs * 1000.0).round() as u64;
            }
        }
    }

    // Parse Headers
    let mut response_headers = HashMap::new();
    if header_temp.exists() {
        if let Ok(hdr_content) = fs::read_to_string(&header_temp) {
            for line in hdr_content.lines() {
                if let Some(colon) = line.find(':') {
                    let k = line[..colon].trim().to_string();
                    let v = line[colon + 1..].trim().to_string();
                    response_headers.insert(k, v);
                }
            }
        }
        let _ = fs::remove_file(&header_temp);
    }

    let size = body_str.len();
    let err_opt = if !output.status.success() || status_code == 0 {
        Some(if !raw_err.is_empty() { raw_err } else { "Request failed to reach host".to_string() })
    } else {
        None
    };

    Ok(ApiResponseResult {
        status: status_code,
        status_text: status_code_to_text(status_code).to_string(),
        time_ms: duration_ms,
        size_bytes: size,
        headers: response_headers,
        data: body_str,
        error: err_opt,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ssrf_metadata_blocked() {
        assert!(validate_destination("http://169.254.169.254/latest/meta-data").is_err());
        assert!(validate_destination("http://metadata.google.internal/computeMetadata/v1/").is_err());
    }

    #[test]
    fn test_non_http_blocked() {
        assert!(validate_destination("file:///etc/passwd").is_err());
        assert!(validate_destination("ftp://ftp.example.com").is_err());
        assert!(validate_destination("gopher://example.com").is_err());
    }

    #[test]
    fn test_valid_http_accepted() {
        assert!(validate_destination("http://127.0.0.1:3000/api").is_ok());
        assert!(validate_destination("https://api.github.com/repos").is_ok());
    }

    #[test]
    fn test_percent_encode_utility() {
        assert_eq!(percent_encode("hello world"), "hello%20world");
        assert_eq!(percent_encode("key=value&foo=bar"), "key%3Dvalue%26foo%3Dbar");
    }
}
