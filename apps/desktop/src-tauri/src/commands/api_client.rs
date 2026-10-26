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
    pub oauth2_token: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiExecutePayload {
    pub method: String,
    pub custom_method: Option<String>,
    pub url: String,
    pub params: Vec<KeyValuePair>,
    pub headers: Vec<KeyValuePair>,
    pub auth: Option<ApiAuthInput>,
    pub body_type: String,
    pub body_content: Option<String>,
    pub graphql_query: Option<String>,
    pub graphql_variables: Option<String>,
    pub timeout_seconds: Option<u64>,
    pub follow_redirects: Option<bool>,
    pub max_redirects: Option<u32>,
    pub verify_ssl: Option<bool>,
    pub proxy_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ApiTimingMetrics {
    pub dns_lookup_ms: u64,
    pub tcp_connect_ms: u64,
    pub tls_handshake_ms: u64,
    pub ttfb_ms: u64,
    pub content_transfer_ms: u64,
    pub total_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ApiCookieResult {
    pub name: String,
    pub value: String,
    pub domain: String,
    pub path: String,
    pub expires: String,
    pub http_only: bool,
    pub secure: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiResponseResult {
    pub status: u16,
    pub status_text: String,
    pub time_ms: u64,
    pub size_bytes: usize,
    pub headers: HashMap<String, String>,
    pub cookies: Vec<ApiCookieResult>,
    pub timing: Option<ApiTimingMetrics>,
    pub redirect_count: u32,
    pub data: String,
    pub error: Option<String>,
}

pub fn validate_destination(url: &str) -> Result<(), String> {
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

pub fn percent_encode(input: &str) -> String {
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

pub fn status_code_to_text(code: u16) -> &'static str {
    match code {
        200 => "OK",
        201 => "Created",
        202 => "Accepted",
        204 => "No Content",
        301 => "Moved Permanently",
        302 => "Found",
        304 => "Not Modified",
        307 => "Temporary Redirect",
        308 => "Permanent Redirect",
        400 => "Bad Request",
        401 => "Unauthorized",
        403 => "Forbidden",
        404 => "Not Found",
        405 => "Method Not Allowed",
        408 => "Request Timeout",
        409 => "Conflict",
        422 => "Unprocessable Entity",
        429 => "Too Many Requests",
        500 => "Internal Server Error",
        502 => "Bad Gateway",
        503 => "Service Unavailable",
        504 => "Gateway Timeout",
        _ => "HTTP Response",
    }
}

pub fn parse_cookie_line(line: &str) -> Option<ApiCookieResult> {
    let parts: Vec<&str> = line.split(';').map(|s| s.trim()).collect();
    if parts.is_empty() {
        return None;
    }

    let first = parts[0];
    let eq_pos = first.find('=')?;
    let name = first[..eq_pos].trim().to_string();
    let value = first[eq_pos + 1..].trim().to_string();

    let mut domain = String::new();
    let mut path = String::from("/");
    let mut expires = String::new();
    let mut http_only = false;
    let mut secure = false;

    for part in parts.iter().skip(1) {
        let lower = part.to_lowercase();
        if lower == "httponly" {
            http_only = true;
        } else if lower == "secure" {
            secure = true;
        } else if let Some(eq) = part.find('=') {
            let k = part[..eq].trim();
            let v = part[eq + 1..].trim();
            if k.eq_ignore_ascii_case("domain") {
                domain = v.to_string();
            } else if k.eq_ignore_ascii_case("path") {
                path = v.to_string();
            } else if k.eq_ignore_ascii_case("expires") {
                expires = v.to_string();
            }
        }
    }

    Some(ApiCookieResult {
        name,
        value,
        domain,
        path,
        expires,
        http_only,
        secure,
    })
}

fn tokenize_command(cmd: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    let mut current = String::new();
    let mut in_single = false;
    let mut in_double = false;
    let mut escape = false;

    for ch in cmd.chars() {
        if escape {
            current.push(ch);
            escape = false;
        } else if ch == '\\' && !in_single {
            escape = true;
        } else if ch == '\'' && !in_double {
            in_single = !in_single;
        } else if ch == '"' && !in_single {
            in_double = !in_double;
        } else if ch.is_whitespace() && !in_single && !in_double {
            if !current.is_empty() {
                tokens.push(current);
                current = String::new();
            }
        } else {
            current.push(ch);
        }
    }
    if !current.is_empty() {
        tokens.push(current);
    }
    tokens
}

#[tauri::command]
pub fn api_parse_curl(curl_cmd: String) -> Result<ApiExecutePayload, String> {
    let trimmed = curl_cmd.trim();
    if !trimmed.starts_with("curl") {
        return Err("Command must start with 'curl'".to_string());
    }

    let mut method = "GET".to_string();
    let mut url = String::new();
    let mut headers = Vec::new();
    let mut body = String::new();
    let mut body_type = "none".to_string();

    let tokens = tokenize_command(trimmed);

    let mut idx = 1; // Skip "curl"
    while idx < tokens.len() {
        let tok = &tokens[idx];
        if tok == "-X" || tok == "--request" {
            if idx + 1 < tokens.len() {
                method = tokens[idx + 1].to_uppercase();
                idx += 1;
            }
        } else if tok == "-H" || tok == "--header" {
            if idx + 1 < tokens.len() {
                let h_str = &tokens[idx + 1];
                if let Some(col) = h_str.find(':') {
                    let k = h_str[..col].trim().to_string();
                    let v = h_str[col + 1..].trim().to_string();
                    headers.push(KeyValuePair {
                        key: k,
                        value: v,
                        enabled: true,
                        description: None,
                    });
                }
                idx += 1;
            }
        } else if tok == "-d" || tok == "--data" || tok == "--data-raw" || tok == "--data-binary" {
            if idx + 1 < tokens.len() {
                body = tokens[idx + 1].clone();
                if method == "GET" {
                    method = "POST".to_string();
                }
                body_type = if body.trim().starts_with('{') || body.trim().starts_with('[') {
                    "json".to_string()
                } else {
                    "raw".to_string()
                };
                idx += 1;
            }
        } else if !tok.starts_with('-') && url.is_empty() {
            url = tok.clone();
        }
        idx += 1;
    }

    if url.is_empty() {
        return Err("No URL found in cURL command".to_string());
    }

    Ok(ApiExecutePayload {
        method,
        custom_method: None,
        url,
        params: Vec::new(),
        headers,
        auth: None,
        body_type,
        body_content: if body.is_empty() { None } else { Some(body) },
        graphql_query: None,
        graphql_variables: None,
        timeout_seconds: Some(20),
        follow_redirects: Some(true),
        max_redirects: Some(5),
        verify_ssl: Some(true),
        proxy_url: None,
    })
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

    // Handle API Key in query param
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
    cmd.args(["-s", "-S", "-i"]);

    // Determine actual HTTP method
    let effective_method = if payload.method.to_uppercase() == "CUSTOM" {
        payload.custom_method.as_deref().unwrap_or("GET").to_uppercase()
    } else {
        payload.method.to_uppercase()
    };
    cmd.args(["-X", &effective_method]);

    cmd.args(["--connect-timeout", "10", "--max-time", &timeout]);
    cmd.args(["-D", &header_temp.to_string_lossy()]);

    // Format timing metadata
    cmd.args([
        "-w",
        "\n__WB_DELIM__\n%{http_code}\n%{time_total}\n%{time_namelookup}\n%{time_connect}\n%{time_appconnect}\n%{time_starttransfer}\n%{num_redirects}",
    ]);

    // Redirects
    if payload.follow_redirects.unwrap_or(true) {
        cmd.arg("-L");
        let max_r = payload.max_redirects.unwrap_or(5).to_string();
        cmd.args(["--max-redirs", &max_r]);
    }

    // SSL Verification
    if payload.verify_ssl == Some(false) {
        cmd.arg("--insecure");
    }

    // Proxy
    if let Some(ref proxy) = payload.proxy_url {
        if !proxy.trim().is_empty() {
            cmd.args(["--proxy", proxy.trim()]);
        }
    }

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
            "oauth2" => {
                if let Some(ref tok) = auth.oauth2_token {
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

    // Body Handling
    match payload.body_type.as_str() {
        "graphql" => {
            let query = payload.graphql_query.as_deref().unwrap_or("");
            let variables = payload.graphql_variables.as_deref().unwrap_or("{}");
            let gql_json = serde_json::json!({
                "query": query,
                "variables": serde_json::from_str::<serde_json::Value>(variables).unwrap_or(serde_json::json!({}))
            });
            cmd.arg("-H").arg("Content-Type: application/json");
            cmd.args(["--data-raw", &gql_json.to_string()]);
        }
        "json" => {
            if let Some(ref b) = payload.body_content {
                if !b.is_empty() {
                    cmd.arg("-H").arg("Content-Type: application/json");
                    cmd.args(["--data-raw", b]);
                }
            }
        }
        "xml" => {
            if let Some(ref b) = payload.body_content {
                if !b.is_empty() {
                    cmd.arg("-H").arg("Content-Type: application/xml");
                    cmd.args(["--data-raw", b]);
                }
            }
        }
        "x-www-form-urlencoded" => {
            if let Some(ref b) = payload.body_content {
                if !b.is_empty() {
                    cmd.arg("-H").arg("Content-Type: application/x-www-form-urlencoded");
                    cmd.args(["--data-raw", b]);
                }
            }
        }
        "raw" => {
            if let Some(ref b) = payload.body_content {
                if !b.is_empty() {
                    cmd.arg("-H").arg("Content-Type: text/plain");
                    cmd.args(["--data-raw", b]);
                }
            }
        }
        _ => {
            if let Some(ref b) = payload.body_content {
                if !b.is_empty() && effective_method != "GET" && effective_method != "HEAD" {
                    cmd.args(["--data-raw", b]);
                }
            }
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
    let mut timing_metrics = None;
    let mut redirect_count: u32 = 0;
    let mut body_str = raw_out.clone();

    if let Some(delim_idx) = raw_out.rfind("\n__WB_DELIM__\n") {
        body_str = raw_out[..delim_idx].to_string();
        let meta_part = &raw_out[delim_idx + "\n__WB_DELIM__\n".len()..];
        let lines: Vec<&str> = meta_part.lines().collect();

        if let Some(code_s) = lines.first() {
            status_code = code_s.trim().parse::<u16>().unwrap_or(0);
        }

        let total_sec = lines.get(1).and_then(|s| s.trim().parse::<f64>().ok()).unwrap_or(0.0);
        let namelookup_sec = lines.get(2).and_then(|s| s.trim().parse::<f64>().ok()).unwrap_or(0.0);
        let connect_sec = lines.get(3).and_then(|s| s.trim().parse::<f64>().ok()).unwrap_or(0.0);
        let appconnect_sec = lines.get(4).and_then(|s| s.trim().parse::<f64>().ok()).unwrap_or(0.0);
        let starttransfer_sec = lines.get(5).and_then(|s| s.trim().parse::<f64>().ok()).unwrap_or(0.0);
        redirect_count = lines.get(6).and_then(|s| s.trim().parse::<u32>().ok()).unwrap_or(0);

        duration_ms = (total_sec * 1000.0).round() as u64;

        let dns_ms = (namelookup_sec * 1000.0).round() as u64;
        let tcp_ms = if connect_sec >= namelookup_sec {
            ((connect_sec - namelookup_sec) * 1000.0).round() as u64
        } else {
            0
        };
        let tls_ms = if appconnect_sec >= connect_sec && appconnect_sec > 0.0 {
            ((appconnect_sec - connect_sec) * 1000.0).round() as u64
        } else {
            0
        };
        let base_transfer = if appconnect_sec > 0.0 { appconnect_sec } else { connect_sec };
        let ttfb_ms = if starttransfer_sec >= base_transfer {
            ((starttransfer_sec - base_transfer) * 1000.0).round() as u64
        } else {
            0
        };
        let transfer_ms = if total_sec >= starttransfer_sec {
            ((total_sec - starttransfer_sec) * 1000.0).round() as u64
        } else {
            0
        };

        timing_metrics = Some(ApiTimingMetrics {
            dns_lookup_ms: dns_ms,
            tcp_connect_ms: tcp_ms,
            tls_handshake_ms: tls_ms,
            ttfb_ms,
            content_transfer_ms: transfer_ms,
            total_ms: duration_ms,
        });
    }

    // Parse Headers and Cookies
    let mut response_headers = HashMap::new();
    let mut response_cookies = Vec::new();

    if header_temp.exists() {
        if let Ok(hdr_content) = fs::read_to_string(&header_temp) {
            for line in hdr_content.lines() {
                if let Some(colon) = line.find(':') {
                    let k = line[..colon].trim().to_string();
                    let v = line[colon + 1..].trim().to_string();

                    if k.eq_ignore_ascii_case("set-cookie") {
                        if let Some(cookie) = parse_cookie_line(&v) {
                            response_cookies.push(cookie);
                        }
                    }

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
        cookies: response_cookies,
        timing: timing_metrics,
        redirect_count,
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

    #[test]
    fn test_cookie_parser() {
        let cookie_str = "session_id=xyz987; Domain=example.com; Path=/api; Secure; HttpOnly";
        let parsed = parse_cookie_line(cookie_str).expect("Should parse cookie");
        assert_eq!(parsed.name, "session_id");
        assert_eq!(parsed.value, "xyz987");
        assert_eq!(parsed.domain, "example.com");
        assert_eq!(parsed.path, "/api");
        assert!(parsed.secure);
        assert!(parsed.http_only);
    }

    #[test]
    fn test_parse_curl_command() {
        let cmd = "curl -X POST https://httpbin.org/post -H 'Content-Type: application/json' -d '{\"status\":\"active\"}'";
        let parsed = api_parse_curl(cmd.to_string()).expect("Should parse curl");
        assert_eq!(parsed.method, "POST");
        assert_eq!(parsed.url, "https://httpbin.org/post");
        assert_eq!(parsed.headers.len(), 1);
        assert_eq!(parsed.headers[0].key, "Content-Type");
        assert_eq!(parsed.headers[0].value, "application/json");
        assert_eq!(parsed.body_content, Some("{\"status\":\"active\"}".to_string()));
    }
}
