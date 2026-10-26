use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpServerInfo {
    pub id: String,
    #[serde(rename = "type")]
    pub server_type: String,
    pub enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub command: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub headers: Option<HashMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub environment: Option<HashMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub oauth: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillInfo {
    pub name: String,
    pub title: String,
    pub description: String,
    pub path: String,
    pub has_skill_md: bool,
    pub file_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncResult {
    pub success: bool,
    pub skills_count: usize,
    pub mcps_count: usize,
    pub message: String,
    pub target_path: String,
}

/// Helper to get user's global ~/.config/opencode directory
pub fn get_user_opencode_dir() -> Option<PathBuf> {
    dirs::home_dir().map(|h| h.join(".config").join("opencode"))
}

/// Helper to get pre-installed bundled resources directory
pub fn get_bundled_opencode_dir() -> PathBuf {
    // 1. Check relative to current working directory (development / monorepo)
    let dev_path = PathBuf::from("resources/opencode-config");
    if dev_path.exists() {
        return dev_path;
    }
    let app_dev_path = PathBuf::from("apps/desktop/resources/opencode-config");
    if app_dev_path.exists() {
        return app_dev_path;
    }

    // 2. Check macOS app bundle Resources directory
    if let Ok(exe) = std::env::current_exe() {
        if let Some(macos_dir) = exe.parent() {
            let bundle_res = macos_dir.join("../Resources/resources/opencode-config");
            if bundle_res.exists() {
                return bundle_res;
            }
            let bundle_res2 = macos_dir.join("../Resources/opencode-config");
            if bundle_res2.exists() {
                return bundle_res2;
            }
        }
    }

    // 3. Known custom programming path fallback
    let fallback = PathBuf::from("/Users/developerritesh/Programming/opencode-config");
    if fallback.exists() {
        return fallback;
    }

    dev_path
}

/// Helper to find active opencode.jsonc or opencode.json
fn find_config_path() -> PathBuf {
    if let Some(dir) = get_user_opencode_dir() {
        let jsonc = dir.join("opencode.jsonc");
        if jsonc.exists() {
            return jsonc;
        }
        let json = dir.join("opencode.json");
        if json.exists() {
            return json;
        }
    }

    // Fallback to bundled
    let bundled = get_bundled_opencode_dir().join("opencode.jsonc");
    if bundled.exists() {
        return bundled;
    }
    PathBuf::from("/Users/developerritesh/Programming/opencode-config/opencode.jsonc")
}

#[tauri::command]
pub fn opencode_get_mcp_config() -> Result<Vec<McpServerInfo>, String> {
    let path = find_config_path();
    if !path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;

    let root: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse config JSON in {}: {}", path.display(), e))?;

    let mut servers: Vec<McpServerInfo> = Vec::new();

    if let Some(mcp_obj) = root.get("mcp").and_then(|v| v.as_object()) {
        for (id, val) in mcp_obj {
            let server_type = val.get("type").and_then(|t| t.as_str()).unwrap_or("local").to_string();
            let enabled = val.get("enabled").and_then(|e| e.as_bool()).unwrap_or(true);
            
            let command = val.get("command").and_then(|c| c.as_array()).map(|arr| {
                arr.iter().filter_map(|s| s.as_str().map(|str| str.to_string())).collect()
            });

            let url = val.get("url").and_then(|u| u.as_str()).map(|s| s.to_string());

            let headers = val.get("headers").and_then(|h| h.as_object()).map(|obj| {
                obj.iter().map(|(k, v)| (k.clone(), v.as_str().unwrap_or("").to_string())).collect()
            });

            let environment = val.get("environment").and_then(|env| env.as_object()).map(|obj| {
                obj.iter().map(|(k, v)| (k.clone(), v.as_str().unwrap_or("").to_string())).collect()
            });

            let oauth = val.get("oauth").and_then(|o| o.as_bool());

            servers.push(McpServerInfo {
                id: id.clone(),
                server_type,
                enabled,
                command,
                url,
                headers,
                environment,
                oauth,
            });
        }
    }

    // Also check root-level chrome-devtools if present
    if let Some(val) = root.get("chrome-devtools").and_then(|v| v.as_object()) {
        let server_type = val.get("type").and_then(|t| t.as_str()).unwrap_or("local").to_string();
        let enabled = val.get("enabled").and_then(|e| e.as_bool()).unwrap_or(true);
        let command = val.get("command").and_then(|c| c.as_array()).map(|arr| {
            arr.iter().filter_map(|s| s.as_str().map(|str| str.to_string())).collect()
        });

        if !servers.iter().any(|s| s.id == "chrome-devtools") {
            servers.push(McpServerInfo {
                id: "chrome-devtools".to_string(),
                server_type,
                enabled,
                command,
                url: None,
                headers: None,
                environment: None,
                oauth: None,
            });
        }
    }

    // Sort alphabetically by ID
    servers.sort_by(|a, b| a.id.cmp(&b.id));

    Ok(servers)
}

#[tauri::command]
pub fn opencode_toggle_mcp_server(server_id: String, enabled: bool) -> Result<bool, String> {
    let dir = get_user_opencode_dir().ok_or("Home directory unavailable")?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let path = dir.join("opencode.jsonc");
    let content = if path.exists() {
        fs::read_to_string(&path).map_err(|e| e.to_string())?
    } else {
        let bundled_content = fs::read_to_string(find_config_path()).unwrap_or_else(|_| "{}".to_string());
        bundled_content
    };

    let mut root: serde_json::Value = serde_json::from_str(&content).unwrap_or(serde_json::json!({
        "mcp": {}
    }));

    if let Some(mcp) = root.get_mut("mcp").and_then(|m| m.as_object_mut()) {
        if let Some(server) = mcp.get_mut(&server_id).and_then(|s| s.as_object_mut()) {
            server.insert("enabled".to_string(), serde_json::Value::Bool(enabled));
        }
    }

    if server_id == "chrome-devtools" {
        if let Some(cdp) = root.get_mut("chrome-devtools").and_then(|s| s.as_object_mut()) {
            cdp.insert("enabled".to_string(), serde_json::Value::Bool(enabled));
        }
    }

    let updated = serde_json::to_string_pretty(&root).map_err(|e| e.to_string())?;
    fs::write(&path, updated).map_err(|e| e.to_string())?;

    Ok(enabled)
}

#[tauri::command]
pub fn opencode_save_mcp_server(server: McpServerInfo) -> Result<McpServerInfo, String> {
    let dir = get_user_opencode_dir().ok_or("Home directory unavailable")?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let path = dir.join("opencode.jsonc");
    let content = if path.exists() {
        fs::read_to_string(&path).map_err(|e| e.to_string())?
    } else {
        fs::read_to_string(find_config_path()).unwrap_or_else(|_| "{}".to_string())
    };

    let mut root: serde_json::Value = serde_json::from_str(&content).unwrap_or(serde_json::json!({
        "mcp": {}
    }));

    if !root.get("mcp").is_some() {
        root["mcp"] = serde_json::json!({});
    }

    let mut server_val = serde_json::json!({
        "type": server.server_type,
        "enabled": server.enabled
    });

    if let Some(cmd) = &server.command {
        server_val["command"] = serde_json::json!(cmd);
    }
    if let Some(u) = &server.url {
        server_val["url"] = serde_json::json!(u);
    }
    if let Some(h) = &server.headers {
        server_val["headers"] = serde_json::json!(h);
    }
    if let Some(env) = &server.environment {
        server_val["environment"] = serde_json::json!(env);
    }
    if let Some(oauth) = server.oauth {
        server_val["oauth"] = serde_json::json!(oauth);
    }

    if let Some(mcp) = root.get_mut("mcp").and_then(|m| m.as_object_mut()) {
        mcp.insert(server.id.clone(), server_val);
    }

    let updated = serde_json::to_string_pretty(&root).map_err(|e| e.to_string())?;
    fs::write(&path, updated).map_err(|e| e.to_string())?;

    Ok(server)
}

#[tauri::command]
pub fn opencode_delete_mcp_server(server_id: String) -> Result<String, String> {
    let dir = get_user_opencode_dir().ok_or("Home directory unavailable")?;
    let path = dir.join("opencode.jsonc");
    if !path.exists() {
        return Ok(server_id);
    }

    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let mut root: serde_json::Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    if let Some(mcp) = root.get_mut("mcp").and_then(|m| m.as_object_mut()) {
        mcp.remove(&server_id);
    }
    if server_id == "chrome-devtools" {
        if let Some(obj) = root.as_object_mut() {
            obj.remove("chrome-devtools");
        }
    }

    let updated = serde_json::to_string_pretty(&root).map_err(|e| e.to_string())?;
    fs::write(&path, updated).map_err(|e| e.to_string())?;

    Ok(server_id)
}

#[tauri::command]
pub fn opencode_list_skills() -> Result<Vec<SkillInfo>, String> {
    let skills_dir = get_user_opencode_dir().map(|d| d.join("skills"));
    
    // Check if user skills directory exists and has directories
    let use_user_dir = if let Some(ref d) = skills_dir {
        d.exists() && fs::read_dir(d).map(|mut it| it.next().is_some()).unwrap_or(false)
    } else {
        false
    };

    let target_dir = if use_user_dir {
        skills_dir.unwrap()
    } else {
        // Fallback to bundled
        let bundled = get_bundled_opencode_dir().join("skills");
        if bundled.exists() {
            bundled
        } else {
            PathBuf::from("/Users/developerritesh/Programming/opencode-config/skills")
        }
    };

    if !target_dir.exists() {
        return Ok(Vec::new());
    }

    let entries = fs::read_dir(&target_dir)
        .map_err(|e| format!("Failed to read skills from {}: {}", target_dir.display(), e))?;

    let mut results: Vec<SkillInfo> = Vec::new();

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') {
            continue;
        }

        let skill_md = path.join("SKILL.md");
        let has_skill_md = skill_md.exists();
        let mut title = name.replace('-', " ");
        // Capitalize title
        title = title.split_whitespace().map(|word| {
            let mut c = word.chars();
            match c.next() {
                None => String::new(),
                Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
            }
        }).collect::<Vec<String>>().join(" ");

        let mut description = format!("Skill instructions for {}", name);

        if has_skill_md {
            if let Ok(content) = fs::read_to_string(&skill_md) {
                // Parse frontmatter
                if content.starts_with("---") {
                    if let Some(end_idx) = content[3..].find("---") {
                        let frontmatter = &content[3..3 + end_idx];
                        for line in frontmatter.lines() {
                            let trimmed = line.trim();
                            if trimmed.starts_with("description:") {
                                description = trimmed["description:".len()..].trim().to_string();
                            }
                        }
                    }
                }
            }
        }

        let file_count = fs::read_dir(&path).map(|it| it.count()).unwrap_or(1);

        results.push(SkillInfo {
            name,
            title,
            description,
            path: path.to_string_lossy().to_string(),
            has_skill_md,
            file_count,
        });
    }

    results.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(results)
}

#[tauri::command]
pub fn opencode_get_skill_content(skill_name: String) -> Result<String, String> {
    // 1. Check user dir
    if let Some(dir) = get_user_opencode_dir() {
        let md = dir.join("skills").join(&skill_name).join("SKILL.md");
        if md.exists() {
            return fs::read_to_string(md).map_err(|e| e.to_string());
        }
    }

    // 2. Check bundled
    let bundled_md = get_bundled_opencode_dir().join("skills").join(&skill_name).join("SKILL.md");
    if bundled_md.exists() {
        return fs::read_to_string(bundled_md).map_err(|e| e.to_string());
    }

    // 3. Fallback
    let fallback = PathBuf::from("/Users/developerritesh/Programming/opencode-config/skills")
        .join(&skill_name)
        .join("SKILL.md");
    if fallback.exists() {
        return fs::read_to_string(fallback).map_err(|e| e.to_string());
    }

    Err(format!("SKILL.md not found for skill '{}'", skill_name))
}

#[tauri::command]
pub fn opencode_sync_from_path(source_path: Option<String>) -> Result<SyncResult, String> {
    let source_dir = if let Some(p) = source_path {
        let pb = PathBuf::from(&p);
        if !pb.exists() {
            return Err(format!("Source path '{}' does not exist.", p));
        }
        pb
    } else {
        get_bundled_opencode_dir()
    };

    let target_dir = get_user_opencode_dir().ok_or("Cannot resolve user home directory")?;
    fs::create_dir_all(&target_dir).map_err(|e| format!("Failed to create {}: {}", target_dir.display(), e))?;

    // 1. Copy opencode.jsonc
    let src_config = source_dir.join("opencode.jsonc");
    let dest_config = target_dir.join("opencode.jsonc");
    let mut mcps_count = 0;

    if src_config.exists() {
        fs::copy(&src_config, &dest_config)
            .map_err(|e| format!("Failed to copy opencode.jsonc: {}", e))?;

        if let Ok(content) = fs::read_to_string(&dest_config) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(mcp) = json.get("mcp").and_then(|m| m.as_object()) {
                    mcps_count = mcp.len();
                }
            }
        }
    }

    // 2. Copy skills directory
    let src_skills = source_dir.join("skills");
    let dest_skills = target_dir.join("skills");
    fs::create_dir_all(&dest_skills).map_err(|e| format!("Failed to create {}: {}", dest_skills.display(), e))?;

    let mut skills_count = 0;
    if src_skills.exists() {
        if let Ok(entries) = fs::read_dir(&src_skills) {
            for entry in entries.flatten() {
                let p = entry.path();
                if p.is_dir() {
                    let dir_name = entry.file_name();
                    let target_skill_dir = dest_skills.join(&dir_name);
                    fs::create_dir_all(&target_skill_dir).ok();

                    // Recursively copy skill contents
                    copy_dir_recursive(&p, &target_skill_dir).ok();
                    skills_count += 1;
                }
            }
        }
    }

    Ok(SyncResult {
        success: true,
        skills_count,
        mcps_count,
        message: format!(
            "Successfully installed {} skills and {} MCP servers into OpenCode (~/.config/opencode)",
            skills_count, mcps_count
        ),
        target_path: target_dir.to_string_lossy().to_string(),
    })
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> std::io::Result<()> {
    if !dst.exists() {
        fs::create_dir_all(dst)?;
    }
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        let target = dst.join(entry.file_name());
        if ty.is_dir() {
            copy_dir_recursive(&entry.path(), &target)?;
        } else {
            fs::copy(entry.path(), target)?;
        }
    }
    Ok(())
}
